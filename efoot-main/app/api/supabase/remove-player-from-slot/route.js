import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLang(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

export async function PATCH(req) {
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

    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/remove-player-from-slot'] || { maxRequests: 30, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/remove-player-from-slot', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt }, { status: 429 })
    }

    const { player_id } = await req.json()

    if (!player_id || typeof player_id !== 'string') {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 })
    }

    // Verifica che il giocatore appartenga all'utente
    const { data: player, error: fetchError } = await admin
      .from('players')
      .select('id, user_id, player_name, age, slot_index, original_positions, position')
      .eq('id', player_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
    }

    // Limite riserve: non spostare in panchina se già 12
    const MAX_RESERVES = 12
    const { count, error: countErr } = await admin
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('slot_index', null)
    if (!countErr && count >= MAX_RESERVES) {
      const msg = getLang(req) === 'en'
        ? 'Maximum 12 reserves reached. Remove a reserve first.'
        : 'Massimo 12 riserve raggiunto. Rimuovi una riserva prima.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Validazione duplicati riserve: verifica se stesso giocatore (nome+età) già presente nelle riserve
    const playerName = player.player_name?.trim().toLowerCase()
    const playerAge = player.age != null ? Number(player.age) : null
    
    if (playerName) {
      // Cerca duplicati riserve (escludendo questo giocatore)
      let duplicateQuery = admin
        .from('players')
        .select('id, player_name, age')
        .eq('user_id', userId)
        .is('slot_index', null)
        .neq('id', player_id)
        .ilike('player_name', playerName)
      
      const { data: duplicates, error: dupError } = await duplicateQuery
      
      if (!dupError && duplicates && duplicates.length > 0) {
        // Filtra per età se disponibile
        const exactDuplicates = playerAge != null
          ? duplicates.filter(p => p.age != null && Number(p.age) === playerAge)
          : duplicates
        
        if (exactDuplicates.length > 0) {
          const dup = exactDuplicates[0]
          return NextResponse.json(
            { 
              error: `Player "${player.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} already exists in reserves`,
              duplicate_reserve_id: dup.id,
              duplicate_player_name: player.player_name,
              duplicate_player_age: playerAge
            },
            { status: 400 }
          )
        }
      }
    }

    // NUOVO: Reset a original_position (prima posizione originale o position attuale)
    const originalPosition = Array.isArray(player.original_positions) && player.original_positions.length > 0
      ? player.original_positions[0].position
      : player.position

    // Rimuovi da slot (reset position a originale)
    const { error: updateError } = await admin
      .from('players')
      .update({
        slot_index: null,
        position: originalPosition,  // NUOVO: reset a originale
        updated_at: new Date().toISOString()
      })
      .eq('id', player_id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('[remove-player-from-slot] Update error:', updateError)
      return NextResponse.json(
        { error: `Failed to remove player from slot: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[remove-player-from-slot] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[remove-player-from-slot] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return NextResponse.json({
      success: true,
      player_id: player_id,
      player_name: player.player_name,
      action: 'removed_from_slot'
    })
  } catch (err) {
    console.error('[remove-player-from-slot] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore rimozione giocatore da slot' },
      { status: 500 }
    )
  }
}
