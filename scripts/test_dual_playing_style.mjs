#!/usr/bin/env node
/**
 * Dual Playing Style / PESDB v6 contract tests.
 * Pure: no OpenAI, no Supabase writes.
 *
 *   node scripts/test_dual_playing_style.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildPlayingStylesFromPesdbCells,
  getPlayingStylesContract,
  normalizePlayingStylesContract,
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

const ROGERS_V6_HTML = `
<table class="playing_styles">
  <tr><th>Playing Style</th></tr>
  <tr><td><span style="color: #efefef;">Att:</span> Hole Player</td></tr>
  <tr><td><span style="color: #efefef;">Def:</span> Pass Disruptor</td></tr>
  <tr><th>Player Skills</th></tr>
  <tr><td>Double Touch</td></tr>
  <tr><th>AI Playing Styles</th></tr>
  <tr><td>Trickster</td></tr>
</table>
`

const LEGACY_SINGLE_HTML = `
<table class="playing_styles">
  <tr><th>Playing Style</th></tr>
  <tr><td>Hole Player</td></tr>
  <tr><th>Player Skills</th></tr>
  <tr><td>Double Touch</td></tr>
</table>
`

const DEF_BASIC_HTML = `
<table class="playing_styles">
  <tr><th>Playing Style</th></tr>
  <tr><td><span style="color: #efefef;">Att:</span> Hole Player</td></tr>
  <tr><td><span style="color: #efefef;">Def:</span> Basic</td></tr>
</table>
`

function stripTags(value) {
  return String(value || '').replace(/<[^>]+>/g, '').replace(/\xa0/g, ' ').trim()
}

function parseStylesLikePython(markup) {
  const match = markup.match(/<table class="playing_styles">([\s\S]*?)<\/table>/)
  if (!match) return { primary: null, skills: [], ai: [], contract: normalizePlayingStylesContract(null) }
  const rows = [...match[1].matchAll(/<tr><(th|td)>([\s\S]*?)<\/\1><\/tr>/g)]
  let section = null
  const styleCells = []
  const skills = []
  const ai = []
  for (const row of rows) {
    const kind = row[1]
    const text = stripTags(row[2])
    if (!text || text === '-') continue
    if (kind === 'th') {
      section = text
      continue
    }
    if (section === 'Playing Style') styleCells.push(text)
    else if (section === 'Player Skills') skills.push(text)
    else if (section === 'AI Playing Styles') ai.push(text)
  }
  const contract = buildPlayingStylesFromPesdbCells(styleCells)
  return { primary: contract.primary, skills, ai, contract, styleCells }
}

/** Mirrors buildCatalogPlayerSavePayload style fields without Next.js path aliases. */
function simulateCatalogSave(card) {
  const playingStyles = getPlayingStylesContract(card)
  const raw = playingStyles.primary || card.playing_style || null
  const italian = resolvePlayingStyleDbName(raw)
  return {
    role: italian || raw || null,
    playing_style: italian || raw || null,
    metadata: { playing_styles: playingStyles },
    extracted_data: { playing_styles: playingStyles, playing_style: italian || raw || null }
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

const rogers = parseStylesLikePython(ROGERS_V6_HTML)
assert(
  'rogers-primary',
  rogers.primary === 'Hole Player' && !String(rogers.primary).includes('Att:'),
  'Rogers primary is Hole Player without Att:'
)
assert(
  'rogers-dual',
  rogers.contract.format === 'dual' &&
    rogers.contract.attack === 'Hole Player' &&
    rogers.contract.defense === 'Pass Disruptor',
  'Rogers keeps ATT and DEF separately'
)
assert(
  'rogers-not-compressed',
  rogers.styleCells.some((c) => /Pass Disruptor/i.test(c)),
  'Second style was present in source cells and not dropped'
)

const legacy = parseStylesLikePython(LEGACY_SINGLE_HTML)
assert(
  'legacy-single',
  legacy.contract.format === 'single' &&
    legacy.contract.attack === 'Hole Player' &&
    legacy.contract.defense === null &&
    legacy.primary === 'Hole Player',
  'Legacy Hole Player stays single-style'
)

const basic = parseStylesLikePython(DEF_BASIC_HTML)
assert(
  'def-basic-kept',
  basic.contract.format === 'dual' &&
    basic.contract.defense === 'Basic' &&
    basic.contract.defense !== null,
  'Def: Basic kept as source value, not nulled'
)

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

const dualCard = {
  id: 'cat-rogers',
  source: 'pesdb',
  source_player_id: '106785772007373',
  player_name: 'Morgan Rogers',
  position: 'TRQ',
  playing_style: 'Hole Player',
  metadata: { playing_styles: rogers.contract },
  players_payload: { role: 'Hole Player', playing_style: 'Hole Player' }
}
const save = simulateCatalogSave(dualCard)
assert(
  'save-primary-it',
  save.role === 'Giocatore chiave' && save.playing_style === 'Giocatore chiave',
  'Save-player primary style resolves to Giocatore chiave'
)
assert(
  'save-keeps-def',
  save.metadata?.playing_styles?.defense === 'Pass Disruptor' &&
    save.extracted_data?.playing_styles?.defense === 'Pass Disruptor',
  'DEF Pass Disruptor survives catalog → Rosa payload'
)
assert(
  'save-no-invent',
  getPlayingStylesContract({ playing_style: 'Hole Player' }).defense === null,
  'Legacy card does not invent a DEF style'
)

const brokenLiveCard = {
  playing_style: 'Att: Hole Player',
  players_payload: { role: 'Att: Hole Player', playing_style: 'Att: Hole Player' }
}
const brokenContract = getPlayingStylesContract(brokenLiveCard)
assert(
  'broken-att-prefix-readable',
  brokenContract.primary === 'Hole Player' &&
    resolvePlayingStyleDbName(brokenContract.primary) === 'Giocatore chiave',
  'Existing live Att: Hole Player rows remain resolvable until reimport'
)

const parserSrc = readFileSync(join(root, 'scripts/import_epic_catalog.py'), 'utf8')
assert(
  'parser-dual-wired',
  parserSrc.includes('playing_styles_contract') &&
    parserSrc.includes('(?i)^att\\s*:\\s*(.+)$') &&
    parserSrc.includes('(?i)^def\\s*:\\s*(.+)$') &&
    parserSrc.includes('"playing_styles": playing_styles_contract'),
  'PESDB importer stores dual contract in metadata'
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
