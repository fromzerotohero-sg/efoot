import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { generateCountermeasuresPrompt, validateCountermeasuresOutput } from '@/lib/countermeasuresHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'
import { validateIndividualInstruction } from '@/lib/tacticalInstructions'
import { validateStartingXISwap } from '@/lib/formationDefenseRules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  let creditChargeContext = null
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    let userId = userData.user.id

    // Recupera dati contestuali
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/generate-countermeasures']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/generate-countermeasures',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { opponent_formation_id, context, language = 'it' } = body
    const lang = (language === 'en' || language === 'it') ? language : 'it'

    if (!opponent_formation_id || typeof opponent_formation_id !== 'string') {
      return NextResponse.json({ error: 'opponent_formation_id is required' }, { status: 400 })
    }

    // Validazione UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(opponent_formation_id)) {
      return NextResponse.json({ error: 'Invalid opponent_formation_id format' }, { status: 400 })
    }

    // 1. Recupera formazione avversaria
    const { data: opponentFormation, error: formationError } = await admin
      .from('opponent_formations')
      .select('id, user_id, formation_name, playing_style, tactical_style, overall_strength, players, extracted_data, is_pre_match, formation_image, match_date, created_at, updated_at')
      .eq('id', opponent_formation_id)
      .eq('user_id', userId)
      .single()

    if (formationError || !opponentFormation) {
      return NextResponse.json(
        { error: 'Opponent formation not found or access denied' },
        { status: 404 }
      )
    }

    // 2. Recupera rosa cliente completa (con slot_index per titolari/riserve)
    const { data: clientRoster, error: rosterError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions, photo_slots')
      .eq('user_id', userId)
      .order('overall_rating', { ascending: false })
      .limit(100) // Max 100 giocatori

    const roster = clientRoster || []
    
    // 2.1 Recupera playing_styles per lookup nomi
    const { data: playingStyles, error: stylesError } = await admin
      .from('playing_styles')
      .select('id, name')
    
    const stylesLookup = {}
    if (playingStyles && !stylesError) {
      playingStyles.forEach(style => {
        stylesLookup[style.id] = style.name
      })
    }

    // Titolari = slot_index 0-10, riserve = slot_index null (audit contromisure)
    const titolari = roster
      .filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
      .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
    const riserve = roster.filter(p => p.slot_index == null)

    // 3. Recupera formazione cliente
    const { data: clientFormation, error: formationLayoutError } = await admin
      .from('formation_layout')
      .select('formation, slot_positions')
      .eq('user_id', userId)
      .maybeSingle()

    // 4. Recupera impostazioni tattiche
    const { data: tacticalSettings, error: tacticalError } = await admin
      .from('team_tactical_settings')
      .select('team_playing_style, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle()

    // 5. Recupera allenatore attivo
    const { data: activeCoach, error: coachError } = await admin
      .from('coaches')
      .select('coach_name, playing_style_competence, stat_boosters, connection')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    // 6. Recupera storico match completo (ultime 20 per analisi)
    const { data: matchHistory, error: historyError } = await admin
      .from('matches')
      .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, player_ratings, team_stats, attack_areas, match_date')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(20)

    // 6.1 Analizza match con formazioni simili all'avversario
    const similarFormationMatches = []
    const opponentFormationName = opponentFormation.formation_name || ''
    const opponentPlayingStyle = opponentFormation.playing_style || ''
    
    // Lookup formazioni avversarie storiche (serve fallback corretto quando manca il match per ID esatto)
    const historyOppIds = [...new Set((matchHistory || []).map(m => m.opponent_formation_id).filter(Boolean))]
    const historyOppMap = {}
    if (historyOppIds.length > 0) {
      const { data: historyOppRows } = await admin
        .from('opponent_formations')
        .select('id, formation_name, playing_style')
        .in('id', historyOppIds)
      ;(historyOppRows || []).forEach(o => { historyOppMap[o.id] = o })
    }

    if (matchHistory && matchHistory.length > 0) {
      matchHistory.forEach(match => {
        const matchOpponentFormationId = match.opponent_formation_id

        // Se match ha opponent_formation_id, confronta direttamente
        if (matchOpponentFormationId && matchOpponentFormationId === opponent_formation_id) {
          similarFormationMatches.push(match)
        } else {
          // Fallback: confronta usando la FORMAZIONE AVVERSARIA storica (non la formazione giocata dal cliente)
          const histOpp = matchOpponentFormationId ? historyOppMap[matchOpponentFormationId] : null
          const histOppFormation = histOpp?.formation_name || ''
          const histOppStyle = histOpp?.playing_style || ''
          const isSimilar = opponentFormationName && histOppFormation && (
            histOppFormation.includes(opponentFormationName) ||
            opponentFormationName.includes(histOppFormation) ||
            (opponentPlayingStyle && histOppStyle &&
             histOppStyle.toLowerCase().includes(opponentPlayingStyle.toLowerCase()))
          )

          if (isSimilar) {
            similarFormationMatches.push(match)
          }
        }
      })
    }

    // 6.2 Analizza performance giocatori contro formazioni simili
    // player_ratings può essere { cliente: { "Nome": { rating } } } o flat { id/name: rating }
    const playerPerformanceAgainstSimilar = {}
    const resolveRating = (v) => {
      if (typeof v === 'number' && v > 0) return v
      if (v && typeof v.rating === 'number') return v.rating
      const p = parseFloat(v)
      return Number.isFinite(p) ? p : 0
    }
    const resolveToPlayerId = (key, rosterList) => {
      const byId = rosterList.find(p => p.id === key)
      if (byId) return byId.id
      const byName = rosterList.find(p => (p.player_name || '').trim() === (key || '').trim())
      if (byName) return byName.id
      return null
    }

    if (similarFormationMatches.length > 0 && roster.length > 0) {
      similarFormationMatches.forEach(match => {
        if (!match.player_ratings || typeof match.player_ratings !== 'object') return
        const source = match.player_ratings.cliente && typeof match.player_ratings.cliente === 'object'
          ? match.player_ratings.cliente
          : (match.player_ratings.cliente || match.player_ratings.avversario) ? {} : match.player_ratings
        Object.entries(source).forEach(([key, rating]) => {
          const playerId = resolveToPlayerId(key, roster)
          if (!playerId) return
          const numRating = resolveRating(rating)
          if (numRating <= 0) return
          if (!playerPerformanceAgainstSimilar[playerId]) {
            playerPerformanceAgainstSimilar[playerId] = {
              matches: 0,
              totalRating: 0,
              ratings: [],
              playerName: roster.find(p => p.id === playerId)?.player_name || key
            }
          }
          playerPerformanceAgainstSimilar[playerId].matches++
          playerPerformanceAgainstSimilar[playerId].totalRating += numRating
          playerPerformanceAgainstSimilar[playerId].ratings.push(numRating)
        })
      })
    }

    // 6.3 Analizza abitudini tattiche cliente
    const tacticalHabits = {
      preferredFormations: {},
      preferredStyles: {},
      winRateByFormation: {},
      lossRateByFormation: {},
      commonIssues: []
    }

    if (matchHistory && matchHistory.length > 0) {
      matchHistory.forEach(match => {
        const formation = match.formation_played || 'unknown'
        const style = match.playing_style_played || 'unknown'
        const result = match.result || ''
        
        // Conta formazioni preferite
        if (!tacticalHabits.preferredFormations[formation]) {
          tacticalHabits.preferredFormations[formation] = 0
        }
        tacticalHabits.preferredFormations[formation]++

        // Conta stili preferiti
        if (!tacticalHabits.preferredStyles[style]) {
          tacticalHabits.preferredStyles[style] = 0
        }
        tacticalHabits.preferredStyles[style]++

        // Analizza win/loss rate per formazione
        if (!tacticalHabits.winRateByFormation[formation]) {
          tacticalHabits.winRateByFormation[formation] = { wins: 0, losses: 0, draws: 0, total: 0 }
        }
        tacticalHabits.winRateByFormation[formation].total++
        
        if (result.includes('W') || result.includes('Vittoria') || result.includes('Win')) {
          tacticalHabits.winRateByFormation[formation].wins++
        } else if (result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')) {
          tacticalHabits.winRateByFormation[formation].losses++
        } else {
          tacticalHabits.winRateByFormation[formation].draws++
        }
      })
    }

    // 7. Recupera pattern tattici (opzionale)
    const { data: tacticalPatterns, error: patternsError } = await admin
      .from('team_tactical_patterns')
      .select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg')
      .eq('user_id', userId)
      .maybeSingle()

    // 7b. Recupera feedback Palestra Coach (ultimi 30 giorni) — per coerenza con chat principale
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: coachFeedback } = await admin
      .from('user_tactical_feedback')
      .select('insights, formation_played, opponent_name, outcome, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5)

    // 7c. Recupera profilo IA (connessione, punto debole, game analysis) — contesto utente
    const { data: userProfile } = await admin
      .from('user_profiles')
      .select('first_name, connection_quality, input_delay, pass_level, ai_weak_point, ai_learn_goals, platform')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: gameAnalysis } = await admin
      .from('user_game_analysis')
      .select('stats')
      .eq('user_id', userId)
      .maybeSingle()

    // 9. Valida dati prima di generare prompt
if (!opponentFormation || !opponentFormation.formation_name) {
  return NextResponse.json(
    { error: 'Opponent formation data is incomplete' },
    { status: 400 }
  )
}

// 9.1 Log dati per debug
if (process.env.NODE_ENV !== 'production') {
  console.log('[generate-countermeasures] Data summary:', {
    opponentFormation: opponentFormation.formation_name,
    rosterSize: roster.length,
    titolariCount: titolari.length,
    riserveCount: riserve.length,
    hasClientFormation: !!clientFormation,
    hasTacticalSettings: !!tacticalSettings,
    hasActiveCoach: !!activeCoach,
    matchHistorySize: matchHistory?.length || 0,
    similarFormationMatches: similarFormationMatches.length,
    playerPerformanceCount: Object.keys(playerPerformanceAgainstSimilar).length
  })
}
    
    // 9.2 Genera prompt contestuale con analisi approfondita
    let prompt
    try {
      prompt = await generateCountermeasuresPrompt(
        opponentFormation,
        roster || [],
        clientFormation || null,
        tacticalSettings || null,
        activeCoach || null,
        matchHistory || [],
        tacticalPatterns || null,
        {
          similarFormationMatches: similarFormationMatches || [],
          playerPerformanceAgainstSimilar: playerPerformanceAgainstSimilar || {},
          tacticalHabits: tacticalHabits || {},
          titolari: titolari || [],
          riserve: riserve || [],
          stylesLookup: stylesLookup || {},
          team_playing_style: tacticalSettings?.team_playing_style || null,
          coachFeedback: coachFeedback || [],
          userProfile: userProfile || null,
          gameAnalysis: gameAnalysis?.stats || null
        },
        lang
      )
    } catch (promptErr) {
      console.error('[generate-countermeasures] Error generating prompt:', promptErr)
      return NextResponse.json(
        { error: 'Error generating prompt. Please try again.' },
        { status: 500 }
      )
    }

    // Validazione dimensione prompt (max 120KB: foto/contesto possono pesare di più)
    const promptSize = prompt.length
    const MAX_PROMPT_SIZE = 120 * 1024
    if (promptSize > MAX_PROMPT_SIZE) {
      return NextResponse.json(
        { error: 'Countermeasures data too large. Please reduce data size.' },
        { status: 413 }
      )
    }

    // Check and deduct credits upfront
    const deduction = await deductCredits(admin, userId, token, AI_COST, 'generate-countermeasures')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402 }
      )
    }
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'generate-countermeasures', functionName: 'generate-countermeasures:POST' }

    // 10. Default gpt-5.2 (alias gpt-5 deprecato), override con OPENAI_MODEL; fallback gpt-4o, gpt-4-turbo, gpt-4
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const preferredModel = process.env.OPENAI_MODEL || 'gpt-5.2'
    const models = [preferredModel, 'gpt-4o', 'gpt-4-turbo', 'gpt-4']
    let lastError = null
    let response = null
    let lastErrorDetails = null

    for (const model of models) {
      try {
        const requestBody = {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_completion_tokens: 2000
        }

        if (process.env.NODE_ENV !== 'production') console.log(`[generate-countermeasures] Trying model: ${model}, prompt size: ${prompt.length} chars`)
        response = await callOpenAIWithRetry(apiKey, requestBody, 'generate-countermeasures')
        
        if (response.ok) {
          if (process.env.NODE_ENV !== 'production') console.log(`[generate-countermeasures] Success with model: ${model}`)
          break // Successo, esci dal loop
        }
        
        const errorData = await response.json().catch(() => ({}))
        lastErrorDetails = errorData
        
        console.error(`[generate-countermeasures] Model ${model} failed:`, errorData)
        
        if (errorData.error?.code === 'model_not_found' || errorData.error?.message?.includes('not found')) {
          // Modello non disponibile, prova il prossimo
          lastError = errorData
          continue
        }
        
        // Se è un errore di formato o input, non provare altri modelli
        if (errorData.error?.code === 'invalid_request_error' || 
            errorData.error?.type === 'invalid_request_error' ||
            response.status === 400) {
          console.error(`[generate-countermeasures] Invalid request error:`, errorData)
          if (creditChargeContext?.admin && creditChargeContext?.userId) {
            await handleCreditOperationError(creditChargeContext.admin, {
              userId: creditChargeContext.userId,
              cost: creditChargeContext.cost,
              operationType: creditChargeContext.operationType,
              functionName: creditChargeContext.functionName,
              error: errorData?.error?.message || 'Invalid request error',
              statusCode: 500,
              errorType: 'provider_error',
              metadata: { endpoint: '/api/generate-countermeasures', stage: 'invalid_request_error' }
            })
          }
          return NextResponse.json(
            { error: errorData.error?.message || 'Invalid request. Please check your input and try again.' },
            { status: 400 }
          )
        }
        
        // Altro errore, non retry
        lastError = errorData
        break // Non provare altri modelli se è un errore diverso da model_not_found
      } catch (err) {
        console.error(`[generate-countermeasures] Exception with model ${model}:`, err)
        
        // Se è un errore di tipo "client_error" da openaiHelper, non provare altri modelli
        if (err.type === 'client_error' || err.message?.includes('Unable to process')) {
          lastError = err
          lastErrorDetails = { error: { message: err.message, type: err.type } }
          break
        }
        
        if (err.message?.includes('model') || err.message?.includes('not found')) {
          lastError = err
          continue // Prova modello successivo
        }
        
        // Altro errore, propaga
        lastError = err
        break
      }
    }

    if (!response || !response.ok) {
      const errorMessage = lastErrorDetails?.error?.message || 
                          lastError?.message || 
                          lastError?.error?.message ||
                          'Unable to generate countermeasures. Please try again.'
      
      console.error('[generate-countermeasures] All models failed. Last error:', lastErrorDetails || lastError)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: errorMessage,
          errorType: 'provider_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'all_models_failed' }
        })
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // 11. Parsing risposta JSON
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: 'No content in AI response',
          errorType: 'server_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'empty_content' }
        })
      }
      return NextResponse.json(
        { error: 'No content in response' },
        { status: 500 }
      )
    }

    let countermeasures
    try {
      countermeasures = JSON.parse(content)
    } catch (parseErr) {
      console.error('[generate-countermeasures] JSON parse error:', parseErr)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: parseErr,
          errorType: 'server_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'parse_response' }
        })
      }
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      )
    }

    // 12. Validazione output
    const validation = validateCountermeasuresOutput(countermeasures)
    if (!validation.valid) {
      console.error('[generate-countermeasures] Validation error:', validation.error)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: validation.error || 'Invalid AI output',
          errorType: 'server_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'validate_output' }
        })
      }
      return NextResponse.json(
        { error: `Invalid countermeasures format: ${validation.error}` },
        { status: 500 }
      )
    }

    // 12.1 Filtra suggerimenti invalidi (coerenza con rosa)
    if (countermeasures.countermeasures?.player_suggestions && Array.isArray(countermeasures.countermeasures.player_suggestions)) {
      const validSuggestions = []
      const invalidSuggestions = []
      
      // Crea mappe per lookup veloce
      const titolariMap = new Map(titolari.map(p => [p.id, p]))
      const riserveMap = new Map(riserve.map(p => [p.id, p]))
      const riserveByPosition = {}
      riserve.forEach(p => {
        const pos = p.position || 'N/A'
        if (!riserveByPosition[pos]) riserveByPosition[pos] = []
        riserveByPosition[pos].push(p)
      })
      
      // Posizioni portiere
      const gkPositions = ['GK', 'Goalkeeper', 'Portiere']
      const hasGKReserve = riserve.some(p => gkPositions.includes(p.position))
      
      countermeasures.countermeasures.player_suggestions.forEach((suggestion, idx) => {
        const playerId = suggestion.player_id
        const action = suggestion.action
        const position = suggestion.position || ''
        const isGK = gkPositions.some(gkPos => position.includes(gkPos) || position === gkPos)
        
        let isValid = true
        let reason = ''
        
        // Validazione: add_to_starting_xi
        if (action === 'add_to_starting_xi') {
          // Deve essere una riserva
          if (!riserveMap.has(playerId)) {
            isValid = false
            reason = `Giocatore ${suggestion.player_name || playerId} non è una riserva`
          }
          // Deve indicare CHI sostituire (titolare da mettere in panchina)
          else {
            const replaceId = suggestion.replace_player_id
            const replaceName = suggestion.replace_player_name
            if (!replaceId || !titolariMap.has(replaceId)) {
              isValid = false
              reason = `Suggerimento "aggiungi ${suggestion.player_name}" non indica un titolare da sostituire (replace_player_id mancante o non in formazione)`
            } else {
              const replaced = titolariMap.get(replaceId)
              const reserve = riserveMap.get(playerId)
              if (!replaceName) {
                suggestion.replace_player_name = replaced.player_name || replaced.name || '?'
              }
              const slotRole = String(replaced.position || suggestion.replace_position || '').trim()
              if (!suggestion.replace_position) {
                suggestion.replace_position = slotRole
              }
              suggestion.slot_role = slotRole
              if (reserve?.position) {
                suggestion.reserve_card_position = String(reserve.position).trim()
              } else if (suggestion.position) {
                suggestion.reserve_card_position = String(suggestion.position).trim()
              }

              const swapCheck = validateStartingXISwap(titolari, reserve || { position: suggestion.position }, replaceId)
              if (!swapCheck.valid) {
                isValid = false
                reason = `Sostituzione invalida per limiti difesa (${swapCheck.errors.join(', ')}): non si può avere 4 DC o zero terzini`
              }
            }
          }
          // Se è portiere, deve esserci riserva portiere
          if (isValid && isGK && !hasGKReserve) {
            isValid = false
            reason = `Nessuna riserva portiere disponibile per sostituire il portiere titolare`
          }
          // Se non ci sono riserve, non può aggiungere
          if (isValid && riserve.length === 0) {
            isValid = false
            reason = `Nessuna riserva disponibile in panchina`
          }
        }
        
        // Validazione: remove_from_starting_xi
        else if (action === 'remove_from_starting_xi') {
          // Deve essere un titolare
          if (!titolariMap.has(playerId)) {
            isValid = false
            reason = `Giocatore ${suggestion.player_name || playerId} non è un titolare`
          }
          // Se è portiere e non ci sono riserve portiere, non può rimuovere
          else if (isGK && !hasGKReserve) {
            isValid = false
            reason = `Non puoi rimuovere il portiere titolare: nessuna riserva portiere disponibile`
          }
        }
        
        if (isValid) {
          validSuggestions.push(suggestion)
        } else {
          invalidSuggestions.push({ suggestion, reason, index: idx })
          console.warn(`[generate-countermeasures] Suggerimento invalido filtrato [${idx}]:`, {
            player: suggestion.player_name,
            action: suggestion.action,
            position: suggestion.position,
            reason
          })
        }
      })
      
      // Sostituisci con suggerimenti validati
      countermeasures.countermeasures.player_suggestions = validSuggestions
      
      // Aggiungi warning se ci sono suggerimenti filtrati
      if (invalidSuggestions.length > 0) {
        if (!countermeasures.warnings) {
          countermeasures.warnings = []
        }
        countermeasures.warnings.push(
          `${invalidSuggestions.length} suggerimento/i giocatore filtrato/i perché non applicabili (nessuna riserva disponibile o posizione non valida)`
        )
      }
    }

    // 12.2 Valida istruzioni individuali suggerite rispetto alle regole prodotto
    if (countermeasures.countermeasures?.individual_instructions && Array.isArray(countermeasures.countermeasures.individual_instructions)) {
      const validInstructions = []
      const invalidInstructions = []
      const validSlots = new Set(['attacco_1', 'attacco_2', 'difesa_1', 'difesa_2'])

      for (const instr of countermeasures.countermeasures.individual_instructions) {
        const slot = typeof instr?.slot === 'string' ? instr.slot.trim() : ''
        const playerId = typeof instr?.player_id === 'string' ? instr.player_id.trim() : ''
        const instruction = typeof instr?.instruction === 'string' ? instr.instruction.trim().toLowerCase() : ''

        if (!validSlots.has(slot) || !playerId || !instruction) {
          invalidInstructions.push({ instr, reason: 'slot/player_id/instruction mancanti o invalidi' })
          continue
        }

        const check = validateIndividualInstruction(slot, playerId, instruction, titolari, clientFormation || null)
        if (check.valid) {
          const rosterPlayer = titolari.find((p) => p.id === playerId)
          const nameFromRoster = rosterPlayer?.player_name ? String(rosterPlayer.player_name).trim() : ''
          const posFromRoster = rosterPlayer?.position ? String(rosterPlayer.position).trim() : ''
          const nameFromModel = typeof instr.player_name === 'string' ? instr.player_name.trim() : ''
          const posFromModel = typeof instr.position === 'string' ? instr.position.trim() : ''
          validInstructions.push({
            ...instr,
            player_name: nameFromModel || nameFromRoster || null,
            position: posFromModel || posFromRoster || null
          })
        } else invalidInstructions.push({ instr, reason: check.error || 'istruzione non valida' })
      }

      countermeasures.countermeasures.individual_instructions = validInstructions

      if (invalidInstructions.length > 0) {
        if (!countermeasures.warnings) countermeasures.warnings = []
        countermeasures.warnings.push(
          `${invalidInstructions.length} istruzione/i individuale/i filtrata/e perché non applicabili alle regole tattiche`
        )
      }
    }

    // 13. Normalizza output in formato bilingue (it/en) per coerenza con analyze-match e UI
    const toBilingual = (s) => {
      if (typeof s === 'string') return { it: s, en: s }
      if (s && typeof s === 'object' && ('it' in s || 'en' in s)) return s
      return s
    }
    if (countermeasures.analysis) {
      if (typeof countermeasures.analysis.opponent_formation_analysis === 'string') {
        countermeasures.analysis.opponent_formation_analysis = toBilingual(countermeasures.analysis.opponent_formation_analysis)
      }
      if (Array.isArray(countermeasures.analysis.strengths)) {
        countermeasures.analysis.strengths = countermeasures.analysis.strengths.map(toBilingual)
      }
      if (Array.isArray(countermeasures.analysis.weaknesses)) {
        countermeasures.analysis.weaknesses = countermeasures.analysis.weaknesses.map(toBilingual)
      }
      if (typeof countermeasures.analysis.why_weaknesses === 'string') {
        countermeasures.analysis.why_weaknesses = toBilingual(countermeasures.analysis.why_weaknesses)
      }
    }
    ;(countermeasures.countermeasures?.formation_adjustments || []).forEach((adj) => {
      if (typeof adj.suggestion === 'string') adj.suggestion = toBilingual(adj.suggestion)
      if (typeof adj.reason === 'string') adj.reason = toBilingual(adj.reason)
    })
    ;(countermeasures.countermeasures?.tactical_adjustments || []).forEach((adj) => {
      if (typeof adj.suggestion === 'string') adj.suggestion = toBilingual(adj.suggestion)
      if (typeof adj.reason === 'string') adj.reason = toBilingual(adj.reason)
    })
    ;(countermeasures.countermeasures?.player_suggestions || []).forEach((p) => {
      if (typeof p.reason === 'string') p.reason = toBilingual(p.reason)
    })
    ;(countermeasures.countermeasures?.individual_instructions || []).forEach((i) => {
      if (typeof i.instruction === 'string') i.instruction = toBilingual(i.instruction)
      if (typeof i.reason === 'string') i.reason = toBilingual(i.reason)
    })
    if (Array.isArray(countermeasures.warnings)) {
      countermeasures.warnings = countermeasures.warnings.map(toBilingual)
    }

    // 14. Restituisci contromisure (formato bilingue)
    return NextResponse.json({
      success: true,
      countermeasures,
      model_used: data.model || 'unknown'
    })
  } catch (err) {
    console.error('[generate-countermeasures] Error:', err)
    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error: err,
        errorType: err?.type || null,
        metadata: { endpoint: '/api/generate-countermeasures', stage: 'outer_catch' }
      })
    }
    
    let errorMessage = 'Error generating countermeasures'
    let statusCode = 500
    
    if (err.type === 'rate_limit') {
      errorMessage = 'Rate limit exceeded. Please try again later.'
      statusCode = 429
    } else if (err.type === 'timeout') {
      errorMessage = 'Request timeout. Please try again.'
      statusCode = 408
    } else if (err.message) {
      errorMessage = err.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
