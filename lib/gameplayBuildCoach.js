import {
  PROGRESSION_KEYS,
  PROGRESSION_SLIDERS,
  applyProgression,
  applyBoosters,
  applyCoachEffects,
  availableProgressionPoints,
  clampOverallRating,
  computeOverallRating,
  computeOverallRatingDecimal,
  computePlayProfileOverallRating,
  efhubStatsToPlayerBaseStats,
  normalizeEfhubPosition,
  normalizeStatsToEfhub,
  nextTickCost,
  resolveOverallRatingCap,
  resolveStatCaps,
  totalPointsUsed
} from './efootballBuildRules.js'
import { MAX_TACCE_PER_MACRO } from './efootballProgressionCost.js'
import { getPlayerBaselineStats, looksLikeInflatedPreProgressionBaseline } from './playerEffectiveStats.js'

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

export const STANDARD_PROGRESSION_LEVEL_CAP_FALLBACK = 30

const NON_PROGRESSION_CARD_TYPE_FRAGMENTS = [
  'trending',
  'potw',
  'player of the week',
  'players of the week',
  'otw',
  'one to watch',
  'card strike arena'
]

function isNonProgressionCardTypeValue(value) {
  const normalized = String(value || '').toLowerCase().trim()
  if (!normalized) return false
  return NON_PROGRESSION_CARD_TYPE_FRAGMENTS.some((fragment) => normalized.includes(fragment))
}

function getCatalogCardTypeLabel(catalogCard, player = null) {
  return (
    player?.metadata?.catalog_card_type ||
    player?.metadata?.card_category ||
    player?.card_type ||
    catalogCard?.card_type ||
    catalogCard?.card_category ||
    catalogCard?.players_payload?.card_type
  )
}

export function catalogHasBaseStats(catalogCard) {
  const baseStats = catalogCard?.base_stats || catalogCard?.players_payload?.base_stats
  return Boolean(baseStats && typeof baseStats === 'object' && Object.keys(baseStats).length > 0)
}

/** Carte che possono ricevere PT (esclusi solo POTW/Trending/OTW). */
export function catalogCardAllowsPtBuild(catalogCard, player = null) {
  if (isNonProgressionCardTypeValue(getCatalogCardTypeLabel(catalogCard, player))) return false
  if (catalogHasBaseStats(catalogCard)) return true
  const sourceId =
    catalogCard?.source_player_id ||
    player?.metadata?.catalog_source_player_id ||
    player?.metadata?.source_player_id
  return Boolean(sourceId)
}

/** True when EFHub live should fill missing cap and/or base stats. */
export function needsEfhubLevelCapEnrichment(player = {}, catalogCard = null) {
  const playerCaps = [
    player.level_cap,
    player.levelCap,
    player.extracted_data?.level_cap,
    player.metadata?.level_cap
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 1)
  if (playerCaps.length > 0 && catalogHasBaseStats(catalogCard)) return false

  if (!catalogCardAllowsPtBuild(catalogCard, player)) return false

  const catalogMax = Number(catalogCard?.max_level ?? catalogCard?.players_payload?.max_level)
  const hasCap = Number.isFinite(catalogMax) && catalogMax > 1
  if (hasCap && catalogHasBaseStats(catalogCard)) return false
  return true
}

function catalogBaseAndMaxStatsDiffer(catalogCard) {
  const baseStats = catalogCard?.base_stats || catalogCard?.players_payload?.base_stats
  const maxStats = catalogCard?.max_stats || catalogCard?.players_payload?.max_stats
  if (!baseStats || !maxStats || typeof baseStats !== 'object' || typeof maxStats !== 'object') return false
  return Object.keys(maxStats).some((key) => {
    const maxValue = Number(maxStats[key])
    const baseValue = Number(baseStats[key])
    return Number.isFinite(maxValue) && Number.isFinite(baseValue) && maxValue > baseValue
  })
}

export function catalogShowsProgression(catalogCard) {
  if (!catalogCard) return false
  const ovr1 = Number(catalogCard.overall_level_1 ?? catalogCard.players_payload?.overall_level_1)
  const ovrMax = Number(
    catalogCard.overall_max_level ??
    catalogCard.players_payload?.overall_max_level
  )
  if (Number.isFinite(ovr1) && Number.isFinite(ovrMax) && ovrMax > ovr1) return true
  const maxStats = catalogCard.max_stats || catalogCard.players_payload?.max_stats
  if (maxStats && typeof maxStats === 'object' && Object.keys(maxStats).length > 0) return true
  return catalogBaseAndMaxStatsDiffer(catalogCard)
}

/** Cap progressione dal catalogo (pesdb / EFHub), non dal profilo rosa salvato. */
export function resolveCatalogProgressionLevelCap(catalogCard = null) {
  if (!catalogCard) return null
  const caps = [
    catalogCard?.players_payload?.level_cap,
    catalogCard?.players_payload?.max_level,
    catalogCard?.level_cap,
    catalogCard?.max_level
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (caps.length === 0) return null
  return Math.floor(Math.max(...caps))
}

/** Solo level_cap espliciti sul giocatore (mai max_level: spesso OVR o valore obsoleto). */
function resolvePlayerProgressionLevelCap(player = {}) {
  const caps = [
    player.level_cap,
    player.levelCap,
    player.extracted_data?.level_cap,
    player.extracted_data?.levelCap,
    player.metadata?.level_cap,
    player.metadata?.levelCap
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 1)
  return caps.length > 0 ? Math.max(...caps) : null
}

/**
 * Livello massimo per PT crescita. Ignora catalog.max_level=1 quando la carta ha OVR max / max_stats
 * (es. EFHub initialLevelCap salvato per errore come max_level).
 * Il catalogo vince su level_cap salvati più bassi (es. 34 vs pesdb 35 → 68 PT in gioco).
 */
export function resolveProgressionLevelCap(player = {}, catalogCard = null) {
  const playerCapOne = [
    player.level_cap,
    player.levelCap,
    player.extracted_data?.level_cap,
    player.metadata?.level_cap
  ]
    .map((value) => Number(value))
    .some((value) => value === 1)

  if (playerCapOne && !catalogShowsProgression(catalogCard)) return 1

  const catalogCap = resolveCatalogProgressionLevelCap(catalogCard)
  const playerCap = resolvePlayerProgressionLevelCap(player)
  const candidates = []
  if (catalogCap != null && catalogCap > 1) candidates.push(catalogCap)
  if (playerCap != null) candidates.push(playerCap)

  if (candidates.length > 0) return Math.max(...candidates)

  if (catalogCap === 1 && catalogShowsProgression(catalogCard)) {
    return STANDARD_PROGRESSION_LEVEL_CAP_FALLBACK
  }
  if (catalogShowsProgression(catalogCard)) return STANDARD_PROGRESSION_LEVEL_CAP_FALLBACK
  if (catalogCardAllowsPtBuild(catalogCard, player)) return STANDARD_PROGRESSION_LEVEL_CAP_FALLBACK
  if (catalogCap != null) return Math.floor(catalogCap)
  return null
}

function getLevelCap(player = {}, catalogCard = null) {
  const cap = resolveProgressionLevelCap(player, catalogCard)
  return cap != null && cap > 1 ? cap : null
}

export function getBuildSourceStats(player = {}, catalogCard = null) {
  return getPlayerBaselineStats(player, catalogCard)
}

/** Nested `players.base_stats` from EFHUB baseline (pre-progression). */
export function nestedBaselineStatsFromGameplayPreview(preview) {
  if (!preview?.baseStats) return null
  return efhubStatsToPlayerBaseStats(normalizeStatsToEfhub(preview.baseStats))
}

/** Nested stats after PT + active booster (profilo carta Play). */
export function nestedEffectiveStatsFromGameplayPreview(preview) {
  if (!preview?.finalInGameStats) return null
  return efhubStatsToPlayerBaseStats(normalizeStatsToEfhub(preview.finalInGameStats))
}

/** Nested stats in campo: PT + booster in rosa + coach. */
export function nestedFieldStatsFromGameplayPreview(preview) {
  if (!preview?.finalFieldStats) return null
  return efhubStatsToPlayerBaseStats(normalizeStatsToEfhub(preview.finalFieldStats))
}

/** Catalog snapshot for client previews when Supabase row is not loaded (uses pre-build L1 baseline). */
export function catalogCardFromPlayerSnapshot(player = {}) {
  const before = player?.metadata?.build_coach?.before?.base_stats
  if (!before || typeof before !== 'object' || Object.keys(before).length === 0) return null
  return {
    base_stats: before,
    max_level: player.level_cap,
    overall_max_level:
      player.metadata?.catalog_overall_max_level ??
      player.metadata?.build_coach?.after?.overall_cap ??
      null
  }
}

function statCapsForBuild(catalogCard = null) {
  return resolveStatCaps(catalogCard)
}

function statCapsForProgression(catalogCard = null) {
  return Object.fromEntries(
    Object.entries(resolveStatCaps(catalogCard)).map(([stat, cap]) => [stat, Math.min(99, Number(cap) || 99)])
  )
}

/** Player clone for preview: booster attivo + lista disponibili (stesso input Play). */
export function buildPlayerForPlayProfilePreview(player = {}, { activeBoosterName = null, availableBoosters = null } = {}) {
  const boosters =
    Array.isArray(availableBoosters)
      ? availableBoosters
      : Array.isArray(player.available_boosters)
        ? player.available_boosters
        : []
  const active =
    activeBoosterName != null && String(activeBoosterName).trim()
      ? String(activeBoosterName).trim()
      : player.active_booster_name
  const beforeStats = player.metadata?.build_coach?.before?.base_stats
  const metadata =
    beforeStats && looksLikeInflatedPreProgressionBaseline(beforeStats)
      ? {
          ...(player.metadata && typeof player.metadata === 'object' ? player.metadata : {}),
          build_coach: {
            ...(typeof player.metadata?.build_coach === 'object' ? player.metadata.build_coach : {}),
            before: {
              ...(typeof player.metadata?.build_coach?.before === 'object' ? player.metadata.build_coach.before : {}),
              base_stats: undefined
            }
          }
        }
      : player.metadata
  return {
    ...player,
    metadata,
    available_boosters: boosters,
    active_booster_name: active || null
  }
}

function capBuildOveralls({
  progressionOverall,
  inGameOverall,
  progressionOverallDecimal,
  inGameOverallDecimal,
  catalogCard,
  player
}) {
  const cap = resolveOverallRatingCap({ catalogCard, player })
  const rawAfter = Math.max(progressionOverall, inGameOverall)
  const rawAfterDecimal = Math.max(progressionOverallDecimal, inGameOverallDecimal)
  return {
    overallCap: cap,
    progressionOverall: clampOverallRating(progressionOverall, cap),
    inGameOverall: clampOverallRating(inGameOverall, cap),
    afterOverall: clampOverallRating(rawAfter, cap),
    afterOverallDecimal: Math.min(rawAfterDecimal, cap),
    progressionOverallDecimal: Math.min(progressionOverallDecimal, cap),
    inGameOverallDecimal: Math.min(inGameOverallDecimal, cap)
  }
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
  // PT1–PT3 (gk1–gk3) non sono bloccati per ruolo: il cliente può impostarli liberamente;
  // l’ottimizzatore automatico (calculateGameplayBuild) non li spende sui non portieri.
  if (group === 'gk' && ['shooting', 'dribbling', 'defending'].includes(macroKey)) return -1000
  if (group === 'cb' && macroKey === 'shooting') return -3
  if (group === 'striker' && macroKey === 'defending') return -4
  return 0
}

function isMacroAllowedForGroup(group, macroKey) {
  if (group !== 'gk' && ['gk1', 'gk2', 'gk3'].includes(macroKey)) return false
  if (hardBlockScore(group, macroKey) <= -100) return false
  return true
}

/** OVR profilo carta (PT + booster attivo) usato per confrontare le build. */
function playProfileOverallFromSliders(sliders, baseStats, player, targetPosition, height, weakFootAccuracy, statCaps = {}) {
  const progressed = applyProgression(baseStats, sliders, statCaps)
  const inGame = applyInGameEffects(progressed, { player })
  return computePlayProfileOverallRating({
    position: targetPosition,
    height,
    weakFootAccuracy,
    stats: inGame
  })
}

function progressionStatGainFromTick(baseStats, sliders, key, statCaps = {}) {
  const before = applyProgression(baseStats, sliders, statCaps)
  const after = applyProgression(baseStats, { ...sliders, [key]: (sliders[key] || 0) + 1 }, statCaps)
  let gain = 0
  for (const stat of Object.keys(after)) {
    const delta = Number(after[stat] || 0) - Number(before[stat] || 0)
    if (delta > 0) gain += delta
  }
  return gain
}

/**
 * Spende i PT rimasti: prima OVR profilo carta, poi statistiche se l'OVR è piatto (es. 99).
 */
function spendLeftoverProgressionForOverall({
  sliders,
  spent,
  pointsAvailable,
  group,
  baseStats,
  player,
  targetPosition,
  height,
  weakFootAccuracy,
  statCaps = {}
}) {
  const out = { ...sliders }
  let used = spent
  const maxSteps = PROGRESSION_KEYS.length * MAX_TACCE_PER_MACRO

  for (let guard = 0; used < pointsAvailable && guard < maxSteps; guard++) {
    const currentOverall = playProfileOverallFromSliders(out, baseStats, player, targetPosition, height, weakFootAccuracy, statCaps)
    let best = null

    for (const key of PROGRESSION_KEYS) {
      if (out[key] >= MAX_TACCE_PER_MACRO) continue
      if (!isMacroAllowedForGroup(group, key)) continue
      const cost = nextTickCost(out, key)
      if (!cost || used + cost > pointsAvailable) continue

      const trial = { ...out, [key]: out[key] + 1 }
      const trialOverall = playProfileOverallFromSliders(trial, baseStats, player, targetPosition, height, weakFootAccuracy, statCaps)
      const ovrGain = trialOverall - currentOverall
      const statGain = ovrGain > 0 ? 0 : progressionStatGainFromTick(baseStats, out, key, statCaps)
      const gain = ovrGain > 0 ? ovrGain : statGain
      if (gain <= 0) continue

      const efficiency = gain / cost
      if (
        !best ||
        efficiency > best.efficiency ||
        (efficiency === best.efficiency && gain > best.gain)
      ) {
        best = { key, cost, gain, efficiency, ovrGain }
      }
    }

    if (!best) break
    out[best.key] += 1
    used += best.cost
  }

  return { sliders: sanitizeSliders(out), spent: used }
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

function normalizeBoosterName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizeBoosterNameList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeBoosterName(typeof entry === 'string' ? entry : entry?.name))
      .filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) return [normalizeBoosterName(value)]
  return null
}

function getAvailableBoosterList(player = {}) {
  return Array.isArray(player.available_boosters)
    ? player.available_boosters
    : Array.isArray(player.boosters)
      ? player.boosters
      : []
}

function getExplicitFieldBoosterNames(player = {}) {
  const metadata = player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const configured =
    normalizeBoosterNameList(player.field_active_booster_names) ??
    normalizeBoosterNameList(metadata.field_active_booster_names) ??
    normalizeBoosterNameList(metadata.active_field_booster_names) ??
    normalizeBoosterNameList(metadata.build_coach?.field_active_booster_names)
  if (configured) return configured

  const activeEntries = getAvailableBoosterList(player)
    .filter((entry) => entry?.field_active === true || entry?.active === true)
    .map((entry) => normalizeBoosterName(entry?.name))
    .filter(Boolean)
  return activeEntries.length > 0 ? activeEntries : null
}

/** Booster equipaggiato — profilo carta Play (uno solo, come schermata carta). */
export function getPlayerBoosters(player = {}) {
  const list = getAvailableBoosterList(player)
  const activeName = normalizeBoosterName(player.active_booster_name)
  if (!activeName || list.length === 0) return []
  return list.filter((entry) => normalizeBoosterName(entry?.name) === activeName)
}

/** Booster in campo: solo quelli esplicitamente attivi; fallback al booster equipaggiato. */
export function getFieldBoosters(player = {}) {
  const list = getAvailableBoosterList(player).filter((entry) => String(entry?.name || '').trim())
  const fieldNames = getExplicitFieldBoosterNames(player)
  if (Array.isArray(fieldNames)) {
    return list.filter((entry) => fieldNames.includes(normalizeBoosterName(entry?.name)))
  }
  return getPlayerBoosters(player)
}

/**
 * Statistiche profilo carta Play: PT + booster equipaggiato (no coach).
 */
export function applyInGameEffects(stats, { player, statCaps = null, catalogCard = null } = {}) {
  const caps = statCaps || statCapsForBuild(catalogCard)
  return applyBoosters(stats, getPlayerBoosters(player), caps)
}

/**
 * Statistiche/OVR in campo: PT + booster attivi + allenatore e stile squadra.
 */
export function applyFieldEffects(stats, { player, coach = null, teamStyle = null, statCaps = null, catalogCard = null } = {}) {
  const caps = statCaps || statCapsForBuild(catalogCard)
  const withCoach = applyCoachEffects(stats, coach, teamStyle, caps)
  return applyBoosters(withCoach, getFieldBoosters(player), caps)
}

function hasCoachEffects(coach = null) {
  return Boolean(
    coach &&
    (
      (coach.playing_style_competence && Object.keys(coach.playing_style_competence || {}).length > 0) ||
      (Array.isArray(coach.stat_boosters) && coach.stat_boosters.length > 0)
    )
  )
}

function shouldUseFieldCoach(player = {}, { slotPosition = null, coach = null } = {}) {
  if (!coach) return false
  const explicit = player?.metadata?.field_coach_active ?? player?.metadata?.build_coach?.field_coach_active
  if (typeof explicit === 'boolean') return explicit
  return Boolean(slotPosition)
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

export function sanitizeSliders(sliders) {
  return PROGRESSION_KEYS.reduce((acc, key) => {
    const value = Math.max(0, Math.min(MAX_TACCE_PER_MACRO, Math.floor(Number(sliders?.[key] || 0))))
    acc[key] = value
    return acc
  }, {})
}

/**
 * Macro bloccate per ruolo nel gioco (es. tiro/difesa su portiere). PT1–PT3 restano sempre modificabili.
 */
export function isBuildMacroBlockedForPlayer(player, key, slotPosition = null, catalogCard = null) {
  if (!player || !key) return false
  const targetPosition = inferBuildTargetPosition(player, slotPosition)
  const group = getGroup(targetPosition)
  return hardBlockScore(group, key) <= -100
}

/**
 * +1 / -1 tacca su una macro con costi PT e blocchi ruolo (stessa logica della build automatica).
 * @returns {Record<string, number>|null} nuovi sliders o null se mossa illegale
 */
export function tryApplyBuildSliderDelta({
  player,
  sliders,
  key,
  delta = 0,
  slotPosition = null,
  catalogCard = null
} = {}) {
  if (!player || !key) return null
  const base = sanitizeSliders(sliders)
  const d = Math.sign(Number(delta) || 0)
  if (!d) return base

  if (d === -1) {
    const v = base[key] || 0
    if (v <= 0) return null
    return sanitizeSliders({ ...base, [key]: v - 1 })
  }

  const targetPosition = inferBuildTargetPosition(player, slotPosition)
  const group = getGroup(targetPosition)
  if (hardBlockScore(group, key) <= -100) return null
  if ((base[key] || 0) >= MAX_TACCE_PER_MACRO) return null

  const cost = nextTickCost(base, key)
  if (cost == null) return null

  const levelCap = getLevelCap(player, catalogCard)
  const pointsAvailable = availableProgressionPoints(levelCap)
  if (pointsAvailable <= 0) return null

  const spent = totalPointsUsed(base)
  if (spent + cost > pointsAvailable) return null

  return sanitizeSliders({ ...base, [key]: (base[key] || 0) + 1 })
}

/**
 * Imposta le tacche di una macro (es. da range); riduce finché rientra nel budget PT.
 */
export function setBuildSliderTicks({
  player,
  sliders,
  key,
  targetTicks = 0,
  slotPosition = null,
  catalogCard = null
} = {}) {
  if (!player || !key) return sanitizeSliders(sliders)
  const base = sanitizeSliders(sliders)
  const targetPosition = inferBuildTargetPosition(player, slotPosition)
  const group = getGroup(targetPosition)
  if (hardBlockScore(group, key) <= -100) {
    return sanitizeSliders({ ...base, [key]: 0 })
  }

  const levelCap = getLevelCap(player, catalogCard)
  const pointsAvailable = availableProgressionPoints(levelCap)
  if (pointsAvailable <= 0) return base

  let t = Math.max(0, Math.min(MAX_TACCE_PER_MACRO, Math.floor(Number(targetTicks) || 0)))
  let trial = { ...base, [key]: t }
  let used = totalPointsUsed(sanitizeSliders(trial))
  while (used > pointsAvailable && t > 0) {
    t -= 1
    trial = { ...base, [key]: t }
    used = totalPointsUsed(sanitizeSliders(trial))
  }
  return sanitizeSliders(trial)
}

/**
 * Anteprima statistiche e OVR da slider macro: baseline catalogo L1 + PT + booster attivo (se impostato).
 */
export function previewGameplayBuildFromSliders({
  player,
  sliders,
  slotPosition = null,
  catalogCard = null,
  coach = null,
  teamStyle = null
} = {}) {
  if (!player) return { ok: false, error: 'missing_player' }
  const targetPosition = inferBuildTargetPosition(player, slotPosition)
  const levelCap = getLevelCap(player, catalogCard)
  const sourceBaseStats = getBuildSourceStats(player, catalogCard)
  const baseStats = normalizeStatsToEfhub(sourceBaseStats)
  const height = Number(player.height || player.height_cm || catalogCard?.height || 170)
  const weakFootAccuracy = getWeakFootAccuracy(player)
  const pointsAvailable = availableProgressionPoints(levelCap)
  const safeSliders = sanitizeSliders(sliders)
  const pointsUsed = totalPointsUsed(safeSliders)
  const statCaps = statCapsForBuild(catalogCard)
  const progressionStatCaps = statCapsForProgression(catalogCard)

  if (!pointsAvailable || pointsAvailable <= 0) {
    return {
      ok: false,
      error: 'missing_level_cap',
      targetPosition,
      levelCap,
      pointsAvailable: 0,
      pointsUsed,
      sliders: safeSliders,
      baseStats,
      finalEfhubStats: baseStats,
      finalBaseStats: efhubStatsToPlayerBaseStats(baseStats),
      afterOverall: computeOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: baseStats }),
      overBudget: pointsUsed > 0
    }
  }

  const finalEfhubStats = applyProgression(baseStats, safeSliders, progressionStatCaps)
  const finalBaseStats = efhubStatsToPlayerBaseStats(finalEfhubStats)
  const finalInGameStats = applyInGameEffects(finalEfhubStats, { player, statCaps, catalogCard })
  const effectiveCoach = shouldUseFieldCoach(player, { slotPosition, coach }) ? coach : null
  const effectiveTeamStyle = effectiveCoach ? teamStyle : null
  const finalFieldStats =
    effectiveCoach || effectiveTeamStyle || getFieldBoosters(player).length > 0
      ? applyFieldEffects(finalEfhubStats, { player, coach: effectiveCoach, teamStyle: effectiveTeamStyle, statCaps, catalogCard })
      : finalInGameStats
  const boostersConsidered = getPlayerBoosters(player).length > 0
  const fieldBoostersConsidered = getFieldBoosters(player).length > 0
  const coachConsidered = hasCoachEffects(effectiveCoach)
  const progressionOverall = computePlayProfileOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: finalEfhubStats })
  const profileOverall = computePlayProfileOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: finalInGameStats })
  const fieldOverallRaw = computeOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: finalFieldStats })
  const progressionOverallDecimal = computeOverallRatingDecimal({ position: targetPosition, height, weakFootAccuracy, stats: finalEfhubStats })
  const profileOverallDecimal = computeOverallRatingDecimal({ position: targetPosition, height, weakFootAccuracy, stats: finalInGameStats })
  const fieldOverallDecimal = computeOverallRatingDecimal({ position: targetPosition, height, weakFootAccuracy, stats: finalFieldStats })
  const capped = capBuildOveralls({
    progressionOverall,
    inGameOverall: profileOverall,
    progressionOverallDecimal,
    inGameOverallDecimal: profileOverallDecimal,
    catalogCard,
    player
  })
  const fieldCap = capped.overallCap
  const fieldOverall = clampOverallRating(fieldOverallRaw, fieldCap)
  const overBudget = pointsUsed > pointsAvailable
  const playProfileStatsNested = nestedEffectiveStatsFromGameplayPreview({
    finalInGameStats: finalInGameStats
  })
  const fieldStatsNested = nestedEffectiveStatsFromGameplayPreview({
    finalInGameStats: finalFieldStats
  })

  return {
    ok: !overBudget,
    targetPosition,
    levelCap,
    pointsAvailable,
    pointsUsed,
    sliders: safeSliders,
    baseStats,
    finalEfhubStats,
    finalBaseStats,
    finalInGameStats,
    finalFieldStats,
    playProfileStatsNested,
    fieldStatsNested,
    boostersConsidered,
    fieldBoostersConsidered,
    coachConsidered,
    overallCap: capped.overallCap,
    progressionOverall: capped.progressionOverall,
    inGameOverall: capped.inGameOverall,
    afterOverall: capped.afterOverall,
    afterOverallDecimal: capped.afterOverallDecimal,
    playProfileOverall: capped.afterOverall,
    fieldOverall,
    fieldOverallDecimal: Math.min(fieldOverallDecimal, fieldCap),
    overBudget
  }
}

/** Parallel IT/EN copy for saved metadata and API consumers. */
function buildReasonsBilingual({ group, teamStyle, sliders, player }) {
  const top = Object.entries(sliders)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => key)

  const pairs = []
  if (top.includes('passing')) {
    pairs.push([
      'Più punti in passaggio: servi meglio e costruisci con più tranquillità.',
      'More passing points: you link play and serve teammates better.'
    ])
  }
  if (top.includes('dribbling')) {
    pairs.push([
      'Più punti in dribbling: tieni palla con più sicurezza quando attacchi.',
      'More dribbling points: you keep the ball with more confidence in attack.'
    ])
  }
  if (top.includes('dexterity')) {
    pairs.push([
      'Più destrezza: ti stacchi prima e sei più reattivo negli inserimenti.',
      'More dexterity: you break away earlier and move sharper on runs.'
    ])
  }
  if (top.includes('lowerBodyStrength')) {
    pairs.push([
      'Più gambe: ritmo e ripartenze più solidi per tutta la partita.',
      'More leg strength: steadier pace and transitions for the full match.'
    ])
  }
  if (top.includes('shooting')) {
    pairs.push([
      'Più tiro: sei più pericoloso quando arrivi in area.',
      'More shooting: you are more dangerous in front of goal.'
    ])
  }
  if (top.includes('defending')) {
    pairs.push([
      'Più difesa: duelli e recuperi più convincenti.',
      'More defending: sturdier duels and ball recovery.'
    ])
  }
  if (top.includes('aerialStrength')) {
    pairs.push([
      'Più forza in aria: vinci duelli alti e secondi palloni.',
      'More aerial strength: you win high balls and second phases.'
    ])
  }
  if (group === 'gk') {
    pairs.push([
      'Punti scelti per darti più sicurezza tra i pali.',
      'Points chosen to make you feel safer in goal.'
    ])
  }
  if (teamStyle) {
    pairs.push([
      `Pensata per come giochi con ${teamStyle}.`,
      `Built for how you play with ${teamStyle}.`
    ])
  }

  const sliced = pairs.slice(0, 4)
  return {
    it: sliced.map(([it]) => it),
    en: sliced.map(([, en]) => en)
  }
}

export function calculateGameplayBuild({ player, roster = [], teamStyle = null, slotPosition = null, catalogCard = null, coach = null } = {}) {
  if (!player) return { ok: false, error: 'missing_player' }
  const targetPosition = inferBuildTargetPosition(player, slotPosition)
  const levelCap = getLevelCap(player, catalogCard)
  const sourceBaseStats = getBuildSourceStats(player, catalogCard)
  const baseStats = normalizeStatsToEfhub(sourceBaseStats)
  const height = Number(player.height || player.height_cm || catalogCard?.height || 170)
  const weakFootAccuracy = getWeakFootAccuracy(player)
  const pointsAvailable = availableProgressionPoints(levelCap)
  const statCaps = statCapsForBuild(catalogCard)
  const progressionStatCaps = statCapsForProgression(catalogCard)
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
      if (group !== 'gk' && ['gk1', 'gk2', 'gk3'].includes(key)) continue
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
    currentStats = applyProgression(baseStats, sliders, progressionStatCaps)
  }

  // Spend remaining points only on legal positive-priority macros, keeping gameplay-safe blocks.
  for (let guard = 0; spent < pointsAvailable && guard < maxSteps; guard++) {
    const candidates = PROGRESSION_KEYS
      .filter((key) => sliders[key] < MAX_TACCE_PER_MACRO)
      .filter((key) => isMacroAllowedForGroup(group, key))
      .map((key) => ({ key, cost: nextTickCost(sliders, key), value: (weights[key] || 0) + hardBlockScore(group, key) - sliders[key] * 0.12 }))
      .filter((entry) => entry.cost && spent + entry.cost <= pointsAvailable && entry.value > 0)
      .sort((a, b) => (b.value / b.cost) - (a.value / a.cost))
    if (candidates.length === 0) break
    const selected = candidates[0]
    sliders[selected.key] += 1
    spent += selected.cost
  }

  const leftoverSpend = spendLeftoverProgressionForOverall({
    sliders,
    spent,
    pointsAvailable,
    group,
    baseStats,
    player,
    targetPosition,
    height,
    weakFootAccuracy,
    statCaps: progressionStatCaps
  })
  Object.assign(sliders, leftoverSpend.sliders)
  spent = leftoverSpend.spent

  const finalStats = applyProgression(baseStats, sliders, progressionStatCaps)
  const beforeOverall = computeOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: baseStats })
  const finalInGameStats = applyInGameEffects(finalStats, { player, statCaps, catalogCard })
  const effectiveCoach = shouldUseFieldCoach(player, { slotPosition, coach }) ? coach : null
  const effectiveTeamStyle = effectiveCoach ? teamStyle : null
  const fieldBoostersConsidered = getFieldBoosters(player).length > 0
  const finalFieldStats =
    effectiveCoach || effectiveTeamStyle || fieldBoostersConsidered
      ? applyFieldEffects(finalStats, { player, coach: effectiveCoach, teamStyle: effectiveTeamStyle, statCaps, catalogCard })
      : finalInGameStats
  const boostersConsidered = getPlayerBoosters(player).length > 0
  const coachConsidered = hasCoachEffects(effectiveCoach)
  const progressionOverall = computePlayProfileOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: finalStats })
  const progressionOverallDecimal = computeOverallRatingDecimal({ position: targetPosition, height, weakFootAccuracy, stats: finalStats })
  const inGameOverall = computePlayProfileOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: finalInGameStats })
  const inGameOverallDecimal = computeOverallRatingDecimal({ position: targetPosition, height, weakFootAccuracy, stats: finalInGameStats })
  const fieldOverallRaw = computeOverallRating({ position: targetPosition, height, weakFootAccuracy, stats: finalFieldStats })
  const fieldOverallDecimal = computeOverallRatingDecimal({ position: targetPosition, height, weakFootAccuracy, stats: finalFieldStats })
  const capped = capBuildOveralls({
    progressionOverall,
    inGameOverall,
    progressionOverallDecimal,
    inGameOverallDecimal,
    catalogCard,
    player
  })
  const fieldCap = capped.overallCap
  const fieldOverall = clampOverallRating(fieldOverallRaw, fieldCap)
  const safeSliders = sanitizeSliders(sliders)
  const confidence = Math.max(0.55, Math.min(0.96, 0.96 - estimatedFields.length * 0.12))
  const playProfileStatsNested = nestedEffectiveStatsFromGameplayPreview({ finalInGameStats })
  const fieldStatsNested = nestedFieldStatsFromGameplayPreview({ finalFieldStats })

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
    finalInGameStats,
    finalFieldStats,
    finalBaseStats: efhubStatsToPlayerBaseStats(finalStats),
    playProfileStatsNested,
    fieldStatsNested,
    beforeOverall,
    overallCap: capped.overallCap,
    afterOverall: capped.afterOverall,
    afterOverallDecimal: capped.afterOverallDecimal,
    progressionOverall: capped.progressionOverall,
    progressionOverallDecimal: capped.progressionOverallDecimal,
    inGameOverall: capped.inGameOverall,
    inGameOverallDecimal: capped.inGameOverallDecimal,
    playProfileOverall: capped.inGameOverall,
    fieldOverall,
    fieldOverallDecimal: Math.min(fieldOverallDecimal, fieldCap),
    boostersConsidered,
    fieldBoostersConsidered,
    coachConsidered,
    estimatedFields,
    confidence,
    reasons: buildReasonsBilingual({ group, teamStyle, sliders: safeSliders, player }),
    warnings:
      estimatedFields.length > 0
        ? {
            it: ['Alcuni dati sono stati stimati o recuperati da fallback.'],
            en: ['Some values were estimated or recovered from fallbacks.']
          }
        : { it: [], en: [] }
  }
}

/**
 * @param {{ it?: string[], en?: string[] } | string[] | null | undefined} bundle
 * @param {'it'|'en'} lang
 * @returns {string[]}
 */
export function pickBilingualList(bundle, lang = 'it') {
  if (!bundle) return []
  const code = lang === 'en' ? 'en' : 'it'
  if (
    typeof bundle === 'object' &&
    !Array.isArray(bundle) &&
    Array.isArray(bundle.it) &&
    Array.isArray(bundle.en)
  ) {
    return bundle[code]
  }
  if (Array.isArray(bundle)) return bundle
  return []
}

/** @deprecated Usa getPlayerDisplayOverall da playProfileDisplay.js */
export { getPlayerDisplayOverall as resolvePlayProfileOverallForPlayer } from './playProfileDisplay.js'
