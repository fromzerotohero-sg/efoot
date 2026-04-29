import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { updateAIKnowledgeScore } from '@/lib/aiKnowledgeHelper'
import { DEFAULT_META_STARTER_PACK } from '@/lib/starter-pack/defaultMetaPack'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_STARTER_VISIBLE_PLAYERS = 5

function getLang(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

const MESSAGES = {
  it: {
    auth: 'Autenticazione richiesta.',
    invalid: 'Token non valido o scaduto.',
    config: 'Configurazione mancante.',
    tooManyPlayers: 'Starter pack disponibile solo fino a 5 giocatori in rosa.',
    importFailed: 'Errore durante l\'import della formazione di test.',
    success: 'Formazione di test importata con successo.'
  },
  en: {
    auth: 'Authentication required.',
    invalid: 'Invalid or expired token.',
    config: 'Server configuration missing.',
    tooManyPlayers: 'Starter pack is available only up to 5 roster players.',
    importFailed: 'Error importing the test formation.',
    success: 'Test formation imported successfully.'
  }
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createSlotPositionsForStarter(existingLayout) {
  if (existingLayout?.slot_positions && typeof existingLayout.slot_positions === 'object' && Object.keys(existingLayout.slot_positions).length > 0) {
    return clone(existingLayout.slot_positions)
  }
  return clone(DEFAULT_META_STARTER_PACK.formation.slot_positions)
}

function buildPlayingStyleLookup(rows = []) {
  const out = {}
  rows.forEach((row) => {
    if (!row?.name) return
    out[normalizeName(row.name)] = row.id
  })
  return out
}

function buildPlayerRow(templatePlayer, userId, stylesLookup, slotIndex = null, positionOverride = null) {
  const styleId = templatePlayer.playing_style_name
    ? stylesLookup[normalizeName(templatePlayer.playing_style_name)] || null
    : null

  const player = clone(templatePlayer)
  return {
    user_id: userId,
    player_name: player.player_name,
    position: positionOverride || player.position,
    team: player.team,
    nationality: player.nationality,
    club_name: player.club_name,
    overall_rating: player.overall_rating,
    age: player.age,
    form: player.form,
    role: player.role || player.playing_style_name || null,
    playing_style_id: styleId,
    base_stats: player.base_stats || {},
    skills: Array.isArray(player.skills) ? player.skills : [],
    com_skills: Array.isArray(player.com_skills) ? player.com_skills : [],
    available_boosters: Array.isArray(player.available_boosters) ? player.available_boosters : [],
    photo_slots: player.photo_slots || {},
    original_positions: Array.isArray(player.original_positions) ? player.original_positions : [],
    extracted_data: player.extracted_data || { source: 'starter-pack' },
    slot_index: slotIndex
  }
}

function getCandidateMap() {
  const map = new Map()
  for (const candidate of DEFAULT_META_STARTER_PACK.candidates) {
    map.set(candidate.player_name, candidate)
  }
  return map
}

function getPositionAliases(position) {
  const pos = String(position || '').toUpperCase().trim()
  const groups = {
    PT: ['PT'],
    GK: ['PT'],
    TS: ['TS', 'TD', 'DC'],
    TD: ['TD', 'TS', 'DC'],
    DC: ['DC', 'TS', 'TD', 'MED'],
    MED: ['MED', 'CC', 'DC'],
    CC: ['CC', 'MED', 'TRQ'],
    TRQ: ['TRQ', 'CC', 'ESA', 'EDA'],
    ESA: ['ESA', 'CLS', 'TRQ', 'P'],
    EDA: ['EDA', 'CLD', 'TRQ', 'P'],
    CLS: ['CLS', 'ESA', 'TRQ', 'P'],
    CLD: ['CLD', 'EDA', 'TRQ', 'P'],
    P: ['P', 'CF', 'TRQ', 'ESA', 'EDA'],
    CF: ['CF', 'P', 'TRQ']
  }
  return groups[pos] || [pos]
}

function pickCandidateForPosition(position, candidateMap, usedNames) {
  const aliases = getPositionAliases(position)
  for (const alias of aliases) {
    const found = DEFAULT_META_STARTER_PACK.candidates.find((candidate) => {
      if (usedNames.has(normalizeName(candidate.player_name))) return false
      const preferred = Array.isArray(candidate.preferred_positions) ? candidate.preferred_positions : [candidate.position]
      return preferred.map((v) => String(v).toUpperCase()).includes(alias)
    })
    if (found) return found
  }
  return DEFAULT_META_STARTER_PACK.candidates.find((candidate) => !usedNames.has(normalizeName(candidate.player_name))) || null
}

async function resolveUser(req, admin) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const token = extractBearerToken(req)
  const lang = getLang(req)
  const L = MESSAGES[lang]

  if (!token) return { error: L.auth, status: 401 }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) {
    return { error: L.invalid, status: 401 }
  }

  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .single()

    if (!existingProfile?.user_id) {
      return { error: 'User profile not found', status: 404 }
    }
    userId = existingProfile.user_id
  }

  return { userId, token }
}

export async function POST(req) {
  const lang = getLang(req)
  const L = MESSAGES[lang]

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: L.config }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const resolved = await resolveUser(req, admin)
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }

    const { userId } = resolved

    const rlConfig = RATE_LIMIT_CONFIG['/api/starter-pack/import'] || { maxRequests: 5, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/starter-pack/import', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt }, { status: 429 })
    }

    const [
      { data: players },
      { data: existingLayout },
      { data: existingCoach },
      { data: existingTactics },
      { data: existingStats },
      { data: playingStyles }
    ] = await Promise.all([
      admin.from('players').select('id, player_name, slot_index, position').eq('user_id', userId),
      admin.from('formation_layout').select('id, formation, slot_positions').eq('user_id', userId).maybeSingle(),
      admin.from('coaches').select('id, coach_name, is_active').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      admin.from('team_tactical_settings').select('id, team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
      admin.from('user_game_analysis').select('user_id, stats').eq('user_id', userId).maybeSingle(),
      admin.from('playing_styles').select('id, name')
    ])

    const existingPlayers = players || []
    const totalPlayers = existingPlayers.length
    if (totalPlayers > MAX_STARTER_VISIBLE_PLAYERS) {
      return NextResponse.json({ error: L.tooManyPlayers }, { status: 409 })
    }

    const mode = totalPlayers === 0 ? 'starter_full' : 'starter_fill_missing'
    const stylesLookup = buildPlayingStyleLookup(playingStyles || [])
    const candidateMap = getCandidateMap()
    const usedNames = new Set(existingPlayers.map((player) => normalizeName(player.player_name)))

    let insertedPlayers = []
    const slotPositions = createSlotPositionsForStarter(existingLayout)

    if (!existingLayout) {
      const layoutPayload = {
        user_id: userId,
        formation: DEFAULT_META_STARTER_PACK.formation.formation,
        slot_positions: slotPositions,
        updated_at: new Date().toISOString()
      }

      const { error: layoutError } = await admin
        .from('formation_layout')
        .upsert(layoutPayload, { onConflict: 'user_id' })

      if (layoutError) {
        throw new Error(`Starter pack layout failed: ${layoutError.message}`)
      }
    }

    if (mode === 'starter_full') {
      const starterRows = []
      for (let slot = 0; slot <= 10; slot++) {
        const slotPosition = slotPositions?.[slot]?.position || DEFAULT_META_STARTER_PACK.formation.slot_positions[slot]?.position
        const candidateName = DEFAULT_META_STARTER_PACK.starterLineup[slot]
        const preferredCandidate = candidateName ? candidateMap.get(candidateName) : null
        const candidate = preferredCandidate && getPositionAliases(slotPosition).some((alias) => {
          const preferred = Array.isArray(preferredCandidate.preferred_positions) ? preferredCandidate.preferred_positions : [preferredCandidate.position]
          return preferred.map((v) => String(v).toUpperCase()).includes(alias)
        })
          ? preferredCandidate
          : pickCandidateForPosition(slotPosition, candidateMap, usedNames)
        if (!candidate) continue
        usedNames.add(normalizeName(candidate.player_name))
        starterRows.push(buildPlayerRow(candidate, userId, stylesLookup, Number(slot), slotPosition || candidate.position))
      }

      const reserveRows = DEFAULT_META_STARTER_PACK.reserveOrder
        .map((name) => candidateMap.get(name))
        .filter(Boolean)
        .filter((candidate) => {
          const normalized = normalizeName(candidate.player_name)
          if (usedNames.has(normalized)) return false
          usedNames.add(normalized)
          return true
        })
        .map((candidate) => buildPlayerRow(candidate, userId, stylesLookup, null, candidate.position))

      const { data: insertedStarterPlayers, error: playerInsertError } = await admin
        .from('players')
        .insert([...starterRows, ...reserveRows])
        .select('id, player_name')

      if (playerInsertError) {
        throw new Error(`Starter pack players failed: ${playerInsertError.message}`)
      }
      insertedPlayers = insertedStarterPlayers || []
    } else {
      const occupiedSlots = new Set(
        existingPlayers
          .map((player) => Number(player.slot_index))
          .filter((slot) => Number.isFinite(slot) && slot >= 0 && slot <= 10)
      )

      const rowsToInsert = []
      for (let slot = 0; slot <= 10; slot++) {
        if (occupiedSlots.has(slot)) continue
        const slotPosition = slotPositions?.[slot]?.position || DEFAULT_META_STARTER_PACK.formation.slot_positions[slot]?.position
        const candidate = pickCandidateForPosition(slotPosition, candidateMap, usedNames)
        if (!candidate) continue
        usedNames.add(normalizeName(candidate.player_name))
        rowsToInsert.push(buildPlayerRow(candidate, userId, stylesLookup, slot, slotPosition || candidate.position))
      }

      const existingReserveCount = existingPlayers.filter((player) => player.slot_index == null).length
      if (existingReserveCount < DEFAULT_META_STARTER_PACK.reserveOrder.length) {
        for (const name of DEFAULT_META_STARTER_PACK.reserveOrder) {
          const candidate = candidateMap.get(name)
          if (!candidate) continue
          const normalized = normalizeName(candidate.player_name)
          if (usedNames.has(normalized)) continue
          usedNames.add(normalized)
          rowsToInsert.push(buildPlayerRow(candidate, userId, stylesLookup, null, candidate.position))
        }
      }

      if (rowsToInsert.length > 0) {
        const { data: insertedMissingPlayers, error: playerInsertError } = await admin
          .from('players')
          .insert(rowsToInsert)
          .select('id, player_name')

        if (playerInsertError) {
          throw new Error(`Starter pack fill failed: ${playerInsertError.message}`)
        }
        insertedPlayers = insertedMissingPlayers || []
      }
    }

    if (!existingCoach) {
      const { data: coachInsert, error: coachError } = await admin
        .from('coaches')
        .insert({
          user_id: userId,
          coach_name: DEFAULT_META_STARTER_PACK.coach.coach_name,
          age: DEFAULT_META_STARTER_PACK.coach.age,
          nationality: DEFAULT_META_STARTER_PACK.coach.nationality,
          team: DEFAULT_META_STARTER_PACK.coach.team,
          category: DEFAULT_META_STARTER_PACK.coach.category,
          pack_type: DEFAULT_META_STARTER_PACK.coach.pack_type,
          playing_style_competence: DEFAULT_META_STARTER_PACK.coach.playing_style_competence,
          stat_boosters: DEFAULT_META_STARTER_PACK.coach.stat_boosters,
          connection: DEFAULT_META_STARTER_PACK.coach.connection,
          photo_slots: DEFAULT_META_STARTER_PACK.coach.photo_slots,
          extracted_data: DEFAULT_META_STARTER_PACK.coach.extracted_data,
          is_active: true
        })
        .select('id')
        .single()

      if (coachError) {
        throw new Error(`Starter coach failed: ${coachError.message}`)
      }
      if (coachInsert?.id) {
        await admin.from('coaches').update({ is_active: false }).eq('user_id', userId).neq('id', coachInsert.id)
      }
    }

    const hasMeaningfulTactics = !!(
      existingTactics &&
      (
        (typeof existingTactics.team_playing_style === 'string' && existingTactics.team_playing_style.trim()) ||
        (existingTactics.individual_instructions && typeof existingTactics.individual_instructions === 'object' && Object.keys(existingTactics.individual_instructions).length > 0)
      )
    )

    if (!hasMeaningfulTactics) {
      const { error: tacticsError } = await admin
        .from('team_tactical_settings')
        .upsert({
          user_id: userId,
          team_playing_style: DEFAULT_META_STARTER_PACK.tactics.team_playing_style,
          individual_instructions: DEFAULT_META_STARTER_PACK.tactics.individual_instructions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      if (tacticsError) {
        throw new Error(`Starter tactics failed: ${tacticsError.message}`)
      }
    }

    const hasMeaningfulStats = !!(
      existingStats &&
      existingStats.stats &&
      typeof existingStats.stats === 'object' &&
      Object.keys(existingStats.stats).length > 0
    )

    if (!hasMeaningfulStats) {
      const { error: statsError } = await admin
        .from('user_game_analysis')
        .upsert({
          user_id: userId,
          stats: DEFAULT_META_STARTER_PACK.gameAnalysis,
          captured_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      if (statsError) {
        throw new Error(`Starter stats failed: ${statsError.message}`)
      }
    }

    await updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch((err) => {
      console.error('[starter-pack/import] AI knowledge update failed:', err)
    })

    return NextResponse.json({
      success: true,
      mode,
      insertedPlayers: insertedPlayers.length,
      message: L.success
    })
  } catch (error) {
    console.error('[starter-pack/import] Error:', error)
    return NextResponse.json({ error: error?.message || L.importFailed }, { status: 500 })
  }
}
