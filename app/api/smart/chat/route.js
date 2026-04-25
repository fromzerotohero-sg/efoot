import { NextResponse } from 'next/server'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { getRelevantSections } from '@/lib/ragHelper'
import { SMART_CHAT_LIMIT } from '@/lib/smartCoach'
import { buildSmartChatPrompt } from '@/lib/smartCoachPrompts'
import { getAuthenticatedSmartRequest } from '@/lib/smartCoachServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeSuggestions(lang, suggestions) {
  const list = Array.isArray(suggestions)
    ? suggestions.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : []

  if (list.length >= 3) return list.slice(0, 3)

  return lang === 'en'
    ? ['Open Pro for deeper player detail', 'Ask for a pre-match priority', 'Review the structural weak point']
    : ['Apri il Pro per piu dettagli sui singoli', 'Chiedi una priorita pre-partita', 'Rivedi il punto debole strutturale']
}

function buildFallbackSmartChatAnswer(lang, smartContext, profile, message) {
  const formation = smartContext?.formation || (lang === 'en' ? 'your current setup' : 'il tuo assetto attuale')
  const playerCount = Array.isArray(smartContext?.players) ? smartContext.players.length : 0
  const weakPoint = profile?.ai_weak_point ? String(profile.ai_weak_point) : ''
  const lowerMessage = String(message || '').toLowerCase()

  if (lang === 'en') {
    if (lowerMessage.includes('defend') || lowerMessage.includes('pressure') || lowerMessage.includes('weakness')) {
      return `With ${formation} and ${playerCount} detected starters, keep your first focus on structure and distances between lines. Protect the center first, then react to wide threats only when the pass is already travelling. If you want player-by-player precision, open Pro.`
    }
    if (lowerMessage.includes('attack') || lowerMessage.includes('score') || lowerMessage.includes('offensive')) {
      return `With ${formation}, your first attacking priority should be one clear route instead of forcing every lane. Attack the space your shape naturally opens and avoid rushing vertical actions if the center is crowded. If you want deeper individual advice, open Pro.`
    }
    return `From this Smart view I can already guide you on structure, priorities, and matchup logic with ${formation}. Your best next step is to protect your main weak zone first and play from a clear team plan instead of individual improvisation. If you need deeper player-level guidance, open Pro.`
  }

  if (lowerMessage.includes('dif') || lowerMessage.includes('pression') || lowerMessage.includes('debole')) {
    return `Con ${formation} e ${playerCount} titolari rilevati, la prima priorità è tenere struttura e distanze tra i reparti. Proteggi prima il centro e reagisci sulle corsie solo quando il passaggio sta già viaggiando. Se vuoi precisione sui singoli, apri il Pro.`
  }
  if (lowerMessage.includes('attac') || lowerMessage.includes('gol') || lowerMessage.includes('offens')) {
    return `Con ${formation}, la tua prima priorità offensiva deve essere una via chiara invece di forzare tutte le linee. Attacca lo spazio che il modulo ti apre in modo naturale ed evita verticalizzazioni affrettate quando il centro è intasato. Se vuoi un consiglio più profondo sui singoli, apri il Pro.`
  }
  return `Da questa vista Smart posso già guidarti su struttura, priorità e logica del matchup con ${formation}. Il passo migliore adesso è proteggere prima la tua zona più fragile e giocare con un piano di squadra chiaro, non con improvvisazione sui singoli. Se vuoi profondità sui giocatori, apri il Pro.`
}

async function loadSharedContext(admin, userId) {
  const [
    { data: smartContext },
    { data: profile },
    { data: matches },
    { data: patterns },
    { data: gameAnalysis }
  ] = await Promise.all([
    admin.from('smart_coach_contexts').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('user_profiles')
      .select('first_name, team_name, ai_name, current_division, platform, ai_weak_point, ai_learn_goals')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('matches')
      .select('match_date, opponent_name, result')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(5),
    admin.from('team_tactical_patterns')
      .select('formation_usage, recurring_issues')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('user_game_analysis')
      .select('stats, captured_at')
      .eq('user_id', userId)
      .maybeSingle()
  ])

  return { smartContext, profile, matches: matches || [], patterns, gameAnalysis }
}

export async function POST(req) {
  const auth = await getAuthenticatedSmartRequest(req)
  if (auth.errorResponse) return auth.errorResponse

  const { admin, userId, lang } = auth
  const rateLimitConfig = RATE_LIMIT_CONFIG['/api/smart/chat']
  const rateLimit = await checkRateLimit(
    userId,
    '/api/smart/chat',
    rateLimitConfig?.maxRequests,
    rateLimitConfig?.windowMs
  )

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: lang === 'en' ? 'Too many requests' : 'Troppe richieste' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Smart chat unavailable' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  try {
    const { smartContext, profile, matches, patterns, gameAnalysis } = await loadSharedContext(admin, userId)

    if (!smartContext) {
      return NextResponse.json({ error: 'Smart context not found' }, { status: 400 })
    }

    if (smartContext.chat_used) {
      return NextResponse.json({ error: 'Smart chat limit reached', quota_exhausted: true }, { status: 403 })
    }

    const ragKnowledge = getRelevantSections(message, 10000)
    const prompt = buildSmartChatPrompt({
      lang,
      message,
      context: smartContext,
      profile,
      matches,
      patterns,
      gameAnalysis,
      ragKnowledge
    })

    const requestBody = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 900
    }

    let payload
    try {
      const response = await callOpenAIWithRetry(apiKey, requestBody, 'smart-chat')
      payload = await parseOpenAIResponse(response, 'smart-chat')
    } catch (error) {
      if (error?.type === 'model_not_found') {
        const fallbackBody = { ...requestBody, model: 'gpt-4o' }
        const response = await callOpenAIWithRetry(apiKey, fallbackBody, 'smart-chat')
        payload = await parseOpenAIResponse(response, 'smart-chat')
      } else {
        payload = {
          answer: buildFallbackSmartChatAnswer(lang, smartContext, profile, message),
          suggestions: normalizeSuggestions(lang)
        }
      }
    }

    const answer = typeof payload.answer === 'string' && payload.answer.trim().length > 0
      ? payload.answer.trim()
      : (lang === 'en' ? 'Use Pro if you need deeper player-level advice.' : 'Usa il Pro se ti serve un consiglio più profondo sui singoli.')
    const suggestions = normalizeSuggestions(lang, payload.suggestions)

    const { error: updateError } = await admin
      .from('smart_coach_contexts')
      .update({
        chat_used: SMART_CHAT_LIMIT > 0,
        last_chat_answer: answer,
        last_chat_suggestions: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[smart/chat] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to persist Smart chat result' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      answer,
      suggestions,
      remaining: 0
    })
  } catch (error) {
    console.error('[smart/chat] Error:', error)
    return NextResponse.json({ error: 'Unable to generate Smart coach answer' }, { status: 500 })
  }
}
