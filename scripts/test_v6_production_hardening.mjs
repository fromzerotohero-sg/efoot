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
  getFluidCardRoleLabel,
  getPhasePositionFit,
  getPhaseSlotPosition,
  opponentFluidFromRow,
  shouldOmitFluidFormationRecommendation
} from '../lib/efootballV6TacticalModel.js'
import { playingStylesMatch } from '../lib/playingStyleResolve.js'

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

const stylesLookup = {
  id1: 'Orchestratore',
  id2: 'Opportunista',
  id3: 'Sviluppo',
  id4: 'Ala prolifica',
  id5: 'Box-to-Box',
  id6: 'Onnipresente'
}
assert(
  'P1',
  playingStylesMatch('Orchestrator', 'Orchestratore')
    && playingStylesMatch('Goal Poacher', 'Opportunista')
    && playingStylesMatch('Build Up', 'Sviluppo')
    && playingStylesMatch('Prolific Winger', 'Ala prolifica')
    && playingStylesMatch('Box To Box', 'Box-to-Box')
    && playingStylesMatch('Box To Box', 'Onnipresente')
    && !playingStylesMatch('Orchestrator', 'Opportunista')
    && !playingStylesMatch('Goal Poacher', 'Orchestratore'),
  'Resolver maps EFHub EN names to production DB names without fuzzy matching'
)

const productionStarters = [
  { id: 's1', player_name: 'Rodri', position: 'DMF', playing_style_id: 'id1' },
  { id: 's2', player_name: 'Haaland', position: 'CF', playing_style_id: 'id2' },
  { id: 's3', player_name: 'Rice', position: 'DMF', playing_style_id: 'id3' },
  { id: 's4', player_name: 'Saka', position: 'RWF', playing_style_id: 'id4' },
  { id: 's5', player_name: 'Valverde', position: 'CMF', playing_style_id: 'id5' },
  { id: 's6', player_name: 'Bellingham', position: 'CMF', playing_style_id: 'id6' }
]
const productionOrchestratorPoacher = evaluateLinkUpPlay({
  name: 'EFHub EN vs rosa IT',
  focal_point: { playing_style: 'Orchestrator', position: 'DMF' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}, [productionStarters[0], productionStarters[1]], stylesLookup)
const productionBuildUpWinger = evaluateLinkUpPlay({
  name: 'Build Up + Prolific Winger',
  focal_point: { playing_style: 'Build Up', position: 'DMF' },
  key_man: { playing_style: 'Prolific Winger', position: 'RWF' }
}, [productionStarters[2], productionStarters[3]], stylesLookup)
const productionBoxToBoxDb = evaluateLinkUpPlay({
  name: 'Box To Box vs Box-to-Box',
  focal_point: { playing_style: 'Box To Box', position: 'CMF' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}, [productionStarters[4], productionStarters[1]], stylesLookup)
const productionBoxToBoxAlias = evaluateLinkUpPlay({
  name: 'Box To Box vs Onnipresente',
  focal_point: { playing_style: 'Box To Box', position: 'CMF' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}, [productionStarters[5], productionStarters[1]], stylesLookup)
const productionFalsePositive = evaluateLinkUpPlay({
  name: 'No fuzzy cross-style',
  focal_point: { playing_style: 'Orchestrator', position: 'DMF' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}, [
  { id: 'x1', player_name: 'WrongStyle', position: 'DMF', playing_style_id: 'id2' },
  productionStarters[1]
], stylesLookup)
assert(
  'P2',
  productionOrchestratorPoacher.activatable === true
    && productionBuildUpWinger.activatable === true
    && productionBoxToBoxDb.activatable === true
    && productionBoxToBoxAlias.activatable === true
    && productionFalsePositive.activatable === false
    && productionFalsePositive.verification_status === 'not_activatable',
  'Link-up matching uses playing_style_id + stylesLookup against EFHub EN requirements'
)

const fluidPlayer = {
  id: 'starter-7',
  player_name: 'Same Card',
  position: 'CC',
  original_positions: [{ position: 'TRQ', competence: 'Alta' }]
}
const layoutBefore = {
  formation: '4-3-3',
  slot_positions: {
    ...fourThreeThreeAttack,
    7: { position: 'CC', x: 50, y: 48 }
  }
}
const persistedVariants = {
  attack: {
    formation: '4-3-3',
    slot_positions: { ...fourThreeThreeAttack, 7: { position: 'CLS', x: 18, y: 62 } }
  },
  defense: {
    formation: '4-3-3',
    slot_positions: { ...fourThreeThreeDefense, 7: { position: 'TRQ', x: 50, y: 44 } }
  }
}
const reloadedPlayer = { ...fluidPlayer }
const reloadedLayout = JSON.parse(JSON.stringify(layoutBefore))
const reloadedVariants = JSON.parse(JSON.stringify(persistedVariants))
const attackRoleAfterReload = getFluidCardRoleLabel({
  fluidEnabled: true,
  isEditMode: false,
  slotPosition: getPhaseSlotPosition(reloadedVariants.attack.slot_positions, 7),
  playerPosition: reloadedPlayer.position
})
const defenseRoleAfterReload = getFluidCardRoleLabel({
  fluidEnabled: true,
  isEditMode: false,
  slotPosition: getPhaseSlotPosition(reloadedVariants.defense.slot_positions, 7),
  playerPosition: reloadedPlayer.position
})
assert(
  'F1',
  attackRoleAfterReload === 'CLS' && defenseRoleAfterReload === 'TRQ',
  'Same card shows CLS in attack and TRQ in defense after reload'
)
assert(
  'F2',
  getPhasePositionFit('CLS', reloadedPlayer.original_positions).fit === 'fuori_ruolo',
  'CLS absent from original_positions is out of role in attack'
)
assert(
  'F3',
  getPhasePositionFit('TRQ', reloadedPlayer.original_positions).fit === 'alta',
  'TRQ present in original_positions is compatible in defense'
)
assert(
  'F4',
  reloadedPlayer.position === 'CC' && fluidPlayer.position === 'CC',
  'players.position stays unchanged after Fluid save/reload'
)
assert(
  'F5',
  reloadedLayout.slot_positions[7].position === 'CC'
    && JSON.stringify(reloadedLayout.slot_positions) === JSON.stringify(layoutBefore.slot_positions),
  'formation_layout stays unchanged when Fluid is active'
)
assert(
  'F6',
  getPhaseSlotPosition(reloadedVariants.attack.slot_positions, 7) === 'CLS'
    && getPhaseSlotPosition(reloadedVariants.defense.slot_positions, 7) === 'TRQ',
  'attack/defense slot_positions persist after reload'
)
assert(
  'F7',
  getFluidCardRoleLabel({
    fluidEnabled: false,
    isEditMode: false,
    slotPosition: 'CLS',
    playerPosition: 'CC'
  }) === 'CC',
  'Fluid OFF keeps the previous Rosa card role (player.position)'
)

const rosaPage = readFileSync(join(root, 'app/nuova-rosa-lab/page.jsx'), 'utf8')
const variantsRoute = readFileSync(join(root, 'app/api/tactical/formation-variants/route.js'), 'utf8')
assert(
  'F8',
  rosaPage.includes('fluidEnabled={fluidEnabled}')
    && rosaPage.includes('skipOutOfRoleWarning && !fluidEnabled')
    && !variantsRoute.includes(".from('players')")
    && variantsRoute.includes('NEVER modify'),
  'Fluid save does not write players.position or add Fluid roles to original_positions'
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
