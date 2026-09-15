import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { createIdentityProvider, createMetalGateCreditProvider, createMockCreditProvider } from '../src/providers.js'
import { NotImplementedProviderError } from '../src/providers.js'
import { ROUTES } from '../src/inventory.js'

async function withApp(fn, overrides = {}) {
  const app = await buildApp({ logger: false, dormant: true, mode: 'dormant', ...overrides })
  try {
    await fn(app)
  } finally {
    await app.close()
  }
}

test('health and version stay up in dormant mode', async () => {
  await withApp(async (app) => {
    const health = await app.inject({ method: 'GET', url: '/health' })
    const version = await app.inject({ method: 'GET', url: '/version' })
    const ready = await app.inject({ method: 'GET', url: '/ready' })
    assert.equal(health.statusCode, 200)
    assert.equal(JSON.parse(health.body).dormant, true)
    assert.equal(version.statusCode, 200)
    assert.equal(JSON.parse(ready.body).metalgate, 'not-implemented')
  })
})

test('inventory endpoint lists every catalogued capability', async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: 'GET', url: '/inventory' })
    assert.equal(response.statusCode, 200)
    const body = JSON.parse(response.body)
    assert.equal(body.routes.length, ROUTES.length)
    assert.ok(body.dbTriggers.length > 0)
    assert.ok(body.domainContracts.includes('Your attack zones ≠ opponent pressure ≠ conceded-goal zones'))
  })
})

test('mutating requests are rejected while dormant', async () => {
  await withApp(async (app) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/players/save',
      payload: { player: { name: 'test' } }
    })
    assert.equal(response.statusCode, 403)
    const body = JSON.parse(response.body)
    assert.equal(body.dormant, true)
  })
})

test('removed Live Coach is not exposed by the backend', async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: 'GET', url: '/v1/liveCoach/session' })
    assert.equal(response.statusCode, 404)
  })
})

test('MetalGate identity is NOT IMPLEMENTED', async () => {
  const identity = createIdentityProvider()
  await assert.rejects(
    () => identity.resolveUser(),
    (error) => error instanceof NotImplementedProviderError && /NOT IMPLEMENTED/.test(error.message)
  )
})

test('MetalGate credits are NOT IMPLEMENTED; mock credits do not apply wallet moves', async () => {
  const metal = createMetalGateCreditProvider()
  await assert.rejects(() => metal.deduct({ capability: 'hero.chat' }), NotImplementedProviderError)
  const mock = createMockCreditProvider()
  const result = await mock.deduct({ capability: 'hero.chat', idempotencyKey: 'k1' })
  assert.equal(result.applied, false)
  assert.equal(result.mock, true)
})

test('MetalGate handoff is catalogued while backend stays dormant', async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: 'GET', url: '/handoff/metalgate' })
    assert.equal(response.statusCode, 200)
    const body = JSON.parse(response.body)
    assert.equal(body.status, 'not-implemented')
    assert.equal(body.dormant, true)
    assert.ok(body.placeholders.includes('credits.accredit'))
  })
})

test('live mode still refuses fake success on deferred MetalGate routes', async () => {
  await withApp(async (app) => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/credits/accredit',
      payload: {}
    })
    assert.equal(response.statusCode, 501)
    const body = JSON.parse(response.body)
    assert.equal(body.ok, false)
  }, { dormant: false, mode: 'live', allowLive: true })
})

test('all extracted domain registrars mount without environment configuration', async () => {
  await withApp(async (app) => {
    for (const [method, url] of [
      ['POST', '/v1/vision/extract-player'],
      ['GET', '/v1/vision/extract-game-analysis'],
      ['POST', '/v1/cardAdvisor/deepAnalysis'],
      ['POST', '/v1/cardAdvisor/buildPreview'],
      ['GET', '/v1/cardAdvisor/releases'],
      ['POST', '/v1/buildCoach/roster'],
      ['GET', '/v1/dashboard/read'],
      ['GET', '/v1/gates/prelaunch/status'],
      ['GET', '/v1/notifications/list'],
      ['POST', '/v1/hero/chat'],
      ['GET', '/v1/hero/threads'],
      ['GET', '/v1/hero/plans'],
      ['POST', '/v1/countermeasures/generate'],
      ['POST', '/v1/coach-feedback/chat'],
      ['POST', '/v1/coach-feedback/save'],
      ['GET', '/v1/users/profile'],
      ['GET', '/v1/knowledge/read'],
      ['GET', '/v1/credits/usage']
    ]) {
      assert.equal(app.hasRoute({ method, url }), true, `${method} ${url}`)
    }
  })
})

test('dormant guard blocks every mounted write before identity, AI, DB, or credits', async () => {
  let effects = 0
  const providers = {
    identity: { async resolveUser() { effects += 1; throw new Error('must not run') } },
    openai: { async complete() { effects += 1 }, async parseJson() { effects += 1 } },
    credits: {
      async deduct() { effects += 1 },
      async refund() { effects += 1 },
      async accredit() { effects += 1 }
    }
  }
  await withApp(async (app) => {
    for (const [method, url] of [
      ['POST', '/v1/vision/extract-player'],
      ['POST', '/v1/cardAdvisor/evaluate'],
      ['POST', '/v1/cardAdvisor/deepAnalysis'],
      ['POST', '/v1/cardAdvisor/buildPreview'],
      ['POST', '/v1/cardAdvisor/unlock'],
      ['POST', '/v1/buildCoach/roster'],
      ['POST', '/v1/buildCoach/player/p1'],
      ['POST', '/v1/buildCoach/repairPlayProfile'],
      ['POST', '/v1/tasks/generate'],
      ['POST', '/v1/gates/prelaunch/unlock'],
      ['PATCH', '/v1/notifications/list'],
      ['POST', '/v1/notifications/prefs'],
      ['POST', '/v1/hero/chat'],
      ['POST', '/v1/hero/threads'],
      ['POST', '/v1/hero/plans'],
      ['PATCH', '/v1/hero/plans'],
      ['POST', '/v1/countermeasures/generate'],
      ['POST', '/v1/coach-feedback/chat'],
      ['POST', '/v1/coach-feedback/save'],
      ['POST', '/v1/users/profile/save']
    ]) {
      const response = await app.inject({ method, url, payload: {} })
      assert.equal(response.statusCode, 403, `${method} ${url}`)
      assert.equal(JSON.parse(response.body).dormant, true)
    }
    assert.equal(effects, 0)
  }, { providers })
})
