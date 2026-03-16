import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TEXT = 255
const MAX_NOTES = 500

const WHITELIST = {
  connection_quality: ['good', 'unstable', 'lag'],
  slow_opponent_connection_issues: ['yes', 'no', 'sometimes'],
  input_delay: ['yes', 'no', 'sometimes'],
  pass_level: ['pa1', 'pa2', 'pa3'],
  smart_assist: ['yes', 'no'],
  platform: ['console', 'pc', 'mobile', 'other'],
  ai_weak_point: ['defence', 'attack', 'set_pieces', 'transitions', 'final_minutes']
}

const ERRORS = {
  auth_required: { it: 'Autenticazione richiesta.', en: 'Authentication required.' },
  auth_invalid: { it: 'Token non valido o scaduto.', en: 'Invalid or expired token.' },
  config_missing: { it: 'Configurazione mancante.', en: 'Server configuration missing.' },
  too_long: { it: 'Testo troppo lungo.', en: 'Text too long.' },
  invalid_value: { it: 'Valore non consentito.', en: 'Invalid value.' },
  server_error: { it: 'Errore durante il salvataggio.', en: 'Error saving. Please try again.' }
}

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}
function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}
function langFromRequest(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

const AI_INFO_SELECT = 'id, first_name, ai_name, current_division, hours_per_week, connection_quality, slow_opponent_connection_issues, input_delay, pass_level, smart_assist, platform, favourite_player_name, ai_weak_point, ai_learn_goals, ai_notes'

/**
 * GET /api/supabase/save-ai-info
 * Restituisce i campi "Informazioni IA" del profilo per prefill form.
 */
export async function GET(req) {
  const lang = langFromRequest(req)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json(
        { error: ERRORS.config_missing[lang] },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json(
        { error: ERRORS.auth_required[lang] },
        { status: 401, headers: { 'Content-Language': lang } }
      )
    }
    const metalgateSession = req.headers.get('x-metalgate-session') === '1'
    const claimedMetalgateUserId = req.headers.get('x-metalgate-user-id')
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, { forbidSupabaseFallback: metalgateSession })
    if (authError || !userData?.user?.id) {
      return NextResponse.json(
        { error: ERRORS.auth_invalid[lang] },
        { status: 401, headers: { 'Content-Language': lang } }
      )
    }
    if (metalgateSession && claimedMetalgateUserId && claimedMetalgateUserId !== userData.user.id) {
      return NextResponse.json(
        { error: ERRORS.auth_invalid[lang] },
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

    const { data: profile, error } = await admin
      .from('user_profiles')
      .select(AI_INFO_SELECT)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('[save-ai-info] GET Error:', error.message)
      return NextResponse.json(
        { error: ERRORS.server_error[lang] },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }
    return NextResponse.json(
      { profile: profile || {} },
      { headers: { 'Content-Language': lang } }
    )
  } catch (e) {
    console.error('[save-ai-info] GET Unexpected error:', e)
    return NextResponse.json(
      { error: ERRORS.server_error[lang] },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}

/**
 * POST /api/supabase/save-ai-info
 * Salva le "Informazioni IA" (form omonimo). Tutti i campi opzionali.
 * Non modifica ai_knowledge_score / barra Conoscenza AI.
 */
export async function POST(req) {
  const lang = langFromRequest(req)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json(
        { error: ERRORS.config_missing[lang] },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json(
        { error: ERRORS.auth_required[lang] },
        { status: 401, headers: { 'Content-Language': lang } }
      )
    }
    const metalgateSession = req.headers.get('x-metalgate-session') === '1'
    const claimedMetalgateUserId = req.headers.get('x-metalgate-user-id')
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, { forbidSupabaseFallback: metalgateSession })
    if (authError || !userData?.user?.id) {
      return NextResponse.json(
        { error: ERRORS.auth_invalid[lang] },
        { status: 401, headers: { 'Content-Language': lang } }
      )
    }
    if (metalgateSession && claimedMetalgateUserId && claimedMetalgateUserId !== userData.user.id) {
      return NextResponse.json(
        { error: ERRORS.auth_invalid[lang] },
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

    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/save-ai-info'] || { maxRequests: 30, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/save-ai-info', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt },
        { status: 429, headers: { 'Content-Language': lang } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const update = { user_id: userId }

    // Campi anche in profilo (opzionali)
    if (body.first_name !== undefined) {
      const v = toText(body.first_name)
      if (v && v.length > MAX_TEXT) {
        return NextResponse.json(
          { error: ERRORS.too_long[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update.first_name = v
    }
    if (body.ai_name !== undefined) {
      const v = toText(body.ai_name)
      if (v && v.length > MAX_TEXT) {
        return NextResponse.json(
          { error: ERRORS.too_long[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update.ai_name = v
    }
    if (body.current_division !== undefined) {
      const v = toText(body.current_division)
      if (v && v.length > MAX_TEXT) {
        return NextResponse.json(
          { error: ERRORS.too_long[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update.current_division = v
    }
    if (body.hours_per_week !== undefined) {
      const v = toInt(body.hours_per_week)
      if (v !== null && (v < 0 || v > 168)) {
        return NextResponse.json(
          { error: ERRORS.invalid_value[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update.hours_per_week = v
    }

    // Select whitelist (ai_weak_point può essere anche testo libero, gestito sotto)
    for (const [key, allowed] of Object.entries(WHITELIST)) {
      if (key === 'ai_weak_point') continue
      if (body[key] === null || body[key] === '') {
        update[key] = null
        continue
      }
      if (body[key] === undefined) continue
      const v = typeof body[key] === 'string' ? body[key].trim().toLowerCase() : String(body[key]).toLowerCase()
      if (!v) {
        update[key] = null
        continue
      }
      if (!allowed.includes(v)) {
        return NextResponse.json(
          { error: ERRORS.invalid_value[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update[key] = v
    }

    // ai_weak_point: whitelist o testo libero; sincronizza common_problems così l'IA e i task vedono solo ciò che è selezionato
    const WEAK_POINT_TO_LABEL = { defence: 'Difesa', attack: 'Attacco', set_pieces: 'Piazzati', transitions: 'Transizioni', final_minutes: 'Finale partita' }
    if (body.ai_weak_point !== undefined) {
      const raw = (body.ai_weak_point || '').trim().toLowerCase()
      if (WHITELIST.ai_weak_point.includes(raw)) {
        update.ai_weak_point = raw
        update.common_problems = [WEAK_POINT_TO_LABEL[raw] || raw]
      } else {
        const v = toText(body.ai_weak_point)
        if (v && v.length > MAX_TEXT) {
          return NextResponse.json(
            { error: ERRORS.too_long[lang] },
            { status: 400, headers: { 'Content-Language': lang } }
          )
        }
        update.ai_weak_point = v
        update.common_problems = v ? [v] : []
      }
    }

    // Testi liberi (lunghezza)
    if (body.favourite_player_name !== undefined) {
      const v = toText(body.favourite_player_name)
      if (v && v.length > MAX_TEXT) {
        return NextResponse.json(
          { error: ERRORS.too_long[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update.favourite_player_name = v
    }
    if (body.ai_learn_goals !== undefined) {
      const v = toText(body.ai_learn_goals)
      if (v && v.length > MAX_TEXT) {
        return NextResponse.json(
          { error: ERRORS.too_long[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update.ai_learn_goals = v
    }
    if (body.ai_notes !== undefined) {
      const v = toText(body.ai_notes)
      if (v && v.length > MAX_NOTES) {
        return NextResponse.json(
          { error: ERRORS.too_long[lang] },
          { status: 400, headers: { 'Content-Language': lang } }
        )
      }
      update.ai_notes = v
    }

    const { data: profile, error } = await admin
      .from('user_profiles')
      .upsert(update, { onConflict: 'user_id' })
      .select(AI_INFO_SELECT)
      .single()

    if (error) {
      console.error('[save-ai-info] Error:', error.message)
      return NextResponse.json(
        { error: ERRORS.server_error[lang] },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[save-ai-info] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[save-ai-info] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    // Ricomputa classifica mensile (profile_completion_score incide sui punti)
    import('@/lib/leaderboardHelper').then(({ computeLeaderboardForMonth, saveLeaderboardSnapshot }) => {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      computeLeaderboardForMonth(month, admin)
        .then((computed) => {
          if (computed?.length) return saveLeaderboardSnapshot(month, computed, admin)
        })
        .catch(err => console.error('[save-ai-info] Leaderboard recompute (non-blocking):', err?.message || err))
    }).catch(() => {})

    return NextResponse.json(
      { success: true, profile },
      { headers: { 'Content-Language': lang } }
    )
  } catch (e) {
    console.error('[save-ai-info] Unexpected error:', e)
    return NextResponse.json(
      { error: ERRORS.server_error[lang] },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
