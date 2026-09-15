import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { createTestIdentityProvider } from '../src/auth.js'
import { installDormantGuard } from '../src/dormant.js'
import { installRateLimitHook } from '../src/rateLimiter.js'
import { createMockCreditProvider } from '../src/providers.js'
import { createCoachFeedbackDb } from '../src/domains/coach-feedback/db.js'
import { registerCoachFeedbackRoutes } from '../src/domains/coach-feedback/routes.js'
import {
  buildMatchContext,
  buildProfileContext,
  createCoachFeedbackService,
  normalizeHistory,
  validateInsights,
  validateProfileUpdates
} from '../src/domains/coach-feedback/service.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'

function responseWith(content) {
  return {
    async json() {
      return { choices: [{ message: { content } }] }
    }
  }
}

function service(overrides = {}) {
  return createCoachFeedbackService({
    openai: overrides.openai || {
      async complete() { return responseWith('OK') }
    },
    credits: overrides.credits || createMockCreditProvider(),
    db: overrides.db || {
      async loadChatContext() { return { profile: null, match: null } },
      async loadOwnedMatch() { return null },
      async saveFeedback() {}
    },
    aiKnowledge: overrides.aiKnowledge || { async update() {} },
    config: { dormant: false, ...(overrides.config || {}) },
    logger: { error() {} }
  })
}

test('chat preserves context, history bounds, model fallback, cost, and response shape', async () => {
  const requests = []
  const modelError = new Error('missing')
  modelError.type = 'model_not_found'
  const openai = {
    async complete(body, operation) {
      requests.push({ body, operation })
      if (requests.length === 1) throw modelError
      return responseWith('Grazie. Cosa ha funzionato?')
    }
  }
  const credits = createMockCreditProvider()
  const coachFeedback = service({
    openai,
    credits,
    db: {
      async loadChatContext(input) {
        assert.equal(input.userId, USER_ID)
        return {
          profile: { first_name: 'Ada', platform: 'pc' },
          match: {
            id: 'match-1',
            opponent_name: 'Rival',
            result: '2-1',
            match_date: '2026-09-14T10:00:00.000Z'
          }
        }
      },
      async loadOwnedMatch() { return null },
      async saveFeedback() {}
    }
  })
  const result = await coachFeedback.chat({
    token: 'jwt',
    userId: USER_ID,
    lang: 'it',
    message: ' È andata bene ',
    history: [
      { role: 'system', content: 'ignored' },
      ...Array.from({ length: 12 }, (_, index) => ({
        role: index % 2 ? 'assistant' : 'user',
        content: ` item-${index} `
      }))
    ],
    rateLimit: { remaining: 29, resetAt: 'soon' },
    idempotencyKey: 'chat-key'
  })

  assert.deepEqual(result, {
    response: 'Grazie. Cosa ha funzionato?',
    remaining: 29,
    resetAt: 'soon',
    matchId: 'match-1'
  })
  assert.equal(requests[0].body.model, 'gpt-5.2')
  assert.equal(requests[1].body.model, 'gpt-4o')
  assert.equal(requests[0].body.max_completion_tokens, 400)
  assert.match(requests[0].body.messages[0].content, /PROFILO ATTUALE DEL CLIENTE/)
  assert.match(requests[0].body.messages[0].content, /ULTIMA PARTITA GIOCATA/)
  assert.equal(requests[0].body.messages.length, 11)
  assert.deepEqual(credits.snapshot()[0], {
    type: 'deduct',
    capability: 'coach-feedback-chat',
    idempotencyKey: 'chat-key',
    applied: false
  })
})

test('profile, match, history, and extraction validators retain route parity', () => {
  assert.match(buildProfileContext({ platform: 'pc' }), /PROFILO INCOMPLETO/)
  assert.match(buildMatchContext({ formation_played: '4-3-3' }), /4-3-3/)
  assert.deepEqual(normalizeHistory([
    { role: 'system', content: 'no' },
    { role: 'user', content: ' ok ' },
    { role: 'assistant', content: 'x'.repeat(2100) }
  ]), [
    { role: 'user', content: 'ok' },
    { role: 'assistant', content: 'x'.repeat(2000) }
  ])
  assert.deepEqual(validateProfileUpdates({
    platform: ' PC ',
    pass_level: 'pa4',
    ai_weak_point: 'custom weakness',
    hours_per_week: '12.9',
    ai_notes: ' note ',
    first_name: 'x'.repeat(256)
  }), {
    platform: 'pc',
    ai_weak_point: 'custom weakness',
    hours_per_week: 12,
    ai_notes: 'note'
  })
  assert.deepEqual(validateInsights([
    { type: 'weakness', text: ` ${'x'.repeat(210)} ` },
    { type: 'unknown', text: 'drop' }
  ]), [{ type: 'weakness', text: 'x'.repeat(200) }])
})

test('save preserves extraction contract, validates writes, and scopes match ownership', async () => {
  const saves = []
  const knowledge = []
  const coachFeedback = service({
    openai: {
      async complete(body, operation) {
        assert.equal(operation, 'save-coach-feedback')
        assert.equal(body.model, 'gpt-5.2')
        assert.equal(body.response_format.type, 'json_object')
        assert.match(body.messages[1].content, /CONTESTO PARTITA/)
        return responseWith(JSON.stringify({
          profile_updates: {
            platform: 'PC',
            ai_weak_point: 'defence',
            pass_level: 'pa9'
          },
          tactical_insights: [
            { type: 'strength', text: 'Transizioni efficaci con Mbappé' }
          ],
          conversation_summary: 'Buona partita.',
          outcome: 'win'
        }))
      }
    },
    db: {
      async loadChatContext() { return { profile: null, match: null } },
      async loadOwnedMatch(input) {
        assert.equal(input.userId, USER_ID)
        assert.equal(input.matchId, 'owned-match-id')
        return {
          id: 'owned-match-id',
          opponent_name: 'Rival',
          formation_played: '4-3-3',
          playing_style_played: 'counter'
        }
      },
      async saveFeedback(input) { saves.push(input) }
    },
    aiKnowledge: {
      async update(input) { knowledge.push(input) }
    }
  })
  const result = await coachFeedback.save({
    token: 'jwt',
    userId: USER_ID,
    conversation: [{ role: 'user', content: 'Gioco su PC.' }],
    sessionType: 'update',
    matchId: 'owned-match-id',
    idempotencyKey: 'save-key'
  })
  await new Promise((resolve) => setImmediate(resolve))

  assert.deepEqual(result, {
    success: true,
    profile_fields_updated: ['platform', 'ai_weak_point'],
    insights_count: 1,
    session_type: 'update'
  })
  assert.deepEqual(saves[0].profileUpdates, {
    platform: 'pc',
    ai_weak_point: 'defence',
    common_problems: ['Difesa']
  })
  assert.equal(saves[0].match.id, 'owned-match-id')
  assert.deepEqual(knowledge, [{ token: 'jwt', userId: USER_ID }])
})

test('all provider and database failures after deduction refund with the same key', async () => {
  for (const failingPart of ['openai', 'database']) {
    const credits = createMockCreditProvider()
    const failure = new Error(`${failingPart} failed`)
    failure.type = failingPart === 'openai' ? 'network_error' : 'database_error'
    const coachFeedback = service({
      credits,
      openai: {
        async complete() {
          if (failingPart === 'openai') throw failure
          return responseWith('{}')
        }
      },
      db: {
        async loadChatContext() { return { profile: null, match: null } },
        async loadOwnedMatch() { return null },
        async saveFeedback() {
          if (failingPart === 'database') throw failure
        }
      }
    })
    await assert.rejects(() => coachFeedback.save({
      token: 'jwt',
      userId: USER_ID,
      conversation: [{ role: 'user', content: 'feedback' }],
      idempotencyKey: `${failingPart}-key`
    }), failure)
    assert.deepEqual(
      credits.snapshot().map(({ type, idempotencyKey }) => ({ type, idempotencyKey })),
      [
        { type: 'deduct', idempotencyKey: `${failingPart}-key` },
        { type: 'refund', idempotencyKey: `${failingPart}-key` }
      ]
    )
  }
})

function recordingClient(responses = {}) {
  const calls = []
  const client = {
    calls,
    from(table) {
      const call = { table, operation: 'select', payload: null, filters: [] }
      calls.push(call)
      const builder = {
        select() { return builder },
        update(payload) { call.operation = 'update'; call.payload = payload; return builder },
        insert(payload) { call.operation = 'insert'; call.payload = payload; return builder },
        eq(column, value) { call.filters.push([column, value]); return builder },
        order() { return builder },
        limit() { return builder },
        maybeSingle() { return Promise.resolve(resolve(call)) },
        then(success, failure) { return Promise.resolve(resolve(call)).then(success, failure) }
      }
      return builder
    }
  }
  function resolve(call) {
    return responses[`${call.table}:${call.operation}`] || { data: null, error: null }
  }
  return client
}

test('database adapter scopes every read and write to the authenticated tenant', async () => {
  const client = recordingClient({
    'matches:select': {
      data: { id: 'match-1', formation_played: '4-3-3' },
      error: null
    }
  })
  const provider = { forUser: (token) => {
    assert.equal(token, 'jwt')
    return client
  } }
  const db = createCoachFeedbackDb({
    readProvider: provider,
    writeProvider: provider,
    now: () => new Date('2026-09-15T12:00:00.000Z')
  })
  await db.loadChatContext({ token: 'jwt', userId: USER_ID })
  const match = await db.loadOwnedMatch({ token: 'jwt', userId: USER_ID, matchId: 'match-1' })
  await db.saveFeedback({
    token: 'jwt',
    userId: USER_ID,
    match,
    sessionType: 'feedback',
    profileUpdates: { platform: 'pc' },
    profileFieldsUpdated: ['platform'],
    insights: [],
    summary: '',
    outcome: null
  })

  for (const call of client.calls) {
    if (call.operation === 'insert') assert.equal(call.payload.user_id, USER_ID)
    else assert.ok(call.filters.some(([column, value]) => column === 'user_id' && value === USER_ID))
  }
})

test('routes generate idempotency, expose limiter rates, and preserve localized responses', async () => {
  const inputs = []
  const routeMetadata = []
  const app = Fastify({ logger: false })
  app.addHook('onRoute', (options) => {
    if (options.url.startsWith('/v1/coach-feedback/')) routeMetadata.push(options.config)
  })
  installDormantGuard(app, { dormant: false })
  installRateLimitHook(app, {
    async check(userId, capability) {
      assert.equal(userId, USER_ID)
      return { allowed: true, remaining: capability.endsWith('.chat') ? 29 : 4, resetAt: new Date(0) }
    }
  })
  registerCoachFeedbackRoutes(app, {
    identity: createTestIdentityProvider(USER_ID),
    coachFeedback: {
      async chat(input) { inputs.push(input); return { response: 'ok' } },
      async save(input) { inputs.push(input); return { success: true } }
    }
  })
  try {
    const chat = await app.inject({
      method: 'POST',
      url: '/v1/coach-feedback/chat',
      headers: { authorization: 'Bearer jwt', 'accept-language': 'it' },
      payload: { message: 'ciao' }
    })
    assert.equal(chat.statusCode, 200)
    assert.equal(inputs[0].lang, 'it')
    assert.match(inputs[0].idempotencyKey, new RegExp(`^coach-feedback-chat:${USER_ID}:`))
    assert.equal(inputs[0].rateLimit.remaining, 29)
    assert.deepEqual(routeMetadata.map((item) => item.rateLimit.maxRequests), [30, 5])
  } finally {
    await app.close()
  }
})

test('direct service and HTTP guard fail closed in dormant mode before all effects', async () => {
  let effects = 0
  const dormantService = createCoachFeedbackService({
    openai: { async complete() { effects += 1 } },
    credits: {
      async deduct() { effects += 1; return { ok: true } },
      async refund() { effects += 1 }
    },
    db: {
      async loadChatContext() { effects += 1 },
      async loadOwnedMatch() { effects += 1 },
      async saveFeedback() { effects += 1 }
    },
    aiKnowledge: { async update() { effects += 1 } },
    config: { dormant: true }
  })
  await assert.rejects(
    () => dormantService.chat({ message: 'hello', idempotencyKey: 'key' }),
    (error) => error.statusCode === 403 && error.type === 'dormant'
  )
  assert.equal(effects, 0)

  let identityCalls = 0
  const app = Fastify({ logger: false })
  installDormantGuard(app, { dormant: true })
  registerCoachFeedbackRoutes(app, {
    identity: { async resolveUser() { identityCalls += 1 } },
    coachFeedback: dormantService
  })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/coach-feedback/save',
      payload: { conversation: [{ role: 'user', content: 'x' }] }
    })
    assert.equal(response.statusCode, 403)
    assert.equal(JSON.parse(response.body).dormant, true)
    assert.equal(identityCalls, 0)
    assert.equal(effects, 0)
  } finally {
    await app.close()
  }
})
