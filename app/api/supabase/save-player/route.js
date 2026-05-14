import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { normalizePlayerSkillsArray } from '@/lib/playerSkillLabels'
import { enrichPlayerMetadataWithCardImage } from '@/lib/playerCardImage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLang(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

const SERVER_ERROR = { it: 'Errore server', en: 'Server error' }

/** Massimo riserve consentite (eFootball: 11 titolari + 12 in panchina) */
const MAX_RESERVES = 12

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}

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

    // Se è un utente Metalgate, dobbiamo recuperare il vero user_id (Supabase UUID)
    // perché validateToken restituisce l'ID di Metalgate che non esiste in auth.users
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        console.error('[save-player] Metalgate user profile not found for ID:', userId)
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-player] User ID: ${userId}`)
    }

    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/save-player'] || { maxRequests: 30, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/save-player', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt }, { status: 429 })
    }

    const { player } = await req.json()

    if (!player || !player.player_name) {
      return NextResponse.json({ error: 'Player data is required' }, { status: 400 })
    }

    // Lookup playing_style_id: da player.playing_style oppure da player.role (es. "Collante" spesso arriva solo in role)
    let playingStyleId = null
    const playingStyleName = toText(player.playing_style) || toText(player.role)
    if (playingStyleName) {
      const { data: playingStyle } = await admin
        .from('playing_styles')
        .select('id, name')
        .ilike('name', playingStyleName.trim())
        .maybeSingle()

      if (playingStyle?.id) {
        playingStyleId = playingStyle.id
      }
    }

    // Validazione lunghezza campi testo (max 255 caratteri)
    const MAX_TEXT_LENGTH = 255
    if (player.player_name && toText(player.player_name) && toText(player.player_name).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `player_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (player.team && toText(player.team) && toText(player.team).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `team exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (player.nationality && toText(player.nationality) && toText(player.nationality).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `nationality exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (player.club_name && toText(player.club_name) && toText(player.club_name).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `club_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // Validazione dimensione JSONB rimossa - Supabase gestisce automaticamente i limiti

    // ✅ VALIDAZIONE: players.position deve essere una posizione valida eFootball
    const validPositions = ['PT', 'DC', 'TD', 'TS', 'CC', 'CMF', 'MED', 'P', 'SP', 'TRQ', 'AMF', 'CLD', 'CLS', 'EDA', 'EDE', 'ESA', 'CF', 'LWF', 'RWF', 'SS']
    const playerPosition = toText(player.position)
    
    // Stili di gioco comuni che NON sono posizioni (vanno in playing_style_id o role)
    const playingStylesNotPositions = [
      'Opportunista', 'Tra le linee', 'Ala prolifica', 'Collante', 'Giocatore chiave',
      'Regista creativo', 'Onnipresente', 'Terzino difensivo', 'Terzino offensivo',
      'Portiere offensivo', 'Portiere difensivo', 'Frontale extra', 'Sviluppo',
      'Incontrista', 'Classico n° 10', 'Taglio al centro', 'Terzino mattatore'
    ]
    
    if (playerPosition) {
      const positionUpper = playerPosition.toUpperCase()
      const isValidPosition = validPositions.includes(positionUpper)
      const isPlayingStyle = playingStylesNotPositions.some(style => 
        playerPosition.toLowerCase().includes(style.toLowerCase()) || 
        style.toLowerCase().includes(playerPosition.toLowerCase())
      )
      
      if (!isValidPosition && isPlayingStyle) {
        // Log warning ma NON bloccare (retrocompatibilità)
        console.warn(`[save-player] WARNING: position "${playerPosition}" appears to be a playing style, not a position. Consider using playing_style_id or role field instead.`)
        // Suggerisci correzione nel log
        console.warn(`[save-player] Valid positions: ${validPositions.join(', ')}`)
      } else if (!isValidPosition && !isPlayingStyle) {
        // Se non è né posizione valida né stile riconosciuto, logga ma procedi (retrocompatibilità)
        console.warn(`[save-player] WARNING: position "${playerPosition}" is not a recognized eFootball position. Valid positions: ${validPositions.join(', ')}`)
      }
    }

    // Prepara dati giocatore (tutto in una struttura)
    const playerData = {
      user_id: userId,
      player_name: toText(player.player_name),
      position: playerPosition, // Usa la posizione validata (anche se warning, procediamo per retrocompatibilità)
      card_type: toText(player.card_type),
      team: toText(player.team),
      overall_rating: typeof player.overall_rating === 'number' ? player.overall_rating : toInt(player.overall_rating),
      base_stats: player.base_stats && typeof player.base_stats === 'object' ? player.base_stats : {},
      skills: normalizePlayerSkillsArray(player.skills),
      com_skills: normalizePlayerSkillsArray(player.com_skills),
      position_ratings: player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {},
      available_boosters: Array.isArray(player.boosters) ? player.boosters : [],
      height: toInt(player.height_cm),
      weight: toInt(player.weight_kg),
      age: toInt(player.age),
      nationality: toText(player.nationality) || toText(player.region_or_nationality),
      club_name: toText(player.club_name),
      form: toText(player.form),
      role: toText(player.role),
      playing_style_id: playingStyleId,
      current_level: toInt(player.level_current),
      level_cap: toInt(player.level_cap),
      active_booster_name: Array.isArray(player.boosters) && player.boosters[0]?.name ? String(player.boosters[0].name) : null,
      development_points: {},
      extracted_data: player,
      metadata: enrichPlayerMetadataWithCardImage(player, {
        ...(player.metadata && typeof player.metadata === 'object' ? player.metadata : {}),
        source: player?.metadata?.catalog_source ? player.metadata.catalog_source : 'screenshot_extractor',
        saved_at: new Date().toISOString(),
        weak_foot_frequency: player.weak_foot_frequency || null,
        weak_foot_accuracy: player.weak_foot_accuracy || null,
        form_detailed: player.form_detailed || null,
        injury_resistance: player.injury_resistance || null,
        ai_playstyles: Array.isArray(player.ai_playstyles) ? player.ai_playstyles : [],
        matches_played: player.matches_played || null,
        goals: player.goals || null,
        assists: player.assists || null,
        player_face_description: player.player_face_description || null
      }),
      // slot_index: accetta dal body (0-10 per titolari, null per riserve)
      slot_index: player.slot_index !== undefined && player.slot_index !== null 
        ? Math.max(0, Math.min(10, Number(player.slot_index))) 
        : null,
      // photo_slots: traccia quali foto sono state caricate
      // FIX: Se photo_slots non è presente o è vuoto, usa null invece di {} per evitare sovrascritture
      photo_slots: player.photo_slots && typeof player.photo_slots === 'object' && Object.keys(player.photo_slots).length > 0
        ? player.photo_slots 
        : null,
      // NUOVO: original_positions - array di posizioni originali dalla card
      original_positions: Array.isArray(player.original_positions) 
        ? player.original_positions 
        : (player.position ? [{ position: player.position, competence: "Alta" }] : [])
    }

    // CONTROLLI INCROCIATI: verifica duplicati sia in campo che in riserve
    const playerName = playerData.player_name?.trim().toLowerCase()
    const playerAge = playerData.age != null ? Number(playerData.age) : null
    
    // VERIFICA 1: Se esiste già un giocatore nello stesso slot_index → UPDATE invece di INSERT
    if (playerData.slot_index !== null && playerData.slot_index !== undefined) {
      const { data: existingPlayerInSlot, error: existingErr } = await admin
        .from('players')
        .select('id, player_name, overall_rating, photo_slots, base_stats, skills, com_skills, available_boosters, extracted_data, metadata')
        .eq('user_id', userId)
        .eq('slot_index', playerData.slot_index)
        .maybeSingle()

      if (!existingErr && existingPlayerInSlot) {
        // Giocatore già presente nello slot → UPDATE con merge dati
        if (process.env.NODE_ENV !== 'production') console.log(`[save-player] Player already exists in slot ${playerData.slot_index}, updating: id=${existingPlayerInSlot.id}`)
        
        // Se giocatore esiste già, NON sovrascrivere original_positions (mantieni originali)
        delete playerData.original_positions
        
        // Merge photo_slots (solo se newPhotoSlots ha valori, altrimenti mantieni existing)
        const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
        const newPhotoSlots = playerData.photo_slots || {}
        // FIX: Se newPhotoSlots è vuoto o null, mantieni existingPhotoSlots invece di sovrascrivere
        const mergedPhotoSlots = (newPhotoSlots && typeof newPhotoSlots === 'object' && Object.keys(newPhotoSlots).length > 0)
          ? { ...existingPhotoSlots, ...newPhotoSlots }
          : existingPhotoSlots
        
        // Merge base_stats (preferisci nuovi se presenti)
        const mergedBaseStats = playerData.base_stats && Object.keys(playerData.base_stats).length > 0
          ? { ...(existingPlayerInSlot.base_stats || {}), ...playerData.base_stats }
          : existingPlayerInSlot.base_stats
        
        // Merge skills e com_skills (unisci array, rimuovi duplicati)
        const existingSkills = Array.isArray(existingPlayerInSlot.skills) ? existingPlayerInSlot.skills : []
        const newSkills = Array.isArray(playerData.skills) ? playerData.skills : []
        const mergedSkills = normalizePlayerSkillsArray([...existingSkills, ...newSkills])
        
        const existingComSkills = Array.isArray(existingPlayerInSlot.com_skills) ? existingPlayerInSlot.com_skills : []
        const newComSkills = Array.isArray(playerData.com_skills) ? playerData.com_skills : []
        const mergedComSkills = normalizePlayerSkillsArray([...existingComSkills, ...newComSkills])
        
        // Merge boosters (preferisci nuovi se presenti)
        const mergedBoosters = playerData.available_boosters && Array.isArray(playerData.available_boosters) && playerData.available_boosters.length > 0
          ? playerData.available_boosters
          : existingPlayerInSlot.available_boosters
        
        // Merge extracted_data
        const mergedExtractedData = {
          ...(existingPlayerInSlot.extracted_data || {}),
          ...playerData.extracted_data
        }
        
        // Validazione dimensione JSONB rimossa - Supabase gestisce automaticamente i limiti
        
        // Prepara dati aggiornati (NON usare spread di playerData per evitare sovrascrivere campi importanti)
        // FIX: overall_rating - preferire sempre il valore più alto per evitare downgrade
        const existingOverall = existingPlayerInSlot.overall_rating != null ? Number(existingPlayerInSlot.overall_rating) : null
        const newOverall = playerData.overall_rating != null ? Number(playerData.overall_rating) : null
        const finalOverall = (existingOverall != null && newOverall != null) 
          ? Math.max(existingOverall, newOverall) 
          : (newOverall != null ? newOverall : existingOverall)
        
        const updateData = {
          // Campi base (sovrascrivibili solo se presenti nei nuovi dati)
          ...(playerData.player_name && { player_name: playerData.player_name }),
          ...(playerData.position && { position: playerData.position }),
          ...(playerData.card_type && { card_type: playerData.card_type }),
          ...(playerData.team && { team: playerData.team }),
          ...(finalOverall !== null && finalOverall !== undefined && { overall_rating: finalOverall }),
          ...(playerData.age !== null && playerData.age !== undefined && { age: playerData.age }),
          ...(playerData.nationality && { nationality: playerData.nationality }),
          ...(playerData.club_name && { club_name: playerData.club_name }),
          ...(playerData.form && { form: playerData.form }),
          ...(playerData.role && { role: playerData.role }),
          ...(playerData.height !== null && playerData.height !== undefined && { height: playerData.height }),
          ...(playerData.weight !== null && playerData.weight !== undefined && { weight: playerData.weight }),
          ...(playerData.current_level !== null && playerData.current_level !== undefined && { current_level: playerData.current_level }),
          ...(playerData.level_cap !== null && playerData.level_cap !== undefined && { level_cap: playerData.level_cap }),
          ...(playerData.active_booster_name && { active_booster_name: playerData.active_booster_name }),
          ...(playerData.playing_style_id && { playing_style_id: playerData.playing_style_id }),
          // Campi merged (sempre aggiornati)
          photo_slots: mergedPhotoSlots,
          base_stats: mergedBaseStats,
          skills: mergedSkills,
          com_skills: mergedComSkills,
          available_boosters: mergedBoosters,
          extracted_data: mergedExtractedData,
          // Metadata: merge invece di sovrascrivere
          metadata: enrichPlayerMetadataWithCardImage(
            { ...playerData, extracted_data: mergedExtractedData },
            {
              ...(existingPlayerInSlot.metadata || {}),
              ...(playerData.metadata || {}),
              saved_at: new Date().toISOString()
            }
          ),
          updated_at: new Date().toISOString()
        }
        
        const { data: updated, error: updateErr } = await admin
          .from('players')
          .update(updateData)
          .eq('id', existingPlayerInSlot.id)
          .eq('user_id', userId)
          .select('id, user_id, player_name')
          .single()

        if (updateErr) {
          console.error('[save-player] Update error:', updateErr.message)
          return NextResponse.json(
            { error: `Failed to update player: ${updateErr.message}` },
            { status: 500 }
          )
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[save-player] Player updated: id=${updated.id}`)
        }

        // Aggiorna AI Knowledge Score (async, non blocca risposta)
        if (supabaseUrl && serviceKey) {
          import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
            updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
              console.error('[save-player] Failed to update AI knowledge score (non-blocking):', err)
            })
          }).catch(err => {
            console.error('[save-player] Failed to import aiKnowledgeHelper (non-blocking):', err)
          })
        }

        return NextResponse.json({
          success: true,
          player_id: updated.id,
          is_new: false,
          action: 'updated'
        })
      }
    }
    
    if (playerName) {
      // 1. Verifica duplicati in CAMPO (titolari) - sempre, indipendentemente da dove si salva
      let duplicateInFieldQuery = admin
        .from('players')
        .select('id, player_name, age, slot_index')
        .eq('user_id', userId)
        .not('slot_index', 'is', null)
        .ilike('player_name', playerName)
      
      const { data: duplicatesInField, error: dupFieldError } = await duplicateInFieldQuery
      
      if (!dupFieldError && duplicatesInField && duplicatesInField.length > 0) {
        // Filtra per età se disponibile
        const exactDuplicatesInField = playerAge != null
          ? duplicatesInField.filter(p => p.age != null && Number(p.age) === playerAge && (playerData.slot_index === null || p.slot_index !== playerData.slot_index))
          : duplicatesInField.filter(p => playerData.slot_index === null || p.slot_index !== playerData.slot_index)
        
        if (exactDuplicatesInField.length > 0) {
          const dup = exactDuplicatesInField[0]
          return NextResponse.json(
            { 
              error: `Player "${playerData.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} already in starting lineup at slot ${dup.slot_index}`,
              duplicate_slot: dup.slot_index,
              duplicate_player_id: dup.id,
              is_field: true
            },
            { status: 400 }
          )
        }
      }
      
      // 2. Verifica duplicati in RISERVE - sempre, indipendentemente da dove si salva
      let duplicateInReservesQuery = admin
        .from('players')
        .select('id, player_name, age, slot_index')
        .eq('user_id', userId)
        .is('slot_index', null)
        .ilike('player_name', playerName)
      
      const { data: duplicatesInReserves, error: dupReservesError } = await duplicateInReservesQuery
      
      if (!dupReservesError && duplicatesInReserves && duplicatesInReserves.length > 0) {
        // Filtra per età se disponibile
        const exactDuplicatesInReserves = playerAge != null
          ? duplicatesInReserves.filter(p => p.age != null && Number(p.age) === playerAge)
          : duplicatesInReserves
        
        if (exactDuplicatesInReserves.length > 0) {
          const dup = exactDuplicatesInReserves[0]
          return NextResponse.json(
            { 
              error: `Player "${playerData.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} already exists in reserves`,
              duplicate_player_id: dup.id,
              is_reserve: true
            },
            { status: 400 }
          )
        }
      }
    }

    // Limite riserve: non inserire nuova riserva se già 12
    if (playerData.slot_index === null) {
      const { count, error: countErr } = await admin
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('slot_index', null)
      if (!countErr && count >= MAX_RESERVES) {
        const msg = getLang(req) === 'en' ? 'Maximum 12 reserves reached.' : 'Massimo 12 riserve raggiunto.'
        return NextResponse.json({ error: msg, code: 'max_reserves' }, { status: 400 })
      }
    }

    // Inserisci nuovo giocatore (log senza PII)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-player] Inserting player for user_id: ${userId}`)
    }
    const { data: inserted, error: insertErr } = await admin
      .from('players')
      .insert(playerData)
      .select('id, user_id, player_name')
      .single()

    if (insertErr) {
      console.error('[save-player] Insert error:', insertErr.message)
      return NextResponse.json(
        { error: `Failed to create player: ${insertErr.message}` },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-player] Player saved: id=${inserted.id}`)
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[save-player] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[save-player] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return NextResponse.json({
      success: true,
      player_id: inserted.id,
      is_new: true
    })
  } catch (e) {
    console.error('[save-player] Error:', e)
    const lang = getLang(req)
    return NextResponse.json(
      { error: e?.message || SERVER_ERROR[lang] },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
