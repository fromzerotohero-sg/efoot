/**
 * Offline regression for premium pre-match countermeasures.
 * node scripts/test-prematch-countermeasures.mjs
 */
import {
  buildCustomerPrematchPlan,
  instructionLabel,
  presentCountermeasuresForCustomer
} from '../lib/prematchCustomerPlan.js'
import { buildPrematchChangeSet } from '../lib/prematchChangeSet.js'
import { validateStartingXISwap } from '../lib/formationDefenseRules.js'
import { validateIndividualInstruction, INDIVIDUAL_INSTRUCTIONS_CONFIG } from '../lib/tacticalInstructions.js'
import {
  activeTacticalInstructions,
  buildClientFormationSnapshot,
  getSnapshotPlayerRole
} from '../lib/clientFormationSnapshot.js'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}

function hasTechnicalLeak(text) {
  const blob = String(text || '').toLowerCase()
  return [
    /\bconfidence\b/,
    /\bdata_quality\b/,
    /\bpa1\b/,
    /\bconnection\b/,
    /\boverall\b/,
    /\bin partita\s*:/,
    /marcatura_stretta/
  ].some((re) => re.test(blob))
}

const defenseCategory = Object.keys(INDIVIDUAL_INSTRUCTIONS_CONFIG).find((key) =>
  /difes|defense/i.test(key)
) || 'difesa_1'

function slotsWith(overrides = {}) {
  const defaults = {
    0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD',
    5: 'MED', 6: 'CC', 7: 'CC', 8: 'TRQ', 9: 'SP', 10: 'P'
  }
  return Object.fromEntries(
    Object.entries(defaults).map(([index, position]) => [
      index,
      {
        x: 10 + Number(index) * 7,
        y: 90 - Number(index) * 6,
        position: overrides[index] || position
      }
    ])
  )
}

// --- Case: one snapshot resolves base + both Fluid phases ---
{
  const starter = {
    id: 'phase-player',
    player_name: 'Phase Player',
    position: 'TRQ',
    slot_index: 6,
    original_positions: [{ position: 'CC', competence: 'Alta' }, { position: 'MED', competence: 'Alta' }]
  }
  const snapshot = buildClientFormationSnapshot({
    starters: [starter],
    baseLayout: { formation: '4-3-3', slot_positions: slotsWith({ 6: 'CC' }) },
    variantRows: [
      { phase: 'attack', formation: '4-2-1-3', slot_positions: slotsWith({ 6: 'CC' }), is_active: true },
      { phase: 'defense', formation: '4-1-4-1', slot_positions: slotsWith({ 6: 'MED' }), is_active: true }
    ]
  })
  assert(snapshot.enabled, 'formation snapshot detects active Fluid Formation')
  assert(getSnapshotPlayerRole(snapshot, starter, 'base') === 'CC', 'base slot overrides stale players.position')
  assert(getSnapshotPlayerRole(snapshot, starter, 'attack') === 'CC', 'snapshot resolves attack role')
  assert(getSnapshotPlayerRole(snapshot, starter, 'defense') === 'MED', 'snapshot resolves defense role')

  const reserve = { id: 'reserve-med', position: 'MED', original_positions: ['MED'] }
  const defenseSwap = validateStartingXISwap([starter], reserve, starter.id, {
    getSlotRole: (player) => getSnapshotPlayerRole(snapshot, player, 'defense')
  })
  assert(defenseSwap.valid, 'swap validation can use the real defense-phase slot')

  const active = activeTacticalInstructions({
    individual_instructions: {
      difesa_1: { enabled: true, player_id: starter.id, instruction: 'marcatura_uomo' },
      difesa_2: { enabled: true, player_id: 'old-bench-player', instruction: 'contropiede' }
    }
  }, snapshot)
  assert(Boolean(active.difesa_1) && !active.difesa_2, 'stale instructions for non-starters are removed')
}

// --- Case: empty / short bench → customer plan still has diagnosis + tips ---
{
  const raw = {
    diagnosis: 'Avversario in 4-2-1-3: centro denso, attacca le fasce.',
    with_ball: 'Apri il gioco sul lato debole',
    without_ball: 'Marcatura su Bruno Fernandes',
    plan_b: {
      trigger: 'L’avversario passa a due punte',
      action: 'Togli la marcatura diretta e proteggi la profondità'
    },
    play_summary: {
      match_key: 'Avversario in 4-2-1-3: centro denso, attacca le fasce.',
      attacking: 'Cerca ampiezza con Beckham',
      defending: 'Chiudi i centrali tra le linee',
      base_plan: 'Mantieni il tuo 4-3-3'
    },
    starting_plan: ['Attacca subito sulle fasce', 'Non forzare il centro'],
    analysis: {
      opponent_formation_analysis: '4-2-1-3 compatto',
      strengths: ['centro'],
      weaknesses: ['fasce']
    },
    countermeasures: {
      formation_adjustments: [],
      tactical_adjustments: [
        { type: 'team_playing_style', suggestion: 'Vie laterali', reason: 'fasce aperte', priority: 'high' }
      ],
      player_suggestions: [],
      individual_instructions: []
    },
    confidence: 0.9,
    data_quality: 'high',
    warnings: ['internal filter']
  }

  const presented = presentCountermeasuresForCustomer(raw, {
    lang: 'it',
    opponentFormation: {
      formation_name: '4-2-1-3',
      extracted_data: {
        players: [{ player_name: 'Bruno Fernandes', position: 'TRQ' }],
        visual_tactical_profile: { central_density: 'high', width_profile: 'narrow' }
      }
    },
    currentTacticalSettings: { team_playing_style: 'vie_laterali' },
    roster: [{ player_name: 'Rijkaard' }]
  })
  const plan = presented.customer_plan
  assert(Boolean(plan.diagnosis), 'empty bench still has diagnosis')
  assert(Array.isArray(plan.starting_plan) && plan.starting_plan.length >= 1, 'starting_plan present')
  assert(plan.countermeasures.attack.length === 1, 'attack line restored')
  assert(plan.countermeasures.defense.length === 1, 'defense line restored')
  assert(plan.setup.team_playing_style === 'Vie laterali', 'team style extracted')
  assert(plan.main_decision === plan.diagnosis, 'single main decision mirrors diagnosis')
  assert(plan.setup_actions.some((action) => action.type === 'team_style'), 'setup actions expose exact team style')
  assert(
    plan.setup_actions.some((action) => action.type === 'team_style' && action.status === 'keep' && action.value === 'Vie laterali'),
    'team-style ids normalize before computing setup delta'
  )
  assert(plan.playbook.with_ball.includes('Apri il gioco sul lato debole'), 'with-ball playbook preserved')
  assert(plan.playbook.without_ball.includes('Marcatura su Bruno Fernandes'), 'real opponent name preserved in without-ball playbook')
  assert(Boolean(plan.plan_b?.trigger && plan.plan_b?.action), 'Plan B has trigger and response')
  assert(Array.isArray(plan.follow_ups) && plan.follow_ups.length === 3, 'contextual plan follow-ups present')
  assert(!('confidence' in presented), 'confidence stripped')
  assert(!('warnings' in presented), 'warnings stripped')
  assert(!hasTechnicalLeak(plan.diagnosis), 'diagnosis has no technical leak')
  for (const tip of plan.starting_plan) {
    assert(!hasTechnicalLeak(tip), `tip clean: ${tip}`)
  }
  assert(
    plan.starting_plan.every((tip) => !/beckham/i.test(tip)),
    'unknown player removed from customer copy'
  )
}

// --- Case: instruction labels are human ---
{
  assert(instructionLabel('marcatura_stretta', 'it') === 'Marcatura stretta', 'instruction label IT')
  assert(instructionLabel('ancoraggio', 'en') === 'Anchoring', 'instruction label EN')
}

// --- Case: incompatible swap rejected by defense rules ---
{
  const titolari = [
    { id: 'a', position: 'PT', slot_index: 0 },
    { id: 'b', position: 'DC', slot_index: 1 },
    { id: 'c', position: 'DC', slot_index: 2 },
    { id: 'd', position: 'DC', slot_index: 3 },
    { id: 'e', position: 'TD', slot_index: 4 },
    { id: 'f', position: 'TS', slot_index: 5 },
    { id: 'g', position: 'MED', slot_index: 6 },
    { id: 'h', position: 'CC', slot_index: 7 },
    { id: 'i', position: 'CC', slot_index: 8 },
    { id: 'j', position: 'EDA', slot_index: 9 },
    { id: 'k', position: 'P', slot_index: 10 }
  ]
  const reserve = { id: 'r1', position: 'DC', original_positions: ['DC'] }
  const bad = validateStartingXISwap(titolari, reserve, 'e')
  assert(bad.valid === false, 'DC into TD rejected when 3 DC already')
}

// --- Case: unsupported / invalid individual instruction ---
{
  const titolari = [
    { id: 'p1', player_name: 'Test', position: 'DC', slot_index: 1 }
  ]
  const check = validateIndividualInstruction('attacco_1', 'p1', 'pressing_fantasma', titolari, null)
  assert(check.valid === false, 'ghost instruction rejected')
}

// --- Case: invalid category / unsupported style path ---
{
  const titolari = [
    { id: 'p1', player_name: 'Punta', position: 'P', slot_index: 10 }
  ]
  const check = validateIndividualInstruction('categoria_inesistente', 'p1', 'ancoraggio', titolari, null)
  assert(check.valid === false, 'unknown instruction category rejected')
}

// --- Case: partial AI output still becomes usable customer plan ---
{
  const partial = {
    diagnosis: '',
    play_summary: { match_key: '', attacking: 'Porta palla sulle fasce' },
    starting_plan: ['In partita: alza il pressing'],
    analysis: { opponent_formation_analysis: '4-4-2 largo', strengths: ['a', 'b'], weaknesses: ['c', 'd'] },
    countermeasures: {
      formation_adjustments: [{ suggestion: 'Resta sul 4-3-3', reason: '', priority: 'high' }],
      tactical_adjustments: [
        { type: 'team_playing_style', suggestion: 'Possesso palla', reason: 'y', priority: 'high' }
      ],
      player_suggestions: [
        { action: 'add_to_starting_xi', player_name: 'A', replace_player_name: 'B', reason: 'z', priority: 'high' },
        { action: 'add_to_starting_xi', player_name: 'C', replace_player_name: 'D', reason: 'z', priority: 'medium' }
      ],
      individual_instructions: [
        { slot: defenseCategory, player_name: 'B', instruction: 'ancoraggio', reason: 'ok' },
        { slot: 'attacco_1', player_name: 'A', instruction: 'offensivo', reason: 'ok' },
        { slot: 'attacco_2', player_name: 'X', instruction: 'difensivo', reason: 'ok' }
      ]
    }
  }

  const customer = buildCustomerPrematchPlan(partial, {
    lang: 'it',
    opponentFormation: { formation_name: '4-4-2' }
  })
  assert(Boolean(customer.diagnosis), 'partial diagnosis filled')
  assert(customer.setup.substitutions.length <= 1, 'customer caps swaps to 1')
  assert(customer.setup.individual_instructions.length <= 2, 'customer caps instructions to 2')
  assert(!customer.setup.individual_instructions.some((row) => row.instruction === 'offensivo'), 'removed Attacking instruction filtered from customer plan')
  assert(customer.starting_plan.length <= 3, 'customer caps starting plan')
  assert(!hasTechnicalLeak(customer.diagnosis), 'partial diagnosis clean')
  for (const tip of customer.starting_plan) {
    assert(!/^in partita/i.test(tip), `no live prefix: ${tip}`)
  }
}

// --- Case: change set carries customer_plan and caps ---
{
  const presented = presentCountermeasuresForCustomer({
    play_summary: { match_key: 'Chiudi il 4-2-3-1' },
    starting_plan: ['Tieni larghezza', 'Chiudi AMF'],
    analysis: { opponent_formation_analysis: '4-2-3-1' },
    countermeasures: {
      tactical_adjustments: [
        { type: 'team_playing_style', suggestion: 'Pressing totale', reason: 'x', priority: 'high' }
      ],
      player_suggestions: [
        {
          action: 'add_to_starting_xi',
          player_id: 'in1',
          player_name: 'In',
          replace_player_id: 'out1',
          replace_player_name: 'Out',
          reason: 'y',
          priority: 'high'
        }
      ],
      individual_instructions: [
        { slot: defenseCategory, player_id: 'out1', player_name: 'Out', instruction: 'ancoraggio', reason: 'z' }
      ],
      formation_adjustments: []
    }
  }, { lang: 'it', opponentFormation: { formation_name: '4-2-3-1' } })

  const changeSet = buildPrematchChangeSet(presented, { lang: 'it' })
  assert(Boolean(changeSet.customer_plan), 'change set keeps customer_plan')
  assert((changeSet.substitutions || []).length <= 1, 'change set max 1 sub')
  assert((changeSet.starting_plan || []).length <= 3, 'change set starting_plan capped')
  assert(Array.isArray(changeSet.warnings) && changeSet.warnings.length === 0, 'no customer warnings in change set')
}

// --- Case: already-correct formation / no empty plan ---
{
  const plan = buildCustomerPrematchPlan({
    analysis: { opponent_formation_analysis: '' },
    play_summary: {},
    countermeasures: {
      formation_adjustments: [],
      tactical_adjustments: [],
      player_suggestions: [],
      individual_instructions: []
    }
  }, { lang: 'it', opponentFormation: { formation_name: '4-3-3' } })
  assert(Boolean(plan.diagnosis), 'fallback diagnosis when AI empty')
  assert(plan.diagnosis.includes('4-3-3') || plan.diagnosis.length > 0, 'fallback mentions shape or text')
}

// --- Case: uncertain photo still produces trait + assumption-ready plan ---
{
  const plan = buildCustomerPrematchPlan({
    play_summary: { match_key: 'Lettura prudente del modulo' },
    analysis: { opponent_formation_analysis: 'Lettura prudente del modulo' },
    countermeasures: { tactical_adjustments: [], player_suggestions: [], individual_instructions: [], formation_adjustments: [] }
  }, {
    lang: 'it',
    opponentFormation: {
      formation_name: '4-3-3',
      extracted_data: {
        visual_tactical_profile: {
          central_density: 'medium',
          width_profile: 'wide',
          formation_confidence: 0.3,
          uncertain_points: ['slot overlap']
        }
      }
    }
  })
  assert(Boolean(plan.opponent_read.trait), 'uncertain photo still surfaces one visual trait')
  assert(!/\d+%/.test(plan.opponent_read.trait || ''), 'trait has no confidence percent')
}

// --- Case: sparse 5-3-2 output is enriched with named targets and two phase steps ---
{
  const plan = buildCustomerPrematchPlan({
    diagnosis: 'Blocca le due punte e crea ampiezza stabile.',
    play_summary: {
      attacking: 'Rijkaard come scarico fisso davanti alla difesa',
      defending: 'Davids agganciato a una punta per togliere ricezioni comode'
    },
    starting_plan: [
      'Mantieni ampiezza con Nedvěd sul lato debole',
      'Rijkaard come scarico fisso davanti alla difesa',
      'Davids agganciato a una punta per togliere ricezioni comode'
    ],
    countermeasures: {
      tactical_adjustments: [],
      player_suggestions: [],
      formation_adjustments: [],
      individual_instructions: [
        { player_name: 'Edgar Davids', instruction: 'marcatura_uomo', target_player_name: 'Christian Pulišić', slot: 'difesa_1' },
        { player_name: 'Frank Rijkaard', instruction: 'ancoraggio', slot: 'attacco_1' }
      ]
    }
  }, {
    lang: 'it',
    roster: [
      { player_name: 'Edgar Davids' },
      { player_name: 'Frank Rijkaard' },
      { player_name: 'Nedvěd' }
    ],
    opponentFormation: {
      formation_name: '5-3-2',
      extracted_data: {
        players: [
          { player_name: 'Andriy Shevchenko', position: 'SP', overall_rating: 105 },
          { player_name: 'Christian Pulišić', position: 'SP', overall_rating: 100 },
          { player_name: 'Ruud Gullit', position: 'CC', overall_rating: 105 }
        ],
        visual_tactical_profile: { central_density: 'high', two_strikers: true }
      }
    }
  })
  assert(
    /Shevchenko/.test(plan.main_decision) && /Pulišić/.test(plan.main_decision),
    'generic two-striker diagnosis is enriched with both opponent names'
  )
  assert(
    plan.setup_actions.some((action) => /Marcatura a uomo su Christian Pulišić/.test(action.value)),
    'marking setup preserves its validated opponent target'
  )
  assert(plan.playbook.with_ball.length === 2, 'with-ball phase contains two useful steps')
  assert(plan.playbook.without_ball.length === 2, 'without-ball phase contains two useful steps')
  assert(
    plan.playbook.without_ball.some((step) => /Shevchenko/.test(step)),
    'without-ball phase replaces generic striker wording with a real name'
  )
}

// --- Case: same module, different opponent XI/shape → different customer read ---
{
  const baseOutput = {
    play_summary: { match_key: 'Piano specifico dalla foto' },
    analysis: { opponent_formation_analysis: '4-3-1-2' },
    countermeasures: {
      tactical_adjustments: [],
      player_suggestions: [],
      individual_instructions: [],
      formation_adjustments: []
    }
  }
  const central = buildCustomerPrematchPlan(baseOutput, {
    lang: 'it',
    opponentFormation: {
      formation_name: '4-3-1-2',
      extracted_data: {
        players: [{ player_name: 'Bruno Fernandes', position: 'TRQ' }],
        visual_tactical_profile: {
          central_density: 'high',
          width_profile: 'narrow',
          side_bias: 'balanced',
          two_strikers: true,
          defensive_gaps: []
        }
      }
    }
  })
  const wide = buildCustomerPrematchPlan(baseOutput, {
    lang: 'it',
    opponentFormation: {
      formation_name: '4-3-1-2',
      extracted_data: {
        players: [{ player_name: 'Salah', position: 'CLD' }],
        visual_tactical_profile: {
          central_density: 'medium',
          width_profile: 'wide',
          side_bias: 'right',
          two_strikers: false,
          defensive_gaps: ['behind_fullbacks']
        }
      }
    }
  })
  assert(
    central.opponent_read.trait !== wide.opponent_read.trait,
    'same module with different XI/shape produces a different opponent read'
  )
  assert(
    /Bruno Fernandes/.test(central.opponent_read.trait || ''),
    'read names the detected central creator'
  )
  assert(
    /destra/.test(wide.opponent_read.trait || ''),
    'read preserves detected side bias'
  )
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll prematch countermeasure checks passed')
