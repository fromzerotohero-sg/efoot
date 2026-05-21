import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getSkillDisplayLabel } from '@/lib/playerSkillLabels.js'
import { CARD_ADVISOR_SELECT, searchCardAdvisorCardsByName } from '@/lib/cardAdvisorCardsLookup.js'
import { fetchEfhubCardDetail } from '@/lib/efhubPlayerDetail.js'
import { getPlayerDisplayStats } from '@/lib/playerEffectiveStats.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POSITION_GROUPS = {
  gk: ['PT'],
  def: ['DC', 'TD', 'TS'],
  mid: ['MED', 'CC', 'TRQ', 'CLS', 'CLD'],
  att: ['P', 'SP', 'ESA', 'EDA']
}

function roleFamily(position = '') {
  if (POSITION_GROUPS.gk.includes(position)) return 'gk'
  if (POSITION_GROUPS.def.includes(position)) return 'def'
  if (POSITION_GROUPS.mid.includes(position)) return 'mid'
  return 'att'
}

const TEAM_STYLE_LABELS = {
  possesso: { it: 'Possesso palla', en: 'Possession' },
  possession: { it: 'Possesso palla', en: 'Possession' },
  contropiede_veloce: { it: 'Contropiede veloce', en: 'Quick Counter' },
  quick_counter: { it: 'Contropiede veloce', en: 'Quick Counter' },
  contrattacco: { it: 'Contrattacco', en: 'Long Ball Counter' },
  long_ball_counter: { it: 'Contrattacco', en: 'Long Ball Counter' },
  passaggio_lungo: { it: 'Passaggio lungo', en: 'Long Ball' },
  long_ball: { it: 'Passaggio lungo', en: 'Long Ball' },
  vie_laterali: { it: 'Vie laterali', en: 'Out Wide' },
  out_wide: { it: 'Vie laterali', en: 'Out Wide' }
}

function toAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeCard(raw = {}) {
  return {
    id: String(raw.id || raw.sourcePlayerId || ''),
    name: String(raw.name || '').trim(),
    position: String(raw.position || '').trim(),
    overall: Number(raw.overall) || null,
    category: String(raw.category || '').trim(),
    style: String(raw.style || '').trim(),
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    height: Number(raw.height) || null,
    weight: Number(raw.weight) || null,
    imageUrl: String(raw.imageUrl || '').trim(),
    sourcePlayerId: String(raw.sourcePlayerId || '').trim(),
    source: String(raw.source || '').trim()
  }
}

function buildUserId(userData, admin) {
  return async function resolve() {
    let userId = userData.user.id
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile, error } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .maybeSingle()
      if (error) {
        console.warn('[card-advisor-lab:evaluate] user profile lookup failed:', error.message || error)
      }
      userId = existingProfile?.user_id || null
    }
    return userId
  }
}

async function safeSupabaseQuery(promise, fallback, label) {
  try {
    const result = await promise
    if (result?.error) {
      console.warn(`[card-advisor-lab:evaluate] ${label} unavailable:`, result.error.message || result.error)
      return fallback
    }
    return result?.data ?? fallback
  } catch (error) {
    console.warn(`[card-advisor-lab:evaluate] ${label} failed:`, error?.message || error)
    return fallback
  }
}

function styleName(player, stylesLookup) {
  return (player?.playing_style_id && stylesLookup[player.playing_style_id]) || player?.role || ''
}

function positionLabel(position = '', lang = 'it') {
  const labels = {
    PT: { it: 'portiere', en: 'goalkeeper' },
    DC: { it: 'difensore centrale', en: 'centre-back' },
    TD: { it: 'terzino destro', en: 'right-back' },
    TS: { it: 'terzino sinistro', en: 'left-back' },
    MED: { it: 'mediano', en: 'defensive midfielder' },
    CC: { it: 'centrocampista', en: 'central midfielder' },
    TRQ: { it: 'trequartista', en: 'attacking midfielder' },
    CLS: { it: 'esterno sinistro', en: 'left midfielder' },
    CLD: { it: 'esterno destro', en: 'right midfielder' },
    P: { it: 'punta', en: 'striker' },
    SP: { it: 'seconda punta', en: 'second striker' },
    ESA: { it: 'ala sinistra', en: 'left winger' },
    EDA: { it: 'ala destra', en: 'right winger' }
  }
  return labels[position]?.[lang === 'en' ? 'en' : 'it'] || position
}

function sanitizeIlike(value = '') {
  return String(value).replace(/[%_]/g, '').trim()
}

const EFHUB_STYLE_LABELS = {
  destroyer: { it: 'Distruttore', en: 'Destroyer' },
  buildUp: { it: 'Sviluppo', en: 'Build Up' },
  extraFrontman: { it: 'Difensore offensivo', en: 'Extra Frontman' },
  offensiveFullBack: { it: 'Terzino offensivo', en: 'Offensive Full-back' },
  defensiveFullBack: { it: 'Terzino difensivo', en: 'Defensive Full-back' },
  fullBackFinisher: { it: 'Terzino finalizzatore', en: 'Full-back Finisher' },
  anchorMan: { it: 'Collante', en: 'Anchor Man' },
  boxToBox: { it: 'Box-to-Box', en: 'Box-to-Box' },
  orchestrator: { it: 'Regista', en: 'Orchestrator' },
  holePlayer: { it: 'Giocatore chiave', en: 'Hole Player' },
  creativePlaymaker: { it: 'Regista creativo', en: 'Creative Playmaker' },
  goalPoacher: { it: 'Opportunista', en: 'Goal Poacher' },
  foxInTheBox: { it: 'Rapace d’area', en: 'Fox in the Box' },
  deepLyingForward: { it: 'Fulcro di gioco', en: 'Deep-Lying Forward' },
  roamingFlank: { it: 'Taglio al centro', en: 'Roaming Flank' }
}

function humanizeCamelCase(value = '') {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function labelFromMap(map, value, lang) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const normalized = raw.replace(/\s+/g, '')
  const asciiKey = toAscii(raw).replace(/\s+/g, '')
  const entry = map[raw] ||
    map[normalized] ||
    Object.entries(map).find(([key]) => key.toLowerCase() === normalized.toLowerCase() || key.toLowerCase() === asciiKey)?.[1]
  if (entry) return lang === 'en' ? entry.en : entry.it
  return humanizeCamelCase(raw)
}

function styleLabel(value, lang) {
  return labelFromMap(EFHUB_STYLE_LABELS, value, lang)
}

function skillLabel(value, lang) {
  return getSkillDisplayLabel(value, lang)
}

function teamStyleLabel(value, lang) {
  return labelFromMap(TEAM_STYLE_LABELS, value, lang)
}

function collectNumbers(input, bucket = {}, path = '') {
  if (input == null) return bucket
  if (typeof input === 'number' && Number.isFinite(input)) {
    const key = toAscii(path || 'value')
    bucket[key] = input
    return bucket
  }
  if (Array.isArray(input)) {
    input.forEach((entry, index) => collectNumbers(entry, bucket, `${path}_${index}`))
    return bucket
  }
  if (typeof input === 'object') {
    Object.entries(input).forEach(([key, value]) => {
      collectNumbers(value, bucket, path ? `${path}_${key}` : key)
    })
  }
  return bucket
}

function scoreByKeywords(numericMap, keywords) {
  const values = Object.entries(numericMap)
    .filter(([key]) => keywords.some(keyword => key.includes(keyword)))
    .map(([, value]) => Number(value))
    .filter(Number.isFinite)
  if (values.length === 0) return 0
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  return Math.round(avg)
}

function signalsFromStats(stats) {
  const statMap = collectNumbers(stats)
  return {
    pace: scoreByKeywords(statMap, ['speed', 'accel', 'pace']),
    pass: scoreByKeywords(statMap, ['pass', 'cross', 'curl']),
    defend: scoreByKeywords(statMap, ['defen', 'tackl', 'intercept', 'aggression']),
    finish: scoreByKeywords(statMap, ['finish', 'kicking', 'shot', 'offens', 'heading']),
    physical: scoreByKeywords(statMap, ['stamina', 'phys', 'balance', 'jump', 'strength']),
    gk: scoreByKeywords(statMap, ['gk', 'keeper', 'saving', 'catch']),
    aerial: scoreByKeywords(statMap, ['jump', 'heading', 'aerial'])
  }
}

/** OVR pack (base) → stima interna del tetto buildato per confronto equo con rosa. */
function estimateCardCeilingOverall(card, catalogCard) {
  const fromCatalog = Number(
    catalogCard?.overall_max_level ??
    catalogCard?.players_payload?.overall_max_level
  )
  if (Number.isFinite(fromCatalog) && fromCatalog > 0) return Math.min(99, Math.round(fromCatalog))

  const base = Number(card.overall) || Number(catalogCard?.overall_display) || Number(catalogCard?.overall_level_1) || 0
  if (!base) return 0

  const baseStats = catalogCard?.base_stats
  const maxStats = catalogCard?.max_stats
  if (maxStats && typeof maxStats === 'object' && Object.keys(maxStats).length > 0) {
    const baseSignals = baseStats ? signalsFromStats(baseStats) : null
    const maxSignals = signalsFromStats(maxStats)
    const maxTech = Math.max(maxSignals.pace, maxSignals.pass, maxSignals.defend, maxSignals.finish, maxSignals.gk)
    const baseTech = baseSignals
      ? Math.max(baseSignals.pace, baseSignals.pass, baseSignals.defend, baseSignals.finish, baseSignals.gk)
      : 0
    if (maxTech > baseTech && baseTech > 0) {
      return Math.min(99, Math.round(base + (maxTech - baseTech) * 0.38))
    }
  }

  const category = toAscii(`${card.category || ''} ${catalogCard?.card_type || ''}`)
  const uplift = category.includes('big time') || category.includes('show time')
    ? 8
    : category.includes('epic')
      ? 7
      : category.includes('standout') || category.includes('highlight')
        ? 6
        : 5
  return Math.min(99, base + uplift)
}

function isPremiumAdvisorCard(card = {}, catalogCard = null) {
  const text = toAscii([
    card.category,
    card.cardType,
    card.card_type,
    catalogCard?.category,
    catalogCard?.card_type,
    catalogCard?.card_category
  ].filter(Boolean).join(' '))
  return /(epic|legendary|big time|show time|showtime)/.test(text)
}

/** Stat di confronto rosa: base salvata, non profilo già buildato in campo. */
function rosterComparisonSignals(player) {
  const base = player?.base_stats
  if (base && typeof base === 'object' && Object.keys(base).length > 0) {
    return signalsFromStats(base)
  }
  const built = getPlayerDisplayStats(player) || {}
  return signalsFromStats(built)
}

/** OVR rosa normalizzato per confronto con tetto carta (stima uplift da livello). */
function rosterComparisonOverall(player) {
  const base = player?.base_stats
  if (base && typeof base === 'object') {
    const fromBase = Number(base.overall ?? base.overall_rating ?? base.OVR ?? base.rating)
    if (Number.isFinite(fromBase) && fromBase > 0) return Math.round(fromBase)
  }

  const built = Number(player?.overall_rating)
  if (!Number.isFinite(built) || built <= 0) return null

  const level = Number(player?.current_level)
  const cap = Number(player?.level_cap)
  if (Number.isFinite(level) && level > 1) {
    const progress = Number.isFinite(cap) && cap > 1
      ? clamp((level - 1) / Math.max(1, cap - 1), 0, 1)
      : 0.65
    const uplift = Math.round(4 + progress * 9)
    return Math.max(1, built - uplift)
  }
  return Math.round(built)
}

function profileStrengthScore(signals, position) {
  const family = roleFamily(position)
  if (family === 'gk') return Math.max(signals.gk || 0, signals.pass || 0, signals.physical || 0)
  if (family === 'def') return Math.max(signals.defend || 0, signals.pace || 0, signals.physical || 0, signals.aerial || 0)
  if (family === 'mid') return Math.max(signals.pass || 0, signals.defend || 0, signals.pace || 0, signals.physical || 0)
  return Math.max(signals.finish || 0, signals.pace || 0, signals.pass || 0, signals.aerial || 0)
}

function positiveStatEdgeCount(position, technical, alternative) {
  if (!alternative?.signals) return 0
  return roleRelevantStatEdges(position, technical, alternative, 'it')
    .filter(([, value]) => Number.isFinite(value) && value >= 4)
    .length
}

/** La carta (a potenziale) può migliorare l'alternativa rosa sullo stesso ruolo. */
function cardBeatsAlternative(card, technical, alternative) {
  if (!alternative) return true

  const cardOvr = technical.comparisonOverall || technical.cardOverall
  const altOvr = alternative.comparisonOverall ?? Number(alternative.overall) ?? 0
  if (cardOvr && altOvr && cardOvr >= altOvr + 2) return true

  const cardProfile = profileStrengthScore(technical, card.position)
  const altProfile = profileStrengthScore(alternative.signals || {}, card.position)
  if (cardProfile >= altProfile + 5) return true

  const edges = positiveStatEdgeCount(card.position, technical, alternative)
  if (edges >= 2) return true
  if (edges >= 1 && cardOvr && altOvr && cardOvr >= altOvr - 1) return true

  const cardSkills = Array.isArray(technical.mergedSkills) ? technical.mergedSkills.length : 0
  const altSkills = Array.isArray(alternative.skills) ? alternative.skills.length : 0
  if (cardSkills >= altSkills + 2 && cardOvr && altOvr && cardOvr >= altOvr) return true

  return false
}

function classifyRosterConflict({ card, technical, sameRole, hasFormation }) {
  const bestAlternative = sameRole[0] || null
  const hasCoveredRole = sameRole.length > 0
  const upgradeEdge = hasCoveredRole && cardBeatsAlternative(card, technical, bestAlternative)
  const deepBench = sameRole.length >= 3
  const duplicate = hasCoveredRole && deepBench && !upgradeEdge
  const starterBlocked = hasFormation
    && sameRole.some(player => {
      const slot = Number(player.slotIndex)
      return Number.isFinite(slot) && slot >= 0 && slot <= 10
    })
    && !upgradeEdge

  return {
    bestAlternative,
    roleGap: sameRole.length === 0,
    hasCoveredRole,
    duplicate,
    starterBlocked,
    upgradeEdge,
    rosterCrowded: sameRole.length >= 2
  }
}

async function fetchCardAdvisorCandidates(admin, card) {
  const tasks = []
  if (card.sourcePlayerId) {
    tasks.push(
      admin
        .from('card_advisor_cards')
        .select(CARD_ADVISOR_SELECT)
        .eq('source', card.source || 'efhub')
        .eq('source_player_id', card.sourcePlayerId)
        .eq('is_active', true)
        .limit(8)
    )
  }
  const safeName = sanitizeIlike(card.name)
  if (safeName) {
    tasks.push(
      searchCardAdvisorCardsByName(admin, {
        name: card.name,
        source: card.source || 'efhub',
        position: card.position,
        limit: 12
      }).then(({ rows }) => ({ data: rows, error: null }))
    )
  }
  if (tasks.length === 0) return []
  const results = await Promise.allSettled(tasks)
  const merged = []
  results.forEach(result => {
    if (result.status !== 'fulfilled' || result.value?.error) return
    const rows = Array.isArray(result.value?.data) ? result.value.data : []
    rows.forEach(row => {
      const key = `${row.source || 'x'}:${row.source_player_id || row.player_name || ''}:${row.card_type || ''}`
      if (!merged.some(existing => `${existing.source || 'x'}:${existing.source_player_id || existing.player_name || ''}:${existing.card_type || ''}` === key)) {
        merged.push(row)
      }
    })
  })
  return merged
}

function candidateScore(card, candidate) {
  let score = 0
  const cardName = toAscii(card.name)
  const candidateName = toAscii(candidate.player_name)
  if (card.sourcePlayerId && String(candidate.source_player_id || '') === card.sourcePlayerId) score += 80
  if (candidateName === cardName) score += 28
  if (candidateName.includes(cardName) || cardName.includes(candidateName)) score += 12
  if (candidate.position === card.position) score += 12
  if (candidate.enrichment_status === 'complete') score += 12
  if (candidate.enrichment_status === 'partial') score += 4
  const baseOverall = Number(card.overall) || 0
  const candidateOverall = Number(candidate.overall_display || 0)
  if (baseOverall && candidateOverall) {
    score -= Math.min(15, Math.abs(baseOverall - candidateOverall) * 2)
  }
  return score
}

function pickCatalogCard(card, candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  return [...candidates]
    .sort((a, b) => candidateScore(card, b) - candidateScore(card, a))
    [0] || null
}

function cardTechnicalSignals(card, catalogCard) {
  const mergedSkills = [
    ...(Array.isArray(card.skills) ? card.skills : []),
    ...(Array.isArray(catalogCard?.player_skills) ? catalogCard.player_skills : [])
  ]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)

  const style = String(card.style || catalogCard?.playing_style || '').trim()
  const maxStats = catalogCard?.max_stats
  const statSource = maxStats && typeof maxStats === 'object' && Object.keys(maxStats).length > 0
    ? maxStats
    : { ...(catalogCard?.base_stats || {}) }
  const statSignals = signalsFromStats(statSource)
  const comparisonOverall = estimateCardCeilingOverall(card, catalogCard)
  const height = Number(card.height) || Number(catalogCard?.height) || null
  const weight = Number(card.weight) || Number(catalogCard?.weight) || null

  return {
    style,
    mergedSkills,
    ...statSignals,
    height,
    weight,
    cardOverall: Number(card.overall) || Number(catalogCard?.overall_display) || 0,
    comparisonOverall,
    premiumCard: isPremiumAdvisorCard(card, catalogCard),
    hasCompleteCardData: Boolean(catalogCard?.base_stats || catalogCard?.max_stats),
    dataSource: catalogCard?.source || card.source || 'unknown'
  }
}

function sameRolePlayers(card, players, stylesLookup) {
  return (players || [])
    .filter(player => player?.position === card.position || playerSupportsPosition(player, card.position))
    .map(player => {
      const skills = [...(Array.isArray(player.skills) ? player.skills : []), ...(Array.isArray(player.com_skills) ? player.com_skills : [])].slice(0, 8)
      return {
        name: player.player_name,
        position: player.position,
        overall: player.overall_rating,
        style: styleName(player, stylesLookup),
        skills,
        skillLabels: skills.map(skill => skillLabel(skill, 'it')).filter(Boolean),
        signals: rosterComparisonSignals(player),
        comparisonOverall: rosterComparisonOverall(player),
        statsBasis: {
          source: 'saved_roster_stats',
          currentLevel: player.current_level || null,
          levelCap: player.level_cap || null,
          activeBoosterName: player.active_booster_name || null
        },
        slotIndex: player.slot_index,
        height: Number(player.height) || 0,
        weight: Number(player.weight) || 0,
        competence: getPositionCompetence(player, card.position),
        isNativePosition: player?.position === card.position
      }
    })
    .sort((a, b) => {
      const slotA = Number(a.slotIndex)
      const slotB = Number(b.slotIndex)
      const starterA = Number.isFinite(slotA) && slotA >= 0 && slotA <= 10 ? 1 : 0
      const starterB = Number.isFinite(slotB) && slotB >= 0 && slotB <= 10 ? 1 : 0
      if (starterA !== starterB) return starterB - starterA
      if (a.isNativePosition !== b.isNativePosition) return a.isNativePosition ? -1 : 1
      const techA = Math.max(a.signals.defend, a.signals.pass, a.signals.pace, a.signals.finish, a.signals.gk)
      const techB = Math.max(b.signals.defend, b.signals.pass, b.signals.pace, b.signals.finish, b.signals.gk)
      return techB - techA
    })
    .slice(0, 4)
}

function getPositionCompetence(player, targetPosition) {
  const positions = Array.isArray(player?.original_positions) ? player.original_positions : []
  const match = positions.find(entry => {
    const position = typeof entry === 'string' ? entry : entry?.position
    return position === targetPosition
  })
  if (!match) return ''
  if (typeof match === 'string') return 'Alta'
  return String(match.competence || '').trim()
}

function playerSupportsPosition(player, targetPosition) {
  const positions = Array.isArray(player?.original_positions) ? player.original_positions : []
  return positions.some(entry => {
    const position = typeof entry === 'string' ? entry : entry?.position
    const competence = typeof entry === 'object' ? String(entry?.competence || '').toLowerCase() : ''
    return position === targetPosition && (!competence || competence.includes('alta') || competence.includes('high'))
  })
}

function connectionName(connection) {
  if (!connection || typeof connection !== 'object') return ''
  return connection.name || connection.connection || connection.title || connection.label || ''
}

function technicalProfile(card, signals, lang) {
  const family = roleFamily(card.position)
  const tags = []
  const body = bodyTypeProfile(signals, card.position, lang)
  if (family === 'gk') {
    if (signals.gk >= 80) tags.push(lang === 'en' ? 'Top shot-stopping' : 'Parate alto livello')
    if (signals.pass >= 76) tags.push(lang === 'en' ? 'Build-up from the back' : 'Uscita palla pulita')
    if (signals.physical >= 76) tags.push(lang === 'en' ? 'Box presence' : 'Presenza in area')
  } else if (family === 'def') {
    if (signals.defend >= 80) tags.push(lang === 'en' ? 'Strong defensive timing' : 'Tempo difensivo alto')
    if (signals.physical >= 78) tags.push(lang === 'en' ? 'Physical duels' : 'Duelli fisici')
    if (signals.pass >= 75) tags.push(lang === 'en' ? 'Safe first pass' : 'Primo passaggio pulito')
    if (signals.aerial >= 78) tags.push(lang === 'en' ? 'Aerial impact' : 'Impatto aereo')
  } else if (family === 'mid') {
    if (signals.pass >= 80) tags.push(lang === 'en' ? 'Playmaking lane control' : 'Controllo linee di passaggio')
    if (signals.pace >= 78) tags.push(lang === 'en' ? 'Tempo in transition' : 'Ritmo nelle transizioni')
    if (signals.defend >= 74) tags.push(lang === 'en' ? 'Defensive contribution' : 'Contributo difensivo')
    if (signals.physical >= 76) tags.push(lang === 'en' ? 'Midfield duels' : 'Duelli in mezzo')
  } else {
    if (signals.finish >= 82) tags.push(lang === 'en' ? 'Clinical finishing' : 'Finalizzazione alta')
    if (signals.pace >= 80) tags.push(lang === 'en' ? 'Depth attack' : 'Attacco profondita')
    if (signals.pass >= 75) tags.push(lang === 'en' ? 'Final pass quality' : 'Qualita ultimo passaggio')
    if (signals.aerial >= 78) tags.push(lang === 'en' ? 'Aerial threat' : 'Minaccia aerea')
  }
  const styleLabel = labelFromMap(EFHUB_STYLE_LABELS, signals.style, lang)
  const styleTag = styleLabel
    ? (lang === 'en' ? `Style: ${styleLabel}` : `Stile: ${styleLabel}`)
    : null
  if (styleTag) tags.unshift(styleTag)
  if (body.label) tags.push(body.label)
  const skillTags = signals.mergedSkills
    .slice(0, 2)
    .map(skill => skillLabel(skill, lang))
    .filter(Boolean)
  return [...tags, ...skillTags].slice(0, 5).filter(Boolean)
}

function bodyTypeProfile(technical = {}, position = '', lang = 'it') {
  const height = Number(technical.height) || 0
  const weight = Number(technical.weight) || 0
  const family = roleFamily(position)
  if (!height && !weight) return { label: '', use: '', score: 0 }

  const isEn = lang === 'en'
  const big = height >= 188 || weight >= 85
  const compact = height > 0 && height <= 175
  const balanced = !big && !compact

  if (family === 'att') {
    if (big) {
      return {
        label: isEn ? 'Big body type' : 'Body type fisico',
        use: isEn ? 'box reference, aerial duels and shielding' : 'riferimento in area, duelli aerei e protezione',
        score: 7
      }
    }
    if (compact) {
      return {
        label: isEn ? 'Compact body type' : 'Body type compatto',
        use: isEn ? 'quick turns, tight control and separation' : 'girate rapide, stretto e separazione',
        score: 5
      }
    }
  }

  if (family === 'def' && big) {
    return {
      label: isEn ? 'Defensive physical frame' : 'Struttura fisica difensiva',
      use: isEn ? 'box duels, contact and set-piece coverage' : 'duelli in area, contatto e palle ferme',
      score: 6
    }
  }

  return {
    label: balanced ? (isEn ? 'Balanced body type' : 'Body type equilibrato') : '',
    use: balanced ? (isEn ? 'balanced movement and contact profile' : 'profilo bilanciato tra movimento e contatto') : '',
    score: balanced ? 3 : 0
  }
}

function movementArchetype(technical = {}, position = '', lang = 'it') {
  const style = toAscii(technical.style)
  const body = bodyTypeProfile(technical, position, lang)
  const isEn = lang === 'en'

  if (style.includes('goal poacher') || style.includes('opportunista')) {
    return {
      key: 'goal_poacher',
      label: isEn ? 'Goal Poacher movement' : 'Movimento Opportunista',
      movement: isEn
        ? 'plays on the last line and attacks depth on through balls'
        : 'gioca sull’ultima linea e attacca la profondità sui filtranti',
      buyWhen: isEn
        ? 'you need runs behind the defence, counters or faster vertical attacks'
        : 'ti servono corse alle spalle, contropiede o verticalità più rapida',
      caution: isEn
        ? 'less valuable if your attack is mostly crosses into a static box'
        : 'meno centrale se attacchi soprattutto con cross su area statica',
      score: 8 + Math.max(0, body.score - 3)
    }
  }

  if (style.includes('fox in the box') || style.includes('rapace')) {
    return {
      key: 'fox_in_box',
      label: isEn ? 'Fox in the Box movement' : 'Movimento Rapace d’area',
      movement: isEn
        ? 'stays central in the box for rebounds, crosses and quick finishes'
        : 'resta centrale in area per ribalzi, cross e finalizzazioni rapide',
      buyWhen: isEn
        ? 'you create wide service, loose balls or need a fixed box finisher'
        : 'crei cross, seconde palle o ti serve un finalizzatore fisso in area',
      caution: isEn
        ? 'not the same as a depth runner: do not judge it only by pace'
        : 'non è come un attaccante di profondità: non valutarlo solo sulla velocità',
      score: 8 + (body.score >= 7 ? 3 : 0)
    }
  }

  if (style.includes('target man') || style.includes('fulcro')) {
    return {
      key: 'target_man',
      label: isEn ? 'Target Man movement' : 'Movimento Fulcro di gioco',
      movement: isEn ? 'shows as a physical reference and link player' : 'si offre da riferimento fisico e sponda',
      buyWhen: isEn ? 'you need hold-up play, long balls or a body in the box' : 'ti servono sponde, lanci lunghi o corpo in area',
      caution: isEn ? 'not ideal if you want constant runs behind' : 'non ideale se vuoi attacchi continui alle spalle',
      score: 7 + body.score
    }
  }

  if (style.includes('hole player') || style.includes('giocatore chiave')) {
    return {
      key: 'hole_player',
      label: isEn ? 'Hole Player movement' : 'Movimento Giocatore chiave',
      movement: isEn ? 'arrives from behind into scoring spaces' : 'si inserisce da dietro negli spazi da gol',
      buyWhen: isEn ? 'you need late runs from midfield or second striker zones' : 'ti servono inserimenti da centrocampo o seconda punta',
      caution: isEn ? 'needs service and space ahead' : 'ha bisogno di servizio e spazio davanti',
      score: 7
    }
  }

  if (style.includes('prolific winger') || style.includes('ala prolifica')) {
    return {
      key: 'prolific_winger',
      label: isEn ? 'Prolific Winger movement' : 'Movimento Ala prolifica',
      movement: isEn ? 'starts wide and attacks the final third' : 'parte largo e attacca l’ultimo terzo',
      buyWhen: isEn ? 'you need width plus threat into the box' : 'ti servono ampiezza e minaccia verso l’area',
      caution: isEn ? 'less useful if you never use wide lanes' : 'meno utile se non usi mai le corsie',
      score: 6
    }
  }

  return {
    key: '',
    label: '',
    movement: movementProfile(technical, position, lang),
    buyWhen: body.use,
    caution: '',
    score: body.score
  }
}

/** Stesso ruolo ma profilo tattico diverso (movimento/body) — motivo d'acquisto per diversificare. */
function rosterDiversificationProfile(cardTechnical, alternative, position, lang) {
  const isEn = lang === 'en'
  if (!alternative) {
    return { score: 0, differentMovement: false, differentBody: false, line: '' }
  }

  const cardMove = movementArchetype(cardTechnical, position, lang)
  const altMove = movementArchetype({ style: alternative.style }, position, lang)
  const cardBody = bodyTypeProfile(cardTechnical, position, lang)
  const altBody = bodyTypeProfile(
    { height: alternative.height, weight: alternative.weight },
    position,
    lang
  )

  const differentMovement = Boolean(cardMove.key && altMove.key && cardMove.key !== altMove.key)
  const differentBody = Boolean(
    cardBody.label
    && altBody.label
    && cardBody.label !== altBody.label
    && Math.abs(cardBody.score - altBody.score) >= 3
  )

  let score = 0
  if (differentMovement) score += 10
  if (differentBody) score += 4
  if (cardMove.key && !altMove.key) score += 5

  const altLabel = altMove.label || alternative.name
  const line = differentMovement
    ? isEn
      ? `${cardMove.label} vs ${altLabel}: a different movement profile than your current ${alternative.name}.`
      : `${cardMove.label} vs ${altLabel}: profilo di movimento diverso da ${alternative.name}.`
    : differentBody
      ? isEn
        ? `Different body type than ${alternative.name}: another way to play that lane.`
        : `Body type diverso da ${alternative.name}: un altro modo di interpretare quella corsia.`
      : ''

  return { score, differentMovement, differentBody, cardMove, altMove, line }
}

function mainLever(card, signals, roleGap, lang) {
  if (roleGap) return lang === 'en' ? `Role coverage on ${card.position}` : `Copertura ruolo ${card.position}`
  const family = roleFamily(card.position)
  const movement = movementArchetype(signals, card.position, lang)
  if (movement.key === 'goal_poacher') return lang === 'en' ? 'Depth runs' : 'Attacco profondità'
  if (movement.key === 'fox_in_box') return lang === 'en' ? 'Box finishing' : 'Presenza/finalizzazione in area'
  if (movement.key === 'target_man') return lang === 'en' ? 'Physical reference' : 'Riferimento fisico'
  if (family === 'def') {
    if (signals.defend >= 80) return lang === 'en' ? 'Defensive timing and duels' : 'Tempo difensivo e duelli'
    return lang === 'en' ? 'Backline coverage' : 'Copertura linea difensiva'
  }
  if (family === 'mid') {
    if (signals.pass >= 80) return lang === 'en' ? 'Build-up control' : 'Controllo costruzione'
    return lang === 'en' ? 'Midfield connection' : 'Connessione centrocampo'
  }
  if (family === 'gk') return lang === 'en' ? 'Goal stability' : 'Stabilita porta'
  if (signals.pace >= 80) return lang === 'en' ? 'Depth attack' : 'Attacco profondita'
  return lang === 'en' ? 'Final phase impact' : 'Impatto ultimi metri'
}

function recommendedUse(card, lang, tacticalStyle = '') {
  const family = roleFamily(card.position)
  const tactical = toAscii(tacticalStyle)
  if (family === 'def') return lang === 'en'
    ? `Use ${card.name} to protect the exposed side and win the first defensive duel after losing possession.`
    : `Usa ${card.name} per proteggere il lato scoperto e vincere il primo duello dopo perdita palla.`
  if (family === 'mid') return lang === 'en'
    ? `Use ${card.name} between your lines to connect first build-up and final third entries.`
    : `Usa ${card.name} tra le linee per collegare prima costruzione e ultimo terzo.`
  if (family === 'gk') return lang === 'en'
    ? `Use ${card.name} to stabilize the box and reduce second-ball rebounds.`
    : `Usa ${card.name} per stabilizzare l'area e ridurre i rimbalzi da seconda palla.`
  if (tactical.includes('possesso')) {
    return lang === 'en'
      ? `Use ${card.name} to attack the box after structured possession and finish central actions.`
      : `Usa ${card.name} per attaccare area dopo possesso strutturato e chiudere le azioni centrali.`
  }
  return lang === 'en'
    ? `Use ${card.name} to attack depth early and finish the action in the first touch window.`
    : `Usa ${card.name} per attaccare profondita in anticipo e chiudere l'azione nel primo tempo di gioco.`
}

function issuesRead(patterns = {}) {
  const recurring = Array.isArray(patterns?.recurring_issues) ? patterns.recurring_issues : []
  const text = toAscii(recurring.join(' '))
  return {
    recurring,
    needDefence: /(difes|copert|duel|press|conced|recover|recuper|mark)/.test(text),
    needBuild: /(pass|build|uscit|possess|regia|palleggio|linee)/.test(text),
    needDepth: /(profond|space|transiz|controp|counter|run|attacco)/.test(text),
    needAerial: /(testa|aerial|cross|corner|set piece)/.test(text)
  }
}

function profileSignals(profile = {}, lang = 'it') {
  const weakPoint = toAscii(profile?.ai_weak_point || '')
  const goals = Array.isArray(profile?.ai_learn_goals)
    ? profile.ai_learn_goals.map(goal => String(goal || ''))
    : profile?.ai_learn_goals
      ? [String(profile.ai_learn_goals)]
      : []
  const all = toAscii([weakPoint, ...goals].join(' '))
  const inputDelay = toAscii(profile?.input_delay || '')
  const connection = toAscii(profile?.connection_quality || '')
  return {
    weakPoint: profile?.ai_weak_point || null,
    goals,
    needBuild: /(pass|build|uscit|possess|regia)/.test(all),
    needDef: /(difes|duel|copert|recuper|conced)/.test(all),
    needFinishing: /(finish|finaliz|gol|shot|tiro|attacco)/.test(all),
    networkRisk: /(high|alto|unstable|instab|poor|basso)/.test(`${inputDelay} ${connection}`),
    inputDelayLabel: profile?.input_delay || null
  }
}

function userDisplayName(profile = {}) {
  return String(profile?.nickname || profile?.first_name || profile?.team_name || '').trim()
}

function skillText(skills = []) {
  return toAscii((Array.isArray(skills) ? skills : []).map((s) => getSkillDisplayLabel(String(s || '').trim(), 'it')).join(' '))
}

function bestAerialTarget(players = []) {
  return (players || [])
    .map(player => {
      const signals = signalsFromStats(player?.base_stats || {})
      const skills = skillText([...(Array.isArray(player?.skills) ? player.skills : []), ...(Array.isArray(player?.com_skills) ? player.com_skills : [])])
      const hasAerialSkill = /(heading|colpo di testa|aerial|dominio|svettante)/.test(skills)
      return {
        name: player?.player_name,
        position: player?.position,
        signals,
        score: Math.max(signals.aerial || 0, signals.physical || 0) + (hasAerialSkill ? 8 : 0)
      }
    })
    .filter(player => player.name && player.score >= 74)
    .sort((a, b) => b.score - a.score)
    [0] || null
}

function bestDepthRunner(players = []) {
  return (players || [])
    .map(player => {
      const signals = signalsFromStats(player?.base_stats || {})
      const skills = skillText([...(Array.isArray(player?.skills) ? player.skills : []), ...(Array.isArray(player?.com_skills) ? player.com_skills : [])])
      const position = String(player?.position || '')
      const attackingRole = ['P', 'SP', 'ESA', 'EDA'].includes(position)
      const hasFinishSkill = /(first time|tiro di prima|finishing|finalizzazione|goal|gol|long range|tiro)/.test(skills)
      return {
        name: player?.player_name,
        position,
        signals,
        score: Math.max(signals.pace || 0, signals.finish || 0) + (attackingRole ? 6 : 0) + (hasFinishSkill ? 5 : 0)
      }
    })
    .filter(player => player.name && player.score >= 76)
    .sort((a, b) => b.score - a.score)
    [0] || null
}

function bestCreator(players = []) {
  return (players || [])
    .map(player => {
      const signals = signalsFromStats(player?.base_stats || {})
      const skills = skillText([...(Array.isArray(player?.skills) ? player.skills : []), ...(Array.isArray(player?.com_skills) ? player.com_skills : [])])
      const hasCreatorSkill = /(through|filtrante|one touch|prima|weighted|calibrato|passaggio)/.test(skills)
      return {
        name: player?.player_name,
        position: player?.position,
        signals,
        score: (signals.pass || 0) + (hasCreatorSkill ? 8 : 0)
      }
    })
    .filter(player => player.name && player.score >= 76)
    .sort((a, b) => b.score - a.score)
    [0] || null
}

function comboRead({ card, technical, players, issues, profileRead, gameRead, lang }) {
  const groups = skillGroups(technical)
  const family = roleFamily(card.position)
  const skills = skillText(technical.mergedSkills)
  const aerialTarget = bestAerialTarget(players)
  const depthRunner = bestDepthRunner(players)
  const creator = bestCreator(players)
  if (groups.crossing && ['def', 'mid', 'att'].includes(family) && ['TD', 'TS', 'CLD', 'CLS', 'EDA', 'ESA'].includes(card.position)) {
    return aerialTarget
      ? {
          key: 'cross-aerial',
          label: lang === 'en' ? 'Wide-to-box combo' : 'Combo fascia-area',
          text: lang === 'en'
            ? `${card.name} has value on crosses because ${aerialTarget.name} gives your roster a real target in the box.`
            : `${card.name} dà valore sui cross perché ${aerialTarget.name} ti offre un riferimento reale in area.`,
          detail: lang === 'en'
            ? `Native crossing skill plus an aerial target turns the wide lane into a concrete chance source.`
            : `Skill da cross più un riferimento aereo trasformano la fascia in una fonte concreta di occasioni.`
        }
      : {
          key: 'cross-no-target',
          label: lang === 'en' ? 'Cross value limited' : 'Cross da sfruttare meglio',
          text: lang === 'en'
            ? `${card.name} has crossing value, but your roster does not show a strong aerial target yet.`
            : `${card.name} ha valore nel cross, ma nella tua rosa non emerge ancora un riferimento forte nel gioco aereo.`,
          detail: lang === 'en'
            ? `The skill is real, but it becomes more valuable when a striker or midfielder can attack those balls.`
            : `La skill è reale, ma diventa più preziosa quando una punta o un centrocampista può attaccare quei palloni.`
        }
  }
  if (/(through|filtrante)/.test(skills) || (groups.passing && technical.pass >= 80)) {
    return depthRunner
      ? {
          key: 'through-depth',
          label: lang === 'en' ? 'Pass-to-depth combo' : 'Combo filtrante-profondità',
          text: lang === 'en'
            ? `${card.name} can feed depth because ${depthRunner.name} gives your roster a player who can attack that space.`
            : `${card.name} può servire la profondità perché ${depthRunner.name} ti dà un giocatore capace di attaccare quello spazio.`,
          detail: lang === 'en'
            ? `Passing skill plus a runner makes the card useful when you want faster vertical attacks.`
            : `Skill di passaggio più un giocatore che attacca spazio rendono la carta utile quando vuoi verticalizzare più rapidamente.`
        }
      : {
          key: 'through-no-runner',
          label: lang === 'en' ? 'Creative value limited' : 'Creatività da completare',
          text: lang === 'en'
            ? `${card.name} has passing value, but your roster does not show a clear depth runner to maximize it.`
            : `${card.name} ha valore nel passaggio, ma nella tua rosa non emerge un attaccante della profondità per massimizzarlo.`,
          detail: lang === 'en'
            ? `The skill remains useful, but it needs movement ahead of the ball to become decisive.`
            : `La skill resta utile, ma ha bisogno di movimento davanti al pallone per diventare decisiva.`
        }
  }
  if (/(first time|tiro di prima)/.test(skills) || (groups.finishing && family === 'att')) {
    return creator
      ? {
          key: 'creator-finisher',
          label: lang === 'en' ? 'Creator-to-finish combo' : 'Combo creator-finalizzatore',
          text: lang === 'en'
            ? `${card.name} gains value because ${creator.name} can already create the kind of balls a first-time finisher needs.`
            : `${card.name} guadagna valore perché ${creator.name} può già creare palloni adatti a chi chiude di prima.`,
          detail: lang === 'en'
            ? `Finishing skill becomes more concrete when the roster has a passer who can serve clean chances.`
            : `La skill di finalizzazione diventa più concreta quando la rosa ha un passatore capace di creare occasioni pulite.`
        }
      : null
  }
  if (groups.defensive && (issues?.needDefence || profileRead?.needDef || (gameRead?.shotsConceded != null && gameRead.shotsConceded >= 7))) {
    return {
      key: 'defensive-need',
      label: lang === 'en' ? 'Defensive need match' : 'Risposta difensiva',
      text: lang === 'en'
        ? `${card.name} matches a defensive need in your data: the native defensive skills support coverage, duels and interceptions.`
        : `${card.name} risponde a un bisogno difensivo nei tuoi dati: le skill native aiutano copertura, duelli e intercetti.`,
      detail: lang === 'en'
        ? `This is a real fit because the card skill set connects with an area your profile or match reads already highlight.`
        : `È un fit reale perché il set di skill della carta si collega a un’area già emersa dal profilo o dalle letture partita.`
    }
  }
  return null
}

function gameSignals(gameAnalysis = {}) {
  const stats = gameAnalysis?.stats || {}
  const numeric = collectNumbers(stats)
  const pick = (keys) => {
    const match = Object.entries(numeric).find(([key]) => keys.some(entry => key.includes(entry)))
    return match ? Number(match[1]) : null
  }
  return {
    passAccuracy: pick(['pass_accuracy', 'pass acc', 'accurate_pass', 'accuracy']),
    shotsConceded: pick(['shots_conceded', 'shots against', 'conceded_shots']),
    shotsOnTarget: pick(['shots_on_target', 'on_target', 'target_shots']),
    possession: pick(['possession'])
  }
}

function joinedAlternatives(sameRole = []) {
  return sameRole
    .slice(0, 3)
    .map(player => {
      if (!player?.name) return ''
      return player.name
    })
    .filter(Boolean)
    .join(', ')
}

function describeAlternative(player, targetPosition, lang) {
  if (!player?.name) return ''
  const parts = [player.name]
  if (player.position && player.position !== targetPosition && player.competence) {
    parts.push(lang === 'en'
      ? `also ${targetPosition} ${player.competence}`
      : `competenza anche ${targetPosition} ${player.competence}`)
  } else if (player.style) {
    parts.push(player.style)
  }
  return parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(', ')})` : parts[0]
}

function topAlternativeDescriptions(sameRole, targetPosition, lang) {
  return sameRole
    .slice(0, 3)
    .map(player => describeAlternative(player, targetPosition, lang))
    .filter(Boolean)
    .join(', ')
}

function skillGroups(technical) {
  const merged = Array.isArray(technical.mergedSkills) ? technical.mergedSkills : []
  const text = toAscii(merged.map((s) => getSkillDisplayLabel(String(s || '').trim(), 'it')).join(' '))
  return {
    crossing: /(cross|preciso|pinpoint|calibrato|loft|dosato|passaggio calibrato)/.test(text) || technical.pass >= 76,
    defensive: /(interception|intercett|marking|marcat|block|muro|blocco|tackle|scivolata|caposaldo)/.test(text) || technical.defend >= 78,
    aerial: /(heading|colpo di testa|aerial|dominio|svettante)/.test(text) || technical.aerial >= 78,
    dribble: /(double|doppio|scissors|finta|turn|feint|svolta|taglia|gira|elastico)/.test(text),
    passing: /(one touch|through|filtrante|prima|passaggio)/.test(text) || technical.pass >= 78,
    finishing: /(first time|tiro di prima|tiro al volo|long range|distanza|finishing|tiro|finalizzazione)/.test(text) || technical.finish >= 80,
    fighting: /(fighting|spirito|leader)/.test(text)
  }
}

function movementProfile(technical, position, lang) {
  const style = toAscii(technical.style)
  const family = roleFamily(position)
  if (style.includes('full back finisher')) {
    return lang === 'en'
      ? 'forward full-back movement'
      : 'movimento da terzino che attacca alto'
  }
  if (style.includes('offensive full back')) return lang === 'en' ? 'wide overlap support' : 'spinta larga in sovrapposizione'
  if (style.includes('defensive full back')) return lang === 'en' ? 'safer full-back positioning' : 'posizionamento più prudente da terzino'
  if (style.includes('destroyer')) return lang === 'en' ? 'aggressive duel and interception movement' : 'movimento aggressivo su duelli e intercetti'
  if (style.includes('build up')) return lang === 'en' ? 'build-up defender movement' : 'movimento da difensore di costruzione'
  if (style.includes('box to box')) return lang === 'en' ? 'box-to-box support movement' : 'movimento continuo box-to-box'
  if (style.includes('orchestrator')) return lang === 'en' ? 'central build-up control' : 'controllo centrale della costruzione'
  if (style.includes('goal poacher') || style.includes('opportunista')) return lang === 'en' ? 'depth attack movement' : 'movimento ad attaccare la profondità'
  if (style.includes('fox in the box') || style.includes('rapace')) return lang === 'en' ? 'central box-finisher movement' : 'movimento centrale da rapace d’area'
  if (style.includes('target man') || style.includes('fulcro')) return lang === 'en' ? 'hold-up reference movement' : 'movimento da riferimento e sponda'
  if (style.includes('hole player') || style.includes('giocatore chiave')) return lang === 'en' ? 'late box-arrival movement' : 'movimento di inserimento negli spazi'
  if (style.includes('prolific winger') || style.includes('ala prolifica')) return lang === 'en' ? 'wide-to-box attacking movement' : 'movimento largo che attacca l’area'
  if (family === 'gk') return lang === 'en' ? 'goal stability profile' : 'profilo di stabilità porta'
  if (family === 'def') return lang === 'en' ? 'defensive control profile' : 'profilo di controllo difensivo'
  if (family === 'mid') return lang === 'en' ? 'midfield connection profile' : 'profilo di connessione a centrocampo'
  return lang === 'en' ? 'final-third profile' : 'profilo da ultimi metri'
}

function tacticalStyleFit(technical, position, tacticalStyle, profileRead, lang) {
  const style = toAscii(tacticalStyle)
  const groups = skillGroups(technical)
  const family = roleFamily(position)
  const teamStyle = teamStyleLabel(tacticalStyle, lang)
  const movement = movementArchetype(technical, position, lang)
  if ((style.includes('vie laterali') || style.includes('out wide')) && ['TD', 'TS', 'CLD', 'CLS', 'EDA', 'ESA'].includes(position) && groups.crossing) {
    return lang === 'en'
      ? `Fits ${teamStyle}: wide movement plus crossing can turn the lane into a real chance source.`
      : `Si lega a ${teamStyle}: movimento largo e cross possono trasformare quella corsia in una fonte reale di occasioni.`
  }
  if ((style.includes('vie laterali') || style.includes('out wide')) && movement.key === 'fox_in_box') {
    return lang === 'en'
      ? `Fits ${teamStyle}: Fox in the Box movement gives wide service a central target.`
      : `Si lega a ${teamStyle}: il movimento da Rapace d'area dà ai cross un riferimento centrale.`
  }
  if ((style.includes('contropiede') || style.includes('counter')) && (technical.pace >= 78 || family === 'att')) {
    if (movement.key === 'goal_poacher') {
      return lang === 'en'
        ? `Fits ${teamStyle}: Goal Poacher movement attacks the last line early.`
        : `Si lega a ${teamStyle}: l'Opportunista attacca presto l'ultima linea.`
    }
    return lang === 'en'
      ? `Fits ${teamStyle}: the value is early vertical attack, not slow possession.`
      : `Si lega a ${teamStyle}: il valore è attaccare verticale presto, non il possesso lento.`
  }
  if ((style.includes('possesso') || style.includes('possession')) && technical.pass >= 76) {
    return lang === 'en'
      ? `Fits ${teamStyle}: cleaner passing makes the card useful in controlled build-up.`
      : `Si lega a ${teamStyle}: passaggio più pulito rende la carta utile nella costruzione controllata.`
  }
  if (profileRead.needDef && (family === 'def' || groups.defensive)) {
    return lang === 'en'
      ? 'It also matches your defensive priority, but only as role coverage, not as a universal fix.'
      : 'Si allinea anche alla tua priorità difensiva, ma solo come copertura ruolo, non come soluzione universale.'
  }
  if (profileRead.needBuild && technical.pass >= 76) {
    return lang === 'en'
      ? 'It supports your build-up priority with safer passing lanes.'
      : 'Supporta la tua priorità di costruzione con linee di passaggio più sicure.'
  }
  if (profileRead.needFinishing && family === 'att') {
    return lang === 'en'
      ? 'It fits your attacking priority only if you use the card in its native final-third role.'
      : 'Si lega alla tua priorità offensiva solo se usi la carta nel suo ruolo naturale negli ultimi metri.'
  }
  return ''
}

function roleRelevantStatEdges(position, technical, bestAlternative, lang) {
  const family = roleFamily(position)
  const common = [
    ['pace', technical.pace - bestAlternative.signals.pace, lang === 'en' ? 'speed/recovery' : 'velocità/recupero'],
    ['pass', technical.pass - bestAlternative.signals.pass, lang === 'en' ? 'passing' : 'passaggio'],
    ['physical', technical.physical - bestAlternative.signals.physical, lang === 'en' ? 'physical duels' : 'duelli fisici']
  ]
  if (family === 'gk') {
    return [
      ['gk', technical.gk - bestAlternative.signals.gk, lang === 'en' ? 'goalkeeping' : 'parate'],
      ['pass', technical.pass - bestAlternative.signals.pass, lang === 'en' ? 'build-up from goal' : 'uscita palla dal basso'],
      ['physical', technical.physical - bestAlternative.signals.physical, lang === 'en' ? 'box presence' : 'presenza in area']
    ]
  }
  if (family === 'def') {
    return [
      ['defend', technical.defend - bestAlternative.signals.defend, lang === 'en' ? 'defensive timing' : 'tempo difensivo'],
      ['aerial', technical.aerial - bestAlternative.signals.aerial, lang === 'en' ? 'aerial game' : 'gioco aereo'],
      ...common
    ]
  }
  if (family === 'mid') {
    return [
      ['pass', technical.pass - bestAlternative.signals.pass, lang === 'en' ? 'passing' : 'passaggio'],
      ['defend', technical.defend - bestAlternative.signals.defend, lang === 'en' ? 'defensive balance' : 'equilibrio difensivo'],
      ['pace', technical.pace - bestAlternative.signals.pace, lang === 'en' ? 'transition speed' : 'velocità nelle transizioni'],
      ['physical', technical.physical - bestAlternative.signals.physical, lang === 'en' ? 'midfield duels' : 'duelli in mezzo']
    ]
  }
  return [
    ['finish', technical.finish - bestAlternative.signals.finish, lang === 'en' ? 'finishing' : 'finalizzazione'],
    ['pace', technical.pace - bestAlternative.signals.pace, lang === 'en' ? 'depth speed' : 'velocità in profondità'],
    ['pass', technical.pass - bestAlternative.signals.pass, lang === 'en' ? 'final pass' : 'ultimo passaggio'],
    ['aerial', technical.aerial - bestAlternative.signals.aerial, lang === 'en' ? 'aerial threat' : 'minaccia aerea']
  ]
}

function statEdgeLine(position, technical, bestAlternative, lang) {
  if (!bestAlternative?.signals) return ''
  const edges = roleRelevantStatEdges(position, technical, bestAlternative, lang)
    .filter(([, value]) => Number.isFinite(value) && Math.abs(value) >= 5)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  if (edges.length === 0) return ''
  const [key, value, label] = edges[0]
  if (value > 0) {
    return lang === 'en'
      ? `Compared with ${bestAlternative.name}, the clearest technical edge is ${label}.`
      : `Rispetto a ${bestAlternative.name}, il vantaggio tecnico più chiaro è ${label}.`
  }
  return lang === 'en'
    ? `Compared with ${bestAlternative.name}, there is no clear technical edge in ${label}.`
    : `Rispetto a ${bestAlternative.name}, non emerge un vantaggio tecnico chiaro in ${label}.`
}

function purchaseDecision({ score, hasRoster, hasCompleteCardData, roleGap, duplicate, starterBlocked, upgradeEdge, rosterCrowded, premiumCard, diversificationValue, lang }) {
  if (!hasCompleteCardData) {
    return {
      level: 'needs-card-data',
      label: lang === 'en' ? 'Card data loading' : 'Dati carta da completare',
      title: lang === 'en' ? 'Read the full card before deciding' : 'Leggi la carta completa prima di decidere'
    }
  }
  if (!hasRoster) {
    return {
      level: 'needs-roster',
      label: lang === 'en' ? 'Card value only' : 'Valore carta',
      title: lang === 'en' ? 'Good card read, team fit needs your roster' : 'Buona carta, fit squadra da completare'
    }
  }
  if (upgradeEdge && (roleGap || score >= 68)) {
    return {
      level: 'buy',
      label: lang === 'en' ? 'High team synergy' : 'Sinergia alta',
      title: lang === 'en' ? 'Excellent fit for your team' : 'Ottimo fit per la tua squadra'
    }
  }
  if (upgradeEdge && rosterCrowded) {
    return {
      level: 'watch',
      label: lang === 'en' ? 'Upgrade option' : 'Opzione upgrade',
      title: lang === 'en' ? 'Worth considering over your current option' : 'Da valutare rispetto all’opzione attuale'
    }
  }
  if ((duplicate || starterBlocked) && diversificationValue && score >= 72) {
    return {
      level: 'buy',
      label: lang === 'en' ? 'Diversify your squad' : 'Diversifica la rosa',
      title: lang === 'en'
        ? 'Buy to add a different tactical profile in the same role'
        : 'Compra per avere un profilo tattico diverso nello stesso ruolo'
    }
  }
  if ((duplicate || starterBlocked) && diversificationValue && score >= 58) {
    return {
      level: 'watch',
      label: lang === 'en' ? 'Tactical variety' : 'Varietà tattica',
      title: lang === 'en'
        ? 'Same role, different match plan — worth it if you like rotating'
        : 'Stesso ruolo, piano partita diverso — vale se ti piace ruotare'
    }
  }
  if ((duplicate || starterBlocked) && premiumCard && score >= (diversificationValue ? 74 : 82)) {
    return {
      level: 'buy',
      label: lang === 'en' ? 'Premium rotation' : 'Rotazione premium',
      title: lang === 'en' ? 'Buy if you want a premium role option' : 'Compra se vuoi un’opzione premium nel ruolo'
    }
  }
  if ((duplicate || starterBlocked) && premiumCard && score >= (diversificationValue ? 58 : 68)) {
    return {
      level: 'watch',
      label: lang === 'en' ? 'Premium option' : 'Opzione premium',
      title: lang === 'en' ? 'Strong card, worth considering as rotation' : 'Carta forte, da valutare come rotazione'
    }
  }
  if (duplicate || starterBlocked) {
    return {
      level: 'avoid',
      label: lang === 'en' ? 'Low team fit' : 'Fit squadra basso',
      title: lang === 'en' ? 'Strong card, not central for your roster now' : 'Carta forte, ma non centrale nella tua rosa'
    }
  }
  if (roleGap || score >= 74) {
    return {
      level: 'buy',
      label: lang === 'en' ? 'High team synergy' : 'Sinergia alta',
      title: lang === 'en' ? 'Excellent fit for your team' : 'Ottimo fit per la tua squadra'
    }
  }
  if (score >= 58) {
    return {
      level: 'watch',
      label: lang === 'en' ? 'Situational synergy' : 'Sinergia situazionale',
      title: lang === 'en' ? 'Useful in the right match plan' : 'Utile nel piano partita giusto'
    }
  }
  return {
    level: 'skip',
    label: lang === 'en' ? 'Low priority' : 'Bassa priorità',
    title: lang === 'en' ? 'Not the upgrade your team needs now' : 'Non è l’upgrade che ti serve ora'
  }
}

function cardValueBullets(card, technical, lang) {
  const family = roleFamily(card.position)
  const bullets = []
  if (technical.style) {
    const styleLabel = labelFromMap(EFHUB_STYLE_LABELS, technical.style, lang)
    bullets.push(lang === 'en' ? `Native style: ${styleLabel}.` : `Stile nativo: ${styleLabel}.`)
  }
  if (family === 'gk') {
    if (technical.gk >= 75) bullets.push(lang === 'en' ? 'Raises reliability inside the box.' : 'Alza affidabilità dentro l’area.')
    if (technical.pass >= 70) bullets.push(lang === 'en' ? 'Can support safer build-up from the back.' : 'Può aiutare una costruzione più pulita dal basso.')
  } else if (family === 'def') {
    if (technical.defend >= 78) bullets.push(lang === 'en' ? 'Strong defensive base for duels and interceptions.' : 'Base difensiva forte per duelli e intercetti.')
    if (technical.aerial >= 78) bullets.push(lang === 'en' ? 'Adds aerial value on crosses and set pieces.' : 'Aggiunge valore aereo su cross e palle ferme.')
    if (technical.pace >= 74) bullets.push(lang === 'en' ? 'Has enough recovery speed to protect space.' : 'Ha velocità di recupero per proteggere campo.')
  } else if (family === 'mid') {
    if (technical.pass >= 76) bullets.push(lang === 'en' ? 'Improves connection between build-up and final third.' : 'Migliora il collegamento tra costruzione e ultimo terzo.')
    if (technical.defend >= 72) bullets.push(lang === 'en' ? 'Adds useful balance when possession is lost.' : 'Aggiunge equilibrio utile dopo perdita palla.')
    if (technical.physical >= 74) bullets.push(lang === 'en' ? 'Can hold midfield duels.' : 'Può reggere i duelli in mezzo.')
  } else {
    if (technical.finish >= 78) bullets.push(lang === 'en' ? 'Brings a real finishing threat.' : 'Porta una minaccia concreta in finalizzazione.')
    if (technical.pace >= 78) bullets.push(lang === 'en' ? 'Attacks depth and creates separation.' : 'Attacca profondità e crea separazione.')
    if (technical.pass >= 74) bullets.push(lang === 'en' ? 'Can also connect the last pass.' : 'Può collegare anche l’ultimo passaggio.')
  }
  return bullets.length > 0
    ? bullets.slice(0, 3)
    : [lang === 'en'
        ? `${card.name} is readable by role and style, but the technical detail is still limited.`
        : `${card.name} è leggibile per ruolo e stile, ma il dettaglio tecnico è ancora limitato.`]
}

function tacticalUseLine(card, technical, tacticalStyle, lang) {
  const family = roleFamily(card.position)
  const style = toAscii(tacticalStyle)
  const groups = skillGroups(technical)
  const cardStyle = toAscii(technical.style)
  const hasDefensiveSkill = groups.defensive || technical.defend >= 72
  if (family === 'def') {
    if ((cardStyle.includes('full back finisher') || cardStyle.includes('terzino finalizzatore')) && groups.crossing) {
      return lang === 'en'
        ? `Its real value is the forward movement: overlap, arrive high and turn the action into a cross or low ball.`
        : `Il valore reale è il movimento in avanti: accompagna, arriva alto e trasforma l’azione in cross o palla rasoterra.`
    }
    if (technical.pace >= 74 && (card.position === 'TD' || card.position === 'TS')) {
      return lang === 'en'
        ? `It makes sense only if you want a full-back who can push the exit and still recover space.`
        : `Ha senso solo se vuoi un terzino che accompagni l’uscita e possa comunque recuperare campo.`
    }
    if (groups.defensive) {
      return lang === 'en'
        ? `Its value is defensive control: duels, interceptions and safer coverage, not a major attacking change.`
        : `Il suo valore è controllo difensivo: duelli, intercetti e copertura più sicura, non una grande svolta offensiva.`
    }
    return lang === 'en'
      ? `Its useful case is defensive stability, not changing your attacking production.`
      : `Il caso d’uso utile è stabilità difensiva, non cambiare davvero la produzione offensiva.`
  }
  if (family === 'mid') {
    if (hasDefensiveSkill && technical.pass >= 74) {
      return lang === 'en'
        ? `Use case: win the first duel, then play simple passes to restart the action.`
        : `Uso reale: vincere il primo duello e poi giocare semplice per riavviare l’azione.`
    }
    return lang === 'en'
      ? `It makes sense if you need cleaner build-up and safer support between the lines.`
      : `Ha senso se ti serve più pulizia in costruzione e supporto sicuro tra le linee.`
  }
  if (family === 'gk') {
    return lang === 'en'
      ? `It makes sense only if your current goalkeeper is costing you rebounds or close-range saves.`
      : `Ha senso solo se il tuo portiere attuale ti costa rimbalzi o parate ravvicinate.`
  }
  if (style.includes('contropiede') || style.includes('counter')) {
    return lang === 'en'
      ? `It makes sense if you use him to attack depth early, not as another static forward.`
      : `Ha senso se lo usi per attaccare profondità subito, non come un altro attaccante statico.`
  }
  if (groups.dribble && technical.pace >= 78) {
    return lang === 'en'
      ? `Its useful case is one-v-one creation: receive wide or between lines, beat the first man, then finish or assist.`
      : `Il caso utile è creare 1 contro 1: ricevere largo o tra le linee, saltare il primo uomo e poi chiudere o assistere.`
  }
  return lang === 'en'
    ? `It makes sense only if this role is where your attacks currently lose quality.`
    : `Ha senso solo se questo ruolo è dove oggi perdi qualità in attacco.`
}

function topNumericKey(input) {
  const values = collectNumbers(input)
  return Object.entries(values)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .find(([, value]) => Number(value) > 0)?.[0] || ''
}

function tacticalMapLine(patterns, cardPosition, lang) {
  const attackKey = topNumericKey(patterns?.attack_areas_avg)
  const recoveryKey = topNumericKey(patterns?.recovery_zones_avg)
  if (!attackKey && !recoveryKey) return ''
  const sideRole = ['TD', 'CLD', 'EDA'].includes(cardPosition)
    ? 'right'
    : ['TS', 'CLS', 'ESA'].includes(cardPosition)
      ? 'left'
      : 'central'
  const mapText = `${attackKey} ${recoveryKey}`.toLowerCase()
  const sameSide = sideRole === 'right'
    ? /(right|destra|dx)/.test(mapText)
    : sideRole === 'left'
      ? /(left|sinistra|sx)/.test(mapText)
      : /(central|center|centro)/.test(mapText)
  if (!sameSide) return ''
  return lang === 'en'
    ? 'Your tactical maps already point toward this zone, so the card is relevant only if it improves that lane.'
    : 'Le tue mappe tattiche puntano già su questa zona, quindi la carta è rilevante solo se migliora davvero quella corsia.'
}

function decisionEvidence({ technical, sameRole, roleGap, duplicate, starterBlocked, tacticalStyle, profileRead, patterns, position }) {
  const groups = skillGroups(technical)
  const family = roleFamily(position)
  const style = toAscii(tacticalStyle)
  const hasMapFit = Boolean(tacticalMapLine(patterns, position, 'it'))
  const hasTacticalFit = Boolean(tacticalStyleFit(technical, position, tacticalStyle, profileRead, 'it'))
  const hasNativeEdge = (
    groups.crossing ||
    groups.defensive ||
    groups.aerial ||
    groups.dribble ||
    groups.passing ||
    groups.finishing ||
    technical.pace >= 82 ||
    technical.pass >= 82 ||
    technical.defend >= 82 ||
    technical.finish >= 82 ||
    technical.gk >= 82
  )
  const profileNeedFit = (
    (profileRead.needDef && (family === 'def' || groups.defensive)) ||
    (profileRead.needBuild && (family === 'mid' || groups.passing)) ||
    (profileRead.needFinishing && (family === 'att' || groups.finishing))
  )
  const teamStyleFit = (
    ((style.includes('vie laterali') || style.includes('out wide')) && groups.crossing) ||
    ((style.includes('contropiede') || style.includes('counter')) && (technical.pace >= 78 || family === 'att')) ||
    ((style.includes('possesso') || style.includes('possession')) && technical.pass >= 76)
  )

  return {
    roleGap,
    duplicate,
    starterBlocked,
    hasNativeEdge,
    hasTacticalFit,
    hasMapFit,
    profileNeedFit,
    teamStyleFit,
    alternativesCount: sameRole.length
  }
}

function buildRosterRead({ card, sameRole, bestAlternative, roleGap, duplicate, starterBlocked, upgradeEdge, diversification, technical, tacticalStyle, patterns, profileRead, lang }) {
  const role = positionLabel(card.position, lang)
  const alternatives = topAlternativeDescriptions(sameRole, card.position, lang)
  const bestName = describeAlternative(bestAlternative, card.position, lang)
  const useLine = tacticalUseLine(card, technical, tacticalStyle, lang)
  const mapLine = tacticalMapLine(patterns, card.position, lang)
  const fitLine = tacticalStyleFit(technical, card.position, tacticalStyle, profileRead, lang)
  const edgeLine = statEdgeLine(card.position, technical, bestAlternative, lang)
  const secondLine = [useLine, fitLine, mapLine, edgeLine].filter(Boolean).slice(0, 2).join(' ')
  const movement = movementProfile(technical, card.position, lang)

  if (roleGap) {
    return [
      lang === 'en'
        ? `${card.name} has a clear case because your roster does not have a direct ${role} alternative. The key profile is ${movement}.`
        : `${card.name} ha un caso chiaro perché nella tua rosa non c’è un’alternativa diretta da ${role}. Il profilo chiave è ${movement}.`,
      lang === 'en'
        ? `${secondLine} This is the kind of card that can save coins later because it closes a real squad gap.`
        : `${secondLine} È il tipo di carta che può farti risparmiare coins dopo, perché chiude un buco reale della rosa.`
    ]
  }

  if (upgradeEdge && (duplicate || starterBlocked || sameRole.length > 0)) {
    return [
      lang === 'en'
        ? `${card.name} reads as an upgrade over ${bestName || 'your current option'} at ${card.position}. Key profile: ${movement}.`
        : `${card.name} si legge come upgrade su ${bestName || 'l’opzione attuale'} in ${card.position}. Profilo chiave: ${movement}.`,
      lang === 'en'
        ? `${secondLine} Worth a spot in your shortlist if you want to strengthen this lane.`
        : `${secondLine} Merita la shortlist se vuoi rinforzare questa corsia.`
    ]
  }

  if (duplicate || starterBlocked) {
    if (diversification?.differentMovement) {
      return [
        lang === 'en'
          ? `${card.name} does not replace ${bestName || 'your starter'} automatically, but adds a different movement profile (${movement}) in the same ${role} lane.`
          : `${card.name} non sostituisce ${bestName || 'il titolare'} in automatico, ma aggiunge un profilo di movimento diverso (${movement}) nella stessa corsia ${role}.`,
        lang === 'en'
          ? `${secondLine} Strong pick if you want to diversify attacks or change match plans without rebuilding the squad.`
          : `${secondLine} Ottima scelta se vuoi diversificare l’attacco o cambiare piano partita senza rifare la rosa.`
      ]
    }
    return [
      lang === 'en'
        ? `${card.name} overlaps ${alternatives || bestName || 'your current options'} in ${card.position} with a similar profile (${movement}).`
        : `${card.name} si sovrappone a ${alternatives || bestName || 'le opzioni attuali'} in ${card.position} con profilo simile (${movement}).`,
      lang === 'en'
        ? `${secondLine} Buy mainly if you want that specific profile; otherwise coins are better on an uncovered role.`
        : `${secondLine} Compra soprattutto se vuoi proprio quel profilo; altrimenti i coins valgono di più su un ruolo scoperto.`
    ]
  }

  return [
    lang === 'en'
      ? `${card.name} can help the ${card.position} lane compared with ${bestName || 'your current option'}, but the decision depends on movement, skill fit and roster use.`
      : `${card.name} può aiutare la corsia ${card.position} rispetto a ${bestName || 'l’opzione attuale'}, ma la decisione dipende da movimento, skill e uso nella rosa.`,
    lang === 'en'
      ? `${secondLine} Put him on the shortlist only if that role is where you want to spend coins now.`
      : `${secondLine} Tienilo in lista solo se quel ruolo è dove vuoi spendere coins adesso.`
  ]
}

function teamSynergyLabel(score, lang) {
  if (score >= 85) return lang === 'en' ? 'Wow synergy' : 'Sinergia wow'
  if (score >= 72) return lang === 'en' ? 'High synergy' : 'Sinergia alta'
  if (score >= 58) return lang === 'en' ? 'Good synergy' : 'Sinergia buona'
  if (score >= 44) return lang === 'en' ? 'Medium synergy' : 'Sinergia media'
  return lang === 'en' ? 'Low synergy' : 'Sinergia bassa'
}

function addUniqueLine(lines, line) {
  const clean = String(line || '').trim()
  if (!clean || lines.includes(clean)) return
  lines.push(clean)
}

function strongestTrait(technical, position, lang) {
  const family = roleFamily(position)
  if (family === 'gk') return technical.gk >= 78 ? (lang === 'en' ? 'goal reliability' : 'affidabilità in porta') : ''
  if (family === 'def') {
    if (technical.defend >= 78) return lang === 'en' ? 'defensive timing' : 'tempo difensivo'
    if (technical.pace >= 76) return lang === 'en' ? 'recovery speed' : 'velocità di recupero'
  }
  if (family === 'mid') {
    if (technical.pass >= 78) return lang === 'en' ? 'cleaner build-up' : 'costruzione più pulita'
    if (technical.defend >= 74) return lang === 'en' ? 'balance after ball loss' : 'equilibrio dopo perdita palla'
  }
  if (technical.pace >= 78) return lang === 'en' ? 'depth and separation' : 'profondità e strappo'
  if (technical.finish >= 78) return lang === 'en' ? 'finishing threat' : 'minaccia in finalizzazione'
  if (technical.pass >= 76) return lang === 'en' ? 'last-pass quality' : 'qualità nell’ultimo passaggio'
  return ''
}

function teamSynergySummary({ card, score, hasRoster, technical, roleGap, duplicate, starterBlocked, bestAlternative, evidence, tacticalStyle, profile, combo, lang }) {
  const trait = strongestTrait(technical, card.position, lang)
  const style = teamStyleLabel(tacticalStyle, lang)
  const name = userDisplayName(profile)
  const intro = name && lang !== 'en' ? `${name}, ` : ''
  if (!technical.hasCompleteCardData) {
    return lang === 'en'
      ? 'We can show the card profile, but the full technical detail is still needed for a confident team fit.'
      : 'Possiamo leggere il profilo carta, ma serve il dettaglio tecnico completo per un fit squadra davvero affidabile.'
  }
  if (!hasRoster) {
    return lang === 'en'
      ? `${card.name} is a card profile read for now: style, native skills and available stats show what it can bring.`
      : `${card.name} per ora è una lettura carta: stile, abilità native e statistiche disponibili ci dicono cosa può portare.`
  }
  if (combo?.text) {
    return `${intro}${combo.text}`
  }
  if (score >= 78 && roleGap) {
    return lang === 'en'
      ? `${card.name} fills a real squad gap and adds ${trait || 'a different profile'} where your team currently has little direct coverage.`
      : `${intro}${card.name} copre un buco reale della rosa e aggiunge ${trait || 'un profilo diverso'} dove oggi hai poca copertura diretta.`
  }
  if (score >= 68 && evidence.teamStyleFit) {
    return lang === 'en'
      ? `${card.name} fits your ${style || 'current system'} because it adds ${trait || 'a useful technical trait'} to the way you already play.`
      : `${intro}${card.name} si lega al tuo ${style || 'sistema attuale'} perché aggiunge ${trait || 'una qualità tecnica utile'} al modo in cui giochi già.`
  }
  if ((duplicate || starterBlocked) && !evidence.upgradeEdge) {
    if (evidence.diversificationValue) {
      return lang === 'en'
        ? `${card.name} diversifies your ${card.position} lane: same role as ${bestAlternative?.name || 'your starter'}, but a different movement and match plan.`
        : `${intro}${card.name} diversifica la corsia ${card.position}: stesso ruolo di ${bestAlternative?.name || 'il titolare'}, ma movimento e piano partita diversi.`
    }
    if (technical.premiumCard && score >= 68) {
      return lang === 'en'
        ? `${card.name} is a premium option for a covered role: not an automatic starter, but worth buying if you want elite rotation or a different match plan.`
        : `${intro}${card.name} è un’opzione premium in un ruolo già coperto: non titolare automatico, ma da comprare se vuoi rotazione d’élite o un piano partita diverso.`
    }
    return lang === 'en'
      ? `${card.name} is useful as a different option in your roster, but it does not clearly change the main balance of your current players.`
      : `${intro}${card.name} è utile come opzione diversa nella tua rosa, ma non cambia in modo chiaro l’equilibrio principale dei tuoi giocatori attuali.`
  }
  if (evidence.upgradeEdge && (duplicate || starterBlocked || score >= 66)) {
    return lang === 'en'
      ? `${card.name} can upgrade your ${card.position} lane with a stronger profile than ${bestAlternative?.name || 'your current option'}.`
      : `${intro}${card.name} può migliorare la corsia ${card.position} con un profilo più forte di ${bestAlternative?.name || 'l’opzione attuale'}.`
  }
  if (evidence.profileNeedFit) {
    return lang === 'en'
      ? `${card.name} is interesting because it connects with one of your current improvement areas through its style and native skills.`
      : `${intro}${card.name} è interessante perché si collega a una tua area di miglioramento, non solo ai dati generali della carta.`
  }
  return lang === 'en'
    ? `${card.name} can help your team in specific scenarios, especially when you need ${trait || 'a different technical solution'}.`
    : `${intro}${card.name} può aiutarti in scenari specifici, soprattutto quando ti serve ${trait || 'una soluzione tecnica diversa'}.`
}

function teamSynergyReasons({ card, sameRole, bestAlternative, roleGap, duplicate, starterBlocked, technical, tacticalStyle, patterns, profileRead, evidence, combo, diversification, lang }) {
  const lines = []
  const trait = strongestTrait(technical, card.position, lang)
  const movementRead = movementArchetype(technical, card.position, lang)
  const fitLine = tacticalStyleFit(technical, card.position, tacticalStyle, profileRead, lang)
  const edgeLine = statEdgeLine(card.position, technical, bestAlternative, lang)
  const mapLine = tacticalMapLine(patterns, card.position, lang)
  if (combo?.detail) addUniqueLine(lines, combo.detail)
  if (roleGap) {
    addUniqueLine(lines, lang === 'en'
      ? `Covers a role where your roster has no direct high-confidence option.`
      : `Copre un ruolo dove oggi non hai una vera alternativa diretta.`)
  }
  if (duplicate || starterBlocked) {
    if (diversification?.line) {
      addUniqueLine(lines, diversification.line)
    } else {
      addUniqueLine(lines, lang === 'en'
        ? `Your current players already cover similar spaces, so this card matters when it gives you a different use.`
        : `I tuoi giocatori coprono già spazi simili, quindi questa carta conta quando ti dà un uso diverso.`)
    }
  }
  if (evidence.diversificationValue) {
    addUniqueLine(lines, lang === 'en'
      ? `Buying here is about squad variety and rotation, not replacing your starter every week.`
      : `L’acquisto qui è per varietà e rotazione, non per sostituire il titolare ogni settimana.`)
  }
  if (technical.premiumCard && (duplicate || starterBlocked)) {
    addUniqueLine(lines, lang === 'en'
      ? `Premium card: evaluate it also as elite rotation, special trait value or role plan, not only as a starter replacement.`
      : `Carta premium: valutala anche come rotazione d'élite, valore tratto speciale o piano ruolo, non solo come sostituzione del titolare.`)
  }
  if (trait) {
    addUniqueLine(lines, lang === 'en'
      ? `Adds ${trait}, a trait that changes how the role can be used.`
      : `Aggiunge ${trait}, una caratteristica che cambia come puoi usare quel ruolo.`)
  }
  if (movementRead.label) {
    addUniqueLine(lines, lang === 'en'
      ? `${movementRead.label}: ${movementRead.movement}; buy when ${movementRead.buyWhen}.`
      : `${movementRead.label}: ${movementRead.movement}; compralo quando ${movementRead.buyWhen}.`)
  }
  if (fitLine) addUniqueLine(lines, fitLine)
  if (edgeLine) addUniqueLine(lines, edgeLine)
  if (evidence.profileNeedFit) {
    addUniqueLine(lines, lang === 'en'
      ? `Matches one of your current improvement priorities from profile or match reads.`
      : `Risponde a una priorità emersa dal profilo o dalle letture partita.`)
  }
  if (mapLine) addUniqueLine(lines, mapLine)
  return lines.slice(0, 3)
}

function synergyUseLine({ card, sameRole, bestAlternative, duplicate, starterBlocked, upgradeEdge, technical, tacticalStyle, profileRead, lang }) {
  const movementRead = movementArchetype(technical, card.position, lang)
  const movement = movementRead.label
    ? `${movementRead.label}: ${movementRead.movement}`
    : movementProfile(technical, card.position, lang)
  const trait = strongestTrait(technical, card.position, lang)
  const fitLine = tacticalStyleFit(technical, card.position, tacticalStyle, profileRead, lang)
  const currentReference = bestAlternative?.name
  if (upgradeEdge && currentReference) {
    return lang === 'en'
      ? `${card.name} profiles as an upgrade on ${currentReference} at ${card.position}: ${movement}. ${fitLine || 'Worth testing in your main XI or as a strong rotation option.'}`
      : `${card.name} si legge come upgrade su ${currentReference} in ${card.position}: ${movement}. ${fitLine || 'Da provare tra i titolari o come rotazione forte.'}`
  }
  if (duplicate || starterBlocked) {
    return lang === 'en'
      ? `${card.name} is not the natural first choice for your current players. Use him when you want ${trait || movement}, without forcing him into the same spaces already owned by your key players.`
      : `${card.name} non è la prima scelta naturale per i tuoi giocatori attuali. Usalo quando vuoi ${trait || movement}, senza forzarlo negli stessi spazi già occupati dai tuoi giocatori chiave.`
  }
  if (currentReference) {
    return lang === 'en'
      ? `${card.name} makes sense if you want a different movement from ${currentReference}: ${movement}. ${fitLine || 'Use him when that lane needs a new tempo or a different final-third connection.'}`
      : `${card.name} ha senso se vuoi un movimento diverso da ${currentReference}: ${movement}. ${fitLine || 'Usalo quando quella zona ha bisogno di un ritmo nuovo o di una connessione diversa negli ultimi metri.'}`
  }
  return lang === 'en'
    ? `${card.name} can become useful because he adds ${trait || movement} to a zone where your squad has less direct coverage.`
    : `${card.name} può diventare utile perché aggiunge ${trait || movement} in una zona dove la tua rosa ha meno copertura diretta.`
}

function coachAdvice({ card, hasRoster, technical, combo, duplicate, starterBlocked, roleGap, evidence, tacticalStyle, profile, lang }) {
  const name = userDisplayName(profile)
  const intro = name && lang !== 'en' ? `${name}, ` : ''
  const movementRead = movementArchetype(technical, card.position, lang)
  const movement = movementRead.label
    ? `${movementRead.label}: ${movementRead.movement}`
    : movementProfile(technical, card.position, lang)
  const trait = strongestTrait(technical, card.position, lang)
  const style = teamStyleLabel(tacticalStyle, lang)

  if (!hasRoster) {
    return {
      title: lang === 'en' ? 'Card read' : 'Lettura carta',
      text: lang === 'en'
        ? `${card.name} is best read from style and native skills for now. The profile points to ${movement}; load your roster to know if that movement creates a real combo for your players.`
        : `${card.name} va letto prima da stile e abilità native. Il profilo porta ${movement}; con la rosa caricata possiamo dirti se quel movimento crea una combo reale con i tuoi giocatori.`,
      action: lang === 'en'
        ? 'Use this as a card review, not a personal roster verdict yet.'
        : 'Usala come review della carta, non ancora come verdetto personale sulla tua rosa.'
    }
  }

  if (combo?.key === 'cross-aerial') {
    return {
      title: lang === 'en' ? 'Real wide combo' : 'Combo reale sulla fascia',
      text: lang === 'en'
        ? `${card.name} is useful because the crossing skill has a target in your roster. This is the kind of card I would use to turn the wide lane into chances, not just to add another full-back.`
        : `${intro}${card.name} è utile perché la skill da cross trova un riferimento nella tua rosa. È una carta da usare per trasformare la fascia in occasioni, non solo per aggiungere un altro esterno.`,
      action: lang === 'en'
        ? 'Use him when you want width, early balls and pressure into the box.'
        : 'Usalo quando vuoi ampiezza, palloni messi presto e più presenza in area.'
    }
  }

  if (combo?.key === 'cross-no-target') {
    return {
      title: lang === 'en' ? 'Good skill, incomplete combo' : 'Skill forte, combo incompleta',
      text: lang === 'en'
        ? `${card.name} brings width and crossing, but your roster does not give that skill a strong box target yet. I would not make him a priority unless you want to change how you attack from wide areas.`
        : `${intro}${card.name} porta ampiezza e cross, ma nella tua rosa quella skill non ha ancora un riferimento forte in area. Non la metterei tra le priorità, a meno che tu voglia cambiare il modo in cui attacchi dalle fasce.`,
      action: lang === 'en'
        ? 'Useful for width; less useful if your attack stays mostly on the ground.'
        : 'Utile per dare ampiezza; meno utile se il tuo attacco resta soprattutto palla a terra.'
    }
  }

  if (combo?.key === 'through-depth') {
    return {
      title: lang === 'en' ? 'Vertical combo' : 'Combo verticale',
      text: lang === 'en'
        ? `${card.name} has a clear use: serve players who attack space. In your roster the pass has a runner, so this card can speed up your attacks instead of slowing the play down.`
        : `${intro}${card.name} ha un uso chiaro: servire chi attacca lo spazio. Nella tua rosa il passaggio trova un corridore, quindi questa carta può velocizzare l’attacco invece di rallentare il gioco.`,
      action: lang === 'en'
        ? 'Use him when you want earlier vertical passes and runs behind the line.'
        : 'Usalo quando vuoi verticalizzare prima e attaccare alle spalle della linea.'
    }
  }

  if (combo?.key === 'creator-finisher') {
    return {
      title: lang === 'en' ? 'Finishing combo' : 'Combo finalizzazione',
      text: lang === 'en'
        ? `${card.name} becomes more interesting because your roster already has a creator. The value is not generic: it is the link between service and first-time finishing.`
        : `${intro}${card.name} diventa più interessante perché nella tua rosa c’è già chi può creare. Il valore non è generico: è il collegamento tra servizio e chiusura di prima.`,
      action: lang === 'en'
        ? 'Use him near the box, where clean service turns into quick shots.'
        : 'Usalo vicino all’area, dove un servizio pulito può diventare tiro rapido.'
    }
  }

  if (combo?.key === 'defensive-need') {
    return {
      title: lang === 'en' ? 'Defensive answer' : 'Risposta difensiva',
      text: lang === 'en'
        ? `${card.name} is not just another defensive card: the native skills connect with a need already visible in your data. I would value him when you want more coverage, duels and interceptions.`
        : `${intro}${card.name} non è solo un’altra carta difensiva: le skill native si collegano a un bisogno già visibile nei tuoi dati. La valuterei quando vuoi più copertura, duelli e intercetti.`,
      action: lang === 'en'
        ? 'Use him to stabilize the zone before looking for a more attacking option.'
        : 'Usalo per stabilizzare la zona prima di cercare una soluzione più offensiva.'
    }
  }

  if (duplicate || starterBlocked) {
    if (evidence.diversificationValue) {
      return {
        title: lang === 'en' ? 'Diversify the lane' : 'Diversifica il reparto',
        text: lang === 'en'
          ? `${card.name} gives you another way to play ${card.position}: ${movement}. That is real value if you like rotating profiles, not only chasing a new starter.`
          : `${intro}${card.name} ti dà un altro modo di giocare ${card.position}: ${movement}. È valore reale se ti piace ruotare i profili, non solo cercare un nuovo titolare.`,
        action: lang === 'en'
          ? 'Buy when you want tactical variety in the same role; rotate by match plan.'
          : 'Compralo quando vuoi varietà tattica nello stesso ruolo; ruota in base al piano partita.'
      }
    }
    if (technical.premiumCard) {
      return {
        title: lang === 'en' ? 'Premium rotation' : 'Rotazione premium',
        text: lang === 'en'
          ? `${card.name} does not need to erase your starter to be worth coins: as a premium card, value it for ${trait || movement}, rotation and match-plan flexibility.`
          : `${intro}${card.name} non deve per forza cancellare il titolare per valere coins: da carta premium va valutato per ${trait || movement}, rotazione e flessibilità nel piano partita.`,
        action: lang === 'en'
          ? 'Buy if you want that premium option, not only if he starts every match.'
          : 'Compralo se vuoi quell’opzione premium, non solo se parte titolare sempre.'
      }
    }
    return {
      title: lang === 'en' ? 'Not a priority' : 'Non è una priorità',
      text: lang === 'en'
        ? `${card.name} does not change the balance of your current players enough. I would keep him as a situational option, useful when you specifically want ${trait || movement}.`
        : `${intro}${card.name} non cambia abbastanza l’equilibrio dei tuoi giocatori attuali. Lo terrei come opzione situazionale, utile quando vuoi proprio ${trait || movement}.`,
      action: lang === 'en'
        ? 'Do not force him as a starter; use him for that specific match need.'
        : 'Non forzarlo come titolare: usalo per quel bisogno specifico di partita.'
    }
  }

  if (roleGap || evidence.profileNeedFit || evidence.teamStyleFit) {
    return {
      title: lang === 'en' ? 'Useful fit' : 'Fit utile',
      text: lang === 'en'
        ? `${card.name} gives your roster something recognizable: ${trait || movement}. With ${style || 'your current setup'}, I would test him where that quality is missing most.`
        : `${intro}${card.name} dà alla tua rosa qualcosa di riconoscibile: ${trait || movement}. Con ${style || 'il tuo assetto attuale'}, lo proverei dove questa qualità ti manca di più.`,
      action: lang === 'en'
        ? 'Use him to change the lane behaviour, not just to fill a position.'
        : 'Usalo per cambiare il comportamento della zona, non solo per riempire un ruolo.'
    }
  }

  return {
    title: lang === 'en' ? 'Situational card' : 'Carta situazionale',
    text: lang === 'en'
      ? `${card.name} has a readable profile, but I do not see a strong roster trigger yet. He is useful if you want ${trait || movement}; otherwise he stays behind clearer needs.`
      : `${intro}${card.name} ha un profilo leggibile, ma non vedo ancora un trigger forte nella tua rosa. È utile se vuoi ${trait || movement}; altrimenti resta dietro bisogni più chiari.`,
    action: lang === 'en'
      ? 'Keep him for a specific use case, not as an automatic priority.'
      : 'Tienilo per un uso specifico, non come priorità automatica.'
  }
}

function teamSynergyDetails({ card, sameRole, bestAlternative, roleGap, duplicate, starterBlocked, upgradeEdge, technical, tacticalStyle, profileRead, issues, gameRead, evidence, combo, lang }) {
  const details = []
  const family = roleFamily(card.position)
  const teamStyle = teamStyleLabel(tacticalStyle, lang)
  const movementRead = movementArchetype(technical, card.position, lang)
  const movement = movementRead.label
    ? `${movementRead.label}: ${movementRead.movement}`
    : movementProfile(technical, card.position, lang)
  const physicalBase = Math.max(technical.physical || 0, technical.aerial || 0, family === 'def' ? technical.pace || 0 : 0)
  const physicalEdge = bestAlternative?.signals
    ? Math.max(
        (technical.physical || 0) - (bestAlternative.signals.physical || 0),
        (technical.aerial || 0) - (bestAlternative.signals.aerial || 0),
        (technical.pace || 0) - (bestAlternative.signals.pace || 0)
      )
    : 0

  if (combo) {
    details.push({
      key: 'combo',
      label: combo.label,
      score: null,
      text: combo.detail || combo.text
    })
  }
  if (movementRead.label) {
    details.push({
      key: 'movement_body',
      label: lang === 'en' ? 'Movement and body type' : 'Movimento e body type',
      score: clamp(55 + movementRead.score * 4, 45, 90),
      text: lang === 'en'
        ? `${movementRead.label}: ${movementRead.movement}. Best when ${movementRead.buyWhen}; caution: ${movementRead.caution || 'judge it with your role plan'}.`
        : `${movementRead.label}: ${movementRead.movement}. Rende quando ${movementRead.buyWhen}; attenzione: ${movementRead.caution || 'valutalo col piano ruolo'}.`
    })
  }

  details.push({
    key: 'style',
    label: lang === 'en' ? 'Movement' : 'Movimento',
    score: evidence.teamStyleFit ? 78 : tacticalStyle ? 56 : 50,
    text: evidence.teamStyleFit
      ? (lang === 'en'
          ? `With ${teamStyle}, this movement has a clear use in how your players already attack or defend.`
          : `Con ${teamStyle}, questo movimento ha un uso chiaro nel modo in cui i tuoi giocatori attaccano o difendono.`)
      : tacticalStyle
        ? (lang === 'en'
            ? `With ${teamStyle}, the value depends on using the card in the right lane and not forcing the movement.`
            : `Con ${teamStyle}, il valore dipende dall’usare la carta nella corsia giusta senza forzare il movimento.`)
        : (lang === 'en'
            ? `The card movement is readable, but team style would make this part sharper.`
            : `Il movimento della carta è leggibile, ma lo stile squadra renderebbe questa parte più precisa.`)
  })

  details.push({
    key: 'physicality',
    label: lang === 'en' ? 'Physical profile' : 'Fisicità',
    score: clamp(physicalBase + Math.max(0, physicalEdge), 35, 88),
    text: physicalEdge >= 5
      ? (lang === 'en'
          ? `Compared with ${bestAlternative?.name || 'your current option'}, the physical edge can change duels, aerial balls or recovery runs.`
          : `Rispetto a ${bestAlternative?.name || 'l’opzione attuale'}, il vantaggio fisico può cambiare duelli, palle alte o recuperi.`)
      : physicalBase >= 76
        ? (lang === 'en'
            ? 'The physical base is useful, but it is not automatically a bigger upgrade than your current options.'
            : 'La base fisica è utile, ma non è automaticamente un upgrade netto rispetto alle opzioni attuali.')
        : (lang === 'en'
            ? 'Physical impact is not the main reason to choose this card.'
            : 'L’impatto fisico non è il motivo principale per scegliere questa carta.')
  })

  details.push({
    key: 'squad',
    label: lang === 'en' ? 'Roster impact' : 'Impatto rosa',
    score: roleGap ? 84 : upgradeEdge ? 78 : duplicate || starterBlocked ? 50 : bestAlternative ? 64 : 60,
    text: roleGap
      ? (lang === 'en'
          ? `Clear squad value: you do not have a direct ${card.position} alternative with the same role coverage.`
          : `Valore rosa chiaro: non hai una vera alternativa diretta da ${card.position} con la stessa copertura.`)
      : upgradeEdge
        ? (lang === 'en'
            ? `Profile and potential point to an upgrade over ${bestAlternative?.name || 'your current option'} in the ${card.position} lane.`
            : `Profilo e potenziale indicano un upgrade su ${bestAlternative?.name || 'l’opzione attuale'} nella corsia ${card.position}.`)
        : duplicate || starterBlocked
          ? (lang === 'en'
              ? `${joinedAlternatives(sameRole) || 'Your current options'} already cover this lane; the card must offer a different match plan.`
              : `${joinedAlternatives(sameRole) || 'Le opzioni attuali'} coprono già questa zona; la carta deve offrirti un piano partita diverso.`)
          : (lang === 'en'
              ? `The role is covered, so the question is whether ${movement} gives you a better use case than ${bestAlternative?.name || 'your current option'}.`
              : `Il ruolo è coperto, quindi la domanda è se il ${movement} ti dà un caso d’uso migliore di ${bestAlternative?.name || 'l’opzione attuale'}.`)
  })

  const difficultyMatch = (
    evidence.profileNeedFit ||
    (issues.needDefence && (family === 'def' || family === 'gk')) ||
    (issues.needBuild && family === 'mid') ||
    (issues.needDepth && family === 'att') ||
    (gameRead.passAccuracy != null && gameRead.passAccuracy < 78 && family === 'mid') ||
    (gameRead.shotsConceded != null && gameRead.shotsConceded >= 7 && family === 'def')
  )
  details.push({
    key: 'difficulty',
    label: lang === 'en' ? 'Your difficulties' : 'Tue difficoltà',
    score: difficultyMatch ? 76 : 52,
    text: difficultyMatch
      ? (lang === 'en'
          ? 'This card connects with one of your current weak points, so the recommendation is based on a real need from your data.'
          : 'Questa carta si collega a una tua difficoltà attuale, quindi il consiglio nasce da un bisogno reale emerso dai tuoi dati.')
      : (lang === 'en'
          ? 'No strong link with your current weak points emerged; treat it as a tactical option, not a problem-solver.'
          : 'Non emerge un legame forte con le tue difficoltà attuali: considerala un’opzione tattica, non una soluzione diretta.')
  })

  return details
}

function evaluate({ card, catalogCard, players, formation, coach, tacticalSettings, profile, patterns, gameAnalysis, stylesLookup, lang }) {
  const sameRole = sameRolePlayers(card, players, stylesLookup)
  const hasRoster = players.length > 0
  const hasFormation = Boolean(formation?.formation) && players.some(player => player.slot_index != null && player.slot_index >= 0 && player.slot_index <= 10)
  const hasCoach = Boolean(coach?.coach_name)
  const tacticalStyle = tacticalSettings?.team_playing_style || ''
  const technical = cardTechnicalSignals(card, catalogCard)
  const issues = issuesRead(patterns)
  const profileRead = profileSignals(profile, lang)
  const gameRead = gameSignals(gameAnalysis)
  const movementRead = movementArchetype(technical, card.position, lang)
  const conflict = classifyRosterConflict({ card, technical, sameRole, hasFormation })
  const bestAlternative = conflict.bestAlternative
  const diversification = rosterDiversificationProfile(technical, bestAlternative, card.position, lang)
  const diversificationValue = diversification.differentMovement || diversification.score >= 8
  const roleGap = hasRoster && conflict.roleGap
  const duplicate = hasRoster && conflict.duplicate
  const starterBlocked = hasRoster && conflict.starterBlocked
  const upgradeEdge = hasRoster && conflict.upgradeEdge
  const rosterCrowded = hasRoster && conflict.rosterCrowded
  const combo = hasRoster ? comboRead({ card, technical, players, issues, profileRead, gameRead, lang }) : null
  const evidence = {
    ...decisionEvidence({
      technical,
      sameRole,
      roleGap,
      duplicate,
      starterBlocked,
      tacticalStyle,
      profileRead,
      patterns,
      position: card.position
    }),
    upgradeEdge,
    diversificationValue
  }

  let score = technical.hasCompleteCardData ? 66 : 52
  if (!hasRoster) score = technical.hasCompleteCardData ? 58 : 50
  if (roleGap) score += 20
  if (upgradeEdge) score += 14
  if (technical.premiumCard && technical.hasCompleteCardData) score += 6
  if (duplicate) score -= diversificationValue ? 2 : 6
  if (starterBlocked) score -= diversificationValue ? 1 : 4
  if (diversification.differentMovement) score += 8
  if (diversification.differentBody) score += 3
  if (evidence.hasNativeEdge) score += 6
  if (evidence.hasTacticalFit) score += 6
  if (evidence.teamStyleFit) score += 6
  if (evidence.profileNeedFit) score += 6
  if (evidence.hasMapFit) score += 4
  if (issues.needDefence && (roleFamily(card.position) === 'def' || roleFamily(card.position) === 'gk')) score += 7
  if (issues.needBuild && roleFamily(card.position) === 'mid') score += 7
  if (issues.needDepth && roleFamily(card.position) === 'att') score += 7
  if (issues.needAerial && technical.aerial >= 76) score += 5
  if (movementRead.key === 'goal_poacher' && (issues.needDepth || /contropiede|counter/i.test(String(tacticalStyle || '')))) score += 7
  if (movementRead.key === 'fox_in_box' && (issues.needAerial || technical.aerial >= 74 || /vie laterali|out wide/i.test(String(tacticalStyle || '')))) score += 7
  if (movementRead.key === 'target_man' && (technical.physical >= 76 || technical.aerial >= 76)) score += 6
  if (movementRead.key && movementRead.key !== 'goal_poacher' && movementRead.key !== 'fox_in_box' && movementRead.score >= 7) score += 4
  if (profileRead.needDef && roleFamily(card.position) === 'def') score += 6
  if (profileRead.needBuild && roleFamily(card.position) === 'mid') score += 6
  if (profileRead.needFinishing && roleFamily(card.position) === 'att') score += 6
  if (technical.pace >= 82 || technical.pass >= 82 || technical.defend >= 82 || technical.finish >= 82 || technical.gk >= 82) score += 5
  if (profileRead.networkRisk && roleFamily(card.position) === 'att') score -= 3
  if (gameRead.passAccuracy != null && gameRead.passAccuracy < 78 && roleFamily(card.position) === 'mid') score += 5
  if (gameRead.shotsConceded != null && gameRead.shotsConceded >= 7 && roleFamily(card.position) === 'def') score += 6
  if (rosterCrowded && !upgradeEdge && !roleGap) score -= 4
  score = clamp(score, 28, 95)

  const decision = purchaseDecision({
    score,
    hasRoster,
    hasCompleteCardData: technical.hasCompleteCardData,
    roleGap,
    duplicate,
    starterBlocked,
    upgradeEdge,
    rosterCrowded,
    premiumCard: technical.premiumCard,
    diversificationValue,
    lang
  })
  const synergyLevel = decision.label
  const title = decision.title
  const lever = mainLever(card, technical, roleGap, lang)
  const rosterRead = !hasRoster
    ? [
        lang === 'en'
          ? `${card.name} can be evaluated as a card, but not yet as a purchase for your team.`
          : `${card.name} può essere valutato come carta, ma non ancora come acquisto per la tua squadra.`,
        lang === 'en'
          ? 'Load your roster to see if this card saves coins or duplicates a role you already cover.'
          : 'Carica la rosa per capire se questa carta ti fa risparmiare coins o duplica un ruolo già coperto.'
      ]
    : buildRosterRead({
        card,
        sameRole,
        bestAlternative,
        roleGap,
        duplicate,
        starterBlocked,
        upgradeEdge,
        diversification,
        technical,
        tacticalStyle,
        patterns,
        profileRead,
        lang
      })

  const strengths = cardValueBullets(card, technical, lang)
  const whyItMatters = strengths.slice(0, 3)

  const technicalRisk = lang === 'en'
    ? !technical.hasCompleteCardData
      ? 'Do not make a coins decision until the full card detail is available.'
      : !hasRoster
        ? 'Without your roster, this is a card read only: the real risk is buying a duplicate.'
        : upgradeEdge
          ? 'Coin risk is moderate: profile points to a real upgrade in this lane.'
          : duplicate
            ? diversificationValue
              ? `Low coin risk if you buy to diversify: different movement profile from ${bestAlternative?.name || 'your starter'}.`
              : `Coin risk: ${joinedAlternatives(sameRole) || 'your current options'} already cover this role with a similar profile.`
            : starterBlocked
              ? diversificationValue
                ? `Moderate coin risk: same starter lane, but ${card.name} changes your match plan in ${card.position}.`
                : `Coin risk: ${bestAlternative?.name || 'the starter'} already occupies this lane at a similar or higher level.`
              : 'Coin risk is controlled if this role is one of your current priorities.'
    : !technical.hasCompleteCardData
      ? 'Non prendere decisioni coins finché non è disponibile il dettaglio completo della carta.'
      : !hasRoster
        ? 'Senza rosa questa è solo lettura carta: il rischio reale è comprare un doppione.'
        : upgradeEdge
          ? 'Rischio coins moderato: il profilo indica un upgrade reale in questa corsia.'
          : duplicate
            ? diversificationValue
              ? `Rischio coins basso se compri per diversificare: profilo di movimento diverso da ${bestAlternative?.name || 'il titolare'}.`
              : `Rischio coins: ${joinedAlternatives(sameRole) || 'le opzioni attuali'} coprono già questo ruolo con profilo simile.`
            : starterBlocked
              ? diversificationValue
                ? `Rischio coins moderato: stesso titolare, ma ${card.name} cambia il piano partita in ${card.position}.`
                : `Rischio coins: ${bestAlternative?.name || 'il titolare'} occupa già questa corsia a livello simile o superiore.`
              : 'Rischio coins controllato se questo ruolo è una priorità reale.'

  const purchaseAdvice = lang === 'en'
    ? !hasRoster
      ? 'Load your roster to turn this from a card read into a personal buy/skip verdict.'
      : decision.level === 'buy'
        ? diversificationValue && !upgradeEdge
          ? `Buy ${card.name} if you want to vary your ${card.position} lane without rebuilding the whole squad.`
          : technical.premiumCard
            ? `Buy ${card.name} if you want a premium ${card.position} option, even as strong rotation.`
            : `Prioritize ${card.name} if you want to spend coins on ${card.position}.`
        : decision.level === 'watch' && upgradeEdge
          ? `Strong upgrade case for ${card.position}: compare ${card.name} with ${bestAlternative?.name || 'your starter'} before spending.`
          : decision.level === 'watch' && diversificationValue
            ? `${card.name} makes sense as rotation/diversification in ${card.position}: same role, different tactical profile.`
            : decision.level === 'avoid'
              ? `${card.name} is too similar to what you already have: save coins for an uncovered role or a clearer upgrade.`
              : `Keep ${card.name} on your shortlist for rotation or match-plan use in ${card.position}.`
    : !hasRoster
      ? 'Carica la rosa per trasformare questa lettura carta in un verdetto personale compra/evita.'
      : decision.level === 'buy'
        ? diversificationValue && !upgradeEdge
          ? `Compra ${card.name} se vuoi variare il reparto ${card.position} senza cambiare tutta la rosa.`
          : technical.premiumCard
            ? `Compra ${card.name} se vuoi un’opzione premium in ${card.position}, anche da rotazione forte.`
            : `Dai priorità a ${card.name} se vuoi spendere coins su ${card.position}.`
        : decision.level === 'watch' && upgradeEdge
          ? `Caso upgrade su ${card.position}: confronta ${card.name} con ${bestAlternative?.name || 'il titolare'} prima di spendere.`
          : decision.level === 'watch' && diversificationValue
            ? `${card.name} ha senso come rotazione/diversificazione in ${card.position}: stesso ruolo, profilo tattico diverso.`
            : decision.level === 'avoid'
              ? `${card.name} è troppo simile a ciò che hai già: coins meglio su ruolo scoperto o upgrade più netto.`
              : `Tieni ${card.name} in lista se ${card.position} ti serve per rotazione o piano partita.`

  const legacyTechnicalRisk = lang === 'en'
    ? duplicate
      ? diversificationValue
        ? 'Same role, different tactical profile: strong rotation pick if you like varying match plans.'
        : 'Similar profile to your roster: buy only if you specifically want this movement/style.'
      : starterBlocked
        ? diversificationValue
          ? 'Starter lane is covered, but this card changes how you play the role — rotation value.'
          : 'Starter lane is already occupied at similar level: use this card only with a clear role swap plan.'
        : 'Role usage is clear: keep this card in its native lane to preserve tactical value.'
    : duplicate
      ? diversificationValue
        ? 'Stesso ruolo, profilo tattico diverso: ottima rotazione se ti piace variare il piano partita.'
        : 'Profilo simile alla rosa: compra solo se vuoi proprio questo movimento/stile.'
      : starterBlocked
        ? diversificationValue
          ? 'Corsia titolare coperta, ma la carta cambia come giochi il ruolo — valore da rotazione.'
          : 'Corsia titolare gia occupata a livello simile: usa questa carta solo con un piano chiaro di cambio gerarchie.'
        : 'Uso ruolo chiaro: mantieni la carta nella corsia naturale per preservare valore tattico.'

  const nextCta = !hasRoster
    ? { label: lang === 'en' ? 'Load roster for team synergy' : 'Carica la rosa per la sinergia squadra', target: 'formation' }
    : !hasFormation
      ? { label: lang === 'en' ? 'Save formation for starter fit' : 'Salva formazione per il fit titolari', target: 'formation' }
      : !hasCoach
        ? { label: lang === 'en' ? 'Add coach for team-style fit' : 'Aggiungi coach per il fit stile squadra', target: 'coach' }
        : null
  const teamSynergy = {
    score,
    label: teamSynergyLabel(score, lang),
    coachAdvice: coachAdvice({
      card,
      hasRoster,
      technical,
      combo,
      duplicate,
      starterBlocked,
      roleGap,
      evidence,
      tacticalStyle,
      profile,
      lang
    }),
    summary: teamSynergySummary({
      card,
      score,
      hasRoster,
      technical,
      roleGap,
      duplicate,
      starterBlocked,
      bestAlternative,
      evidence,
      tacticalStyle,
      profile,
      combo,
      lang
    }),
    reasons: teamSynergyReasons({
      card,
      sameRole,
      bestAlternative,
      roleGap,
      duplicate,
      starterBlocked,
      technical,
      tacticalStyle,
      patterns,
      profileRead,
      evidence,
      combo,
      diversification,
      lang
    }),
    useLine: hasRoster && technical.hasCompleteCardData
      ? synergyUseLine({
          card,
          sameRole,
          bestAlternative,
          duplicate,
          starterBlocked,
          upgradeEdge,
          technical,
          tacticalStyle,
          profileRead,
          lang
        })
      : '',
    details: teamSynergyDetails({
      card,
      sameRole,
      bestAlternative,
      roleGap,
      duplicate,
      starterBlocked,
      upgradeEdge,
      technical,
      tacticalStyle,
      profileRead,
      issues,
      gameRead,
      evidence,
      combo,
      lang
    })
  }
  return {
    title,
    synergyLevel,
    score,
    teamSynergy,
    mainLever: lever,
    technicalProfile: technicalProfile(card, technical, lang),
    strengths,
    rosterRead,
    whyItMatters,
    recommendedUse: hasRoster && technical.hasCompleteCardData ? recommendedUse(card, lang, tacticalStyle) : '',
    technicalRisk,
    legacyTechnicalRisk,
    purchaseAdvice,
    coinsRisk: technicalRisk,
    decision,
    alternatives: sameRole,
    nextCta,
    context: {
      hasRoster,
      hasFormation,
      hasCoach,
      hasTacticalSettings: Boolean(tacticalSettings?.team_playing_style),
      hasGameAnalysis: Boolean(gameAnalysis?.stats),
      weakPoint: profile?.ai_weak_point || null,
      recurringIssues: Array.isArray(patterns?.recurring_issues) ? patterns.recurring_issues.slice(0, 3) : [],
      tacticalStyle: tacticalSettings?.team_playing_style || null,
      cardDataSource: technical.dataSource,
      hasCompleteCardData: technical.hasCompleteCardData,
      evidence,
      catalogSource: catalogCard?.source || null,
      activeCoachName: hasCoach ? coach.coach_name : null,
      coachConnectionName: connectionName(coach?.connection) || null
    }
  }
}

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
    }
    const token = extractBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const card = normalizeCard(body.card)
    const lang = body.lang === 'en' ? 'en' : 'it'
    if (!card.name || !card.position) {
      return NextResponse.json({ error: 'Invalid card' }, { status: 400 })
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const userId = await buildUserId(userData, admin)()
    const cardAdvisorCandidates = await fetchCardAdvisorCandidates(admin, card).catch(() => [])
    const efhubDetail = cardAdvisorCandidates.length > 0 ? null : await fetchEfhubCardDetail(card)
    const catalogCard = pickCatalogCard(card, cardAdvisorCandidates) || efhubDetail

    const [
      profile,
      formation,
      players,
      styles,
      coach,
      tacticalSettings,
      patterns,
      gameAnalysis
    ] = userId
      ? await Promise.all([
        safeSupabaseQuery(admin.from('user_profiles').select('first_name, nickname, team_name, ai_weak_point, ai_learn_goals, ai_notes, input_delay, connection_quality, pass_level').eq('user_id', userId).maybeSingle(), {}, 'profile'),
        safeSupabaseQuery(admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(), null, 'formation'),
        safeSupabaseQuery(admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, skills, com_skills, form, base_stats, original_positions, height, weight, current_level, level_cap, active_booster_name').eq('user_id', userId).limit(60), [], 'players'),
        safeSupabaseQuery(admin.from('playing_styles').select('id, name'), [], 'playing styles'),
        safeSupabaseQuery(admin.from('coaches').select('coach_name, playing_style_competence, connection, stat_boosters').eq('user_id', userId).eq('is_active', true).maybeSingle(), null, 'coach'),
        safeSupabaseQuery(admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(), null, 'tactical settings'),
        safeSupabaseQuery(admin.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg').eq('user_id', userId).maybeSingle(), {}, 'tactical patterns'),
        safeSupabaseQuery(admin.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle(), null, 'game analysis')
      ])
      : await Promise.all([
        Promise.resolve({}),
        Promise.resolve(null),
        Promise.resolve([]),
        safeSupabaseQuery(admin.from('playing_styles').select('id, name'), [], 'playing styles'),
        Promise.resolve(null),
        Promise.resolve(null),
        Promise.resolve({}),
        Promise.resolve(null)
      ])

    const stylesLookup = {}
    ;(styles || []).forEach(style => { stylesLookup[style.id] = style.name })
    const evaluation = evaluate({
      card,
      catalogCard,
      players: players || [],
      formation: formation || null,
      coach: coach || null,
      tacticalSettings: tacticalSettings || null,
      profile: profile || {},
      patterns: patterns || {},
      gameAnalysis: gameAnalysis || null,
      stylesLookup,
      lang
    })
    return NextResponse.json({ evaluation })
  } catch (error) {
    console.error('[card-advisor-lab:evaluate] error:', error)
    return NextResponse.json({ error: 'Evaluation unavailable' }, { status: 500 })
  }
}
