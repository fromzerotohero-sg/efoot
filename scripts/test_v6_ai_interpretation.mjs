#!/usr/bin/env node
/**
 * Functional contract checks for the v6 AI Interpretation Hardening.
 * Does not call OpenAI or write to Supabase.
 *
 *   node scripts/test_v6_ai_interpretation.mjs
 */
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Le lib Next.js usano import relativi senza estensione: hook minimo per node ESM.
const extensionLoader = `
export async function resolve(specifier, context, next) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !specifier.endsWith('.js')) {
    try {
      return await next(specifier, context)
    } catch (error) {
      if (error && error.code === 'ERR_MODULE_NOT_FOUND') {
        return next(specifier + '.js', context)
      }
      throw error
    }
  }
  return next(specifier, context)
}
`
register(`data:text/javascript,${encodeURIComponent(extensionLoader)}`, import.meta.url)

import {
  TEAM_PLAYSTYLE_IDS,
  getTeamPlaystyleLabel,
  resolveTeamStyleId
} from '../lib/efootballV6Rules.js'
import {
  evaluateLinkUpPlay,
  formatPhaseMatchupForPrompt,
  startersForLinkUpVerification
} from '../lib/efootballV6TacticalModel.js'
import { getPlayerPhaseStyle } from '../lib/playingStyleResolve.js'

const { validateCountermeasuresOutput } = await import('../lib/countermeasuresHelper.js')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

// --- Slice 1: canonical v6 semantics ---------------------------------------

assert(
  'S1',
  resolveTeamStyleId('Overload') === 'pressing_totale'
    && resolveTeamStyleId('pressing_totale') === 'pressing_totale'
    && resolveTeamStyleId('pressing totale') === 'pressing_totale'
    && resolveTeamStyleId('Pressing Totale') === 'pressing_totale',
  'Overload / pressing_totale / pressing totale resolve to the same canonical id'
)

assert(
  'S2',
  resolveTeamStyleId('Contrattacco') === 'contrattacco'
    && resolveTeamStyleId('Long Ball Counter') === 'contrattacco'
    && resolveTeamStyleId('long_ball_counter') === 'contrattacco'
    && resolveTeamStyleId('possession game') === 'possesso_palla'
    && resolveTeamStyleId('Quick Counter') === 'contropiede_veloce'
    && resolveTeamStyleId('Long Ball') === 'passaggio_lungo'
    && resolveTeamStyleId('out wide') === 'vie_laterali'
    && resolveTeamStyleId('Tiki-Taka') === null,
  'All six style families resolve via aliases; unknown concepts stay null'
)

assert(
  'S3',
  TEAM_PLAYSTYLE_IDS.length === 6 && TEAM_PLAYSTYLE_IDS.includes('pressing_totale'),
  'Canonical team style list has 6 entries including Overload'
)

const cmOutput = {
  analysis: {},
  countermeasures: {
    tactical_adjustments: [
      {
        type: 'team_playing_style',
        suggestion: 'Passa a Overload per creare superiorità numerica sul lato palla',
        reason: 'Serve pressing sul lato palla',
        priority: 'high'
      },
      {
        type: 'team_playing_style',
        suggestion: 'Imposta Long Ball Counter per ripartire in transizione',
        reason: 'Transizioni rapide contro linea alta',
        priority: 'medium'
      }
    ]
  }
}
const cmValidation = validateCountermeasuresOutput(cmOutput)
const [overloadAdj, counterAdj] = cmOutput.countermeasures.tactical_adjustments
assert(
  'S4',
  cmValidation.valid
    && overloadAdj.type === 'team_playing_style'
    && overloadAdj.suggestion === 'Stile squadra: Overload'
    && counterAdj.type === 'team_playing_style'
    && counterAdj.suggestion === 'Stile squadra: Contrattacco',
  'Countermeasures normalizer recognises Overload and keeps it as team_playing_style (no match_plan downgrade)'
)

const helperSrc = readFileSync(join(root, 'lib/countermeasuresHelper.js'), 'utf8')
assert(
  'S5',
  helperSrc.includes("from './efootballV6Rules'")
    && !helperSrc.includes('const OFFICIAL_TEAM_STYLES = ['),
  'countermeasuresHelper derives official team styles from lib/efootballV6Rules.js (no duplicated 5-style list)'
)

assert(
  'S6',
  getTeamPlaystyleLabel('pressing_totale', 'it') === 'Overload'
    && getTeamPlaystyleLabel('pressing_totale', 'en') === 'Overload',
  'Public label for pressing_totale is Overload while the internal id stays unchanged'
)

const importerSrc = readFileSync(join(root, 'scripts/import_efhub_coach_catalog.py'), 'utf8')
assert(
  'S7',
  importerSrc.includes('"OverLoad": "pressing_totale"'),
  'EFHub coach importer maps OverLoad to pressing_totale'
)

const diagnosticSrc = readFileSync(join(root, 'lib/diagnosticBuilder.js'), 'utf8')
assert(
  'S8',
  /Estilo de equipo v6: solo 6 \([^\)]*Pressing totale \(Overload\)\)/
    .test(diagnosticSrc),
  'ES instructions block lists 6 team styles including Pressing totale (Overload)'
)

// --- Slice 2: countermeasures phase-aware ----------------------------------

const wideMid = {
  id: 'p-wide',
  player_name: 'Wide Mid',
  position: 'TD',
  playing_style: 'Prolific Winger',
  slot_index: 4
}
const striker = {
  id: 'p-cf',
  player_name: 'Striker',
  position: 'CF',
  playing_style: 'Goal Poacher',
  slot_index: 9
}
const fluidLinkUp = {
  enabled: true,
  base: {
    formation: '4-3-3',
    slot_positions: {
      4: { position: 'TD', x: 88, y: 28 },
      9: { position: 'CF', x: 50, y: 86 }
    }
  },
  attack: {
    formation: '4-3-3',
    slot_positions: {
      4: { position: 'CLD', x: 90, y: 60 },
      9: { position: 'CF', x: 50, y: 86 }
    }
  },
  defense: null
}
const wideLinkPlay = {
  name: 'Wide overload link',
  focal_point: { playing_style: 'Prolific Winger', position: 'CLD' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}

const staticEval = evaluateLinkUpPlay(wideLinkPlay, [wideMid, striker])
const linkUpStarters = startersForLinkUpVerification([wideMid, striker], fluidLinkUp)
const phaseEval = evaluateLinkUpPlay(wideLinkPlay, linkUpStarters)
assert(
  'L1',
  staticEval.activatable === false
    && staticEval.verification_status === 'not_activatable'
    && phaseEval.activatable === true
    && phaseEval.verification_status === 'activatable',
  'Link-up requiring CLD activates only when verification uses Fluid attack-phase positions'
)
assert(
  'L2',
  wideMid.position === 'TD' && linkUpStarters[0].position === 'CLD',
  'Link-up verification copies starters and never mutates player.position'
)

const fluidOffStarters = startersForLinkUpVerification([wideMid, striker], { enabled: false })
const fluidOffEval = evaluateLinkUpPlay(wideLinkPlay, fluidOffStarters)
assert(
  'L3',
  fluidOffStarters[0] === wideMid
    && fluidOffEval.activatable === false,
  'Fluid OFF returns the base starters unchanged (previous behaviour)'
)

const dualPlayer = {
  player_name: 'Dual',
  position: 'CF',
  playing_style: 'Hole Player',
  playing_styles: { format: 'dual', attack: 'Hole Player', defense: 'Anchor Man', primary: 'Hole Player' }
}
const basicDualPlayer = {
  player_name: 'Basic Dual',
  position: 'CMF',
  playing_style: 'Hole Player',
  playing_styles: { format: 'dual', attack: 'Hole Player', defense: 'Basic', primary: 'Hole Player' }
}
const legacyPlayer = { player_name: 'Legacy', position: 'CF', playing_style: 'Hole Player' }
const lookupPlayer = { player_name: 'Lookup', position: 'CF', playing_style_id: 'id9' }

assert(
  'P1',
  getPlayerPhaseStyle(dualPlayer, 'attack') === 'Giocatore chiave'
    && getPlayerPhaseStyle(dualPlayer, 'defense') === 'Collante',
  'Dual contract: attack uses attack style, defense uses defense style'
)
assert(
  'P2',
  getPlayerPhaseStyle(basicDualPlayer, 'attack') === 'Giocatore chiave'
    && getPlayerPhaseStyle(basicDualPlayer, 'defense') === null,
  "Defense 'Basic' means no special defensive style: null, never an invented mechanic"
)
assert(
  'P3',
  getPlayerPhaseStyle(legacyPlayer, 'attack') === 'Giocatore chiave'
    && getPlayerPhaseStyle(legacyPlayer, 'defense') === 'Giocatore chiave'
    && getPlayerPhaseStyle(lookupPlayer, 'attack', { id9: 'Opportunista' }) === 'Opportunista',
  'Missing dual contract falls back silently to the legacy single style'
)

assert(
  'F1',
  formatPhaseMatchupForPrompt({}) === '',
  'formatPhaseMatchupForPrompt with no v6 data returns an empty string'
)

const phasePrompt = formatPhaseMatchupForPrompt({
  clientFluid: { enabled: false, base: { formation: '4-3-3', slot_positions: null } },
  clientStarters: [dualPlayer, basicDualPlayer],
  stylesLookup: {}
})
assert(
  'F2',
  phasePrompt.includes('STILI GIOCATORI CLIENTE PER FASE')
    && phasePrompt.includes('Dual: Giocatore chiave')
    && phasePrompt.includes('Dual: Collante')
    && phasePrompt.includes('Basic Dual: nessuno stile difensivo speciale'),
  'Phase matchup prompt shows attack styles vs their defense and defense styles vs their attack'
)

const routeSrc = readFileSync(join(root, 'app/api/generate-countermeasures/route.js'), 'utf8')
assert(
  'F3',
  routeSrc.includes('startersForLinkUpVerification(titolari, clientFluid)')
    && routeSrc.includes('evaluateLinkUpPlay(play, linkUpStarters, stylesLookup)')
    && routeSrc.includes('metadata'),
  'generate-countermeasures verifies Link-up on attack-phase starters and selects metadata (dual playing_styles)'
)

const saveTacticalSrc = readFileSync(join(root, 'app/api/supabase/save-tactical-settings/route.js'), 'utf8')
assert(
  'P0-SAVE',
  saveTacticalSrc.includes('TEAM_PLAYSTYLE_IDS')
    && saveTacticalSrc.includes('const validStyles = TEAM_PLAYSTYLE_IDS')
    && TEAM_PLAYSTYLE_IDS.includes('pressing_totale'),
  'save-tactical-settings accepts pressing_totale via TEAM_PLAYSTYLE_IDS'
)

const constraintMigrationSrc = readFileSync(
  join(root, 'migrations/20260817_allow_pressing_totale_team_playing_style.sql'),
  'utf8'
)
const allowedIds = [
  'possesso_palla',
  'contropiede_veloce',
  'contrattacco',
  'vie_laterali',
  'passaggio_lungo',
  'pressing_totale'
]
assert(
  'P0-CONSTRAINT',
  allowedIds.every((id) => constraintMigrationSrc.includes(`'${id}'::text`))
    && !/UPDATE\s+public\.team_tactical_settings/i.test(constraintMigrationSrc)
    && !/INSERT\s+INTO\s+public\.team_tactical_settings/i.test(constraintMigrationSrc)
    && !/DELETE\s+FROM\s+public\.team_tactical_settings/i.test(constraintMigrationSrc)
    && !constraintMigrationSrc.includes("'overload'::text"),
  'constraint migration adds pressing_totale only and does not rewrite rows'
)

const failed = results.filter((item) => !item.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
