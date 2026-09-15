import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { enforcePlanCoherence, focusCountermeasuresOutput, generateCountermeasuresPrompt, validateCountermeasuresOutput } from '@/lib/countermeasuresHelper'
import { presentCountermeasuresForCustomer } from '@/lib/prematchCustomerPlan'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'
import { validateIndividualInstruction } from '@/lib/tacticalInstructions'
import { rolesAreEquivalent, validateStartingXISwap } from '@/lib/formationDefenseRules'
import {
  activeTacticalInstructions,
  buildClientFormationSnapshot,
  getSnapshotPlayerRole
} from '@/lib/clientFormationSnapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeInstructionId(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-\s]+/g, '_')

  const aliases = {
    marcatura_stretta: 'marcatura_stretta',
    marcatura_a_uomo: 'marcatura_uomo',
    marcatura_uomo: 'marcatura_uomo',
    man_marking: 'marcatura_uomo',
    tight_marking: 'marcatura_stretta',
    linea_bassa: 'linea_bassa',
    deep_line: 'linea_bassa',
    obiettivo_contropiede: 'contropiede',
    counter_target: 'contropiede',
    counterattack: 'contropiede',
    contropiede: 'contropiede',
    ancoraggio: 'ancoraggio',
    anchoring: 'ancoraggio',
    offensivo: 'offensivo',
    offensive: 'offensivo',
    difensivo: 'difensivo',
    defensive: 'difensivo'
  }

  return aliases[normalized] || normalized
}

function normalizeInstructionSlot(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_')
  const aliases = {
    attack_1: 'attacco_1',
    attack1: 'attacco_1',
    attacco1: 'attacco_1',
    attack_2: 'attacco_2',
    attack2: 'attacco_2',
    attacco2: 'attacco_2',
    defense_1: 'difesa_1',
    defence_1: 'difesa_1',
    defense1: 'difesa_1',
    defence1: 'difesa_1',
    difesa1: 'difesa_1',
    defense_2: 'difesa_2',
    defence_2: 'difesa_2',
    defense2: 'difesa_2',
    defence2: 'difesa_2',
    difesa2: 'difesa_2'
  }
  return aliases[normalized] || normalized
}

function hasVerifiedRosterData(titolari) {
  return Array.isArray(titolari) && titolari.length > 0 && titolari.every((p) => (
    Array.isArray(p.original_positions) &&
    p.original_positions.length > 0 &&
    p.photo_slots &&
    typeof p.photo_slots === 'object' &&
    p.photo_slots.card === true
  ))
}

function asPlainText(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.it || value.en || ''
  return ''
}

function asTextDiagnosis(output) {
  return asPlainText(output?.diagnosis).trim()
    || asPlainText(output?.play_summary?.match_key).trim()
    || asPlainText(output?.analysis?.opponent_formation_analysis).trim()
}

function hasFlankJustification(value) {
  const text = asPlainText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return [
    /\bfascia\b/,
    /\bfasce\b/,
    /\bcorsia\b/,
    /\bcorsie\b/,
    /\blaterale\b/,
    /\blaterali\b/,
    /\bterzino\b/,
    /\bterzini\b/,
    /\bfull-?back\b/,
    /\bwide\b/,
    /\bflank\b/
  ].some((pattern) => pattern.test(text))
}

function normalizePlayerName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function countermeasureCopy(output) {
  const summary = output?.play_summary || {}
  const cm = output?.countermeasures || {}
  return [
    output?.diagnosis,
    output?.fit_proof,
    summary.match_key,
    summary.base_plan,
    summary.attacking,
    summary.defending,
    summary.avoid,
    ...(Array.isArray(output?.starting_plan) ? output.starting_plan : []),
    ...(Array.isArray(cm.formation_adjustments) ? cm.formation_adjustments.flatMap((row) => [row?.suggestion, row?.reason]) : []),
    ...(Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments.flatMap((row) => [row?.suggestion, row?.reason]) : [])
  ].map(asPlainText).filter(Boolean).join(' ')
}

/**
 * If the model names a real bench player in the customer copy but forgets to
 * emit the structured swap, recover it only when the replacement slot is
 * unambiguous and passes the same deterministic swap rules.
 */
function validateSnapshotSwap(titolari, reserve, replacePlayerId, snapshot) {
  const phases = snapshot?.enabled ? ['attack', 'defense'] : ['base']
  const checks = phases.map((phase) => validateStartingXISwap(
    titolari,
    reserve,
    replacePlayerId,
    { getSlotRole: (player) => getSnapshotPlayerRole(snapshot, player, phase) }
  ))
  const failed = checks.find((check) => !check.valid)
  return failed || checks[0] || validateStartingXISwap(titolari, reserve, replacePlayerId)
}

function inferStructuredBenchSwap(output, riserve, titolari, clientSnapshot = null) {
  const suggestions = output?.countermeasures?.player_suggestions
  if (Array.isArray(suggestions) && suggestions.length > 0) return null
  if (!Array.isArray(riserve) || !Array.isArray(titolari) || !titolari.length) return null

  const copy = countermeasureCopy(output)
  const normalizedCopy = normalizePlayerName(copy)
  if (!/\b(cambia|schiera|inserisci|usa|utilizza|sfrutta|ampiezza|fasce|with|use|start)\b/i.test(copy)) {
    return null
  }

  const mentionedReserves = riserve
    .filter((player) => {
      const name = normalizePlayerName(player?.player_name)
      return name && normalizedCopy.includes(name)
    })
  if (mentionedReserves.length !== 1) return null

  const reserve = mentionedReserves[0]
  const mentionedStarters = titolari.filter((player) => {
    const name = normalizePlayerName(player?.player_name)
    return name && normalizedCopy.includes(name)
  })
  const validReplacements = titolari.filter((player) => (
    validateSnapshotSwap(titolari, reserve, player.id, clientSnapshot).valid
  ))
  const reserveRoles = [
    reserve.position,
    ...(Array.isArray(reserve.original_positions) ? reserve.original_positions : [])
  ].map((role) => typeof role === 'string' ? role : role?.position)
  const exactRole = validReplacements.filter((player) => (
    reserveRoles.some((role) => rolesAreEquivalent(
      role,
      getSnapshotPlayerRole(clientSnapshot, player, 'defense') || player.position
    ))
  ))
  const namedReplacement = mentionedStarters.filter((player) => validReplacements.includes(player))
  const replacements = namedReplacement.length === 1
    ? namedReplacement
    : exactRole.length === 1
      ? exactRole
      : []
  if (replacements.length !== 1) return null

  const outgoing = replacements[0]
  return {
    action: 'add_to_starting_xi',
    player_id: reserve.id,
    player_name: reserve.player_name,
    position: reserve.position,
    replace_player_id: outgoing.id,
    replace_player_name: outgoing.player_name,
    replace_position: getSnapshotPlayerRole(clientSnapshot, outgoing, 'defense') || outgoing.position,
    reason: 'Il piano cita questa riserva come leva per il setup.',
    priority: 'high'
  }
}

function sanitizeCountermeasureWarnings(warnings, { removedPlayerSuggestions = 0, removedInstructions = 0, verifiedRoster = false } = {}) {
  const result = []
  const seen = new Set()
  const add = (text) => {
    const value = String(text || '').trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    result.push(value)
  }

  for (const warning of Array.isArray(warnings) ? warnings : []) {
    const text = typeof warning === 'string'
      ? warning
      : (warning?.it || warning?.en || '')
    const lower = String(text).toLowerCase()
    if (verifiedRoster && (
      lower.includes('posizioni originali') ||
      lower.includes('competenze ruolo') ||
      lower.includes('original positions') ||
      lower.includes('role competencies')
    )) {
      continue
    }
    if (lower.includes('filtrat') || lower.includes('non applicabil')) continue
    add(text)
  }

  // Filter diagnostics stay server-side only — never add synthetic customer warnings.
  if (removedPlayerSuggestions > 0) {
    console.info('[generate-countermeasures] filtered player suggestions', removedPlayerSuggestions)
  }
  if (removedInstructions > 0) {
    console.info('[generate-countermeasures] filtered instructions', removedInstructions)
  }

  return result
}

export async function POST(req) {
  let creditChargeContext = null
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
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

    // Recupera dati contestuali
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

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
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/generate-countermeasures']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/generate-countermeasures',
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

    const body = await req.json().catch(() => ({}))
    const { opponent_formation_id, context, language = 'it', corrected_formation } = body
    const lang = (language === 'en' || language === 'it') ? language : 'it'

    if (!opponent_formation_id || typeof opponent_formation_id !== 'string') {
      return NextResponse.json({ error: 'opponent_formation_id is required' }, { status: 400 })
    }

    // Validazione UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(opponent_formation_id)) {
      return NextResponse.json({ error: 'Invalid opponent_formation_id format' }, { status: 400 })
    }

    // 1. Recupera formazione avversaria
    const { data: opponentFormation, error: formationError } = await admin
      .from('opponent_formations')
      .select('id, user_id, formation_name, playing_style, tactical_style, overall_strength, players, extracted_data, is_pre_match, formation_image, match_date, created_at, updated_at')
      .eq('id', opponent_formation_id)
      .eq('user_id', userId)
      .single()

    if (formationError || !opponentFormation) {
      return NextResponse.json(
        { error: 'Opponent formation not found or access denied' },
        { status: 404 }
      )
    }

    // Optional human correction from Hero confirm step — override before AI + persist.
    const corrected = typeof corrected_formation === 'string' ? corrected_formation.trim() : ''
    if (corrected && /^\d+-\d+(-\d+)?(-\d+)?$/.test(corrected)) {
      const nextExtracted = {
        ...(opponentFormation.extracted_data && typeof opponentFormation.extracted_data === 'object'
          ? opponentFormation.extracted_data
          : {}),
        formation: corrected
      }
      opponentFormation.formation_name = corrected
      opponentFormation.extracted_data = nextExtracted
      await admin
        .from('opponent_formations')
        .update({
          formation_name: corrected,
          extracted_data: nextExtracted,
          updated_at: new Date().toISOString()
        })
        .eq('id', opponent_formation_id)
        .eq('user_id', userId)
    }

    // 2. Recupera rosa partita: 11 titolari (slot 0-10) + massimo 12 riserve (slot null)
    const { data: clientRoster, error: rosterError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions, photo_slots')
      .eq('user_id', userId)
      .order('overall_rating', { ascending: false })

    const roster = clientRoster || []
    
    // 2.1 Recupera playing_styles per lookup nomi
    const { data: playingStyles, error: stylesError } = await admin
      .from('playing_styles')
      .select('id, name')
    
    const stylesLookup = {}
    if (playingStyles && !stylesError) {
      playingStyles.forEach(style => {
        stylesLookup[style.id] = style.name
      })
    }

    // Titolari = slot_index 0-10, riserve = slot_index null (max 12 da regole save-player)
    const titolari = roster
      .filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
      .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
    const riserve = roster.filter(p => p.slot_index == null).slice(0, 12)

    // 3. Recupera formazione cliente
    const { data: clientFormation, error: formationLayoutError } = await admin
      .from('formation_layout')
      .select('formation, slot_positions')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: formationVariants, error: formationVariantsError } = await admin
      .from('formation_variants')
      .select('id, phase, formation, slot_positions, is_active, source_version, updated_at')
      .eq('user_id', userId)
      .in('phase', ['attack', 'defense'])
      .eq('is_active', true)

    const clientFormationSnapshot = buildClientFormationSnapshot({
      starters: titolari,
      baseLayout: clientFormation,
      variantRows: formationVariants || []
    })

    // 4. Recupera impostazioni tattiche
    const { data: tacticalSettings, error: tacticalError } = await admin
      .from('team_tactical_settings')
      .select('team_playing_style, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle()

    const effectiveTacticalSettings = tacticalSettings
      ? {
          ...tacticalSettings,
          individual_instructions: activeTacticalInstructions(tacticalSettings, clientFormationSnapshot)
        }
      : null

    // 5. Recupera allenatore attivo
    const { data: activeCoach, error: coachError } = await admin
      .from('coaches')
      .select('coach_name, playing_style_competence, stat_boosters, connection')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    // 6. Recupera storico match completo (ultime 20 per analisi)
    const { data: matchHistory, error: historyError } = await admin
      .from('matches')
      .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, player_ratings, team_stats, attack_areas, match_date')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(20)

    // 6.1 Analizza match con formazioni simili all'avversario
    const similarFormationMatches = []
    const opponentFormationName = opponentFormation.formation_name || ''
    
    // Lookup formazioni avversarie storiche (serve fallback corretto quando manca il match per ID esatto)
    const historyOppIds = [...new Set((matchHistory || []).map(m => m.opponent_formation_id).filter(Boolean))]
    const historyOppMap = {}
    if (historyOppIds.length > 0) {
      const { data: historyOppRows } = await admin
        .from('opponent_formations')
        .select('id, formation_name, playing_style, players, extracted_data')
        .in('id', historyOppIds)
      ;(historyOppRows || []).forEach(o => { historyOppMap[o.id] = o })
    }

    const normalizedPlayerNames = (formation) => new Set(
      (formation?.players || formation?.extracted_data?.players || [])
        .map(player => String(player?.player_name || '').trim().toLowerCase())
        .filter(name => name.length >= 3)
    )
    const currentOpponentNames = normalizedPlayerNames(opponentFormation)

    if (matchHistory && matchHistory.length > 0) {
      matchHistory.forEach(match => {
        const matchOpponentFormationId = match.opponent_formation_id

        // Se match ha opponent_formation_id, confronta direttamente
        if (matchOpponentFormationId && matchOpponentFormationId === opponent_formation_id) {
          similarFormationMatches.push(match)
        } else {
          // Fallback: confronta usando la FORMAZIONE AVVERSARIA storica (non la formazione giocata dal cliente)
          const histOpp = matchOpponentFormationId ? historyOppMap[matchOpponentFormationId] : null
          const histOppFormation = histOpp?.formation_name || ''
          const historicNames = normalizedPlayerNames(histOpp)
          const sharedPlayers = [...currentOpponentNames].filter(name => historicNames.has(name)).length
          // A newly uploaded photo always gets a new UUID. Treat it as the same
          // opponent only when the shape and most of the detected XI agree.
          // Formation-only history belongs to generic RAG, not personal evidence.
          const sameFormation = opponentFormationName && histOppFormation
            && histOppFormation === opponentFormationName
          const isSimilar = sameFormation && sharedPlayers >= 6

          if (isSimilar) {
            similarFormationMatches.push(match)
          }
        }
      })
    }

    // 6.2 Analizza performance giocatori contro formazioni simili
    // player_ratings può essere { cliente: { "Nome": { rating } } } o flat { id/name: rating }
    const playerPerformanceAgainstSimilar = {}
    const resolveRating = (v) => {
      if (typeof v === 'number' && v > 0) return v
      if (v && typeof v.rating === 'number') return v.rating
      const p = parseFloat(v)
      return Number.isFinite(p) ? p : 0
    }
    const resolveToPlayerId = (key, rosterList) => {
      const byId = rosterList.find(p => p.id === key)
      if (byId) return byId.id
      const byName = rosterList.find(p => (p.player_name || '').trim() === (key || '').trim())
      if (byName) return byName.id
      return null
    }

    if (similarFormationMatches.length > 0 && roster.length > 0) {
      similarFormationMatches.forEach(match => {
        if (!match.player_ratings || typeof match.player_ratings !== 'object') return
        const source = match.player_ratings.cliente && typeof match.player_ratings.cliente === 'object'
          ? match.player_ratings.cliente
          : (match.player_ratings.cliente || match.player_ratings.avversario) ? {} : match.player_ratings
        Object.entries(source).forEach(([key, rating]) => {
          const playerId = resolveToPlayerId(key, roster)
          if (!playerId) return
          const numRating = resolveRating(rating)
          if (numRating <= 0) return
          if (!playerPerformanceAgainstSimilar[playerId]) {
            playerPerformanceAgainstSimilar[playerId] = {
              matches: 0,
              totalRating: 0,
              ratings: [],
              playerName: roster.find(p => p.id === playerId)?.player_name || key
            }
          }
          playerPerformanceAgainstSimilar[playerId].matches++
          playerPerformanceAgainstSimilar[playerId].totalRating += numRating
          playerPerformanceAgainstSimilar[playerId].ratings.push(numRating)
        })
      })
    }

    // 6.3 Analizza abitudini tattiche cliente
    const tacticalHabits = {
      preferredFormations: {},
      preferredStyles: {},
      winRateByFormation: {},
      lossRateByFormation: {},
      commonIssues: []
    }

    if (matchHistory && matchHistory.length > 0) {
      matchHistory.forEach(match => {
        const formation = match.formation_played || 'unknown'
        const style = match.playing_style_played || 'unknown'
        const result = match.result || ''
        
        // Conta formazioni preferite
        if (!tacticalHabits.preferredFormations[formation]) {
          tacticalHabits.preferredFormations[formation] = 0
        }
        tacticalHabits.preferredFormations[formation]++

        // Conta stili preferiti
        if (!tacticalHabits.preferredStyles[style]) {
          tacticalHabits.preferredStyles[style] = 0
        }
        tacticalHabits.preferredStyles[style]++

        // Analizza win/loss rate per formazione
        if (!tacticalHabits.winRateByFormation[formation]) {
          tacticalHabits.winRateByFormation[formation] = { wins: 0, losses: 0, draws: 0, total: 0 }
        }
        tacticalHabits.winRateByFormation[formation].total++
        
        if (result.includes('W') || result.includes('Vittoria') || result.includes('Win')) {
          tacticalHabits.winRateByFormation[formation].wins++
        } else if (result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')) {
          tacticalHabits.winRateByFormation[formation].losses++
        } else {
          tacticalHabits.winRateByFormation[formation].draws++
        }
      })
    }

    // 7. Recupera pattern tattici (opzionale)
    const { data: tacticalPatterns, error: patternsError } = await admin
      .from('team_tactical_patterns')
      .select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg')
      .eq('user_id', userId)
      .maybeSingle()

    // 7b. Recupera feedback Palestra Coach (ultimi 30 giorni) — per coerenza con chat principale
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: coachFeedback } = await admin
      .from('user_tactical_feedback')
      .select('insights, formation_played, opponent_name, outcome, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5)

    // 7c. Recupera profilo IA (connessione, punto debole, game analysis) — contesto utente
    const { data: userProfile } = await admin
      .from('user_profiles')
      .select('first_name, connection_quality, input_delay, pass_level, ai_weak_point, ai_learn_goals, platform')
      .eq('user_id', userId)
      .maybeSingle()

    const { data: gameAnalysis } = await admin
      .from('user_game_analysis')
      .select('stats')
      .eq('user_id', userId)
      .maybeSingle()

    // 9. Valida dati prima di generare prompt
if (!opponentFormation || !opponentFormation.formation_name) {
  return NextResponse.json(
    { error: 'Opponent formation data is incomplete' },
    { status: 400 }
  )
}

// 9.1 Log dati per debug
if (process.env.NODE_ENV !== 'production') {
  console.log('[generate-countermeasures] Data summary:', {
    opponentFormation: opponentFormation.formation_name,
    rosterSize: roster.length,
    titolariCount: titolari.length,
    riserveCount: riserve.length,
    hasClientFormation: !!clientFormation,
    hasFluidFormation: clientFormationSnapshot.enabled,
    formationVariantsError: formationVariantsError?.message || null,
    hasTacticalSettings: !!tacticalSettings,
    hasActiveCoach: !!activeCoach,
    matchHistorySize: matchHistory?.length || 0,
    similarFormationMatches: similarFormationMatches.length,
    playerPerformanceCount: Object.keys(playerPerformanceAgainstSimilar).length
  })
}
    
    // 9.2 Genera prompt contestuale con analisi approfondita
    let prompt
    try {
      prompt = await generateCountermeasuresPrompt(
        opponentFormation,
        roster || [],
        clientFormation || null,
        effectiveTacticalSettings || null,
        activeCoach || null,
        matchHistory || [],
        tacticalPatterns || null,
        {
          similarFormationMatches: similarFormationMatches || [],
          playerPerformanceAgainstSimilar: playerPerformanceAgainstSimilar || {},
          tacticalHabits: tacticalHabits || {},
          titolari: titolari || [],
          riserve: riserve || [],
          stylesLookup: stylesLookup || {},
          team_playing_style: tacticalSettings?.team_playing_style || null,
          coachFeedback: coachFeedback || [],
          userProfile: userProfile || null,
          gameAnalysis: gameAnalysis?.stats || null,
          clientFormationSnapshot
        },
        lang
      )
    } catch (promptErr) {
      console.error('[generate-countermeasures] Error generating prompt:', promptErr)
      return NextResponse.json(
        { error: 'Error generating prompt. Please try again.' },
        { status: 500 }
      )
    }

    // Validazione dimensione prompt: contromisure usa RAG + rosa completa, quindi serve margine.
    const promptSize = prompt.length
    const MAX_PROMPT_SIZE = 180 * 1024
    if (promptSize > MAX_PROMPT_SIZE) {
      return NextResponse.json(
        { error: 'Countermeasures data too large. Please reduce data size.' },
        { status: 413 }
      )
    }

    // Check and deduct credits upfront
    const deduction = await deductCredits(admin, userId, token, AI_COST, 'generate-countermeasures')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402 }
      )
    }
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'generate-countermeasures', functionName: 'generate-countermeasures:POST' }

    // 10. Default gpt-5.2 (alias gpt-5 deprecato), override con OPENAI_MODEL; fallback gpt-4o, gpt-4-turbo, gpt-4
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const preferredModel = process.env.OPENAI_MODEL || 'gpt-5.2'
    const models = [preferredModel, 'gpt-4o', 'gpt-4-turbo', 'gpt-4']
    let lastError = null
    let response = null
    let lastErrorDetails = null

    for (const model of models) {
      try {
        const requestBody = {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.25,
          max_completion_tokens: 3000
        }

        if (process.env.NODE_ENV !== 'production') console.log(`[generate-countermeasures] Trying model: ${model}, prompt size: ${prompt.length} chars`)
        response = await callOpenAIWithRetry(apiKey, requestBody, 'generate-countermeasures')
        
        if (response.ok) {
          if (process.env.NODE_ENV !== 'production') console.log(`[generate-countermeasures] Success with model: ${model}`)
          break // Successo, esci dal loop
        }
        
        const errorData = await response.json().catch(() => ({}))
        lastErrorDetails = errorData
        
        console.error(`[generate-countermeasures] Model ${model} failed:`, errorData)
        
        if (errorData.error?.code === 'model_not_found' || errorData.error?.message?.includes('not found')) {
          // Modello non disponibile, prova il prossimo
          lastError = errorData
          continue
        }
        
        // Se è un errore di formato o input, non provare altri modelli
        if (errorData.error?.code === 'invalid_request_error' || 
            errorData.error?.type === 'invalid_request_error' ||
            response.status === 400) {
          console.error(`[generate-countermeasures] Invalid request error:`, errorData)
          if (creditChargeContext?.admin && creditChargeContext?.userId) {
            await handleCreditOperationError(creditChargeContext.admin, {
              userId: creditChargeContext.userId,
              cost: creditChargeContext.cost,
              operationType: creditChargeContext.operationType,
              functionName: creditChargeContext.functionName,
              error: errorData?.error?.message || 'Invalid request error',
              statusCode: 500,
              errorType: 'provider_error',
              metadata: { endpoint: '/api/generate-countermeasures', stage: 'invalid_request_error' }
            })
          }
          return NextResponse.json(
            { error: errorData.error?.message || 'Invalid request. Please check your input and try again.' },
            { status: 400 }
          )
        }
        
        // Altro errore, non retry
        lastError = errorData
        break // Non provare altri modelli se è un errore diverso da model_not_found
      } catch (err) {
        console.error(`[generate-countermeasures] Exception with model ${model}:`, err)
        
        // Se è un errore di tipo "client_error" da openaiHelper, non provare altri modelli
        if (err.type === 'client_error' || err.message?.includes('Unable to process')) {
          lastError = err
          lastErrorDetails = { error: { message: err.message, type: err.type } }
          break
        }
        
        if (err.message?.includes('model') || err.message?.includes('not found')) {
          lastError = err
          continue // Prova modello successivo
        }
        
        // Altro errore, propaga
        lastError = err
        break
      }
    }

    if (!response || !response.ok) {
      const errorMessage = lastErrorDetails?.error?.message || 
                          lastError?.message || 
                          lastError?.error?.message ||
                          'Unable to generate countermeasures. Please try again.'
      
      console.error('[generate-countermeasures] All models failed. Last error:', lastErrorDetails || lastError)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: errorMessage,
          errorType: 'provider_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'all_models_failed' }
        })
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // 11. Parsing risposta JSON
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: 'No content in AI response',
          errorType: 'server_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'empty_content' }
        })
      }
      return NextResponse.json(
        { error: 'No content in response' },
        { status: 500 }
      )
    }

    let countermeasures
    try {
      countermeasures = JSON.parse(content)
    } catch (parseErr) {
      console.error('[generate-countermeasures] JSON parse error:', parseErr)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: parseErr,
          errorType: 'server_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'parse_response' }
        })
      }
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      )
    }

    // 12. Validazione output
    const validation = validateCountermeasuresOutput(countermeasures)
    if (!validation.valid) {
      console.error('[generate-countermeasures] Validation error:', validation.error)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: validation.error || 'Invalid AI output',
          errorType: 'server_error',
          metadata: { endpoint: '/api/generate-countermeasures', stage: 'validate_output' }
        })
      }
      return NextResponse.json(
        { error: `Invalid countermeasures format: ${validation.error}` },
        { status: 500 }
      )
    }

    let removedPlayerSuggestions = 0
    let removedInstructions = 0
    const verifiedRoster = hasVerifiedRosterData(titolari)

    // 12.1 Filtra suggerimenti invalidi (coerenza con rosa)
    if (countermeasures.countermeasures?.player_suggestions && Array.isArray(countermeasures.countermeasures.player_suggestions)) {
      const validSuggestions = []
      const invalidSuggestions = []
      
      // Crea mappe per lookup veloce
      const titolariMap = new Map(titolari.map(p => [p.id, p]))
      const riserveMap = new Map(riserve.map(p => [p.id, p]))
      const riserveByPosition = {}
      riserve.forEach(p => {
        const pos = p.position || 'N/A'
        if (!riserveByPosition[pos]) riserveByPosition[pos] = []
        riserveByPosition[pos].push(p)
      })
      
      // Posizioni portiere
      const gkPositions = ['PT', 'GK', 'Goalkeeper', 'Portiere']
      const hasGKReserve = riserve.some(p => gkPositions.includes(p.position))
      
      countermeasures.countermeasures.player_suggestions.forEach((suggestion, idx) => {
        const playerId = suggestion.player_id
        const action = suggestion.action
        const position = suggestion.position || ''
        const isGK = gkPositions.some(gkPos => position.includes(gkPos) || position === gkPos)
        
        let isValid = true
        let reason = ''
        
        // Validazione: add_to_starting_xi
        if (action === 'add_to_starting_xi') {
          // Deve essere una riserva
          if (!riserveMap.has(playerId)) {
            isValid = false
            reason = `Giocatore ${suggestion.player_name || playerId} non è una riserva`
          }
          // Deve indicare CHI sostituire (titolare da mettere in panchina)
          else {
            const replaceId = suggestion.replace_player_id
            const replaceName = suggestion.replace_player_name
            if (!replaceId || !titolariMap.has(replaceId)) {
              isValid = false
              reason = `Suggerimento "aggiungi ${suggestion.player_name}" non indica un titolare da sostituire (replace_player_id mancante o non in formazione)`
            } else {
              const replaced = titolariMap.get(replaceId)
              const reserve = riserveMap.get(playerId)
              if (!reserve?.player_name || !replaced?.player_name) {
                isValid = false
                reason = 'Sostituzione senza nomi verificabili nella rosa'
              }
              if (!replaceName) {
                suggestion.replace_player_name = replaced.player_name || replaced.name || '?'
              }
              const slotRole = String(
                getSnapshotPlayerRole(clientFormationSnapshot, replaced, 'defense')
                || replaced.position
                || suggestion.replace_position
                || ''
              ).trim()
              if (!suggestion.replace_position) {
                suggestion.replace_position = slotRole
              }
              suggestion.slot_role = slotRole
              if (reserve?.position) {
                suggestion.reserve_card_position = String(reserve.position).trim()
              } else if (suggestion.position) {
                suggestion.reserve_card_position = String(suggestion.position).trim()
              }

              const swapCheck = validateSnapshotSwap(
                titolari,
                reserve || { position: suggestion.position },
                replaceId,
                clientFormationSnapshot
              )
              if (!swapCheck.valid) {
                isValid = false
                reason = swapCheck.errors.includes('incompatible_slot_role')
                  ? `Sostituzione invalida: ${suggestion.player_name || 'la riserva'} non ha competenza per lo slot ${swapCheck.slotRole || slotRole}`
                  : `Sostituzione invalida per limiti difesa (${swapCheck.errors.join(', ')}): max 3 DC; il quarto difensore deve essere TD/TS`
              } else if (String(swapCheck.slotRole || slotRole).trim().toUpperCase() === 'DC' && hasFlankJustification(suggestion.reason)) {
                isValid = false
                reason = `Sostituzione incoerente: un cambio nello slot DC non può essere motivato con copertura fascia/terzino`
              }
              if (isValid) {
                suggestion.player_name = String(reserve.player_name).trim()
                suggestion.replace_player_name = String(replaced.player_name).trim()
              }
            }
          }
          // Se è portiere, deve esserci riserva portiere
          if (isValid && isGK && !hasGKReserve) {
            isValid = false
            reason = `Nessuna riserva portiere disponibile per sostituire il portiere titolare`
          }
          // Se non ci sono riserve, non può aggiungere
          if (isValid && riserve.length === 0) {
            isValid = false
            reason = `Nessuna riserva disponibile in panchina`
          }
        }
        
        // Validazione: remove_from_starting_xi
        else if (action === 'remove_from_starting_xi') {
          isValid = false
          reason = `Rimozione isolata non consentita: proponi una sostituzione completa con add_to_starting_xi e replace_player_id`
        }
        
        if (isValid) {
          validSuggestions.push(suggestion)
        } else {
          invalidSuggestions.push({ suggestion, reason, index: idx })
          console.warn(`[generate-countermeasures] Suggerimento invalido filtrato [${idx}]:`, {
            player: suggestion.player_name,
            action: suggestion.action,
            position: suggestion.position,
            reason
          })
        }
      })
      
      // Sostituisci con suggerimenti validati
      countermeasures.countermeasures.player_suggestions = validSuggestions
      
      // Aggiungi warning se ci sono suggerimenti filtrati
      if (invalidSuggestions.length > 0) {
        removedPlayerSuggestions = invalidSuggestions.length
      }
    }

    const inferredSwap = inferStructuredBenchSwap(countermeasures, riserve, titolari, clientFormationSnapshot)
    if (inferredSwap) {
      countermeasures.countermeasures.player_suggestions = [inferredSwap]
      console.info('[generate-countermeasures] Recovered structured bench swap from verified customer copy', {
        incoming: inferredSwap.player_name,
        outgoing: inferredSwap.replace_player_name
      })
    }

    // 12.2 Valida istruzioni individuali suggerite rispetto alle regole prodotto
    if (countermeasures.countermeasures?.individual_instructions && Array.isArray(countermeasures.countermeasures.individual_instructions)) {
      const validInstructions = []
      const invalidInstructions = []
      const validSlots = new Set(['attacco_1', 'attacco_2', 'difesa_1', 'difesa_2'])
      const opponentPlayers = opponentFormation.players || opponentFormation.extracted_data?.players || []
      const resolveOpponentTarget = (requestedName) => {
        const requested = String(requestedName || '').trim().toLowerCase()
        const exact = opponentPlayers.find((player) => (
          requested && String(player?.player_name || '').trim().toLowerCase() === requested
        ))
        if (exact?.player_name) return String(exact.player_name).trim()
        const attackingRoles = new Set(['P', 'CF', 'SP', 'SS', 'TRQ', 'AMF', 'EDA', 'ESA', 'RWF', 'LWF'])
        const fallback = [...opponentPlayers]
          .filter((player) => attackingRoles.has(String(player?.position || '').trim().toUpperCase()))
          .sort((a, b) => (Number(b?.overall_rating) || 0) - (Number(a?.overall_rating) || 0))[0]
        return fallback?.player_name ? String(fallback.player_name).trim() : null
      }

      for (const instr of countermeasures.countermeasures.individual_instructions) {
        const slot = typeof instr?.slot === 'string' ? normalizeInstructionSlot(instr.slot) : ''
        const playerId = typeof instr?.player_id === 'string' ? instr.player_id.trim() : ''
        const instruction = typeof instr?.instruction === 'string' ? normalizeInstructionId(instr.instruction) : ''

        if (!validSlots.has(slot) || !playerId || !instruction) {
          invalidInstructions.push({ instr, reason: 'slot/player_id/instruction mancanti o invalidi' })
          continue
        }

        const check = validateIndividualInstruction(
          slot,
          playerId,
          instruction,
          titolari,
          clientFormationSnapshot
        )
        if (check.valid) {
          const currentInstruction = effectiveTacticalSettings?.individual_instructions?.[slot]
          if (
            currentInstruction?.enabled &&
            currentInstruction.player_id === playerId &&
            normalizeInstructionId(currentInstruction.instruction) === instruction
          ) {
            continue
          }
          const rosterPlayer = titolari.find((p) => p.id === playerId)
          const nameFromRoster = rosterPlayer?.player_name ? String(rosterPlayer.player_name).trim() : ''
          const instructionPhase = slot.startsWith('difesa_') ? 'defense' : 'attack'
          const posFromRoster = getSnapshotPlayerRole(
            clientFormationSnapshot,
            rosterPlayer,
            instructionPhase
          ) || (rosterPlayer?.position ? String(rosterPlayer.position).trim() : '')
          const nameFromModel = typeof instr.player_name === 'string' ? instr.player_name.trim() : ''
          const posFromModel = typeof instr.position === 'string' ? instr.position.trim() : ''
          const targetPlayerName = ['marcatura_stretta', 'marcatura_uomo'].includes(instruction)
            ? resolveOpponentTarget(instr.target_player_name)
            : null
          validInstructions.push({
            ...instr,
            slot,
            instruction,
            player_name: nameFromRoster || nameFromModel || null,
            position: posFromRoster || posFromModel || null,
            target_player_name: targetPlayerName
          })
        } else invalidInstructions.push({ instr, reason: check.error || 'istruzione non valida' })
      }

      countermeasures.countermeasures.individual_instructions = validInstructions

      if (invalidInstructions.length > 0) {
        removedInstructions = invalidInstructions.length
      }
    }

    enforcePlanCoherence(countermeasures)
    focusCountermeasuresOutput(countermeasures)

    // Safe fallback: never return an empty/meaningless plan after filtering.
    if (!asTextDiagnosis(countermeasures)) {
      const formationName = opponentFormation.formation_name || opponentFormation.formation || ''
      countermeasures.diagnosis = formationName
        ? `Avversario in ${formationName}: mantieni la tua disposizione e chiudi le zone aperte.`
        : 'Mantieni la tua disposizione e chiudi le zone aperte della foto.'
      if (!countermeasures.play_summary) countermeasures.play_summary = {}
      countermeasures.play_summary.match_key = countermeasures.diagnosis
    }
    if (!Array.isArray(countermeasures.starting_plan) || countermeasures.starting_plan.length === 0) {
      const tips = []
      const key = asTextDiagnosis(countermeasures)
      if (key) tips.push(key)
      countermeasures.starting_plan = tips.slice(0, 1)
    }

    countermeasures.warnings = sanitizeCountermeasureWarnings(countermeasures.warnings, {
      removedPlayerSuggestions,
      removedInstructions,
      verifiedRoster
    })

    // 13. Normalizza output in formato bilingue (it/en) per coerenza con analyze-match e UI
    const toBilingual = (s) => {
      if (typeof s === 'string') return { it: s, en: s }
      if (s && typeof s === 'object' && ('it' in s || 'en' in s)) return s
      return s
    }
    ;['diagnosis', 'fit_proof'].forEach((key) => {
      if (typeof countermeasures[key] === 'string') countermeasures[key] = toBilingual(countermeasures[key])
    })
    if (countermeasures.opponent_read && typeof countermeasures.opponent_read === 'object') {
      ;['formation', 'trait', 'assumption'].forEach((key) => {
        if (typeof countermeasures.opponent_read[key] === 'string') {
          countermeasures.opponent_read[key] = toBilingual(countermeasures.opponent_read[key])
        }
      })
    }
    ;['with_ball', 'without_ball'].forEach((key) => {
      const value = countermeasures[key]
      if (Array.isArray(value)) countermeasures[key] = value.map(toBilingual).slice(0, 2)
      else if (typeof value === 'string') countermeasures[key] = [toBilingual(value)]
    })
    if (countermeasures.plan_b && typeof countermeasures.plan_b === 'object') {
      ;['trigger', 'action'].forEach((key) => {
        if (typeof countermeasures.plan_b[key] === 'string') {
          countermeasures.plan_b[key] = toBilingual(countermeasures.plan_b[key])
        }
      })
    }
    if (countermeasures.analysis) {
      if (typeof countermeasures.analysis.opponent_formation_analysis === 'string') {
        countermeasures.analysis.opponent_formation_analysis = toBilingual(countermeasures.analysis.opponent_formation_analysis)
      }
      if (Array.isArray(countermeasures.analysis.strengths)) {
        countermeasures.analysis.strengths = countermeasures.analysis.strengths.map(toBilingual)
      }
      if (Array.isArray(countermeasures.analysis.weaknesses)) {
        countermeasures.analysis.weaknesses = countermeasures.analysis.weaknesses.map(toBilingual)
      }
      if (typeof countermeasures.analysis.why_weaknesses === 'string') {
        countermeasures.analysis.why_weaknesses = toBilingual(countermeasures.analysis.why_weaknesses)
      }
    }
    if (countermeasures.play_summary && typeof countermeasures.play_summary === 'object') {
      ;['match_key', 'base_plan', 'attacking', 'defending', 'avoid'].forEach((key) => {
        if (typeof countermeasures.play_summary[key] === 'string') {
          countermeasures.play_summary[key] = toBilingual(countermeasures.play_summary[key])
        }
      })
    }
    ;(countermeasures.countermeasures?.formation_adjustments || []).forEach((adj) => {
      if (typeof adj.suggestion === 'string') adj.suggestion = toBilingual(adj.suggestion)
      if (typeof adj.reason === 'string') adj.reason = toBilingual(adj.reason)
    })
    ;(countermeasures.countermeasures?.tactical_adjustments || []).forEach((adj) => {
      if (typeof adj.suggestion === 'string') adj.suggestion = toBilingual(adj.suggestion)
      if (typeof adj.application_hint === 'string') adj.application_hint = toBilingual(adj.application_hint)
      if (typeof adj.reason === 'string') adj.reason = toBilingual(adj.reason)
    })
    ;(countermeasures.countermeasures?.player_suggestions || []).forEach((p) => {
      if (typeof p.reason === 'string') p.reason = toBilingual(p.reason)
    })
    ;(countermeasures.countermeasures?.individual_instructions || []).forEach((i) => {
      // Keep instruction as technical ID for apply/validation; only bilingualize reason.
      if (typeof i.reason === 'string') i.reason = toBilingual(i.reason)
    })
    if (Array.isArray(countermeasures.starting_plan)) {
      countermeasures.starting_plan = countermeasures.starting_plan
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (item && typeof item === 'object') return String(item.it || item.en || item.es || '').trim()
          return ''
        })
        .filter(Boolean)
        .slice(0, 3)
    }

    // Keep diagnostics for logs only — never return them to the customer UI.
    if (Array.isArray(countermeasures.warnings) && countermeasures.warnings.length) {
      console.info('[generate-countermeasures] internal warnings', {
        count: countermeasures.warnings.length,
        sample: countermeasures.warnings.slice(0, 3)
      })
    }

    const presented = presentCountermeasuresForCustomer(countermeasures, {
      lang: language === 'en' || language === 'es' ? language : 'it',
      opponentFormation,
      roster,
      currentTacticalSettings: effectiveTacticalSettings,
      clientFormation
    })

    // 14. Restituisci piano cliente + dati apply
    return NextResponse.json({
      success: true,
      countermeasures: presented,
      customer_plan: presented.customer_plan,
      model_used: data.model || 'unknown'
    })
  } catch (err) {
    console.error('[generate-countermeasures] Error:', err)
    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error: err,
        errorType: err?.type || null,
        metadata: { endpoint: '/api/generate-countermeasures', stage: 'outer_catch' }
      })
    }
    
    let errorMessage = 'Error generating countermeasures'
    let statusCode = 500
    
    if (err.type === 'rate_limit') {
      errorMessage = 'Rate limit exceeded. Please try again later.'
      statusCode = 429
    } else if (err.type === 'timeout') {
      errorMessage = 'Request timeout. Please try again.'
      statusCode = 408
    } else if (err.message) {
      errorMessage = err.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
