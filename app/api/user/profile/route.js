import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

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

    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      console.error('Token validation failed:', authError)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    let userId = userData.user.id
    console.log('Profile API: Authenticated user:', userId, 'Is Metalgate:', userData.user.user_metadata?.is_metalgate_user)

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { 'Cache-Control': 'no-store' },
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: 'no-store' })
        }
      }
    })

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile, error: lookupError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (lookupError) {
        console.error('Profile API: Metalgate lookup error:', lookupError)
      }

      if (existingProfile?.user_id) {
        console.log('Profile API: Mapped Metalgate ID', userId, 'to UUID', existingProfile.user_id)
        userId = existingProfile.user_id
      } else {
        console.warn('Profile API: Metalgate user profile not found for ID:', userId)
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        id, user_id, first_name, last_name, nickname,
        current_division, favorite_team, team_name, ai_name, how_to_remember,
        hours_per_week, common_problems, leaderboard_consent,
        profile_completion_score, profile_completion_level,
        platform, connection_quality, slow_opponent_connection_issues,
        input_delay, pass_level, smart_assist, ai_weak_point,
        ai_learn_goals, ai_notes, favourite_player_name,
        created_at, updated_at
      `)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
    
    console.log('Profile API: Returning profile for user:', userId, 'Division:', profile?.current_division)

    const response = NextResponse.json(profile || {})
    response.headers.set('X-User-Id', userId)
    if (profile?.id) response.headers.set('X-Profile-Id', profile.id)
    if (profile?.current_division) response.headers.set('X-Division', profile.current_division)
    
    return response

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
