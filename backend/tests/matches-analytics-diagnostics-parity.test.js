import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { installDormantGuard } from '../src/dormant.js'
import { createTestIdentityProvider } from '../src/auth.js'
import {
  buildMatchInsert,
  buildMatchSectionPatch,
  createMatchWriteService,
  normalizeMatchSummary,
  registerMatchRoutes
} from '../src/domains/matches/index.js'
import {
  PATTERN_MATCH_LIMIT,
  createAnalyticsWriteService,
  registerAnalyticsRoutes
} from '../src/domains/analytics/service.js'
import {
  createDiagnosticWriteService,
  registerDiagnosticRoutes
} from '../src/domains/diagnostics/service.js'
import { buildDiagnostic } from '../src/domains/diagnostics/builder.js'
import { stripStaleDiagnosticSections } from '../src/domains/diagnostics/cacheSanitize.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const MATCH_ID = '00000000-0000-4000-8000-000000000002'

function createClient(responses = {}) {
  const calls = []
  function response(call) {
    const key = `${call.table}:${call.operation}`
    const value = responses[key]
    if (Array.isArray(value)) return value.shift() || { data: null, error: null }
    return value || { data: [], error: null }
  }
  const client = {
    calls,
    from(table) {
      const call = { table, operation: 'select', filters: [], payload: null, limit: null }
      calls.push(call)
      const builder = {
        select() { return builder },
        insert(payload) { call.operation = 'insert'; call.payload = payload; return builder },
        update(payload) { call.operation = 'update'; call.payload = payload; return builder },
        upsert(payload, options) {
          call.operation = 'upsert'
          call.payload = payload
          call.options = options
          return builder
        },
        delete() { call.operation = 'delete'; return builder },
        eq(column, value) { call.filters.push(['eq', column, value]); return builder },
        in(column, value) { call.filters.push(['in', column, value]); return builder },
        gte(column, value) { call.filters.push(['gte', column, value]); return builder },
        order() { return builder },
        range(start, end) { call.range = [start, end]; return builder },
        limit(value) { call.limit = value; return builder },
        single() { return Promise.resolve(response(call)) },
        maybeSingle() { return Promise.resolve(response(call)) },
        then(resolve, reject) {
          return Promise.resolve(response(call)).then(resolve, reject)
        }
      }
      return builder
    }
  }
  return client
}

const providerFor = (client) => ({ forUser: () => client })

test('match insert preserves route metadata and does not mutate source', () => {
  const source = {
    result: null,
    is_home: false,
    team_stats: { result: '2-1', goals_scored: 2 },
    attack_areas: {
      team1: { left: 60, center: 20, right: 20 },
      team2: { left: 20, center: 30, right: 50 }
    },
    recommended_formation_used: 'true'
  }
  const snapshot = structuredClone(source)
  const row = buildMatchInsert(USER_ID, source, {
    clientTeamName: 'Client',
    now: new Date('2026-09-15T12:00:00.000Z')
  })
  assert.deepEqual(source, snapshot)
  assert.equal(row.result, '2-1')
  assert.deepEqual(row.team_stats, { goals_scored: 2 })
  assert.equal(row.is_home, false)
  assert.equal(row.recommended_formation_used, false)
  assert.equal(row.user_id, USER_ID)
  assert.equal(row.photos_uploaded, 2)
})

test('section patch merges data and keeps AI summary persistence compatible', () => {
  const existing = {
    result: '1-1',
    player_ratings: { cliente: { A: 6 }, avversario: {} },
    team_stats: { possession: 45 },
    attack_areas: null,
    ball_recovery_zones: [],
    formation_played: '4-3-3',
    extracted_data: {},
    recommended_formation_used: false
  }
  const patch = buildMatchSectionPatch(existing, {
    section: 'team_stats',
    data: { possession: 55, result: '3-2', recommended_formation_used: true },
    now: new Date('2026-09-15T12:00:00.000Z')
  })
  assert.equal(patch.result, '3-2')
  assert.deepEqual(patch.team_stats, {
    possession: 55,
    recommended_formation_used: true
  })
  assert.equal(patch.recommended_formation_used, true)
  const ai = buildMatchSectionPatch(existing, {
    section: 'ai_summary',
    data: { ai_summary: 'plain text' },
    now: new Date('2026-09-15T12:00:00.000Z')
  })
  assert.equal(JSON.parse(ai.ai_summary).analysis.match_overview, 'plain text')
})

test('match summary recomputes stale database metadata', () => {
  assert.deepEqual(normalizeMatchSummary({
    id: MATCH_ID,
    match_date: '2026-09-15',
    opponent_name: 'A',
    result: '1-0',
    photos_uploaded: 5,
    formation_played: '4-3-3'
  }), {
    id: MATCH_ID,
    match_date: '2026-09-15',
    opponent_name: 'A',
    result: '1-0',
    photos_uploaded: 1,
    missing_photos: ['player_ratings', 'team_stats', 'attack_areas', 'ball_recovery_zones'],
    data_completeness: 'partial'
  })
})

test('active match save injects the authenticated tenant', async () => {
  const client = createClient({
    'user_profiles:select': { data: { team_name: 'Client' }, error: null },
    'matches:insert': { data: { id: MATCH_ID }, error: null }
  })
  const service = createMatchWriteService(providerFor(client))
  const result = await service.save({
    token: 'jwt',
    userId: USER_ID,
    matchData: { result: '1-0', team_stats: { shots: 5 } }
  })
  assert.equal(result.success, true)
  const insert = client.calls.find((call) => call.table === 'matches')
  assert.equal(insert.payload.user_id, USER_ID)
})

test('pattern recalculation reads latest 20 and persists separate zone concepts', async () => {
  const client = createClient({
    'matches:select': {
      data: [{
        result: '2-1',
        formation_played: '4-3-3',
        playing_style_played: 'Possession',
        is_home: true,
        attack_areas: {
          team1: { left: 20, center: 30, right: 50 },
          team2: { left: 60, center: 20, right: 20 }
        }
      }],
      error: null
    },
    'team_tactical_patterns:upsert': { data: null, error: null }
  })
  const service = createAnalyticsWriteService(providerFor(client))
  await service.recalculatePatterns({ token: 'jwt', userId: USER_ID })
  const read = client.calls.find((call) => call.table === 'matches')
  const write = client.calls.find((call) => call.table === 'team_tactical_patterns')
  assert.equal(PATTERN_MATCH_LIMIT, 20)
  assert.equal(read.limit, 20)
  assert.deepEqual(write.payload.our_attack_areas_avg, { left: 20, center: 30, right: 50 })
  assert.deepEqual(write.payload.opponent_attack_areas_avg, { left: 60, center: 20, right: 20 })
  assert.equal(write.payload.conceded_goal_zones_avg, null)
  assert.equal(write.payload.last_50_matches_count, 1)
  assert.ok(write.filters.length === 0 || write.filters.some((filter) => filter[1] === 'user_id'))
  assert.equal(write.payload.user_id, USER_ID)
})

test('game analysis persistence accepts extracted stats without vision behavior', async () => {
  const client = createClient({
    'user_game_analysis:upsert': { data: null, error: null }
  })
  const service = createAnalyticsWriteService(providerFor(client))
  const result = await service.saveGameAnalysis({
    token: 'jwt',
    userId: USER_ID,
    stats: { passing: { Ground: 52 } },
    capturedAt: new Date('2026-09-15T12:00:00.000Z')
  })
  assert.equal(result.captured_at, '2026-09-15T12:00:00.000Z')
  assert.equal(client.calls[0].payload.user_id, USER_ID)
  assert.deepEqual(client.calls[0].payload.stats, { passing: { Ground: 52 } })
})

test('diagnostic builder distinguishes pressure from conceded-goal zones', () => {
  const text = buildDiagnostic('en', {
    matches: [{
      result: '0-1',
      is_home: true,
      attack_areas: {
        team1: { left: 10, center: 20, right: 70 },
        team2: { left: 50, center: 30, right: 20 }
      }
    }]
  })
  assert.match(text, /Opponent attack \/ pressure conceded/)
  assert.match(text, /Conceded-goal zones: not in database/)
  assert.doesNotMatch(text, /conceded-goal zones.*50/i)
})

test('diagnostic refresh persists generated cache for authenticated tenant', async () => {
  const client = createClient({
    'user_diagnostic_cache:upsert': { data: null, error: null }
  })
  const reads = {
    async loadSourceData({ userId }) {
      assert.equal(userId, USER_ID)
      return { profile: { first_name: 'A' }, matches: [] }
    }
  }
  const service = createDiagnosticWriteService(providerFor(client), reads)
  const result = await service.refresh({
    token: 'jwt',
    userId: USER_ID,
    lang: 'it',
    now: new Date('2026-09-15T12:00:00.000Z')
  })
  assert.equal(result.success, true)
  assert.equal(client.calls[0].payload.user_id, USER_ID)
  assert.match(client.calls[0].payload.content, /ISTRUZIONI/)
})

test('cache sanitation removes only superseded live sections', () => {
  const cleaned = stripStaleDiagnosticSections(
    'Profilo: A\n\nTattica: stale\n\nDati dalle partite inserite: stale\n\nAllenatore: Keep',
    { stripMatchZones: true }
  )
  assert.doesNotMatch(cleaned, /Tattica|Dati dalle/)
  assert.match(cleaned, /Profilo: A/)
  assert.match(cleaned, /Allenatore: Keep/)
})

test('dormant HTTP guard blocks all extracted writes before injected services', async () => {
  let called = false
  const identity = createTestIdentityProvider(USER_ID)
  const app = Fastify({ logger: false })
  installDormantGuard(app, { dormant: true })
  registerMatchRoutes(app, {
    identity,
    matchWrites: {
      async save() { called = true },
      async saveOpponentFormation() { called = true }
    }
  })
  registerAnalyticsRoutes(app, {
    identity,
    analyticsReads: {},
    analyticsWrites: {
      async recalculatePatterns() { called = true },
      async saveGameAnalysis() { called = true }
    }
  })
  registerDiagnosticRoutes(app, {
    identity,
    diagnosticWrites: { async refresh() { called = true } }
  })
  try {
    for (const request of [
      { method: 'POST', url: '/v1/matches', payload: { matchData: {} } },
      { method: 'POST', url: '/v1/matches/opponent-formations', payload: {} },
      { method: 'POST', url: '/v1/analytics/recalculate-patterns', payload: {} },
      { method: 'PUT', url: '/v1/analytics/game-analysis', payload: {} },
      { method: 'POST', url: '/v1/diagnostics/refresh', payload: {} }
    ]) {
      const response = await app.inject(request)
      assert.equal(response.statusCode, 403)
    }
    assert.equal(called, false)
  } finally {
    await app.close()
  }
})
