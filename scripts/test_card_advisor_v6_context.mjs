#!/usr/bin/env node
/**
 * Card Advisor v6 context tests (Slice 3).
 * Pure: no OpenAI, no Supabase writes.
 *
 * Copre: team style canonici (Contrattacco/Overload), dual playing style per
 * fase ('Basic' neutro), Link-up come caso d'acquisto solo se verificato,
 * contesto formazione fluida, fallback legacy, nessun bonus automatico.
 *
 *   node scripts/test_card_advisor_v6_context.mjs
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveTeamStyleId, getTeamPlaystyleLabel } from '../lib/efootballV6Rules.js'
import { buildFluidFormationState } from '../lib/efootballV6TacticalModel.js'
import {
  buildCardFluidContext,
  buildCardV6PromptBlock,
  buildDualStyleNote,
  buildFluidCardReasonLine,
  buildLinkUpPurchaseReason,
  getCardPlayingStylesContract,
  getPhasePlayingStyle,
  isCounterTeamStyle,
  overloadFitApplies,
  overloadFitLine,
  resolveCandidatePlacements,
  teamStyleCategory,
  verifyCardLinkUpPurchase
} from '../lib/cardAdvisorV6Context.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

function makeSlots(positionBySlot = {}) {
  const slots = {}
  for (let i = 0; i <= 10; i += 1) {
    slots[i] = { x: 50, y: 50, position: positionBySlot[i] || 'CC' }
  }
  return slots
}

// --- 1. Overload riconosciuto come team style nel fit -----------------------
assert(
  'overload-canonical-id',
  teamStyleCategory('pressing_totale') === 'pressing_totale' &&
    teamStyleCategory('Overload') === 'pressing_totale' &&
    teamStyleCategory('pressing totale') === 'pressing_totale',
  'pressing_totale / Overload / pressing totale → ID canonico'
)
assert(
  'overload-label',
  getTeamPlaystyleLabel('pressing_totale', 'it') === 'Overload',
  'Label pubblica Overload'
)
assert(
  'overload-fit-mid-passing',
  overloadFitApplies({ family: 'mid', groups: { passing: true } }) &&
    overloadFitLine({ family: 'mid', groups: { passing: true } }, 'it').includes('Overload'),
  'Overload fit: centrocampista con supporto corto/passaggio rapido'
)
assert(
  'overload-fit-def-cover',
  overloadFitLine({ family: 'def', groups: { defensive: true } }, 'it').includes('copertura lato palla'),
  'Overload fit: difensore letto su copertura lato palla e recupero'
)
assert(
  'overload-no-shortcut',
  !overloadFitApplies({ family: 'mid', groups: {} }) &&
    overloadFitLine({ family: 'att', groups: {} }, 'it') === '',
  'Nessun fit Overload senza skill/ruolo coerenti (niente shortcut numerico)'
)

// --- 2. Contrattacco entra nella logica counter -----------------------------
assert(
  'contrattacco-counter',
  resolveTeamStyleId('contrattacco') === 'contrattacco' &&
    isCounterTeamStyle('contrattacco') &&
    isCounterTeamStyle('Long Ball Counter'),
  'Long Ball Counter (contrattacco) riconosciuto come gioco di rimessa'
)
assert(
  'quick-counter-still-counter',
  isCounterTeamStyle('contropiede_veloce') && !isCounterTeamStyle('possesso_palla'),
  'Contropiede veloce resta counter, Possesso no'
)

// --- 3. Dual playing style per fase -----------------------------------------
const dualContract = getCardPlayingStylesContract(
  { playing_style: 'Hole Player', source_payload: { playing_styles: { format: 'dual', primary: 'Hole Player', attack: 'Hole Player', defense: 'Pass Disruptor' } } },
  ''
)
assert(
  'dual-contract-from-payload',
  dualContract.format === 'dual' && dualContract.attack === 'Hole Player' && dualContract.defense === 'Pass Disruptor',
  'Contratto dual letto da source_payload.playing_styles'
)
assert(
  'dual-phase-attack',
  getPhasePlayingStyle(dualContract, 'attack').style === 'Hole Player',
  'Fase ATT usa playing_styles.attack'
)
assert(
  'dual-phase-defense',
  getPhasePlayingStyle(dualContract, 'defense').style === 'Pass Disruptor' &&
    getPhasePlayingStyle(dualContract, 'defense').source === 'defense',
  'Fase DIF usa playing_styles.defense'
)
const basicContract = getCardPlayingStylesContract(
  { playing_style: 'Hole Player', source_payload: { playing_styles: { format: 'dual', primary: 'Hole Player', attack: 'Hole Player', defense: 'Basic' } } },
  ''
)
const basicDefense = getPhasePlayingStyle(basicContract, 'defense')
assert(
  'dual-basic-neutral',
  basicDefense.defenseNeutral === true && basicDefense.source === 'defense_neutral' &&
    basicDefense.style === null && buildDualStyleNote({ contract: basicContract, lang: 'it' }) === '',
  "'Basic' su contratto dual = neutro esplicito: style null, la difesa NON eredita lo stile di attacco"
)
assert(
  'dual-basic-no-attack-inheritance',
  getPhasePlayingStyle(basicContract, 'defense').style !== getPhasePlayingStyle(basicContract, 'attack').style,
  'Dual + Def:Basic → nessuna eredità dello style di attacco in fase difensiva'
)
assert(
  'dual-note-real-defense',
  buildDualStyleNote({ contract: dualContract, lang: 'it' }).includes('Pass Disruptor'),
  'Nota dual solo con stile difensivo documentato'
)

// --- 4/5. Link-up come caso d'acquisto solo se verificato --------------------
const coach = {
  coach_name: 'Coach Test',
  extracted_data: {
    link_up_plays: [
      {
        name: 'Fili d’oro',
        focal_point: { playing_style: 'Giocatore chiave', position: 'TRQ' },
        key_man: { playing_style: 'Opportunista', position: 'P' }
      }
    ]
  }
}
const rosterWithPartner = [
  { id: 'p1', player_name: 'Striker Uno', position: 'P', role: 'Opportunista', slot_index: 9 },
  { id: 'p2', player_name: 'Mediano Due', position: 'MED', role: 'Collante', slot_index: 5 }
]
const cardTRQ = { name: 'Fantasista Pack', position: 'TRQ', playing_style: 'Hole Player' }

const verified = verifyCardLinkUpPurchase({ coach, players: rosterWithPartner, card: cardTRQ, stylesLookup: {} })
assert(
  'linkup-enabled-by-card',
  verified.status === 'verified' &&
    verified.linkUps[0].enabled_by_card === true &&
    verified.linkUps[0].today_activatable === false &&
    verified.linkUps[0].partner_name === 'Striker Uno',
  'Carta + rosa attivano un Link-up oggi non attivabile'
)
const reason = buildLinkUpPurchaseReason({ linkUpContext: verified, card: cardTRQ, lang: 'it' })
assert(
  'linkup-purchase-reason',
  reason.includes('Fili d’oro') && reason.includes('Striker Uno') && reason.includes('allenatore'),
  'Motivo d’acquisto esplicito: Link-up del coach insieme al partner'
)

const rosterNoPartner = [
  { id: 'p3', player_name: 'Punta Tre', position: 'P', role: 'Fulcro di gioco', slot_index: 9 }
]
const notVerified = verifyCardLinkUpPurchase({ coach, players: rosterNoPartner, card: cardTRQ, stylesLookup: {} })
assert(
  'linkup-not-verified-no-partner',
  notVerified.status === 'not_verified' &&
    notVerified.linkUps[0].enabled_by_card === false &&
    buildLinkUpPurchaseReason({ linkUpContext: notVerified, card: cardTRQ, lang: 'it' }) === '',
  'Manca il secondo giocatore → LINK-UP NON VERIFICATO, nessun bonus'
)

const bothSidesCard = { name: 'Jolly Pack', position: 'TRQ', playing_style: 'Hole Player' }
const coachBoth = {
  coach_name: 'Coach Test',
  extracted_data: {
    link_up_plays: [
      {
        name: 'Solitario',
        focal_point: { playing_style: 'Giocatore chiave', position: 'TRQ' },
        key_man: { playing_style: 'Giocatore chiave', position: 'TRQ' }
      }
    ]
  }
}
const soloCard = verifyCardLinkUpPurchase({ coach: coachBoth, players: rosterNoPartner, card: bothSidesCard, stylesLookup: {} })
assert(
  'linkup-distinct-players',
  soloCard.linkUps[0].enabled_by_card === false,
  'La stessa carta non può coprire entrambi i lati: servono due giocatori distinti'
)

// Link-up con formazione fluida: contano le posizioni della fase ATTACCO.
const fluidBase = { formation: '4-3-3', slot_positions: makeSlots({ 7: 'CLS', 9: 'P' }) }
const fluidRows = [
  { phase: 'attack', formation: '4-3-3', slot_positions: makeSlots({ 7: 'ESA', 9: 'P' }), is_active: true },
  { phase: 'defense', formation: '5-3-2', slot_positions: makeSlots({ 7: 'CLS', 9: 'P' }), is_active: true }
]
const fluid = buildFluidFormationState(fluidBase, fluidRows)
const coachWide = {
  coach_name: 'Coach Test',
  extracted_data: {
    link_up_plays: [
      {
        name: 'Catena larga',
        focal_point: { playing_style: 'Opportunista', position: 'P' },
        key_man: { playing_style: 'Ala prolifica', position: 'ESA' }
      }
    ]
  }
}
const fluidRoster = [
  { id: 'p1', player_name: 'Striker Uno', position: 'P', role: 'Opportunista', slot_index: 9 },
  { id: 'p4', player_name: 'Esterno Quattro', position: 'CLS', role: 'Ala prolifica', slot_index: 7 }
]
const fluidCheck = verifyCardLinkUpPurchase({
  coach: coachWide,
  players: fluidRoster,
  card: { name: 'Punta Pack', position: 'P', playing_style: 'Goal Poacher' },
  fluid,
  stylesLookup: {}
})
assert(
  'linkup-fluid-attack-position',
  fluidCheck.linkUps[0].today_activatable === true && fluidCheck.linkUps[0].enabled_by_card === false,
  'Con fluid attiva il Link-up si verifica sulla posizione di fase ATTACCO (CLS→ESA)'
)

// --- 6. Fallback legacy senza dati dual --------------------------------------
const legacy = getCardPlayingStylesContract({ playing_style: 'Goal Poacher' }, '')
assert(
  'legacy-single-fallback',
  legacy.format === 'single' && legacy.attack === 'Goal Poacher' && legacy.defense === null &&
    getPhasePlayingStyle(legacy, 'defense').style === 'Goal Poacher',
  'Dati dual assenti → fallback legacy, difesa = stile attacco'
)
const legacyFromStyle = getCardPlayingStylesContract(null, 'Goal Poacher')
assert(
  'legacy-card-style-fallback',
  legacyFromStyle.format === 'single' && legacyFromStyle.attack === 'Goal Poacher',
  'Nessuna riga catalogo → fallback su card.style'
)

// --- Contesto formazione fluida ----------------------------------------------
const fluidCtx = buildCardFluidContext({ fluid, cardPosition: 'ESA' })
assert(
  'fluid-context',
  fluidCtx.fluid_enabled === true &&
    fluidCtx.formation_base === '4-3-3' &&
    fluidCtx.formation_defense === '5-3-2' &&
    fluidCtx.attack?.position_present === true &&
    fluidCtx.defense?.position_present === false,
  'Contesto fluido: base/attacco/difesa + ruolo carta per fase'
)
assert(
  'fluid-reason-line',
  buildFluidCardReasonLine({ fluidContext: fluidCtx, cardPosition: 'ESA', lang: 'it' }).includes('fase offensiva'),
  'Reasoning deterministico: la carta è valutata per lo slot di fase offensiva'
)
const noFluid = buildFluidFormationState(fluidBase, [])
const noFluidCtx = buildCardFluidContext({ fluid: noFluid, cardPosition: 'ESA' })
assert(
  'fluid-off-silent',
  noFluidCtx.fluid_enabled === false &&
    buildFluidCardReasonLine({ fluidContext: noFluidCtx, cardPosition: 'ESA', lang: 'it' }) === '',
  'Fluid spenta → nessuna menzione nel reasoning'
)

// --- Blocco prompt v6 ----------------------------------------------------------
const promptVerified = buildCardV6PromptBlock({ fluidContext: fluidCtx, cardContract: dualContract, linkUpContext: verified, lang: 'it' })
assert(
  'prompt-block-verified',
  promptVerified.includes('LINK-UP VERIFICATO') && promptVerified.includes('FORMAZIONE FLUIDA ATTIVA') &&
    promptVerified.includes('PLAYING STYLE DUAL'),
  'Blocco prompt: fluid attiva + dual + Link-up verificato'
)
const promptNotVerified = buildCardV6PromptBlock({ fluidContext: noFluidCtx, cardContract: basicContract, linkUpContext: notVerified, lang: 'it' })
assert(
  'prompt-block-guardrails',
  promptNotVerified.includes('LINK-UP NON VERIFICATO') &&
    promptNotVerified.includes('NON menzionarla') &&
    promptNotVerified.includes('NON inventare meccaniche'),
  "Blocco prompt: fluid spenta non menzionata, 'Basic' neutro, Link-up non citabile"
)
assert(
  'prompt-block-empty',
  buildCardV6PromptBlock({ fluidContext: noFluidCtx, cardContract: null, linkUpContext: { status: 'none', linkUps: [] }, lang: 'it' }) === '',
  'Nessun dato v6 → nessun blocco prompt'
)

// --- 7. Carta dual-style NON diventa BUY automaticamente ----------------------
assert(
  'no-score-fields',
  !('score' in verified) && verified.linkUps.every((item) => !('score' in item)) &&
    !('score' in fluidCtx),
  'Il contesto v6 non produce campi score (solo testo/dati)'
)

// --- 8. Placement candidato concreto (core fix P1) ----------------------------
// Scenario: slot 4 base TD, fluid ATTACK slot 4 = CLD, DEFENSE slot 4 = TD.
const placedBase = { formation: '4-3-3', slot_positions: makeSlots({ 4: 'TD', 9: 'P' }) }
const placedRows = [
  { phase: 'attack', formation: '4-3-3', slot_positions: makeSlots({ 4: 'CLD', 9: 'P' }), is_active: true },
  { phase: 'defense', formation: '4-4-2', slot_positions: makeSlots({ 4: 'TD', 9: 'P' }), is_active: true }
]
const placedFluid = buildFluidFormationState(placedBase, placedRows)
const placedRoster = [
  { id: 'p9', player_name: 'Bomber Nove', position: 'P', role: 'Opportunista', slot_index: 9 },
  { id: 'p4', player_name: 'Terzino Quattro', position: 'TD', role: 'Terzino difensivo', slot_index: 4 }
]
const cardTD = { name: 'Terzino Pack', position: 'TD', playing_style: 'Cross Specialist' }

const placements = resolveCandidatePlacements({ card: cardTD, players: placedRoster, fluid: placedFluid })
assert(
  'placement-resolved-roles',
  placements.status === 'resolved' && placements.placements.length === 1 &&
    placements.placements[0].slot_index === 4 &&
    placements.placements[0].base_role === 'TD' &&
    placements.placements[0].attack_role === 'CLD' &&
    placements.placements[0].defense_role === 'TD' &&
    placements.placements[0].replaced_player_name === 'Terzino Quattro',
  'Placement concreto: slot 4 → base TD, attacco CLD, difesa TD, titolare sostituito noto'
)
const placedCtx = buildCardFluidContext({ fluid: placedFluid, cardPosition: cardTD.position, card: cardTD, players: placedRoster })
assert(
  'fluid-context-real-roles',
  placedCtx.card_base_role === 'TD' && placedCtx.card_attack_role === 'CLD' &&
    placedCtx.card_defense_role === 'TD' && placedCtx.placements.length === 1,
  'Contesto fluido: ruoli reali per fase (TD base → CLD attacco → TD difesa), non solo booleani'
)
assert(
  'placement-none-when-incompatible',
  resolveCandidatePlacements({ card: { position: 'EDA' }, players: placedRoster, fluid: placedFluid }).placements.length === 0 &&
    resolveCandidatePlacements({ card: cardTD, players: placedRoster, fluid: null }).status === 'unknown',
  'Nessuno slot compatibile o nessuna formazione → placement vuoto (contesto onesto)'
)

// Falso negativo storico: carta TD che in ATTACCO gioca CLD DEVE abilitare un
// Link-up CLD+style se il coach lo richiede e il partner esiste davvero.
const coachCLD = {
  coach_name: 'Coach Test',
  extracted_data: {
    link_up_plays: [
      {
        name: 'Fascia dinamica',
        focal_point: { playing_style: 'Specialista di cross', position: 'CLD' },
        key_man: { playing_style: 'Opportunista', position: 'P' }
      }
    ]
  }
}
const falseNegative = verifyCardLinkUpPurchase({
  coach: coachCLD,
  players: placedRoster,
  card: cardTD,
  fluid: placedFluid,
  stylesLookup: {}
})
assert(
  'linkup-fluid-false-negative-fixed',
  falseNegative.status === 'verified' &&
    falseNegative.linkUps[0].enabled_by_card === true &&
    falseNegative.linkUps[0].candidate_slot_index === 4 &&
    falseNegative.linkUps[0].candidate_attack_role === 'CLD' &&
    falseNegative.linkUps[0].partner_name === 'Bomber Nove',
  'TD base → CLD attacco: la carta abilita il Link-up CLD+style (slot e ruolo fase riportati)'
)

// Falso positivo storico: carta TRQ il cui slot concreto in ATTACCO diventa CC
// NON deve abilitare un Link-up che richiede TRQ (niente card.position statico).
const trqBase = { formation: '4-3-3', slot_positions: makeSlots({ 7: 'TRQ', 9: 'P' }) }
const trqRows = [
  { phase: 'attack', formation: '4-3-3', slot_positions: makeSlots({ 7: 'CC', 9: 'P' }), is_active: true },
  { phase: 'defense', formation: '4-3-3', slot_positions: makeSlots({ 7: 'TRQ', 9: 'P' }), is_active: true }
]
const trqFluid = buildFluidFormationState(trqBase, trqRows)
const trqRoster = [
  { id: 'p9', player_name: 'Bomber Nove', position: 'P', role: 'Opportunista', slot_index: 9 },
  { id: 'p7', player_name: 'Regista Sette', position: 'TRQ', role: 'Collante', slot_index: 7 }
]
const coachTRQ = {
  coach_name: 'Coach Test',
  extracted_data: {
    link_up_plays: [
      {
        name: 'Rifinitura',
        focal_point: { playing_style: 'Giocatore chiave', position: 'TRQ' },
        key_man: { playing_style: 'Opportunista', position: 'P' }
      }
    ]
  }
}
const falsePositive = verifyCardLinkUpPurchase({
  coach: coachTRQ,
  players: trqRoster,
  card: { name: 'Trequartista Pack', position: 'TRQ', playing_style: 'Hole Player' },
  fluid: trqFluid,
  stylesLookup: {}
})
assert(
  'linkup-fluid-false-positive-fixed',
  falsePositive.linkUps[0].enabled_by_card === false &&
    falsePositive.linkUps[0].verification_status === 'not_verified',
  'TRQ base → CC attacco: la carta NON abilita un Link-up che richiede TRQ'
)

// Placement multipli: solo UNO soddisfa il Link-up → verificato, slot esatto.
const multiBase = { formation: '4-3-3', slot_positions: makeSlots({ 5: 'CC', 6: 'CC', 9: 'P' }) }
const multiRows = [
  { phase: 'attack', formation: '4-3-3', slot_positions: makeSlots({ 5: 'CC', 6: 'TRQ', 9: 'P' }), is_active: true },
  { phase: 'defense', formation: '4-3-3', slot_positions: makeSlots({ 5: 'CC', 6: 'CC', 9: 'P' }), is_active: true }
]
const multiFluid = buildFluidFormationState(multiBase, multiRows)
const multiRoster = [
  { id: 'p9', player_name: 'Bomber Nove', position: 'P', role: 'Opportunista', slot_index: 9 },
  { id: 'p5', player_name: 'Mediano Cinque', position: 'CC', role: 'Collante', slot_index: 5 },
  { id: 'p6', player_name: 'Mezzala Sei', position: 'CC', role: 'Onnipresente', slot_index: 6 }
]
const multiPlacements = resolveCandidatePlacements({ card: { position: 'CC' }, players: multiRoster, fluid: multiFluid })
const multiCheck = verifyCardLinkUpPurchase({
  coach: coachTRQ,
  players: multiRoster,
  card: { name: 'Centrocampista Pack', position: 'CC', playing_style: 'Hole Player' },
  fluid: multiFluid,
  stylesLookup: {}
})
assert(
  'linkup-multiple-placements',
  multiPlacements.placements.length >= 2 &&
    multiPlacements.placements.some((p) => p.slot_index === 5 && p.attack_role === 'CC') &&
    multiPlacements.placements.some((p) => p.slot_index === 6 && p.attack_role === 'TRQ') &&
    multiCheck.linkUps[0].enabled_by_card === true &&
    multiCheck.linkUps[0].candidate_slot_index === 6 &&
    multiCheck.linkUps[0].candidate_attack_role === 'TRQ' &&
    multiCheck.linkUps[0].partner_name === 'Bomber Nove',
  'Placement multipli indipendenti: solo lo slot 6 (CC→TRQ) abilita, ed è quello riportato'
)

// Nessun placement concreto → nessuna verifica, anche se la posizione statica
// della carta matcherebbe il requisito.
const noPlacement = verifyCardLinkUpPurchase({
  coach: {
    coach_name: 'Coach Test',
    extracted_data: {
      link_up_plays: [
        {
          name: 'Catena destra',
          focal_point: { playing_style: 'Ala prolifica', position: 'EDA' },
          key_man: { playing_style: 'Opportunista', position: 'P' }
        }
      ]
    }
  },
  players: placedRoster,
  card: { name: 'Ala Pack', position: 'EDA', playing_style: 'Prolific Winger' },
  fluid: placedFluid,
  stylesLookup: {}
})
assert(
  'linkup-no-placement-no-verify',
  noPlacement.linkUps[0].enabled_by_card === false &&
    noPlacement.linkUps[0].verification_status === 'not_verified',
  'Fluid ON senza slot compatibile → mai verificato (niente scorciatoia statica)'
)

// Con Fluid ON la carta non può coprire entrambi i membri del Link-up.
const soloCoach = {
  coach_name: 'Coach Test',
  extracted_data: {
    link_up_plays: [
      {
        name: 'Monologo',
        focal_point: { playing_style: 'Specialista di cross', position: 'CLD' },
        key_man: { playing_style: 'Specialista di cross', position: 'CLD' }
      }
    ]
  }
}
const soloFluid = verifyCardLinkUpPurchase({
  coach: soloCoach,
  players: placedRoster.filter((player) => player.slot_index === 4),
  card: cardTD,
  fluid: placedFluid,
  stylesLookup: {}
})
assert(
  'linkup-fluid-distinct-players',
  soloFluid.linkUps[0].enabled_by_card === false,
  'Fluid ON: la stessa carta non soddisfa entrambi i lati del Link-up'
)

// Partner mancante con placement valido → non verificato.
const noPartnerFluid = verifyCardLinkUpPurchase({
  coach: coachCLD,
  players: placedRoster.filter((player) => player.slot_index === 4),
  card: cardTD,
  fluid: placedFluid,
  stylesLookup: {}
})
assert(
  'linkup-fluid-missing-partner',
  noPartnerFluid.linkUps[0].enabled_by_card === false,
  'Placement valido ma partner reale assente → non verificato'
)

// --- 9. Rumore prompt: legacy single-style + Fluid OFF + no Link-up -----------
const realSingleContract = getCardPlayingStylesContract({ playing_style: 'Goal Poacher' }, '')
const realSingleFromStyle = getCardPlayingStylesContract(null, 'Goal Poacher')
assert(
  'prompt-no-legacy-single-noise',
  buildCardV6PromptBlock({ fluidContext: noFluidCtx, cardContract: realSingleContract, linkUpContext: { status: 'none', linkUps: [] }, lang: 'it' }) === '' &&
    buildCardV6PromptBlock({ fluidContext: noFluidCtx, cardContract: realSingleFromStyle, linkUpContext: null, lang: 'it' }) === '',
  'Vero contratto legacy single-style (da getCardPlayingStylesContract) + Fluid OFF + no Link-up → nessun blocco v6'
)
assert(
  'prompt-dual-basic-still-emitted',
  buildCardV6PromptBlock({ fluidContext: noFluidCtx, cardContract: basicContract, linkUpContext: { status: 'none', linkUps: [] }, lang: 'it' }).includes('PLAYING STYLE DUAL'),
  'Contratto dual esplicito (anche Def:Basic) → blocco emesso'
)

// --- 10. Blocco prompt v6 localizzato in spagnolo -----------------------------
const esPrompt = buildCardV6PromptBlock({ fluidContext: placedCtx, cardContract: dualContract, linkUpContext: falseNegative, lang: 'es' })
assert(
  'prompt-block-es',
  esPrompt.includes('CONTEXTO V6') && esPrompt.includes('FORMACIÓN FLUIDA ACTIVA') &&
    esPrompt.includes('ESTILO DE JUEGO DUAL') && esPrompt.includes('LINK-UP VERIFICADO') &&
    esPrompt.includes('SLOT CANDIDATO 4') && esPrompt.includes('rol ataque CLD') &&
    esPrompt.includes('FIN CONTEXTO V6') && !esPrompt.includes('FORMAZIONE FLUIDA ATTIVA'),
  'Blocco prompt ES: fluid attiva, dual style, placement e Link-up verificato in spagnolo'
)
const esGuardrails = buildCardV6PromptBlock({ fluidContext: noFluidCtx, cardContract: basicContract, linkUpContext: notVerified, lang: 'es' })
assert(
  'prompt-block-es-guardrails',
  esGuardrails.includes('Formación fluida: NO activa') &&
    esGuardrails.includes('ningún estilo defensivo especial documentado') &&
    esGuardrails.includes('LINK-UP NO VERIFICADO'),
  'Blocco prompt ES: guardrail Fluid off, Basic neutro, Link-up non verificato'
)

// --- 11. Regressione Overload: nessun auto-BUY da team style fit --------------
const overloadSrc = readFileSync(join(root, 'app/api/card-advisor-lab/evaluate/route.js'), 'utf8')
assert(
  'overload-no-auto-buy',
  !/score\s*\+=.*(overload|pressing_totale)/i.test(overloadSrc) &&
    !/level:\s*'buy'.*(overload|teamStyleFit)/i.test(overloadSrc),
  'Overload/teamStyleFit non aggiunge punti né forza BUY: solo contesto (vedi report: nessun harness comportamentale sicuro per evaluate())'
)

// --- Wiring sorgente (stile repo) ----------------------------------------------
const evaluateSrc = readFileSync(join(root, 'app/api/card-advisor-lab/evaluate/route.js'), 'utf8')
assert(
  'evaluate-wired',
  evaluateSrc.includes('cardAdvisorV6Context.js') &&
    evaluateSrc.includes('formation_variants') &&
    evaluateSrc.includes('buildFluidFormationState') &&
    evaluateSrc.includes('resolveTeamStyleId') &&
    evaluateSrc.includes('extracted_data'),
  'Route evaluate: variants + fluid + canonico + coach extracted_data'
)
assert(
  'evaluate-no-v6-score',
  !/score\s*\+=.*(linkUp|v6|playingStyles|overload|dual|fluid)/i.test(evaluateSrc),
  'Nessun bonus di punteggio legato a Link-up/dual/fluid/Overload/v6 nello scoring'
)
assert(
  'evaluate-placement-wired',
  evaluateSrc.includes('candidate_placements') &&
    evaluateSrc.includes('startersForLinkUpVerification') &&
    evaluateSrc.includes('card_position_present_in_attack'),
  'Route evaluate: placement concreti + fit phase-aware + semantica API ruoli reali'
)
const deepSrc = readFileSync(join(root, 'app/api/card-advisor-lab/deep-analysis/route.js'), 'utf8')
assert(
  'deep-analysis-wired',
  deepSrc.includes('v6ContextText') &&
    deepSrc.includes('formation_variants') &&
    deepSrc.includes('verifyCardLinkUpPurchase') &&
    deepSrc.includes('extracted_data'),
  'Route deep-analysis: blocco v6 + variants + Link-up verificato'
)
const syncSrc = readFileSync(join(root, 'scripts/sync_card_advisor_cards.py'), 'utf8')
assert(
  'sync-wired',
  syncSrc.includes('playingStyleDefensive') && syncSrc.includes('build_playing_styles_contract'),
  'Sync EFHub: contratto dual estratto e salvato'
)

// Parità col sync Python reale (come test_dual_playing_style.mjs).
const py = spawnSync(
  'python',
  [
    '-c',
    [
      'import importlib.util, json, sys',
      'spec = importlib.util.spec_from_file_location("sync", r"scripts/sync_card_advisor_cards.py")',
      'mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)',
      'a1, d1, c1 = mod.build_playing_styles_contract("Hole Player", "Pass Disruptor")',
      'a2, d2, c2 = mod.build_playing_styles_contract("Hole Player", "$undefined")',
      'a3, d3, c3 = mod.build_playing_styles_contract("Att: Hole Player", None)',
      'a4, d4, c4 = mod.build_playing_styles_contract("Hole Player", "Def: Basic")',
      'print(json.dumps({"dual": c1, "undef": c2, "prefixed": {"attack": a3, "contract": c3}, "basic": c4}))'
    ].join('\n')
  ],
  { encoding: 'utf-8', cwd: root }
)
let pyPayload = null
try { pyPayload = py.status === 0 ? JSON.parse(py.stdout) : null } catch { pyPayload = null }
assert(
  'python-sync-dual-contract',
  pyPayload &&
    pyPayload.dual.format === 'dual' && pyPayload.dual.attack === 'Hole Player' && pyPayload.dual.defense === 'Pass Disruptor' &&
    pyPayload.undef.format === 'single' && pyPayload.undef.defense === null &&
    pyPayload.prefixed.attack === 'Hole Player' && pyPayload.prefixed.contract.format === 'single' &&
    pyPayload.basic.defense === 'Basic',
  pyPayload ? 'Sync Python: dual/single/Att:/$undefined/Basic coerenti col parser PESDB' : `python failed: ${(py.stderr || py.stdout || '').trim()}`
)

const failed = results.filter((row) => !row.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
