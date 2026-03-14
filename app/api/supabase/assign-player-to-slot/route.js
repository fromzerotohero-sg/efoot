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

    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/assign-player-to-slot'] || { maxRequests: 30, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/assign-player-to-slot', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt }, { status: 429 })
    }

    let { slot_index, player_id, player_data } = await req.json()

    // Ensure slot_index is a number
    slot_index = Number(slot_index)

    if (process.env.NODE_ENV !== 'production') console.log(`[assign-player-to-slot] Request for user ${userId}: slot=${slot_index}, player=${player_id}`)

    // Valida slot_index
    if (isNaN(slot_index) || slot_index < 0 || slot_index > 10) {
      return NextResponse.json(
        { error: 'slot_index must be between 0 and 10' },
        { status: 400 }
      )
    }

    // NUOVO: Recupera formazione layout per calcolare slotPosition
    const { data: formationLayout } = await admin
      .from('formation_layout')
      .select('slot_positions')
      .eq('user_id', userId)
      .maybeSingle()

    // Calcola posizione richiesta dallo slot
    const slotPosition = formationLayout?.slot_positions?.[slot_index]?.position || null

    // Se slot già occupato, libera vecchio giocatore
    const { data: existingPlayerInSlot } = await admin
      .from('players')
      .select('id, player_name, age')
      .eq('user_id', userId)
      .eq('slot_index', slot_index)
      .maybeSingle()

    if (existingPlayerInSlot) {
      // Validazione duplicati riserve: verifica se stesso giocatore già presente nelle riserve
      const existingPlayerName = existingPlayerInSlot.player_name?.trim().toLowerCase()
      const existingPlayerAge = existingPlayerInSlot.age != null ? Number(existingPlayerInSlot.age) : null
      
      if (existingPlayerName) {
        // Cerca duplicati riserve (escludendo questo giocatore)
        let duplicateQuery = admin
          .from('players')
          .select('id, player_name, age')
          .eq('user_id', userId)
          .is('slot_index', null)
          .neq('id', existingPlayerInSlot.id)
          .ilike('player_name', existingPlayerName)
        
        const { data: duplicates, error: dupError } = await duplicateQuery
        
        if (!dupError && duplicates && duplicates.length > 0) {
          // Filtra per età se disponibile
          const exactDuplicates = existingPlayerAge != null
            ? duplicates.filter(p => p.age != null && Number(p.age) === existingPlayerAge)
            : duplicates
          
          if (exactDuplicates.length > 0) {
            // Elimina duplicato riserva prima di liberare slot
            await admin
              .from('players')
              .delete()
              .eq('id', exactDuplicates[0].id)
              .eq('user_id', userId)
          }
        }
      }
      // RC-001: libera vecchio slot fatto atomicamente in RPC sotto (non qui)
    }

    // Assegna nuovo giocatore
    if (player_id) {
      // Caso 1: Assegna giocatore esistente (da riserve o altro slot)
      const { data: player, error: playerError } = await admin
        .from('players')
        .select('id, user_id, player_name, age, position, original_positions')
        .eq('id', player_id)
        .eq('user_id', userId)
        .single()

      if (playerError || !player) {
        return NextResponse.json(
          { error: 'Player not found or unauthorized' },
          { status: 404 }
        )
      }

      // CONTROLLI INCROCIATI: verifica duplicati sia in campo che in riserve
      const playerName = player.player_name?.trim().toLowerCase()
      const playerAge = player.age != null ? Number(player.age) : null
      
      if (playerName) {
        // 1. Verifica duplicati in CAMPO (titolari)
        let duplicateInFieldQuery = admin
          .from('players')
          .select('id, player_name, age, slot_index')
          .eq('user_id', userId)
          .not('slot_index', 'is', null)
          .neq('id', player_id)
          .neq('slot_index', slot_index)
          .ilike('player_name', playerName)
        
        const { data: duplicatesInField, error: dupFieldError } = await duplicateInFieldQuery
        
        if (!dupFieldError && duplicatesInField && duplicatesInField.length > 0) {
          // Filtra per età se disponibile
          const exactDuplicatesInField = playerAge != null
            ? duplicatesInField.filter(p => p.age != null && Number(p.age) === playerAge)
            : duplicatesInField
          
          if (exactDuplicatesInField.length > 0) {
            const dup = exactDuplicatesInField[0]
            return NextResponse.json(
              { 
                error: `Player "${player.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} already in starting lineup at slot ${dup.slot_index}`,
                duplicate_slot: dup.slot_index,
                duplicate_player_id: dup.id
              },
              { status: 400 }
            )
          }
        }
        
        // 2. Verifica duplicati in RISERVE (oltre a quello che stiamo assegnando)
        let duplicateInReservesQuery = admin
          .from('players')
          .select('id, player_name, age')
          .eq('user_id', userId)
          .is('slot_index', null)
          .neq('id', player_id) // Escludi giocatore che stiamo assegnando
          .ilike('player_name', playerName)
        
        const { data: duplicatesInReserves, error: dupReservesError } = await duplicateInReservesQuery
        
        if (!dupReservesError && duplicatesInReserves && duplicatesInReserves.length > 0) {
          // Filtra per età se disponibile
          const exactDuplicatesInReserves = playerAge != null
            ? duplicatesInReserves.filter(p => p.age != null && Number(p.age) === playerAge)
            : duplicatesInReserves
          
          if (exactDuplicatesInReserves.length > 0) {
            // Elimina duplicati in riserve automaticamente
            for (const dup of exactDuplicatesInReserves) {
              await admin
                .from('players')
                .delete()
                .eq('id', dup.id)
                .eq('user_id', userId)
            }
          }
        }
      }

      // 1. Clear the slot first (Manual replacement for atomic_slot_assignment)
      // This removes any player currently in the target slot
      const { error: clearError } = await admin
        .from('players')
        .update({ slot_index: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('slot_index', slot_index)

      if (clearError) {
        console.error('[assign-player-to-slot] Failed to clear slot:', clearError)
        return NextResponse.json({ error: 'Failed to clear slot' }, { status: 500 })
      }

      // 2. Assign the new player to the slot
      // Adatta position e original_positions allo slot
      const positionUpdate = {
        slot_index: slot_index, // Explicitly set slot_index
        position: slotPosition || player.position,
        updated_at: new Date().toISOString()
      }
      
      if ((!player.original_positions || player.original_positions.length === 0) && player.position) {
        positionUpdate.original_positions = [{ position: player.position, competence: 'Alta' }]
      }

      const { error: assignError } = await admin
        .from('players')
        .update(positionUpdate)
        .eq('id', player_id)
        .eq('user_id', userId)

      if (assignError) {
        console.error('[assign-player-to-slot] Failed to assign player:', assignError)
        return NextResponse.json({ error: 'Failed to assign player' }, { status: 500 })
      }

      if (process.env.NODE_ENV !== 'production') console.log(`[assign-player-to-slot] Assigned player ${player_id} to slot ${slot_index} for user ${userId}`)

      // Aggiorna AI Knowledge Score (async, non blocca risposta)
      if (supabaseUrl && serviceKey) {
        import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
          updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
            console.error('[assign-player-to-slot] Failed to update AI knowledge score (non-blocking):', err)
          })
        }).catch(err => {
          console.error('[assign-player-to-slot] Failed to import aiKnowledgeHelper (non-blocking):', err)
        })
      }

      return NextResponse.json({
        success: true,
        player_id: player_id,
        slot_index: slot_index,
        action: 'assigned_existing'
      })

    } else if (player_data) {
      // Caso 2: Crea nuovo giocatore e assegna slot
      // Usa logica simile a save-player
      const playerData = {
        user_id: userId,
        player_name: toText(player_data.player_name),
        position: slotPosition || toText(player_data.position),  // NUOVO: adatta a slot (se disponibile)
        card_type: toText(player_data.card_type),
        team: toText(player_data.team),
        overall_rating: typeof player_data.overall_rating === 'number' 
          ? player_data.overall_rating 
          : toInt(player_data.overall_rating),
        base_stats: player_data.base_stats && typeof player_data.base_stats === 'object' 
          ? player_data.base_stats 
          : {},
        skills: Array.isArray(player_data.skills) ? player_data.skills : [],
        com_skills: Array.isArray(player_data.com_skills) ? player_data.com_skills : [],
        slot_index: slot_index, // Assegna slot
        // NUOVO: original_positions - salva originali dalla card
        original_positions: Array.isArray(player_data.original_positions) 
          ? player_data.original_positions 
          : (player_data.position ? [{ position: player_data.position, competence: "Alta" }] : []),
        metadata: {
          source: 'formation_assignment',
          saved_at: new Date().toISOString(),
          player_face_description: player_data.player_face_description || null
        },
        extracted_data: player_data
      }

      const { data: inserted, error: insertError } = await admin
        .from('players')
        .insert(playerData)
        .select('id, player_name, slot_index')
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to create player: ${insertError.message}` },
          { status: 500 }
        )
      }

      // Aggiorna AI Knowledge Score (async, non blocca risposta)
      if (supabaseUrl && serviceKey) {
        import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
          updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
            console.error('[assign-player-to-slot] Failed to update AI knowledge score (non-blocking):', err)
          })
        }).catch(err => {
          console.error('[assign-player-to-slot] Failed to import aiKnowledgeHelper (non-blocking):', err)
        })
      }

      return NextResponse.json({
        success: true,
        player_id: inserted.id,
        slot_index: slot_index,
        action: 'created_new'
      })

    } else {
      return NextResponse.json(
        { error: 'Either player_id or player_data is required' },
        { status: 400 }
      )
    }

  } catch (err) {
    console.error('[assign-player-to-slot] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore assegnazione giocatore' },
      { status: 500 }
    )
  }
}
