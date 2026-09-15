import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { createTestIdentityProvider } from '../src/auth.js'
import { installDormantGuard } from '../src/dormant.js'
import {
  createFormationWriteService,
  enrichPlayersForFormation
} from '../src/domains/formations/service.js'
import { registerFormationRoutes } from '../src/domains/formations/routes.js'
import {
  createCoachWriteService
} from '../src/domains/coaches/service.js'
import { registerCoachRoutes } from '../src/domains/coaches/routes.js'
import {
  sanitizeTacticalSettings,
  TEAM_PLAYING_STYLE_IDS
} from '../src/domains/tactics/rules.js'
import {
  createTacticsWriteService,
  registerTacticsRoutes
} from '../src/domains/tactics/service.js'
import { DEFAULT_SLOT_POSITIONS } from '../src/domains/formations/defaults.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'

function createRecordingClient(responses = {}) {
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
        in(column, value) { call.filters.push(['in', column, value]); return builder },
        gte(column, value) { call.filters.push(['gte', column, value]); return builder },
        lte(column, value) { call.filters.push(['lte', column, value]); return builder },
        not(column, operator, value) {
          call.filters.push(['not', column, operator, value])
          return builder
        },
        order() { return builder },
        single() { return Promise.resolve(resolveResponse(call)) },
        maybeSingle() { return Promise.resolve(resolveResponse(call)) },
        then(resolve, reject) {
          return Promise.resolve(resolveResponse(call)).then(resolve, reject)
        }
      }
      return builder
    }
  }
  function resolveResponse(call) {
    const key = `${call.table}:${call.operation}`
    const queue = responses[key]
    if (Array.isArray(queue)) return queue.shift() || { data: null, error: null }
    return queue || { data: [], error: null }
  }
  return client
}

function providerFor(client) {
  return { forUser: () => client }
}

test('formation enrichment applies active coach field overall without mutating input', () => {
  const player = {
    id: 'p1',
    position: 'CC',
    slot_index: 5,
    height: 178,
    base_stats: {},
    development_points: { build_coach: { sliders: { passing: 1 } } },
    position_ratings: {}
  }
  const result = enrichPlayersForFormation([player], {
    layout: { slot_positions: DEFAULT_SLOT_POSITIONS },
    activeCoach: {
      playing_style_competence: { possesso_palla: 88 },
      stat_boosters: []
    },
    tacticalSettings: { team_playing_style: 'possesso_palla' }
  })
  assert.notEqual(result[0], player)
  assert.equal(result[0].position_ratings.CMF, result[0].overall_rating)
  assert.deepEqual(player.position_ratings, {})
})

test('formation layout write scopes every mutation and persists completed layout', async () => {
  const client = createRecordingClient({
    'formation_layout:upsert': {
      data: { id: 'layout-1', formation: '4-3-3', slot_positions: DEFAULT_SLOT_POSITIONS },
      error: null
    },
    'players:select': { data: [], error: null }
  })
  const service = createFormationWriteService(providerFor(client))
  const result = await service.saveLayout({
    token: 'jwt',
    userId: USER_ID,
    formation: ' 4-3-3 ',
    slotPositions: { 0: DEFAULT_SLOT_POSITIONS[0] },
    preserveSlots: []
  })
  assert.equal(result.success, true)
  const mutations = client.calls.filter((call) => call.operation !== 'select')
  assert.ok(mutations.every((call) =>
    call.payload?.user_id === USER_ID ||
    call.filters.some((filter) => filter[1] === 'user_id' && filter[2] === USER_ID)
  ))
  assert.equal(Object.keys(mutations.find((call) => call.table === 'formation_layout').payload.slot_positions).length, 11)
})

test('formation variants persist both phases without changing players or base layout', async () => {
  const client = createRecordingClient({
    'formation_variants:upsert': { data: null, error: null },
    'formation_layout:select': {
      data: { id: 'layout-1', formation: '4-3-3', slot_positions: DEFAULT_SLOT_POSITIONS },
      error: null
    },
    'formation_variants:select': {
      data: [
        { phase: 'attack', formation: '4-2-1-3', slot_positions: DEFAULT_SLOT_POSITIONS },
        { phase: 'defense', formation: '4-4-2', slot_positions: DEFAULT_SLOT_POSITIONS }
      ],
      error: null
    }
  })
  const service = createFormationWriteService(providerFor(client))
  const state = await service.saveVariants({
    token: 'jwt',
    userId: USER_ID,
    enabled: true,
    attack: { formation: '4-2-1-3', slot_positions: DEFAULT_SLOT_POSITIONS },
    defense: { formation: '4-4-2', slot_positions: DEFAULT_SLOT_POSITIONS }
  })
  assert.equal(state.enabled, true)
  const upsert = client.calls.find((call) => call.operation === 'upsert')
  assert.deepEqual(upsert.payload.map((row) => row.user_id), [USER_ID, USER_ID])
  assert.equal(client.calls.some((call) => call.table === 'players'), false)
  assert.equal(client.calls.some((call) =>
    call.table === 'formation_layout' && call.operation !== 'select'
  ), false)
})

test('coach save, activation, and deletion remain tenant scoped', async () => {
  const client = createRecordingClient({
    'coaches:insert': { data: { id: 'coach-1', user_id: USER_ID, coach_name: 'Boss' }, error: null },
    'coaches:select': [
      { data: { id: 'coach-1', user_id: USER_ID }, error: null },
      { data: { id: 'coach-1' }, error: null }
    ]
  })
  const service = createCoachWriteService(providerFor(client))
  await service.save({
    token: 'jwt',
    userId: USER_ID,
    coach: { coach_name: ' Boss ', playing_style_competence: { overload: '88' } }
  })
  await service.setActive({
    token: 'jwt',
    userId: USER_ID,
    coachId: 'coach-1'
  })
  await service.delete({
    token: 'jwt',
    userId: USER_ID,
    coachId: 'coach-1'
  })
  const insert = client.calls.find((call) => call.operation === 'insert')
  assert.equal(insert.payload.user_id, USER_ID)
  assert.equal(insert.payload.playing_style_competence.pressing_totale, 88)
  for (const call of client.calls.filter((item) => ['update', 'delete'].includes(item.operation))) {
    assert.ok(call.filters.some((filter) =>
      filter[0] === 'eq' && filter[1] === 'user_id' && filter[2] === USER_ID
    ))
  }
})

test('tactical settings keep only official styles and valid starter instructions', () => {
  assert.deepEqual(TEAM_PLAYING_STYLE_IDS, [
    'possesso_palla',
    'contropiede_veloce',
    'contrattacco',
    'passaggio_lungo',
    'vie_laterali',
    'pressing_totale'
  ])
  const normalized = sanitizeTacticalSettings({
    teamPlayingStyle: ' pressing_totale ',
    starters: [
      { id: 'field', position: 'CC' },
      { id: 'keeper', position: 'PT' }
    ],
    individualInstructions: {
      attacco_1: { player_id: 'field', instruction: 'ancoraggio' },
      difesa_1: { player_id: 'keeper', instruction: 'marcatura_uomo' },
      difesa_2: { player_id: 'field', instruction: 'linea_bassa' }
    }
  })
  assert.deepEqual(normalized.individualInstructions, {
    attacco_1: {
      player_id: 'field',
      instruction: 'ancoraggio',
      enabled: true
    }
  })
  assert.deepEqual(normalized.droppedInstructions, ['difesa_1', 'difesa_2'])
})

test('tactical write scopes settings and cache invalidation to authenticated tenant', async () => {
  const client = createRecordingClient({
    'players:select': { data: [{ id: 'p1', position: 'CC', slot_index: 5 }], error: null },
    'formation_layout:select': { data: { slot_positions: DEFAULT_SLOT_POSITIONS }, error: null },
    'team_tactical_settings:upsert': {
      data: {
        id: 'settings-1',
        team_playing_style: 'possesso_palla',
        individual_instructions: {
          attacco_1: { player_id: 'p1', instruction: 'ancoraggio', enabled: true }
        }
      },
      error: null
    }
  })
  const service = createTacticsWriteService(providerFor(client))
  const result = await service.save({
    token: 'jwt',
    userId: USER_ID,
    teamPlayingStyle: 'possesso_palla',
    individualInstructions: {
      attacco_1: { player_id: 'p1', instruction: 'ancoraggio' }
    }
  })
  assert.equal(result.success, true)
  const upsert = client.calls.find((call) => call.table === 'team_tactical_settings')
  assert.equal(upsert.payload.user_id, USER_ID)
  const cacheDelete = client.calls.find((call) => call.table === 'user_diagnostic_cache')
  assert.ok(cacheDelete.filters.some((filter) =>
    filter[1] === 'user_id' && filter[2] === USER_ID
  ))
})

test('registrars pass authenticated tenant and dormant guard blocks every write', async () => {
  const calls = []
  const identity = createTestIdentityProvider(USER_ID)
  const writes = {
    saveLayout: async (input) => { calls.push(input); return { success: true } },
    saveVariants: async (input) => { calls.push(input); return {} }
  }
  const coachWrites = {
    save: async (input) => { calls.push(input); return { success: true, is_new: true } },
    setActive: async (input) => { calls.push(input); return { success: true } },
    delete: async (input) => { calls.push(input); return { success: true } }
  }
  const tacticsWrites = {
    save: async (input) => {
      calls.push(input)
      return { success: true, settings: {}, droppedInstructions: [] }
    }
  }
  const app = Fastify({ logger: false })
  installDormantGuard(app, { dormant: false })
  registerFormationRoutes(app, {
    identity,
    formationReads: {
      getFormation: async () => ({}),
      getVariants: async () => ({})
    },
    formationWrites: writes
  })
  registerCoachRoutes(app, {
    identity,
    coachReads: { list: async () => [] },
    coachWrites
  })
  registerTacticsRoutes(app, { identity, tacticsWrites })
  try {
    const live = await app.inject({
      method: 'POST',
      url: '/v1/tactics',
      payload: { team_playing_style: 'possesso_palla' }
    })
    assert.equal(live.statusCode, 200)
    assert.equal(calls[0].userId, USER_ID)
  } finally {
    await app.close()
  }

  const dormant = Fastify({ logger: false })
  installDormantGuard(dormant, { dormant: true })
  registerFormationRoutes(dormant, {
    identity,
    formationReads: { getFormation: async () => ({}), getVariants: async () => ({}) },
    formationWrites: writes
  })
  registerCoachRoutes(dormant, {
    identity,
    coachReads: { list: async () => [] },
    coachWrites
  })
  registerTacticsRoutes(dormant, { identity, tacticsWrites })
  try {
    for (const request of [
      { method: 'POST', url: '/v1/formations/layout', payload: {} },
      { method: 'POST', url: '/v1/formations/variants', payload: {} },
      { method: 'POST', url: '/v1/coaches', payload: {} },
      { method: 'POST', url: '/v1/coaches/active', payload: {} },
      { method: 'DELETE', url: '/v1/coaches/coach-1' },
      { method: 'POST', url: '/v1/tactics', payload: {} }
    ]) {
      const response = await dormant.inject(request)
      assert.equal(response.statusCode, 403)
      assert.equal(JSON.parse(response.body).dormant, true)
    }
    assert.equal(calls.length, 1)
  } finally {
    await dormant.close()
  }
})
