import { NextResponse } from 'next/server'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { getRelevantSectionsForContext } from '@/lib/ragHelper'
import { validateCountermeasuresOutput } from '@/lib/countermeasuresHelper'
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
  const analysis = lang === 'en'
    ? `The opponent shape should be read against ${formation}. Use Smart mode as a structural pre-match read, then open Pro if you need deeper player-level precision.`
    : `La struttura avversaria va letta contro ${formation}. Usa la Smart come lettura strutturale pre-partita, poi apri il Pro se ti serve una precisione più profonda sui singoli.`

  return {
    analysis: {
      is_meta_formation: false,
      meta_type: null,
      opponent_formation_analysis: analysis,
      strengths: [],
      weaknesses: [],
      why_weaknesses: lang === 'en' ? 'Structural read generated with limited Smart data.' : 'Lettura strutturale generata con dati Smart limitati.'
    },
    countermeasures: {
      formation_adjustments: [],
      tactical_adjustments: [
        {
          type: 'pressing',
          suggestion: lang === 'en' ? 'Protect the center first' : 'Proteggi prima il centro',
          reason: lang === 'en' ? 'Keep your shape compact before chasing the ball wide.' : 'Mantieni la struttura compatta prima di inseguire la palla sulle fasce.',
          priority: 'high'
        },
        {
          type: 'possession_strategy',
          suggestion: lang === 'en' ? 'Attack the natural lane of your shape' : 'Attacca la corsia naturale del tuo assetto',
          reason: lang === 'en' ? 'Use the route your current structure opens most clearly.' : 'Sfrutta la via che la tua struttura apre in modo più chiaro.',
          priority: 'medium'
        }
      ],
      player_suggestions: [],
      individual_instructions: []
    },
    confidence: 62,
    data_quality: 'medium',
    warnings: [
      lang === 'en'
        ? 'Smart countermeasures are based on lightweight pre-match context.'
        : 'Le contromisure Smart sono basate su un contesto pre-partita leggero.'
    ]
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
    if (!smartContext.opponent_players || !Array.isArray(smartContext.opponent_players) || smartContext.opponent_players.length === 0) {
      return NextResponse.json({ error: 'Opponent formation is required for countermeasures' }, { status: 400 })
    }

    const used = Number(smartContext.countermeasures_used) || 0

    const ragKnowledge = getRelevantSectionsForContext('countermeasures', 9000)
    const prompt = buildSmartCountermeasurePrompt({
      lang,
      context: smartContext,
      opponentContext: {
        formation: smartContext.opponent_formation,
        players: smartContext.opponent_players,
        coach: smartContext.opponent_coach
      },
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

    const validation = validateCountermeasuresOutput(payload)
    const countermeasure = validation.valid
      ? { ...payload, variant, generated_at: new Date().toISOString() }
      : { ...buildFallbackCountermeasure(lang, smartContext, variant), variant, generated_at: new Date().toISOString() }

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
