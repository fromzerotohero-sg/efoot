import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { createTestIdentityProvider } from '../src/auth.js'
import { installDormantGuard } from '../src/dormant.js'
import { createMockCreditProvider } from '../src/providers.js'
import { registerVisionRoutes } from '../src/domains/vision/routes.js'
import {
  createVisionService,
  normalizeCoach,
  normalizeFormation,
  normalizeMatchSection,
  normalizePlayer
} from '../src/domains/vision/service.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const IMAGE = 'data:image/png;base64,YQ=='

function openAiSequence(values) {
  const requests = []
  return {
    requests,
    async complete(body, operation) {
      requests.push({ body, operation })
      return { value: values.shift() }
    },
    async parseJson(response) {
      if (response.value instanceof Error) throw response.value
      return response.value
    }
  }
}

test('player extraction preserves vision request, normalization, and mock charge', async () => {
  const openai = openAiSequence([{
    player: {
      player_name: 'Test Player',
      position: 'AMF',
      overall_rating: '104',
      base_stats: { attacking: { finishing: '91' } },
      skills: Array.from({ length: 45 }, (_, index) => `skill-${index}`),
      additional_skills: ['Extra'],
      original_positions: null
    }
  }])
  const credits = createMockCreditProvider()
  const service = createVisionService({ openai, credits, config: { dormant: false } })
  const result = await service.extractPlayer({
    imageDataUrl: IMAGE,
    userId: USER_ID,
    idempotencyKey: 'player-1'
  })

  assert.equal(result.player.overall_rating, 104)
  assert.equal(result.player.base_stats.attacking.finishing, 91)
  assert.equal(result.player.skills.length, 40)
  assert.deepEqual(result.player.original_positions, [{ position: 'AMF', competence: 'Alta' }])
  assert.equal(openai.requests[0].body.model, 'gpt-4o')
  assert.equal(openai.requests[0].body.max_tokens, 2500)
  assert.equal(openai.requests[0].body.messages[0].content[1].image_url.detail, 'high')
  assert.deepEqual(credits.snapshot().map((entry) => entry.type), ['deduct'])
})

test('normalizers retain coach aliases and formation geometry safeguards', () => {
  assert.deepEqual(
    normalizeCoach({
      age: '55',
      playing_style_competence: { Overload: '88' },
      stat_boosters: [{ stat_name: 'Speed', bonus: '2' }]
    }),
    {
      age: 55,
      playing_style_competence: { pressing_totale: 88 },
      stat_boosters: [{ stat_name: 'Speed', bonus: 2 }]
    }
  )

  const formation = normalizeFormation({
    formation: '4-3-3',
    players: [
      { player_name: 'Keeper', position: 'PT', slot_index: 0, x: 50, y: 95, overall_rating: 99 },
      { player_name: 'Bad', slot_index: 0, x_percent: 140, y_percent: -2, overall_rating: 999 }
    ]
  })
  assert.deepEqual(formation.players.map((player) => player.slot_index), [0, 1])
  assert.equal(formation.players[1].x_percent, 100)
  assert.equal(formation.players[1].y_percent, 0)
  assert.equal(formation.players[1].overall_rating, null)
  assert.equal(formation.visual_tactical_profile.width_profile, 'unclear')
})

test('match section normalization orients result to client and ignores other result screens', async () => {
  const stats = normalizeMatchSection('team_stats', {
    result: '1-3',
    team1: { shots: 4 },
    team2: { shots: 12 }
  }, false)
  assert.deepEqual(stats, {
    shots: 12,
    result: '3-1',
    goals_scored: 3,
    goals_conceded: 1
  })

  const openai = openAiSequence([{ result: '8-0', team1: { left: 20, center: 60, right: 20 } }])
  const service = createVisionService({
    openai,
    credits: createMockCreditProvider(),
    config: { dormant: false }
  })
  const result = await service.extractMatchData({
    imageDataUrl: IMAGE,
    section: 'attack_areas',
    userId: USER_ID,
    idempotencyKey: 'match-1'
  })
  assert.equal(result.result, null)
  assert.deepEqual(result.data.team1, { left: 20, center: 60, right: 20 })
})

test('game analysis runs two images sequentially and keeps first when second fails', async () => {
  const broken = new Error('bad image')
  const openai = openAiSequence([
    { goal_types: { Cross: 12 } },
    broken
  ])
  const credits = createMockCreditProvider()
  const saves = []
  const service = createVisionService({
    openai,
    credits,
    gameAnalysisStore: {
      async save(value) { saves.push(value) },
      async get() { return { captured_at: null, has_stats: false, stats: null } }
    },
    config: { dormant: false }
  })
  const result = await service.extractGameAnalysis({
    imageDataUrls: [IMAGE, IMAGE],
    userId: USER_ID,
    idempotencyKey: 'analysis-1'
  })
  assert.equal(result.success, true)
  assert.deepEqual(result.stats.goal_types, { Cross: 12 })
  assert.equal(openai.requests.length, 2)
  assert.equal(saves.length, 1)
  assert.equal(credits.snapshot()[0].capability, 'vision.extractGameAnalysis')
})

test('provider failures refund refundable extraction charges', async () => {
  const providerError = new Error('quota')
  providerError.type = 'rate_limit'
  providerError.statusCode = 429
  const openai = {
    async complete() { throw providerError },
    async parseJson() { throw new Error('must not parse') }
  }
  const credits = createMockCreditProvider()
  const service = createVisionService({ openai, credits, config: { dormant: false } })
  await assert.rejects(
    () => service.extractCoach({
      imageDataUrl: IMAGE,
      userId: USER_ID,
      idempotencyKey: 'coach-1'
    }),
    (error) => error.type === 'rate_limit'
  )
  assert.deepEqual(credits.snapshot().map((entry) => entry.type), ['deduct', 'refund'])
})

test('direct dormant service prevents OpenAI and credit effects', async () => {
  let openAiCalls = 0
  let creditCalls = 0
  const service = createVisionService({
    openai: {
      async complete() { openAiCalls += 1 },
      async parseJson() { openAiCalls += 1 }
    },
    credits: {
      async deduct() { creditCalls += 1; return { ok: true } },
      async refund() { creditCalls += 1 }
    },
    config: { dormant: true }
  })
  await assert.rejects(
    () => service.extractPlayer({ imageDataUrl: IMAGE }),
    (error) => error.statusCode === 403 && error.type === 'dormant'
  )
  assert.equal(openAiCalls, 0)
  assert.equal(creditCalls, 0)
})

test('registrar exposes all retained engines and dormant hook short-circuits effects', async () => {
  let identityCalls = 0
  let visionCalls = 0
  const identity = {
    async resolveUser() {
      identityCalls += 1
      return { token: 'test', userId: USER_ID }
    }
  }
  const vision = Object.fromEntries([
    'extractPlayer', 'extractCoach', 'extractFormation', 'extractMatchData',
    'extractGameAnalysis', 'getGameAnalysis'
  ].map((name) => [name, async () => {
    visionCalls += 1
    return { method: name }
  }]))

  const live = Fastify({ logger: false })
  installDormantGuard(live, { dormant: false })
  registerVisionRoutes(live, { identity: createTestIdentityProvider(USER_ID), vision })
  try {
    for (const url of [
      '/v1/vision/extract-player',
      '/v1/vision/extract-coach',
      '/v1/vision/extract-formation',
      '/v1/vision/extract-match-data',
      '/v1/vision/extract-game-analysis'
    ]) {
      assert.equal((await live.inject({ method: 'POST', url, payload: {} })).statusCode, 200)
    }
    assert.equal((await live.inject({ method: 'GET', url: '/v1/vision/extract-game-analysis' })).statusCode, 200)
    assert.equal(visionCalls, 6)
  } finally {
    await live.close()
  }

  const dormant = Fastify({ logger: false })
  installDormantGuard(dormant, { dormant: true })
  registerVisionRoutes(dormant, { identity, vision })
  try {
    const response = await dormant.inject({
      method: 'POST',
      url: '/v1/vision/extract-player',
      payload: { imageDataUrl: IMAGE }
    })
    assert.equal(response.statusCode, 403)
    assert.equal(JSON.parse(response.body).dormant, true)
    assert.equal(identityCalls, 0)
    assert.equal(visionCalls, 6)
  } finally {
    await dormant.close()
  }
})
