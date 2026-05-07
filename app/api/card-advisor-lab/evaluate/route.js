import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POSITION_GROUPS = {
  gk: ['PT'],
  def: ['DC', 'TD', 'TS'],
  mid: ['MED', 'CC', 'TRQ', 'CLS', 'CLD'],
  att: ['P', 'SP', 'ESA', 'EDA']
}

const EFHUB_PLAYER_URL = 'https://efhub.com/players'

const EFHUB_POSITION_MAP = {
  GK: 'PT',
  CB: 'DC',
  RB: 'TD',
  LB: 'TS',
  DMF: 'MED',
  CMF: 'CC',
  AMF: 'TRQ',
  LMF: 'CLS',
  RMF: 'CLD',
  CF: 'P',
  SS: 'SP',
  LWF: 'ESA',
  RWF: 'EDA'
}

const CATALOG_SELECT = [
  'source',
  'source_player_id',
  'player_name',
  'position',
  'card_type',
  'rating',
  'overall_level_1',
  'overall_max_level',
  'playing_style',
  'player_skills',
  'base_stats',
  'max_stats',
  'catalog_ready',
  'needs_review'
].join(',')

function roleFamily(position = '') {
  if (POSITION_GROUPS.gk.includes(position)) return 'gk'
  if (POSITION_GROUPS.def.includes(position)) return 'def'
  if (POSITION_GROUPS.mid.includes(position)) return 'mid'
  return 'att'
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
    imageUrl: String(raw.imageUrl || '').trim(),
    sourcePlayerId: String(raw.sourcePlayerId || '').trim(),
    source: String(raw.source || '').trim()
  }
}

function buildUserId(userData, admin) {
  return async function resolve() {
    let userId = userData.user.id
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      if (!existingProfile?.user_id) throw new Error('User profile not found')
      userId = existingProfile.user_id
    }
    return userId
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

function decodeFlightMarkup(markup = '') {
  return String(markup)
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
}

function extractJsonObject(markup, key) {
  const marker = `"${key}":{`
  const start = markup.indexOf(marker)
  if (start < 0) return null
  const objectStart = start + marker.indexOf('{')
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = objectStart; index < markup.length; index += 1) {
    const char = markup[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        const slice = markup.slice(objectStart, index + 1)
        try {
          return JSON.parse(slice)
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function extractString(markup, key) {
  const match = markup.match(new RegExp(`"${key}":"([^"]*)"`, 'i'))
  return match ? match[1] : ''
}

function extractNumber(markup, key) {
  const match = markup.match(new RegExp(`"${key}":(\\d+)`, 'i'))
  return match ? Number(match[1]) : null
}

function extractStringArray(markup, key) {
  const match = markup.match(new RegExp(`"${key}":\\[(.*?)\\]`, 'i'))
  if (!match) return []
  return match[1]
    .split(',')
    .map(item => item.replace(/^"|"$/g, '').trim())
    .filter(Boolean)
}

function normalizeEfhubPosition(position = '') {
  const value = String(position || '').trim().toUpperCase()
  return EFHUB_POSITION_MAP[value] || value
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

const EFHUB_SKILL_LABELS = {
  heading: { it: 'Colpo di testa', en: 'Heading' },
  manMarking: { it: 'Marcatura a uomo', en: 'Man Marking' },
  interception: { it: 'Intercettazione', en: 'Interception' },
  blocker: { it: 'Blocco', en: 'Blocker' },
  aerialSuperiority: { it: 'Dominio aereo', en: 'Aerial Superiority' },
  slidingTackle: { it: 'Scivolata', en: 'Sliding Tackle' },
  acrobaticClearance: { it: 'Rinvio acrobatico', en: 'Acrobatic Clearance' },
  oneTouchPass: { it: 'Passaggio di prima', en: 'One-touch Pass' },
  throughPassing: { it: 'Passaggio filtrante', en: 'Through Passing' },
  pinpointCrossing: { it: 'Cross calibrato', en: 'Pinpoint Crossing' },
  scissorsFeint: { it: 'Finta doppio passo', en: 'Scissors Feint' },
  crossOverTurn: { it: 'Svolta secca', en: 'Cross Over Turn' },
  cutBehindTurn: { it: 'Taglia alle spalle e gira', en: 'Cut Behind & Turn' },
  firstTimeShot: { it: 'Tiro di prima', en: 'First-time Shot' },
  longRangeShooting: { it: 'Tiro dalla distanza', en: 'Long Range Shooting' },
  fightingSpirit: { it: 'Spirito combattivo', en: 'Fighting Spirit' },
  doubleTouch: { it: 'Doppio tocco', en: 'Double Touch' }
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
  return labelFromMap(EFHUB_SKILL_LABELS, value, lang)
}

async function fetchEfhubCardDetail(card) {
  if (!card.sourcePlayerId || card.source !== 'efhub') return null
  try {
    const sourceUrl = `${EFHUB_PLAYER_URL}/${encodeURIComponent(card.sourcePlayerId)}`
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      cache: 'no-store'
    })
    if (!response.ok) return null

    const markup = decodeFlightMarkup(await response.text())
    const playerDataStart = markup.indexOf('"baseStats":')
    const playerDataMarkup = playerDataStart >= 0 ? markup.slice(playerDataStart) : markup
    const baseStats = extractJsonObject(markup, 'baseStats')
    const maxStats = extractJsonObject(markup, 'maxStats')
    const player = extractJsonObject(markup, 'player')
    const playingStyle = extractString(playerDataMarkup, 'playingStyle')
    const levelCap = extractNumber(playerDataMarkup, 'initialLevelCap')
    const skills = extractStringArray(playerDataMarkup, 'skills')
    const position = normalizeEfhubPosition(player?.position || extractString(playerDataMarkup, 'position') || card.position)

    if (!baseStats && !playingStyle && !player) return null

    return {
      source: 'efhub',
      source_player_id: card.sourcePlayerId,
      source_url: sourceUrl,
      player_name: player?.name || card.name,
      position,
      card_type: card.category || 'Live',
      overall_level_1: Number(player?.overallRating || card.overall) || null,
      overall_max_level: Number(player?.maxOverall || player?.overallRating || card.overall) || null,
      playing_style: player?.playingStyle || playingStyle || '',
      player_skills: skills,
      base_stats: baseStats || null,
      max_stats: maxStats || baseStats || null,
      team_name: player?.team || '',
      league: player?.league || '',
      height: player?.height || null,
      max_level: levelCap,
      data_quality: baseStats ? 'complete' : 'partial',
      catalog_ready: Boolean(baseStats),
      needs_review: !baseStats
    }
  } catch (error) {
    console.warn('[card-advisor-lab:evaluate] EFHub detail unavailable:', error)
    return null
  }
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

async function fetchCatalogCandidates(admin, card) {
  const tasks = []
  if (card.sourcePlayerId && card.source === 'pesdb') {
    tasks.push(
      admin
        .from('player_catalog')
        .select(CATALOG_SELECT)
        .eq('source', 'pesdb')
        .eq('source_player_id', card.sourcePlayerId)
        .eq('catalog_ready', true)
        .eq('needs_review', false)
        .limit(8)
    )
  }
  const safeName = sanitizeIlike(card.name)
  if (safeName) {
    tasks.push(
      admin
        .from('player_catalog')
        .select(CATALOG_SELECT)
        .ilike('player_name', `%${safeName}%`)
        .eq('source', 'pesdb')
        .eq('position', card.position)
        .eq('catalog_ready', true)
        .eq('needs_review', false)
        .limit(12)
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
  if (candidate.catalog_ready) score += 8
  if (candidate.needs_review) score -= 12
  const baseOverall = Number(card.overall) || 0
  const candidateOverall = Number(candidate.overall_level_1 || candidate.rating || 0)
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
  const statSignals = signalsFromStats({
    ...(catalogCard?.base_stats || {}),
    ...(catalogCard?.max_stats || {})
  })

  return {
    style,
    mergedSkills,
    ...statSignals,
    cardOverall: Number(card.overall) || Number(catalogCard?.overall_level_1) || Number(catalogCard?.rating) || 0,
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
        signals: signalsFromStats(player.base_stats || {}),
        slotIndex: player.slot_index,
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
      return (Number(b.overall) || 0) - (Number(a.overall) || 0)
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
  const skillTags = signals.mergedSkills
    .slice(0, 2)
    .map(skill => labelFromMap(EFHUB_SKILL_LABELS, skill, lang))
    .filter(Boolean)
  return [...tags, ...skillTags].slice(0, 5).filter(Boolean)
}

function mainLever(card, signals, roleGap, upgrade, lang) {
  if (roleGap) return lang === 'en' ? `Role coverage on ${card.position}` : `Copertura ruolo ${card.position}`
  if (upgrade >= 3) return lang === 'en' ? `Level jump in ${card.position}` : `Salto livello in ${card.position}`
  const family = roleFamily(card.position)
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
      return player.overall ? `${player.name} ${player.overall}` : player.name
    })
    .filter(Boolean)
    .join(', ')
}

function describeAlternative(player, targetPosition, lang) {
  if (!player?.name) return ''
  const parts = [`${player.name}${player.overall ? ` ${player.overall}` : ''}`]
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

function purchaseDecision({ score, hasRoster, hasCompleteCardData, roleGap, duplicate, starterBlocked, lang }) {
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
      title: lang === 'en' ? 'Good card read, not your purchase verdict yet' : 'Buona lettura carta, non ancora verdetto per te'
    }
  }
  if (duplicate || starterBlocked) {
    return {
      level: 'avoid',
      label: lang === 'en' ? 'Duplicate risk' : 'Rischio doppione',
      title: lang === 'en' ? 'Not a priority: role already covered' : 'Non prioritario: ruolo già coperto'
    }
  }
  if (roleGap || score >= 74) {
    return {
      level: 'buy',
      label: lang === 'en' ? 'Strong target' : 'Target forte',
      title: lang === 'en' ? 'Worth serious consideration for your team' : 'Da valutare seriamente per la tua squadra'
    }
  }
  if (score >= 58) {
    return {
      level: 'watch',
      label: lang === 'en' ? 'Evaluate' : 'Da valutare',
      title: lang === 'en' ? 'Useful only if the role is a priority' : 'Utile solo se quel ruolo è prioritario'
    }
  }
  return {
    level: 'skip',
    label: lang === 'en' ? 'Low priority' : 'Bassa priorità',
    title: lang === 'en' ? 'Save coins for a clearer upgrade' : 'Risparmia coins per un upgrade più chiaro'
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
        ? `${card.name} is readable by role and overall, but the technical detail is still limited.`
        : `${card.name} è leggibile per ruolo e overall, ma il dettaglio tecnico è ancora limitato.`]
}

function tacticalUseLine(card, technical, tacticalStyle, lang) {
  const family = roleFamily(card.position)
  const style = toAscii(tacticalStyle)
  const cardStyle = toAscii(technical.style)
  const skillsText = toAscii(technical.mergedSkills.join(' '))
  const hasCross = /(cross|pinpoint|calibrato|lofted)/.test(skillsText) || technical.pass >= 74
  const hasDefensiveSkill = /(interception|intercett|marking|marcat|block|muro|tackle|scivolata)/.test(skillsText)
  const hasDribbleSkill = /(double|scissors|turn|feint|finta|svolta|taglia)/.test(skillsText)
  if (family === 'def') {
    if ((cardStyle.includes('full back finisher') || cardStyle.includes('terzino finalizzatore')) && hasCross) {
      return lang === 'en'
        ? `Its real value is the forward movement: overlap, arrive high and turn the action into a cross or low ball.`
        : `Il valore reale è il movimento in avanti: accompagna, arriva alto e trasforma l’azione in cross o palla rasoterra.`
    }
    if (technical.pace >= 74 && (card.position === 'TD' || card.position === 'TS')) {
      return lang === 'en'
        ? `It makes sense only if you want a full-back who can push the exit and still recover space.`
        : `Ha senso solo se vuoi un terzino che accompagni l’uscita e possa comunque recuperare campo.`
    }
    if (hasDefensiveSkill) {
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
  if (hasDribbleSkill && technical.pace >= 78) {
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

function buildRosterRead({ card, sameRole, bestAlternative, roleGap, duplicate, starterBlocked, technical, tacticalStyle, patterns, lang }) {
  const role = positionLabel(card.position, lang)
  const alternatives = topAlternativeDescriptions(sameRole, card.position, lang)
  const bestName = describeAlternative(bestAlternative, card.position, lang)
  const useLine = tacticalUseLine(card, technical, tacticalStyle, lang)
  const mapLine = tacticalMapLine(patterns, card.position, lang)
  const secondLine = mapLine ? `${useLine} ${mapLine}` : useLine

  if (roleGap) {
    return [
      lang === 'en'
        ? `${card.name} has a clear case because your roster does not have a direct ${role} alternative. The read uses his style, native skills and card stats, not a generic overall comparison.`
        : `${card.name} ha un caso chiaro perché nella tua rosa non c’è un’alternativa diretta da ${role}. La lettura usa stile, abilità native e statistiche carta, non solo overall.`,
      lang === 'en'
        ? `${secondLine} This is the kind of card that can save coins later because it closes a real squad gap.`
        : `${secondLine} È il tipo di carta che può farti risparmiare coins dopo, perché chiude un buco reale della rosa.`
    ]
  }

  if (duplicate || starterBlocked) {
    return [
      lang === 'en'
        ? `${card.name} is not a priority because ${alternatives || bestName || 'your current options'} already cover ${card.position}.`
        : `${card.name} non è prioritario perché ${alternatives || bestName || 'le opzioni attuali'} coprono già ${card.position}.`,
      lang === 'en'
        ? `${secondLine} Otherwise you risk adding a duplicate without changing your team output.`
        : `${secondLine} Altrimenti rischi di aggiungere un doppione senza cambiare davvero il rendimento della squadra.`
    ]
  }

  return [
    lang === 'en'
      ? `${card.name} improves the ${card.position} lane compared with ${bestName || 'your current option'}, but it is not automatically a must-buy.`
      : `${card.name} migliora la corsia ${card.position} rispetto a ${bestName || 'l’opzione attuale'}, ma non è automaticamente da prendere.`,
    lang === 'en'
      ? `${secondLine} Put him on the shortlist only if that role is where you want to spend coins now.`
      : `${secondLine} Tienilo in lista solo se quel ruolo è dove vuoi spendere coins adesso.`
  ]
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
  const bestAlternative = sameRole[0]
  const bestOverall = Number(bestAlternative?.overall) || 0
  const currentOverall = Number(technical.cardOverall) || 0
  const upgrade = currentOverall - bestOverall
  const roleGap = hasRoster && sameRole.length === 0
  const duplicate = hasRoster && sameRole.length >= 2 && upgrade <= 1
  const starterBlocked = hasFormation && sameRole.some(player => Number(player.slotIndex) >= 0 && Number(player.slotIndex) <= 10) && upgrade <= 0

  let score = 54
  if (!hasRoster) score = 50
  if (roleGap) score += 18
  if (upgrade >= 4) score += 16
  else if (upgrade >= 2) score += 10
  else if (upgrade >= 0) score += 4
  else if (upgrade <= -3) score -= 14
  else score -= 6
  if (duplicate) score -= 14
  if (starterBlocked) score -= 8
  if (issues.needDefence && (roleFamily(card.position) === 'def' || roleFamily(card.position) === 'gk')) score += 7
  if (issues.needBuild && roleFamily(card.position) === 'mid') score += 7
  if (issues.needDepth && roleFamily(card.position) === 'att') score += 7
  if (issues.needAerial && technical.aerial >= 76) score += 5
  if (profileRead.needDef && roleFamily(card.position) === 'def') score += 6
  if (profileRead.needBuild && roleFamily(card.position) === 'mid') score += 6
  if (profileRead.needFinishing && roleFamily(card.position) === 'att') score += 6
  if (technical.cardOverall >= 95) score += 6
  else if (technical.cardOverall >= 92) score += 3
  if (profileRead.networkRisk && roleFamily(card.position) === 'att') score -= 4
  if (gameRead.passAccuracy != null && gameRead.passAccuracy < 78 && roleFamily(card.position) === 'mid') score += 5
  if (gameRead.shotsConceded != null && gameRead.shotsConceded >= 7 && roleFamily(card.position) === 'def') score += 6
  score = clamp(score, 20, 95)

  const decision = purchaseDecision({
    score,
    hasRoster,
    hasCompleteCardData: technical.hasCompleteCardData,
    roleGap,
    duplicate,
    starterBlocked,
    lang
  })
  const synergyLevel = decision.label
  const title = decision.title
  const lever = mainLever(card, technical, roleGap, upgrade, lang)
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
        technical,
        tacticalStyle,
        patterns,
        lang
      })

  const strengths = cardValueBullets(card, technical, lang)
  const whyItMatters = strengths.slice(0, 3)

  const technicalRisk = lang === 'en'
    ? !technical.hasCompleteCardData
      ? 'Do not make a coins decision until the full EFHub card detail is available.'
      : !hasRoster
        ? 'Without your roster, this is a card read only: the real risk is buying a duplicate.'
        : duplicate
          ? `Coin risk: ${joinedAlternatives(sameRole) || 'your current options'} already cover this role.`
          : starterBlocked
            ? `Coin risk: ${bestAlternative?.name || 'the starter'} already occupies this lane at a similar or higher level.`
            : 'Coin risk is controlled if this role is one of your current priorities.'
    : !technical.hasCompleteCardData
      ? 'Non prendere decisioni coins finché non è disponibile il dettaglio completo EFHub della carta.'
      : !hasRoster
        ? 'Senza rosa questa è solo lettura carta: il rischio reale è comprare un doppione.'
        : duplicate
          ? `Rischio coins: ${joinedAlternatives(sameRole) || 'le opzioni attuali'} coprono già questo ruolo.`
          : starterBlocked
            ? `Rischio coins: ${bestAlternative?.name || 'il titolare'} occupa già questa corsia a livello simile o superiore.`
            : 'Rischio coins controllato se questo ruolo è una priorità reale.'

  const purchaseAdvice = lang === 'en'
    ? !hasRoster
      ? 'Load your roster to turn this from a card read into a personal buy/skip verdict.'
      : decision.level === 'buy'
        ? `Prioritize ${card.name} if you want to spend coins on ${card.position}.`
        : decision.level === 'avoid'
          ? `${card.name} does not change your priorities enough: save coins for an uncovered role or a clearer upgrade.`
          : `Keep ${card.name} on your shortlist only if ${card.position} is a priority.`
    : !hasRoster
      ? 'Carica la rosa per trasformare questa lettura carta in un verdetto personale compra/evita.'
      : decision.level === 'buy'
        ? `Dai priorità a ${card.name} se vuoi spendere coins su ${card.position}.`
        : decision.level === 'avoid'
          ? `${card.name} non cambia abbastanza le priorità: meglio tenere coins per un ruolo scoperto o un upgrade più netto.`
          : `Tieni ${card.name} in lista solo se ${card.position} è una priorità.`

  const legacyTechnicalRisk = lang === 'en'
    ? duplicate
      ? 'Technical duplicate in your roster: keep this card as controlled rotation, not as first purchase target.'
      : starterBlocked
        ? 'Starter lane is already occupied at similar level: use this card only with a clear role swap plan.'
        : 'Role usage is clear: keep this card in its native lane to preserve tactical value.'
    : duplicate
      ? 'Doppione tecnico nella tua rosa: gestisci questa carta da rotazione controllata, non da primo target acquisto.'
      : starterBlocked
        ? 'Corsia titolare gia occupata a livello simile: usa questa carta solo con un piano chiaro di cambio gerarchie.'
        : 'Uso ruolo chiaro: mantieni la carta nella corsia naturale per preservare valore tattico.'

  const nextCta = !hasRoster
    ? { label: lang === 'en' ? 'Load roster for team synergy' : 'Carica la rosa per la sinergia squadra', target: 'formation' }
    : !hasFormation
      ? { label: lang === 'en' ? 'Save formation for starter fit' : 'Salva formazione per il fit titolari', target: 'formation' }
      : !hasCoach
        ? { label: lang === 'en' ? 'Add coach for team-style fit' : 'Aggiungi coach per il fit stile squadra', target: 'coach' }
        : null
  return {
    title,
    synergyLevel,
    score,
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
    const efhubDetail = await fetchEfhubCardDetail(card)
    const catalogCandidates = efhubDetail ? [] : await fetchCatalogCandidates(admin, card).catch(() => [])
    const catalogCard = efhubDetail || pickCatalogCard(card, catalogCandidates)
    const [
      profileRes,
      formationRes,
      playersRes,
      stylesRes,
      coachRes,
      tacticalRes,
      patternsRes,
      gameAnalysisRes
    ] = await Promise.all([
      admin.from('user_profiles').select('ai_weak_point, ai_learn_goals, ai_notes, input_delay, connection_quality, pass_level').eq('user_id', userId).maybeSingle(),
      admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
      admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, skills, com_skills, form, base_stats, original_positions, height, weight').eq('user_id', userId).limit(60),
      admin.from('playing_styles').select('id, name'),
      admin.from('coaches').select('coach_name, playing_style_competence, connection, stat_boosters').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
      admin.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg').eq('user_id', userId).maybeSingle(),
      admin.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle()
    ])
    const stylesLookup = {}
    ;(stylesRes.data || []).forEach(style => { stylesLookup[style.id] = style.name })
    const evaluation = evaluate({
      card,
      catalogCard,
      players: playersRes.data || [],
      formation: formationRes.data || null,
      coach: coachRes.data || null,
      tacticalSettings: tacticalRes.data || null,
      profile: profileRes.data || {},
      patterns: patternsRes.data || {},
      gameAnalysis: gameAnalysisRes.data || null,
      stylesLookup,
      lang
    })
    return NextResponse.json({ evaluation })
  } catch (error) {
    console.error('[card-advisor-lab:evaluate] error:', error)
    return NextResponse.json({ error: 'Evaluation unavailable' }, { status: 500 })
  }
}
