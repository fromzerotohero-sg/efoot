/**
 * Oracle locale per verificare la pipeline numerica:
 * base eFHUB -> PT -> manager skill -> coach ability boost -> player boost.
 *
 * Esempio:
 *   node scripts/audit-field-effects.mjs
 */
import {
  applyBoosters,
  applyCoachEffects,
  applyProgression,
  availableProgressionPoints,
  normalizeStatsToEfhub,
  resolveCoachSkillValue,
  resolveCoachStatBoosters,
  totalPointsUsed
} from '../lib/efootballBuildRules.js'
import { fetchEfhubCardDetail } from '../lib/efhubPlayerDetail.js'

const STAT_LABELS = {
  finishing: 'Finalizzazione',
  lowPass: 'Passaggio rasoterra',
  loftedPass: 'Passaggio alto',
  heading: 'Colpo di testa',
  defensiveAwareness: 'Comportamento difensivo',
  ballWinning: 'Coinvolgimento difensivo',
  trackingBack: 'Contrasto',
  aggression: 'Aggressivita',
  kickingPower: 'Potenza tiro',
  speed: 'Velocita',
  acceleration: 'Accelerazione',
  physicalContact: 'Contatto fisico',
  balance: 'Equilibrio',
  jump: 'Salto',
  stamina: 'Resistenza'
}

const THURAM_ID = '88035555416800'
const THURAM_BUILD = {
  shooting: 0,
  passing: 4,
  dribbling: 0,
  dexterity: 0,
  lowerBodyStrength: 8,
  aerialStrength: 8,
  defending: 16,
  gk1: 0,
  gk2: 0,
  gk3: 0
}

const CAPELLO = {
  coach_name: 'Fabio Capello',
  playing_style_competence: {
    possesso_palla: 46,
    contropiede_veloce: 57,
    contrattacco: 89,
    vie_laterali: 64,
    passaggio_lungo: 89
  },
  boost_ids: [6, 10],
  stat_boosters: [
    { stat_name: 'Agility +2', stats: { speed: 2, acceleration: 2, balance: 2, stamina: 2 } },
    { stat_name: 'Ball-carrying +2', stats: { speed: 2, dribbling: 2, tightPossession: 2, balance: 2 } }
  ]
}

const PT_CAPS_99 = Object.fromEntries(Object.keys(STAT_LABELS).map((key) => [key, 99]))
const STAT_CAPS_110 = Object.fromEntries(Object.keys(STAT_LABELS).map((key) => [key, 110]))
const PLAYER_BOOST_82 = {
  source_boost_id: 82,
  name: 'Stealing +2',
  stats: {
    ballWinning: 2,
    aggression: 2,
    acceleration: 2,
    physicalContact: 2
  },
  source: 'efhub'
}

function changedRows(before, after) {
  return Object.keys(STAT_LABELS)
    .map((key) => ({
      key,
      label: STAT_LABELS[key],
      before: Number(before[key]),
      after: Number(after[key]),
      delta: Number(after[key]) - Number(before[key])
    }))
    .filter((row) => row.delta !== 0)
}

function printRows(title, before, after) {
  const rows = changedRows(before, after)
  console.log(`\n${title}`)
  if (!rows.length) {
    console.log('  nessuna differenza')
    return
  }
  for (const row of rows) {
    const delta = row.delta > 0 ? `+${row.delta}` : String(row.delta)
    console.log(`  ${row.label.padEnd(26)} ${String(row.before).padStart(3)} -> ${String(row.after).padStart(3)} (${delta})`)
  }
}

const card = await fetchEfhubCardDetail({
  source: 'efhub',
  sourcePlayerId: THURAM_ID,
  name: 'Lilian Thuram'
})

const base = normalizeStatsToEfhub(card.base_stats)
const afterPt = applyProgression(base, THURAM_BUILD, PT_CAPS_99)
const afterCoach = applyCoachEffects(afterPt, CAPELLO, 'passaggio_lungo', STAT_CAPS_110)
const afterPlayerBoost = applyBoosters(afterCoach, [PLAYER_BOOST_82], STAT_CAPS_110)

console.log(`Player: ${card.player_name} (${THURAM_ID})`)
console.log(`Level cap: ${card.max_level} | PT: ${totalPointsUsed(THURAM_BUILD)}/${availableProgressionPoints(card.max_level)}`)
console.log(`Coach skill passaggio_lungo: ${resolveCoachSkillValue(CAPELLO, 'passaggio_lungo')}`)
console.log('Coach boosters resolved:', JSON.stringify(resolveCoachStatBoosters(CAPELLO), null, 2))
console.log('Player boost from eFHUB:', JSON.stringify(card.available_boosters, null, 2))

printRows('PT only', base, afterPt)
printRows('Coach skill + Capello ability boosts', afterPt, afterCoach)
printRows('Player boost 82 after coach', afterCoach, afterPlayerBoost)
