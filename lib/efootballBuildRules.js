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
  physicalContact: ['physicalContact', 'physical_contact', 'strength', 'Physical Contact'],
  balance: ['balance', 'Balance'],
  jump: ['jump', 'jumping', 'Jumping', 'Jump'],
  stamina: ['stamina', 'Stamina'],
  gkAwareness: ['gkAwareness', 'gk_awareness', 'awareness', 'GK Awareness'],
  gkCatching: ['gkCatching', 'gk_catching', 'catching', 'GK Catching'],
  gkClearing: ['gkClearing', 'gk_parrying', 'parrying', 'GK Parrying', 'GK Clearing'],
  gkReflexes: ['gkReflexes', 'gk_reflexes', 'reflexes', 'GK Reflexes'],
  gkReach: ['gkReach', 'gk_reach', 'reach', 'GK Reach']
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

/** Konami allows built stats above 99 (e.g. 101–103 with PT + booster + coach). */
export const DEFAULT_STAT_CEILING = 110

function toStatNumber(value, ceiling = DEFAULT_STAT_CEILING) {
  const parsed = Number(value)
  const max = Number.isFinite(Number(ceiling)) ? Number(ceiling) : DEFAULT_STAT_CEILING
  return Number.isFinite(parsed) ? Math.max(1, Math.min(max, Math.round(parsed))) : null
}

export function clampStatValue(value, stat, statCaps = {}) {
  const ceiling = Number(statCaps?.[stat]) || DEFAULT_STAT_CEILING
  return Math.min(ceiling, Math.max(1, Math.round(Number(value) || 40)))
}

/**
 * Per-stat ceiling: catalog max + headroom for PT/booster, else DEFAULT_STAT_CEILING.
 */
export function resolveStatCaps(catalogCard = null) {
  const raw = catalogCard?.max_stats || catalogCard?.players_payload?.max_stats
  const maxStats = raw && typeof raw === 'object' ? normalizeStatsToEfhub(raw) : {}
  const caps = {}
  for (const key of Object.keys(STAT_ALIASES)) {
    const catalogMax = Number(maxStats[key])
    caps[key] = Number.isFinite(catalogMax) && catalogMax > 0
      ? Math.min(DEFAULT_STAT_CEILING, catalogMax + 30)
      : DEFAULT_STAT_CEILING
  }
  return caps
}

export function normalizeStatsToEfhub(baseStats = {}, options = {}) {
  const ceiling = options.statCeiling ?? DEFAULT_STAT_CEILING
  const stats = {}
  for (const [key, aliases] of Object.entries(STAT_ALIASES)) {
    const parsed = toStatNumber(readStatFromAnyShape(baseStats, aliases), ceiling)
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
      const cap = Number.isFinite(Number(statCaps[stat])) ? Number(statCaps[stat]) : DEFAULT_STAT_CEILING
      output[stat] = Math.min(cap, (Number(output[stat]) || 40) + ticks)
    }
  }
  return output
}

function normalizeRuleKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseBoostAmount(value, fallback = 1) {
  const match = String(value || '').match(/\+?\s*(\d+)/)
  if (!match) return fallback
  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const SINGLE_STAT_BY_LABEL = {
  finalizzazione: 'finishing',
  finishing: 'finishing',
  'passaggio rasoterra': 'lowPass',
  'low pass': 'lowPass',
  'passaggio alto': 'loftedPass',
  'lofted pass': 'loftedPass',
  dribbling: 'dribbling',
  'controllo palla': 'ballControl',
  'ball control': 'ballControl',
  velocita: 'speed',
  speed: 'speed',
  accelerazione: 'acceleration',
  acceleration: 'acceleration',
  'comportamento difensivo': 'defensiveAwareness',
  'defensive awareness': 'defensiveAwareness',
  contrasto: 'trackingBack',
  tackling: 'trackingBack',
  'coinvolgimento difensivo': 'ballWinning',
  'defensive engagement': 'ballWinning',
  aggressivita: 'aggression',
  aggression: 'aggression',
  'contatto fisico': 'physicalContact',
  'physical contact': 'physicalContact',
  equilibrio: 'balance',
  balance: 'balance',
  resistenza: 'stamina',
  stamina: 'stamina',
  salto: 'jump',
  jump: 'jump',
  'potenza tiro': 'kickingPower',
  'kicking power': 'kickingPower',
  'calci piazzati': 'setPieceTaking',
  'set piece taking': 'setPieceTaking',
  'tiro a giro': 'curl',
  curl: 'curl',
  'colpo di testa': 'heading',
  heading: 'heading',
  portiere: 'gkAwareness',
  'gk awareness': 'gkAwareness',
  'presa pt': 'gkCatching',
  'gk catching': 'gkCatching',
  'parata pt': 'gkClearing',
  'gk parrying': 'gkClearing',
  'riflessi pt': 'gkReflexes',
  'gk reflexes': 'gkReflexes',
  'estensione pt': 'gkReach',
  'gk reach': 'gkReach'
}

const BOOSTER_CATEGORY_STATS = {
  shooting: ['ballControl', 'finishing', 'kickingPower', 'physicalContact'],
  tiro: ['ballControl', 'finishing', 'kickingPower', 'physicalContact'],
  striking: ['finishing', 'setPieceTaking', 'curl', 'kickingPower'],
  'free kick taking': ['finishing', 'setPieceTaking', 'curl', 'kickingPower'],
  'calci di punizione': ['finishing', 'setPieceTaking', 'curl', 'kickingPower'],
  aerial: ['finishing', 'heading', 'physicalContact', 'jump'],
  'gioco aereo': ['finishing', 'heading', 'physicalContact', 'jump'],
  'aerial block': ['heading', 'defensiveAwareness', 'physicalContact', 'jump'],
  'blocco aereo': ['heading', 'defensiveAwareness', 'physicalContact', 'jump'],
  passing: ['lowPass', 'loftedPass', 'curl', 'kickingPower'],
  passaggio: ['lowPass', 'loftedPass', 'curl', 'kickingPower'],
  'ball carrying': ['dribbling', 'tightPossession', 'speed', 'balance'],
  'gestione del pallone': ['dribbling', 'tightPossession', 'speed', 'balance'],
  technique: ['ballControl', 'dribbling', 'tightPossession', 'lowPass'],
  tecnica: ['ballControl', 'dribbling', 'tightPossession', 'lowPass'],
  defending: ['defensiveAwareness', 'ballWinning', 'acceleration', 'jump'],
  difesa: ['defensiveAwareness', 'ballWinning', 'acceleration', 'jump'],
  'defensive pillar': ['defensiveAwareness', 'ballWinning', 'acceleration', 'jump'],
  'pilastro difensivo': ['defensiveAwareness', 'ballWinning', 'acceleration', 'jump'],
  duelling: ['defensiveAwareness', 'aggression', 'speed', 'physicalContact'],
  duels: ['defensiveAwareness', 'aggression', 'speed', 'physicalContact'],
  duelli: ['defensiveAwareness', 'aggression', 'speed', 'physicalContact'],
  agility: ['speed', 'acceleration', 'balance', 'stamina'],
  agilita: ['speed', 'acceleration', 'balance', 'stamina'],
  physicality: ['balance', 'physicalContact', 'jump', 'stamina'],
  fisicita: ['balance', 'physicalContact', 'jump', 'stamina'],
  goalkeeping: ['gkAwareness', 'gkCatching', 'gkClearing', 'gkReflexes'],
  portiere: ['gkAwareness', 'gkCatching', 'gkClearing', 'gkReflexes'],
  'striker s instinct': ['offensiveAwareness', 'ballControl', 'finishing', 'acceleration'],
  'istinto da attaccante': ['offensiveAwareness', 'ballControl', 'finishing', 'acceleration'],
  shutdown: ['defensiveAwareness', 'trackingBack', 'ballWinning', 'speed'],
  saracinesca: ['defensiveAwareness', 'trackingBack', 'ballWinning', 'speed'],
  'ball protection': ['ballControl', 'tightPossession', 'balance', 'physicalContact'],
  'proteggi il possesso': ['ballControl', 'tightPossession', 'balance', 'physicalContact'],
  balancer: ['offensiveAwareness', 'defensiveAwareness', 'acceleration', 'stamina'],
  equilibrio: ['offensiveAwareness', 'defensiveAwareness', 'acceleration', 'stamina'],
  counter: ['lowPass', 'trackingBack', 'ballWinning', 'physicalContact'],
  contropiedista: ['lowPass', 'trackingBack', 'ballWinning', 'physicalContact'],
  strength: ['kickingPower', 'speed', 'physicalContact', 'jump'],
  forza: ['kickingPower', 'speed', 'physicalContact', 'jump'],
  accuracy: ['lowPass', 'loftedPass', 'finishing', 'kickingPower'],
  precisione: ['lowPass', 'loftedPass', 'finishing', 'kickingPower'],
  fundamentals: ['lowPass', 'defensiveAwareness', 'aggression', 'ballWinning'],
  fondamenta: ['lowPass', 'defensiveAwareness', 'aggression', 'ballWinning'],
  playmaking: ['lowPass', 'loftedPass', 'offensiveAwareness', 'tightPossession'],
  regista: ['lowPass', 'loftedPass', 'offensiveAwareness', 'tightPossession'],
  crosser: ['loftedPass', 'curl', 'speed', 'stamina'],
  crossatore: ['loftedPass', 'curl', 'speed', 'stamina'],
  fantasista: ['ballControl', 'dribbling', 'curl', 'offensiveAwareness'],
  magical: ['ballControl', 'dribbling', 'tightPossession', 'curl'],
  magico: ['ballControl', 'dribbling', 'tightPossession', 'curl'],
  'offensive engine': ['offensiveAwareness', 'lowPass', 'acceleration', 'stamina'],
  'motore offensivo': ['offensiveAwareness', 'lowPass', 'acceleration', 'stamina'],
  'off the ball': ['offensiveAwareness', 'speed', 'acceleration', 'stamina'],
  'movimento senza palla': ['offensiveAwareness', 'speed', 'acceleration', 'stamina'],
  'offence creator': ['offensiveAwareness', 'lowPass', 'dribbling', 'balance'],
  'ball winning': ['defensiveAwareness', 'trackingBack', 'ballWinning', 'aggression'],
  rubapalla: ['defensiveAwareness', 'trackingBack', 'ballWinning', 'aggression'],
  'game changer': ['finishing', 'dribbling', 'acceleration', 'balance'],
  spaccapartita: ['finishing', 'dribbling', 'acceleration', 'balance'],
  breakthrough: ['offensiveAwareness', 'dribbling', 'speed', 'acceleration'],
  rebuilding: ['lowPass', 'loftedPass', 'defensiveAwareness', 'stamina'],
  'hard worker': ['defensiveAwareness', 'trackingBack', 'stamina', 'aggression'],
  'total package': ['ballControl', 'lowPass', 'speed', 'physicalContact']
}

export const EFHUB_MANAGER_ABILITY_STATS = {
  0: 'offensiveAwareness',
  1: 'ballControl',
  2: 'tightPossession',
  3: 'dribbling',
  4: 'lowPass',
  5: 'loftedPass',
  6: 'finishing',
  7: 'setPieceTaking',
  8: 'curl',
  9: 'heading',
  10: 'defensiveAwareness',
  11: 'ballWinning',
  12: 'trackingBack',
  13: 'aggression',
  14: 'kickingPower',
  15: 'speed',
  16: 'acceleration',
  17: 'balance',
  18: 'physicalContact',
  19: 'jump',
  20: 'gkAwareness',
  21: 'gkCatching',
  22: 'gkClearing',
  23: 'gkReflexes',
  24: 'gkReach',
  25: 'stamina'
}

function buildStatDelta(stats, amount) {
  return stats.reduce((acc, stat) => {
    acc[stat] = (acc[stat] || 0) + amount
    return acc
  }, {})
}

function normalizeExplicitBoosterStats(stats = {}) {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return {}
  const delta = {}
  for (const [stat, aliases] of Object.entries(STAT_ALIASES)) {
    const value = readStatFromAnyShape(stats, aliases)
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed !== 0) delta[stat] = parsed
  }
  return delta
}

export function resolveBoosterStats(booster) {
  if (!booster || typeof booster !== 'object') return {}
  const explicitStats = normalizeExplicitBoosterStats(booster.stats)
  if (Object.keys(explicitStats).length > 0) return explicitStats
  const label = normalizeRuleKey(booster.name || booster.booster_name || booster.stat_name || booster.statName)
  const rawEffect = booster.effect || booster.bonus || booster.value || booster.level || booster.amount
  const amount = parseBoostAmount(rawEffect, Number(booster.bonus) || Number(booster.level) || 1)
  const singleStat = SINGLE_STAT_BY_LABEL[label]
  if (singleStat) return { [singleStat]: amount }
  const categoryStats = BOOSTER_CATEGORY_STATS[label]
  return categoryStats ? buildStatDelta(categoryStats, amount) : {}
}

function applyStatDelta(stats = {}, delta = {}, statCaps = {}) {
  const output = { ...normalizeStatsToEfhub(stats) }
  for (const [stat, amount] of Object.entries(delta || {})) {
    const next = (Number(output[stat]) || 40) + (Number(amount) || 0)
    output[stat] = clampStatValue(next, stat, statCaps)
  }
  return output
}

export function applyBoosters(stats = {}, boosters = [], statCaps = {}) {
  const caps = statCaps && Object.keys(statCaps).length > 0 ? statCaps : resolveStatCaps()
  let output = { ...normalizeStatsToEfhub(stats) }
  for (const booster of Array.isArray(boosters) ? boosters : []) {
    output = applyStatDelta(output, resolveBoosterStats(booster), caps)
  }
  return output
}

export function resolveCoachStatBoosters(coach = null) {
  const boostIds = Array.isArray(coach?.boost_ids)
    ? coach.boost_ids
    : Array.isArray(coach?.coach_payload?.boost_ids)
      ? coach.coach_payload.boost_ids
      : Array.isArray(coach?.metadata?.raw_boost_ids)
        ? coach.metadata.raw_boost_ids
        : null

  if (boostIds) {
    const boosters = boostIds
      .map((boostId, index) => {
        const parsed = Number(boostId)
        const stat = EFHUB_MANAGER_ABILITY_STATS[parsed]
        if (!stat) return null
        return {
          source_boost_id: parsed,
          slot_index: index + 1,
          stat_name: stat,
          bonus: 1,
          stats: { [stat]: 1 },
          source: 'efhub-manager-ability'
        }
      })
      .filter(Boolean)
    if (boosters.length > 0) return boosters
  }

  return Array.isArray(coach?.stat_boosters) ? coach.stat_boosters : []
}

const MANAGER_SKILL_FACTORS = [.65,.6675,.685,.7025,.72,.7375,.755,.7725,.79,.8075,.825,.8425,.86,.8775,.895,.9125,.93,.9475,.965,.9825,1,1,1.01163,1.01389,1.015625,1.01755,1.01925,1.02125,1.02275,1.0244,1.026,1.02725,1.029,1.03,1.03196,1.03275,1.03375,1.034091,1.0355,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036]
const MANAGER_SKILL_AFFECTED_STATS = ['offensiveAwareness','ballControl','dribbling','tightPossession','lowPass','loftedPass','finishing','heading','setPieceTaking','curl','defensiveAwareness','ballWinning','trackingBack','aggression','gkAwareness','gkCatching','gkClearing','gkReflexes','gkReach','speed','acceleration','kickingPower','jump','physicalContact','balance','stamina']

export function managerSkillMultiplier(skillValue) {
  const parsed = Number(skillValue)
  const index = Math.min(parsed >= 50 ? parsed - 50 : 0, MANAGER_SKILL_FACTORS.length - 1)
  return MANAGER_SKILL_FACTORS[Math.max(0, Math.floor(index))] || 1
}

export function applyManagerSkill(stats = {}, skillValue = 70, statCaps = {}) {
  const caps = statCaps && Object.keys(statCaps).length > 0 ? statCaps : resolveStatCaps()
  const multiplier = managerSkillMultiplier(skillValue)
  const output = { ...normalizeStatsToEfhub(stats) }
  if (multiplier === 1) return output
  for (const stat of MANAGER_SKILL_AFFECTED_STATS) {
    const next = output[stat] + Math.floor(output[stat] * (multiplier - 1))
    output[stat] = clampStatValue(next, stat, caps)
  }
  return output
}

export function resolveCoachSkillValue(coach = null, teamStyle = null) {
  const competence = coach?.playing_style_competence
  if (!competence || typeof competence !== 'object') return 70
  if (teamStyle && competence[teamStyle] !== undefined) return Number(competence[teamStyle]) || 70
  const values = Object.values(competence).map(Number).filter(Number.isFinite)
  return values.length > 0 ? Math.max(...values) : 70
}

export function applyCoachEffects(stats = {}, coach = null, teamStyle = null, statCaps = {}) {
  const caps = statCaps && Object.keys(statCaps).length > 0 ? statCaps : resolveStatCaps()
  let output = applyManagerSkill(stats, resolveCoachSkillValue(coach, teamStyle), caps)
  const statBoosters = resolveCoachStatBoosters(coach)
  output = applyBoosters(output, statBoosters, caps)
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

/**
 * OVR profilo carta in Play: stesse stats/formula, arrotondamento come UI Konami
 * (es. 100.12 → 99 senza booster; ~100.86 → 101 con booster max).
 */
export function computePlayProfileOverallRating({ position, height, weakFootAccuracy = 2, stats }) {
  const decimal = computeOverallRatingDecimal({ position, height, weakFootAccuracy, stats })
  if (!Number.isFinite(decimal)) return 70
  if (decimal >= 100.75) return Math.round(decimal)
  if (decimal >= 100.05 && decimal < 100.3) return 99
  return Math.max(40, Math.floor(decimal))
}

/** Typical eFootball ceiling when catalog max is unknown (top legend cards ~105–106). */
export const DEFAULT_OVERALL_CAP = 106

/**
 * @param {{ catalogCard?: object|null, player?: object|null }} sources
 * @returns {number}
 */
export function resolveOverallRatingCap({ catalogCard = null, player = null } = {}) {
  const candidates = [
    catalogCard?.overall_max_level,
    catalogCard?.players_payload?.overall_max_level,
    player?.metadata?.catalog_overall_max_level,
    player?.metadata?.overall_max_level,
    player?.extracted_data?.overall_max_level
  ]
  for (const candidate of candidates) {
    const parsed = Number(candidate)
    if (Number.isFinite(parsed) && parsed >= 40 && parsed <= 120) return Math.floor(parsed)
  }
  return DEFAULT_OVERALL_CAP
}

/**
 * @param {number|null|undefined} rating
 * @param {number|null|undefined} cap
 */
export function clampOverallRating(rating, cap = DEFAULT_OVERALL_CAP) {
  const value = Math.floor(Number(rating))
  if (!Number.isFinite(value)) return null
  const ceiling = Number(cap)
  const max = Number.isFinite(ceiling) ? Math.floor(ceiling) : DEFAULT_OVERALL_CAP
  return Math.max(40, Math.min(max, value))
}

export function nextTickCost(sliders = {}, key) {
  const current = Math.max(0, Math.floor(Number(sliders[key] || 0)))
  return costoProssimaTacca(current)
}
