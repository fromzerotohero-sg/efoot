import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { notifyUser } from '@/lib/notifyUser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, private, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'Authorization'
}

// Tipi notifica creabili dal client (eventi rilevati lato client, es. ruota disponibile)
const CLIENT_POST_TYPES = ['daily_spin']

function getRomeDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

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

  const rateLimitConfig = RATE_LIMIT_CONFIG['/api/notifications']
  const rateLimit = await checkRateLimit(
    userId,
    '/api/notifications',
    rateLimitConfig?.maxRequests,
    rateLimitConfig?.windowMs
  )
  if (!rateLimit.allowed) {
    return { error: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) }
  }

  return { admin, userId }
}

/**
 * GET /api/notifications
 * Ultime 30 notifiche dell'utente (più recenti prima) + conteggio non lette.
 */
export async function GET(req) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { admin, userId } = auth

    const { data: notifications, error } = await admin
      .from('notifications')
      .select('id, type, title, body, href, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) {
      console.error('[notifications] GET query error:', error.message)
      return NextResponse.json({ error: 'Error loading notifications' }, { status: 500 })
    }

    const { count: unreadCount, error: countError } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)
    if (countError) {
      console.error('[notifications] GET count error:', countError.message)
    }

    return NextResponse.json(
      { notifications: notifications || [], unreadCount: countError ? 0 : unreadCount ?? 0 },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (err) {
    console.error('[notifications] GET error:', err)
    return NextResponse.json({ error: 'Error loading notifications' }, { status: 500 })
  }
}

/**
 * PATCH /api/notifications
 * Body: { ids: string[] } oppure { all: true } → segna come lette (solo righe proprie).
 */
export async function PATCH(req) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { admin, userId } = auth
    const body = await req.json().catch(() => ({}))
    const markAll = body?.all === true
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === 'string' && id) : []

    if (!markAll && ids.length === 0) {
      return NextResponse.json({ error: 'ids or all required' }, { status: 400 })
    }

    let query = admin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
    if (!markAll) {
      query = query.in('id', ids)
    }

    const { error } = await query
    if (error) {
      console.error('[notifications] PATCH error:', error.message)
      return NextResponse.json({ error: 'Error marking notifications as read' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notifications] PATCH exception:', err)
    return NextResponse.json({ error: 'Error marking notifications as read' }, { status: 500 })
  }
}

/**
 * POST /api/notifications
 * Notifiche per eventi rilevati dal client (es. ruota giornaliera disponibile).
 * Body: { type, title, body, href } — type in whitelist CLIENT_POST_TYPES.
 * Dedup: max 1 notifica per user+type per giorno (calendario Europe/Rome).
 */
export async function POST(req) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { admin, userId } = auth
    const body = await req.json().catch(() => ({}))
    const type = typeof body?.type === 'string' ? body.type : null
    const title = typeof body?.title === 'string' ? body.title.trim() : null

    if (!type || !CLIENT_POST_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }
    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    // Dedup stesso giorno (Europe/Rome): confronto la data Rome dell'ultima notifica user+type
    const todayRome = getRomeDateString()
    const { data: lastSameType } = await admin
      .from('notifications')
      .select('created_at')
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSameType?.created_at && getRomeDateString(new Date(lastSameType.created_at)) === todayRome) {
      return NextResponse.json({ ok: true, deduplicated: true })
    }

    // notifyUser rispetta le preferenze opt-out e non lancia mai
    await notifyUser(userId, {
      type,
      title,
      body: typeof body?.body === 'string' ? body.body : null,
      href: typeof body?.href === 'string' ? body.href : null
    })

    return NextResponse.json({ ok: true, deduplicated: false })
  } catch (err) {
    console.error('[notifications] POST exception:', err)
    return NextResponse.json({ error: 'Error creating notification' }, { status: 500 })
  }
}
