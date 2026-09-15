const POSITION_BY_APP_POSITION = {
  PT: 'GK', GK: 'GK', DC: 'CB', CB: 'CB', TS: 'LB', TD: 'RB',
  MED: 'DMF', DMF: 'DMF', CC: 'CMF', CMF: 'CMF', CLS: 'LMF',
  CLD: 'RMF', TRQ: 'AMF', AMF: 'AMF', ESA: 'LWF', EDA: 'RWF',
  SP: 'SS', SS: 'SS', P: 'CF', CF: 'CF'
}

const PROGRESSION_SLIDERS = [
  ['shooting', ['finishing', 'setPieceTaking', 'curl']],
  ['passing', ['lowPass', 'loftedPass']],
  ['dribbling', ['ballControl', 'dribbling', 'tightPossession']],
  ['dexterity', ['offensiveAwareness', 'acceleration', 'balance']],
  ['lowerBodyStrength', ['speed', 'kickingPower', 'stamina']],
  ['aerialStrength', ['heading', 'jump', 'physicalContact']],
  ['defending', ['defensiveAwareness', 'ballWinning', 'aggression', 'trackingBack']],
  ['gk1', ['gkAwareness', 'jump']],
  ['gk2', ['gkClearing', 'gkReach']],
  ['gk3', ['gkCatching', 'gkReflexes']]
]

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
const DEFAULT_STAT_CEILING = 110
const DEFAULT_OVERALL_CAP = 106

function readStat(source, aliases) {
  if (!source || typeof source !== 'object') return null
  for (const alias of aliases) {
    if (source[alias] !== undefined && source[alias] !== null && source[alias] !== '') {
      return source[alias]
    }
  }
  for (const bucket of STAT_BUCKETS) {
    const nested = source[bucket]
    if (!nested || typeof nested !== 'object') continue
    for (const alias of aliases) {
      if (nested[alias] !== undefined && nested[alias] !== null && nested[alias] !== '') {
        return nested[alias]
      }
    }
  }
  return null
}

export function normalizeStatsToEfhub(source = {}, ceiling = DEFAULT_STAT_CEILING) {
  return Object.fromEntries(Object.entries(STAT_ALIASES).map(([stat, aliases]) => {
    const value = Number(readStat(source, aliases))
    return [stat, Number.isFinite(value) ? Math.max(1, Math.min(ceiling, Math.round(value))) : 40]
  }))
}

function resolveStatCaps(catalogCard = null) {
  const raw = catalogCard?.max_stats || catalogCard?.players_payload?.max_stats
  const maxima = raw && typeof raw === 'object' ? normalizeStatsToEfhub(raw) : {}
  return Object.fromEntries(Object.keys(STAT_ALIASES).map((stat) => {
    const maximum = Number(maxima[stat])
    return [stat, Number.isFinite(maximum) && maximum > 0
      ? Math.min(DEFAULT_STAT_CEILING, maximum + 30)
      : DEFAULT_STAT_CEILING]
  }))
}

function clampStat(value, stat, caps) {
  return Math.min(Number(caps?.[stat]) || DEFAULT_STAT_CEILING, Math.max(1, Math.round(Number(value) || 40)))
}

function applyProgression(stats, sliders, caps) {
  const output = normalizeStatsToEfhub(stats)
  for (const [key, affected] of PROGRESSION_SLIDERS) {
    const ticks = Math.max(0, Math.min(25, Math.floor(Number(sliders?.[key] || 0))))
    for (const stat of affected) output[stat] = clampStat(output[stat] + ticks, stat, caps)
  }
  return output
}

function normalizedRuleKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const SINGLE_STAT_BY_LABEL = {
  finalizzazione: 'finishing', finishing: 'finishing',
  'passaggio rasoterra': 'lowPass', 'low pass': 'lowPass',
  'passaggio alto': 'loftedPass', 'lofted pass': 'loftedPass',
  dribbling: 'dribbling', 'controllo palla': 'ballControl', 'ball control': 'ballControl',
  velocita: 'speed', speed: 'speed', accelerazione: 'acceleration', acceleration: 'acceleration',
  'comportamento difensivo': 'defensiveAwareness', 'defensive awareness': 'defensiveAwareness',
  contrasto: 'trackingBack', tackling: 'trackingBack',
  'coinvolgimento difensivo': 'ballWinning', 'defensive engagement': 'ballWinning',
  aggressivita: 'aggression', aggression: 'aggression',
  'contatto fisico': 'physicalContact', 'physical contact': 'physicalContact',
  equilibrio: 'balance', balance: 'balance', resistenza: 'stamina', stamina: 'stamina',
  salto: 'jump', jump: 'jump', 'potenza tiro': 'kickingPower', 'kicking power': 'kickingPower',
  'calci piazzati': 'setPieceTaking', 'set piece taking': 'setPieceTaking',
  'tiro a giro': 'curl', curl: 'curl', 'colpo di testa': 'heading', heading: 'heading',
  portiere: 'gkAwareness', 'gk awareness': 'gkAwareness', 'presa pt': 'gkCatching',
  'gk catching': 'gkCatching', 'parata pt': 'gkClearing', 'gk parrying': 'gkClearing',
  'riflessi pt': 'gkReflexes', 'gk reflexes': 'gkReflexes',
  'estensione pt': 'gkReach', 'gk reach': 'gkReach'
}

const CATEGORY_STATS = {
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

function explicitBoosterStats(stats) {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return {}
  const output = {}
  for (const [stat, aliases] of Object.entries(STAT_ALIASES)) {
    const value = Number(readStat(stats, aliases))
    if (Number.isFinite(value) && value !== 0) output[stat] = value
  }
  return output
}

function boosterDelta(booster) {
  if (!booster || typeof booster !== 'object') return {}
  const explicit = explicitBoosterStats(booster.stats)
  if (Object.keys(explicit).length) return explicit
  const label = normalizedRuleKey(booster.name || booster.booster_name || booster.stat_name || booster.statName)
  const match = String(booster.effect || booster.bonus || booster.value || booster.level || booster.amount || '').match(/\+?\s*(\d+)/)
  const amount = match ? Number(match[1]) : Number(booster.bonus) || Number(booster.level) || 1
  const single = SINGLE_STAT_BY_LABEL[label]
  if (single) return { [single]: amount }
  return Object.fromEntries((CATEGORY_STATS[label] || []).map((stat) => [stat, amount]))
}

function applyBoosters(stats, boosters, caps) {
  let output = normalizeStatsToEfhub(stats)
  for (const booster of Array.isArray(boosters) ? boosters : []) {
    for (const [stat, amount] of Object.entries(boosterDelta(booster))) {
      output[stat] = clampStat(output[stat] + Number(amount || 0), stat, caps)
    }
  }
  return output
}

function normalizedBoosterName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function availableBoosters(player) {
  return Array.isArray(player?.available_boosters)
    ? player.available_boosters
    : Array.isArray(player?.boosters) ? player.boosters : []
}

function playerBoosters(player) {
  const active = normalizedBoosterName(player?.active_booster_name)
  return active ? availableBoosters(player).filter((entry) => normalizedBoosterName(entry?.name) === active) : []
}

function fieldBoosters(player) {
  const list = availableBoosters(player).filter((entry) => String(entry?.name || '').trim())
  const metadata = player?.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const configured = player?.field_active_booster_names ??
    metadata.field_active_booster_names ??
    metadata.active_field_booster_names ??
    metadata.build_coach?.field_active_booster_names
  if (Array.isArray(configured) || (typeof configured === 'string' && configured.trim())) {
    const names = (Array.isArray(configured) ? configured : [configured])
      .map((entry) => normalizedBoosterName(typeof entry === 'string' ? entry : entry?.name))
      .filter(Boolean)
    return list.filter((entry) => names.includes(normalizedBoosterName(entry?.name)))
  }
  const marked = list.filter((entry) => entry?.field_active === true || entry?.active === true)
  return marked.length ? marked : playerBoosters(player)
}

const MANAGER_FACTORS = [.65,.6675,.685,.7025,.72,.7375,.755,.7725,.79,.8075,.825,.8425,.86,.8775,.895,.9125,.93,.9475,.965,.9825,1,1,1.01163,1.01389,1.015625,1.01755,1.01925,1.02125,1.02275,1.0244,1.026,1.02725,1.029,1.03,1.03196,1.03275,1.03375,1.034091,1.0355,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036,1.036]
const MANAGER_STATS = ['offensiveAwareness','ballControl','dribbling','tightPossession','lowPass','loftedPass','finishing','heading','setPieceTaking','curl','defensiveAwareness','ballWinning','trackingBack','aggression','gkAwareness','gkCatching','gkClearing','gkReflexes','gkReach','speed','acceleration','kickingPower','jump','physicalContact','balance','stamina']
const MANAGER_BOOST_STATS = {
  0: 'offensiveAwareness', 1: 'ballControl', 2: 'tightPossession', 3: 'dribbling',
  4: 'lowPass', 5: 'loftedPass', 6: 'finishing', 7: 'setPieceTaking', 8: 'curl',
  9: 'heading', 10: 'defensiveAwareness', 11: 'ballWinning', 12: 'trackingBack',
  13: 'aggression', 14: 'kickingPower', 15: 'speed', 16: 'acceleration',
  17: 'balance', 18: 'physicalContact', 19: 'jump', 20: 'gkAwareness',
  21: 'gkCatching', 22: 'gkClearing', 23: 'gkReflexes', 24: 'gkReach', 25: 'stamina'
}

function coachSkill(coach, teamStyle) {
  const competence = coach?.playing_style_competence
  if (!competence || typeof competence !== 'object') return 70
  if (teamStyle && competence[teamStyle] !== undefined) return Number(competence[teamStyle]) || 70
  const values = Object.values(competence).map(Number).filter(Number.isFinite)
  return values.length ? Math.max(...values) : 70
}

function coachBoosters(coach) {
  const ids = Array.isArray(coach?.boost_ids) ? coach.boost_ids
    : Array.isArray(coach?.coach_payload?.boost_ids) ? coach.coach_payload.boost_ids
      : Array.isArray(coach?.metadata?.raw_boost_ids) ? coach.metadata.raw_boost_ids : null
  const resolved = ids?.map((id) => MANAGER_BOOST_STATS[Number(id)])
    .filter(Boolean).map((stat) => ({ stats: { [stat]: 1 } }))
  return resolved?.length ? resolved : Array.isArray(coach?.stat_boosters) ? coach.stat_boosters : []
}

function applyCoach(stats, coach, teamStyle, caps) {
  const skill = Number(coachSkill(coach, teamStyle))
  const factor = MANAGER_FACTORS[Math.max(0, Math.min(
    Math.floor(skill >= 50 ? skill - 50 : 0),
    MANAGER_FACTORS.length - 1
  ))] || 1
  const output = normalizeStatsToEfhub(stats)
  if (factor !== 1) {
    for (const stat of MANAGER_STATS) {
      output[stat] = clampStat(output[stat] + Math.floor(output[stat] * (factor - 1)), stat, caps)
    }
  }
  return applyBoosters(output, coachBoosters(coach), caps)
}

const POSITION_COLUMN = { GK: 0, CB: 1, LB: 2, RB: 3, DMF: 4, CMF: 5, LMF: 6, RMF: 7, AMF: 8, LWF: 9, RWF: 10, SS: 11, CF: 12 }
const WEIGHTS = [186,136,49,49,61,37,12,12,37,49,49,62,99,0,14,61,61,61,98,98,98,171,159,159,173,210,13,27,86,86,122,171,171,171,196,159,159,210,123,0,14,61,61,37,98,110,122,122,159,159,123,62,0,0,37,37,24,49,73,61,73,86,86,86,37,27,41,61,61,122,208,135,135,196,73,73,99,37,40,68,147,147,122,159,196,196,159,98,98,74,12,0,27,24,24,37,73,86,86,184,159,159,284,358,0,14,24,24,12,12,24,24,12,12,12,12,12,0,14,24,24,12,12,24,24,12,12,12,12,12,0,55,24,24,61,24,12,12,24,24,24,25,62,13,286,147,147,220,86,49,49,24,12,12,0,0,0,191,86,86,122,86,24,24,24,12,12,12,12,0,82,37,37,98,37,12,12,12,12,12,12,12,53,27,24,24,49,73,24,24,73,61,61,99,123,13,136,220,220,61,61,196,196,98,220,220,86,99,40,150,184,184,61,86,159,159,86,159,159,99,123,80,204,98,98,122,49,24,24,24,37,37,37,86,0,0,24,24,12,24,61,61,24,73,73,74,86,133,109,37,37,37,12,12,12,12,24,24,37,62,279,0,0,0,0,0,0,0,0,0,0,0,0,226,0,0,0,0,0,0,0,0,0,0,0,0,226,0,0,0,0,0,0,0,0,0,0,0,0,173,0,0,0,0,0,0,0,0,0,0,0,0,173,0,0,0,0,0,0,0,0,0,0,0,0,0,68,196,196,196,196,147,147,86,49,49,49,37,4,4,4,4,4,4,4,4,4,4,4,4,4,0,14,24,24,24,24,24,24,24,24,24,12,12]
const STAT_WEIGHT_INDEX = {
  offensiveAwareness: 13, ballControl: 26, dribbling: 39, tightPossession: 52,
  lowPass: 65, loftedPass: 78, finishing: 91, setPieceTaking: 104, curl: 117,
  heading: 130, defensiveAwareness: 143, ballWinning: 156, aggression: 169,
  kickingPower: 182, speed: 195, acceleration: 208, physicalContact: 221,
  balance: 234, jump: 247, gkAwareness: 260, gkReach: 273, gkCatching: 286,
  gkClearing: 299, gkReflexes: 312, stamina: 325, weakFoot: 338, trackingBack: 351
}

function overall({ position, height, weakFootAccuracy = 2, stats }) {
  const column = POSITION_COLUMN[POSITION_BY_APP_POSITION[String(position || '').toUpperCase().trim()] || String(position || '').toUpperCase().trim()]
  if (column === undefined) return 70
  const normalized = normalizeStatsToEfhub(stats)
  const contribution = (value) => value > 25 ? value - 25 : 0
  let score = WEIGHTS[column] * contribution((Number(height) || 170) - 111)
  for (const [stat, index] of Object.entries(STAT_WEIGHT_INDEX)) {
    const value = stat === 'weakFoot'
      ? Math.floor((59 * (Number(weakFootAccuracy) || 2)) / 3 + 40)
      : normalized[stat]
    score += WEIGHTS[index + column] * contribution(value)
  }
  return Math.max(Math.floor((score + 500) / 1000), 40)
}

function playProfileOverall(input) {
  const raw = overallDecimal(input)
  if (raw >= 100.75) return Math.round(raw)
  if (raw >= 100.05 && raw < 100.3) return 99
  return Math.max(40, Math.floor(raw))
}

function overallDecimal(input) {
  const value = overall(input)
  const column = POSITION_COLUMN[POSITION_BY_APP_POSITION[String(input.position || '').toUpperCase().trim()] || String(input.position || '').toUpperCase().trim()]
  if (column === undefined) return 70
  const normalized = normalizeStatsToEfhub(input.stats)
  const contribution = (item) => item > 25 ? item - 25 : 0
  let score = WEIGHTS[column] * contribution((Number(input.height) || 170) - 111)
  for (const [stat, index] of Object.entries(STAT_WEIGHT_INDEX)) {
    const value = stat === 'weakFoot'
      ? Math.floor((59 * (Number(input.weakFootAccuracy) || 2)) / 3 + 40)
      : normalized[stat]
    score += WEIGHTS[index + column] * contribution(value)
  }
  return Math.round(100 * Math.max((score + 500) / 1000, 40)) / 100
}

function baselineStats(player, catalogCard) {
  const catalog = catalogCard?.players_payload?.base_stats || catalogCard?.base_stats
  if (catalog && typeof catalog === 'object' && Object.keys(catalog).length) return catalog
  const before = player?.metadata?.build_coach?.before?.base_stats
  if (before && typeof before === 'object' && Object.keys(before).length) {
    const flat = normalizeStatsToEfhub(before)
    if (flat.defensiveAwareness <= 88 && flat.trackingBack <= 85) return before
  }
  const effective = player?.metadata?.build_coach?.after?.effective_base_stats
  if (effective && typeof effective === 'object' && Object.keys(effective).length) return {}
  if (player?.base_stats && typeof player.base_stats === 'object' &&
      !player?.development_points?.build_coach?.sliders) return player.base_stats
  return {}
}

function ratingCap(player, catalogCard) {
  for (const raw of [
    catalogCard?.overall_max_level, catalogCard?.players_payload?.overall_max_level,
    player?.metadata?.catalog_overall_max_level, player?.metadata?.overall_max_level,
    player?.extracted_data?.overall_max_level
  ]) {
    const value = Number(raw)
    if (Number.isFinite(value) && value >= 40 && value <= 120) return Math.floor(value)
  }
  return DEFAULT_OVERALL_CAP
}

function useFieldCoach(player, slotPosition, coach) {
  if (!coach) return false
  const explicit = player?.metadata?.field_coach_active ?? player?.metadata?.build_coach?.field_coach_active
  return typeof explicit === 'boolean' ? explicit : Boolean(slotPosition)
}

export function computePlayerFieldOverall({
  player,
  catalogCard = null,
  slotPosition = null,
  coach = null,
  teamStyle = null,
  sliders = null
} = {}) {
  if (!player) return null
  const rawPosition = String(slotPosition || player.slot_position || player.slotPosition ||
    player.position || player.original_positions?.[0]?.position || 'CMF').toUpperCase().trim()
  const targetPosition = POSITION_BY_APP_POSITION[rawPosition] || rawPosition || 'CMF'
  const base = normalizeStatsToEfhub(baselineStats(player, catalogCard))
  const caps = resolveStatCaps(catalogCard)
  const safeSliders = sliders ?? player.development_points?.build_coach?.sliders ??
    player.metadata?.build_coach?.sliders ?? {}
  const progressed = applyProgression(base, safeSliders, caps)
  const playStats = applyBoosters(progressed, playerBoosters(player), caps)
  const effectiveCoach = useFieldCoach(player, slotPosition, coach) ? coach : null
  const fieldStats = applyBoosters(
    applyCoach(progressed, effectiveCoach, effectiveCoach ? teamStyle : null, caps),
    fieldBoosters(player),
    caps
  )
  const weakFootAccuracy = Number(player.weak_foot_accuracy ?? player.weakFootAccuracy ??
    player.metadata?.weak_foot_accuracy ?? player.metadata?.weakFootAccuracy ??
    player.extracted_data?.weak_foot_accuracy ?? player.extracted_data?.weakFootAccuracy)
  const input = {
    position: targetPosition,
    height: Number(player.height || player.height_cm || catalogCard?.height || 170),
    weakFootAccuracy: Number.isFinite(weakFootAccuracy) ? weakFootAccuracy : 2
  }
  const cap = ratingCap(player, catalogCard)
  const clamp = (value) => Math.max(40, Math.min(cap, Math.floor(Number(value))))
  const progressionOverall = clamp(playProfileOverall({ ...input, stats: progressed }))
  const playOverall = clamp(playProfileOverall({ ...input, stats: playStats }))
  const fieldOverall = clamp(overall({ ...input, stats: fieldStats }))
  return {
    targetPosition,
    overallCap: cap,
    progressionOverall,
    playProfileOverall: playOverall,
    inGameOverall: playOverall,
    fieldOverall,
    afterOverall: clamp(Math.max(playOverall, fieldOverall))
  }
}
