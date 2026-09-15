import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'

test('backend exposes current product APIs and excludes routes without active callers', async () => {
  const app = await buildApp({ logger: false })
  try {
    for (const [method, url] of [
      ['POST', '/v1/hero/chat'],
      ['POST', '/v1/countermeasures/generate'],
      ['POST', '/v1/cardAdvisor/deepAnalysis'],
      ['POST', '/v1/cardAdvisor/buildPreview'],
      ['POST', '/v1/buildCoach/roster'],
      ['POST', '/v1/buildCoach/player/:id'],
      ['GET', '/v1/credits/usage'],
      ['POST', '/v1/credits/usage'],
      ['GET', '/v1/dashboard/read'],
      ['GET', '/v1/notifications/list']
    ]) {
      assert.equal(app.hasRoute({ method, url }), true, `${method} ${url}`)
    }

    for (const [method, url] of [
      ['GET', '/v1/tasks/list'],
      ['POST', '/v1/tasks/generate'],
      ['POST', '/v1/roster/starter-pack'],
      ['POST', '/v1/cardAdvisor/evaluate'],
      ['POST', '/v1/cardAdvisor/unlock'],
      ['GET', '/v1/credits/transactions'],
      ['POST', '/v1/gates/prelaunch/session'],
      ['POST', '/v1/buildCoach/repairPlayProfile'],
      ['GET', '/v1/catalog/playing-styles'],
      ['POST', '/v1/analytics/recalculate-patterns']
    ]) {
      assert.equal(app.hasRoute({ method, url }), false, `${method} ${url}`)
    }
  } finally {
    await app.close()
  }
})
