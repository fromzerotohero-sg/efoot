import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { createTestIdentityProvider } from '../src/auth.js'
import { installDormantGuard } from '../src/dormant.js'
import {
  buildPrematchChangeSet,
  createHeroPersistenceDb,
  createHeroPersistenceService,
  dbMessageToClient,
  orderNewestFirstThenChronological,
  registerHeroPersistenceRoutes
} from '../src/domains/hero-persistence/index.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'

function recordingClient(resolveCall) {
  const calls = []
  return {
    calls,
    from(table) {
      const call = { table, operation: 'select', filters: [], payload: null }
      calls.push(call)
      const builder = {
        select(columns) { call.columns = columns; return builder },
        insert(payload) { call.operation = 'insert'; call.payload = payload; return builder },
        update(payload) { call.operation = 'update'; call.payload = payload; return builder },
        delete() { call.operation = 'delete'; return builder },
        eq(column, value) { call.filters.push(['eq', column, value]); return builder },
        in(column, value) { call.filters.push(['in', column, value]); return builder },
        order(column, options) { call.order = [column, options]; return builder },
        limit(value) { call.limit = value; return builder },
        single() { return Promise.resolve(resolveCall(call)) },
        maybeSingle() { return Promise.resolve(resolveCall(call)) },
        then(success, rejected) {
          return Promise.resolve(resolveCall(call)).then(success, rejected)
        }
      }
      return builder
    }
  }
}

const provider = (client) => ({ forUser: () => client })
const tenantFilter = (call) =>
  call.filters.some(([operator, column, value]) =>
    operator === 'eq' && column === 'user_id' && value === USER_ID)

test('chat parity keeps chronological reads, client shape, last two messages, and 80 retention', async () => {
  const chronological = orderNewestFirstThenChronological([
    { id: 'old', created_at: '2026-09-15T10:00:00.000Z' },
    { id: 'new', created_at: '2026-09-15T12:00:00.000Z' },
    { id: 'mid', created_at: '2026-09-15T11:00:00.000Z' }
  ], 2)
  assert.deepEqual(chronological.map((row) => row.id), ['mid', 'new'])
  assert.equal(dbMessageToClient({
    id: 'm', role: 'system', content: null, payload: { workflowId: 'w' }
  }).role, 'hero')

  const ids = Array.from({ length: 82 }, (_, index) => ({ id: `m-${index}` }))
  const client = recordingClient((call) => {
    if (call.table === 'hero_chat_threads' && call.operation === 'select') {
      return { data: null, error: null }
    }
    if (call.table === 'hero_chat_threads' && call.operation === 'insert') {
      return { data: { id: 'thread-1', surface: 'hero-home' }, error: null }
    }
    if (call.table === 'hero_chat_messages' && call.operation === 'insert') {
      return {
        data: call.payload.map((row, index) => ({
          id: `inserted-${index}`, ...row, created_at: '2026-09-15T12:00:00.000Z'
        })),
        error: null
      }
    }
    if (call.table === 'hero_chat_messages' && call.operation === 'select') {
      return { data: ids, error: null }
    }
    return { data: null, error: null }
  })
  const db = createHeroPersistenceDb({
    readProvider: provider(client),
    writeProvider: provider(client),
    now: () => new Date('2026-09-15T12:00:00.000Z')
  })
  const service = createHeroPersistenceService({ config: { dormant: false }, db })
  const response = await service.appendChat({
    token: 'jwt',
    userId: USER_ID,
    input: {
      messages: [
        { role: 'user', content: 'discarded' },
        { role: 'hero', content: 'answer', payload: { tips: ['one'] } },
        { role: 'system', content: 'state' }
      ]
    }
  })

  assert.deepEqual(response.messages.map((message) => message.content), ['answer'])
  const insert = client.calls.find((call) =>
    call.table === 'hero_chat_messages' && call.operation === 'insert')
  assert.equal(insert.payload.length, 1)
  assert.ok(insert.payload.every((row) => row.user_id === USER_ID))
  const deletion = client.calls.find((call) => call.operation === 'delete')
  assert.deepEqual(deletion.filters.find(([operator]) => operator === 'in')[2], ['m-80', 'm-81'])
  assert.ok(client.calls.every((call) =>
    call.operation === 'insert'
      ? (Array.isArray(call.payload) ? call.payload : [call.payload])
          .every((row) => row.user_id === USER_ID)
      : tenantFilter(call)))
})

test('plan change sets are deterministic and preserve current normalization', () => {
  const input = {
    countermeasures: {
      tactical_adjustments: [{
        type: 'team_playing_style',
        suggestion: { en: 'Use Quick Counter' }
      }],
      individual_instructions: [{
        slot: 'difesa_1',
        player_id: 'p-1',
        instruction: 'Tight Marking'
      }],
      player_suggestions: [{
        player_id: 'p-in',
        replace_player_id: 'p-out',
        action: 'add_to_starting_xi',
        reason: { en: 'More pace' }
      }]
    },
    starting_plan: [{ en: 'Start compact' }]
  }
  const first = buildPrematchChangeSet(input, { lang: 'en' })
  const second = buildPrematchChangeSet(structuredClone(input), { lang: 'en' })
  assert.deepEqual(first, second)
  assert.equal(first.team_playing_style, 'contropiede_veloce')
  assert.equal(first.individual_instructions.difesa_1.instruction, 'marcatura_stretta')
  assert.equal(first.substitutions.length, 1)
  assert.equal(first.has_writes, true)
})

test('plans enforce size, idempotency, and dismiss-only behavior', async () => {
  const existing = { id: 'plan-existing', idempotency_key: 'same' }
  const calls = []
  const db = {
    findPlanByIdempotencyKey: async (input) => { calls.push(input); return existing },
    insertPlan: async () => { throw new Error('must not insert') },
    getPlan: async ({ planId }) => ({ id: planId }),
    dismissPlan: async ({ planId }) => ({ id: planId, status: 'dismissed' })
  }
  const service = createHeroPersistenceService({ config: { dormant: false }, db })
  assert.deepEqual(await service.savePlan({
    token: 'jwt',
    userId: USER_ID,
    input: { idempotency_key: ' same ', countermeasures: {} }
  }), { success: true, plan: existing, reused: true })
  assert.equal(calls[0].idempotencyKey, 'same')

  await assert.rejects(
    service.savePlan({
      token: 'jwt',
      userId: USER_ID,
      input: { countermeasures: { text: 'x'.repeat(300001) } }
    }),
    (error) => error.statusCode === 413 && error.message === 'Countermeasure plan is too large'
  )
  await assert.rejects(
    service.patchPlan({
      token: 'jwt',
      userId: USER_ID,
      input: { plan_id: 'plan-1', action: 'apply' }
    }),
    (error) => error.statusCode === 400 && /informational/.test(error.message)
  )
  const dismissed = await service.patchPlan({
    token: 'jwt',
    userId: USER_ID,
    input: { id: 'plan-1', action: 'dismiss' }
  })
  assert.equal(dismissed.plan.status, 'dismissed')
})

test('plan database reads and writes explicitly scope the authenticated tenant', async () => {
  const client = recordingClient((call) => {
    if (call.operation === 'insert') {
      return { data: { id: 'plan-2', ...call.payload }, error: null }
    }
    if (call.operation === 'update') {
      return { data: { id: 'plan-1', status: 'dismissed' }, error: null }
    }
    if (call.limit === 10) return { data: [], error: null }
    return { data: { id: 'plan-1', user_id: USER_ID }, error: null }
  })
  const db = createHeroPersistenceDb({
    readProvider: provider(client),
    writeProvider: provider(client)
  })
  await db.listPlans({ token: 'jwt', userId: USER_ID })
  await db.getPlan({ token: 'jwt', userId: USER_ID, planId: 'plan-1' })
  await db.findPlanByIdempotencyKey({
    token: 'jwt', userId: USER_ID, idempotencyKey: 'key'
  })
  await db.insertPlan({
    token: 'jwt', userId: USER_ID, plan: { status: 'ready' }
  })
  await db.dismissPlan({
    token: 'jwt', userId: USER_ID, planId: 'plan-1'
  })

  for (const call of client.calls) {
    if (call.operation === 'insert') assert.equal(call.payload.user_id, USER_ID)
    else assert.ok(tenantFilter(call), `${call.table}:${call.operation} lacked user_id`)
  }
})

test('Fastify contracts inject identity and dormant mode fails closed at HTTP and service layers', async () => {
  const identity = createTestIdentityProvider(USER_ID)
  const seen = []
  const live = Fastify({ logger: false })
  installDormantGuard(live, { dormant: false })
  registerHeroPersistenceRoutes(live, {
    identity,
    service: {
      chatHistory: async (input) => { seen.push(input); return { success: true, messages: [] } },
      appendChat: async (input) => { seen.push(input); return { success: true, messages: [] } },
      plans: async (input) => { seen.push(input); return { success: true, plans: [] } },
      savePlan: async (input) => { seen.push(input); return { success: true, plan: {} } },
      patchPlan: async (input) => { seen.push(input); return { success: true, plan: {} } }
    }
  })
  try {
    for (const request of [
      { method: 'GET', url: '/v1/hero/threads?limit=20' },
      { method: 'POST', url: '/v1/hero/threads', payload: { messages: [{ role: 'user', content: 'x' }] } },
      { method: 'GET', url: '/v1/hero/plans' },
      { method: 'POST', url: '/v1/hero/plans', payload: {} },
      { method: 'PATCH', url: '/v1/hero/plans', payload: { id: 'p', action: 'dismiss' } }
    ]) {
      assert.equal((await live.inject(request)).statusCode, 200)
    }
    assert.ok(seen.every((input) => input.userId === USER_ID && input.token === 'test'))
  } finally {
    await live.close()
  }

  const blockedDb = new Proxy({}, {
    get() {
      return async () => { throw new Error('provider must not run') }
    }
  })
  const dormantService = createHeroPersistenceService({
    config: { dormant: true },
    db: blockedDb
  })
  for (const operation of [
    () => dormantService.chatHistory({ token: 'jwt', userId: USER_ID }),
    () => dormantService.appendChat({
      token: 'jwt', userId: USER_ID, input: { messages: [{ role: 'user', content: 'x' }] }
    }),
    () => dormantService.savePlan({ token: 'jwt', userId: USER_ID, input: {} }),
    () => dormantService.patchPlan({
      token: 'jwt', userId: USER_ID, input: { id: 'p', action: 'dismiss' }
    })
  ]) {
    await assert.rejects(operation(), (error) => error.statusCode === 403)
  }

  const dormant = Fastify({ logger: false })
  installDormantGuard(dormant, { dormant: true })
  registerHeroPersistenceRoutes(dormant, { identity, service: dormantService })
  try {
    const hiddenWrite = await dormant.inject({ method: 'GET', url: '/v1/hero/threads' })
    assert.equal(hiddenWrite.statusCode, 403)
    assert.equal(JSON.parse(hiddenWrite.body).dormant, true)
    for (const request of [
      { method: 'POST', url: '/v1/hero/threads', payload: {} },
      { method: 'POST', url: '/v1/hero/plans', payload: {} },
      { method: 'PATCH', url: '/v1/hero/plans', payload: {} }
    ]) {
      const response = await dormant.inject(request)
      assert.equal(response.statusCode, 403)
      assert.equal(JSON.parse(response.body).dormant, true)
    }
  } finally {
    await dormant.close()
  }
})
