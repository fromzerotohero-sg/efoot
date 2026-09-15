import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { installRateLimitHook } from '../src/rateLimiter.js'
import {
  CARD_ADVISOR_DEEP_COST,
  CARD_ADVISOR_DEEP_RATE_LIMIT,
  EFHUB_HOME_URL,
  createCardAdvisorService,
  normalizeAdvisorCard,
  parseEfhubReleases,
  registerCardAdvisorRoutes,
  validateImageSource
} from '../src/domains/card-advisor/index.js'
import { normalizeDeepAnalysis } from '../src/domains/card-advisor/deep-analysis.js'

const live = { dormant: false }
const card = { name: 'Player A', position: 'P', sourcePlayerId: '42', source: 'efhub' }
const catalogCard = {
  source: 'efhub',
  source_player_id: '42',
  player_name: 'Player A',
  position: 'P',
  enrichment_status: 'complete',
  base_stats: { finishing: 90 }
}

test('normalization, EFHub parsing, and image validation match active route inputs', () => {
  assert.deepEqual(normalizeAdvisorCard({
    name: ' Player A ',
    position: ' P ',
    overall: '99',
    imageUrl: ' https://efimg.com/a.png '
  }), {
    id: '',
    name: 'Player A',
    position: 'P',
    overall: 99,
    category: '',
    style: '',
    skills: [],
    height: null,
    weight: null,
    sourcePlayerId: '',
    source: ''
  })
  assert.equal(validateImageSource('https://efimg.com/a.png').ok, true)
  assert.equal(validateImageSource('http://efimg.com/a.png').ok, false)
  assert.equal(validateImageSource('https://evil.test/a.png').ok, false)

  const markup = '<section><h2>Standout &amp; Stars 15 Sep \'26</h2>' +
    '<a href="/players/42"><img src="https://efimg.com/a.png?a=1&amp;b=2" alt="Player &amp; A">' +
    '<span class="text-white">98</span><span class="text-white">P</span></a></section>'
  const parsed = parseEfhubReleases(markup)
  assert.equal(parsed[0].id, 'standout-stars-15-sep-26')
  assert.equal(parsed[0].cards[0].category, 'Standout')
  assert.equal(parsed[0].cards[0].name, 'Player & A')
})

test('releases prefer synchronized DB data and preserve the page response contract', async () => {
  const dbRelease = { id: 'pack-a', cards: [{ id: 'db-card' }] }
  const service = createCardAdvisorService({
    config: live,
    db: { readReleases: async () => [dbRelease] },
    fetchImpl: async () => ({
      ok: true,
      async text() {
        return '<section><h2>Pack A</h2><a href="/players/42"><img src="https://efimg.com/a.png" alt="A"><span class="text-white">98</span><span class="text-white">P</span></a></section>'
      }
    }),
    now: () => new Date('2026-09-15T12:00:00.000Z')
  })
  const result = await service.releases()
  assert.deepEqual(result, {
    source: 'card_advisor_cards',
    sourceUrl: EFHUB_HOME_URL,
    fetchedAt: '2026-09-15T12:00:00.000Z',
    releases: [dbRelease]
  })
})

test('build preview resolves live catalog fallback and returns production contract wrapper', async () => {
  let input
  const service = createCardAdvisorService({
    config: live,
    db: {
      readBuildPreviewContext: async () => ({
        catalogCard: null,
        rosterContext: { players: [{ id: 'p1' }] }
      })
    },
    fetchCardDetail: async () => catalogCard,
    buildPreview: async (value) => {
      input = value
      return { ok: true, meta: { ok: true }, roster: { ok: true }, skills: { available: true, items: [] } }
    }
  })
  const result = await service.preview({ userId: 'u1', token: 'jwt', card, lang: 'en' })
  assert.equal(input.catalogCard, catalogCard)
  assert.equal(input.lang, 'en')
  assert.equal(result.preview.catalogSource, 'efhub_live')
  assert.equal(result.preview.meta.ok, true)
})

test('deep analysis uses production cost/model fallback, normalized contract, and refund semantics', async () => {
  const models = []
  const ledger = []
  const service = createCardAdvisorService({
    config: live,
    db: {
      readDeepAnalysisContext: async () => ({
        catalogCard,
        rosterContext: { players: [] }
      })
    },
    evaluator: {
      buildDeepRequest: async ({ model }) => ({ model }),
      normalizeDeep: normalizeDeepAnalysis
    },
    credits: {
      async deduct(input) { ledger.push(['deduct', input]); return { success: true } },
      async refund(input) { ledger.push(['refund', input]); return { success: true } }
    },
    openai: {
      async complete(request) {
        models.push(request.model)
        if (models.length === 1) throw Object.assign(new Error('missing'), { type: 'model_not_found' })
        return {}
      },
      async parseJson() {
        return { headline: 'Take it', verdict: 'take', purchase_fit: 'fits_current_setup', pros: ['Fast'] }
      }
    }
  })
  const result = await service.deepAnalysis({
    userId: 'u1',
    token: 'jwt',
    card,
    lang: 'en',
    idempotencyKey: 'idem'
  })
  assert.deepEqual(models, [process.env.CARD_ADVISOR_DEEP_MODEL || 'gpt-5.2', 'gpt-4o'])
  assert.equal(result.cost, CARD_ADVISOR_DEEP_COST)
  assert.equal(result.analysis.verdict, 'take')
  assert.equal(ledger.length, 1)
  assert.equal(ledger[0][1].idempotencyKey, 'idem')
})

test('routes expose only page-used endpoints and deep analysis carries 6/min rate config', async () => {
  const app = Fastify()
  const rateChecks = []
  installRateLimitHook(app, {
    async check(userId, capability, config) {
      rateChecks.push({ userId, capability, config })
      return { allowed: true, remaining: 5, resetAt: new Date('2026-09-15T12:01:00.000Z') }
    }
  })
  const calls = []
  registerCardAdvisorRoutes(app, {
    identity: { async resolveUser() { return { userId: 'u1', token: 'jwt' } } },
    service: {
      async deepAnalysis(input) { calls.push(['deep', input]); return { success: true } },
      async preview(input) { calls.push(['preview', input]); return { preview: {} } },
      async releases() { return { releases: [] } },
      async image() {
        return { body: Buffer.from('image'), contentType: 'image/png' }
      }
    }
  })
  try {
    assert.equal((await app.inject({
      method: 'POST',
      url: '/v1/cardAdvisor/deepAnalysis',
      headers: { authorization: 'Bearer jwt' },
      payload: { card }
    })).statusCode, 200)
    assert.deepEqual(rateChecks[0], {
      userId: 'u1',
      capability: 'cardAdvisor.deepAnalysis',
      config: CARD_ADVISOR_DEEP_RATE_LIMIT
    })
    assert.equal((await app.inject({ method: 'POST', url: '/v1/cardAdvisor/evaluate', payload: {} })).statusCode, 404)
    assert.equal((await app.inject({ method: 'POST', url: '/v1/cardAdvisor/unlock', payload: {} })).statusCode, 404)
    const routes = app.printRoutes()
    assert.match(routes, /cardAdvisor\//)
    assert.match(routes, /releases \(GET/)
    assert.match(routes, /image \(GET/)
  } finally {
    await app.close()
  }
})
