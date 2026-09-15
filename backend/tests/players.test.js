import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { extractBearerToken, createTestIdentityProvider } from '../src/auth.js'
import { createTestReadOnlyProvider } from '../src/readOnlySupabase.js'
import { mergePlayerBaseStats } from '../src/domains/players/service.js'

test('bearer extraction is strict and trims token', () => {
  assert.equal(extractBearerToken({ headers: { authorization: 'Bearer abc ' } }), 'abc')
  assert.equal(extractBearerToken({ headers: { authorization: 'Basic abc' } }), null)
  assert.equal(extractBearerToken({ headers: {} }), null)
})

test('base stats partial patches preserve untouched buckets and keys', () => {
  const result = mergePlayerBaseStats(
    { attacking: { finishing: 80, dribbling: 75 }, defending: { awareness: 60 } },
    { attacking: { finishing: 82 } }
  )
  assert.deepEqual(result, {
    attacking: { finishing: 82, dribbling: 75 },
    defending: { awareness: 60 }
  })
})

test('read-only provider never exposes a mutation path', async () => {
  const provider = createTestReadOnlyProvider({})
  await assert.rejects(() => provider.mutate(), /Writes are forbidden/)
})

test('GET player route keeps tenant id in service contract', async () => {
  const userId = '00000000-0000-4000-8000-000000000001'
  const calls = []
  const app = await buildApp({
    logger: false,
    dormant: true,
    mode: 'dormant',
    providers: { identity: createTestIdentityProvider(userId) },
    playerReads: {
      async getById(input) {
        calls.push(input)
        return {
          player: { id: input.playerId, user_id: input.userId, player_name: 'Test' },
          playingStyleName: 'Regista creativo'
        }
      }
    }
  })
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/players/11111111-1111-4111-8111-111111111111'
    })
    assert.equal(response.statusCode, 200)
    assert.equal(calls[0].userId, userId)
    assert.equal(JSON.parse(response.body).player.user_id, userId)
  } finally {
    await app.close()
  }
})

test('GET player route returns 404 without leaking another tenant', async () => {
  const app = await buildApp({
    logger: false,
    dormant: true,
    mode: 'dormant',
    providers: { identity: createTestIdentityProvider() },
    playerReads: { async getById() { return null } }
  })
  try {
    const response = await app.inject({ method: 'GET', url: '/v1/players/missing' })
    assert.equal(response.statusCode, 404)
    assert.deepEqual(JSON.parse(response.body), { error: 'Player not found' })
  } finally {
    await app.close()
  }
})

test('DELETE player is blocked before handler in dormant mode', async () => {
  let called = false
  const app = await buildApp({
    logger: false,
    dormant: true,
    mode: 'dormant',
    providers: { identity: createTestIdentityProvider() },
    playerWrites: {
      async deleteById() {
        called = true
        return { success: true }
      }
    }
  })
  try {
    const response = await app.inject({ method: 'DELETE', url: '/v1/players/player-1' })
    assert.equal(response.statusCode, 403)
    assert.equal(called, false)
  } finally {
    await app.close()
  }
})

test('DELETE player live contract is scoped to authenticated user', async () => {
  const userId = '00000000-0000-4000-8000-000000000001'
  const playerId = '10000000-0000-4000-8000-000000000001'
  const calls = []
  const app = await buildApp({
    logger: false,
    dormant: false,
    mode: 'live',
    allowLive: true,
    providers: { identity: createTestIdentityProvider(userId) },
    playerWrites: {
      async deleteById(input) {
        calls.push(input)
        return { success: true, player_id: input.playerId, player_name: 'Test' }
      }
    }
  })
  try {
    const response = await app.inject({ method: 'DELETE', url: `/v1/players/${playerId}` })
    assert.equal(response.statusCode, 200)
    assert.equal(calls[0].userId, userId)
    assert.equal(calls[0].playerId, playerId)
  } finally {
    await app.close()
  }
})
