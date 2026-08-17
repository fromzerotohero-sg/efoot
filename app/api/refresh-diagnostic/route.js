import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { buildDiagnostic } from '@/lib/diagnosticBuilder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getPreferredLanguage(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  if (accept.toLowerCase().startsWith('it') || accept.includes('it')) return 'it'
  return 'en'
}

const RATE_LIMIT_MESSAGES = {
  it: "Troppi aggiornamenti analisi in poco tempo. Riprova tra X secondi.",
  en: 'Too many analysis refreshes. Try again in X seconds.'
}

/** Solo POST ammesso; GET/altri metodi → 405 (allineamento con altri endpoint protetti). */
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST(req) {
  const lang = getPreferredLanguage(req)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: lang === 'en' ? 'Configuration missing.' : 'Configurazione mancante.' },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }

  const token = extractBearerToken(req)
  if (!token) {
    return NextResponse.json(
      { error: lang === 'en' ? 'Authentication required.' : 'Autenticazione richiesta.' },
      { status: 401, headers: { 'Content-Language': lang } }
    )
  }

  const metalgateSession = req.headers.get('x-metalgate-session') === '1'
  const claimedMetalgateUserId = req.headers.get('x-metalgate-user-id')
  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, { forbidSupabaseFallback: metalgateSession })
  if (authError || !userData?.user?.id) {
    return NextResponse.json(
      { error: lang === 'en' ? 'Invalid or expired authentication.' : 'Autenticazione non valida o scaduta.' },
      { status: 401, headers: { 'Content-Language': lang } }
    )
  }
  if (metalgateSession && claimedMetalgateUserId && claimedMetalgateUserId !== userData.user.id) {
    return NextResponse.json(
      { error: lang === 'en' ? 'Invalid or expired authentication.' : 'Autenticazione non valida o scaduta.' },
      { status: 401, headers: { 'Content-Language': lang } }
    )
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

  const rlConfig = RATE_LIMIT_CONFIG['/api/refresh-diagnostic'] || { maxRequests: 8, windowMs: 60000 }
  const rateLimit = await checkRateLimit(userId, '/api/refresh-diagnostic', rlConfig.maxRequests, rlConfig.windowMs)
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - new Date()) / 1000))
    const message = (RATE_LIMIT_MESSAGES[lang] || RATE_LIMIT_MESSAGES.en).replace('X', String(retryAfterSeconds))
    return NextResponse.json(
      {
        error: 'RATE_LIMIT',
        message,
        retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          'Content-Language': lang,
          'Retry-After': String(retryAfterSeconds)
        }
      }
    )
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [profileRes, formationRes, variantsRes, playersRes, stylesRes, matchesRes, tacticalRes, coachRes, patternsRes, gameAnalysisRes, feedbackRes] = await Promise.all([
      admin.from('user_profiles').select('first_name, last_name, team_name, common_problems, ai_name, current_division, hours_per_week, connection_quality, slow_opponent_connection_issues, input_delay, pass_level, smart_assist, platform, favourite_player_name, ai_weak_point, ai_learn_goals, ai_notes').eq('user_id', userId).maybeSingle(),
      admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
      admin.from('formation_variants').select('id, phase, formation, slot_positions, is_active').eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true),
      admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, card_type, skills, com_skills, form, base_stats, original_positions, metadata, development_points').eq('user_id', userId).order('slot_index', { ascending: true, nullsFirst: false }).limit(50),
      admin.from('playing_styles').select('id, name'),
      admin.from('matches').select('opponent_name, result, formation_played, playing_style_played, match_date, opponent_formation_id, player_ratings, attack_areas, team_stats').eq('user_id', userId).order('match_date', { ascending: false }).limit(20),
      admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
      admin.from('coaches').select('coach_name, playing_style_competence, connection, stat_boosters').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      admin.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg').eq('user_id', userId).maybeSingle(),
      admin.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle(),
      admin.from('user_tactical_feedback').select('insights, formation_played, opponent_name, outcome, session_type, created_at').eq('user_id', userId).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(5)
    ])

    const profile = profileRes.data || {}
    const formation = formationRes.data?.formation || (lang === 'en' ? 'not set' : 'non impostata')
    const roster = playersRes.data || []
    const stylesData = stylesRes.data || []
    const stylesLookup = {}
    stylesData.forEach(s => { stylesLookup[s.id] = s.name || '' })
    const matches = matchesRes.data || []
    const tacticalRow = tacticalRes.data
    const teamStyle = tacticalRow?.team_playing_style?.trim() || (lang === 'en' ? 'not set' : 'non impostato')
    const indInstr = tacticalRow?.individual_instructions
    const numInstructions = Array.isArray(indInstr) ? indInstr.length : (indInstr && typeof indInstr === 'object' ? Object.keys(indInstr).length : 0)
    const coachRow = coachRes.data || null
    const patternsRow = patternsRes.data || {}

    let oppFormationsMap = {}
    const oppIds = [...new Set(matches.map(m => m.opponent_formation_id).filter(Boolean))]
    if (oppIds.length > 0) {
      const { data: oppData } = await admin.from('opponent_formations').select('id, formation_name, playing_style').in('id', oppIds)
      if (oppData) oppData.forEach(o => { oppFormationsMap[o.id] = o })
    }

    const diagnosticData = {
      profile,
      formation,
      formationLayout: formationRes.data || { formation, slot_positions: null },
      variantRows: variantsRes.data || [],
      roster,
      stylesLookup,
      matches,
      oppFormationsMap,
      teamStyle,
      numInstructions,
      individualInstructions: indInstr && typeof indInstr === 'object' ? indInstr : {},
      coachRow,
      patternsRow,
      gameAnalysisRow: gameAnalysisRes.data || null,
      feedbackRows: feedbackRes.data || []
    }

    const content = buildDiagnostic(lang, diagnosticData)
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Could not build diagnostic.' : 'Impossibile generare il riassunto.' },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    const { error: upsertError } = await admin
      .from('user_diagnostic_cache')
      .upsert(
        { user_id: userId, content: content.trim(), generated_at: new Date().toISOString(), lang },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('[refresh-diagnostic] Upsert error:', upsertError.message)
      return NextResponse.json(
        { error: lang === 'en' ? 'Error saving diagnostic.' : 'Errore nel salvataggio del riassunto.' },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    return NextResponse.json(
      { success: true, generated_at: new Date().toISOString() },
      { status: 200, headers: { 'Content-Language': lang } }
    )
  } catch (err) {
    console.error('[refresh-diagnostic] Error:', err?.message || err)
    return NextResponse.json(
      { error: lang === 'en' ? 'Server error.' : 'Errore server.' },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
