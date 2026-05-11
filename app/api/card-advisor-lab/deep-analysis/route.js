import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { deductCredits, refundCredits } from '@/lib/creditService'
import { getRelevantSections } from '@/lib/ragHelper'
import { getCoachPoliciesText, getCoachSharedCoreText } from '@/lib/coachPromptRules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEEP_ANALYSIS_COST = 2
const MODEL = process.env.CARD_ADVISOR_DEEP_MODEL || process.env.OPENAI_MODEL || 'gpt-4o'

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
  'needs_review',
  'position_compatibility'
].join(',')

function sanitize(value, maxLen = 500) {
  const text = String(value ?? '').replace(/\r\n|\r|\n/g, ' ').trim()
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
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
    category: String(raw.category || '').trim(),
    style: String(raw.style || '').trim(),
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    sourcePlayerId: String(raw.sourcePlayerId || '').trim(),
    source: String(raw.source || '').trim()
  }
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

function sanitizeList(items = [], maxItems = 8, maxLen = 60) {
  return (Array.isArray(items) ? items : [])
    .map(item => sanitize(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems)
}

function compactPlayer(player, stylesLookup = {}) {
  const skills = [
    ...(Array.isArray(player?.skills) ? player.skills : []),
    ...(Array.isArray(player?.com_skills) ? player.com_skills : [])
  ]
  return {
    name: sanitize(player?.player_name, 60),
    position: player?.position || null,
    starter: Number(player?.slot_index) >= 0 && Number(player?.slot_index) <= 10,
    style: (player?.playing_style_id && stylesLookup[player.playing_style_id]) || player?.role || null,
    skills: sanitizeList(skills, 8),
    stats: summarizeStats(player?.base_stats || {}),
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

async function fetchCatalogCard(admin, card) {
  const safeName = String(card.name || '').replace(/[%_]/g, '').trim()
  let query = admin.from('player_catalog')
    .select(CATALOG_SELECT)
    .eq('catalog_ready', true)
    .eq('needs_review', false)
    .limit(8)

  if (card.sourcePlayerId && card.source === 'pesdb') {
    query = query.eq('source', 'pesdb').eq('source_player_id', card.sourcePlayerId)
  } else {
    if (!safeName) return null
    query = query.ilike('player_name', `%${safeName}%`).eq('position', card.position)
  }

  const { data } = await query
  if (!Array.isArray(data) || data.length === 0) return null
  return data
    .sort((a, b) => {
      const nameA = toAscii(a.player_name) === toAscii(card.name) ? 8 : 0
      const nameB = toAscii(b.player_name) === toAscii(card.name) ? 8 : 0
      const posA = a.position === card.position ? 4 : 0
      const posB = b.position === card.position ? 4 : 0
      return (nameB + posB) - (nameA + posA)
    })[0]
}

function buildPrompt({ lang, card, catalogCard, profile, players, formation, coach, tacticalSettings, patterns, gameAnalysis, diagnostic, feedback, performance, ragKnowledge }) {
  const isEn = lang === 'en'
  const cardStats = summarizeStats({ ...(catalogCard?.base_stats || {}), ...(catalogCard?.max_stats || {}) })
  const cardPayload = {
    name: card.name,
    position: card.position,
    category: card.category,
    source: card.source || catalogCard?.source || null,
    playing_style: card.style || catalogCard?.playing_style || null,
    native_skills: sanitizeList([...(card.skills || []), ...(catalogCard?.player_skills || [])], 14),
    stats: cardStats,
    position_compatibility: catalogCard?.position_compatibility || null,
    data_quality: catalogCard ? 'catalog_match' : 'release_basic'
  }

  const compactPlayers = players.map(player => compactPlayer(player, {}))
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

FOCUS:
- La domanda centrale non è "la carta è forte?", ma "questa carta crea valore reale per questa rosa?".
- Se la rosa è presente, parla in modo personalizzato e deciso.
- Se la rosa non è presente, fai solo review carta basata su stile, skill e stats disponibili.
- Non parlare di overall/rating come criterio.
- Non inventare nomi, skill, problemi o ruoli non presenti nei dati.
- Stili e abilità sono diversi: lo stile spiega il movimento; le abilità spiegano cosa sa fare.
- Se trovi una combo reale, mettila al centro. Se manca metà combo, dillo.
- Usa il RAG solo come conoscenza eFootball, non come testo da copiare.

SEMANTICA:
- Usa termini da coach/community: movimento, skill nativa, combo, catena, rotazione, non prioritaria, luxury pick, riferimento in area, attacca spazio, dà ampiezza, tiene posizione, non cambia gerarchie.
- Evita: "fit stile 56%", "bonus sistema", "sinergia principale", "stat edge", "overall", "rating", "buildalo", "potenzialo", "allenalo".

CARTA
${JSON.stringify(cardPayload, null, 2)}

CONTESTO CLIENTE
${JSON.stringify(contextPayload, null, 2)}

RAG EFOOTBALL
${ragKnowledge || 'Nessun RAG disponibile.'}

OUTPUT:
Restituisci SOLO JSON valido con questa struttura:
{
  "headline": "titolo breve e deciso",
  "verdict": "take|premium_rotation|situational|luxury_pick|not_priority|skip",
  "summary": "analisi principale in 3-5 frasi, tono coach sicuro",
  "card_identity": {
    "movement": "movimento automatico da stile",
    "key_skills": ["skill rilevanti"],
    "best_use": "uso ideale"
  },
  "pros": ["3-5 pro concreti"],
  "cons": ["2-4 contro concreti"],
  "synergies": ["3-5 sinergie o combo, incluse combo assenti se importanti"],
  "how_to_use": ["2-4 indicazioni pratiche"],
  "when_to_avoid": ["1-3 casi in cui perde valore"],
  "final_decision": "decisione finale netta e utile"
}
`.trim()
}

function normalizeDeepAnalysis(payload, lang) {
  const fallback = lang === 'en'
    ? {
        headline: 'Detailed card read unavailable',
        verdict: 'situational',
        summary: 'The detailed analysis could not be completed. Use the base Card Advisor read for now.',
        card_identity: { movement: '', key_skills: [], best_use: '' },
        pros: [],
        cons: [],
        synergies: [],
        how_to_use: [],
        when_to_avoid: [],
        final_decision: 'Use the base read until a new detailed analysis is available.'
      }
    : {
        headline: 'Analisi dettagliata non disponibile',
        verdict: 'situational',
        summary: 'Non è stato possibile completare l’analisi dettagliata. Usa per ora la lettura base del Card Advisor.',
        card_identity: { movement: '', key_skills: [], best_use: '' },
        pros: [],
        cons: [],
        synergies: [],
        how_to_use: [],
        when_to_avoid: [],
        final_decision: 'Usa la lettura base finché non è disponibile una nuova analisi dettagliata.'
      }

  if (!payload || typeof payload !== 'object') return fallback
  const arr = (value) => Array.isArray(value) ? value.map(item => sanitize(item, 260)).filter(Boolean).slice(0, 5) : []
  return {
    headline: sanitize(payload.headline, 120) || fallback.headline,
    verdict: ['take', 'premium_rotation', 'situational', 'luxury_pick', 'not_priority', 'skip'].includes(payload.verdict) ? payload.verdict : 'situational',
    summary: sanitize(payload.summary, 900) || fallback.summary,
    card_identity: {
      movement: sanitize(payload.card_identity?.movement, 260),
      key_skills: arr(payload.card_identity?.key_skills),
      best_use: sanitize(payload.card_identity?.best_use, 260)
    },
    pros: arr(payload.pros),
    cons: arr(payload.cons),
    synergies: arr(payload.synergies),
    how_to_use: arr(payload.how_to_use),
    when_to_avoid: arr(payload.when_to_avoid),
    final_decision: sanitize(payload.final_decision, 500) || fallback.final_decision
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

    const deduction = await deductCredits(admin, userId, token, DEEP_ANALYSIS_COST, 'card-advisor-deep-analysis')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Insufficient credits' : 'Crediti insufficienti' },
        { status: 402 }
      )
    }
    charged = true

    const catalogCard = await fetchCatalogCard(admin, card).catch(() => null)
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
      admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, skills, com_skills, form, base_stats, original_positions, height, weight').eq('user_id', userId).limit(60),
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
    const players = (playersRes.data || []).map(player => compactPlayer(player, stylesLookup))
    const feedback = (feedbackRes.data || []).map(row => ({
      summary: sanitize(row.conversation_summary, 400),
      insights: Array.isArray(row.insights) ? row.insights.slice(0, 4) : []
    }))
    const performance = (performanceRes.data || []).slice(0, 12)
    const ragKnowledge = getRelevantSections('stili giocatore abilità giocatori statistiche cross passaggio filtrante colpo di testa intercettazione movimenti eFootball', 9000)

    const prompt = buildPrompt({
      lang,
      card,
      catalogCard,
      profile: profileRes.data || {},
      players: playersRes.data || [],
      formation: formationRes.data || null,
      coach: coachRes.data || null,
      tacticalSettings: tacticalRes.data || null,
      patterns: patternsRes.data || null,
      gameAnalysis: gameAnalysisRes.data || null,
      diagnostic: diagnosticRes.data || null,
      feedback,
      performance,
      ragKnowledge
    })

    const requestBody = {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.45,
      max_tokens: 1600
    }

    let response
    try {
      response = await callOpenAIWithRetry(apiKey, requestBody, 'card-advisor-deep-analysis')
    } catch (error) {
      if (error?.type !== 'model_not_found' || MODEL === 'gpt-4o') throw error
      response = await callOpenAIWithRetry(apiKey, { ...requestBody, model: 'gpt-4o' }, 'card-advisor-deep-analysis')
    }
    const payload = await parseOpenAIResponse(response, 'card-advisor-deep-analysis')
    const analysis = normalizeDeepAnalysis(payload, lang)

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
