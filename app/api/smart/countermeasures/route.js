import { NextResponse } from 'next/server'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { getRelevantSectionsForContext } from '@/lib/ragHelper'
import { validateCountermeasuresOutput } from '@/lib/countermeasuresHelper'
import { deductCredits, refundCredits } from '@/lib/creditService'
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
    ? `The opponent shape should be read against ${formation}. Use Smart mode as a structural pre-match read, then open the full version if you need deeper player-level precision.`
    : `La struttura avversaria va letta contro ${formation}. Usa la Smart come lettura strutturale pre-partita, poi apri la versione completa se ti serve una precisione più profonda sui singoli.`

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
          type: 'match_plan',
          suggestion: lang === 'en' ? 'In match: protect the center before chasing wide' : 'In partita: proteggi prima il centro, poi esci sulle fasce',
          application_hint: lang === 'en' ? 'This is not a menu setting: use it as your defensive behavior during the match.' : 'Non è una voce menu: è il comportamento difensivo da usare durante la partita.',
          reason: lang === 'en' ? 'It keeps the opponent from receiving between your midfield and defence.' : 'Riduce le ricezioni tra centrocampo e difesa.',
          priority: 'high'
        },
        {
          type: 'match_plan',
          suggestion: lang === 'en' ? 'In match: attack the lane your shape opens most clearly' : 'In partita: attacca la corsia che il tuo assetto apre meglio',
          application_hint: lang === 'en' ? 'This is a play plan, not a separate eFootball setting.' : 'È un piano di gioco, non una voce separata di eFootball.',
          reason: lang === 'en' ? 'It gives you one clear route without forcing a formation change.' : 'Ti dà una via chiara senza forzare un cambio modulo.',
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

function ensureRichSmartCountermeasure(countermeasure, lang) {
  if (!countermeasure || typeof countermeasure !== 'object') return countermeasure

  if (!countermeasure.analysis || typeof countermeasure.analysis !== 'object') {
    countermeasure.analysis = {}
  }
  if (!Array.isArray(countermeasure.analysis.strengths)) countermeasure.analysis.strengths = []
  if (!Array.isArray(countermeasure.analysis.weaknesses)) countermeasure.analysis.weaknesses = []
  if (!countermeasure.analysis.why_weaknesses) {
    countermeasure.analysis.why_weaknesses = lang === 'en'
      ? 'Read the opponent shape through central access, width, and support distances.'
      : 'Leggi la struttura avversaria attraverso accesso centrale, ampiezza e distanze di supporto.'
  }

  const defaultStrengths = lang === 'en'
    ? ['Compact central structure', 'Clear support around the attacking hub']
    : ['Compattezza centrale', 'Supporto chiaro attorno al fulcro offensivo']
  const defaultWeaknesses = lang === 'en'
    ? ['Width can become fragile', 'Cross defence can open if shape stretches']
    : ['L\'ampiezza può diventare fragile', 'La difesa ai cross può aprirsi se la struttura si allunga']

  while (countermeasure.analysis.strengths.length < 2) {
    const next = defaultStrengths[countermeasure.analysis.strengths.length]
    if (!next) break
    countermeasure.analysis.strengths.push(next)
  }
  while (countermeasure.analysis.weaknesses.length < 2) {
    const next = defaultWeaknesses[countermeasure.analysis.weaknesses.length]
    if (!next) break
    countermeasure.analysis.weaknesses.push(next)
  }

  if (!countermeasure.countermeasures || typeof countermeasure.countermeasures !== 'object') {
    countermeasure.countermeasures = {}
  }
  if (!Array.isArray(countermeasure.countermeasures.formation_adjustments)) countermeasure.countermeasures.formation_adjustments = []
  if (!Array.isArray(countermeasure.countermeasures.tactical_adjustments)) countermeasure.countermeasures.tactical_adjustments = []
  if (!Array.isArray(countermeasure.countermeasures.player_suggestions)) countermeasure.countermeasures.player_suggestions = []
  if (!Array.isArray(countermeasure.countermeasures.individual_instructions)) countermeasure.countermeasures.individual_instructions = []

  const tacticalAdjustments = countermeasure.countermeasures.tactical_adjustments
  const existingTypes = new Set(tacticalAdjustments.map((adj) => adj?.type).filter(Boolean))

  const defaults = lang === 'en'
    ? [
        {
          type: 'match_plan',
          suggestion: 'In match: press in short bursts in central lanes',
          application_hint: 'This is not a menu setting: use it as defensive behavior during the match.',
          reason: 'Reduce the influence of the opponent playmaker before the final pass.',
          priority: 'high'
        },
        {
          type: 'match_plan',
          suggestion: 'In match: protect depth first with central cover and short pressing bursts',
          application_hint: 'Deep Line is legacy in eFootball v6; use a practical defensive behavior or a current Individual Instruction only when it clearly fits.',
          reason: 'Protect depth first if the opponent can attack quickly between lines.',
          priority: 'high'
        },
        {
          type: 'match_plan',
          suggestion: 'In match: switch to the freer side before forcing vertical play',
          application_hint: 'This is a play plan, not a separate eFootball setting.',
          reason: 'Attack the weaker lane instead of entering the densest zone too early.',
          priority: 'medium'
        }
      ]
    : [
        {
          type: 'match_plan',
          suggestion: 'In partita: pressa a scatti nelle corsie centrali',
          application_hint: 'Non è una voce menu: è il comportamento difensivo da usare durante la partita.',
          reason: 'Riduci l’influenza del regista avversario prima dell’ultimo passaggio.',
          priority: 'high'
        },
        {
          type: 'match_plan',
          suggestion: 'In partita: proteggi prima la profondità con copertura centrale e pressing a scatti',
          application_hint: 'Linea Bassa è legacy in eFootball v6: usa un comportamento difensivo pratico o una Istruzione Individuale corrente solo quando è davvero adatta.',
          reason: 'Proteggi prima la profondità se l’avversario può attaccare rapidamente tra le linee.',
          priority: 'high'
        },
        {
          type: 'match_plan',
          suggestion: 'In partita: cambia lato prima di forzare la verticalità',
          application_hint: 'È un piano di gioco, non una voce separata di eFootball.',
          reason: 'Attacca la corsia più debole invece di entrare subito nella zona più densa.',
          priority: 'medium'
        }
      ]

  for (const adj of defaults) {
    if (tacticalAdjustments.length >= 3) break
    if (existingTypes.has(adj.type)) continue
    tacticalAdjustments.push(adj)
    existingTypes.add(adj.type)
  }

  return countermeasure
}

export async function POST(req) {
  const auth = await getAuthenticatedSmartRequest(req)
  if (auth.errorResponse) return auth.errorResponse

  const { admin, userId, token, lang } = auth
  const rateLimitConfig = RATE_LIMIT_CONFIG['/api/smart/countermeasures']
  let charged = false
  const operationType = 'smart-countermeasures'
  const cost = 2
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

    const deduction = await deductCredits(admin, userId, token, cost, operationType)
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402 }
      )
    }
    charged = true

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
    const baseCountermeasure = validation.valid
      ? { ...payload, variant, generated_at: new Date().toISOString() }
      : { ...buildFallbackCountermeasure(lang, smartContext, variant), variant, generated_at: new Date().toISOString() }
    const countermeasure = ensureRichSmartCountermeasure(baseCountermeasure, lang)

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
      if (charged) {
        await refundCredits(admin, userId, cost, operationType)
      }
      return NextResponse.json({ error: 'Failed to persist Smart countermeasure' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      countermeasure
    })
  } catch (error) {
    console.error('[smart/countermeasures] Error:', error)
    if (charged) {
      await refundCredits(admin, userId, cost, operationType)
    }
    return NextResponse.json({ error: 'Unable to generate Smart countermeasure' }, { status: 500 })
  }
}
