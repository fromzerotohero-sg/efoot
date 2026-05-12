import { costoProssimaTacca, costoTotaleDistribuzione, MAX_TACCE_PER_MACRO } from './efootballProgressionCost.js'

export const EFHUB_POSITION_BY_APP_POSITION = {
  PT: 'GK',
  GK: 'GK',
  DC: 'CB',
  CB: 'CB',
  TS: 'LB',
  TD: 'RB',
  MED: 'DMF',
  DMF: 'DMF',
  CC: 'CMF',
  CMF: 'CMF',
  CLS: 'LMF',
  CLD: 'RMF',
  TRQ: 'AMF',
  AMF: 'AMF',
  ESA: 'LWF',
  EDA: 'RWF',
  SP: 'SS',
  SS: 'SS',
  P: 'CF',
  CF: 'CF'
}

export const APP_POSITION_BY_EFHUB_POSITION = Object.entries(EFHUB_POSITION_BY_APP_POSITION)
  .reduce((acc, [app, efhub]) => ({ ...acc, [efhub]: acc[efhub] || app }), {})

export const PROGRESSION_SLIDERS = [
  { key: 'shooting', label: 'Shooting', affectedStats: ['finishing', 'setPieceTaking', 'curl'] },
  { key: 'passing', label: 'Passing', affectedStats: ['lowPass', 'loftedPass'] },
  { key: 'dribbling', label: 'Dribbling', affectedStats: ['ballControl', 'dribbling', 'tightPossession'] },
  { key: 'dexterity', label: 'Dexterity', affectedStats: ['offensiveAwareness', 'acceleration', 'balance'] },
  { key: 'lowerBodyStrength', label: 'Lower Body Str.', affectedStats: ['speed', 'kickingPower', 'stamina'] },
  { key: 'aerialStrength', label: 'Aerial Strength', affectedStats: ['heading', 'jump', 'physicalContact'] },
  { key: 'defending', label: 'Defending', affectedStats: ['defensiveAwareness', 'ballWinning', 'aggression', 'trackingBack'] },
  { key: 'gk1', label: 'GK 1', affectedStats: ['gkAwareness', 'jump'] },
  { key: 'gk2', label: 'GK 2', affectedStats: ['gkClearing', 'gkReach'] },
  { key: 'gk3', label: 'GK 3', affectedStats: ['gkCatching', 'gkReflexes'] }
]

export const PROGRESSION_KEYS = PROGRESSION_SLIDERS.map((entry) => entry.key)

export function getDefaultSliderValues() {
  return Object.fromEntries(PROGRESSION_KEYS.map((key) => [key, 0]))
}

export function totalPointsUsed(sliders = {}) {
  return costoTotaleDistribuzione(PROGRESSION_KEYS.reduce((acc, key) => {
    acc[key] = Number(sliders[key] || 0)
    return acc
  }, {})) ?? 0
}

export function availableProgressionPoints(levelCap) {
  const parsed = Number(levelCap)
  if (!Number.isFinite(parsed) || parsed < 1) return 0
  return Math.max(0, (Math.floor(parsed) - 1) * 2)
}

export function normalizeEfhubPosition(position) {
  const key = String(position || '').toUpperCase().trim()
  return EFHUB_POSITION_BY_APP_POSITION[key] || key || null
}

const STAT_ALIASES = {
  offensiveAwareness: ['offensiveAwareness', 'offensive_awareness', 'Offensive Awareness'],
  ballControl: ['ballControl', 'ball_control', 'Ball Control'],
  dribbling: ['dribbling', 'Dribbling'],
  tightPossession: ['tightPossession', 'tight_possession', 'Tight Possession'],
  lowPass: ['lowPass', 'low_pass', 'Low Pass'],
  loftedPass: ['loftedPass', 'lofted_pass', 'Lofted Pass'],
  finishing: ['finishing', 'Finishing'],
  setPieceTaking: ['setPieceTaking', 'set_piece_taking', 'place_kicking', 'Set Piece Taking', 'Place Kicking'],
  curl: ['curl', 'Curl'],
  heading: ['heading', 'Heading'],
  defensiveAwareness: ['defensiveAwareness', 'defensive_awareness', 'Defensive Awareness'],
  ballWinning: ['ballWinning', 'ball_winning', 'defensive_engagement', 'Defensive Engagement'],
  aggression: ['aggression', 'Aggression'],
  trackingBack: ['trackingBack', 'tracking_back', 'tackling', 'Tackling'],
  kickingPower: ['kickingPower', 'kicking_power', 'Kicking Power'],
  speed: ['speed', 'Speed'],
  acceleration: ['acceleration', 'Acceleration'],
  physicalContact: ['physicalContact', 'physical_contact', 'Physical Contact'],
  balance: ['balance', 'Balance'],
  jump: ['jump', 'Jumping', 'Jump'],
  stamina: ['stamina', 'Stamina'],
  gkAwareness: ['gkAwareness', 'gk_awareness', 'GK Awareness'],
  gkCatching: ['gkCatching', 'gk_catching', 'GK Catching'],
  gkClearing: ['gkClearing', 'gk_parrying', 'GK Parrying', 'GK Clearing'],
  gkReflexes: ['gkReflexes', 'gk_reflexes', 'GK Reflexes'],
  gkReach: ['gkReach', 'gk_reach', 'GK Reach']
}

const STAT_BUCKETS = ['attacking', 'defending', 'athleticism', 'goalkeeping']

function readStatFromAnyShape(source, aliases) {
  if (!source || typeof source !== 'object') return null
  for (const alias of aliases) {
    if (source[alias] !== undefined && source[alias] !== null && source[alias] !== '') return source[alias]
  }
  for (const bucket of STAT_BUCKETS) {
    const nested = source[bucket]
    if (!nested || typeof nested !== 'object') continue
    for (const alias of aliases) {
      if (nested[alias] !== undefined && nested[alias] !== null && nested[alias] !== '') return nested[alias]
    }
  }
  return null
}

function toStatNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(1, Math.min(99, Math.round(parsed))) : null
}

export function normalizeStatsToEfhub(baseStats = {}) {
  const stats = {}
  for (const [key, aliases] of Object.entries(STAT_ALIASES)) {
    const parsed = toStatNumber(readStatFromAnyShape(baseStats, aliases))
    stats[key] = parsed ?? 40
  }
  return stats
}

export function efhubStatsToPlayerBaseStats(stats = {}) {
  return {
    attacking: {
      offensive_awareness: stats.offensiveAwareness,
      finishing: stats.finishing,
      low_pass: stats.lowPass,
      lofted_pass: stats.loftedPass,
      dribbling: stats.dribbling,
      ball_control: stats.ballControl,
      tight_possession: stats.tightPossession,
      heading: stats.heading,
      set_piece_taking: stats.setPieceTaking,
      curl: stats.curl
    },
    defending: {
      defensive_awareness: stats.defensiveAwareness,
      defensive_engagement: stats.ballWinning,
      tackling: stats.trackingBack,
      aggression: stats.aggression
    },
    athleticism: {
      speed: stats.speed,
      acceleration: stats.acceleration,
      kicking_power: stats.kickingPower,
      physical_contact: stats.physicalContact,
      balance: stats.balance,
      stamina: stats.stamina,
      jump: stats.jump
    },
    goalkeeping: {
      gk_awareness: stats.gkAwareness,
      gk_catching: stats.gkCatching,
      gk_parrying: stats.gkClearing,
      gk_reflexes: stats.gkReflexes,
      gk_reach: stats.gkReach
    }
  }
}

export function applyProgression(baseStats = {}, sliders = {}, statCaps = {}) {
  const output = { ...normalizeStatsToEfhub(baseStats) }
  for (const slider of PROGRESSION_SLIDERS) {
    const ticks = Math.max(0, Math.min(MAX_TACCE_PER_MACRO, Math.floor(Number(sliders[slider.key] || 0))))
    if (!ticks) continue
    for (const stat of slider.affectedStats) {
      const cap = Number.isFinite(Number(statCaps[stat])) ? Number(statCaps[stat]) : 99
      output[stat] = Math.min(cap, output[stat] + ticks)
    }
  }
  return output
}

const POSITION_COLUMN = { GK: 0, CB: 1, LB: 2, RB: 3, DMF: 4, CMF: 5, LMF: 6, RMF: 7, AMF: 8, LWF: 9, RWF: 10, SS: 11, CF: 12 }
const WEIGHTS = [186,136,49,49,61,37,12,12,37,49,49,62,99,0,14,61,61,61,98,98,98,171,159,159,173,210,13,27,86,86,122,171,171,171,196,159,159,210,123,0,14,61,61,37,98,110,122,122,159,159,123,62,0,0,37,37,24,49,73,61,73,86,86,86,37,27,41,61,61,122,208,135,135,196,73,73,99,37,40,68,147,147,122,159,196,196,159,98,98,74,12,0,27,24,24,37,73,86,86,184,159,159,284,358,0,14,24,24,12,12,24,24,12,12,12,12,12,0,14,24,24,12,12,24,24,12,12,12,12,12,0,55,24,24,61,24,12,12,24,24,24,25,62,13,286,147,147,220,86,49,49,24,12,12,0,0,0,191,86,86,122,86,24,24,24,12,12,12,12,0,82,37,37,98,37,12,12,12,12,12,12,12,53,27,24,24,49,73,24,24,73,61,61,99,123,13,136,220,220,61,61,196,196,98,220,220,86,99,40,150,184,184,61,86,159,159,86,159,159,99,123,80,204,98,98,122,49,24,24,24,37,37,37,86,0,0,24,24,12,24,61,61,24,73,73,74,86,133,109,37,37,37,12,12,12,12,24,24,37,62,279,0,0,0,0,0,0,0,0,0,0,0,0,226,0,0,0,0,0,0,0,0,0,0,0,0,226,0,0,0,0,0,0,0,0,0,0,0,0,173,0,0,0,0,0,0,0,0,0,0,0,0,173,0,0,0,0,0,0,0,0,0,0,0,0,0,68,196,196,196,196,147,147,86,49,49,49,37,4,4,4,4,4,4,4,4,4,4,4,4,4,0,14,24,24,24,24,24,24,24,24,24,12,12]
const STAT_WEIGHT_INDEX = {
  offensiveAwareness: 13,
  ballControl: 26,
  dribbling: 39,
  tightPossession: 52,
  lowPass: 65,
  loftedPass: 78,
  finishing: 91,
  setPieceTaking: 104,
  curl: 117,
  heading: 130,
  defensiveAwareness: 143,
  ballWinning: 156,
  aggression: 169,
  kickingPower: 182,
  speed: 195,
  acceleration: 208,
  physicalContact: 221,
  balance: 234,
  jump: 247,
  gkAwareness: 260,
  gkReach: 273,
  gkCatching: 286,
  gkClearing: 299,
  gkReflexes: 312,
  stamina: 325,
  weakFoot: 338,
  trackingBack: 351
}

function ratingContributionValue(value) {
  return value > 25 ? value - 25 : 0
}

export function computeOverallScore({ position, height, weakFootAccuracy = 2, stats }) {
  const efhubPosition = normalizeEfhubPosition(position)
  const column = POSITION_COLUMN[efhubPosition]
  if (column === undefined) return null
  const normalized = normalizeStatsToEfhub(stats)
  let score = WEIGHTS[column] * ratingContributionValue((Number(height) || 170) - 111)
  for (const [stat, baseIndex] of Object.entries(STAT_WEIGHT_INDEX)) {
    const value = stat === 'weakFoot'
      ? Math.floor((59 * (Number(weakFootAccuracy) || 2)) / 3 + 40)
      : normalized[stat]
    score += WEIGHTS[baseIndex + column] * ratingContributionValue(value)
  }
  return score
}

export function computeOverallRatingDecimal({ position, height, weakFootAccuracy = 2, stats }) {
  const score = computeOverallScore({ position, height, weakFootAccuracy, stats })
  if (score == null) return 70
  return Math.round(100 * Math.max((score + 500) / 1000, 40)) / 100
}

export function computeOverallRating({ position, height, weakFootAccuracy = 2, stats }) {
  const score = computeOverallScore({ position, height, weakFootAccuracy, stats })
  if (score == null) return 70
  return Math.max(Math.floor((score + 500) / 1000), 40)
}

export function nextTickCost(sliders = {}, key) {
  const current = Math.max(0, Math.floor(Number(sliders[key] || 0)))
  return costoProssimaTacca(current)
}
