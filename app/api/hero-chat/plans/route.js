import { NextResponse } from 'next/server'
import { resolveHeroChatUser } from '@/lib/heroChatAuth'
import { buildPrematchChangeSet } from '@/lib/prematchChangeSet'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authResponse(auth) {
  return NextResponse.json({ error: auth.error }, { status: auth.status })
}

async function rateLimitResponse(auth) {
  const config = RATE_LIMIT_CONFIG['/api/hero-chat/plans']
  const result = await checkRateLimit(auth.userId, '/api/hero-chat/plans', config.maxRequests, config.windowMs)
  if (result.allowed) return null
  return NextResponse.json(
    { error: 'Too many plan requests. Try again shortly.', resetAt: result.resetAt },
    { status: 429 }
  )
}

function jsonSize(value) {
  try {
    return JSON.stringify(value || {}).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function asId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function getPlan(admin, userId, planId) {
  const { data, error } = await admin
    .from('prematch_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single()

  if (error || !data) return { error: 'Plan not found', status: 404 }
  return { data }
}

export async function GET(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const url = new URL(req.url)
    const planId = url.searchParams.get('id')
    if (planId) {
      const result = await getPlan(auth.admin, auth.userId, planId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
      return NextResponse.json({ success: true, plan: result.data })
    }

    const { data, error } = await auth.admin
      .from('prematch_plans')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return NextResponse.json({ success: true, plans: data || [] })
  } catch (error) {
    console.error('[hero-chat/plans] GET error:', error)
    return NextResponse.json({ error: 'Unable to load plans' }, { status: 500 })
  }
}

export async function POST(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => ({}))
    if (jsonSize(body.countermeasures) > 300000) {
      return NextResponse.json({ error: 'Countermeasure plan is too large' }, { status: 413 })
    }

    const changeSet = buildPrematchChangeSet(body.countermeasures, { lang: body.language })
    const idempotencyKey = asId(body.idempotency_key)

    if (idempotencyKey) {
      const { data: existing } = await auth.admin
        .from('prematch_plans')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existing) return NextResponse.json({ success: true, plan: existing, reused: true })
    }

    const { data, error } = await auth.admin
      .from('prematch_plans')
      .insert({
        user_id: auth.userId,
        thread_id: asId(body.thread_id),
        opponent_formation_id: asId(body.opponent_formation_id),
        status: 'ready',
        countermeasures: body.countermeasures || {},
        change_set: changeSet,
        idempotency_key: idempotencyKey
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, plan: data })
  } catch (error) {
    console.error('[hero-chat/plans] POST error:', error)
    return NextResponse.json({ error: 'Unable to save countermeasure plan' }, { status: 500 })
  }
}

export async function PATCH(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => ({}))
    const planId = asId(body.id || body.plan_id)
    if (!planId) return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })

    const planResult = await getPlan(auth.admin, auth.userId, planId)
    if (planResult.error) {
      return NextResponse.json({ error: planResult.error }, { status: planResult.status })
    }
    const plan = planResult.data

    if (body.action === 'dismiss') {
      const { data, error } = await auth.admin
        .from('prematch_plans')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', plan.id)
        .eq('user_id', auth.userId)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, plan: data })
    }

    return NextResponse.json(
      { error: 'Pre-match plans are informational. Configure the setup manually in eFootball.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[hero-chat/plans] PATCH error:', error)
    return NextResponse.json({ error: 'Unable to update pre-match plan' }, { status: 500 })
  }
}
