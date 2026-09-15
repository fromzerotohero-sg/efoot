import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, private, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'Authorization'
}

// Categorie notifica gestibili dall'utente (default ON, opt-out con false)
const PREF_KEYS = ['weekly_goals', 'credits', 'leaderboard', 'coach']
const DEFAULT_PREFS = Object.fromEntries(PREF_KEYS.map((key) => [key, true]))

async function resolveUserId(admin, userData) {
  let userId = userData?.user?.id || null
  if (!userId) return null
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .maybeSingle()
    if (!existingProfile?.user_id) return null
    userId = existingProfile.user_id
  }
  return userId
}

async function authenticate(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { error: NextResponse.json({ error: 'Supabase not configured' }, { status: 500 }) }
  }

  const token = extractBearerToken(req)
  if (!token) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) {
    return { error: NextResponse.json({ error: 'Invalid authentication' }, { status: 401 }) }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const userId = await resolveUserId(admin, userData)
  if (!userId) return { error: NextResponse.json({ error: 'User profile not found' }, { status: 404 }) }

  const rateLimitConfig = RATE_LIMIT_CONFIG['/api/notifications/prefs']
  const rateLimit = await checkRateLimit(
    userId,
    '/api/notifications/prefs',
    rateLimitConfig?.maxRequests,
    rateLimitConfig?.windowMs
  )
  if (!rateLimit.allowed) {
    return { error: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) }
  }

  return { admin, userId }
}

async function readPrefs(admin, userId) {
  const { data: profile, error } = await admin
    .from('user_profiles')
    .select('notification_prefs')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[notifications/prefs] read error:', error.message)
  }
  const stored = profile?.notification_prefs
  return stored && typeof stored === 'object' ? stored : {}
}

/**
 * GET /api/notifications/prefs
 * Preferenze notifiche utente, mergiate sui default (tutte ON).
 */
export async function GET(req) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { admin, userId } = auth
    const stored = await readPrefs(admin, userId)
    const prefs = { ...DEFAULT_PREFS }
    for (const key of PREF_KEYS) {
      if (typeof stored[key] === 'boolean') prefs[key] = stored[key]
    }

    return NextResponse.json({ prefs }, { headers: NO_CACHE_HEADERS })
  } catch (err) {
    console.error('[notifications/prefs] GET error:', err)
    return NextResponse.json({ error: 'Error loading notification prefs' }, { status: 500 })
  }
}

/**
 * POST /api/notifications/prefs
 * Body: oggetto parziale { weekly_goals?: boolean, credits?: boolean, leaderboard?: boolean, coach?: boolean }
 * Merge read-modify-write sul JSONB esistente.
 */
export async function POST(req) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { admin, userId } = auth
    const body = await req.json().catch(() => ({}))

    const patch = {}
    for (const key of PREF_KEYS) {
      if (typeof body?.[key] === 'boolean') patch[key] = body[key]
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid preference keys' }, { status: 400 })
    }

    const stored = await readPrefs(admin, userId)
    const merged = { ...stored, ...patch }

    const { error } = await admin
      .from('user_profiles')
      .update({ notification_prefs: merged })
      .eq('user_id', userId)
    if (error) {
      console.error('[notifications/prefs] update error:', error.message)
      return NextResponse.json({ error: 'Error saving notification prefs' }, { status: 500 })
    }

    const prefs = { ...DEFAULT_PREFS }
    for (const key of PREF_KEYS) {
      if (typeof merged[key] === 'boolean') prefs[key] = merged[key]
    }

    return NextResponse.json({ ok: true, prefs })
  } catch (err) {
    console.error('[notifications/prefs] POST exception:', err)
    return NextResponse.json({ error: 'Error saving notification prefs' }, { status: 500 })
  }
}
