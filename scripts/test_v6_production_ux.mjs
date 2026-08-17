#!/usr/bin/env node
/**
 * v6 production UX compatibility tests (UX MINIMA DI PRODUZIONE v6).
 * Pure: no OpenAI, no Supabase writes.
 *
 * Covers the Fase 3 minimum contract:
 *   A) pressing_totale -> display "Overload"
 *   B) selecting "Overload" -> internal value pressing_totale (and reload)
 *   C) legacy instructions not available for new assignment
 *   D) existing legacy config still readable
 *   E) Fluid OFF/ON round-trip does not lose phase data
 *   F) dual playing style ATT+DEF displayable
 *   G) DEF Basic never presented as a special style
 *   H) legacy single-style rendering unchanged (no forced ATT/DEF)
 *
 *   node scripts/test_v6_production_ux.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  TEAM_PLAYSTYLES,
  TEAM_PLAYSTYLE_IDS,
  CURRENT_INDIVIDUAL_INSTRUCTION_IDS,
  resolveTeamStyleId,
  getTeamPlaystyleLabel,
  isLegacyIndividualInstruction,
  isCurrentIndividualInstruction,
  findLegacyInstructionIssues,
  getLegacyInstructionLabel,
  isPreservedLegacyAssignment
} from '../lib/efootballV6Rules.js'
import { buildFluidFormationState } from '../lib/efootballV6TacticalModel.js'
import { getPlayerPhaseStyleDisplay } from '../lib/playingStyleResolve.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

// --- A/B) Overload selector ------------------------------------------------
const overload = TEAM_PLAYSTYLES.find((style) => style.id === 'pressing_totale')
assert(
  'overload-option-exists',
  Boolean(overload) && overload.it === 'Overload' && overload.en === 'Overload',
  'Selector option: id pressing_totale, label Overload'
)
assert(
  'overload-label-it-en',
  getTeamPlaystyleLabel('pressing_totale', 'it') === 'Overload' &&
    getTeamPlaystyleLabel('pressing_totale', 'en') === 'Overload',
  'pressing_totale renders as Overload (IT/EN)'
)
assert(
  'overload-select-value',
  resolveTeamStyleId('Overload') === 'pressing_totale',
  'Selecting "Overload" maps to internal value pressing_totale'
)
assert(
  'overload-reload',
  resolveTeamStyleId('pressing_totale') === 'pressing_totale' &&
    TEAM_PLAYSTYLE_IDS.includes('pressing_totale'),
  'Reloading a saved pressing_totale config stays selectable'
)
assert(
  'six-styles-only',
  TEAM_PLAYSTYLES.length === 6,
  'Exactly 6 v6 team playstyles exposed'
)

const i18nSrc = readFileSync(join(root, 'lib/i18n.js'), 'utf8')
assert(
  'overload-i18n-all-langs',
  (i18nSrc.match(/pressing_totale:\s*"Overload"/g) || []).length === 3,
  'i18n label Overload for pressing_totale in IT/EN/ES (never raw pressing_totale)'
)

// --- C) Legacy instructions: CREATE=NO --------------------------------------
assert(
  'legacy-not-current',
  !isCurrentIndividualInstruction('offensivo') &&
    !isCurrentIndividualInstruction('linea_bassa') &&
    !CURRENT_INDIVIDUAL_INSTRUCTION_IDS.includes('offensivo') &&
    !CURRENT_INDIVIDUAL_INSTRUCTION_IDS.includes('linea_bassa'),
  'Legacy instructions not assignable as new options'
)
const instructionsSrc = readFileSync(join(root, 'lib/tacticalInstructions.js'), 'utf8')
assert(
  'legacy-not-in-config',
  !instructionsSrc.includes("id: 'offensivo'") && !instructionsSrc.includes("id: 'linea_bassa'"),
  'Selector config does not offer legacy instructions'
)
const panelSrc = readFileSync(join(root, 'components/TacticalSettingsPanel.jsx'), 'utf8')
assert(
  'panel-legacy-disabled',
  panelSrc.includes('disabled') && panelSrc.includes('isLegacyIndividualInstruction'),
  'Saved legacy option rendered disabled (READ=YES, not re-selectable)'
)

// --- D) Legacy config preserved/readable ------------------------------------
const legacyIssues = findLegacyInstructionIssues({
  counterTarget: { instruction: 'offensivo', player_id: 'p1', enabled: true }
})
assert(
  'legacy-readable',
  legacyIssues.length === 1 &&
    legacyIssues[0].instruction === 'offensivo' &&
    getLegacyInstructionLabel('offensivo', 'it') === 'Offensivo',
  'Existing legacy config still readable with IT label'
)
assert(
  'legacy-preserved-on-save',
  isPreservedLegacyAssignment(
    { instruction: 'offensivo', player_id: 'p1' },
    { instruction: 'offensivo', player_id: 'p1' }
  ) === true,
  'Identical legacy value recognized as preserved (no silent loss)'
)

// --- E) Fluid OFF/ON does not lose data --------------------------------------
function slotsFrom(position) {
  const out = {}
  for (let i = 0; i <= 10; i += 1) out[i] = { position, x: 50, y: 50 }
  return out
}
const baseLayout = { formation: '4-3-3', slot_positions: slotsFrom('CC') }
const fluidRows = [
  { phase: 'attack', formation: '4-3-3', slot_positions: slotsFrom('TRQ'), is_active: true },
  { phase: 'defense', formation: '4-3-3', slot_positions: slotsFrom('MED'), is_active: true }
]
const fluidOn = buildFluidFormationState(baseLayout, fluidRows)
const fluidOff = buildFluidFormationState(baseLayout, fluidRows.map((row) => ({ ...row, is_active: false })))
assert(
  'fluid-off-keeps-phases',
  fluidOff.enabled === false &&
    fluidOff.attack?.slot_positions?.[0]?.position === 'TRQ' &&
    fluidOff.defense?.slot_positions?.[0]?.position === 'MED',
  'Fluid OFF keeps ATT/DEF phase data (no loss on toggle)'
)
assert(
  'fluid-on-restores-phases',
  fluidOn.enabled === true &&
    fluidOn.base?.slot_positions?.[0]?.position === 'CC' &&
    fluidOn.attack?.slot_positions?.[0]?.position === 'TRQ',
  'Fluid ON restores ATT/DEF over unchanged base formation'
)

// --- F/G/H) Dual playing style display ---------------------------------------
const dualPlayer = {
  player_name: 'Dual Card',
  playing_style: 'Hole Player',
  metadata: {
    playing_styles: { format: 'dual', attack: 'Hole Player', defense: 'Pass Disruptor', primary: 'Hole Player' }
  }
}
const dualDisplay = getPlayerPhaseStyleDisplay(dualPlayer)
assert(
  'dual-att-def-displayable',
  dualDisplay && dualDisplay.attack === 'Giocatore chiave' && dualDisplay.defense === 'Pass Disruptor',
  'Dual contract renders ATT + DEF (ATT resolved to IT taxonomy)'
)
const basicDefPlayer = {
  player_name: 'Basic Def Card',
  playing_style: 'Hole Player',
  metadata: {
    playing_styles: { format: 'dual', attack: 'Hole Player', defense: 'Basic', primary: 'Hole Player' }
  }
}
const basicDisplay = getPlayerPhaseStyleDisplay(basicDefPlayer)
assert(
  'def-basic-not-a-style',
  basicDisplay && basicDisplay.attack === 'Giocatore chiave' && basicDisplay.defense === null,
  'DEF Basic -> null (UI shows "Nessuno stile speciale", never Basic as a mechanic)'
)
assert(
  'def-basic-i18n',
  i18nSrc.includes('noSpecialDefenseStyle: "Nessuno stile speciale"') &&
    i18nSrc.includes('noSpecialDefenseStyle: "No special style"') &&
    i18nSrc.includes('noSpecialDefenseStyle: "Sin estilo especial"'),
  'DEF fallback copy exists in IT/EN/ES'
)
const legacyPlayer = { player_name: 'Legacy Card', playing_style: 'Hole Player' }
assert(
  'legacy-single-unchanged',
  getPlayerPhaseStyleDisplay(legacyPlayer) === null,
  'Legacy single-style card: no forced ATT/DEF (rendering unchanged)'
)

const failed = results.filter((row) => !row.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
