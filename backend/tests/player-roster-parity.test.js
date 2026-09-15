import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { createTestIdentityProvider } from '../src/auth.js'
import {
  buildPlayerInsert,
  buildPlayerPatch
} from '../src/domains/players/payloads.js'
import {
  buildSlotRoleAugments,
  metadataAfterMovingToReserves,
  positionsAreEquivalent
} from '../src/domains/roster/slotRoles.js'
import { computePlayerFieldOverall } from '../src/domains/players/overall.js'
import {
  createDisabledKnowledgeRefreshSideEffect,
  createKnowledgeRefreshSideEffect
} from '../src/domains/memory/knowledgeRefresh.js'
import { computePlayerFieldOverall as computeLegacyPlayerFieldOverall } from '../../lib/playerOverallPipeline.js'
import {
  canonicalSkillStorageName,
  isFixedInnateCardSkill,
  isKnownPlayerSkill
} from '../../lib/playerSkillLabels.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'

test('player insert preserves natural position, field slot, and dual v6 styles', () => {
  const row = buildPlayerInsert({
    player_name: 'Test Player',
    position: 'CC',
    slot_index: 8,
    original_positions: [{ position: 'MED', competence: 'Alta' }],
    metadata: {
      playing_styles: {
        format: 'dual',
        attack: 'Box to Box',
        defense: 'Pass Disruptor'
      }
    }
  }, {
    userId: USER_ID,
    styleId: 'style-1',
    styleName: 'Onnipresente',
    now: new Date('2026-09-15T12:00:00.000Z')
  })

  assert.equal(row.position, 'CC')
  assert.deepEqual(row.original_positions, [{ position: 'MED', competence: 'Alta' }])
  assert.deepEqual(row.metadata.playing_styles, {
    format: 'dual',
    attack: 'Box-to-Box',
    defense: 'Disturbatore di passaggi',
    primary: 'Box-to-Box'
  })
  assert.equal(row.user_id, USER_ID)
})

test('additional player skills are canonical, deduplicated, and capped at five', () => {
  const row = buildPlayerInsert({
    player_name: 'Skills',
    native_skills: ['Doppio tocco'],
    additional_skills: ['Double Touch', 'Tiro di prima', 'Tiro di prima'],
    skills: []
  }, { userId: USER_ID })
  assert.deepEqual(row.skills, ['Double Touch', 'First-time Shot'])

  assert.throws(() => buildPlayerInsert({
    player_name: 'Too many',
    additional_skills: ['a', 'b', 'c', 'd', 'e', 'f']
  }, { userId: USER_ID }), /at most 5 additional skills/)
})

test('skill taxonomy separates trainable, premium, COM styles, and legacy labels', () => {
  assert.equal(isKnownPlayerSkill('First-time Shot'), true)
  assert.equal(isKnownPlayerSkill('Tap Trick'), true)
  assert.equal(isFixedInnateCardSkill('Tap Trick'), true)
  assert.equal(isFixedInnateCardSkill('Captaincy'), false)
  assert.equal(isKnownPlayerSkill('Long Ball Expert'), false)
  assert.equal(isKnownPlayerSkill('Cross Specialist'), false)
  assert.equal(isKnownPlayerSkill('Aggressive Defence'), false)
  assert.equal(canonicalSkillStorageName('Phenomenal Passing'), 'Phenomenal Pass')
  assert.equal(canonicalSkillStorageName('Penalty Saver'), 'GK Penalty Saver')
})

test('slot role metadata distinguishes card position from formation position', () => {
  assert.equal(positionsAreEquivalent('AMF', 'TRQ'), true)
  const augments = buildSlotRoleAugments({
    player: {
      position: 'P',
      original_positions: [{ position: 'P', competence: 'Alta' }],
      metadata: {}
    },
    slotPosition: 'DC',
    now: new Date('2026-09-15T12:00:00.000Z')
  })
  assert.equal(augments.metadata.intentional_slot_vs_card, true)
  assert.equal(augments.metadata.intentional_slot_position, 'DC')
  assert.deepEqual(metadataAfterMovingToReserves(augments.metadata), {})
})

test('partial player patch preserves nested stats and clears starter-only metadata', () => {
  const patch = buildPlayerPatch({
    player_name: 'Patch',
    position: 'CC',
    slot_index: 4,
    base_stats: {
      attacking: { finishing: 70, dribbling: 80 },
      defending: { awareness: 65 }
    },
    metadata: {
      intentional_slot_vs_card: true,
      intentional_slot_position: 'CC'
    }
  }, {
    slot_index: null,
    base_stats: { attacking: { finishing: 75 } }
  }, { now: new Date('2026-09-15T12:00:00.000Z') })

  assert.deepEqual(patch.base_stats, {
    attacking: { finishing: 75, dribbling: 80 },
    defending: { awareness: 65 }
  })
  assert.equal(patch.slot_index, null)
  assert.equal(patch.metadata.intentional_slot_vs_card, undefined)
})

test('backend OVR pipeline applies progression, active booster, coach, and cap', () => {
  const baseStats = {
    attacking: {
      offensive_awareness: 79,
      finishing: 73,
      low_pass: 84,
      lofted_pass: 82,
      dribbling: 81,
      ball_control: 83,
      tight_possession: 80,
      heading: 65,
      set_piece_taking: 74,
      curl: 76
    },
    defending: {
      defensive_awareness: 72,
      defensive_engagement: 76,
      tackling: 75,
      aggression: 78
    },
    athleticism: {
      speed: 77,
      acceleration: 79,
      kicking_power: 80,
      physical_contact: 74,
      balance: 82,
      stamina: 86,
      jump: 70
    }
  }
  const input = {
    player: {
      position: 'CC',
      height: 178,
      base_stats: baseStats,
      development_points: { build_coach: { sliders: { passing: 2, dexterity: 1 } } },
      available_boosters: [{ name: 'Passing', effect: '+2' }],
      active_booster_name: 'Passing',
      metadata: {
        catalog_overall_max_level: 95,
        build_coach: { before: { base_stats: baseStats } }
      }
    },
    slotPosition: 'CC',
    coach: {
      playing_style_competence: { possesso_palla: 88 },
      stat_boosters: [{ stat_name: 'speed', bonus: 1 }]
    },
    teamStyle: 'possesso_palla'
  }
  const result = computePlayerFieldOverall(input)

  assert.deepEqual(result, {
    targetPosition: 'CMF',
    overallCap: 95,
    progressionOverall: 93,
    playProfileOverall: 94,
    inGameOverall: 94,
    fieldOverall: 95,
    afterOverall: 95
  })
  assert.deepEqual(result, computeLegacyPlayerFieldOverall(input))
})

test('knowledge refresh is asynchronous in live mode and inert otherwise', async () => {
  const calls = []
  const warnings = []
  const disabled = createDisabledKnowledgeRefreshSideEffect()
  assert.deepEqual(disabled.schedule({ userId: USER_ID, source: 'players.save' }), {
    scheduled: false,
    reason: 'disabled'
  })
  const dormant = createKnowledgeRefreshSideEffect({
    live: false,
    refresh: async (input) => calls.push(input)
  })
  assert.deepEqual(dormant.schedule({ userId: USER_ID, source: 'players.delete' }), {
    scheduled: false,
    reason: 'disabled'
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(calls.length, 0)

  const live = createKnowledgeRefreshSideEffect({
    live: true,
    refresh: async (input) => {
      calls.push(input)
      throw new Error('refresh failed')
    },
    logger: { warn: (...args) => warnings.push(args) }
  })
  assert.deepEqual(live.schedule({ userId: USER_ID, source: 'players.patch' }), {
    scheduled: true
  })
  assert.equal(calls.length, 0)
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(calls, [{ userId: USER_ID, source: 'players.patch' }])
  assert.equal(warnings.length, 1)
})

test('all extracted player and roster HTTP writes are blocked by dormant guard', async () => {
  let called = false
  const writes = {
    async save() { called = true },
    async patchById() { called = true },
    async assignToSlot() { called = true },
    async removeFromSlot() { called = true },
    async deleteById() { called = true }
  }
  const app = await buildApp({
    logger: false,
    dormant: true,
    mode: 'dormant',
    providers: { identity: createTestIdentityProvider(USER_ID) },
    playerWrites: writes
  })
  try {
    for (const request of [
      { method: 'POST', url: '/v1/players', payload: { player: { player_name: 'A' } } },
      { method: 'PATCH', url: '/v1/players/p1', payload: { player_name: 'B' } },
      { method: 'PATCH', url: '/v1/roster/assign-to-slot', payload: { slot_index: 1, player_id: 'p1' } },
      { method: 'PATCH', url: '/v1/roster/remove-from-slot', payload: { player_id: 'p1' } }
    ]) {
      const response = await app.inject(request)
      assert.equal(response.statusCode, 403)
      assert.equal(JSON.parse(response.body).dormant, true)
    }
    assert.equal(called, false)
  } finally {
    await app.close()
  }
})

test('live roster route passes authenticated tenant to write service', async () => {
  const calls = []
  const app = await buildApp({
    logger: false,
    dormant: false,
    mode: 'live',
    allowLive: true,
    providers: { identity: createTestIdentityProvider(USER_ID) },
    playerWrites: {
      async assignToSlot(input) {
        calls.push(input)
        return { success: true, player_id: input.playerId, slot_index: input.slotIndex }
      }
    }
  })
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/roster/assign-to-slot',
      payload: { slot_index: 3, player_id: 'p1' }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(calls[0].userId, USER_ID)
    assert.equal(calls[0].playerId, 'p1')
  } finally {
    await app.close()
  }
})
