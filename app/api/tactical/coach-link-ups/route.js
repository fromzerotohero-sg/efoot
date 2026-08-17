import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { normalizeLinkUpPlays, validateLinkUpPlays } from '@/lib/efootballV6TacticalModel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function resolveUser(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { response: NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }
  }
  const token = extractBearerToken(req)
  if (!token) return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  const { userData, error } = await validateToken(token, supabaseUrl, anonKey)
  if (error || !userData?.user?.id) {
    return { response: NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 }) }
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: profile } = await admin.from('user_profiles').select('user_id').eq('metalgate_user_id', userId).maybeSingle()
    if (!profile?.user_id) return { response: NextResponse.json({ error: 'User profile not found' }, { status: 404 }) }
    userId = profile.user_id
  }
  return { admin, userId, token }
}

async function getActiveCoach(admin, userId) {
  const { data, error } = await admin
    .from('coaches')
    .select('id, coach_name, connection, extracted_data, is_active, updated_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data || null
}

export async function GET(req) {
  try {
    const ctx = await resolveUser(req)
    if (ctx.response) return ctx.response
    const coach = await getActiveCoach(ctx.admin, ctx.userId)
    return NextResponse.json({
      success: true,
      active_coach: coach ? { id: coach.id, coach_name: coach.coach_name } : null,
      link_up_plays: coach ? normalizeLinkUpPlays(coach) : []
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[coach-link-ups] GET:', error)
    return NextResponse.json({ error: 'Unable to load coach Link-up Plays' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const ctx = await resolveUser(req)
    if (ctx.response) return ctx.response
    const rate = await checkRateLimit(ctx.userId, '/api/tactical/coach-link-ups', 15, 60_000)
    if (!rate.allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const validation = validateLinkUpPlays(body.link_up_plays)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const coach = await getActiveCoach(ctx.admin, ctx.userId)
    if (!coach) return NextResponse.json({ error: 'No active coach found' }, { status: 404 })

    const currentExtracted = coach.extracted_data && typeof coach.extracted_data === 'object'
      ? coach.extracted_data
      : {}
    const nextExtracted = {
      ...currentExtracted,
      link_up_plays: validation.items,
      v6_link_up_source: body.source || 'user_confirmed',
      v6_link_up_updated_at: new Date().toISOString()
    }

    // Keep legacy `connection` alive for all old consumers by mirroring the first item.
    // Existing rows are never deleted; if the new list is empty we preserve the old connection.
    const update = {
      extracted_data: nextExtracted,
      updated_at: new Date().toISOString()
    }
    if (validation.items[0]) update.connection = validation.items[0]

    const { error: updateError } = await ctx.admin
      .from('coaches')
      .update(update)
      .eq('id', coach.id)
      .eq('user_id', ctx.userId)
    if (updateError) throw updateError

    const refreshed = await getActiveCoach(ctx.admin, ctx.userId)
    return NextResponse.json({
      success: true,
      active_coach: { id: refreshed.id, coach_name: refreshed.coach_name },
      link_up_plays: normalizeLinkUpPlays(refreshed)
    })
  } catch (error) {
    console.error('[coach-link-ups] POST:', error)
    return NextResponse.json({ error: 'Unable to save coach Link-up Plays' }, { status: 500 })
  }
}
