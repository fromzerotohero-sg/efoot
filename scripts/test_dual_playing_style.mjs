#!/usr/bin/env node
/**
 * Dual Playing Style / PESDB v6 contract tests.
 * Pure: no OpenAI, no Supabase writes.
 *
 * Uses the REAL Python importer for parse_styles / parse_source_version
 * so JS cannot silently diverge from scripts/import_epic_catalog.py.
 *
 *   node scripts/test_dual_playing_style.mjs
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPlayingStylesFromPesdbCells,
  getPlayingStylesContract,
  parsePesdbPlayingStyleCell,
  resolvePlayingStyleDbName,
  stripPlayingStylePhasePrefix
} from '../lib/playingStyleResolve.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

function runPythonImporterSelfTest() {
  const script = join(root, 'scripts/test_pesdb_parse_styles_fixture.py')
  const run = spawnSync('python', [script, '--self-test'], {
    encoding: 'utf-8',
    cwd: root
  })
  if (run.status !== 0) {
    return {
      ok: false,
      error: (run.stderr || run.stdout || `exit ${run.status}`).trim(),
      payload: null
    }
  }
  try {
    return { ok: true, error: '', payload: JSON.parse(run.stdout) }
  } catch (error) {
    return { ok: false, error: `invalid JSON from python: ${error.message}\n${run.stdout}`, payload: null }
  }
}

assert(
  'strip-att',
  stripPlayingStylePhasePrefix('Att: Hole Player') === 'Hole Player',
  'Att: prefix stripped for resolver'
)
assert(
  'strip-def',
  stripPlayingStylePhasePrefix('Def: Pass Disruptor') === 'Pass Disruptor',
  'Def: prefix stripped without inventing IT name'
)
assert(
  'legacy-no-strip',
  stripPlayingStylePhasePrefix('Hole Player') === 'Hole Player',
  'Legacy single style unchanged'
)

const attCell = parsePesdbPlayingStyleCell('Att: Hole Player')
const defCell = parsePesdbPlayingStyleCell('Def: Pass Disruptor')
const legacyCell = parsePesdbPlayingStyleCell('Hole Player')
assert('cell-att', attCell.phase === 'attack' && attCell.name === 'Hole Player', 'Parse Att cell')
assert('cell-def', defCell.phase === 'defense' && defCell.name === 'Pass Disruptor', 'Parse Def cell')
assert('cell-legacy', legacyCell.phase === null && legacyCell.name === 'Hole Player', 'Parse legacy cell')

assert(
  'resolve-legacy',
  resolvePlayingStyleDbName('Hole Player') === 'Giocatore chiave',
  'Legacy EN → IT'
)
assert(
  'resolve-att-prefixed',
  resolvePlayingStyleDbName('Att: Hole Player') === 'Giocatore chiave',
  'Att: Hole Player still resolves to Giocatore chiave'
)
assert(
  'resolve-pass-disruptor-not-forced',
  resolvePlayingStyleDbName('Pass Disruptor') === null &&
    resolvePlayingStyleDbName('Def: Pass Disruptor') === null,
  'Pass Disruptor not forced into legacy playing_styles taxonomy'
)

const jsDual = buildPlayingStylesFromPesdbCells(['Att: Hole Player', 'Def: Pass Disruptor'])
assert(
  'js-contract-dual',
  jsDual.format === 'dual' && jsDual.attack === 'Hole Player' && jsDual.defense === 'Pass Disruptor',
  'JS contract helper mirrors dual ATT/DEF names'
)

const py = runPythonImporterSelfTest()
assert('python-importer-self-test', py.ok && py.payload?.ok === true, py.ok ? 'Real Python parse_styles self-test passed' : py.error)

if (py.payload?.ok) {
  const { rogers, legacy, basic } = py.payload
  assert(
    'python-rogers-dual',
    rogers.primary === 'Hole Player' &&
      rogers.contract.format === 'dual' &&
      rogers.contract.attack === 'Hole Player' &&
      rogers.contract.defense === 'Pass Disruptor',
    'Python importer keeps Rogers ATT+DEF'
  )
  assert(
    'python-rogers-source-version',
    rogers.source_version === 'eFootball 2027 v6.0.0',
    `Python source_version from page labels: ${rogers.source_version}`
  )
  assert(
    'python-legacy-single',
    legacy.primary === 'Hole Player' &&
      legacy.contract.format === 'single' &&
      legacy.contract.defense == null,
    'Python importer keeps legacy single-style'
  )
  assert(
    'python-def-basic-kept',
    basic.contract.defense === 'Basic',
    'Python importer keeps Def: Basic as source value'
  )
  assert(
    'js-python-contract-parity',
    jsDual.attack === rogers.contract.attack &&
      jsDual.defense === rogers.contract.defense &&
      jsDual.primary === rogers.primary,
    'JS contract helper matches Python importer on Rogers'
  )
}

const dualCard = {
  playing_style: 'Hole Player',
  metadata: {
    playing_styles: py.payload?.rogers?.contract || jsDual
  }
}
const saveContract = getPlayingStylesContract(dualCard)
assert(
  'save-keeps-def',
  saveContract.defense === 'Pass Disruptor' && saveContract.primary === 'Hole Player',
  'DEF Pass Disruptor survives catalog contract read'
)
assert(
  'save-no-invent',
  getPlayingStylesContract({ playing_style: 'Hole Player' }).defense === null,
  'Legacy card does not invent a DEF style'
)
assert(
  'broken-att-prefix-readable',
  getPlayingStylesContract({ playing_style: 'Att: Hole Player' }).primary === 'Hole Player' &&
    resolvePlayingStyleDbName('Att: Hole Player') === 'Giocatore chiave',
  'Existing live Att: Hole Player rows remain resolvable until reimport'
)

const parserSrc = readFileSync(join(root, 'scripts/import_epic_catalog.py'), 'utf8')
assert(
  'parser-dual-wired',
  parserSrc.includes('playing_styles_contract') &&
    parserSrc.includes('parse_source_version') &&
    !parserSrc.includes('eFootball 2026 v5.4.0') &&
    parserSrc.includes('DEFAULT_SOURCE_VERSION'),
  'PESDB importer dual contract + v6 source_version (no stale v5.4.0)'
)
const saveSrc = readFileSync(join(root, 'lib/playerSavePayload.js'), 'utf8')
assert(
  'save-payload-wired',
  saveSrc.includes('getPlayingStylesContract') &&
    saveSrc.includes('playing_styles: playingStyles'),
  'buildCatalogPlayerSavePayload persists playing_styles'
)
const searchSrc = readFileSync(join(root, 'app/api/player-catalog/search/route.js'), 'utf8')
assert(
  'search-exposes-contract',
  searchSrc.includes('playing_styles') && searchSrc.includes('getPlayingStylesContract'),
  'Catalog search exposes playing_styles'
)
const migrationSrc = readFileSync(
  join(root, 'migrations/20260817_player_catalog_playing_styles_v6_payload.sql'),
  'utf8'
)
assert(
  'migration-prepared-not-destructive',
  migrationSrc.includes('DO NOT APPLY TO PRODUCTION WITHOUT OWNER APPROVAL') &&
    migrationSrc.includes("pc.metadata->'playing_styles'") &&
    !migrationSrc.includes('DROP TABLE'),
  'Payload refresh migration prepared, additive only'
)

const failed = results.filter((row) => !row.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
