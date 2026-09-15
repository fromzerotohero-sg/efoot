import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import {
  calculatePlayerBuild,
  createBuildCoachService,
  registerBuildCoachRoutes
} from '../src/domains/build-coach/index.js'
import { calculateGameplayBuild } from '../../lib/gameplayBuildCoach.js'

const live = { dormant: false }
const player = {
  id: 'player-1',
  user_id: 'tenant-a',
  player_name: 'Parity Player',
  position: 'CC',
  overall_rating: 82,
  level_cap: 12,
  height: 178,
  base_stats: {
    offensiveAwareness: 75,
    finishing: 70,
    lowPass: 82,
    loftedPass: 80,
    ballControl: 81,
    dribbling: 78,
    tightPossession: 79,
    speed: 76,
    acceleration: 77,
    kickingPower: 73,
    stamina: 80,
    balance: 76,
    physicalContact: 72,
    defensiveAwareness: 68,
    ballWinning: 69,
    aggression: 71
  },
  development_points: { manual_note: true },
  metadata: { source: 'fixture' },
  position_ratings: { MED: 80 },
  slot_index: 4
}

const rosterContext = {
  players: [player],
  tacticalSettings: { team_playing_style: 'possesso_palla' },
  activeCoach: null,
  layout: { slot_positions: { 4: { position: 'CC' } } }
}

test('calculator matches production gameplay build and persistence payload', async () => {
  const production = calculateGameplayBuild({
    player,
    roster: rosterContext.players,
    teamStyle: rosterContext.tacticalSettings.team_playing_style,
    coach: rosterContext.activeCoach,
    slotPosition: 'CC',
    catalogCard: null
  })
  const result = await calculatePlayerBuild({ player, rosterContext, catalogCard: null })

  assert.equal(result.ok, true)
  assert.deepEqual(result.publicResult, {
    ok: true,
    player_id: player.id,
    player_name: player.player_name,
    before_overall: player.overall_rating,
    after_overall: production.afterOverall,
    target_position: production.targetPosition,
    points_used: production.pointsUsed,
    sliders: production.sliders,
    reasons: production.reasons,
    estimated_fields: production.estimatedFields
  })
  assert.equal(result.updatePayload.overall_rating, production.afterOverall)
  assert.deepEqual(result.updatePayload.development_points.manual_note, true)
  assert.deepEqual(result.updatePayload.development_points.build_coach.sliders, production.sliders)
  assert.deepEqual(result.updatePayload.metadata.build_coach.reasons, production.reasons)
  assert.equal(result.updatePayload.metadata.build_coach.before.base_stats.attacking.low_pass, player.base_stats.lowPass)
  assert.equal(result.updatePayload.metadata.build_coach.before.base_stats.athleticism.speed, player.base_stats.speed)
  assert.match(result.updatePayload.updated_at, /^\d{4}-\d{2}-\d{2}T/)
})

test('roster resolves catalog per player, scopes writes, and preserves summary contract', async () => {
  const fixed = {
    ...player,
    id: 'fixed-1',
    player_name: 'Fixed Card',
    card_type: 'POTW Worldwide'
  }
  const writes = []
  const catalogReads = []
  const service = createBuildCoachService({
    config: live,
    db: {
      readRosterContext: async ({ userId, token }) => {
        assert.equal(userId, 'tenant-a')
        assert.equal(token, 'jwt')
        return { ...rosterContext, players: [player, fixed] }
      },
      findCatalogCard: async ({ userId, player: item }) => {
        catalogReads.push([userId, item.id])
        return null
      },
      updatePlayerBuild: async (input) => writes.push(input)
    },
    calculator: calculatePlayerBuild,
    repairer: async () => ({ ok: false })
  })

  const response = await service.roster({ userId: 'tenant-a', token: 'jwt' })
  assert.deepEqual(response.summary, { total: 2, updated: 1, skipped: 1, estimated: 0 })
  assert.deepEqual(catalogReads, [['tenant-a', 'player-1'], ['tenant-a', 'fixed-1']])
  assert.equal(writes.length, 1)
  assert.equal(writes[0].userId, 'tenant-a')
  assert.equal(writes[0].token, 'jwt')
  assert.equal(writes[0].playerId, 'player-1')
  assert.equal(response.results[1].error, 'non_progression_card_type')
})

test('single-player route returns production 422 payload and message', async () => {
  const app = Fastify({ logger: false })
  const fixed = {
    ...player,
    id: 'fixed-1',
    player_name: 'Fixed Card',
    card_type: 'POTW Worldwide'
  }
  const service = createBuildCoachService({
    config: live,
    db: {
      readRosterContext: async () => ({ ...rosterContext, players: [fixed] }),
      findCatalogCard: async () => null,
      updatePlayerBuild: async () => assert.fail('fixed card must not be persisted')
    },
    calculator: calculatePlayerBuild,
    repairer: async () => ({ ok: false })
  })
  registerBuildCoachRoutes(app, {
    identity: { resolveUser: async () => ({ userId: 'tenant-a', token: 'jwt' }) },
    service
  })

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/buildCoach/player/fixed-1'
    })
    assert.equal(response.statusCode, 422)
    assert.deepEqual(JSON.parse(response.body), {
      error: 'non_progression_card_type',
      message: 'Questo tipo di carta ha progressione fissa nel gioco e non può ricevere una build automatica.',
      result: {
        ok: false,
        player_id: 'fixed-1',
        player_name: 'Fixed Card',
        error: 'non_progression_card_type',
        card_type: 'POTW Worldwide',
        estimated_fields: []
      }
    })
  } finally {
    await app.close()
  }
})
