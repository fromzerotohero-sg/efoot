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
      model: (process.env.OPENAI_MODEL || 'gpt-5.2').trim(),
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
        throw error
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
