import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Determina se un risultato è una vittoria
 */
function isWin(result) {
  if (!result || typeof result !== 'string') return false
  const upper = result.toUpperCase()
  return upper.includes('W') || upper.includes('VITTORIA') || upper.includes('WIN') || 
         /^\d+-\d+$/.test(result) && parseInt(result.split('-')[0]) > parseInt(result.split('-')[1])
}

/**
 * Determina se un risultato è una sconfitta
 */
function isLoss(result) {
  if (!result || typeof result !== 'string') return false
  const upper = result.toUpperCase()
  return upper.includes('L') || upper.includes('SCONFITTA') || upper.includes('LOSS') ||
         /^\d+-\d+$/.test(result) && parseInt(result.split('-')[0]) < parseInt(result.split('-')[1])
}

/**
 * Calcola pattern tattici dalle partite dell'utente (ultime 50)
 */
async function calculateTacticalPatterns(admin, userId) {
  try {
    // Recupera ultime 20 partite (per pattern formazione/stile)
    const { data: matches, error: matchesError } = await admin
      .from('matches')
      .select('formation_played, playing_style_played, result')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(20)

    if (matchesError) {
      console.error('[recalculate-patterns] Error loading matches:', matchesError)
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
      if (isWin(match.result)) {
        formationUsage[formation].wins++
      } else if (isLoss(match.result)) {
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
      if (isWin(match.result)) {
        playingStyleUsage[style].wins++
      } else if (isLoss(match.result)) {
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

    // recurring_issues: lasciato vuoto per ora
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
      console.error('[recalculate-patterns] Error upserting tactical patterns:', upsertError)
      return null
    }

    if (process.env.NODE_ENV !== 'production') console.log(`[recalculate-patterns] Tactical patterns calculated for user ${userId}`)
    return { formation_usage: formationUsage, playing_style_usage: playingStyleUsage, recurring_issues: recurringIssues }
  } catch (err) {
    console.error('[recalculate-patterns] Error calculating tactical patterns:', err)
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

    const userId = userData.user.id
    const { user_id: requestedUserId } = await req.json().catch(() => ({}))

    // Verifica che l'utente possa calcolare solo i propri pattern
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized: can only recalculate own patterns' }, { status: 403 })
    }

    // Calcola pattern per l'utente autenticato
    const patterns = await calculateTacticalPatterns(admin, userId)

    if (!patterns) {
      return NextResponse.json({ 
        success: false, 
        message: 'No matches found or error calculating patterns' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      patterns: patterns,
      message: 'Tactical patterns calculated successfully'
    })
  } catch (err) {
    console.error('[recalculate-patterns] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error recalculating patterns' },
      { status: 500 }
    )
  }
}
