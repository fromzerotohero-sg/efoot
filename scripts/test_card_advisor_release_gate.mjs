#!/usr/bin/env node
/**
 * Gate Card Advisor: pack valutabili vs feed eFHUB.
 *   node scripts/test_card_advisor_release_gate.mjs
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  categoryFromReleaseName,
  extractReleaseDate,
  filterEvaluableReleases,
  intersectDbWithLive,
  isEvaluableCardAdvisorRelease,
} from '../lib/cardAdvisorReleaseGate.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

const ALLOW = [
  "Summer Transfer 17 Aug '26",
  "Chelsea B Selection 14 Aug '26",
  'Lamine Yamal Edition 2027',
  'Leo Messi Edition 2027',
  "English League Selection 13 Aug '26",
  "Moroccan League Selection 13 Aug '26",
  "CAF Africa Cup of Nations Selection 13 Aug '26",
  "Tactical Defence 13 Aug '26",
  "Summer Transfer 13 Aug '26",
  'National Team Icons vol.3',
  "National Team Rising Stars 2 Jul '26",
  'Spain 2010 Selection',
]

const DENY = [
  'Skill Up 2027',
  'Starter Set 2027',
  "Manager Pack 13 Aug '26",
  'Step-up 2027',
  'Welcome Login Bonus 2027',
  'Daily Bonus 2027',
  'Advertisement Reward 2027',
  'eFootball Webstore',
  'New Season Campaign 2027',
  'eFootball™ League 2027 Rewards Phase 1',
  'The Football Festival Campaign',
]

for (const name of ALLOW) {
  assert(`allow:${name}`, isEvaluableCardAdvisorRelease(name), name)
}
for (const name of DENY) {
  assert(`deny:${name}`, !isEvaluableCardAdvisorRelease(name), name)
}

assert('date:summer', extractReleaseDate("Summer Transfer 17 Aug '26") === "17 Aug '26", extractReleaseDate("Summer Transfer 17 Aug '26"))
assert('date:edition-null', extractReleaseDate('Leo Messi Edition 2027') == null, 'edition has year only')
assert('cat:selection', categoryFromReleaseName("Chelsea B Selection 14 Aug '26") === 'Selection')
assert('cat:edition', categoryFromReleaseName('Leo Messi Edition 2027') === 'Edition')
assert('cat:transfer', categoryFromReleaseName("Summer Transfer 17 Aug '26") === 'Transfer')

const filtered = filterEvaluableReleases([
  { name: 'Skill Up 2027' },
  { name: 'Leo Messi Edition 2027' },
], 'name')
assert('filter', filtered.length === 1 && filtered[0].name === 'Leo Messi Edition 2027')

const db = [
  { id: 'leo-messi-edition-2027', name: 'Leo Messi Edition 2027' },
  { id: 'skill-up-2027', name: 'Skill Up 2027' },
]
const live = [{ id: 'leo-messi-edition-2027', name: 'Leo Messi Edition 2027' }]
const intersected = intersectDbWithLive(db, live)
assert('intersect-drops-extra', intersected.length === 1 && intersected[0].id === 'leo-messi-edition-2027')
assert('intersect-live-down', intersectDbWithLive(db, []).length === 2)

const py = spawnSync('python', ['-c', `
from card_advisor_release_gate import is_evaluable_card_advisor_release
allow = ${JSON.stringify(ALLOW)}
deny = ${JSON.stringify(DENY)}
bad = [n for n in allow if not is_evaluable_card_advisor_release(n)]
extra = [n for n in deny if is_evaluable_card_advisor_release(n)]
print('py_ok' if not bad and not extra else 'py_fail', len(bad), len(extra))
`], { encoding: 'utf-8', cwd: join(root, 'scripts') })
assert('python-gate', (py.stdout || '').includes('py_ok'), (py.stdout || py.stderr || '').trim())

const failed = results.filter((row) => !row.ok)
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length }))
process.exit(failed.length ? 1 : 0)
