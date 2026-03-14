import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { validateIndividualInstruction } from '@/lib/tacticalInstructions'
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

    // ✅ Rate limiting (pattern enterprise)
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/supabase/save-tactical-settings']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/supabase/save-tactical-settings',
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

    const { team_playing_style, individual_instructions } = await req.json()

    // Validazione team_playing_style
    const validStyles = ['possesso_palla', 'contropiede_veloce', 'contrattacco', 'vie_laterali', 'passaggio_lungo']
    if (team_playing_style !== null && team_playing_style !== undefined && team_playing_style !== '') {
      if (typeof team_playing_style !== 'string' || !validStyles.includes(team_playing_style.trim())) {
        return NextResponse.json(
          { error: `Invalid team_playing_style. Must be one of: ${validStyles.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validazione individual_instructions (opzionale, ma se presente deve essere oggetto)
    if (individual_instructions !== undefined && typeof individual_instructions !== 'object') {
      return NextResponse.json(
        { error: 'individual_instructions must be an object' },
        { status: 400 }
      )
    }

    // Recupera tutti i giocatori titolari dell'utente per la validazione delle istruzioni individuali
    const { data: players, error: playersError } = await admin
      .from('players')
      .select('id, position, slot_index')
      .eq('user_id', userId)
      .not('slot_index', 'is', null) // Solo titolari

    if (playersError) {
      console.error('[save-tactical-settings] Error fetching players for validation:', playersError)
      return NextResponse.json({ error: 'Failed to fetch players for validation' }, { status: 500 })
    }

    const titolari = players || []

    // ✅ Recupera formazione layout per validazione "linea_bassa" (conta difensori)
    const { data: formationLayout, error: formationError } = await admin
      .from('formation_layout')
      .select('slot_positions')
      .eq('user_id', userId)
      .maybeSingle()

    if (formationError) {
      console.warn('[save-tactical-settings] Error fetching formation layout for validation:', formationError)
      // Non bloccare, ma la validazione "linea_bassa" con 5 difensori non funzionerà
    }

    let droppedInstructions = []
    if (individual_instructions && typeof individual_instructions === 'object') {
      for (const categoryKey in individual_instructions) {
        const instructionData = individual_instructions[categoryKey]
        if (!instructionData) continue

        // Istruzione senza giocatore (es. dopo sanitizzazione frontend): salta e salva il resto
        const playerId = instructionData.player_id && instructionData.player_id.trim()
        if (instructionData.instruction && !playerId) {
          droppedInstructions.push(categoryKey)
          continue
        }
        if (playerId && !instructionData.instruction) {
          droppedInstructions.push(categoryKey)
          continue
        }
        if (!playerId || !instructionData.instruction) continue

        const inTitolari = titolari.some(p => p.id === playerId)
        if (!inTitolari) {
          droppedInstructions.push(categoryKey)
          continue
        }

        const validationResult = validateIndividualInstruction(
          categoryKey,
          playerId,
          instructionData.instruction.trim(),
          titolari,
          formationLayout || null
        )
        if (!validationResult.valid) {
          return NextResponse.json(
            { error: validationResult.error },
            { status: 400 }
          )
        }
      }
    }

    // Sanitizzazione: solo istruzioni complete e con player ancora titolare
    const sanitizedInstructions = {}
    if (individual_instructions && typeof individual_instructions === 'object') {
      for (const categoryKey in individual_instructions) {
        const instructionData = individual_instructions[categoryKey]
        if (!instructionData?.player_id?.trim() || !instructionData?.instruction?.trim()) continue
        const pid = instructionData.player_id.trim()
        if (!titolari.some(p => p.id === pid)) continue
        sanitizedInstructions[categoryKey] = {
          player_id: pid,
          instruction: instructionData.instruction.trim(),
          enabled: instructionData.enabled !== false
        }
      }
    }

    // Salva/aggiorna impostazioni (UPSERT - stesso pattern di save-formation-layout)
    const { data: settings, error: settingsError } = await admin
      .from('team_tactical_settings')
      .upsert({
        user_id: userId,
        team_playing_style: team_playing_style && team_playing_style.trim() !== '' ? team_playing_style.trim() : null,
        individual_instructions: sanitizedInstructions,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('id, team_playing_style, individual_instructions')
      .single()

    if (settingsError) {
      console.error('[save-tactical-settings] Error saving settings:', settingsError)
      return NextResponse.json(
        { error: `Failed to save settings: ${settingsError.message}` },
        { status: 500 }
      )
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[save-tactical-settings] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[save-tactical-settings] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        team_playing_style: settings.team_playing_style,
        individual_instructions: settings.individual_instructions
      },
      ...(droppedInstructions.length > 0 && {
        warning: 'Alcune istruzioni sono state rimosse (giocatore non in formazione o non selezionato). Assegna un titolare se vuoi.'
      })
    })
  } catch (err) {
    console.error('[save-tactical-settings] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore salvataggio impostazioni tattiche' },
      { status: 500 }
    )
  }
}
