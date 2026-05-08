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

    const { data: existingPlayer, error: existingPlayerError } = await supabase
      .from('players')
      .select('id, player_name, position, card_type, overall_rating, age, nationality, club_name, role, base_stats, skills, com_skills, available_boosters, photo_slots, metadata, original_positions')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (existingPlayerError || !existingPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Sanitize body: allow only specific fields for update
    const allowedFields = [
      'player_name', 'position', 'card_type', 'overall_rating', 'age', 'nationality', 'club_name', 'role',
      'base_stats', 'skills', 'com_skills', 'available_boosters', 
      'photo_slots', 'metadata', 'updated_at', 'slot_index', 'original_positions'
    ]
    
    const updateData = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const hasObjectValue = (value) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
    const hasArrayValue = (value) => Array.isArray(value) && value.length > 0

    // PATCH is often used for partial updates (boosters only, positions only, slot moves).
    // Never let an empty payload wipe data extracted earlier from screenshots.
    const sanitizeText = (value) => typeof value === 'string' ? value.trim() : ''
    const sanitizeNumber = (value) => {
      if (value === null || value === undefined || value === '') return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    if (body.player_name !== undefined) {
      const nextValue = sanitizeText(body.player_name)
      updateData.player_name = nextValue || existingPlayer.player_name
    }

    if (body.position !== undefined) {
      const nextValue = sanitizeText(body.position)
      updateData.position = nextValue || existingPlayer.position
    }

    if (body.card_type !== undefined) {
      const nextValue = sanitizeText(body.card_type)
      updateData.card_type = nextValue || existingPlayer.card_type
    }

    if (body.overall_rating !== undefined) {
      const nextValue = sanitizeNumber(body.overall_rating)
      updateData.overall_rating = nextValue ?? existingPlayer.overall_rating
    }

    if (body.age !== undefined) {
      const nextValue = sanitizeNumber(body.age)
      updateData.age = nextValue ?? existingPlayer.age
    }

    if (body.nationality !== undefined) {
      const nextValue = sanitizeText(body.nationality)
      updateData.nationality = nextValue || existingPlayer.nationality
    }

    if (body.club_name !== undefined) {
      const nextValue = sanitizeText(body.club_name)
      updateData.club_name = nextValue || existingPlayer.club_name
    }

    if (body.role !== undefined) {
      const nextValue = sanitizeText(body.role)
      updateData.role = nextValue || existingPlayer.role
    }

    if (body.base_stats !== undefined) {
      updateData.base_stats = hasObjectValue(body.base_stats)
        ? { ...(existingPlayer.base_stats || {}), ...body.base_stats }
        : existingPlayer.base_stats
    }

    if (body.skills !== undefined) {
      const existing = Array.isArray(existingPlayer.skills) ? existingPlayer.skills : []
      updateData.skills = hasArrayValue(body.skills)
        ? [...existing, ...body.skills].filter((value, index, array) => array.indexOf(value) === index)
        : existing
    }

    if (body.com_skills !== undefined) {
      const existing = Array.isArray(existingPlayer.com_skills) ? existingPlayer.com_skills : []
      updateData.com_skills = hasArrayValue(body.com_skills)
        ? [...existing, ...body.com_skills].filter((value, index, array) => array.indexOf(value) === index)
        : existing
    }

    if (body.available_boosters !== undefined) {
      updateData.available_boosters = hasArrayValue(body.available_boosters)
        ? body.available_boosters
        : existingPlayer.available_boosters
    }

    if (body.photo_slots !== undefined) {
      updateData.photo_slots = hasObjectValue(body.photo_slots)
        ? { ...(existingPlayer.photo_slots || {}), ...body.photo_slots }
        : existingPlayer.photo_slots
    }

    if (body.metadata !== undefined) {
      updateData.metadata = hasObjectValue(body.metadata)
        ? { ...(existingPlayer.metadata || {}), ...body.metadata }
        : existingPlayer.metadata
    }

    if (body.original_positions !== undefined) {
      updateData.original_positions = hasArrayValue(body.original_positions)
        ? body.original_positions
        : existingPlayer.original_positions
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

    // Trigger esplicito del ricalcolo AI Knowledge dopo update player.
    // Questo endpoint viene usato spesso per slot_index/original_positions:
    // senza ricalcolo qui, la barra può restare stale anche con rosa completa.
    try {
      const { updateAIKnowledgeScore } = await import('@/lib/aiKnowledgeHelper')
      await updateAIKnowledgeScore(userId, supabaseUrl, serviceKey)
    } catch (knowledgeErr) {
      // Non blocchiamo l'update player se il ricalcolo knowledge fallisce:
      // il client ha comunque salvato dati corretti e può ritentare refresh.
      console.error('[API] Warning: AI Knowledge recalculation failed after player PATCH:', knowledgeErr)
    }

    return NextResponse.json({ player: updatedPlayer })

  } catch (error) {
    console.error('[API] Error updating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
