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
  basicDefense.defenseNeutral === true && basicDefense.source === 'attack_fallback' &&
    basicDefense.style === 'Hole Player' && buildDualStyleNote({ contract: basicContract, lang: 'it' }) === '',
  "'Basic' = neutro: fallback attack, nessuna meccanica inventata"
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
  !/score\s*\+=.*(linkUp|v6|playingStyles)/i.test(evaluateSrc),
  'Nessun bonus di punteggio legato a Link-up/dual/v6 nello scoring'
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
