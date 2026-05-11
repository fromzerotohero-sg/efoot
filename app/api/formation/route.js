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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key to bypass RLS since we validate token manually

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 1. Auth check
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    let userId = userData.user.id

    // 2. Initialize admin client
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

    // 3. Fetch data in parallel
    const [
      { data: layoutData, error: layoutError },
      { data: playingStyles, error: stylesError },
      { data: players, error: playersError },
      { data: coachData, error: coachError },
      { data: tacticalSettings, error: tacticalError }
    ] = await Promise.all([
      // Layout
      supabase.from('formation_layout').select('id, formation, slot_positions').eq('user_id', userId).maybeSingle(),
      // Playing Styles
      supabase.from('playing_styles').select('id, name'),
      // Players - Use explicit columns to avoid SELECT * issues
      supabase.from('players')
        .select(`
          id, user_id, player_name, position, card_type, team, overall_rating,
          base_stats, skills, com_skills, position_ratings, available_boosters,
          height, weight, age, nationality, club_name, form, role,
          playing_style_id, current_level, level_cap, active_booster_name,
          development_points, slot_index, metadata, extracted_data,
          created_at, updated_at, photo_slots, original_positions
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      // Active Coach
      supabase.from('coaches')
        .select('id, user_id, coach_name, team, category, pack_type, playing_style_competence, stat_boosters, connection, photo_slots, extracted_data, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle(),
      // Tactical Settings
      supabase.from('team_tactical_settings')
        .select('id, user_id, team_playing_style, individual_instructions, created_at, updated_at')
        .eq('user_id', userId)
        .maybeSingle()
    ])

    if (playersError) throw new Error(`Players error: ${playersError.message}`)

    return NextResponse.json({
      layout: layoutData,
      playingStyles: playingStyles || [],
      players: players || [],
      activeCoach: coachData,
      tacticalSettings: tacticalSettings
    })

  } catch (error) {
    console.error('Formation API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
