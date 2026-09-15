import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { createTestIdentityProvider } from '../src/auth.js'
import { installDormantGuard } from '../src/dormant.js'
import {
  buildAiInfoUpdate,
  buildProfileUpdate,
  createUserReadService,
  createUserWriteService
} from '../src/domains/users/service.js'
import { registerUserRoutes } from '../src/domains/users/routes.js'
import {
  calculateAIKnowledgeBreakdown,
  createAIKnowledgeService,
  getAIKnowledgeLevel
} from '../src/domains/memory/aiKnowledge.js'
import { registerMemoryRoutes } from '../src/domains/memory/routes.js'
import {
  createCreditReadService,
  normalizeUsage
} from '../src/domains/credits/service.js'
import { registerCreditReadRoutes } from '../src/domains/credits/routes.js'
import {
  buildStarterPlayerRow,
  createStarterPackImportService
} from '../src/domains/roster/starterPack.js'
import { registerStarterPackRoutes } from '../src/domains/roster/routes.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'

function recordingClient(responses = {}) {
  const calls = []
  const client = {
    calls,
    from(table) {
      const call = { table, operation: 'select', filters: [], payload: null }
      calls.push(call)
      const builder = {
        select() { return builder },
        insert(payload) { call.operation = 'insert'; call.payload = payload; return builder },
        update(payload) { call.operation = 'update'; call.payload = payload; return builder },
        upsert(payload) { call.operation = 'upsert'; call.payload = payload; return builder },
        delete() { call.operation = 'delete'; return builder },
        eq(column, value) { call.filters.push(['eq', column, value]); return builder },
        neq(column, value) { call.filters.push(['neq', column, value]); return builder },
        gte(column, value) { call.filters.push(['gte', column, value]); return builder },
        order() { return builder },
        limit() { return builder },
        single() { return Promise.resolve(resolve(call)) },
        maybeSingle() { return Promise.resolve(resolve(call)) },
        then(success, failure) { return Promise.resolve(resolve(call)).then(success, failure) }
      }
      return builder
    }
  }
  function resolve(call) {
    const response = responses[`${call.table}:${call.operation}`]
    return Array.isArray(response)
      ? response.shift() || { data: null, error: null }
      : response || { data: [], error: null }
  }
  return client
}

const provider = (client) => ({ forUser: () => client })
const hasTenantFilter = (call) =>
  call.filters.some((filter) => filter[0] === 'eq' && filter[1] === 'user_id' && filter[2] === USER_ID)

test('profile and AI-info payload parity preserves normalization and validation', () => {
  assert.deepEqual(buildProfileUpdate(USER_ID, {
    first_name: ' Ada ',
    hours_per_week: '12.9',
    common_problems: [' Pressing ', '', 3]
  }), {
    user_id: USER_ID,
    first_name: 'Ada',
    hours_per_week: 12,
    common_problems: ['Pressing']
  })
  assert.throws(() => buildProfileUpdate(USER_ID, { hours_per_week: 169 }), /between 0 and 168/)
  assert.deepEqual(buildAiInfoUpdate(USER_ID, {
    platform: ' PC ',
    ai_weak_point: 'defence',
    ai_notes: ' note '
  }), {
    user_id: USER_ID,
    ai_notes: 'note',
    platform: 'pc',
    ai_weak_point: 'defence',
    common_problems: ['Difesa']
  })
  assert.throws(() => buildAiInfoUpdate(USER_ID, { pass_level: 'pa4' }), /Invalid value/)
})

test('user reads and writes are explicitly tenant scoped', async () => {
  const client = recordingClient({
    'user_profiles:select': [
      { data: { id: 'profile-1', user_id: USER_ID }, error: null },
      { data: { id: 'profile-1' }, error: null }
    ],
    'user_profiles:upsert': [
      { data: { id: 'profile-1', first_name: 'Ada' }, error: null },
      { data: { id: 'profile-1', ai_name: 'Coach' }, error: null }
    ]
  })
  const reads = createUserReadService(provider(client))
  const writes = createUserWriteService(provider(client))
  await reads.profile({ token: 'jwt', userId: USER_ID })
  await reads.aiInfo({ token: 'jwt', userId: USER_ID })
  await writes.saveProfile({ token: 'jwt', userId: USER_ID, profile: { first_name: 'Ada' } })
  await writes.saveAiInfo({ token: 'jwt', userId: USER_ID, aiInfo: { ai_name: 'Coach' } })

  assert.ok(client.calls.filter((call) => call.operation === 'select').every(hasTenantFilter))
  for (const call of client.calls.filter((item) => item.operation !== 'select')) {
    assert.ok(call.payload?.user_id === USER_ID || hasTenantFilter(call))
  }
})

test('AI knowledge scoring retains production levels and weighted dimensions', () => {
  const breakdown = calculateAIKnowledgeBreakdown({
    profile: {
      first_name: 'Ada',
      last_name: 'L',
      current_division: 'Division 3',
      initial_division: 'Division 4',
      favorite_team: 'X',
      team_name: 'Y',
      ai_name: 'Coach',
      how_to_remember: 'Direct',
      hours_per_week: 10,
      platform: 'pc'
    },
    players: Array.from({ length: 11 }, (_, slot_index) => ({
      slot_index,
      overall_rating: 90,
      original_positions: [{ position: 'CC' }]
    })),
    matches: Array.from({ length: 10 }, () => ({ result: '2-1' })),
    activeCoach: { id: 'coach-1' },
    weeklyGoals: [{ status: 'completed' }],
    coachFeedback: [{ id: 'f1' }, { id: 'f2' }]
  })
  assert.equal(getAIKnowledgeLevel(30), 'beginner')
  assert.equal(getAIKnowledgeLevel(31), 'intermediate')
  assert.equal(getAIKnowledgeLevel(81), 'expert')
  assert.ok(breakdown.profile > 12)
  assert.equal(breakdown.coach, 8)
  assert.equal(breakdown.coach_training, 2)
})

test('AI knowledge reads and recalculation scope every table to authenticated tenant', async () => {
  const client = recordingClient({
    'user_profiles:select': [
      { data: {}, error: null },
      { data: {}, error: null }
    ],
    'players:select': { data: [], error: null },
    'matches:select': { data: [], error: null },
    'team_tactical_patterns:select': { data: null, error: null },
    'coaches:select': { data: [], error: null },
    'weekly_goals:select': { data: [], error: null },
    'user_tactical_feedback:select': { data: [], error: null },
    'user_profiles:update': { data: null, error: null }
  })
  const service = createAIKnowledgeService({
    readProvider: provider(client),
    writeProvider: provider(client),
    now: () => new Date('2026-09-15T12:00:00.000Z')
  })
  const result = await service.read({ token: 'jwt', userId: USER_ID, refresh: true })
  assert.equal(result.score, 0)
  assert.ok(client.calls.every(hasTenantFilter))
  assert.ok(hasTenantFilter(client.calls.find((call) => call.operation === 'update')))
})

test('credit reads are local, read-only, normalized, and tenant scoped', async () => {
  assert.deepEqual(normalizeUsage({
    period_key: '2026-09',
    credits_used: '12',
    credits_included: '10',
    temp_balance: '3'
  }, 'fallback'), {
    period_key: '2026-09',
    credits_used: 12,
    credits_included: 10,
    balance_remaining: 3,
    temp_balance: 3,
    overage: 2,
    percent_used: 100,
    percent_used_raw: 120
  })
  const client = recordingClient({
    'user_credit_usage:select': { data: { period_key: '2026-09', credits_used: 2, credits_included: 10 }, error: null },
    'credit_transactions:select': [
      { data: [{ id: 'tx-1', amount: -2, type: 'usage' }], error: null },
      { data: [{ sum: 10 }], error: null },
      { data: [{ sum: -2 }], error: null }
    ],
    'matches:select': { data: null, error: null, count: 4 }
  })
  const service = createCreditReadService(provider(client), {
    now: () => new Date('2026-09-15T12:00:00.000Z')
  })
  assert.equal((await service.usage({ token: 'jwt', userId: USER_ID })).balance_remaining, 8)
  const transactions = await service.transactions({ token: 'jwt', userId: USER_ID, limit: 99 })
  assert.equal(transactions.summary.balance_total, 8)
  assert.equal(transactions.total_analyses, 4)
  assert.ok(client.calls.every(hasTenantFilter))
  assert.equal(client.calls.some((call) => call.operation !== 'select'), false)
})

test('starter-pack import belongs to roster and scopes all writes', async () => {
  const pack = {
    formation: { formation: '4-3-3', slot_positions: { 0: { position: 'PT' } } },
    candidates: [{
      player_name: 'Keeper',
      position: 'PT',
      preferred_positions: ['PT'],
      playing_style_name: 'Portiere',
      extracted_data: { source: 'starter-pack' }
    }],
    starterLineup: { 0: 'Keeper' },
    reserveOrder: [],
    coach: { coach_name: 'Boss' },
    tactics: { team_playing_style: 'contrattacco', individual_instructions: {} },
    gameAnalysis: { passing: { short: 1 } }
  }
  assert.equal(buildStarterPlayerRow(pack.candidates[0], {
    userId: USER_ID,
    styles: { portiere: 'style-1' },
    slotIndex: 0
  }).user_id, USER_ID)

  const client = recordingClient({
    'players:select': { data: [], error: null },
    'formation_layout:select': { data: null, error: null },
    'coaches:select': { data: null, error: null },
    'team_tactical_settings:select': { data: null, error: null },
    'user_game_analysis:select': { data: null, error: null },
    'playing_styles:select': { data: [{ id: 'style-1', name: 'Portiere' }], error: null },
    'players:insert': { data: [{ id: 'p1', player_name: 'Keeper' }], error: null },
    'coaches:insert': { data: { id: 'coach-1' }, error: null }
  })
  const service = createStarterPackImportService(provider(client), { pack })
  const result = await service.import({ token: 'jwt', userId: USER_ID })
  assert.equal(result.mode, 'starter_full')
  assert.equal(result.insertedPlayers, 1)
  for (const call of client.calls.filter((item) => item.operation !== 'select')) {
    const rows = Array.isArray(call.payload) ? call.payload : [call.payload]
    assert.ok(rows.every((row) => row?.user_id === USER_ID) || hasTenantFilter(call))
  }
})

test('domain registrars pass identity tenant and dormant guard blocks all writes', async () => {
  const identity = createTestIdentityProvider(USER_ID)
  const calls = []
  const live = Fastify({ logger: false })
  installDormantGuard(live, { dormant: false })
  registerUserRoutes(live, {
    identity,
    userReads: {
      profile: async (input) => { calls.push(input); return {} },
      aiInfo: async (input) => { calls.push(input); return { profile: {} } }
    },
    userWrites: {
      saveProfile: async (input) => { calls.push(input); return { success: true } },
      saveAiInfo: async (input) => { calls.push(input); return { success: true } }
    }
  })
  registerMemoryRoutes(live, {
    identity,
    aiKnowledge: { read: async (input) => { calls.push(input); return { score: 0 } } }
  })
  registerCreditReadRoutes(live, {
    identity,
    creditReads: {
      usage: async (input) => { calls.push(input); return {} },
      transactions: async (input) => { calls.push(input); return { transactions: [] } }
    }
  })
  registerStarterPackRoutes(live, {
    identity,
    starterPackImports: {
      import: async (input) => { calls.push(input); return { success: true } }
    }
  })
  try {
    for (const request of [
      { method: 'GET', url: '/v1/users/profile' },
      { method: 'GET', url: '/v1/users/ai-info' },
      { method: 'GET', url: '/v1/knowledge/read' },
      { method: 'GET', url: '/v1/credits/usage' }
    ]) {
      assert.equal((await live.inject(request)).statusCode, 200)
    }
    assert.ok(calls.every((call) => call.userId === USER_ID))
  } finally {
    await live.close()
  }

  const dormant = Fastify({ logger: false })
  installDormantGuard(dormant, { dormant: true })
  registerUserRoutes(dormant, {
    identity,
    userReads: { profile: async () => ({}), aiInfo: async () => ({}) },
    userWrites: {
      saveProfile: async () => { throw new Error('must not run') },
      saveAiInfo: async () => { throw new Error('must not run') }
    }
  })
  registerStarterPackRoutes(dormant, {
    identity,
    starterPackImports: { import: async () => { throw new Error('must not run') } }
  })
  try {
    for (const request of [
      { method: 'POST', url: '/v1/users/profile/save', payload: {} },
      { method: 'POST', url: '/v1/users/ai-info', payload: {} },
      { method: 'POST', url: '/v1/roster/starter-pack', payload: {} }
    ]) {
      const response = await dormant.inject(request)
      assert.equal(response.statusCode, 403)
      assert.equal(JSON.parse(response.body).dormant, true)
    }
  } finally {
    await dormant.close()
  }
})
