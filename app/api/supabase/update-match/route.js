import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

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
      .select('formation_played, playing_style_played, result, is_home')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(20)

    if (matchesError) {
      console.error('[update-match] Error loading matches for pattern calculation:', matchesError)
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

    // UPSERT su team_tactical_patterns
    const { error: upsertError } = await admin
      .from('team_tactical_patterns')
      .upsert({
        user_id: userId,
        formation_usage: formationUsage,
        playing_style_usage: playingStyleUsage,
        recurring_issues: recurringIssues,
        last_50_matches_count: matches.length,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('[update-match] Error upserting tactical patterns:', upsertError)
      return null
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[update-match] Tactical patterns calculated and saved`)
    }
    return { formation_usage: formationUsage, playing_style_usage: playingStyleUsage, recurring_issues: recurringIssues }
  } catch (err) {
    console.error('[update-match] Error calculating tactical patterns:', err)
    return null
  }
}

/**
 * Calcola photos_uploaded
 */
function calculatePhotosUploaded(matchData) {
  let count = 0
  
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
 * Merge dati esistenti con nuovi dati
 */
function mergeMatchData(existing, newData, section) {
  const merged = { ...existing }

  if (section === 'player_ratings') {
    // newData è già normalizzato: { cliente: {...}, avversario: {...} } o { ...ratings... }
    // NON è wrappato in player_ratings
    if (newData && typeof newData === 'object') {
      if (newData.cliente || newData.avversario) {
        // Struttura nuova con cliente/avversario
        merged.player_ratings = {
          cliente: { ...(merged.player_ratings?.cliente || {}), ...(newData.cliente || {}) },
          avversario: { ...(merged.player_ratings?.avversario || {}), ...(newData.avversario || {}) }
        }
      } else {
        // Struttura vecchia (compatibilità retroattiva)
        merged.player_ratings = { ...(merged.player_ratings || {}), ...newData }
      }
    }
  } else if (section === 'team_stats') {
    // newData contiene direttamente le statistiche (non wrappate in team_stats)
    // Rimuovi result se presente (viene gestito separatamente)
    const statsWithoutResult = { ...newData }
    delete statsWithoutResult.result
    merged.team_stats = { ...(merged.team_stats || {}), ...statsWithoutResult }
  } else if (section === 'attack_areas') {
    // newData contiene direttamente le aree (non wrappate in attack_areas)
    merged.attack_areas = { ...(merged.attack_areas || {}), ...newData }
  } else if (section === 'ball_recovery_zones') {
    // newData è già normalizzato: array diretto [...zones...]
    // NON è wrappato in ball_recovery_zones
    const existingZones = Array.isArray(merged.ball_recovery_zones) ? merged.ball_recovery_zones : []
    const newZones = Array.isArray(newData) ? newData : (Array.isArray(newData.ball_recovery_zones) ? newData.ball_recovery_zones : [])
    merged.ball_recovery_zones = [...existingZones, ...newZones]
  } else if (section === 'formation_style') {
    if (newData.formation_played) merged.formation_played = toText(newData.formation_played)
    if (newData.playing_style_played) merged.playing_style_played = toText(newData.playing_style_played)
    if (newData.team_strength !== undefined) merged.team_strength = toInt(newData.team_strength)
  }

  // Merge extracted_data
  merged.extracted_data = {
    ...(merged.extracted_data || {}),
    ...(newData.extracted_data || {}),
    [section]: newData.extracted_data?.[section] || newData
  }

  return merged
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

    const body = await req.json()
    const { match_id, section, data, result, opponent_name } = body

    // Rate limiting (tutti i POST a update-match, inclusi opponent_name)
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/supabase/update-match']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/supabase/update-match',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', resetAt: rateLimit.resetAt },
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

    const MAX_TEXT_LENGTH = 255
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    // Gestione speciale per opponent_name diretto (update senza sezione)
    if (opponent_name !== undefined) {
      if (!match_id) {
        return NextResponse.json({ error: 'match_id is required for opponent_name update' }, { status: 400 })
      }
      if (!UUID_REGEX.test(match_id)) {
        return NextResponse.json({ error: 'Invalid match_id format' }, { status: 400 })
      }
      const opponentName = toText(opponent_name)
      if (opponentName && opponentName.length > MAX_TEXT_LENGTH) {
        return NextResponse.json(
          { error: `opponent_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
          { status: 400 }
        )
      }
      const { data: updatedMatch, error: updateError } = await admin
        .from('matches')
        .update({
          opponent_name: opponentName || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', match_id)
        .eq('user_id', userId)
        .select(`
          id, user_id, match_date, opponent_name, client_team_name, result, is_home,
          formation_played, playing_style_played, team_strength, opponent_formation_id,
          player_ratings, team_stats, attack_areas, ball_recovery_zones, goals_events,
          formation_discrepancies, extracted_data, ai_summary, photos_uploaded,
          missing_photos, data_completeness, credits_used, recommended_formation_used,
          created_at, updated_at
        `)
        .single()
      if (updateError) {
        console.error('[update-match] Supabase update error for opponent_name:', updateError)
        return NextResponse.json(
          { error: updateError.message || 'Error updating opponent name' },
          { status: 500 }
        )
      }
      return NextResponse.json({ success: true, match: updatedMatch })
    }

    // Validazione per update normale (con section)
    if (!match_id || !section || !data) {
      return NextResponse.json({ error: 'match_id, section, and data are required' }, { status: 400 })
    }
    if (!UUID_REGEX.test(match_id)) {
      return NextResponse.json({ error: 'Invalid match_id format' }, { status: 400 })
    }

    // 1. Recupera match esistente
    const { data: existingMatch, error: fetchError } = await admin
      .from('matches')
      .select(`
        id, user_id, match_date, opponent_name, client_team_name, result, is_home,
        formation_played, playing_style_played, team_strength, opponent_formation_id,
        player_ratings, team_stats, attack_areas, ball_recovery_zones, goals_events,
        formation_discrepancies, extracted_data, ai_summary, photos_uploaded,
        missing_photos, data_completeness, credits_used, recommended_formation_used,
        created_at, updated_at
      `)
      .eq('id', match_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingMatch) {
      return NextResponse.json({ error: 'Match not found or access denied' }, { status: 404 })
    }

    // Se client_team_name non è presente, recuperalo da user_profiles
    let clientTeamName = existingMatch.client_team_name
    if (!clientTeamName) {
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
        console.warn('[update-match] Error retrieving team_name:', err)
        // Non bloccare update se errore recupero team_name
      }
    }

    // 2. Gestione speciale per ai_summary (solo salvataggio, no merge)
    // NOTA: ai_summary è bilingue (IT/EN) - struttura { it: "...", en: "..." }
    // Generato da /api/analyze-match con normalizeBilingualStructure()
    if (section === 'ai_summary') {
      // Salva solo il riassunto senza fare merge
      // data.ai_summary può essere già una stringa JSON o un oggetto
      // Struttura attesa: { analysis: { match_overview: { it: "...", en: "..." }, ... }, ... }
      let aiSummaryValue = null
      
      if (data.ai_summary) {
        if (typeof data.ai_summary === 'string') {
          // Se è già una stringa, verifica se è JSON valido
          try {
            // Prova a parsare per verificare che sia JSON valido
            const parsed = JSON.parse(data.ai_summary)
            // Se è JSON valido, usa direttamente (già stringificato)
            aiSummaryValue = data.ai_summary
            if (process.env.NODE_ENV !== 'production') console.log('[update-match] ai_summary è già JSON string valido')
          } catch (e) {
            // Se non è JSON valido, è testo semplice - convertilo in struttura JSON
            if (process.env.NODE_ENV !== 'production') console.log('[update-match] ai_summary è testo semplice, convertendo in JSON')
            aiSummaryValue = JSON.stringify({
              analysis: {
                match_overview: data.ai_summary
              },
              confidence: 0,
              data_quality: 'low',
              warnings: ['Riassunto convertito da formato testo semplice']
            })
          }
        } else {
          // Se è un oggetto, convertilo in JSON string
          if (process.env.NODE_ENV !== 'production') console.log('[update-match] ai_summary è oggetto, stringificando')
          aiSummaryValue = JSON.stringify(data.ai_summary)
        }
      }
      
      if (process.env.NODE_ENV !== 'production') console.log('[update-match] ai_summary value type:', typeof aiSummaryValue, 'length:', aiSummaryValue?.length)
      
      const { data: updatedMatch, error: updateError } = await admin
        .from('matches')
        .update({
          ai_summary: aiSummaryValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', match_id)
        .eq('user_id', userId)
        .select(`
          id, user_id, match_date, opponent_name, client_team_name, result, is_home,
          formation_played, playing_style_played, team_strength, opponent_formation_id,
          player_ratings, team_stats, attack_areas, ball_recovery_zones, goals_events,
          formation_discrepancies, extracted_data, ai_summary, photos_uploaded,
          missing_photos, data_completeness, credits_used, recommended_formation_used,
          created_at, updated_at
        `)
        .single()

      if (updateError) {
        console.error('[update-match] Supabase update error:', updateError)
        return NextResponse.json(
          { error: updateError.message || 'Error updating match' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        match: updatedMatch
      })
    }

    // 2. Merge dati (per sezioni normali)
    const mergedData = mergeMatchData(existingMatch, data, section)

    // 3. Estrai risultato se presente (può essere nel data o come parametro separato, da qualsiasi sezione)
    let finalResult = existingMatch.result
    if (result && typeof result === 'string' && result.trim()) {
      // Priorità 1: parametro result separato (viene passato dal frontend quando estratto da qualsiasi sezione)
      finalResult = result.trim()
    } else if (data && data.result && typeof data.result === 'string' && data.result.trim()) {
      // Priorità 2: result nei dati normalizzati (per compatibilità)
      finalResult = data.result.trim()
    } else if (mergedData.team_stats && mergedData.team_stats.result) {
      // Priorità 3: result in team_stats merged (per compatibilità retroattiva)
      finalResult = mergedData.team_stats.result
      // Rimuovi result da team_stats (non fa parte delle statistiche)
      delete mergedData.team_stats.result
    }
    // Nota: il risultato viene estratto da TUTTE le sezioni (player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_style)
    // e viene passato come parametro separato 'result' dal frontend, quindi la priorità 1 dovrebbe sempre catturarlo

    // 4. Calcola metadata aggiornati
    const missingPhotos = calculateMissingPhotos(mergedData)
    const dataCompleteness = calculateDataCompleteness(mergedData)
    const photosUploaded = calculatePhotosUploaded(mergedData)
    
    // Log per debug
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[update-match] Section: ${section}`)
      console.log(`[update-match] Missing photos before: ${existingMatch.missing_photos?.length || 0}`)
      console.log(`[update-match] Missing photos after: ${missingPhotos.length}`)
      console.log(`[update-match] Photos uploaded: ${photosUploaded}`)
      console.log(`[update-match] Data completeness: ${dataCompleteness}`)
    }

    // 5. Prepara update (usa mergedData, che contiene già i dati esistenti mergiati con i nuovi)
    const updateData = {
      result: finalResult || existingMatch.result,
      client_team_name: toText(clientTeamName) || existingMatch.client_team_name || null, // Aggiorna solo se recuperato
      player_ratings: mergedData.player_ratings,
      team_stats: (mergedData.team_stats && Object.keys(mergedData.team_stats).length > 0) ? mergedData.team_stats : null,
      attack_areas: (mergedData.attack_areas && Object.keys(mergedData.attack_areas).length > 0) ? mergedData.attack_areas : null,
      ball_recovery_zones: (mergedData.ball_recovery_zones && Array.isArray(mergedData.ball_recovery_zones) && mergedData.ball_recovery_zones.length > 0) ? mergedData.ball_recovery_zones : null,
      formation_played: toText(mergedData.formation_played) || existingMatch.formation_played,
      playing_style_played: toText(mergedData.playing_style_played) || existingMatch.playing_style_played,
      team_strength: toInt(mergedData.team_strength) ?? existingMatch.team_strength,
      extracted_data: mergedData.extracted_data || existingMatch.extracted_data || {},
      ai_summary: existingMatch.ai_summary || null, // ai_summary gestito solo dalla sezione speciale (pagina dettaglio)
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos.length > 0 ? missingPhotos : null,
      data_completeness: dataCompleteness,
      updated_at: new Date().toISOString(),
      recommended_formation_used: data?.recommended_formation_used === true ? true : (existingMatch.recommended_formation_used === true)
    }

    // 5. Aggiorna match
    const { data: updatedMatch, error: updateError } = await admin
      .from('matches')
      .update(updateData)
      .eq('id', match_id)
      .eq('user_id', userId)
      .select(`
        id, user_id, match_date, opponent_name, client_team_name, result, is_home,
        formation_played, playing_style_played, team_strength, opponent_formation_id,
        player_ratings, team_stats, attack_areas, ball_recovery_zones, goals_events,
        formation_discrepancies, extracted_data, ai_summary, photos_uploaded,
        missing_photos, data_completeness, credits_used, recommended_formation_used,
        created_at, updated_at
      `)
      .single()

    if (updateError) {
      console.error('[update-match] Supabase update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Error updating match' },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[update-match] Match updated successfully: ${updatedMatch.id}`)
      console.log(`[update-match] Final missing_photos: ${updatedMatch.missing_photos?.length || 0}`)
      console.log(`[update-match] Final data_completeness: ${updatedMatch.data_completeness}`)
      console.log(`[update-match] Final photos_uploaded: ${updatedMatch.photos_uploaded}`)
    }

    // FIX: Sequenziale per evitare race condition (stesso pattern di save-match)
    // Ordine: Pattern → AI Knowledge (ognuno aspetta il precedente)
    // Non blocchiamo la risposta se fallisce (non critico)
    calculateTacticalPatterns(admin, userId)
      .then(async () => {
        // Pattern salvati, ora aggiorna AI Knowledge Score e Task (stesso ordine di save-match)
        if (supabaseUrl && serviceKey) {
          try {
            const { updateAIKnowledgeScore } = await import('../../../../lib/aiKnowledgeHelper')
            await updateAIKnowledgeScore(userId, supabaseUrl, serviceKey)
            if (process.env.NODE_ENV !== 'production') console.log('[update-match] AI Knowledge Score updated successfully')
            const { updateTasksProgressAfterMatch } = await import('../../../../lib/taskHelper')
            await updateTasksProgressAfterMatch(userId, supabaseUrl, serviceKey, updatedMatch)
            if (process.env.NODE_ENV !== 'production') console.log('[update-match] Tasks progress updated successfully')

          } catch (err) {
            console.error('[update-match] Error in sequential updates:', err)
          }
        }
      })
      .catch(err => {
        console.error('[update-match] Failed to calculate tactical patterns (non-blocking):', err)
      })

    // FIX: Rimuovi chiamata a playerPerformanceHelper che non esiste
    // TODO: Implementare playerPerformanceHelper.js quando necessario
    // Helper non esiste ancora, rimuovi chiamata per evitare errori silenziosi
    return NextResponse.json({
      success: true,
      match: updatedMatch,
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos,
      data_completeness: dataCompleteness
    })
  } catch (err) {
    console.error('[update-match] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error updating match' },
      { status: 500 }
    )
  }
}
