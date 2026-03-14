import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(req)
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

    // Fetch player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(`
        id, user_id, player_name, position, card_type, team, overall_rating,
        base_stats, skills, com_skills, position_ratings, available_boosters,
        height, weight, age, nationality, club_name, form, role,
        playing_style_id, current_level, level_cap, active_booster_name,
        development_points, slot_index, metadata, extracted_data,
        created_at, updated_at, photo_slots, original_positions
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 404 })
    }

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Fetch playing style name if exists
    let playingStyleName = null
    if (player.playing_style_id) {
      const { data: styleData } = await supabase
        .from('playing_styles')
        .select('name')
        .eq('id', player.playing_style_id)
        .maybeSingle()
      
      if (styleData) {
        playingStyleName = styleData.name
      }
    }

    return NextResponse.json({
      player,
      playingStyleName
    })

  } catch (error) {
    console.error('[API] Error fetching player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(req)
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

    const body = await req.json()
    
    // Sanitize body: allow only specific fields for update
    const allowedFields = [
      'base_stats', 'skills', 'com_skills', 'available_boosters', 
      'photo_slots', 'metadata', 'updated_at', 'slot_index', 'original_positions'
    ]
    
    const updateData = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    
    // Always update updated_at
    updateData.updated_at = new Date().toISOString()

    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        id, user_id, player_name, position, card_type, team, overall_rating,
        base_stats, skills, com_skills, position_ratings, available_boosters,
        height, weight, age, nationality, club_name, form, role,
        playing_style_id, current_level, level_cap, active_booster_name,
        development_points, slot_index, metadata, extracted_data,
        created_at, updated_at, photo_slots, original_positions
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ player: updatedPlayer })

  } catch (error) {
    console.error('[API] Error updating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
