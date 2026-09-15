import test from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.js'

test('dormant mode is forced to loopback even if HOST requests public bind', () => {
  const previous = {
    HOST: process.env.HOST,
    BACKEND_MODE: process.env.BACKEND_MODE,
    ALLOW_BACKEND_LIVE: process.env.ALLOW_BACKEND_LIVE
  }
  try {
    process.env.HOST = '0.0.0.0'
    process.env.BACKEND_MODE = 'dormant'
    process.env.ALLOW_BACKEND_LIVE = '0'
    const config = loadConfig()
    assert.equal(config.dormant, true)
    assert.equal(config.host, '127.0.0.1')
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
