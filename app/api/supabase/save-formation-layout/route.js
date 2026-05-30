import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { DEFAULT_SLOT_POSITIONS } from '@/lib/formationDefaultSlots'
import { resolveKonamiFormationName } from '@/lib/formationRules'
import { validateFormationLimits } from '@/lib/validateFormationLimits'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
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

    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/save-formation-layout'] || { maxRequests: 30, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/save-formation-layout', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt }, { status: 429 })
    }

    const { formation, slot_positions, preserve_slots } = await req.json()

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-formation-layout] Received request for user ${userId}:`, {
        formation,
        slotPositionsKeys: Object.keys(slot_positions || {}),
        preserveSlots: preserve_slots
      })
    }

    if (!formation) {
      return NextResponse.json(
        { error: 'formation is required' },
        { status: 400 }
      )
    }

    // Validazione lunghezza formazione (max 50 caratteri)
    if (formation && String(formation).trim().length > 50) {
      return NextResponse.json(
        { error: 'formation exceeds maximum length (50 characters)' },
        { status: 400 }
      )
    }

    // Validazione dimensione slot_positions JSONB (max 500KB)
    const MAX_JSONB_SIZE = 500 * 1024 // 500KB
    if (slot_positions && JSON.stringify(slot_positions).length > MAX_JSONB_SIZE) {
      return NextResponse.json(
        { error: `slot_positions exceeds maximum size (${MAX_JSONB_SIZE / 1024}KB)` },
        { status: 400 }
      )
    }

    // Completa slot mancanti se necessario (0-10)
    const completeSlotPositions = (slots) => {
      const complete = { ...(slots || {}) }
      for (let i = 0; i <= 10; i++) {
        if (!complete[i]) {
          complete[i] = DEFAULT_SLOT_POSITIONS[i] || { x: 50, y: 50, position: '?' }
        }
      }
      return complete
    }
    
    const completeSlots = completeSlotPositions(slot_positions)
    const detectedFormation = resolveKonamiFormationName(completeSlots)
    const formationToSave = detectedFormation || String(formation).trim()
    const slotKeys = Object.keys(completeSlots).map(Number).filter(n => n >= 0 && n <= 10)
    
    if (slotKeys.length < 11) {
      console.warn(`[save-formation-layout] Solo ${slotKeys.length} slot, completati a 11`)
    }

    // Validazione limitazioni ruolo (memoria Attila)
    // ⚠️ FASE TEST: Warning invece di blocco (permette salvataggio anche se non valida)
    const validation = validateFormationLimits(completeSlots)
    if (!validation.valid) {
      // Log warning ma non blocca salvataggio (fase test)
      console.warn('[save-formation-layout] Formazione non valida, ma permessa (fase test):', {
        errors: validation.errors,
        stats: validation.stats,
        userId
      })
      // Procedi con salvataggio (non bloccare)
    }

    // 1. Gestione cambio formazione intelligente
    // Se preserve_slots è fornito, libera solo i giocatori da slot che non sono nella nuova formazione
    // Altrimenti, libera tutti i titolari (comportamento originale)
    if (preserve_slots && Array.isArray(preserve_slots)) {
      // Libera solo giocatori da slot che non esistono nella nuova formazione
      const slotsToFree = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(slot => !preserve_slots.includes(slot))
      
      if (slotsToFree.length > 0) {
        const { error: updateError } = await admin
          .from('players')
          .update({ 
            slot_index: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .in('slot_index', slotsToFree)

        if (updateError) {
          console.error('[save-formation-layout] Error clearing old starters:', updateError)
          return NextResponse.json(
            { error: `Failed to clear old starters: ${updateError.message}` },
            { status: 500 }
          )
        }
      }
    } else {
      // Comportamento originale: libera tutti i titolari
      const { error: updateError } = await admin
        .from('players')
        .update({ 
          slot_index: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .in('slot_index', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

      if (updateError) {
        console.error('[save-formation-layout] Error clearing old starters:', updateError)
        return NextResponse.json(
          { error: `Failed to clear old starters: ${updateError.message}` },
          { status: 500 }
        )
      }
    }

    // 2. Salva/aggiorna layout (UPSERT)
    const { data: layout, error: layoutError } = await admin
      .from('formation_layout')
      .upsert({
        user_id: userId,
        formation: formationToSave,
        slot_positions: completeSlots,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('id, formation, slot_positions')
      .single()

    if (layoutError) {
      console.error('[save-formation-layout] Error saving layout:', layoutError)
      return NextResponse.json(
        { error: `Failed to save layout: ${layoutError.message}` },
        { status: 500 }
      )
    }

    // 3. Sincronizza players.position con slot_positions (dopo salvataggio layout)
    // Aggiorna position di tutti i giocatori titolari in base alle nuove posizioni slot
    for (const [slotIndex, slotPos] of Object.entries(completeSlots)) {
      const slotIdx = Number(slotIndex)
      if (slotPos && slotPos.position && slotIdx >= 0 && slotIdx <= 10) {
        const { error: playerUpdateError } = await admin
          .from('players')
          .update({ 
            position: slotPos.position,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('slot_index', slotIdx)
        
        if (playerUpdateError) {
          // Log errore ma non bloccare (non critico)
          console.warn(`[save-formation-layout] Error updating player position for slot ${slotIdx}:`, playerUpdateError)
        }
      }
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[save-formation-layout] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[save-formation-layout] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return NextResponse.json({
      success: true,
      layout: {
        id: layout.id,
        formation: layout.formation,
        slot_positions: layout.slot_positions
      }
    })
  } catch (err) {
    console.error('[save-formation-layout] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore salvataggio layout' },
      { status: 500 }
    )
  }
}
