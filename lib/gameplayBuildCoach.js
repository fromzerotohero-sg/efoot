import {
  PROGRESSION_KEYS,
  PROGRESSION_SLIDERS,
  applyProgression,
  availableProgressionPoints,
  computeOverallRating,
  computeOverallRatingDecimal,
  efhubStatsToPlayerBaseStats,
  normalizeEfhubPosition,
  normalizeStatsToEfhub,
  nextTickCost,
  totalPointsUsed
} from './efootballBuildRules.js'
import { MAX_TACCE_PER_MACRO } from './efootballProgressionCost.js'

const EMPTY_SLIDERS = Object.fromEntries(PROGRESSION_KEYS.map((key) => [key, 0]))

const POSITION_GROUP = {
  GK: 'gk',
  CB: 'cb',
  LB: 'fb',
  RB: 'fb',
  DMF: 'dmf',
  CMF: 'cmf',
  LMF: 'wide',
  RMF: 'wide',
  AMF: 'amf',
  LWF: 'winger',
  RWF: 'winger',
  SS: 'second_striker',
  CF: 'striker'
}

const GROUP_WEIGHTS = {
  gk: { gk1: 9, gk2: 8.5, gk3: 8.5, aerialStrength: 3.5, lowerBodyStrength: 1.2, passing: 0.5 },
  cb: { defending: 9, aerialStrength: 7, lowerBodyStrength: 4.5, passing: 1.8, dexterity: 1.2 },
  fb: { lowerBodyStrength: 6, defending: 5.2, passing: 4.2, dexterity: 3.6, dribbling: 2.4, aerialStrength: 1.6 },
  dmf: { defending: 7.5, lowerBodyStrength: 5.6, passing: 4.8, dexterity: 2.4, aerialStrength: 2.2, dribbling: 1.8 },
  cmf: { passing: 6.5, lowerBodyStrength: 5, dribbling: 4.4, dexterity: 4.2, defending: 3.6, shooting: 1.6 },
  amf: { passing: 6.8, dribbling: 6.4, dexterity: 6, shooting: 3.6, lowerBodyStrength: 3.2 },
  wide: { lowerBodyStrength: 6.3, passing: 5.2, dribbling: 4.8, dexterity: 4.6, shooting: 2.2, defending: 1.8 },
  winger: { lowerBodyStrength: 6.4, dribbling: 6, dexterity: 5.8, passing: 3.8, shooting: 3.2 },
  second_striker: { dexterity: 6.5, dribbling: 5.7, shooting: 5.2, passing: 4.6, lowerBodyStrength: 3.8 },
  striker: { shooting: 7.2, dexterity: 6, lowerBodyStrength: 5.4, aerialStrength: 3.8, dribbling: 3.2, passing: 1.2 }
}

const TEAM_STYLE_WEIGHTS = {
  contrattacco: { lowerBodyStrength: 1.2, dexterity: 0.8, shooting: 0.5, defending: 0.4 },
  contropiede_veloce: { lowerBodyStrength: 1.5, dexterity: 1, shooting: 0.6, defending: 0.3 },
  possesso_palla: { passing: 1.4, dribbling: 1.1, dexterity: 0.7, lowerBodyStrength: 0.2 },
  vie_laterali: { passing: 1.2, lowerBodyStrength: 0.8, aerialStrength: 0.7, dribbling: 0.4 }
}

const SKILL_MODIFIERS = [
  { match: /long[- ]?range|long ranger|rising shot|dipping shot|first[- ]?time|acrobatic|knuckle|chip shot|phenomenal finishing/i, weights: { shooting: 1.15, lowerBodyStrength: 0.35 } },
  { match: /curler|outside curler|set piece|penalty/i, weights: { shooting: 0.75, passing: 0.25 } },
  { match: /double touch|sole control|flip flap|marseille|cut behind|scissors feint|magnetic feet|momentum dribbling|trickster|mazing run/i, weights: { dribbling: 1.45, dexterity: 0.85 } },
  { match: /through passing|one[- ]?touch pass|weighted pass|pinpoint crossing|low lofted|phenomenal passing|no look pass/i, weights: { passing: 1.45, dexterity: 0.4 } },
  { match: /speeding bullet|speed bullet|incisive run/i, weights: { lowerBodyStrength: 1.1, dexterity: 0.7, dribbling: 0.25 } },
  { match: /interception|blocker|man marking|sliding tackle|track back/i, weights: { defending: 1.3, lowerBodyStrength: 0.35 } },
  { match: /aerial superiority|heading|heel trick/i, weights: { aerialStrength: 1.2, shooting: 0.25 } },
  { match: /long throw|gk|penalty saver|low punt|high punt/i, weights: { gk1: 1, gk2: 0.9, gk3: 0.9 } }
]

const PLAYING_STYLE_WEIGHTS = [
  { match: /hole player|giocatore chiave/i, weights: { dexterity: 1.2, dribbling: 0.8, lowerBodyStrength: 0.45, shooting: 0.45 } },
  { match: /creative playmaker|regista creativo|classico|classic/i, weights: { passing: 1.15, dribbling: 0.85, dexterity: 0.7 } },
  { match: /prolific winger|ala prolifica|roaming flank|taglio al centro/i, weights: { lowerBodyStrength: 1.05, dribbling: 0.85, dexterity: 0.75, shooting: 0.35 } },
  { match: /deep[- ]?lying forward|attaccante di rientro|second striker/i, weights: { passing: 1.05, dribbling: 0.75, shooting: 0.55, dexterity: 0.55 } },
  { match: /goal poacher|opportunista|fox in the box|rapace/i, weights: { shooting: 1.35, dexterity: 0.85, lowerBodyStrength: 0.65, aerialStrength: 0.35 } },
  { match: /box[- ]?to[- ]?box|onnipresente/i, weights: { lowerBodyStrength: 0.95, defending: 0.7, passing: 0.65, dexterity: 0.4 } },
  { match: /destroyer|incontrista|anchor man|collante/i, weights: { defending: 1.25, lowerBodyStrength: 0.75, aerialStrength: 0.45, passing: 0.25 } },
  { match: /defensive full[- ]?back|terzino difensivo/i, weights: { defending: 1.2, lowerBodyStrength: 0.75, aerialStrength: 0.35 } },
  { match: /offensive full[- ]?back|terzino offensivo|full[- ]?back finisher/i, weights: { lowerBodyStrength: 1.1, passing: 0.8, dribbling: 0.55, dexterity: 0.45 } }
]

function addWeights(target, source, factor = 1) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + value * factor
  }
}

export function inferBuildTargetPosition(player = {}, slotPosition = null) {
  if (slotPosition) return normalizeEfhubPosition(slotPosition)
  if (player.slot_position) return normalizeEfhubPosition(player.slot_position)
  if (player.slotPosition) return normalizeEfhubPosition(player.slotPosition)
  if (player.position) return normalizeEfhubPosition(player.position)
  const firstOriginal = Array.isArray(player.original_positions) ? player.original_positions[0]?.position : null
  return normalizeEfhubPosition(firstOriginal) || 'CMF'
}

function getGroup(position) {
  return POSITION_GROUP[normalizeEfhubPosition(position)] || 'cmf'
}

function getWeakFootAccuracy(player = {}) {
  const direct = player.weak_foot_accuracy ?? player.weakFootAccuracy
  const metadata = player.metadata?.weak_foot_accuracy ?? player.metadata?.weakFootAccuracy
  const extracted = player.extracted_data?.weak_foot_accuracy ?? player.extracted_data?.weakFootAccuracy
  const parsed = Number(direct ?? metadata ?? extracted)
  return Number.isFinite(parsed) ? parsed : 2
}

function getLevelCap(player = {}, catalogCard = null) {
  const candidates = [
    player.level_cap,
    player.levelCap,
    player.extracted_data?.level_cap,
    player.extracted_data?.levelCap,
    player.extracted_data?.max_level,
    player.metadata?.level_cap,
    player.metadata?.levelCap,
    player.metadata?.max_level,
    catalogCard?.max_level,
    catalogCard?.level_cap,
    catalogCard?.players_payload?.level_cap
  ]
  for (const candidate of candidates) {
    const parsed = Number(candidate)
    if (Number.isFinite(parsed) && parsed > 1) return Math.floor(parsed)
  }
  return null
}

function getBuildSourceStats(player = {}, catalogCard = null) {
  const previousBuildBase = player.metadata?.build_coach?.before?.base_stats
  if (previousBuildBase && typeof previousBuildBase === 'object' && Object.keys(previousBuildBase).length > 0) {
    return previousBuildBase
  }
  if (player.base_stats && typeof player.base_stats === 'object' && Object.keys(player.base_stats).length > 0) {
    return player.base_stats
  }
  if (catalogCard?.players_payload?.base_stats) return catalogCard.players_payload.base_stats
  if (catalogCard?.base_stats) return catalogCard.base_stats
  return {}
}

function macroStatAverage(stats, macroKey) {
  const slider = PROGRESSION_SLIDERS.find((entry) => entry.key === macroKey)
  if (!slider) return 40
  return slider.affectedStats.reduce((sum, stat) => sum + (Number(stats[stat]) || 40), 0) / slider.affectedStats.length
}

function needBonus(stats, macroKey, group) {
  const avg = macroStatAverage(stats, macroKey)
  let target = 84
  if (group === 'gk' && macroKey.startsWith('gk')) target = 88
  if (['cb', 'dmf'].includes(group) && ['defending', 'aerialStrength', 'lowerBodyStrength'].includes(macroKey)) target = 86
  if (['amf', 'second_striker', 'winger'].includes(group) && ['dribbling', 'dexterity', 'passing'].includes(macroKey)) target = 88
  if (group === 'striker' && ['shooting', 'dexterity', 'lowerBodyStrength'].includes(macroKey)) target = 88
  if (avg < target - 10) return 1.3
  if (avg < target - 4) return 0.75
  if (avg < target) return 0.35
  return 0
}

function saturationPenalty(stats, macroKey) {
  const avg = macroStatAverage(stats, macroKey)
  if (avg >= 95) return 2.6
  if (avg >= 92) return 1.7
  if (avg >= 89) return 0.8
  return 0
}

function hardBlockScore(group, macroKey) {
  if (group !== 'gk' && ['gk1', 'gk2', 'gk3'].includes(macroKey)) return -1000
  if (group === 'gk' && ['shooting', 'dribbling', 'defending'].includes(macroKey)) return -1000
  if (group === 'cb' && macroKey === 'shooting') return -3
  if (group === 'striker' && macroKey === 'defending') return -4
  return 0
}

function rosterSynergyWeights(player, roster = [], group) {
  const weights = {}
  if (!Array.isArray(roster) || roster.length === 0) return weights
  const starters = roster.filter((entry) => entry?.slot_index !== null && entry?.slot_index !== undefined)
  const sameGroupCount = starters.filter((entry) => getGroup(entry.position) === group).length
  if (group === 'striker' && sameGroupCount >= 2) addWeights(weights, { passing: 0.5, dexterity: 0.4 })
  if (['cb', 'dmf'].includes(group) && starters.some((entry) => getGroup(entry.position) === 'fb')) addWeights(weights, { defending: 0.35, lowerBodyStrength: 0.25 })
  if (['wide', 'winger', 'fb'].includes(group)) addWeights(weights, { lowerBodyStrength: 0.25, passing: 0.2 })
  return weights
}

function skillWeights(skills = [], comSkills = []) {
  const weights = {}
  const allSkills = [...(Array.isArray(skills) ? skills : []), ...(Array.isArray(comSkills) ? comSkills : [])]
  for (const skill of allSkills) {
    const label = String(skill || '')
    for (const rule of SKILL_MODIFIERS) {
      if (rule.match.test(label)) addWeights(weights, rule.weights)
    }
  }
  return weights
}

function playingStyleWeights(player = {}) {
  const weights = {}
  const values = [player.role, player.playing_style_name, player.playing_style, player.metadata?.playing_style]
  for (const value of values) {
    const label = String(value || '')
    if (!label) continue
    for (const rule of PLAYING_STYLE_WEIGHTS) {
      if (rule.match.test(label)) addWeights(weights, rule.weights)
    }
  }
  return weights
}

function buildWeights({ player, targetPosition, teamStyle, roster }) {
  const group = getGroup(targetPosition)
  const weights = {}
  addWeights(weights, GROUP_WEIGHTS[group] || GROUP_WEIGHTS.cmf)
  addWeights(weights, TEAM_STYLE_WEIGHTS[String(teamStyle || '').toLowerCase()] || {})
  addWeights(weights, skillWeights(player.skills, player.com_skills))
  addWeights(weights, playingStyleWeights(player))
  addWeights(weights, rosterSynergyWeights(player, roster, group))
  return { weights, group }
}

function sanitizeSliders(sliders) {
  return PROGRESSION_KEYS.reduce((acc, key) => {
    const value = Math.max(0, Math.min(MAX_TACCE_PER_MACRO, Math.floor(Number(sliders?.[key] || 0))))
    acc[key] = value
    return acc
  }, {})
}

function buildReasons({ group, targetPosition, teamStyle, sliders, player }) {
  const reasons = []
  const top = Object.entries(sliders).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key]) => key)
  if (top.includes('passing')) reasons.push('Passaggio valorizzato per creare linee di gioco e servire compagni.')
  if (top.includes('dribbling')) reasons.push('Dribbling e controllo stretto rinforzati per sfruttare skill tecniche e conduzione.')
  if (top.includes('dexterity')) reasons.push('Destrezza usata per comportamento offensivo, accelerazione ed equilibrio nel ruolo.')
  if (top.includes('lowerBodyStrength')) reasons.push('Forza arti inferiori usata per velocita, potenza e resistenza nel sistema squadra.')
  if (top.includes('shooting')) reasons.push('Tiro potenziato per finalizzazione e minaccia offensiva coerente con le skill.')
  if (top.includes('defending')) reasons.push('Difesa prioritaria per copertura, contrasti e protezione della squadra.')
  if (top.includes('aerialStrength')) reasons.push('Forza in aria scelta per duelli fisici, salto e contatto.')
  if (group === 'gk') reasons.push('Portiere ottimizzato sulle macro PT e presenza fisica.')
  if (teamStyle) reasons.push(`Build adattata allo stile squadra: ${teamStyle}.`)
  if (Array.isArray(player.skills) && player.skills.length > 0) reasons.push('Abilita native considerate per dare peso alle macro piu coerenti.')
  return reasons.slice(0, 4)
}

export function calculateGameplayBuild({ player, roster = [], teamStyle = null, slotPosition = null, catalogCard = null } = {}) {
  if (!player) return { ok: false, error: 'missing_player' }
  const targetPosition = inferBuildTargetPosition(player, slotPosition)
  const levelCap = getLevelCap(player, catalogCard)
  const sourceBaseStats = getBuildSourceStats(player, catalogCard)
  const baseStats = normalizeStatsToEfhub(sourceBaseStats)
  const height = Number(player.height || player.height_cm || catalogCard?.height || 170)
  const weakFootAccuracy = getWeakFootAccuracy(player)
  const pointsAvailable = availableProgressionPoints(levelCap)
  const estimatedFields = []
  if (!levelCap) estimatedFields.push('level_cap')
  if (!player.height && !catalogCard?.height) estimatedFields.push('height')
  if (!sourceBaseStats || Object.keys(sourceBaseStats || {}).length === 0) estimatedFields.push('base_stats')

  if (pointsAvailable <= 0) {
    return { ok: false, error: 'missing_level_cap', estimatedFields }
  }

  const { weights, group } = buildWeights({ player, targetPosition, teamStyle, roster })
  const sliders = { ...EMPTY_SLIDERS }
  let spent = 0
  let currentStats = { ...baseStats }
  const maxSteps = PROGRESSION_KEYS.length * MAX_TACCE_PER_MACRO

  for (let step = 0; step < maxSteps && spent < pointsAvailable; step++) {
    let bestKey = null
    let bestScore = -Infinity
    for (const key of PROGRESSION_KEYS) {
      if (sliders[key] >= MAX_TACCE_PER_MACRO) continue
      const cost = nextTickCost(sliders, key)
      if (!cost || spent + cost > pointsAvailable) continue
      const baseWeight = weights[key] || 0
      const blocked = hardBlockScore(group, key)
      if (blocked <= -100) continue
      const score = (
        baseWeight +
        needBonus(currentStats, key, group) +
        blocked -
        saturationPenalty(currentStats, key) -
        sliders[key] * 0.08
      ) / cost
      if (score > bestScore) {
        bestScore = score
        bestKey = key
      }
    }
    if (!bestKey || bestScore <= 0.02) break
    const cost = nextTickCost(sliders, bestKey)
    sliders[bestKey] += 1
    spent += cost
    currentStats = applyProgression(baseStats, sliders)
  }

  // Spend remaining points only on legal positive-priority macros, keeping gameplay-safe blocks.
  for (let guard = 0; spent < pointsAvailable && guard < maxSteps; guard++) {
    const candidates = PROGRESSION_KEYS
      .filter((key) => sliders[key] < MAX_TACCE_PER_MACRO)
      .map((key) => ({ key, cost: nextTickCost(sliders, key), value: (weights[key] || 0) + hardBlockScore(group, key) - sliders[key] * 0.12 }))
      .filter((entry) => entry.cost && spent + entry.cost <= pointsAvailable && entry.value > 0)
      .sort((a, b) => (b.value / b.cost) - (a.value / a.cost))
    if (candidates.length === 0) break
    const selected = candidates[0]
    sliders[selected.key] += 1
    spent += selected.cost
  }

  // Solo progressione PT: booster e coach non vanno "cotti" nella build salvata (come pre-253c919).
  // Boosters/coach restano sui dati rosa e nel calcolo OVR altrove se serve.
  const finalStats = applyProgression(baseStats, sliders)
  const beforeOverall = computeOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: baseStats })
  const afterOverall = computeOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: finalStats })
  const afterOverallDecimal = computeOverallRatingDecimal({ position: targetPosition, height, weakFootAccuracy, stats: finalStats })
  const safeSliders = sanitizeSliders(sliders)
  const confidence = Math.max(0.55, Math.min(0.96, 0.96 - estimatedFields.length * 0.12))

  return {
    ok: true,
    method: 'gameplay_build_v1',
    mode: 'gameplay',
    targetPosition,
    group,
    levelCap,
    pointsAvailable,
    pointsUsed: totalPointsUsed(safeSliders),
    sliders: safeSliders,
    sourceBaseStats,
    baseStats,
    finalEfhubStats: finalStats,
    finalBaseStats: efhubStatsToPlayerBaseStats(finalStats),
    beforeOverall,
    afterOverall,
    afterOverallDecimal,
    estimatedFields,
    confidence,
    reasons: buildReasons({ group, targetPosition, teamStyle, sliders: safeSliders, player }),
    warnings: estimatedFields.length > 0 ? ['Alcuni dati sono stati stimati o recuperati da fallback.'] : []
  }
}
