import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { validateIndividualInstruction } from '@/lib/tacticalInstructions'
import { TEAM_PLAYSTYLE_IDS, isLegacyIndividualInstruction, isPreservedLegacyAssignment } from '@/lib/efootballV6Rules'
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

    // Stato esistente: necessario per distinguere round-trip legacy da nuove assegnazioni.
    const { data: existingSettings, error: existingSettingsError } = await admin
      .from('team_tactical_settings')
      .select('team_playing_style, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingSettingsError) {
      console.error('[save-tactical-settings] Error fetching existing settings:', existingSettingsError)
      return NextResponse.json({ error: 'Failed to load current tactical settings' }, { status: 500 })
    }

    // Validazione team_playing_style
    const validStyles = TEAM_PLAYSTYLE_IDS
    if (team_playing_style !== null && team_playing_style !== undefined && team_playing_style !== '') {
      if (typeof team_playing_style !== 'string' || !validStyles.includes(team_playing_style.trim())) {
        return NextResponse.json(
          { error: `Invalid team_playing_style. Must be one of: ${validStyles.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validazione individual_instructions (opzionale, ma se presente deve essere oggetto)
    if (
      individual_instructions !== undefined &&
      (individual_instructions === null || typeof individual_instructions !== 'object' || Array.isArray(individual_instructions))
    ) {
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

        const normalizedInstruction = instructionData.instruction.trim()
        if (isLegacyIndividualInstruction(normalizedInstruction)) {
          const existingValue = existingSettings?.individual_instructions?.[categoryKey]
          if (!isPreservedLegacyAssignment(existingValue, {
            ...instructionData,
            instruction: normalizedInstruction,
            player_id: playerId
          })) {
            return NextResponse.json(
              {
                error: 'Questa istruzione appartiene a una versione precedente di eFootball e non può essere assegnata nuovamente.',
                code: 'LEGACY_INSTRUCTION_NOT_CREATABLE',
                slot: categoryKey,
                instruction: normalizedInstruction
              },
              { status: 409 }
            )
          }
          // Round-trip consentito anche se il giocatore non è più titolare:
          // è memoria storica v<6 e non deve sparire per un salvataggio non correlato.
          continue
        }

        const inTitolari = titolari.some(p => p.id === playerId)
        if (!inTitolari) {
          droppedInstructions.push(categoryKey)
          continue
        }

        const validationResult = validateIndividualInstruction(
          categoryKey,
          playerId,
          normalizedInstruction,
          titolari
        )
        if (!validationResult.valid) {
          return NextResponse.json(
            { error: validationResult.error },
            { status: 400 }
          )
        }
      }
    }

    // Sanitizzazione backward-compatible:
    // - slot omessi dal payload restano invariati (evita wipe da client/flow parziali)
    // - slot presenti ma vuoti vengono rimossi volontariamente
    // - legacy identico al DB resta leggibile e persistibile, ma non può essere ricreato/spostato
    const sanitizedInstructions = {}
    const existingInstructions = existingSettings?.individual_instructions && typeof existingSettings.individual_instructions === 'object'
      ? existingSettings.individual_instructions
      : {}
    if (individual_instructions && typeof individual_instructions === 'object') {
      for (const [existingKey, existingValue] of Object.entries(existingInstructions)) {
        if (!Object.prototype.hasOwnProperty.call(individual_instructions, existingKey)) {
          sanitizedInstructions[existingKey] = existingValue
        }
      }

      for (const categoryKey in individual_instructions) {
        const instructionData = individual_instructions[categoryKey]
        if (!instructionData?.player_id?.trim() || !instructionData?.instruction?.trim()) continue
        const pid = instructionData.player_id.trim()
        const normalizedInstruction = instructionData.instruction.trim()

        if (isLegacyIndividualInstruction(normalizedInstruction)) {
          const existingValue = existingInstructions?.[categoryKey]
          if (!isPreservedLegacyAssignment(existingValue, {
            ...instructionData,
            instruction: normalizedInstruction,
            player_id: pid
          })) continue
          sanitizedInstructions[categoryKey] = {
            player_id: pid,
            instruction: normalizedInstruction,
            enabled: instructionData.enabled !== false
          }
          continue
        }

        if (!titolari.some(p => p.id === pid)) continue
        sanitizedInstructions[categoryKey] = {
          player_id: pid,
          instruction: normalizedInstruction,
          enabled: instructionData.enabled !== false
        }
      }
    }

    const finalTeamPlayingStyle = team_playing_style === undefined
      ? (existingSettings?.team_playing_style ?? null)
      : (team_playing_style && team_playing_style.trim() !== '' ? team_playing_style.trim() : null)
    const finalIndividualInstructions = individual_instructions === undefined
      ? (existingSettings?.individual_instructions || {})
      : sanitizedInstructions

    // Salva/aggiorna impostazioni (UPSERT - stesso pattern di save-formation-layout)
    const { data: settings, error: settingsError } = await admin
      .from('team_tactical_settings')
      .upsert({
        user_id: userId,
        team_playing_style: finalTeamPlayingStyle,
        individual_instructions: finalIndividualInstructions,
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
    // Invalida diagnostic cache (tattica cambiata → cache stale)
    admin.from('user_diagnostic_cache').delete().eq('user_id', userId).then(({ error: delErr }) => {
      if (delErr) console.error('[save-tactical-settings] Cache invalidation error (non-blocking):', delErr.message)
    })

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
