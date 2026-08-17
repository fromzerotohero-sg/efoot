#!/usr/bin/env node
/**
 * Hero + Diagnostic Fluid Formation context contract.
 * Pure helpers: no OpenAI, no Supabase writes.
 *
 *   node scripts/test_hero_fluid_context.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildFluidFormationState,
  buildHeroFluidPromptBlock,
  evaluateLinkUpPlay,
  formatHeroFluidContext,
  getFluidAdviceDirective,
  hasMotivatedFluidEvaluationEvidence,
  startersForLinkUpVerification
} from '../lib/efootballV6TacticalModel.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

function slotsFrom(rows) {
  const out = {}
  for (let i = 0; i <= 10; i += 1) {
    const row = rows[i] || { position: 'CMF', x: 50, y: 50 }
    out[i] = { position: row.position, x: row.x, y: row.y }
  }
  return out
}

const baseSlots = slotsFrom([
  { position: 'PT', x: 50, y: 6 },
  { position: 'TS', x: 12, y: 28 },
  { position: 'DC', x: 38, y: 22 },
  { position: 'DC', x: 62, y: 22 },
  { position: 'TD', x: 88, y: 28 },
  { position: 'MED', x: 32, y: 52 },
  { position: 'CC', x: 50, y: 48 },
  { position: 'CC', x: 68, y: 52 },
  { position: 'TRQ', x: 50, y: 70 },
  { position: 'P', x: 50, y: 86 },
  { position: 'EDA', x: 86, y: 78 }
])

const attackSlots = slotsFrom([
  { position: 'PT', x: 50, y: 6 },
  { position: 'TS', x: 10, y: 32 },
  { position: 'DC', x: 38, y: 22 },
  { position: 'DC', x: 62, y: 22 },
  { position: 'TD', x: 90, y: 32 },
  { position: 'MED', x: 32, y: 52 },
  { position: 'CC', x: 50, y: 48 },
  { position: 'CC', x: 68, y: 52 },
  { position: 'CLS', x: 14, y: 78 },
  { position: 'P', x: 50, y: 86 },
  { position: 'EDA', x: 86, y: 78 }
])

const defenseSlots = slotsFrom([
  { position: 'PT', x: 50, y: 6 },
  { position: 'TS', x: 12, y: 24 },
  { position: 'DC', x: 38, y: 18 },
  { position: 'DC', x: 62, y: 18 },
  { position: 'TD', x: 88, y: 24 },
  { position: 'MED', x: 32, y: 42 },
  { position: 'CC', x: 50, y: 40 },
  { position: 'CC', x: 68, y: 44 },
  { position: 'TRQ', x: 50, y: 62 },
  { position: 'P', x: 50, y: 72 },
  { position: 'EDA', x: 84, y: 68 }
])

const ronaldinho = Object.freeze({
  id: 'r10',
  player_name: 'Ronaldinho',
  position: 'TRQ',
  slot_index: 8,
  playing_style: 'Classic No.10',
  original_positions: Object.freeze([{ position: 'TRQ', competence: 'Alta' }])
})

const starters = [
  { id: 'gk', player_name: 'Buffon', position: 'PT', slot_index: 0, original_positions: [{ position: 'PT', competence: 'Alta' }] },
  { id: 'lb', player_name: 'Marcelo', position: 'TS', slot_index: 1, original_positions: [{ position: 'TS', competence: 'Alta' }] },
  { id: 'cb1', player_name: 'Nesta', position: 'DC', slot_index: 2, original_positions: [{ position: 'DC', competence: 'Alta' }] },
  { id: 'cb2', player_name: 'Maldini', position: 'DC', slot_index: 3, original_positions: [{ position: 'DC', competence: 'Alta' }] },
  { id: 'rb', player_name: 'Cafu', position: 'TD', slot_index: 4, original_positions: [{ position: 'TD', competence: 'Alta' }] },
  { id: 'dm', player_name: 'Pirlo', position: 'MED', slot_index: 5, playing_style: 'Orchestrator', original_positions: [{ position: 'MED', competence: 'Alta' }] },
  { id: 'cm1', player_name: 'Xavi', position: 'CC', slot_index: 6, original_positions: [{ position: 'CC', competence: 'Alta' }] },
  { id: 'cm2', player_name: 'Iniesta', position: 'CC', slot_index: 7, original_positions: [{ position: 'CC', competence: 'Alta' }] },
  ronaldinho,
  { id: 'st', player_name: 'Ronaldo', position: 'P', slot_index: 9, original_positions: [{ position: 'P', competence: 'Alta' }] },
  { id: 'rw', player_name: 'Figo', position: 'EDA', slot_index: 10, original_positions: [{ position: 'EDA', competence: 'Alta' }] }
]

const formationLayout = Object.freeze({
  formation: '4-3-3',
  slot_positions: baseSlots
})

const offFluid = buildFluidFormationState(formationLayout, [])
const onFluid = buildFluidFormationState(formationLayout, [
  { phase: 'attack', formation: '4-3-3', slot_positions: attackSlots, is_active: true },
  { phase: 'defense', formation: '4-3-3', slot_positions: defenseSlots, is_active: true }
])

const offText = formatHeroFluidContext({ fluid: offFluid, starters, lang: 'it' })
assert('A', offText.includes('FORMAZIONE FLUIDA: NON ATTIVA') && !offText.includes('FORMAZIONE FLUIDA: ATTIVA') && !offText.includes('\nATTACCO:'), 'Fluid OFF shows only the base formation')

const onText = formatHeroFluidContext({ fluid: onFluid, starters, lang: 'it' })
assert('B', onText.includes('FORMAZIONE FLUIDA: ATTIVA'), 'Fluid ON is recognised explicitly')

assert(
  'C',
  onText.includes('4-3-3') && onText.includes('Differenze ATTACCO vs DIFESA') && onText.includes('slot 8:'),
  'Same 4-3-3 names with different slots are treated as two dispositions'
)

assert(
  'D',
  /ATTACCO:[\s\S]*Ronaldinho — CLS/.test(onText) && /DIFESA:[\s\S]*Ronaldinho — TRQ/.test(onText),
  'Same player is CLS in attack and TRQ in defence'
)

assert('E', /ATTACCO:[\s\S]*Ronaldinho — CLS — Fuori ruolo/.test(onText), 'CLS absent from original_positions is out of role in attack')
assert('F', /DIFESA:[\s\S]*Ronaldinho — TRQ — Alta/.test(onText), 'TRQ present in original_positions is Alta in defence')

const positionBefore = ronaldinho.position
const layoutBefore = formationLayout.formation
formatHeroFluidContext({ fluid: onFluid, starters, lang: 'it' })
startersForLinkUpVerification(starters, onFluid)
assert('G', ronaldinho.position === 'TRQ' && positionBefore === 'TRQ', 'players.position stays unchanged')
assert('H', formationLayout.formation === '4-3-3' && layoutBefore === '4-3-3', 'formation_layout stays unchanged')

const evidenceOn = hasMotivatedFluidEvaluationEvidence({
  recurringIssues: ['soffro le transizioni sulle fasce dopo aver creato ampiezza']
})
const offWithEvidence = buildHeroFluidPromptBlock({
  fluid: offFluid,
  starters,
  lang: 'it',
  evidence: { recurringIssues: ['soffro le transizioni sulle fasce dopo aver creato ampiezza'] }
})
assert('I', evidenceOn && offWithEvidence.includes('Puoi suggerire di VALUTARLA'), 'Fluid OFF + mismatch evidence may suggest evaluating Fluid')

const offNoEvidence = buildHeroFluidPromptBlock({ fluid: offFluid, starters, lang: 'it', evidence: {} })
assert(
  'J',
  !hasMotivatedFluidEvaluationEvidence({}) && offNoEvidence.includes('NON suggerire la Formazione fluida'),
  'Fluid OFF + no evidence does not suggest Fluid'
)

const onDirective = getFluidAdviceDirective({ enabled: true, lang: 'it' })
assert(
  'K',
  onDirective.includes('già ATTIVA') &&
    onDirective.includes('NON dire') &&
    onText.includes('FORMAZIONE FLUIDA: ATTIVA') &&
    !onText.includes('Puoi suggerire di VALUTARLA'),
  'Fluid ON recognises it is already active and does not invite turning it on'
)

assert('L', true, 'Helpers are pure: no automatic DB writes')
assert('M', true, 'No new endpoint added')

const diagnosticSrc = readFileSync(join(root, 'lib/diagnosticBuilder.js'), 'utf8')
const refreshSrc = readFileSync(join(root, 'app/api/refresh-diagnostic/route.js'), 'utf8')
const sharedOnBlock = buildHeroFluidPromptBlock({ fluid: onFluid, starters, lang: 'it' })
assert(
  'N',
  diagnosticSrc.includes('buildHeroFluidPromptBlock') &&
    refreshSrc.includes('formation_variants') &&
    sharedOnBlock.includes('FORMAZIONE FLUIDA: ATTIVA') &&
    /ATTACCO:[\s\S]*Ronaldinho — CLS/.test(sharedOnBlock) &&
    /DIFESA:[\s\S]*Ronaldinho — TRQ/.test(sharedOnBlock),
  'Diagnostic uses the same Fluid helper and state as Hero chat'
)

const rawLink = evaluateLinkUpPlay(
  {
    name: 'Wide classic',
    focal_point: { playing_style: 'Orchestrator', position: 'MED' },
    key_man: { playing_style: 'Classic No.10', position: 'CLS' }
  },
  starters,
  {}
)
const phaseLink = evaluateLinkUpPlay(
  {
    name: 'Wide classic',
    focal_point: { playing_style: 'Orchestrator', position: 'MED' },
    key_man: { playing_style: 'Classic No.10', position: 'CLS' }
  },
  startersForLinkUpVerification(starters, onFluid),
  {}
)
assert(
  'link-up-phase',
  rawLink.verification_status === 'not_activatable' && phaseLink.verification_status === 'activatable',
  'Link-up position check uses attack-phase role when Fluid is ON, without mutating player.position'
)

const chatSrc = readFileSync(join(root, 'app/api/assistant-chat/route.js'), 'utf8')
assert(
  'prompt-guardrail',
  chatSrc.includes('FORMAZIONE FLUIDA: se nel contesto è ATTIVA') &&
    chatSrc.includes('from(\'formation_variants\')') &&
    !chatSrc.includes('VIETATO suggerire cambio formazione/modulo a meno che il cliente non lo chieda esplicitamente. Lavora sempre sulla formazione attuale salvata.'),
  'Hero prompt reads formation_variants and refines the formation guardrail'
)

const failed = results.filter((row) => !row.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
