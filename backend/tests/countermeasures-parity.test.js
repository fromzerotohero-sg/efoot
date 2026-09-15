import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { installDormantGuard } from '../src/dormant.js'
import { createTestIdentityProvider } from '../src/auth.js'
import { registerCountermeasuresRoutes } from '../src/domains/countermeasures/routes.js'
import { createCountermeasuresRepository } from '../src/domains/countermeasures/repository.js'
import {
  COUNTERMEASURES_COST,
  MAX_COUNTERMEASURES_PROMPT_SIZE,
  buildCountermeasuresPrompt,
  createCountermeasuresService,
  deriveCountermeasuresContext,
  loadCountermeasuresRag
} from '../src/domains/countermeasures/service.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const OPPONENT_ID = '10000000-0000-4000-8000-000000000001'

function baseContext(overrides = {}) {
  return {
    opponentFormation: {
      id: OPPONENT_ID,
      user_id: USER_ID,
      formation_name: '4-3-3',
      players: [{ player_name: 'Opponent', position: 'P' }],
      extracted_data: {
        visual_tactical_profile: {
          attackable_zones: ['left half-space'],
          defensive_gaps: ['behind left back']
        }
      }
    },
    roster: [
      {
        id: 'starter', player_name: 'Starter', position: 'CC', slot_index: 5,
        original_positions: [{ position: 'CC', competence: 'Alta' }]
      },
      {
        id: 'reserve', player_name: 'Reserve', position: 'CC', slot_index: null,
        original_positions: [{ position: 'CC', competence: 'Alta' }]
      }
    ],
    clientFormation: { formation: '4-3-3', slot_positions: { 5: { position: 'CC', x: 50, y: 50 } } },
    formationVariants: [],
    tacticalSettings: { team_playing_style: 'possesso_palla', individual_instructions: {} },
    activeCoach: null,
    matchHistory: [],
    historyOpponentFormations: [],
    tacticalPatterns: { recurring_issues: ['late press'] },
    coachFeedback: [],
    userProfile: { platform: 'console' },
    gameAnalysis: { passing: { short: 60 } },
    ...overrides
  }
}

function validAiOutput() {
  return {
    diagnosis: 'Attack the left half-space.',
    fit_proof: 'Fits the current XI.',
    analysis: {
      opponent_formation_analysis: 'A 4-3-3',
      strengths: ['pressing', 'extra'],
      weaknesses: ['left gap', 'extra']
    },
    play_summary: { match_key: 'Use the left half-space.' },
    starting_plan: ['one', 'two', 'three', 'four'],
    countermeasures: {
      formation_adjustments: [
        { suggestion: 'Keep 4-3-3', reason: 'Shape', priority: 'high' },
        { suggestion: 'Other', reason: 'Other', priority: 'medium' }
      ],
      tactical_adjustments: [
        { suggestion: 'Width', reason: 'Gap', priority: 'high' },
        { suggestion: 'Support', reason: 'Build-up', priority: 'medium' },
        { suggestion: 'Live instruction', reason: 'Later', type: 'match_plan', priority: 'high' }
      ],
      player_suggestions: [{
        action: 'add_to_starting_xi',
        player_id: 'reserve',
        player_name: 'invented',
        replace_player_id: 'starter',
        replace_player_name: 'invented',
        position: 'CC',
        reason: 'Role fit',
        priority: 'high'
      }],
      individual_instructions: []
    }
  }
}

function aiResponse(output = validAiOutput(), model = 'gpt-4o') {
  return {
    async json() {
      return {
        model,
        choices: [{ message: { content: JSON.stringify(output) } }]
      }
    }
  }
}

function recordingClient(responses = {}) {
  const calls = []
  const client = {
    calls,
    from(table) {
      const call = { table, operation: 'select', filters: [] }
      calls.push(call)
      const builder = {
        select() { return builder },
        update(payload) { call.operation = 'update'; call.payload = payload; return builder },
        eq(column, value) { call.filters.push(['eq', column, value]); return builder },
        in(column, value) { call.filters.push(['in', column, value]); return builder },
        gte(column, value) { call.filters.push(['gte', column, value]); return builder },
        order() { return builder },
        limit() { return builder },
        single() { return Promise.resolve(resolve(call)) },
        maybeSingle() { return Promise.resolve(resolve(call)) },
        then(ok, fail) { return Promise.resolve(resolve(call)).then(ok, fail) }
      }
      return builder
    }
  }
  function resolve(call) {
    const key = `${call.table}:${call.operation}`
    const value = responses[key]
    if (Array.isArray(value)) return value.shift() || { data: [], error: null }
    return value || { data: [], error: null }
  }
  return client
}

test('repository scopes every database operation to the authenticated tenant', async () => {
  const client = recordingClient({
    'opponent_formations:select': [
      { data: baseContext().opponentFormation, error: null },
      { data: [], error: null }
    ],
    'players:select': { data: [], error: null }
  })
  const provider = { forUser: (token) => {
    assert.equal(token, 'jwt')
    return client
  } }
  const repository = createCountermeasuresRepository({
    readProvider: provider,
    writeProvider: provider
  })
  await repository.loadContext({
    token: 'jwt',
    userId: USER_ID,
    opponentFormationId: OPPONENT_ID
  })
  await repository.persistCorrection({
    token: 'jwt',
    userId: USER_ID,
    opponentFormationId: OPPONENT_ID,
    formation: '4-2-3-1',
    extractedData: { formation: '4-2-3-1' },
    now: new Date('2026-09-15T12:00:00.000Z')
  })
  assert.ok(client.calls.length >= 10)
  for (const call of client.calls) {
    if (call.table === 'playing_styles') continue
    assert.ok(
      call.filters.some((filter) => filter[0] === 'eq' && filter[1] === 'user_id' && filter[2] === USER_ID),
      `${call.table}:${call.operation} lacks user_id tenant scope`
    )
  }
})

test('prompt retains production match zones, tactical patterns, and photo evidence', async () => {
  const raw = baseContext({
    matchHistory: [{
      id: 'match',
      formation_played: '4-3-3',
      playing_style_played: 'possesso_palla',
      result: 'W',
      attack_areas: { left: 99 }
    }],
    tacticalPatterns: {
      recurring_issues: [{ issue: 'late press', frequency: 3 }],
      attack_areas_avg: { right: 88 },
      opponent_attack_areas_avg: { center: 77 }
    }
  })
  const context = deriveCountermeasuresContext(raw)
  const prompt = await buildCountermeasuresPrompt(context, '', 'it')
  assert.match(prompt, /TRUTH LAYER/i)
  assert.match(prompt, /left half-space/)
  assert.match(prompt, /late press/)
  assert.match(prompt, /FORMAZIONE FLUIDA/i)
  assert.match(prompt, /ZONE PARTITE/)
  assert.match(prompt, /ZONE AGGREGATE/)
  assert.match(prompt, /Attacco avversario \/ pressione concessa/)
})

test('backend countermeasures use selective RAG with the shared truth layer', async () => {
  const rag = await loadCountermeasuresRag('it')
  assert.match(rag, /TRUTH LAYER/i)
  assert.match(rag, /11\. PROVENIENZA CATALOGO/)
  assert.match(rag, /3\. MODULI TATTICI/)
  assert.doesNotMatch(rag, /## OBIETTIVO/)
  assert.doesNotMatch(rag, /COACH_AI_POLICIES/)
})

test('service preserves correction, fallback, two-credit idempotency, caps, and presentation', async () => {
  const calls = []
  const refunds = []
  const corrections = []
  const service = createCountermeasuresService({
    repository: {
      async loadContext(input) {
        calls.push(['load', input.userId])
        return baseContext()
      },
      async persistCorrection(input) { corrections.push(input) }
    },
    openai: {
      async complete(body) {
        calls.push(['model', body.model, body.messages[0].content])
        if (body.model === 'gpt-5.2') {
          const error = new Error('missing')
          error.type = 'model_not_found'
          throw error
        }
        return aiResponse()
      }
    },
    credits: {
      async deduct(input) { calls.push(['deduct', input]); return { ok: true } },
      async refund(input) { refunds.push(input); return { ok: true } }
    },
    config: { dormant: false, allowLive: true },
    loadRag: async () => 'STATIC-RAG'
  })
  const result = await service.generate({
    token: 'jwt',
    userId: USER_ID,
    opponentFormationId: OPPONENT_ID,
    correctedFormation: '4-2-3-1',
    language: 'en',
    idempotencyKey: 'idem-1'
  })
  assert.equal(corrections.length, 1)
  assert.equal(corrections[0].userId, USER_ID)
  assert.deepEqual(calls.filter(([kind]) => kind === 'model').map(([, model]) => model), ['gpt-5.2', 'gpt-4o'])
  assert.equal(calls.find(([kind]) => kind === 'deduct')[1].amount, COUNTERMEASURES_COST)
  assert.equal(calls.find(([kind]) => kind === 'deduct')[1].idempotencyKey, 'idem-1')
  assert.equal(refunds.length, 0)
  assert.equal(result.success, true)
  assert.equal(result.model_used, 'gpt-4o')
  assert.equal(result.countermeasures.countermeasures.formation_adjustments.length, 1)
  assert.equal(result.countermeasures.countermeasures.tactical_adjustments.length, 2)
  assert.equal(result.countermeasures.countermeasures.player_suggestions[0].player_name, 'Reserve')
  assert.equal(result.countermeasures.analysis.strengths.length, 1)
  assert.ok(result.customer_plan)
  assert.equal('warnings' in result.countermeasures, false)
})

test('service refunds provider failures and fails closed before DB, AI, or credits when dormant', async () => {
  const effects = []
  const dependencies = {
    repository: {
      async loadContext() { effects.push('db'); return baseContext() },
      async persistCorrection() { effects.push('write') }
    },
    openai: {
      async complete() { effects.push('ai'); throw Object.assign(new Error('quota'), { type: 'rate_limit', statusCode: 429 }) }
    },
    credits: {
      async deduct() { effects.push('deduct'); return { ok: true } },
      async refund() { effects.push('refund'); return { ok: true } }
    },
    loadRag: async () => 'RAG'
  }
  const live = createCountermeasuresService({
    ...dependencies,
    config: { dormant: false, allowLive: true }
  })
  await assert.rejects(() => live.generate({
    userId: USER_ID,
    opponentFormationId: OPPONENT_ID,
    idempotencyKey: 'failure'
  }), (error) => error.type === 'rate_limit')
  assert.deepEqual(effects, ['db', 'deduct', 'ai', 'refund'])

  effects.length = 0
  const dormant = createCountermeasuresService({
    ...dependencies,
    config: { dormant: true, allowLive: false }
  })
  await assert.rejects(() => dormant.generate({
    userId: USER_ID,
    opponentFormationId: OPPONENT_ID
  }), (error) => error.statusCode === 403 && error.type === 'dormant')
  assert.deepEqual(effects, [])
})

test('prompt cap is enforced before charging', async () => {
  let charged = false
  const service = createCountermeasuresService({
    repository: {
      async loadContext() { return baseContext() },
      async persistCorrection() {}
    },
    openai: { async complete() { throw new Error('must not call') } },
    credits: {
      async deduct() { charged = true; return { ok: true } },
      async refund() {}
    },
    config: { dormant: false, allowLive: true },
    promptBuilder: async () => 'x'.repeat(MAX_COUNTERMEASURES_PROMPT_SIZE + 1)
  })
  await assert.rejects(() => service.generate({
    userId: USER_ID,
    opponentFormationId: OPPONENT_ID
  }), (error) => error.statusCode === 413)
  assert.equal(charged, false)
})

test('Fastify route maps snake_case contract and dormant hook prevents identity/service effects', async () => {
  const generated = []
  const app = Fastify({ logger: false })
  installDormantGuard(app, { dormant: false })
  registerCountermeasuresRoutes(app, {
    identity: createTestIdentityProvider(USER_ID),
    countermeasures: { async generate(input) { generated.push(input); return { success: true } } }
  })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/countermeasures/generate',
      headers: { 'idempotency-key': 'route-idem' },
      payload: {
        opponent_formation_id: OPPONENT_ID,
        language: 'en',
        corrected_formation: '4-2-3-1'
      }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(generated[0].opponentFormationId, OPPONENT_ID)
    assert.equal(generated[0].language, 'en')
    assert.equal(generated[0].correctedFormation, '4-2-3-1')
    assert.equal(generated[0].idempotencyKey, 'route-idem')
  } finally {
    await app.close()
  }

  let identityCalls = 0
  const dormant = Fastify({ logger: false })
  installDormantGuard(dormant, { dormant: true })
  registerCountermeasuresRoutes(dormant, {
    identity: { async resolveUser() { identityCalls += 1 } },
    countermeasures: { async generate() { throw new Error('must not call') } }
  })
  try {
    const response = await dormant.inject({
      method: 'POST',
      url: '/v1/countermeasures/generate',
      payload: { opponent_formation_id: OPPONENT_ID }
    })
    assert.equal(response.statusCode, 403)
    assert.equal(identityCalls, 0)
  } finally {
    await dormant.close()
  }
})
