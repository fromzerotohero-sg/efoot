import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { normalizeEfhubPosition } from '@/lib/efootballBuildRules'
import { computePlayerFieldOverall } from '@/lib/playerOverallPipeline'
import { normalizePlayerSkillsArray } from '@/lib/playerSkillLabels'
import { MAX_ADDITIONAL_SKILLS } from '@/lib/efootballTruthLayer'
import { lookupPlayingStyleId } from '@/lib/playingStyleResolve'
import { buildSlotRoleAugmentsForStarter, metadataAfterMovingToReserves } from '@/lib/playerSlotRoleMetadata'

const BASE_STATS_BUCKETS = ['attacking', 'defending', 'athleticism', 'goalkeeping']

/** Deep-merge stat buckets so a partial PATCH (es. solo attacking) non cancella le altre chiavi nel bucket. */
function mergePlayerBaseStats(existing, patch) {
  const base = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      BASE_STATS_BUCKETS.includes(key)
    ) {
      const prevBucket = base[key] && typeof base[key] === 'object' && !Array.isArray(base[key]) ? base[key] : {}
      next[key] = { ...prevBucket, ...value }
    } else if (value !== undefined) {
      next[key] = value
    }
  }
  return next
}

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
      .select('id, player_name, position, card_type, overall_rating, age, height, weight, nationality, club_name, role, playing_style_id, base_stats, skills, com_skills, available_boosters, photo_slots, metadata, original_positions, level_cap, current_level, development_points, position_ratings, slot_index')
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
      'photo_slots', 'metadata', 'updated_at', 'slot_index', 'original_positions',
      'level_cap', 'current_level', 'development_points', 'position_ratings'
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

    if (body.level_cap !== undefined) {
      const nextValue = sanitizeNumber(body.level_cap)
      updateData.level_cap = nextValue ?? existingPlayer.level_cap
    }

    if (body.current_level !== undefined) {
      const nextValue = sanitizeNumber(body.current_level)
      updateData.current_level = nextValue ?? existingPlayer.current_level
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

    // playing_style da catalogo/client EN: aggiorna FK + normalizza role IT (come save-player)
    if (body.role !== undefined || body.playing_style !== undefined) {
      const hint =
        (body.playing_style !== undefined ? sanitizeText(body.playing_style) : '') ||
        (body.role !== undefined ? (updateData.role != null ? String(updateData.role).trim() : '') : '') ||
        (existingPlayer.role ? String(existingPlayer.role).trim() : '')
      if (hint) {
        const { id: styleRowId, name: canonicalStyleName } = await lookupPlayingStyleId(supabase, hint)
        if (styleRowId) {
          updateData.playing_style_id = styleRowId
          if (canonicalStyleName) {
            if (body.role !== undefined && sanitizeText(body.role)) {
              updateData.role = canonicalStyleName
            } else if (body.playing_style !== undefined && sanitizeText(body.playing_style)) {
              updateData.role = canonicalStyleName
            }
          }
        }
      }
    }

    if (body.base_stats !== undefined) {
      updateData.base_stats = hasObjectValue(body.base_stats)
        ? mergePlayerBaseStats(existingPlayer.base_stats || {}, body.base_stats)
        : existingPlayer.base_stats
    }

    if (body.skills !== undefined) {
      const existing = Array.isArray(existingPlayer.skills) ? existingPlayer.skills : []
      const existingMetadata =
        existingPlayer.metadata && typeof existingPlayer.metadata === 'object'
          ? existingPlayer.metadata
          : {}
      const requestMetadata =
        body.metadata && typeof body.metadata === 'object'
          ? body.metadata
          : {}
      const nativeSkills = normalizePlayerSkillsArray(
        Array.isArray(existingMetadata.native_skills)
          ? existingMetadata.native_skills
          : (Array.isArray(body.native_skills)
            ? body.native_skills
            : requestMetadata.native_skills)
      )
      const additionalSkills = normalizePlayerSkillsArray(
        Array.isArray(body.additional_skills)
          ? body.additional_skills
          : requestMetadata.additional_skills
      ).filter((skill) => !nativeSkills.some((native) => native.toLowerCase() === skill.toLowerCase()))
      const hasSkillContract =
        Array.isArray(existingMetadata.native_skills) ||
        Array.isArray(body.native_skills) ||
        Array.isArray(requestMetadata.native_skills)

      if (hasSkillContract && additionalSkills.length > MAX_ADDITIONAL_SKILLS) {
        return NextResponse.json(
          { error: `A player can have at most ${MAX_ADDITIONAL_SKILLS} additional skills` },
          { status: 400 }
        )
      }

      updateData.skills = hasSkillContract
        ? normalizePlayerSkillsArray([...nativeSkills, ...additionalSkills])
        : normalizePlayerSkillsArray(hasArrayValue(body.skills) ? [...existing, ...body.skills] : existing)
    }

    if (body.com_skills !== undefined) {
      const existing = Array.isArray(existingPlayer.com_skills) ? existingPlayer.com_skills : []
      updateData.com_skills = normalizePlayerSkillsArray(
        hasArrayValue(body.com_skills) ? [...existing, ...body.com_skills] : existing
      )
    }

    if (body.available_boosters !== undefined) {
      updateData.available_boosters = hasArrayValue(body.available_boosters)
        ? body.available_boosters
        : existingPlayer.available_boosters
    }

    if (body.active_booster_name !== undefined) {
      const nextValue = sanitizeText(body.active_booster_name)
      updateData.active_booster_name = nextValue || null
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

    if (body.development_points !== undefined) {
      updateData.development_points = hasObjectValue(body.development_points)
        ? { ...(existingPlayer.development_points || {}), ...body.development_points }
        : existingPlayer.development_points
    }

    if (body.position_ratings !== undefined) {
      updateData.position_ratings = hasObjectValue(body.position_ratings)
        ? { ...(existingPlayer.position_ratings || {}), ...body.position_ratings }
        : existingPlayer.position_ratings
    }

    if (body.original_positions !== undefined) {
      updateData.original_positions = hasArrayValue(body.original_positions)
        ? body.original_positions
        : existingPlayer.original_positions
    }
    
    // Se il client invia un OVR (es. build guidata), rispettalo: puo includere booster/coach attivi.
    // Altrimenti ricalcola dalle sole statistiche base per i salvataggi manuali senza OVR esplicito.
    if (updateData.base_stats && body.base_stats !== undefined && body.overall_rating === undefined) {
      const mergedPlayer = {
        ...existingPlayer,
        ...updateData,
        base_stats: updateData.base_stats,
        development_points: updateData.development_points ?? existingPlayer.development_points,
        available_boosters: updateData.available_boosters ?? existingPlayer.available_boosters,
        active_booster_name: updateData.active_booster_name ?? existingPlayer.active_booster_name
      }
      const [{ data: activeCoach }, { data: tacticalSettings }] = await Promise.all([
        supabase
          .from('coaches')
          .select('id, coach_name, playing_style_competence, stat_boosters, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('team_tactical_settings')
          .select('team_playing_style')
          .eq('user_id', userId)
          .maybeSingle()
      ])
      const computed = computePlayerFieldOverall({
        player: mergedPlayer,
        slotPosition: updateData.position || existingPlayer.position,
        coach: activeCoach,
        teamStyle: tacticalSettings?.team_playing_style
      })
      const squadOvr = computed?.fieldOverall ?? computed?.afterOverall
      if (squadOvr != null && Number.isFinite(squadOvr)) {
        updateData.overall_rating = squadOvr
        updateData.position_ratings = {
          ...(existingPlayer.position_ratings || {}),
          ...(updateData.position_ratings || {}),
          [computed.targetPosition]: squadOvr
        }
      }
    }

    // Titolare/riserva: stessi flag metadata della assign-player-to-slot (Coach / FIT).
    // Ricalcola anche se cambiano solo competenze o position, altrimenti un titolare
    // a cui aggiungi il ruolo dello slot resta marcato fuori ruolo.
    let movingToReserves = false
    let starterSlotToRefresh = null
    if (body.slot_index !== undefined) {
      const raw = body.slot_index
      if (raw === null || raw === '') {
        movingToReserves = true
      } else {
        const nextSlot = Number(raw)
        if (!Number.isNaN(nextSlot) && nextSlot >= 0 && nextSlot <= 10) {
          starterSlotToRefresh = nextSlot
        } else {
          movingToReserves = true
        }
      }
    } else if (body.original_positions !== undefined || body.position !== undefined) {
      const existingSlot = Number(existingPlayer.slot_index)
      if (
        existingPlayer.slot_index != null &&
        !Number.isNaN(existingSlot) &&
        existingSlot >= 0 &&
        existingSlot <= 10
      ) {
        starterSlotToRefresh = existingSlot
      }
    }

    if (movingToReserves || starterSlotToRefresh != null) {
      const mergedMetadata = {
        ...(existingPlayer.metadata && typeof existingPlayer.metadata === 'object' ? existingPlayer.metadata : {}),
        ...(updateData.metadata && typeof updateData.metadata === 'object' ? updateData.metadata : {})
      }
      if (movingToReserves) {
        const cleared = metadataAfterMovingToReserves(mergedMetadata)
        if (cleared) updateData.metadata = cleared
      } else {
        const { data: formationRow } = await supabase
          .from('formation_layout')
          .select('slot_positions')
          .eq('user_id', userId)
          .maybeSingle()
        const slotPos =
          formationRow?.slot_positions?.[starterSlotToRefresh]?.position ||
          formationRow?.slot_positions?.[String(starterSlotToRefresh)]?.position ||
          null
        const mergedPosition =
          updateData.position !== undefined ? updateData.position : existingPlayer.position
        const mergedOriginalPositions =
          updateData.original_positions !== undefined
            ? updateData.original_positions
            : existingPlayer.original_positions
        const { augments } = buildSlotRoleAugmentsForStarter({
          playerRow: {
            position: mergedPosition,
            original_positions: mergedOriginalPositions,
            metadata: existingPlayer.metadata
          },
          slotPosition: slotPos,
          metadataBase: mergedMetadata
        })
        if (augments.metadata) updateData.metadata = augments.metadata
        if (augments.original_positions !== undefined && updateData.original_positions === undefined) {
          updateData.original_positions = augments.original_positions
        }
      }
    }

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
