import { NextResponse } from 'next/server'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { getRelevantSectionsForContext } from '@/lib/ragHelper'
import { buildSmartCountermeasurePrompt } from '@/lib/smartCoachPrompts'
import { getAuthenticatedSmartRequest } from '@/lib/smartCoachServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

function buildFallbackCountermeasure(lang, smartContext, variant = 'default') {
  const formation = smartContext?.formation || (lang === 'en' ? 'your current shape' : 'il tuo assetto attuale')
  const toneHeadline = variant === 'alternative'
    ? (lang === 'en' ? 'Alternative Smart suggestion' : 'Suggerimento Smart alternativo')
    : (lang === 'en' ? 'Immediate Smart suggestion' : 'Suggerimento Smart immediato')

  if (lang === 'en') {
    return {
      headline: toneHeadline,
      protect: `With ${formation}, protect central access first and keep your midfield compact before chasing wide pressure.`,
      attack: `Use the lane your shape opens naturally and attack with one clear route instead of forcing every vertical pass.`,
      avoid: 'Do not break your structure too early just to press one player.'
    }
  }

  return {
    headline: toneHeadline,
    protect: `Con ${formation}, proteggi prima l'accesso centrale e tieni compatto il centrocampo prima di inseguire pressione laterale.`,
    attack: `Usa la corsia che il tuo assetto apre in modo naturale e attacca con una sola via chiara invece di forzare ogni verticalizzazione.`,
    avoid: 'Non rompere la struttura troppo presto solo per andare a pressare un singolo uomo.'
  }
}

export async function POST(req) {
  const auth = await getAuthenticatedSmartRequest(req)
  if (auth.errorResponse) return auth.errorResponse

  const { admin, userId, lang } = auth
  const rateLimitConfig = RATE_LIMIT_CONFIG['/api/smart/countermeasures']
  const rateLimit = await checkRateLimit(
    userId,
    '/api/smart/countermeasures',
    rateLimitConfig?.maxRequests,
    rateLimitConfig?.windowMs
  )

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: lang === 'en' ? 'Too many requests' : 'Troppe richieste' }, { status: 429 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Smart countermeasures unavailable' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const variant = body.variant === 'alternative' ? 'alternative' : 'default'

  try {
    const { smartContext, profile, matches, patterns, gameAnalysis } = await loadSharedContext(admin, userId)

    if (!smartContext) {
      return NextResponse.json({ error: 'Smart context not found' }, { status: 400 })
    }

    const used = Number(smartContext.countermeasures_used) || 0

    const ragKnowledge = getRelevantSectionsForContext('countermeasures', 9000)
    const prompt = buildSmartCountermeasurePrompt({
      lang,
      context: smartContext,
      profile,
      matches,
      patterns,
      gameAnalysis,
      ragKnowledge,
      variant
    })

    const requestBody = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 900
    }

    let payload
    try {
      const response = await callOpenAIWithRetry(apiKey, requestBody, 'smart-countermeasures')
      payload = await parseOpenAIResponse(response, 'smart-countermeasures')
    } catch (error) {
      if (error?.type === 'model_not_found') {
        const fallbackBody = { ...requestBody, model: 'gpt-4o' }
        const response = await callOpenAIWithRetry(apiKey, fallbackBody, 'smart-countermeasures')
        payload = await parseOpenAIResponse(response, 'smart-countermeasures')
      } else {
        payload = buildFallbackCountermeasure(lang, smartContext, variant)
      }
    }

    const countermeasure = {
      headline: typeof payload.headline === 'string' ? payload.headline.trim() : (lang === 'en' ? 'Smart read' : 'Lettura Smart'),
      protect: typeof payload.protect === 'string' ? payload.protect.trim() : '',
      attack: typeof payload.attack === 'string' ? payload.attack.trim() : '',
      avoid: typeof payload.avoid === 'string' ? payload.avoid.trim() : '',
      variant,
      generated_at: new Date().toISOString()
    }

    const nextCount = used + 1
    const previous = Array.isArray(smartContext.last_countermeasures) ? smartContext.last_countermeasures : []
    const { error: updateError } = await admin
      .from('smart_coach_contexts')
      .update({
        countermeasures_used: nextCount,
        last_countermeasures: [...previous, countermeasure].slice(-2),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[smart/countermeasures] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to persist Smart countermeasure' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      countermeasure
    })
  } catch (error) {
    console.error('[smart/countermeasures] Error:', error)
    return NextResponse.json({ error: 'Unable to generate Smart countermeasure' }, { status: 500 })
  }
}
