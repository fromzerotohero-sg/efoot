import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { buildPatternZonePayload } from '@/lib/matchAttackZones'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}

/**
 * Calcola quali sezioni sono mancanti
 */
function calculateMissingPhotos(matchData) {
  const missing = []
  
  // Gestisce sia struttura nuova (cliente/avversario) che vecchia (flat)
  const hasPlayerRatings = matchData.player_ratings && (
    (matchData.player_ratings.cliente && Object.keys(matchData.player_ratings.cliente).length > 0) ||
    (matchData.player_ratings.avversario && Object.keys(matchData.player_ratings.avversario).length > 0) ||
    (typeof matchData.player_ratings === 'object' && !matchData.player_ratings.cliente && !matchData.player_ratings.avversario && Object.keys(matchData.player_ratings).length > 0)
  )
  
  if (!hasPlayerRatings) {
    missing.push('player_ratings')
  }
  if (!matchData.team_stats || Object.keys(matchData.team_stats).length === 0) {
    missing.push('team_stats')
  }
  if (!matchData.attack_areas || Object.keys(matchData.attack_areas).length === 0) {
    missing.push('attack_areas')
  }
  if (!matchData.ball_recovery_zones || !Array.isArray(matchData.ball_recovery_zones) || matchData.ball_recovery_zones.length === 0) {
    missing.push('ball_recovery_zones')
  }
  if (!matchData.formation_played && !matchData.playing_style_played && !matchData.team_strength) {
    missing.push('formation_style')
  }
  
  return missing
}

/**
 * Calcola data_completeness
 */
function calculateDataCompleteness(matchData) {
  const missing = calculateMissingPhotos(matchData)
  // Considera "complete" solo se tutte le 5 sezioni hanno dati (0 mancanti)
  return missing.length === 0 ? 'complete' : 'partial'
}

/**
 * Calcola photos_uploaded (numero di sezioni con dati)
 */
function calculatePhotosUploaded(matchData) {
  let count = 0
  
  // Gestisce sia struttura nuova (cliente/avversario) che vecchia (flat)
  const hasPlayerRatings = matchData.player_ratings && (
    (matchData.player_ratings.cliente && Object.keys(matchData.player_ratings.cliente).length > 0) ||
    (matchData.player_ratings.avversario && Object.keys(matchData.player_ratings.avversario).length > 0) ||
    (typeof matchData.player_ratings === 'object' && !matchData.player_ratings.cliente && !matchData.player_ratings.avversario && Object.keys(matchData.player_ratings).length > 0)
  )
  
  if (hasPlayerRatings) count++
  if (matchData.team_stats && Object.keys(matchData.team_stats).length > 0) count++
  if (matchData.attack_areas && Object.keys(matchData.attack_areas).length > 0) count++
  if (matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0) count++
  if (matchData.formation_played || matchData.playing_style_played || matchData.team_strength) count++
  
  return count
}

/**
 * Determina se un risultato è una vittoria per l'utente.
 * result: "gol_utente-gol_avversario".
 */
function isWin(result, _is_home = true) {
  if (!result || typeof result !== 'string') return false
  const upper = result.toUpperCase()
  if (upper.includes('W') || upper.includes('VITTORIA') || upper.includes('WIN')) return true
  if (upper.includes('L') || upper.includes('SCONFITTA') || upper.includes('LOSS')) return false
  const m = result.trim().match(/^(\d+)-(\d+)$/)
  if (!m) return false
  const userGoals = parseInt(m[1], 10)
  const opponentGoals = parseInt(m[2], 10)
  return userGoals > opponentGoals
}

/**
 * Determina se un risultato è una sconfitta per l'utente (stessa convenzione di isWin).
 */
function isLoss(result, _is_home = true) {
  if (!result || typeof result !== 'string') return false
  const upper = result.toUpperCase()
  if (upper.includes('L') || upper.includes('SCONFITTA') || upper.includes('LOSS')) return true
  if (upper.includes('W') || upper.includes('VITTORIA') || upper.includes('WIN')) return false
  const m = result.trim().match(/^(\d+)-(\d+)$/)
  if (!m) return false
  const userGoals = parseInt(m[1], 10)
  const opponentGoals = parseInt(m[2], 10)
  return userGoals < opponentGoals
}

/**
 * Calcola pattern tattici dalle partite dell'utente (ultime 50)
 */
async function calculateTacticalPatterns(admin, userId) {
  try {
    // Recupera ultime 20 partite (per pattern formazione/stile)
    const { data: matches, error: matchesError } = await admin
      .from('matches')
      .select('formation_played, playing_style_played, result, is_home, attack_areas, team_stats')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(20)

    if (matchesError) {
      console.error('[save-match] Error loading matches for pattern calculation:', matchesError)
      return null
    }

    if (!matches || matches.length === 0) {
      return null
    }

    // Calcola formation_usage
    const formationUsage = {}
    matches.forEach(match => {
      const formation = match.formation_played
      if (!formation) return

      if (!formationUsage[formation]) {
        formationUsage[formation] = { matches: 0, wins: 0, losses: 0, draws: 0 }
      }

      formationUsage[formation].matches++
      const isHome = match.is_home !== false
      if (isWin(match.result, isHome)) {
        formationUsage[formation].wins++
      } else if (isLoss(match.result, isHome)) {
        formationUsage[formation].losses++
      } else {
        formationUsage[formation].draws++
      }
    })

    // Calcola win_rate per ogni formazione
    Object.keys(formationUsage).forEach(formation => {
      const stats = formationUsage[formation]
      stats.win_rate = stats.matches > 0 ? stats.wins / stats.matches : 0
    })

    // Calcola playing_style_usage
    const playingStyleUsage = {}
    matches.forEach(match => {
      const style = match.playing_style_played
      if (!style) return

      if (!playingStyleUsage[style]) {
        playingStyleUsage[style] = { matches: 0, wins: 0, losses: 0, draws: 0 }
      }

      playingStyleUsage[style].matches++
      const isHome = match.is_home !== false
      if (isWin(match.result, isHome)) {
        playingStyleUsage[style].wins++
      } else if (isLoss(match.result, isHome)) {
        playingStyleUsage[style].losses++
      } else {
        playingStyleUsage[style].draws++
      }
    })

    // Calcola win_rate per ogni stile
    Object.keys(playingStyleUsage).forEach(style => {
      const stats = playingStyleUsage[style]
      stats.win_rate = stats.matches > 0 ? stats.wins / stats.matches : 0
    })

    // recurring_issues: lasciato vuoto per ora (può essere implementato in futuro con analisi AI)
    const recurringIssues = []

    const zonePayload = buildPatternZonePayload(matches)

    // UPSERT su team_tactical_patterns
    const { error: upsertError } = await admin
      .from('team_tactical_patterns')
      .upsert({
        user_id: userId,
        formation_usage: formationUsage,
        playing_style_usage: playingStyleUsage,
        recurring_issues: recurringIssues,
        last_50_matches_count: matches.length,
        last_updated: new Date().toISOString(),
        our_attack_areas_avg: zonePayload.our_attack_areas_avg,
        opponent_attack_areas_avg: zonePayload.opponent_attack_areas_avg,
        conceded_goal_zones_avg: zonePayload.conceded_goal_zones_avg,
        ...(zonePayload.total_goals_scored != null ? { total_goals_scored: zonePayload.total_goals_scored } : {}),
        ...(zonePayload.total_goals_conceded != null ? { total_goals_conceded: zonePayload.total_goals_conceded } : {})
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('[save-match] Error upserting tactical patterns:', upsertError)
      return null
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-match] Tactical patterns calculated and saved`)
    }
    return { formation_usage: formationUsage, playing_style_usage: playingStyleUsage, recurring_issues: recurringIssues }
  } catch (err) {
    console.error('[save-match] Error calculating tactical patterns:', err)
    return null
  }
}

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
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
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Se è un utente Metalgate, dobbiamo recuperare il vero user_id (Supabase UUID)
    // perché validateToken restituisce l'ID di Metalgate che non esiste in auth.users
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        console.error('[save-match] Metalgate user profile not found for ID:', userId)
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/supabase/save-match']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/supabase/save-match',
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
    
    // Recupera team_name da user_profiles (per tracciabilità squadra cliente)
    let clientTeamName = null
    try {
      const { data: userProfile } = await admin
        .from('user_profiles')
        .select('team_name')
        .eq('user_id', userId)
        .maybeSingle()
      
      clientTeamName = userProfile?.team_name
      
      // Fallback: prova a recuperare da coaches.team se non presente
      if (!clientTeamName) {
        const { data: activeCoach } = await admin
          .from('coaches')
          .select('team')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle()
        clientTeamName = activeCoach?.team
      }
    } catch (err) {
      console.warn('[save-match] Error retrieving team_name:', err)
      // Non bloccare salvataggio se errore recupero team_name
    }

    const { matchData } = await req.json()

    if (!matchData || typeof matchData !== 'object') {
      return NextResponse.json({ error: 'matchData is required' }, { status: 400 })
    }

    // Validazione dimensione dati (prevenire payload troppo grandi)
    const matchDataString = JSON.stringify(matchData)
    const maxSizeBytes = 5 * 1024 * 1024 // 5MB max
    if (matchDataString.length > maxSizeBytes) {
      return NextResponse.json({ error: 'Match data too large (max 5MB)' }, { status: 400 })
    }

    // Validazione is_home se presente
    if (matchData.is_home !== undefined && typeof matchData.is_home !== 'boolean') {
      return NextResponse.json({ error: 'is_home must be a boolean' }, { status: 400 })
    }
    // Sicurezza: recommended_formation_used solo boolean stretto (honor system obiettivo settimanale)
    const recommendedFormationUsed = matchData.recommended_formation_used === true

    // Validazione: almeno una sezione deve avere dati
    const photosUploaded = calculatePhotosUploaded(matchData)
    if (photosUploaded === 0) {
      return NextResponse.json(
        { error: 'At least one section must have data' },
        { status: 400 }
      )
    }

    // Validazione lunghezza campi testo (max 255 caratteri)
    const MAX_TEXT_LENGTH = 255
    if (matchData.opponent_name && toText(matchData.opponent_name) && toText(matchData.opponent_name).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `opponent_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (matchData.result && toText(matchData.result) && toText(matchData.result).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `result exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (matchData.formation_played && toText(matchData.formation_played) && toText(matchData.formation_played).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `formation_played exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (matchData.playing_style_played && toText(matchData.playing_style_played) && toText(matchData.playing_style_played).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `playing_style_played exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // Estrai risultato se presente (può essere in matchData.result o in team_stats)
    let finalResult = toText(matchData.result)
    if (!finalResult && matchData.team_stats && matchData.team_stats.result) {
      finalResult = toText(matchData.team_stats.result)
      // Rimuovi result da team_stats (non fa parte delle statistiche)
      if (matchData.team_stats.result) {
        const { result, ...statsWithoutResult } = matchData.team_stats
        matchData.team_stats = statsWithoutResult
      }
    }

    // Calcola metadata
    const missingPhotos = calculateMissingPhotos(matchData)
    const dataCompleteness = calculateDataCompleteness(matchData)
    const creditsUsed = photosUploaded // 1 credito per foto

    // Prepara dati per inserimento
    const insertData = {
      user_id: userId,
      match_date: matchData.match_date ? new Date(matchData.match_date).toISOString() : new Date().toISOString(),
      opponent_name: toText(matchData.opponent_name),
      client_team_name: toText(clientTeamName) || toText(matchData.client_team_name) || null, // Nome squadra del cliente (per tracciabilità)
      result: finalResult,
      is_home: typeof matchData.is_home === 'boolean' ? matchData.is_home : true,
      formation_played: toText(matchData.formation_played),
      playing_style_played: toText(matchData.playing_style_played),
      team_strength: toInt(matchData.team_strength),
      opponent_formation_id: matchData.opponent_formation_id || null,
      player_ratings: (() => {
        // Gestisce struttura nuova (cliente/avversario) e vecchia (flat)
        if (!matchData.player_ratings) return null
        
        // Se ha struttura cliente/avversario, salva così
        if (matchData.player_ratings.cliente || matchData.player_ratings.avversario) {
          return matchData.player_ratings
        }
        
        // Altrimenti struttura flat (compatibilità retroattiva)
        if (Object.keys(matchData.player_ratings).length > 0) {
          return matchData.player_ratings
        }
        
        return null
      })(),
      team_stats: (matchData.team_stats && Object.keys(matchData.team_stats).length > 0) 
        ? matchData.team_stats 
        : null,
      attack_areas: (matchData.attack_areas && Object.keys(matchData.attack_areas).length > 0) 
        ? matchData.attack_areas 
        : null,
      ball_recovery_zones: (matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0) 
        ? matchData.ball_recovery_zones 
        : null,
      goals_events: (matchData.goals_events && Array.isArray(matchData.goals_events) && matchData.goals_events.length > 0) 
        ? matchData.goals_events 
        : null,
      formation_discrepancies: (matchData.formation_discrepancies && Array.isArray(matchData.formation_discrepancies) && matchData.formation_discrepancies.length > 0) 
        ? matchData.formation_discrepancies 
        : null,
      extracted_data: matchData.extracted_data || {},
      ai_summary: null, // Riassunto AI generato solo dalla pagina dettaglio match
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos.length > 0 ? missingPhotos : null,
      data_completeness: dataCompleteness,
      credits_used: creditsUsed,
      recommended_formation_used: recommendedFormationUsed
    }

    // Inserisci in Supabase
    const { data: savedMatch, error: insertError } = await admin
      .from('matches')
      .insert(insertData)
      .select(`
        id, user_id, match_date, opponent_name, client_team_name, result, is_home,
        formation_played, playing_style_played, team_strength, opponent_formation_id,
        player_ratings, team_stats, attack_areas, ball_recovery_zones, goals_events,
        formation_discrepancies, extracted_data, ai_summary, photos_uploaded,
        missing_photos, data_completeness, credits_used, recommended_formation_used,
        created_at, updated_at
      `)
      .single()

    if (insertError) {
      console.error('[save-match] Supabase insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Error saving match data' },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') console.log(`[save-match] Match saved successfully: ${savedMatch.id}`)

    // FIX: Sequenziale per evitare race condition
    // Ordine: Pattern → AI Knowledge → Task (ognuno aspetta il precedente)
    // Non blocchiamo la risposta se fallisce (non critico)
    calculateTacticalPatterns(admin, userId)
      .then(async () => {
        // Pattern salvati, ora aggiorna AI Knowledge Score (sequenziale)
        if (supabaseUrl && serviceKey) {
          try {
            const { updateAIKnowledgeScore } = await import('../../../../lib/aiKnowledgeHelper')
            await updateAIKnowledgeScore(userId, supabaseUrl, serviceKey)
            if (process.env.NODE_ENV !== 'production') console.log('[save-match] AI Knowledge Score updated successfully')
            
            // AI Knowledge aggiornato, ora aggiorna Task (sequenziale)
            const { updateTasksProgressAfterMatch } = await import('../../../../lib/taskHelper')
            await updateTasksProgressAfterMatch(userId, supabaseUrl, serviceKey, savedMatch)
            if (process.env.NODE_ENV !== 'production') console.log('[save-match] Tasks progress updated successfully')

          } catch (err) {
            console.error('[save-match] Error in sequential updates:', err)
          }
        }
      })
      .catch(err => {
        console.error('[save-match] Failed to calculate tactical patterns (non-blocking):', err)
      })

    // FIX: Rimuovi chiamata a playerPerformanceHelper che non esiste
    // TODO: Implementare playerPerformanceHelper.js quando necessario
    // Helper non esiste ancora, rimuovi chiamata per evitare errori silenziosi

    return NextResponse.json({
      success: true,
      match: savedMatch,
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos,
      data_completeness: dataCompleteness,
      credits_used: creditsUsed
    })
  } catch (err) {
    console.error('[save-match] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error saving match' },
      { status: 500 }
    )
  }
}
