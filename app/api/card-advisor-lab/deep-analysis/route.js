import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { deductCredits, refundCredits } from '@/lib/creditService'
import { getRelevantSections } from '@/lib/ragHelper'
import { getCoachPoliciesText, getCoachSharedCoreText } from '@/lib/coachPromptRules'
import {
  getSkillDisplayLabel,
  getSkillEnglishItalianGlossary,
  localizeSkillTermsInText,
  normalizePlayerSkillsArray
} from '@/lib/playerSkillLabels.js'
import { CARD_ADVISOR_SELECT, searchCardAdvisorCardsByName } from '@/lib/cardAdvisorCardsLookup.js'
import { fetchEfhubCardDetail } from '@/lib/efhubPlayerDetail.js'
import { buildSkillDeltaSentence } from '@/lib/cardAdvisorSkillCompare.js'
import { computeCardAdvisorBuildPreview } from '@/lib/cardAdvisorBuildPreview.js'
import {
  buildPurchaseFactsBlock,
  effectiveFieldRole,
  isPremiumCatalogCard,
  normalizePurchaseFit,
  roleFamily
} from '@/lib/cardAdvisorPurchaseContext.js'
import { isStarterPlayer } from '@/lib/rosterSlotUtils.js'
import { buildSkillMechanicsContext } from '@/lib/playerSkillSemantics.js'
import { getPlayerBaselineStats } from '@/lib/playerEffectiveStats.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEEP_ANALYSIS_COST = 2
const MODEL = process.env.CARD_ADVISOR_DEEP_MODEL || 'gpt-5.2'

/** Stili di gioco COM; abilità native → getSkillEnglishItalianGlossary (IT ufficiale in-game). */
const STYLE_AND_MECHANIC_GLOSSARY_IT = [
  ['Anchor Man', 'Collante'],
  ['Box To Box', 'Box-to-box'],
  ['Build Up', 'Sviluppo'],
  ['Classic No. 10', 'Classico numero 10'],
  ['Creative Playmaker', 'Regista creativo'],
  ['Dummy Runner', 'Senza palla'],
  ['Extra Frontman', 'Frontale extra'],
  ['Fox In The Box', "Rapace d'area"],
  ['Full-back Finisher', 'Terzino mattatore'],
  ['Goal Poacher', 'Opportunista'],
  ['Hole Player', 'Giocatore chiave'],
  ['Offensive Goalkeeper', 'Portiere offensivo'],
  ['Offensive Wingback', 'Terzino offensivo'],
  ['Orchestrator', 'Orchestratore'],
  ['Prolific Winger', 'Ala prolifica'],
  ['Roaming Flank', 'Taglio al centro'],
  ['Defensive Full-back', 'Terzino difensivo'],
  ['Offensive Full-back', 'Terzino offensivo'],
  ['Destroyer', 'Incontrista'],
  ['Deep-Lying Forward', 'Fulcro di gioco'],
  ['Target Man', 'Fulcro di gioco'],
  ['Second Striker', 'Seconda punta'],
  ['False 9', 'Falso 9']
]

const IT_TERM_GLOSSARY = [...getSkillEnglishItalianGlossary(), ...STYLE_AND_MECHANIC_GLOSSARY_IT]
  .sort((a, b) => b[0].length - a[0].length)

function sanitize(value, maxLen = 500) {
  const text = String(value ?? '').replace(/\r\n|\r|\n/g, ' ').trim()
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function localizeItalianTerms(value = '') {
  let text = localizeSkillTermsInText(String(value || ''), 'it')
  IT_TERM_GLOSSARY.forEach(([en, it]) => {
    text = text.replace(new RegExp(`\\b${escapeRegExp(en)}\\b`, 'gi'), it)
  })
  return text
}

function toAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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
    sourcePlayerId: String(raw.sourcePlayerId || '').trim(),
    source: String(raw.source || '').trim()
  }
}

function bodyTypeRead({ height, weight, position }, lang = 'it') {
  const h = Number(height) || 0
  const w = Number(weight) || 0
  if (!h && !w) return null
  const isEn = lang === 'en'
  const pos = String(position || '').toUpperCase()
  const isAttacker = ['P', 'CF', 'SP', 'ST', 'ESA', 'EDA'].includes(pos)
  if (h >= 188 || w >= 85) {
    return isEn
      ? 'big body type: box reference, contact, aerial duels and shielding'
      : 'body type fisico: riferimento in area, contatto, duelli aerei e protezione'
  }
  if (isAttacker && h <= 175) {
    return isEn
      ? 'compact body type: quick turns, tight control and separation'
      : 'body type compatto: girate rapide, stretto e separazione'
  }
  return isEn
    ? 'balanced body type: read with movement style, not only stats'
    : 'body type equilibrato: da leggere insieme allo stile movimento, non solo alle stats'
}

function styleMovementRead(style, lang = 'it') {
  const s = toAscii(style)
  const isEn = lang === 'en'
  if (s.includes('goal poacher') || s.includes('opportunista')) {
    return isEn
      ? 'Goal Poacher: last-line runner for through balls, depth and counterattacks; not the same as a static box striker.'
      : 'Opportunista: attacca ultima linea, filtranti, profondità e contropiede; non è uguale a una punta statica da area.'
  }
  if (s.includes('fox in the box') || s.includes('rapace')) {
    return isEn
      ? 'Fox in the Box: central penalty-area finisher for crosses, rebounds and quick shots; do not judge it only by pace.'
      : "Rapace d'area: finalizzatore centrale per cross, ribalzi e tiri rapidi; non giudicarlo solo dalla velocità."
  }
  if (s.includes('target man') || s.includes('fulcro')) {
    return isEn
      ? 'Target Man: physical reference for hold-up play, long balls and lay-offs.'
      : 'Fulcro di gioco: riferimento fisico per sponde, lanci lunghi e protezione.'
  }
  if (s.includes('hole player') || s.includes('giocatore chiave')) {
    return isEn
      ? 'Hole Player: late runner from behind into scoring spaces.'
      : 'Giocatore chiave: inserimenti da dietro negli spazi da gol.'
  }
  if (s.includes('prolific winger') || s.includes('ala prolifica')) {
    return isEn
      ? 'Prolific Winger: starts wide and attacks the box/final third.'
      : 'Ala prolifica: parte larga e attacca area/ultimo terzo.'
  }
  return null
}

function collectNumbers(input, bucket = {}, path = '') {
  if (input == null) return bucket
  if (typeof input === 'number' && Number.isFinite(input)) {
    bucket[toAscii(path || 'value')] = input
    return bucket
  }
  if (Array.isArray(input)) {
    input.forEach((entry, index) => collectNumbers(entry, bucket, `${path}_${index}`))
    return bucket
  }
  if (typeof input === 'object') {
    Object.entries(input).forEach(([key, value]) => collectNumbers(value, bucket, path ? `${path}_${key}` : key))
  }
  return bucket
}

function pickStat(stats, keywords = []) {
  const numeric = collectNumbers(stats)
  const values = Object.entries(numeric)
    .filter(([key]) => keywords.some(keyword => key.includes(keyword)))
    .map(([, value]) => Number(value))
    .filter(Number.isFinite)
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function summarizeStats(stats = {}) {
  return {
    speed: pickStat(stats, ['speed', 'accel', 'pace']),
    passing: pickStat(stats, ['pass', 'cross', 'curl']),
    defending: pickStat(stats, ['defen', 'tackl', 'intercept', 'aggression']),
    finishing: pickStat(stats, ['finish', 'kicking', 'shot', 'offens']),
    aerial: pickStat(stats, ['heading', 'jump', 'aerial']),
    physical: pickStat(stats, ['phys', 'contact', 'balance', 'stamina', 'strength'])
  }
}

function hasStats(stats) {
  return Boolean(stats && typeof stats === 'object' && Object.keys(stats).length > 0)
}

function hasAttackCreationTools(analysis, card) {
  if (roleFamily(card?.position) !== 'att') return false
  const text = [
    analysis?.card_identity?.movement,
    analysis?.card_identity?.best_use,
    ...(analysis?.card_identity?.key_skills || []),
    ...(analysis?.pros || []),
    ...(analysis?.synergies || []),
    ...(analysis?.how_to_use || []),
    ...(analysis?.key_reasoning || []).map((row) => `${row.label} ${row.text}`)
  ].join(' ')
  return /(1v1|uno contro uno|dribbl|double touch|doppio tocco|momentum|blitz|curler|tiro a giro|outside|esterno|through|filtrant|pinpoint|cross calibrato|cross|wide|fascia|ampiezza|profond|separaz|cambio ritmo|piede|left|right|sinistro|destro|final third|ultimo terzo)/i.test(text)
}

function hasStarterLevelAttackEdge(analysis, card) {
  if (roleFamily(card?.position) !== 'att') return false
  const text = [
    analysis?.summary,
    analysis?.final_decision,
    analysis?.card_identity?.movement,
    analysis?.card_identity?.best_use,
    ...(analysis?.card_identity?.key_skills || []),
    ...(analysis?.pros || []),
    ...(analysis?.how_to_use || []),
    ...(analysis?.key_reasoning || []).map((row) => `${row.label} ${row.text}`)
  ].join(' ')
  const signals = [
    /(1v1|uno contro uno|dribbl|double touch|doppio tocco|momentum dribbling)/i,
    /(blitz|curler|tiro a giro|outside curler|esterno)/i,
    /(cambio ritmo|tempo change|separaz|acceler|profond|final third|ultimo terzo)/i,
    /(piede|left|right|sinistro|destro|lato)/i,
    /(sostituisce|parte sopra|starter|plan a|piano a|entra al posto)/i
  ]
  return signals.filter((pattern) => pattern.test(text)).length >= 2
}

function stripAnchorRole(label = '') {
  return String(label || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

function sanitizeList(items = [], maxItems = 8, maxLen = 60) {
  return (Array.isArray(items) ? items : [])
    .map(item => sanitize(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems)
}

function canonSkillsForPrompt(rawList, lang, maxItems = 14, maxLen = 60) {
  const code = lang === 'en' ? 'en' : 'it'
  const unique = [...new Set(
    normalizePlayerSkillsArray(Array.isArray(rawList) ? rawList : [])
      .map((s) => getSkillDisplayLabel(String(s || '').trim(), code))
      .filter(Boolean)
  )]
  return sanitizeList(unique, maxItems, maxLen)
}

function compactPlayer(player, stylesLookup = {}, lang = 'it', formation = null) {
  const skills = [
    ...(Array.isArray(player?.skills) ? player.skills : []),
    ...(Array.isArray(player?.com_skills) ? player.com_skills : [])
  ]
  const cardRole = String(player?.position || '').trim().toUpperCase() || null
  const fieldPos = effectiveFieldRole(player, formation) || cardRole
  return {
    name: sanitize(player?.player_name, 60),
    position: fieldPos,
    ...(cardRole && fieldPos && cardRole !== fieldPos ? { card_role: cardRole } : {}),
    starter: isStarterPlayer(player),
    style: (player?.playing_style_id && stylesLookup[player.playing_style_id]) || player?.role || null,
    skills: canonSkillsForPrompt(skills, lang, 8),
    saved_stats: summarizeStats(getPlayerBaselineStats(player, null) || {}),
    stats_basis: {
      source: 'roster_baseline_level_1',
      note: 'Stats di baseline (level-1) del player in rosa, recuperate dal metadata.build_coach.before quando disponibile, altrimenti dalla colonna base_stats se non e stata fatta una build. Confronto coerente con catalogCard.base_stats.',
      current_level: player?.current_level || null,
      level_cap: player?.level_cap || null,
      active_booster_name: player?.active_booster_name || null
    },
    original_positions: Array.isArray(player?.original_positions) ? player.original_positions.slice(0, 6) : [],
    height: player?.height || null,
    weight: player?.weight || null,
    form: player?.form || null
  }
}

async function resolveUserId(userData, admin) {
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

async function fetchCardAdvisorCard(admin, card) {
  const safeName = String(card.name || '').replace(/[%_]/g, '').trim()
  let data = []

  if (card.sourcePlayerId) {
    const { data: rows } = await admin
      .from('card_advisor_cards')
      .select(CARD_ADVISOR_SELECT)
      .eq('is_active', true)
      .eq('source', card.source || 'efhub')
      .eq('source_player_id', card.sourcePlayerId)
      .limit(8)
    data = rows || []
  } else {
    if (!safeName) return null
    const { rows } = await searchCardAdvisorCardsByName(admin, {
      name: card.name,
      source: card.source || 'efhub',
      position: card.position,
      limit: 24
    })
    data = rows || []
  }

  if (!Array.isArray(data) || data.length === 0) return null
  return data
    .sort((a, b) => {
      const nameA = toAscii(a.player_name) === toAscii(card.name) ? 8 : 0
      const nameB = toAscii(b.player_name) === toAscii(card.name) ? 8 : 0
      const posA = a.position === card.position ? 4 : 0
      const posB = b.position === card.position ? 4 : 0
      const qualityA = a.enrichment_status === 'complete' ? 4 : a.enrichment_status === 'partial' ? 1 : 0
      const qualityB = b.enrichment_status === 'complete' ? 4 : b.enrichment_status === 'partial' ? 1 : 0
      return (nameB + posB + qualityB) - (nameA + posA + qualityA)
    })[0]
}

function catalogRowHasCompletePackStats(row) {
  return Boolean(
    row &&
    row.enrichment_status === 'complete' &&
    row.base_stats &&
    typeof row.base_stats === 'object' &&
    Object.keys(row.base_stats).length > 0
  )
}

async function resolveCatalogCardForDeepAnalysis(admin, card) {
  const row = await fetchCardAdvisorCard(admin, card).catch(() => null)
  if (catalogRowHasCompletePackStats(row)) return row

  const source = (String(card.source || 'efhub').trim() || 'efhub')
  const id = String(card.sourcePlayerId || '').trim()
  if (source !== 'efhub' || !id) return row

  const live = await fetchEfhubCardDetail({
    ...card,
    source: 'efhub',
    sourcePlayerId: id,
    overall: card.overall != null ? Number(card.overall) : null
  })
  if (!live?.base_stats || typeof live.base_stats !== 'object' || Object.keys(live.base_stats).length === 0) {
    return row
  }

  return {
    ...(row || {}),
    ...live,
    base_stats: live.base_stats,
    max_stats: live.max_stats ?? row?.max_stats ?? null,
    playing_style: live.playing_style || row?.playing_style || card.style || '',
    player_skills:
      Array.isArray(live.player_skills) && live.player_skills.length
        ? live.player_skills
        : row?.player_skills || [],
    player_name: live.player_name || row?.player_name || card.name,
    position: live.position || row?.position || card.position,
    enrichment_status: 'complete',
    overall_display: row?.overall_display ?? live.overall_level_1 ?? null,
    source: 'efhub',
    source_player_id: id
  }
}

function buildCardAdvisorRagQuery(card, catalogCard, tacticalSettings) {
  const pos = String(card?.position || '').trim()
  const style = String(card?.style || catalogCard?.playing_style || '').trim()
  const teamStyle = String(tacticalSettings?.team_playing_style || '').trim()
  return [
    'stili giocatore',
    'abilità giocatori',
    'showtime',
    'piedi magnetici',
    'magnetic feet',
    'calamita ai piedi',
    'shadow hunt',
    'momentum dribbling',
    'passaggio fenomenale',
    'passaggio visionario',
    'blitz curler',
    'meccaniche eFootball',
    'movimenti automatici',
    pos,
    style,
    teamStyle,
    'cross',
    'passaggio filtrante',
    'colpo di testa',
    'intercettazione',
    'modulo',
    'formazione',
    'contropiede',
    'possesso',
    'vie laterali'
  ]
    .filter(Boolean)
    .join(' ')
}

function topBuildMacroLabels(build) {
  const sliders = build?.sliders && typeof build.sliders === 'object' ? build.sliders : {}
  return Object.entries(sliders)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4)
    .map(([key]) => key)
}

function summarizeBuildPreviewForPrompt(preview, lang = 'it') {
  if (!preview?.ok) return ''
  const metaKeys = topBuildMacroLabels(preview.meta)
  const rosterKeys = topBuildMacroLabels(preview.roster)
  const diffKeys = preview.meta?.ok && preview.roster?.ok
    ? rosterKeys.filter((key) => !metaKeys.includes(key)).slice(0, 3)
    : []
  const payload = {
    silent_internal_context: true,
    instruction: lang === 'en'
      ? 'Use this only to compare the built card profile against the roster. Do not cite final stats, PT numbers, OVR, or build tables in the Pro verdict.'
      : 'Usa questo solo per confrontare il profilo buildato contro la rosa. Non citare stats finali, numeri PT, OVR o tabelle build nel verdetto Pro.',
    meta_available: Boolean(preview.meta?.ok),
    roster_available: Boolean(preview.roster?.ok),
    slot_position: preview.slotPosition || null,
    meta_macro_focus: metaKeys,
    roster_macro_focus: rosterKeys,
    roster_shift_vs_meta: diffKeys,
    roster_reasoning: (preview.roster?.reasons || preview.roster?.whyLead ? [
      preview.roster?.whyLead,
      ...(preview.roster?.reasons || [])
    ] : []).filter(Boolean).slice(0, 4),
    warnings: [
      ...(preview.meta?.warnings || []),
      ...(preview.roster?.warnings || [])
    ].filter(Boolean).slice(0, 2)
  }
  return JSON.stringify(payload, null, 2)
}

function buildPrompt({ lang, card, catalogCard, profile, players, stylesLookup = {}, formation, coach, tacticalSettings, patterns, gameAnalysis, diagnostic, feedback, performance, ragKnowledge, skillDeltaSentence = '', purchaseFactsText = '', buildComparisonText = '' }) {
  const isEn = lang === 'en'
  const coachPolicies = getCoachPoliciesText(lang)
  const coachCore = getCoachSharedCoreText(lang)
  const cardBaseStats = summarizeStats(catalogCard?.base_stats || {})
  const cardMaxStats = summarizeStats(catalogCard?.max_stats || {})
  const cardRawSkills = [...(card.skills || []), ...(catalogCard?.player_skills || [])]
  const cardHeight = Number(card.height) || Number(catalogCard?.height) || null
  const cardWeight = Number(card.weight) || Number(catalogCard?.weight) || null
  const movementRead = styleMovementRead(card.style || catalogCard?.playing_style || '', lang)
  const bodyRead = bodyTypeRead({ height: cardHeight, weight: cardWeight, position: card.position || catalogCard?.position }, lang)
  const cardPayload = {
    name: card.name,
    position: card.position,
    category: card.category,
    source: card.source || catalogCard?.source || null,
    playing_style: card.style || catalogCard?.playing_style || null,
    style_movement_read: movementRead,
    height: cardHeight,
    weight: cardWeight,
    body_type_read: bodyRead,
    native_skills: canonSkillsForPrompt(cardRawSkills, lang, 14),
    native_skill_mechanics: buildSkillMechanicsContext(cardRawSkills, { lang, max: 12 }),
    base_stats: cardBaseStats,
    max_stats: hasStats(catalogCard?.max_stats) ? cardMaxStats : null,
    stats_basis: {
      source: 'pack_card_base_stats',
      note: 'Questi sono valori base/non buildati della carta pack. Non trattarli come build finale.',
      has_final_build_stats: hasStats(catalogCard?.max_stats)
    },
    position_compatibility: catalogCard?.position_compatibility || null,
    data_quality: catalogCard ? 'catalog_match' : 'release_basic'
  }

  const compactPlayers = players.map(player => compactPlayer(player, stylesLookup, lang, formation))
  const starters = compactPlayers.filter(player => player.starter)
  const reserves = compactPlayers.filter(player => !player.starter)

  const contextPayload = {
    profile: {
      first_name: profile?.first_name || null,
      nickname: profile?.nickname || null,
      team_name: profile?.team_name || null,
      ai_weak_point: profile?.ai_weak_point || null,
      ai_learn_goals: profile?.ai_learn_goals || null,
      ai_notes: profile?.ai_notes || null,
      input_delay: profile?.input_delay || null,
      connection_quality: profile?.connection_quality || null,
      pass_level: profile?.pass_level || null
    },
    roster: {
      has_roster: players.length > 0,
      starters,
      reserves: reserves.slice(0, 20)
    },
    formation: formation || null,
    coach: coach || null,
    tactical_settings: tacticalSettings || null,
    tactical_patterns: patterns || null,
    game_analysis: gameAnalysis?.stats || null,
    diagnostic_summary: diagnostic ? sanitize(diagnostic.content, 3000) : '',
    coach_feedback: feedback,
    player_performance: performance
  }

  return `
Sei una AI coach enterprise specializzata in eFootball e Card Advisor.
LINGUA: rispondi solo in ${isEn ? 'inglese' : 'italiano'}.

RUOLO:
- Devi produrre una analisi premium della carta per questo cliente.
- Devi ragionare come un coach superiore: stile di gioco, movimento automatico, abilità native, statistiche, compagni, rosa, riserve, tattica, coach, diagnosi e dati partita.
- Non devi mostrare il ragionamento interno. Devi mostrare il risultato finale, chiaro, sicuro e utile.
- Domanda unica da rispondere: "La compro per come gioco OGGI (modulo in campo, titolari, game stats, profilo)?" — non tier list, non "carta forte in assoluto".

POLITICHE COACH (allineate alla chat — obbligatorie):
${coachPolicies}

${coachCore}

GERARCHIA FONTI (ordine di priorità — non invertire):
1. FATTI ACQUISTO (modulo, pool ruolo, candidato sostituibile, anchor tecnico skill, regole naming)
2. CONTESTO CLIENTE (rosa starters/reserves, tattica, coach, game_analysis, profilo, diagnosi)
3. CARTA + RAG EFOOTBALL (stile, movimento, skill native, meccaniche, body type, ruolo)
4. BUILD COMPARISON INTERNA (solo per capire profilo buildato, non da mostrare)
5. skill_delta_sentence (solo nota tecnica su abilità comuni / solo carta / solo rosa)
6. Vincoli safety: non inventare nomi/skill/ruoli, non usare overall come criterio

FOCUS:
- La domanda centrale non è "la carta è forte?", ma "questa carta crea valore reale per questa rosa?".
- Il verdetto è sempre CARTA NUOVA VS ROSA CLIENTE: prima trova chi copre quel ruolo nella rosa, poi decidi se la carta cambia gerarchie, rotazione o piano partita.
- Il giocatore rosa usato come anchor tecnico skill (es. Pulisic, Donnarumma, Maldini) NON è automaticamente il giocatore da sostituire: è il riferimento per non inventare skill. Per la decisione acquisto usa prima pool ruolo e candidato più sostituibile nei FATTI ACQUISTO.
- Se il pool ruolo contiene più titolari, non giudicare la carta solo contro il migliore del reparto. Spiega se entra sopra il punto debole, se diventa quarto profilo premium, o se cambia la rotazione.
- Prima decidi GERARCHIA ROSA: "sostituisce/parte titolare", "rotazione premium", "solo cambio modulo" o "skip". Solo dopo usa abilità/stats come prove. Non costruire il report come lista abilità.
- Ragiona come la chat coach: la decisione nasce da modulo + rosa + RAG meccaniche. Le skill sono evidenze, non la struttura del verdetto.
- skill_delta_sentence NON è il verdetto: è solo una lente sulle abilità. Non deve superare modulo, titolari, movimento, stile, body type, ruolo e bisogni reali del cliente.
- In summary e final_decision: NON ripetere skill_delta_sentence parola per parola e NON aggiungere spiegazioni meccaniche RAG sulle skill (es. "se subisci cross", "in difesa", "su palla alta"). Cita al massimo 1-2 skill solo carta come prova, poi chiudi con gerarchia rosa / piano partita.
- Carte att/mid offensive: VIETATO framing difensivo (subire cross, palloni pericolosi in area propria, copertura aerea difensiva). Dominio palle alte su attaccante = sponda/duelli offensivi/ribalte in area avversaria, solo se serve e in una frase.
- Meno spiegazioni = meno errori: preferisci verdetto netto a paragrafi di meccanica.
- Se la rosa è presente, parla in modo personalizzato e deciso.
- Se la rosa non è presente, fai solo review carta basata su stile, skill e stats disponibili.
- Quando un dato è presente, usa forma assertiva: "nella tua rosa c'è", "i tuoi dati mostrano", "hai già". Non usare "se hai" o "potrebbe" per dati già disponibili.
- Usa il condizionale solo quando il dato manca o quando stai indicando una scelta strategica del cliente.
- Non parlare di overall/rating come criterio: la carta pack può arrivare base mentre il player in rosa può essere già buildato. Le nuove uscite premium hanno un peso decisionale interno favorevole, ma NON citarlo: al cliente devi motivare solo con stile, movimento, skill native/speciali, body type, ruolo, rotazione e fit col modulo di oggi.
- Non inventare nomi, skill, problemi o ruoli non presenti nei dati.
- Stili e abilità sono diversi: lo stile spiega il movimento; le abilità spiegano cosa sa fare.
- style_movement_read e body_type_read sono vincolanti per il profilo carta: Opportunista ≠ Rapace d'area. Opportunista = profondità/filtranti/ultima linea; Rapace d'area = area/cross/ribalzi/finalizzazione centrale. Il body type decide se quel movimento rende da riferimento fisico, agile o bilanciato.
- Se trovi una combo reale, mettila al centro. Se manca metà combo, dillo.
- Usa il RAG per interpretare movimenti da stile, meccaniche eFootball, movimenti collettivi, abilità e situazioni di gioco. Non copiarlo: applicalo ai dati del cliente.
- Scrivi corto e denso. Niente tema. Ogni campo deve essere leggibile in pochi secondi.

REGOLE SULLE STATISTICHE:
- Le statistiche della CARTA PACK e dei giocatori in ROSA nel JSON sono entrambe a BASELINE level-1 (pre-PT, pre-Build Coach). Il confronto e coerente.
- saved_stats del player in rosa proviene da metadata.build_coach.before quando il cliente ha buildato, altrimenti dalla colonna base_stats: in entrambi i casi e il level-1 reale.
- Puoi confrontare numericamente i due lati su pace/finish/pass/defend/aerial/gk, ma rimani sintetico: max 1-2 dati numerici, sempre insieme a stile, skill native, ruolo e combo. Niente OVR.
- I numeri non sono valori finali: dopo PT/livelli entrambi crescono. Indicano potenziale natural, non output finale.
- BUILD COMPARISON INTERNA: se presente, indica come la carta potrebbe essere valorizzata dai PT meta/rosa. Serve SOLO per confrontare profilo buildato, ruolo, macro e gerarchia. VIETATO citare nel testo finale stats finali, numeri PT, OVR build, tabelle o "con questa build arriva a X". Traduci il confronto in effetti pratici: più copertura, più uscita palla, più profondità, più duelli, più rotazione.

SEMANTICA:
- Usa termini da coach/community: movimento, skill nativa, combo, catena, rotazione premium, piano partita diverso, alternativa d'élite, riferimento in area, attacca spazio, dà ampiezza, tiene posizione. Su Epic/Legendary/Showtime evita "non prioritaria/luxury pick" se esiste un caso concreto di rotazione.
- Per carte offensive forti usa linguaggio da decisione: "entra al posto di", "alzala titolare", "sostituisce nel piano A", "Pulisic diventa rotazione/alternativa". Non restare su "utile come rotazione" quando la carta ha tool da titolare.
- Evita: "fit stile 56%", "bonus sistema", "sinergia principale", "stat edge", "overall", "rating", "buildalo", "potenzialo", "allenalo".
- Se rispondi in italiano, traduci in italiano anche stili, skill e tag tecnici quando possibile: non lasciare frasi con termini inglesi se esiste già l’italiano nel glossario interno (stessi nomi delle liste native_skills / skills della rosa).
- ATTENZIONE NOMI ABILITÀ: fonti diverse (EFHub/PESDB/browser tradotto/Football Lab) possono usare nomea IT/EN diversa o ambigua. Non costruire il verdetto su una singola label se l'effetto/ruolo non torna: usa ruolo, reparto, meccanica e caution. In caso dubbio, parla di "skill di passaggio/lancio" o "bonus tiro da fuori" solo come dettaglio, non come motivo acquisto.
- REGOLE SULLE SKILL (obbligatorie): i campi native_skills e roster.*.skills nel JSON sono nomi già normalizzati nella lingua della risposta (${isEn ? 'inglese' : 'italiano'}) — citane esattamente quelli, senza sostituirli con sinonimi diversi. Non attribuire a un giocatore una skill assente dalla sua lista. Non confondere skill simili (es. cross preciso vs passaggio filtrante; tiro al volo vs tiro dalla distanza; muro vs intercettazione). Per “combo” tra carta e rosa, verifica che la skill compaia in entrambe le liste o spiega che manca il collegamento.
- native_skill_mechanics è il dizionario autorevole su cosa fanno le skill native della carta: usa effect/useful_for/caution per interpretarle. Se una caution limita l'impatto, rispettala nel verdetto.
- Skill offensive su difensori/centrocampisti (es. Tiro dalla distanza, Tiro a salire) sono SOLO bonus secondario dal reparto, non motivo d'acquisto. Per DC/TD/TS è VIETATO usare "tiro da fuori", "minaccia da fuori", "piazzati" o simili come summary/final_decision/condizione d'acquisto: il verdetto deve basarsi prima su difesa, copertura, fisico, velocità recupero, stile difensivo e uscita palla. Quelle skill possono comparire solo in pros come extra marginale.
- CONFRONTO ABILITÀ VS ANCHOR TECNICO (obbligatorio): nel contesto c'è skill_delta_sentence — è la lettura ufficiale su comune vs diverso rispetto all'anchor tecnico in rosa. Non contraddirla sui nomi skill. Però NON usarla come motore principale del verdetto quando FATTI ACQUISTO indicano un candidato più sostituibile nel pool ruolo. Nei pros NON usare le skill in comune come motivo d'acquisto; il valore skill è nelle skill solo sulla carta, nello stile, movimento, body type, rotazione e bisogni reali del cliente.
- CONFRONTO SKILL = stesso reparto: difensori solo vs DC/TD/TS in rosa, centrocampo vs MED/CC/TRQ/CLS/CLD, attacco vs P/SP/ESA/EDA. VIETATO confrontare una carta difensiva con un attaccante (es. Maldini/Thuram vs Ronaldinho). Sinergie con compagni di altri reparti vanno in "synergies", non nel confronto skill principale. Se FATTI ACQUISTO indica anchor difensivo, non citare attaccanti nel confronto skill.
- Carte Epic, Legendary o Showtime: internamente trattale come uscite desiderabili quando hanno valore concreto. Se trovi almeno 2 motivi tra stile, movimento, body type, skill solo carta, booster/showtime, piede/lato, multi-ruolo, rotazione o piano partita, il default è premium_rotation o take, non situational/luxury_pick. Non scrivere "è meglio perché Epic/Showtime": scrivi il dettaglio concreto che cambia.
- La sezione "key_reasoning" è la parte più importante: ogni punto deve incrociare almeno due fonti tra carta, stile, skill, stats, rosa, formazione, tattica, coach, diagnosi, game analysis e RAG meccaniche.
- Il primo punto di key_reasoning deve essere sempre sulla gerarchia rosa o sul piano partita: chi entra, chi scala in rotazione, quale slot cambia. Non iniziare con "skill delta" o lista abilità.
- Ogni ragionamento deve chiudere con una conseguenza pratica: cosa cambia, cosa sfruttare, cosa evitare o perché non è priorità.

CRITERIO DECISIONALE CARD VS ROSA:
- Cerca prima il caso d'acquisto nella rosa: buco ruolo, titolare debole nel ruolo, rotazione forte, movimento diverso, tool speciale, body type utile, piede/lato, compatibilità modulo o problema reale del cliente.
- Se FATTI ACQUISTO indicano "opzione più sostituibile", il verdetto deve parlare prima di quello slot: "entra sopra X", "spinge X in panchina/rotazione", oppure "non basta per superare X". Non limitarti a dire che non supera il migliore del reparto.
- Le nuove uscite premium spesso aggiungono qualcosa che la community desidera, ma questo resta peso interno: nel testo visibile devi sempre tradurlo in cosa cambia nella rosa del cliente.
- Ruolo già coperto NON è penalità: è solo contesto. Parti dal presupposto che una carta nuova può avere valore come rotazione, piano partita diverso, entrata dalla panchina, alternativa contro lag/pressing/cross/profondità, o copertura di più ruoli.
- ECCEZIONE SAME_NAME: se FATTI ACQUISTO indica stesso nome giocatore già in rosa/titolare, in eFootball non puoi usare due versioni dello stesso calciatore insieme. Non parlare mai di rotazione tra i due. Il verdetto è solo: nuova versione sostituisce quella attuale, oppure non vale cambiarla/skip_duplicate.
- Se l'anchor in rosa è forte (es. Pulisic): non chiudere con "non serve". Scrivi se la carta nuova aggiunge 1v1, cambio ritmo, piede/lato, skill speciali, ampiezza, taglio dentro, filtrante, cross o finalizzazione diversa. Il confronto deve produrre un uso pratico, non una bocciatura automatica.
- Se la carta nuova offensiva dà più creazione/1v1/cambio ritmo dell'anchor largo, il verdetto corretto è take/fits_current_setup: "sostituisce [anchor] nel piano A"; [anchor] diventa rotazione o piano B.
- Usa not_priority/skip solo quando la carta è davvero inutilizzabile per quella rosa: stesso nome già titolare senza tool nuovi, ruolo non schierabile, fit opposto al modo di giocare, o nessuna rotazione concreta. Vietato bocciare solo perché il ruolo è coperto.

TONO PREMIUM:
- Il cliente paga per un verdetto Pro: non essere tiepido quando la carta ha valore reale. Scrivi come un coach che sa perché una nuova premium fa gola alla community, ma giustifica tutto con effetti in campo.
- Se il verdetto non è "take", deve comunque sembrare utile e desiderabile quando ci sono tool concreti: "premium_rotation", "piano partita", "arma dalla panchina", "alternativa d'élite".
- I contro servono a spiegare COME usarla, non a spegnere l'acquisto, salvo casi davvero incompatibili.
- Portieri premium: non dire "non è necessaria" solo perché c'è già Donnarumma o un altro PT forte. Un nuovo PT premium si valuta per affidabilità, reach/body, parate ravvicinate, controllo rimbalzi, distribuzione, forma e copertura da rotazione. Se non è take, il default è premium_rotation, non not_priority/situational.

POLICY POSIZIONI E ACQUISTO (obbligatoria — come Coach chat):
- Nomi giocatori e skill: solo da CONTESTO CLIENTE, FATTI ACQUISTO e skill_delta_sentence. Se manca un dato, non inventare.
- "position" in roster = ruolo sul modulo salvato (formation.slot_positions per slot_index). "card_role" se presente = ruolo scheda rosa quando diverso dal modulo. "original_positions" = competenze naturali: NON usarle come ruolo attuale.
- "Anchor tecnico skill" serve a confrontare abilità, non a decidere da solo l'acquisto. "Pool ruolo" e "opzione più sostituibile" decidono la gerarchia rosa.
- SAME_NAME è un vincolo di gioco, non una preferenza: due versioni dello stesso giocatore non sono una rotazione utilizzabile nella stessa rosa. Se consigli l'acquisto, devi dire che sostituisce la versione attuale.
- Vietato: "Maldini CLS" se in rosa è DC. Obbligatorio: "Maldini (DC)" o "Maldini (DC in rosa)".
- Vietato: confronto skill tra reparti diversi (difensore vs attaccante). Ronaldinho non è anchor per carte DC/TD/TS.
- Vietato: "non cambia gerarchie su [Nome] [ruolo carta]" se non c'è titolare con quel ruolo in campo (vedi FATTI ACQUISTO).
- Domanda centrale acquisto: la carta la compro per COME GIOCO OGGI (modulo, disposizione, game stats, profilo)? Non tier list.
- Se la carta premium è utile nel ruolo pack ma NON c'è titolare in quel ruolo in campo: non raffreddarla automaticamente. Usa purchase_fit fits_if_formation_change o fits_with_rotation e verdict premium_rotation quando esiste un piano chiaro per schierarla, cambiare modulo o usarla dalla panchina. Scrivi la condizione pratica, non "oggi no" come default.
- Se game stats e stile carta non matchano (es. pochi cross nei dati): non usare subito not_your_playstyle su carte offensive con tool concreti. Trasformalo in condizione d'uso: "ti serve se vuoi aprire quel piano", purchase_fit fits_with_rotation o fits_if_formation_change.
- purchase_fit deve essere coerente con verdict e con FATTI ACQUISTO. setup_condition obbligatorio se purchase_fit è fits_if_formation_change o skill_only_no_slot.
- Esempio SBAGLIATO: "Non cambia gerarchie su Maldini CLS". Esempio CORRETTO: "Non sostituisce Maldini (DC); oggi non hai CLS in campo — ha senso solo se cambi modulo per usare la fascia."
- FATTI ACQUISTO + skill_delta_sentence hanno priorità sui nomi e sui dati, non sul tono premium. Se indicano doppione, titolare già ok o nessuno slot per il ruolo pack, non usare verdict "take" senza motivo concreto; però per carte premium con almeno 2 pro concreti usa premium_rotation/fits_with_rotation invece di situational/luxury_pick.

COERENZA verdict ↔ purchase_fit (obbligatoria):
- skip_duplicate solo quando è davvero stesso nome/versione senza tool nuovi o senza upgrade pratico. Stesso nome titolare + nuova premium con skill/tool/body type/movimento utili → take/fits_current_setup come sostituzione della versione attuale, non premium_rotation.
- Nessun titolare con ruolo pack in campo (FATTI ACQUISTO) → purchase_fit fits_if_formation_change o fits_with_rotation; per premium con piano pratico il verdict può essere premium_rotation. setup_condition obbligatorio se serve cambio modulo/ruolo.
- skill_delta indica "quasi uguale" / "non compri per skill nuove" → non vendere l'acquisto come upgrade skill. Per uscite premium, se ci sono almeno 2 pro concreti, usa premium_rotation/take e motiva con stile, movimento, body type, tool speciali o rotazione. Usa luxury_pick/situational solo se manca un caso d'uso reale.
- Diversificazione è motivo d'acquisto valido: stesso ruolo ma movimento/stile/body type diversi dal titolare (es. Opportunista vs Rapace d'area) → premium_rotation o take se la carta è premium o offre un piano partita chiaramente diverso; non classificare come skip/not_priority solo perché ruolo o skill sono già coperti.
- Stesso stile del titolare (es. due Opportunista in CF) NON basta per "Oggi no" su Epic/Legendary/Showtime: valuta skill solo carta, body type, lag, rotazione tra titolari; verdict premium_rotation o fits_with_rotation se i pro sono concreti.
- Vietato final_decision "Oggi no" / "Non comprare" su carte premium/offensive con tool concreti, salvo stesso nome senza tool nuovi o fit davvero opposto. Se lo stile non è quello attuale del cliente, trasformalo in condizione d'uso/rotazione.
- Carte offensive nuove con tool di creazione (1v1, dribbling, skill speciali, piede/lato, filtranti/cross/finalizzazione) → il confronto con il titolare deve finire in take/fits_current_setup quando la carta è schierabile nello stesso slot o fascia; premium_rotation solo se serve cambio modulo, condizione specifica o non parte titolare.
- key_reasoning "gerarchie": non chiudere con "doppione funzionale" se la carta porta tool diversi (dribbling, tiro di prima, sassata) — scrivi rotazione d'élite / piano partita.
- Salto skill chiaro + titolare stesso ruolo o buco ruolo reale → take, premium_rotation o fits_with_rotation
- Game stats ≠ stile carta (es. pochi cross ma carta da fascia) → fits_with_rotation o fits_if_formation_change con condizione; not_your_playstyle solo se il tool della carta è davvero inutile per quella rosa
- Rosa assente → purchase_fit insufficient_data; verdict situational; solo review carta

${purchaseFactsText}

CARTA
${JSON.stringify(cardPayload, null, 2)}

CONTESTO CLIENTE
${JSON.stringify(contextPayload, null, 2)}

CONFRONTO ABILITÀ (una frase, già calcolata — allineati)
${skillDeltaSentence || (isEn ? 'No roster skill comparison available.' : 'Confronto abilità rosa non disponibile.')}

BUILD COMPARISON INTERNA (non mostrare numeri al cliente)
${buildComparisonText || (isEn ? 'No internal build comparison available.' : 'Confronto build interno non disponibile.')}

RAG EFOOTBALL (dizionario meccaniche — non è la rosa del cliente)
${ragKnowledge || 'Nessun RAG disponibile.'}

USO RAG (obbligatorio):
- Usa RAG per spiegare movimento da stile giocatore, meccaniche skill, stili squadra e situazioni di gioco coerenti con i dati cliente.
- NON usare RAG per tier list, meta universale, "migliori giocatori", overall, o per aggiungere skill/nomi non presenti in CARTA o CONTESTO CLIENTE.
- NON copiare paragrafi lunghi dal RAG: massimo 1-2 concetti applicati al caso.
- Stili giocatore nel RAG ≠ abilità: rispetta la distinzione delle POLITICHE COACH.
- Se RAG e FATTI ACQUISTO/skill_delta confliggono su ruoli o confronti, vincono FATTI ACQUISTO e skill_delta.

CHECKLIST PRE-OUTPUT (verifica mentalmente prima del JSON):
- Ho citato solo skill presenti in native_skills o roster.skills?
- Ho usato il ruolo IN CAMPO per ogni giocatore rosa (non competenza come ruolo attuale)?
- Ho deciso prima gerarchia rosa/piano partita usando pool ruolo e opzione più sostituibile, prima di parlare di skill?
- Se ho usato BUILD COMPARISON, l'ho tradotta in effetto pratico senza citare numeri/stat finali/PT/OVR?
- skill_delta_sentence e FATTI ACQUISTO sono rispettati in summary, pros e final_decision?
- purchase_fit e verdict sono coerenti con la tabella sopra?
- pros motivati da skill SOLO sulla carta (non dalle comuni)?
- synergies = combo con altri reparti, non sostituiscono il confronto skill principale?
- headline ≤55 caratteri, teaser — il verdetto completo sta in summary e final_decision?

OUTPUT:
Restituisci SOLO JSON valido con questa struttura:
{
  "headline": "titolo breve e deciso, massimo 55 caratteri (teaser, non ripetere tutto il verdetto)",
  "verdict": "take|premium_rotation|situational|luxury_pick|not_priority|skip",
  "purchase_fit": "fits_current_setup|fits_with_rotation|fits_if_formation_change|skill_only_no_slot|not_your_playstyle|skip_duplicate|insufficient_data",
  "setup_condition": "vuoto se purchase_fit è fits_current_setup; altrimenti condizione modulo/ruolo max 160 caratteri",
  "summary": "massimo 2 frasi brevi, verdetto acquisto + motivo principale",
  "card_identity": {
    "movement": "movimento automatico da stile, massimo 100 caratteri",
    "key_skills": ["skill rilevanti"],
    "best_use": "uso ideale, massimo 120 caratteri"
  },
  "key_reasoning": [
    { "label": "massimo 35 caratteri", "text": "micro-ragionamento assertivo, massimo 180 caratteri" }
  ],
  "pros": ["max 3 pro concreti, max 120 caratteri ciascuno"],
  "cons": ["max 3 contro concreti, max 120 caratteri ciascuno"],
  "synergies": ["max 3 sinergie/combo, max 140 caratteri ciascuna"],
  "how_to_use": ["max 3 indicazioni pratiche, max 120 caratteri ciascuna"],
  "when_to_avoid": ["max 2 casi, max 120 caratteri ciascuno"],
  "final_decision": "decisione finale netta, massimo 180 caratteri"
}
`.trim()
}

function calibratePremiumVerdict(analysis, { card, catalogCard, anchorType, anchorLabel, lang }) {
  if (!analysis) return analysis

  const actionableContent = [
    analysis.card_identity?.movement,
    analysis.card_identity?.best_use,
    ...(analysis.card_identity?.key_skills || []),
    ...(analysis.pros || []),
    ...(analysis.synergies || []),
    ...(analysis.how_to_use || []),
    ...(analysis.key_reasoning || []).map((row) => `${row.label} ${row.text}`)
  ].filter(Boolean)
  const textBlob = [
    analysis.final_decision,
    analysis.summary,
    analysis.headline,
    ...(analysis.key_reasoning || []).map((row) => `${row.label} ${row.text}`),
    ...(analysis.cons || [])
  ].join(' ')

  const premiumCard = isPremiumCatalogCard(card, catalogCard)
  const attackCreationCase = hasAttackCreationTools(analysis, card)
  const starterLevelAttackEdge = hasStarterLevelAttackEdge(analysis, card)
  const sameWideStarter = anchorType === 'same_wide_flank' || anchorType === 'same_field_role'
  const anchorName = stripAnchorRole(anchorLabel)
  const rosterBlockedLanguage = /(ruolo coperto|gia copert|già copert|titolare gia|titolare già|non cambia.*gerarch|does not change.*hierarch|covered role|starter already|already covered)/i.test(textBlob)
  const isGoalkeeper = roleFamily(card?.position) === 'gk'
  const harshVerdict = analysis.verdict === 'skip' || analysis.verdict === 'not_priority'
  const coldVerdict = analysis.verdict === 'situational' || analysis.verdict === 'luxury_pick'
  const saysNoBuy = /(oggi no|non compr|non ha senso compr|evita l.acquisto|do not buy|not today|skip purchase|non spendere|non e necessari|non è necessari|non necessari|non serve|non ti serve|superfluo|not necessary|unnecessary|not needed|not required|superfluous)/i.test(textBlob)
  const saysFunctionalDup = /(doppione funzionale|functional duplicate|non offre.*rotazione|doesn.t offer.*rotation|non cambia.*variet)/i.test(textBlob)
  const blockedByPlaystyle = analysis.purchase_fit === 'not_your_playstyle'
  const hasPros = (analysis.pros || []).length >= 2
  const hasSynergy = (analysis.synergies || []).length >= 1
  const hasActionableContent = actionableContent.length >= 1
  const blockedFit = analysis.purchase_fit === 'insufficient_data' ||
    (analysis.purchase_fit === 'not_your_playstyle' && !attackCreationCase)
  const sameNameAnchor = anchorType === 'same_name'
  const sameNameRotationLanguage = /(rotaz|rotation|ruot|tenere entram|keep both|use both|insieme|same squad)/i.test(textBlob)
  const sameNameUpgradeCase = sameNameAnchor &&
    !blockedFit &&
    (
      analysis.verdict === 'take' ||
      analysis.purchase_fit === 'fits_current_setup' ||
      hasPros ||
      attackCreationCase ||
      starterLevelAttackEdge
    )
  if (sameNameAnchor) {
    const patched = { ...analysis }
    if (sameNameUpgradeCase) {
      patched.verdict = 'take'
      patched.purchase_fit = 'fits_current_setup'
      patched.setup_condition = ''
      patched.summary = lang === 'en'
        ? `${card.name} is a version upgrade: buy it only to replace ${anchorName || 'your current version'}, not to rotate both in the same squad.`
        : `${card.name} è upgrade di versione: compralo per sostituire ${anchorName || 'la versione attuale'}, non per ruotarle entrambe nella stessa rosa.`
      patched.final_decision = lang === 'en'
        ? `Buy it if you want the new version as your Plan A; you cannot use two ${card.name} versions together, so the current one becomes replaced, not rotation.`
        : `Comprala se vuoi la nuova versione come piano A; non puoi usare due ${card.name} insieme, quindi quella attuale viene sostituita, non ruotata.`
      patched.key_reasoning = [
        {
          label: lang === 'en' ? 'Version upgrade' : 'Upgrade versione',
          text: lang === 'en'
            ? `Same-player rule: this is not a rotation pair. The new ${card.name} must replace ${anchorName || 'your current version'} if the upgrade matters.`
            : `Regola stesso giocatore: non è una coppia da rotazione. Il nuovo ${card.name} deve sostituire ${anchorName || 'la versione attuale'} se l’upgrade ti serve.`
        },
        ...(patched.key_reasoning || []).filter((item) => !/(rotaz|rotation|ruot|keep both|entramb|insieme)/i.test(`${item.label || ''} ${item.text || ''}`))
      ].slice(0, 4)
      return patched
    }
    if (sameNameRotationLanguage || patched.purchase_fit === 'fits_with_rotation' || patched.verdict === 'premium_rotation') {
      patched.verdict = 'skip'
      patched.purchase_fit = 'skip_duplicate'
      patched.setup_condition = ''
      patched.summary = lang === 'en'
        ? `${card.name} is the same-player case: do not buy for rotation, because both versions cannot be used together.`
        : `${card.name} è caso stesso giocatore: non comprarlo per rotazione, perché le due versioni non possono essere usate insieme.`
      patched.final_decision = lang === 'en'
        ? `Skip unless the new version clearly replaces your current ${card.name}; never plan to rotate both in the same squad.`
        : `Salta salvo upgrade chiaro sulla versione attuale di ${card.name}; mai pianificare rotazione tra entrambe nella stessa rosa.`
      return patched
    }
  }
  const strictDuplicateBlock = anchorType === 'same_name' &&
    analysis.purchase_fit === 'skip_duplicate' &&
    !hasActionableContent
  const hasConcretePremiumCase = !blockedFit &&
    !strictDuplicateBlock &&
    (hasPros || hasSynergy || hasActionableContent || isGoalkeeper || attackCreationCase)
  const shouldStartOverAnchor = starterLevelAttackEdge &&
    sameWideStarter &&
    hasConcretePremiumCase &&
    !blockedFit &&
    !strictDuplicateBlock
  const shouldRosterFirstPatch = (premiumCard || attackCreationCase) &&
    hasConcretePremiumCase &&
    (shouldStartOverAnchor || harshVerdict || coldVerdict || saysNoBuy || saysFunctionalDup || rosterBlockedLanguage || blockedByPlaystyle)

  if (!shouldRosterFirstPatch) return analysis
  if (!hasConcretePremiumCase) return analysis

  const patched = { ...analysis }
  if (shouldStartOverAnchor) {
    patched.verdict = 'take'
    patched.purchase_fit = 'fits_current_setup'
    patched.setup_condition = ''
    patched.summary = lang === 'en'
      ? `${card.name} is a starter-level upgrade for this wide lane: use it as Plan A, with ${anchorName || 'the current starter'} as rotation or Plan B.`
      : `${card.name} è upgrade da titolare su questa fascia: usalo come piano A, con ${anchorName || 'il titolare attuale'} in rotazione o piano B.`
  } else if (harshVerdict || coldVerdict || saysNoBuy || rosterBlockedLanguage || blockedByPlaystyle) {
    patched.verdict = 'premium_rotation'
    if (patched.purchase_fit === 'not_your_playstyle') {
      patched.purchase_fit = 'fits_with_rotation'
    } else if (patched.purchase_fit === 'skill_only_no_slot') {
      patched.purchase_fit = patched.setup_condition ? 'fits_if_formation_change' : 'fits_with_rotation'
    } else if (patched.purchase_fit === 'skip_duplicate' || !patched.purchase_fit) {
      patched.purchase_fit = 'fits_with_rotation'
    }
  }
  if (saysNoBuy || coldVerdict || rosterBlockedLanguage || blockedByPlaystyle) {
    patched.final_decision = lang === 'en'
      ? isGoalkeeper
        ? `${card.name} is worth it as a premium goalkeeper rotation: judge it by reliability, reach, close saves and rebound control.`
        : attackCreationCase
          ? shouldStartOverAnchor
            ? `Buy it: ${card.name} should start over ${anchorName || 'the current wide option'} when you want more 1v1, tempo change and final-third creation.`
            : `${card.name} is worth it as a roster weapon: use it for 1v1, tempo change and match-plan rotation, not only to replace the starter.`
        : 'Worth buying for elite rotation and match plans — not to replace your starter every week.'
      : isGoalkeeper
        ? `${card.name} ha senso come rotazione premium in porta: valutalo per affidabilità, reach, parate ravvicinate e controllo rimbalzi.`
        : attackCreationCase
          ? shouldStartOverAnchor
            ? `Comprala: ${card.name} deve partire sopra ${anchorName || 'l’opzione larga attuale'} quando vuoi più 1v1, cambio ritmo e creazione nell’ultimo terzo.`
            : `${card.name} ha senso come arma di rosa: usalo per 1v1, cambio ritmo e rotazione di piano partita, non solo per sostituire il titolare.`
        : 'Ha senso comprarla per rotazione d\'élite e piano partita — non per sostituire il titolare ogni settimana.'
  }
  if (shouldStartOverAnchor) {
    patched.final_decision = lang === 'en'
      ? `Buy it: ${card.name} should start over ${anchorName || 'the current wide option'} as Plan A; keep the current starter for rotation or a safer match plan.`
      : `Comprala: ${card.name} deve partire sopra ${anchorName || 'l’opzione larga attuale'} come piano A; tieni il titolare attuale per rotazione o piano più conservativo.`
    patched.key_reasoning = [
      {
        label: lang === 'en' ? 'Squad hierarchy' : 'Gerarchia rosa',
        text: lang === 'en'
          ? `${card.name} is not just rotation: it changes the wide-lane hierarchy and pushes ${anchorName || 'the current starter'} into rotation.`
          : `${card.name} non è solo rotazione: cambia la gerarchia della fascia e sposta ${anchorName || 'il titolare attuale'} in rotazione.`
      },
      ...(patched.key_reasoning || []).filter((item) => !/(skill delta|abilità|skill)/i.test(`${item.label || ''} ${item.text || ''}`))
    ].slice(0, 4)
  }
  if (saysFunctionalDup) {
    patched.key_reasoning = (patched.key_reasoning || []).map((item) => {
      const blob = `${item.label} ${item.text}`
      if (!/(doppione|duplicate|non offre|varietà offensiva|offensive variety)/i.test(blob)) return item
      return {
        ...item,
        text: lang === 'en'
          ? 'Same movement style as your starters, but different card tools — elite rotation, not a forced weekly starter.'
          : 'Stesso movimento dei titolari, ma tool carta diversi — rotazione d\'élite, non titolare fisso obbligatorio.'
      }
    })
  }
  return patched
}

function suppressDefenderShootingPurchaseReason(analysis, { card, lang }) {
  if (!analysis || roleFamily(card?.position) !== 'def') return analysis

  const purchaseText = [
    analysis.summary,
    analysis.final_decision,
    analysis.setup_condition
  ].join(' ')
  const shootingAsReason = /(tiro|tiri|minaccia).{0,28}(fuori|distanza|piazzat)|fuori area|long.?range|outside the box|set.?piece threat/i.test(purchaseText)
  if (!shootingAsReason) return analysis

  const patched = {
    ...analysis,
    summary: lang === 'en'
      ? `${card.name} should be judged as a defender first: coverage, duels and ball exit. Shooting traits are only a secondary bonus, not the reason to buy.`
      : `${card.name} va giudicato prima da difensore: copertura, duelli e uscita palla. Le skill tiro sono solo bonus secondario, non motivo d'acquisto.`,
    final_decision: lang === 'en'
      ? 'Buy/rotate only if you want a defender for coverage and build-up; do not buy a defender for long shots.'
      : 'Compralo/ruotalo solo se vuoi un difensore per copertura e uscita palla; non un DC per tirare da fuori.',
    setup_condition: ''
  }

  patched.key_reasoning = (patched.key_reasoning || []).map((item) => {
    const blob = `${item.label || ''} ${item.text || ''}`
    if (!/(tiro|tiri|minaccia|fuori|distanza|piazzat|long.?range|outside the box|set.?piece)/i.test(blob)) return item
    return {
      ...item,
      text: lang === 'en'
        ? 'Shooting traits are a minor bonus on dead balls; the real read is defensive reliability plus ball exit.'
        : 'Le skill tiro sono bonus minore su piazzati/seconda palla; la lettura vera è tenuta difensiva più uscita palla.'
    }
  })

  return patched
}

function normalizeDeepAnalysis(payload, lang, skillDeltaLine = '') {
  const clean = (value, maxLen = 500) => {
    const text = sanitize(value, maxLen)
    return lang === 'en' ? text : localizeItalianTerms(text)
  }
  const arr = (value, maxItems = 3, maxLen = 150) => Array.isArray(value) ? value.map(item => clean(item, maxLen)).filter(Boolean).slice(0, maxItems) : []
  const reasoning = (value) => Array.isArray(value)
    ? value
        .map(item => ({
          label: clean(item?.label || '', 45),
          text: clean(item?.text || item, 220)
        }))
        .filter(item => item.text)
        .slice(0, 4)
    : []

  const fallback = lang === 'en'
    ? {
        headline: 'Detailed card read unavailable',
        verdict: 'situational',
        summary: 'The detailed analysis could not be completed. Use the base Card Advisor read for now.',
        card_identity: { movement: '', key_skills: [], best_use: '' },
        key_reasoning: [],
        pros: [],
        cons: [],
        synergies: [],
        how_to_use: [],
        when_to_avoid: [],
        final_decision: 'Use the base read until a new detailed analysis is available.',
        skill_delta_line: '',
        purchase_fit: 'insufficient_data',
        setup_condition: ''
      }
    : {
        headline: 'Analisi dettagliata non disponibile',
        verdict: 'situational',
        summary: 'Non è stato possibile completare l’analisi dettagliata. Usa per ora la lettura base del Card Advisor.',
        card_identity: { movement: '', key_skills: [], best_use: '' },
        key_reasoning: [],
        pros: [],
        cons: [],
        synergies: [],
        how_to_use: [],
        when_to_avoid: [],
        final_decision: 'Usa la lettura base finché non è disponibile una nuova analisi dettagliata.',
        skill_delta_line: '',
        purchase_fit: 'insufficient_data',
        setup_condition: ''
      }

  if (!payload || typeof payload !== 'object') {
    return {
      ...fallback,
      skill_delta_line: skillDeltaLine ? clean(skillDeltaLine, 320) : '',
      purchase_fit: fallback.purchase_fit,
      setup_condition: ''
    }
  }
  const purchaseFit = normalizePurchaseFit(payload.purchase_fit) || fallback.purchase_fit
  const setupCondition = clean(payload.setup_condition, 180)
  return {
    headline: clean(payload.headline, 120) || fallback.headline,
    verdict: ['take', 'premium_rotation', 'situational', 'luxury_pick', 'not_priority', 'skip'].includes(payload.verdict) ? payload.verdict : 'situational',
    purchase_fit: purchaseFit,
    setup_condition: setupCondition,
    summary: clean(payload.summary, 420) || fallback.summary,
    card_identity: {
      movement: clean(payload.card_identity?.movement, 130),
      key_skills: arr(payload.card_identity?.key_skills, 5, 60),
      best_use: clean(payload.card_identity?.best_use, 160)
    },
    key_reasoning: reasoning(payload.key_reasoning),
    pros: arr(payload.pros, 3, 140),
    cons: arr(payload.cons, 3, 140),
    synergies: arr(payload.synergies, 3, 160),
    how_to_use: arr(payload.how_to_use, 3, 140),
    when_to_avoid: arr(payload.when_to_avoid, 2, 140),
    final_decision: clean(payload.final_decision, 220) || fallback.final_decision,
    skill_delta_line: skillDeltaLine ? clean(skillDeltaLine, 320) : ''
  }
}

function buildOpenAIRequestBody(model, prompt) {
  return {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.45,
    max_completion_tokens: 2200
  }
}

export async function POST(req) {
  let charged = false
  let admin = null
  let userId = null
  let token = null

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const apiKey = process.env.OPENAI_API_KEY
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
      return NextResponse.json({ error: 'Deep analysis unavailable' }, { status: 500 })
    }

    token = extractBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    userId = await resolveUserId(userData, admin)

    const rateLimit = await checkRateLimit(userId, '/api/card-advisor-lab/deep-analysis', 6, 60000)
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const card = normalizeCard(body.card)
    const lang = body.lang === 'en' ? 'en' : 'it'
    if (!card.name || !card.position) return NextResponse.json({ error: 'Invalid card' }, { status: 400 })

    const catalogCard = await resolveCatalogCardForDeepAnalysis(admin, card)
    const hasUsableCardData =
      catalogCard?.enrichment_status === 'complete' &&
      catalogCard?.base_stats &&
      typeof catalogCard.base_stats === 'object' &&
      Object.keys(catalogCard.base_stats).length > 0
    if (!hasUsableCardData) {
      return NextResponse.json(
        {
          error: lang === 'en'
            ? 'Detailed analysis is not ready for this card yet.'
            : 'Analisi dettagliata non ancora pronta per questa carta.',
          code: 'card_data_not_ready'
        },
        { status: 409 }
      )
    }

    const deduction = await deductCredits(admin, userId, token, DEEP_ANALYSIS_COST, 'card-advisor-deep-analysis')
    if (!deduction.success) {
      return NextResponse.json(
        {
          error: lang === 'en'
            ? `You need ${DEEP_ANALYSIS_COST} HP to unlock the Pro verdict.`
            : `Ti servono ${DEEP_ANALYSIS_COST} HP per sbloccare il verdetto Pro.`,
          code: 'insufficient_credits',
          requiredCredits: DEEP_ANALYSIS_COST
        },
        { status: 402 }
      )
    }
    charged = true

    const [
      profileRes,
      playersRes,
      stylesRes,
      formationRes,
      coachRes,
      tacticalRes,
      patternsRes,
      gameAnalysisRes,
      diagnosticRes,
      feedbackRes,
      performanceRes
    ] = await Promise.all([
      admin.from('user_profiles').select('first_name, nickname, team_name, ai_weak_point, ai_learn_goals, ai_notes, input_delay, connection_quality, pass_level').eq('user_id', userId).maybeSingle(),
      admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, skills, com_skills, form, base_stats, original_positions, height, weight, current_level, level_cap, active_booster_name, metadata, development_points').eq('user_id', userId).limit(60),
      admin.from('playing_styles').select('id, name'),
      admin.from('formation_layout').select('formation, slot_positions, updated_at').eq('user_id', userId).maybeSingle(),
      admin.from('coaches').select('coach_name, playing_style_competence, connection, stat_boosters, updated_at').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      admin.from('team_tactical_settings').select('team_playing_style, individual_instructions, updated_at').eq('user_id', userId).maybeSingle(),
      admin.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg, last_50_matches_count').eq('user_id', userId).maybeSingle(),
      admin.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle(),
      admin.from('user_diagnostic_cache').select('content, generated_at').eq('user_id', userId).maybeSingle(),
      admin.from('user_tactical_feedback').select('conversation_summary, insights, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      admin.from('player_performance_aggregates').select('player_id, average_rating, total_goals, total_assists, positions_played, position_performance, attack_areas_avg, recovery_zones_avg, last_50_matches_count').eq('user_id', userId).limit(20)
    ])

    const stylesLookup = {}
    ;(stylesRes.data || []).forEach(style => { stylesLookup[style.id] = style.name })
    const feedback = (feedbackRes.data || []).map(row => ({
      summary: sanitize(row.conversation_summary, 400),
      insights: Array.isArray(row.insights) ? row.insights.slice(0, 4) : []
    }))
    const performance = (performanceRes.data || []).slice(0, 12)
    const ragKnowledge = getRelevantSections(
      buildCardAdvisorRagQuery(card, catalogCard, tacticalRes.data || null),
      9000
    )

    const players = playersRes.data || []
    const skillDeltaLine = buildSkillDeltaSentence({
      card,
      catalogCard,
      players,
      formation: formationRes.data || null,
      profile: profileRes.data || {},
      gameAnalysis: gameAnalysisRes.data || null,
      patterns: patternsRes.data || {},
      lang
    })

    const purchaseFacts = buildPurchaseFactsBlock({
      card,
      catalogCard,
      players,
      formation: formationRes.data || null,
      profile: profileRes.data || {},
      gameAnalysis: gameAnalysisRes.data || null,
      patterns: patternsRes.data || {},
      stylesLookup,
      lang
    })
    const purchaseFactsText = purchaseFacts.text
    let buildComparisonText = ''
    try {
      const buildPreview = await computeCardAdvisorBuildPreview({
        card,
        catalogRow: catalogCard,
        rosterContext: {
          players,
          tacticalSettings: tacticalRes.data || null,
          activeCoach: coachRes.data || null,
          layout: formationRes.data || null
        },
        lang,
        admin
      })
      buildComparisonText = summarizeBuildPreviewForPrompt(buildPreview, lang)
    } catch (error) {
      console.warn('[card-advisor-lab:deep-analysis] build comparison unavailable:', error?.message || error)
    }

    const prompt = buildPrompt({
      lang,
      card,
      catalogCard,
      profile: profileRes.data || {},
      players,
      stylesLookup,
      formation: formationRes.data || null,
      coach: coachRes.data || null,
      tacticalSettings: tacticalRes.data || null,
      patterns: patternsRes.data || null,
      gameAnalysis: gameAnalysisRes.data || null,
      diagnostic: diagnosticRes.data || null,
      feedback,
      performance,
      ragKnowledge,
      skillDeltaSentence: skillDeltaLine,
      purchaseFactsText,
      buildComparisonText
    })

    const requestBody = buildOpenAIRequestBody(MODEL, prompt)

    let response
    try {
      response = await callOpenAIWithRetry(apiKey, requestBody, 'card-advisor-deep-analysis')
    } catch (error) {
      if (error?.type !== 'model_not_found' || MODEL === 'gpt-4o') throw error
      response = await callOpenAIWithRetry(apiKey, buildOpenAIRequestBody('gpt-4o', prompt), 'card-advisor-deep-analysis')
    }
    const payload = await parseOpenAIResponse(response, 'card-advisor-deep-analysis')
    const normalized = normalizeDeepAnalysis(payload, lang, skillDeltaLine)
    const analysis = suppressDefenderShootingPurchaseReason(
      calibratePremiumVerdict(
        normalized,
        {
          card,
          catalogCard,
          anchorType: purchaseFacts.anchor?.type,
          anchorLabel: purchaseFacts.anchor?.displayLabel,
          lang
        }
      ),
      { card, lang }
    )

    return NextResponse.json({
      success: true,
      cost: DEEP_ANALYSIS_COST,
      analysis
    })
  } catch (error) {
    console.error('[card-advisor-lab:deep-analysis] error:', error)
    if (charged && admin && userId) {
      await refundCredits(admin, userId, DEEP_ANALYSIS_COST, 'card-advisor-deep-analysis')
    }
    return NextResponse.json({ error: 'Deep analysis unavailable' }, { status: 500 })
  }
}
