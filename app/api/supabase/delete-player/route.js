import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req) {
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

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/supabase/delete-player']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/supabase/delete-player',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }
    
    // Leggi body - Next.js DELETE può avere body JSON
    let player_id
    try {
      const text = await req.text()
      if (text) {
        try {
          const body = JSON.parse(text)
          player_id = body?.player_id || body?.playerId || body?.id
        } catch (e) {
          // Se non è JSON valido, prova come stringa diretta
          player_id = text.trim() || null
        }
      }
    } catch (e) {
      console.error('[delete-player] Error reading body:', e)
    }

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 })
    }

    // Normalizza player_id
    const playerIdStr = String(player_id).trim()
    
    // Validazione UUID base (deve essere UUID valido)
    if (playerIdStr.length < 30 || playerIdStr.length > 40) {
      return NextResponse.json({ error: 'Invalid player_id format' }, { status: 400 })
    }

    // Verifica che il giocatore appartenga all'utente
    const { data: player, error: fetchError } = await admin
      .from('players')
      .select('id, user_id, player_name')
      .eq('id', playerIdStr)
      .eq('user_id', userId)
      .single()

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
    }

    // ✅ CLEANUP: Rimuovi riferimenti da individual_instructions prima di eliminare giocatore
    // (Doppio livello: trigger DB + cleanup esplicito qui per sicurezza)
    const { data: tacticalSettings, error: settingsFetchError } = await admin
      .from('team_tactical_settings')
      .select('id, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle()

    if (!settingsFetchError && tacticalSettings && tacticalSettings.individual_instructions) {
      let cleanedInstructions = { ...tacticalSettings.individual_instructions }
      let hasChanges = false

      // Itera su tutte le categorie e rimuovi istruzioni che puntano a questo giocatore
      const categories = ['attacco_1', 'attacco_2', 'difesa_1', 'difesa_2']
      categories.forEach(category => {
        const instruction = cleanedInstructions[category]
        if (instruction && instruction.player_id === playerIdStr) {
          delete cleanedInstructions[category]
          hasChanges = true
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[delete-player] Removed individual_instruction ${category}`)
          }
        }
      })

      // Aggiorna solo se ci sono cambiamenti
      if (hasChanges) {
        const { error: updateError } = await admin
          .from('team_tactical_settings')
          .update({
            individual_instructions: cleanedInstructions,
            updated_at: new Date().toISOString()
          })
          .eq('id', tacticalSettings.id)

        if (updateError) {
          console.error('[delete-player] Error cleaning up individual_instructions:', updateError)
          // NON bloccare eliminazione giocatore se cleanup fallisce (trigger DB farà il lavoro)
        }
      }
    }

    // Elimina giocatore
    const { error: deleteError } = await admin
      .from('players')
      .delete()
      .eq('id', playerIdStr)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[delete-player] Delete error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete player: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[delete-player] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[delete-player] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return NextResponse.json({
      success: true,
      player_id: playerIdStr,
      player_name: player.player_name
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString()
      }
    })
  } catch (err) {
    console.error('[delete-player] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore eliminazione giocatore' },
      { status: 500 }
    )
  }
}
