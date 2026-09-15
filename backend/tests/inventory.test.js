import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import { ROUTES, routeSources } from '../src/inventory.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function currentApiRoutes(directory = join(ROOT, 'app', 'api')) {
  const routes = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) routes.push(...currentApiRoutes(path))
    else if (entry.name === 'route.js') {
      routes.push(path.slice(ROOT.length + 1).replace(/\\/g, '/'))
    }
  }
  return routes.sort()
}

test('inventory exactly follows current on-disk app/api routes', () => {
  const activeRoutes = currentApiRoutes()
  const catalog = new Set(routeSources())
  const missing = activeRoutes.filter((file) => !catalog.has(file))
  const stale = [...catalog].filter((file) => !activeRoutes.includes(file))
  assert.deepEqual(missing, [], `Missing from inventory: ${missing.join(', ')}`)
  assert.deepEqual(stale, [], `Removed routes still in inventory: ${stale.join(', ')}`)
})

test('removed Live Coach is absent from backend capabilities', () => {
  const liveCoach = ROUTES.filter((row) => row.domain === 'live-coach')
  assert.deepEqual(liveCoach, [])
  assert.equal(routeSources().some((source) => source.includes('/live-coach/')), false)
})

test('MetalGate routes are deferred placeholders', () => {
  const metalgate = ROUTES.filter((row) => row.status === 'deferred-metalgate')
  const capabilities = metalgate.map((row) => row.capability).sort()
  assert.deepEqual(capabilities, [
    'auth.metalgate.callback',
    'auth.metalgate.sync',
    'auth.metalgate.verify',
    'credits.accredit'
  ])
})

test('Hero is not extracted first', () => {
  const hero = ROUTES.filter((row) => row.domain === 'hero' || row.domain === 'countermeasures')
  assert.ok(hero.length > 0)
  assert.ok(hero.every((row) => row.status === 'migrate-after-foundations'))
})
