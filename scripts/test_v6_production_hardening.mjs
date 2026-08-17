#!/usr/bin/env node
/**
 * Functional contract checks for v6 production hardening.
 * Does not call OpenAI or write to Supabase.
 *
 *   node scripts/test_v6_production_hardening.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  evaluateLinkUpPlay,
  formatPhaseMatchupForPrompt,
  opponentFluidFromRow,
  shouldOmitFluidFormationRecommendation
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

const fourThreeThreeAttack = slotsFrom([
  { position: 'GK', x: 50, y: 6 },
  { position: 'LB', x: 12, y: 28 },
  { position: 'CB', x: 38, y: 22 },
  { position: 'CB', x: 62, y: 22 },
  { position: 'RB', x: 88, y: 28 },
  { position: 'CMF', x: 32, y: 52 },
  { position: 'CMF', x: 50, y: 48 },
  { position: 'CMF', x: 68, y: 52 },
  { position: 'LWF', x: 14, y: 78 },
  { position: 'CF', x: 50, y: 86 },
  { position: 'RWF', x: 86, y: 78 }
])

const fourThreeThreeDefense = slotsFrom([
  { position: 'GK', x: 50, y: 6 },
  { position: 'LB', x: 10, y: 24 },
  { position: 'CB', x: 38, y: 18 },
  { position: 'CB', x: 62, y: 18 },
  { position: 'RB', x: 90, y: 24 },
  { position: 'DMF', x: 32, y: 40 },
  { position: 'DMF', x: 50, y: 38 },
  { position: 'CMF', x: 68, y: 44 },
  { position: 'LWF', x: 16, y: 68 },
  { position: 'CF', x: 50, y: 72 },
  { position: 'RWF', x: 84, y: 68 }
])

const orchestrator = { id: 'p-dmf', player_name: 'Rodri', position: 'DMF', playing_style: 'Orchestrator' }
const poacher = { id: 'p-cf', player_name: 'Haaland', position: 'CF', playing_style: 'Goal Poacher' }
const extraCm = { id: 'p-cmf', player_name: 'Pedri', position: 'CMF', playing_style: 'Creative Playmaker' }

const completePlay = {
  name: 'Vertical Link',
  focal_point: { playing_style: 'Orchestrator', position: 'DMF' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}
const secondPlay = {
  name: 'Wide Link',
  focal_point: { playing_style: 'Creative Playmaker', position: 'CMF' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}
const incompletePlay = {
  name: 'Broken Link',
  focal_point: { playing_style: 'Orchestrator', position: 'DMF' },
  key_man: { playing_style: 'Goal Poacher' }
}

const clientFluidOff = {
  enabled: false,
  base: { formation: '4-2-3-1', slot_positions: fourThreeThreeAttack }
}
const clientFluidOn = {
  enabled: true,
  base: { formation: '4-3-3', slot_positions: fourThreeThreeAttack },
  attack: { formation: '4-3-3', slot_positions: fourThreeThreeAttack },
  defense: { formation: '4-3-3', slot_positions: fourThreeThreeDefense }
}
const opponentNonFluid = opponentFluidFromRow({
  formation_name: '4-3-3',
  extracted_data: { formation: '4-3-3', slot_positions: fourThreeThreeAttack, players: [poacher] }
})
const opponentFluid = {
  base: { formation: '4-3-3', slot_positions: fourThreeThreeAttack },
  attack: {
    formation: '4-3-3',
    slot_positions: fourThreeThreeAttack,
    players: [{ slot_index: 9, position: 'CF', player_name: 'Kane' }],
    visual_tactical_profile: { width_profile: 'wide' }
  },
  defense: {
    formation: '4-3-3',
    slot_positions: fourThreeThreeDefense,
    players: [{ slot_index: 6, position: 'DMF', player_name: 'Rice' }],
    visual_tactical_profile: { central_density: 'high' }
  },
  movement_summary: ['slot 6 CMF scende a DMF']
}

const promptOff = formatPhaseMatchupForPrompt({
  clientFluid: clientFluidOff,
  opponentFluid: opponentNonFluid,
  matchup: {
    pairings: {
      when_client_attacks: { client: clientFluidOff.base, opponent: opponentNonFluid.attack },
      when_client_defends: { client: clientFluidOff.base, opponent: opponentNonFluid.attack }
    }
  },
  linkUps: []
})
assert(
  'A',
  clientFluidOff.enabled === false
    && !opponentNonFluid.defense
    && promptOff.includes('Cliente formazione fluida: NO')
    && promptOff.includes('AVVERSARIO DIFESA: NON FORNITA')
    && !promptOff.includes('AVVERSARIO DIFESA:\n'),
  'Fluid OFF keeps a single opponent shape and does not invent defense'
)

const promptOn = formatPhaseMatchupForPrompt({
  clientFluid: clientFluidOn,
  opponentFluid,
  matchup: {
    pairings: {
      when_client_attacks: { client: clientFluidOn.attack, opponent: opponentFluid.defense },
      when_client_defends: { client: clientFluidOn.defense, opponent: opponentFluid.attack }
    }
  },
  linkUps: []
})
assert(
  'B',
  promptOn.includes('Cliente formazione fluida: ATTIVA')
    && promptOn.includes('CLIENTE ATTACCO')
    && promptOn.includes('CLIENTE DIFESA')
    && promptOn.includes('AVVERSARIO ATTACCO')
    && promptOn.includes('AVVERSARIO DIFESA')
    && promptOn.includes('nostro ATTACCO vs loro DIFESA')
    && promptOn.includes('loro ATTACCO vs nostra DIFESA'),
  'Fluid ON exposes independent attack/defense phases and the required matchup'
)

assert(
  'C',
  clientFluidOn.attack.formation === '4-3-3'
    && clientFluidOn.defense.formation === '4-3-3'
    && promptOn.includes('slot_positions 0-10')
    && promptOn.includes('Differenze cliente ATTACCO vs DIFESA')
    && promptOn.includes('slot 5:')
    && promptOn.includes('due disposizioni differenti'),
  'Same 4-3-3 names with different slots are shown as two dispositions'
)

const completeEval = evaluateLinkUpPlay(completePlay, [orchestrator, poacher])
assert(
  'D',
  completeEval.activatable === true && completeEval.verification_status === 'activatable',
  'Complete Link-up with two distinct compatible starters is activatable'
)

const first = evaluateLinkUpPlay(completePlay, [orchestrator, poacher, extraCm])
const second = evaluateLinkUpPlay(secondPlay, [orchestrator, poacher, extraCm])
assert(
  'E',
  first.activatable === true
    && second.activatable === true
    && first.name !== second.name
    && first.focal_candidates[0].id !== second.focal_candidates[0].id,
  'Two complete Link-ups are evaluated independently'
)

const incompleteEval = evaluateLinkUpPlay(incompletePlay, [orchestrator, poacher])
assert(
  'F',
  incompleteEval.activatable === false && incompleteEval.verification_status === 'insufficient_data',
  'Incomplete Link-up is never activatable and is insufficient_data, not incompatible'
)

const samePlayerEval = evaluateLinkUpPlay({
  name: 'Same player trap',
  focal_point: { playing_style: 'Orchestrator', position: 'DMF' },
  key_man: { playing_style: 'Orchestrator', position: 'DMF' }
}, [orchestrator])
assert(
  'G',
  samePlayerEval.activatable === false && samePlayerEval.verification_status === 'not_activatable',
  'Same starter for Focal Point and Key Man is never activatable'
)

const page = readFileSync(join(root, 'app/contromisure-pre-partita/page.jsx'), 'utf8')
assert(
  'H',
  page.includes('if (!opponentUsesFluid)')
    && page.includes('await runFullPipeline(imageDataUrl, null, { fluid: false })')
    && page.includes('if (pipelineLockRef.current) return')
    && page.includes('pipelineLockRef.current = true'),
  'Non-fluid first photo starts the single guarded pipeline'
)
assert(
  'I',
  page.includes('if (fluid && !defenseDataUrl) return')
    && page.includes('else if (defenseImage)')
    && !/if \(opponentUsesFluid\) \{\s*await runFullPipeline\(imageDataUrl/.test(page),
  'Fluid first photo alone does not start the pipeline'
)
assert(
  'J',
  page.includes('if (opponentUsesFluid && uploadImage)')
    && page.includes('await runFullPipeline(uploadImage, optimized.dataUrl, { fluid: true })'),
  'Fluid second photo starts one pipeline'
)
assert(
  'K',
  page.includes('pipelineLockRef.current = false')
    && page.includes('disabled={isProcessing}')
    && page.includes('if (pipelineLockRef.current || extracting || generating)'),
  'Inputs are disabled while processing and a second runFullPipeline is ignored'
)

const allenatori = readFileSync(join(root, 'app/allenatori/page.jsx'), 'utf8')
const rosa = readFileSync(join(root, 'app/nuova-rosa-lab/page.jsx'), 'utf8')
assert(
  'L',
  allenatori.includes("t('coachCardRequired')")
    && !allenatori.includes('uploadImages.slice(0, 1)')
    && rosa.includes("t('coachCardRequired')")
    && !rosa.includes('images.slice(0, 1)')
    && allenatori.includes("typeOrder.find((key) => !occupied.has(key))"),
  'Manual photo save is blocked without main; new photos fill the first free slot'
)
const catalogHandler = rosa.slice(
  rosa.indexOf('const handleSelectCatalogCoach ='),
  rosa.indexOf('const extractCoachFromPhotos =')
)
assert(
  'M',
  catalogHandler.includes('buildCoachPayloadFromCatalog(coach)')
    && !catalogHandler.includes('coachPhotoImages')
    && !catalogHandler.includes('extractCoachFromPhotos'),
  'Catalog coach import still saves without requiring photos'
)

assert(
  'N',
  shouldOmitFluidFormationRecommendation(clientFluidOff, opponentNonFluid) === true
    && shouldOmitFluidFormationRecommendation(clientFluidOn, opponentFluid) === false
    && shouldOmitFluidFormationRecommendation(clientFluidOff, opponentFluid) === false,
  'Fluid OFF + opponent without defense omits fluid_formation_recommendation'
)

const extractPrompt = readFileSync(join(root, 'app/api/tactical/extract-opponent-phases/route.js'), 'utf8')
assert(
  'O',
  extractPrompt.includes('"fluid_detected": null')
    && extractPrompt.includes('Due immagini NON implicano Formazione fluida')
    && !extractPrompt.includes("fluid_detected\": 'true'")
    && !extractPrompt.includes('fluid_detected": true'),
  'extract-opponent-phases example stays neutral/null even with two images'
)

const failed = results.filter((item) => !item.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
