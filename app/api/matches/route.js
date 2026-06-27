import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { normalizeMatchSummary } from '@/lib/matchSummary.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0'
}

const DEFAULT_LIST_LIMIT = 10
const MAX_LIST_LIMIT = 50

function parseListLimit(value) {
  const parsed = parseInt(value || String(DEFAULT_LIST_LIMIT), 10)
  if (!Number.isFinite(parsed)) return DEFAULT_LIST_LIMIT
  return Math.min(Math.max(parsed, 1), MAX_LIST_LIMIT)
}

function parseListOffset(value) {
  const parsed = parseInt(value || '0', 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(parsed, 0)
}

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    let userId = userData.user.id

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await supabase
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const columns = `
      id, user_id, match_date, opponent_name, client_team_name, result, is_home,
      formation_played, playing_style_played, team_strength, opponent_formation_id,
      player_ratings, team_stats, attack_areas, ball_recovery_zones, goals_events,
      formation_discrepancies, extracted_data, ai_summary, photos_uploaded,
      missing_photos, data_completeness, credits_used, recommended_formation_used,
      created_at, updated_at
    `

    if (id) {
      // Fetch single match
      const { data, error } = await supabase
        .from('matches')
        .select(columns)
        .eq('id', id)
        .eq('user_id', userId) // Ensure user owns the match
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Match not found' }, { status: 404 })
        }
        console.error('Error fetching match:', error)
        return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 })
      }

      return NextResponse.json(data, { headers: NO_STORE_HEADERS })
    } else {
      const summaryColumns = `
        id, match_date, opponent_name, result,
        photos_uploaded, missing_photos, data_completeness,
        player_ratings, team_stats, attack_areas, ball_recovery_zones,
        formation_played, playing_style_played, team_strength
      `

      const limit = parseListLimit(searchParams.get('limit'))
      const offset = parseListOffset(searchParams.get('offset'))

      const [
        { data, error },
        { count: totalCount, error: totalCountError },
        { count: completeCount, error: completeCountError }
      ] = await Promise.all([
        supabase
          .from('matches')
          .select(summaryColumns)
          .eq('user_id', userId)
          .order('match_date', { ascending: false })
          .range(offset, offset + limit - 1),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('data_completeness', 'complete')
      ])

      if (error || totalCountError || completeCountError) {
        console.error('Error fetching matches:', error || totalCountError || completeCountError)
        return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
      }

      const total = totalCount ?? 0
      const complete = completeCount ?? 0
      const matches = (data || []).map(normalizeMatchSummary)
      const loadedCount = offset + matches.length

      return NextResponse.json({
        matches,
        summary: {
          total,
          complete,
          partial: Math.max(total - complete, 0)
        },
        pagination: {
          limit,
          offset,
          total,
          loadedCount,
          hasMore: loadedCount < total
        }
      }, { headers: NO_STORE_HEADERS })
    }

  } catch (error) {
    console.error('Matches API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
