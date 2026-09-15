/**
 * Contratto zone partita: attacco tuo ≠ pressione avversaria ≠ gol subiti.
 * node scripts/test-match-attack-zones.mjs
 */
import {
  averageZoneMaps,
  buildMatchZonePromptBlock,
  buildPatternZonePayload,
  formatCompactZonePair,
  formatZonePct,
  resolveMatchAttackZones,
  summarizeMatchAttackZones
} from '../lib/matchAttackZones.js'
import { stripStaleDiagnosticSections } from '../lib/diagnosticCacheSanitize.js'

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    console.error(`FAIL ${label}: expected ${e}, got ${a}`)
    process.exit(1)
  }
}

function assert(condition, label) {
  if (!condition) {
    console.error(`FAIL ${label}`)
    process.exit(1)
  }
}

const nested = {
  team1: { left: 22, center: 51, right: 27 },
  team2: { left: 48, center: 37, right: 15 }
}

assertEqual(
  resolveMatchAttackZones(nested, true),
  { ours: { left: 22, center: 51, right: 27 }, theirs: { left: 48, center: 37, right: 15 } },
  'home team1 = ours'
)
assertEqual(
  resolveMatchAttackZones(nested, false),
  { ours: { left: 48, center: 37, right: 15 }, theirs: { left: 22, center: 51, right: 27 } },
  'away team2 = ours'
)

const flat = { left: 10, center: 80, right: 10 }
assertEqual(
  resolveMatchAttackZones(flat),
  { ours: { left: 10, center: 80, right: 10 }, theirs: null },
  'flat map is ours only'
)

assert(resolveMatchAttackZones(nested).theirs.left === 48, 'default home keeps opponent left')
assert(
  !formatCompactZonePair(null, null),
  'empty compact pair'
)
assert(
  formatCompactZonePair(nested.team1, nested.team2).includes('tue:') &&
    formatCompactZonePair(nested.team1, nested.team2).includes('avv:'),
  'compact pair labels both sides'
)

const matches = [
  { is_home: true, attack_areas: nested },
  { is_home: true, attack_areas: nested }
]
const summary = summarizeMatchAttackZones(matches)
assert(summary.theirsAvg.left === 48, 'opponent average keeps left 48')
assert(summary.oursAvg.center === 51, 'our average keeps center 51')

const payload = buildPatternZonePayload([
  { is_home: true, attack_areas: nested, team_stats: { goals_scored: 1, goals_conceded: 0 } },
  { is_home: true, attack_areas: nested, team_stats: { goals_scored: 0, goals_conceded: 4 } }
])
assertEqual(payload.opponent_attack_areas_avg.left, 48, 'pattern payload opponent left')
assertEqual(payload.conceded_goal_zones_avg, null, 'conceded goal avg stays null')
assertEqual(payload.total_goals_scored, 1, 'pattern payload goals scored')
assertEqual(payload.total_goals_conceded, 4, 'pattern payload goals conceded')
assert(formatZonePct(summary.theirsAvg, 'it').includes('sinistra 48%'), 'IT labels opponent left')

const prompt = buildMatchZonePromptBlock(matches, 'it')
assert(prompt.includes('pressione concessa'), 'prompt names opponent pressure')
assert(prompt.includes('NON sono zone dei gol subiti'), 'prompt refuses conceded-goal label')
assert(prompt.includes('sinistra 48%'), 'prompt includes opponent left')
assert(!prompt.includes('Zone attacco (media)'), 'prompt does not use legacy unlabeled heading')
assert(!prompt.includes('carica partite'), 'with data, do not ask to upload matches')

const emptyPrompt = buildMatchZonePromptBlock([], 'it')
assert(emptyPrompt.includes('nessuna partita salvata'), 'empty matches get a missing-data block')
assert(emptyPrompt.includes('QUI lo screenshot'), 'empty matches ask for heatmap in chat')
assert(emptyPrompt.includes('Non dire un generico'), 'empty matches forbid generic upload phrasing')

const noZonePrompt = buildMatchZonePromptBlock([{ is_home: true, attack_areas: {} }], 'it')
assert(noZonePrompt.includes('senza split attacco avversario'), 'saved matches without zones are labeled')
assert(noZonePrompt.includes('NON dire "carica partite"'), 'do not ask to upload matches if some exist')

const cached = `Rosa: test
Dati dalle partite inserite (zone attacco, voti, recupero): Zone attacco (media): left 22%, right 27%, center 51%.
Ultime sconfitte: 0-4`
const stripped = stripStaleDiagnosticSections(cached, { stripMatchZones: true })
assert(!stripped.includes('Dati dalle partite inserite'), 'strips unlabeled cached zones')
assert(stripped.includes('Ultime sconfitte'), 'keeps recent losses')

assertEqual(averageZoneMaps([]), null, 'empty average is null')

console.log('ok match-attack-zones')
