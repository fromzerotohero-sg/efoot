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

function sanitizeIlike(value = '') {
  return String(value).replace(/[%_]/g, '').trim()
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

async function fetchCatalogCandidates(admin, card) {
  const tasks = []
  if (card.sourcePlayerId) {
    tasks.push(
      admin
        .from('player_catalog')
        .select(CATALOG_SELECT)
        .eq('source_player_id', card.sourcePlayerId)
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
        .eq('position', card.position)
        .eq('catalog_ready', true)
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
  const statMap = {
    ...collectNumbers(catalogCard?.base_stats),
    ...collectNumbers(catalogCard?.max_stats)
  }
  const pace = scoreByKeywords(statMap, ['speed', 'accel', 'pace'])
  const pass = scoreByKeywords(statMap, ['pass', 'cross', 'curl'])
  const defend = scoreByKeywords(statMap, ['defen', 'tackl', 'intercept', 'aggression'])
  const finish = scoreByKeywords(statMap, ['finish', 'kicking', 'shot', 'offens', 'heading'])
  const physical = scoreByKeywords(statMap, ['stamina', 'phys', 'balance', 'jump'])
  const gk = scoreByKeywords(statMap, ['gk', 'keeper', 'saving', 'catch'])
  const aerial = scoreByKeywords(statMap, ['jump', 'heading', 'aerial'])

  return {
    style,
    mergedSkills,
    pace,
    pass,
    defend,
    finish,
    physical,
    gk,
    aerial,
    cardOverall: Number(card.overall) || Number(catalogCard?.overall_level_1) || Number(catalogCard?.rating) || 0
  }
}

function sameRolePlayers(card, players, stylesLookup) {
  return (players || [])
    .filter(player => player?.position === card.position)
    .map(player => ({
      name: player.player_name,
      overall: player.overall_rating,
      style: styleName(player, stylesLookup),
      skills: [...(Array.isArray(player.skills) ? player.skills : []), ...(Array.isArray(player.com_skills) ? player.com_skills : [])].slice(0, 6),
      slotIndex: player.slot_index
    }))
    .sort((a, b) => (Number(b.overall) || 0) - (Number(a.overall) || 0))
    .slice(0, 4)
}

function connectionName(connection) {
  if (!connection || typeof connection !== 'object') return ''
  return connection.name || connection.connection || connection.title || connection.label || ''
}

function connectionFit(card, coach) {
  const name = connectionName(coach?.connection)
  if (!name) return { label: '', impact: 'missing', textIt: '', textEn: '' }
  const family = roleFamily(card.position)
  const lower = name.toLowerCase()
  const supportAtt = ['spazio', 'over', 'profond', 'cross', 'testa', 'header', 'switch']
  const supportBuild = ['possesso', 'pass', 'regia', 'build', 'palleggio', 'controllo']
  const supportDef = ['press', 'duel', 'recuper', 'compact', 'copertura', 'mark']
  let impact = 'medium'
  if (supportAtt.some(key => lower.includes(key)) && family === 'att') impact = 'high'
  if (supportBuild.some(key => lower.includes(key)) && family === 'mid') impact = 'high'
  if (supportDef.some(key => lower.includes(key)) && (family === 'def' || family === 'mid')) impact = 'high'
  if (supportAtt.some(key => lower.includes(key)) && family === 'def') impact = 'low'
  const textIt = impact === 'high'
    ? `Il Link-up ${name} entra bene su ${card.name}: aggiunge valore diretto nel tuo assetto.`
    : impact === 'low'
      ? `Il Link-up ${name} pesa poco su ${card.name}: la carta rende soprattutto per il ruolo base.`
      : `Il Link-up ${name} lavora come supporto su ${card.name}: il valore principale resta il fit ruolo.`
  const textEn = impact === 'high'
    ? `Link-up ${name} fits ${card.name} well: it adds direct value to your setup.`
    : impact === 'low'
      ? `Link-up ${name} has low impact on ${card.name}: the card value stays on the base role.`
      : `Link-up ${name} works as support on ${card.name}: the main value is still role fit.`
  return { label: name, impact, textIt, textEn }
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
  const styleTag = signals.style
    ? (lang === 'en' ? `Style: ${signals.style}` : `Stile: ${signals.style}`)
    : null
  if (styleTag) tags.unshift(styleTag)
  const skillTags = signals.mergedSkills.slice(0, 2).map(skill => String(skill))
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
    inputDelayLabel: profile?.input_delay || null,
    note: lang === 'en'
      ? (profile?.ai_weak_point ? `Profile priority: ${profile.ai_weak_point}` : '')
      : (profile?.ai_weak_point ? `Priorita profilo: ${profile.ai_weak_point}` : '')
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

function synergyBand(score, lang) {
  if (score >= 74) return lang === 'en' ? 'High synergy' : 'Sinergia alta'
  if (score >= 58) return lang === 'en' ? 'Medium synergy' : 'Sinergia media'
  return lang === 'en' ? 'Low synergy' : 'Sinergia bassa'
}

function joinedAlternatives(sameRole = []) {
  return sameRole.slice(0, 3).map(player => player.name).filter(Boolean).join(', ')
}

function evaluate({ card, catalogCard, players, formation, coach, tacticalSettings, profile, patterns, gameAnalysis, stylesLookup, lang }) {
  const sameRole = sameRolePlayers(card, players, stylesLookup)
  const hasRoster = players.length > 0
  const hasFormation = Boolean(formation?.formation) && players.some(player => player.slot_index != null && player.slot_index >= 0 && player.slot_index <= 10)
  const hasCoach = Boolean(coach?.coach_name)
  const conn = connectionFit(card, coach)
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
  if (conn.impact === 'high') score += 8
  if (conn.impact === 'low') score -= 5
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

  const synergyLevel = hasRoster ? synergyBand(score, lang) : (lang === 'en' ? 'Card profile' : 'Profilo carta')
  const title = !hasRoster
    ? (lang === 'en' ? 'Card technical read' : 'Lettura tecnica carta')
    : score >= 74
      ? (lang === 'en' ? 'High priority for your setup' : 'Priorita alta nel tuo assetto')
      : score >= 58
        ? (lang === 'en' ? 'Useful integration' : 'Inserimento utile')
        : (lang === 'en' ? 'Low purchase priority' : 'Priorita acquisto bassa')
  const lever = mainLever(card, technical, roleGap, upgrade, lang)
  const alternativesText = joinedAlternatives(sameRole)
  const rosterRead = !hasRoster
    ? [
        lang === 'en'
          ? `${card.name} is evaluated as a standalone profile in ${card.position}, without roster overlap checks.`
          : `${card.name} viene valutato come profilo standalone in ${card.position}, senza confronto con la tua rosa.`,
        lang === 'en'
          ? 'Load your roster to unlock starter fit, duplicates, and real purchase priority.'
          : 'Carica la rosa per sbloccare fit titolari, doppioni e priorita reale di acquisto.'
      ]
    : roleGap
      ? [
          lang === 'en'
            ? `${card.name} covers ${card.position} immediately because your roster has no direct alternative in this role.`
            : `${card.name} copre subito ${card.position} perche la tua rosa non ha alternativa diretta in questo ruolo.`,
          lang === 'en'
            ? `This card opens a missing tactical slot and raises your structural balance.`
            : 'Questa carta apre uno slot tattico mancante e alza l equilibrio strutturale della squadra.'
        ]
      : duplicate
        ? [
            lang === 'en'
              ? `${card.name} enters as rotation in ${card.position}; ${alternativesText || 'your current options'} already cover this lane.`
              : `${card.name} entra come rotazione in ${card.position}; ${alternativesText || 'le opzioni attuali'} coprono gia questa corsia.`,
            lang === 'en'
              ? 'The upgrade is marginal, so purchase priority stays behind uncovered roles.'
              : 'L upgrade e marginale, quindi la priorita acquisto resta dietro ai ruoli scoperti.'
          ]
        : [
            lang === 'en'
              ? `${card.name} improves your ${card.position} lane versus ${bestAlternative?.name || 'current starter'} with a concrete quality jump.`
              : `${card.name} migliora la corsia ${card.position} rispetto a ${bestAlternative?.name || 'il titolare attuale'} con un salto qualita concreto.`,
            lang === 'en'
              ? 'The value is role impact inside your setup, not an isolated overall number.'
              : 'Il valore e impatto ruolo nel tuo assetto, non un numero overall isolato.'
          ]

  const tacticalRead = issues.recurring.length > 0
    ? (lang === 'en'
        ? `Pattern alignment: ${issues.recurring.slice(0, 2).join(' · ')}.`
        : `Allineamento pattern: ${issues.recurring.slice(0, 2).join(' · ')}.`)
    : (lang === 'en'
        ? 'Pattern alignment uses your current tactical structure and role distribution.'
        : 'Allineamento pattern calcolato su struttura tattica attuale e distribuzione ruoli.')

  const strengths = [...rosterRead, tacticalRead]
  if (profileRead.note) strengths.push(profileRead.note)
  const whyItMatters = strengths.slice(0, 3)

  const technicalRisk = lang === 'en'
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
        ? { label: lang === 'en' ? 'Add coach for Link-up fit' : 'Aggiungi coach per il fit Link-up', target: 'coach' }
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
    coachLinkup: conn.textEn && lang === 'en' ? conn.textEn : conn.textIt,
    recommendedUse: recommendedUse(card, lang, tacticalStyle),
    technicalRisk,
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
      catalogSource: catalogCard?.source || null
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
    const catalogCandidates = await fetchCatalogCandidates(admin, card).catch(() => [])
    const catalogCard = pickCatalogCard(card, catalogCandidates)
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
