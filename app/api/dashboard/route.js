import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { normalizeMatchSummary } from '@/lib/matchSummary.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 1. Auth check using standard helper
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    let userId = userData.user.id
    
    // Initialize Supabase admin client
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
    
    // Fetch dashboard data in parallel
    const [
      { data: layoutData },
      { data: players },
      { data: matches },
      { data: patterns },
      { data: activeCoach },
      { data: profile },
      { data: gameAnalysis }
    ] = await Promise.all([
      // 1. Formation layout (User specific)
      supabase.from('formation_layout').select('formation').eq('user_id', userId).maybeSingle(),
      
      // 2. Players
      supabase.from('players')
        .select('id, player_name, overall_rating, position, slot_index')
        .eq('user_id', userId)
        .order('overall_rating', { ascending: false, nullsLast: true }),
        
      // 3. Recent matches
      supabase.from('matches')
        .select(`
          id, match_date, opponent_name, result,
          photos_uploaded, missing_photos, data_completeness,
          player_ratings, team_stats, attack_areas, ball_recovery_zones,
          formation_played, playing_style_played, team_strength
        `)
        .eq('user_id', userId)
        .order('match_date', { ascending: false })
        .limit(10),
        
      // 4. Tactical patterns
      supabase.from('team_tactical_patterns')
        .select('formation_usage, playing_style_usage, recurring_issues')
        .eq('user_id', userId)
        .maybeSingle(),
        
      // 5. Active coach
      supabase.from('coaches')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle(),
        
      // 6. User profile
      supabase.from('user_profiles')
        .select(`
          id, user_id, metalgate_user_id, first_name, last_name,
          current_division, favorite_team, team_name, ai_name,
          how_to_remember, hours_per_week, common_problems,
          ai_knowledge_score,
          profile_completion_score, profile_completion_level,
          created_at, updated_at
        `)
        .eq('user_id', userId)
        .maybeSingle(),

      // 7. User game analysis (for roadmap)
      supabase.from('user_game_analysis')
        .select('stats, captured_at')
        .eq('user_id', userId)
        .maybeSingle()
    ])
    
    return NextResponse.json({
      layout: layoutData,
      players: players || [],
      matches: (matches || []).map(normalizeMatchSummary),
      patterns: patterns,
      hasActiveCoach: !!activeCoach,
      profile: profile,
      gameAnalysis: gameAnalysis
    })
    
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
