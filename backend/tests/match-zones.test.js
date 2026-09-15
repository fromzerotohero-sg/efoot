import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMatchZonePromptBlock } from '../src/shared/matchAttackZones.js'

test('backend can reuse the match zone contract without rewriting it', () => {
  const empty = buildMatchZonePromptBlock([])
  assert.match(empty, /Non dire un generico/)
  assert.doesNotMatch(empty, /carica partite su un'altra pagina/i)
})
