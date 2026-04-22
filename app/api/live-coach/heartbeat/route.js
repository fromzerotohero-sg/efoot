import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractBearerToken, validateToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { deductCredits, handleCreditOperationError } from '@/lib/creditService'
import { getLiveCoachMinuteBlocks, LIVE_COACH_MINUTE_COST } from '@/lib/liveCoachPricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveUser(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) return { error: 'Server configuration missing.', status: 500 }

  const token = extractBearerToken(req)
  if (!token) return { error: 'Authentication required.', status: 401 }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) return { error: 'Invalid or expired authentication.', status: 401 }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .maybeSingle()
    if (!existingProfile?.user_id) return { error: 'User profile not found.', status: 404 }
    userId = existingProfile.user_id
  }

  return { admin, token, userId }
}

export async function POST(req) {
  let creditChargeContext = null
  try {
    const auth = await resolveUser(req)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { admin, token, userId } = auth
    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const lang = body?.lang === 'en' ? 'en' : 'it'

    if (!sessionId) {
      return NextResponse.json({ error: lang === 'en' ? 'Missing session id.' : 'Sessione mancante.' }, { status: 400 })
    }

    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/live-coach/heartbeat'] || { maxRequests: 90, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/live-coach/heartbeat', rateLimitConfig.maxRequests, rateLimitConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: lang === 'en' ? 'Too many heartbeat requests.' : 'Troppe richieste heartbeat.' }, { status: 429 })
    }

    const { data: sessionRow, error: sessionError } = await admin
      .from('live_coach_sessions')
      .select('id, status, started_at, heartbeat_count, minute_blocks_billed, total_hp_charged')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (sessionError || !sessionRow?.id) {
      return NextResponse.json({ error: lang === 'en' ? 'Live session not found.' : 'Sessione live non trovata.' }, { status: 404 })
    }

    if (sessionRow.status === 'ended') {
      return NextResponse.json({ ok: true, ended: true })
    }

    const elapsedMs = Math.max(0, Date.now() - new Date(sessionRow.started_at).getTime())
    const expectedBlocks = getLiveCoachMinuteBlocks(elapsedMs)
    const minuteBlocksBilled = Number(sessionRow.minute_blocks_billed) || 0
    const missingBlocks = Math.max(0, expectedBlocks - minuteBlocksBilled)
    let additionalCost = 0

    if (missingBlocks > 0) {
      additionalCost = missingBlocks * LIVE_COACH_MINUTE_COST
      const deduction = await deductCredits(admin, userId, token, additionalCost, 'live-coach-minute')
      if (!deduction.success) {
        await admin
          .from('live_coach_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            session_meta: { stop_reason: 'insufficient_credits' }
          })
          .eq('id', sessionId)
          .eq('user_id', userId)

        return NextResponse.json(
          { ok: false, ended: true, reason: 'insufficient_credits', error: lang === 'en' ? 'Insufficient credits. Please recharge to continue.' : 'Crediti insufficienti. Ricarica per continuare.' },
          { status: 402 }
        )
      }
      creditChargeContext = { admin, userId, cost: additionalCost, operationType: 'live-coach-minute', functionName: 'live-coach-heartbeat:POST' }
    }

    const nextHeartbeatCount = (Number(sessionRow.heartbeat_count) || 0) + 1
    const nextMinuteBlocks = minuteBlocksBilled + missingBlocks
    const nextTotalCost = (Number(sessionRow.total_hp_charged) || 0) + additionalCost

    const { error: updateError } = await admin
      .from('live_coach_sessions')
      .update({
        status: 'active',
        heartbeat_count: nextHeartbeatCount,
        minute_blocks_billed: nextMinuteBlocks,
        total_hp_charged: nextTotalCost,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
    if (updateError) {
      throw new Error(`Failed to persist heartbeat session state: ${updateError.message}`)
    }

    return NextResponse.json({
      ok: true,
      additionalCost,
      totalHpCharged: nextTotalCost,
      minuteBlocksBilled: nextMinuteBlocks
    })
  } catch (error) {
    console.error('[live-coach/heartbeat] Error:', error)
    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error,
        errorType: 'server_error',
        metadata: { endpoint: '/api/live-coach/heartbeat' }
      })
    }
    return NextResponse.json({ error: 'Heartbeat failed.' }, { status: 500 })
  }
}
