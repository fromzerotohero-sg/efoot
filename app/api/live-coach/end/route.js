import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractBearerToken, validateToken } from '@/lib/authHelper'
import { getLiveCoachPricingSummary } from '@/lib/liveCoachPricing'

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

  return { admin, userId }
}

export async function POST(req) {
  try {
    const auth = await resolveUser(req)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { admin, userId } = auth
    const body = await req.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const lang = body?.lang === 'en' ? 'en' : body?.lang === 'es' ? 'es' : 'it'
    const opponentContext = body?.opponentContext && typeof body.opponentContext === 'object'
      ? body.opponentContext
      : null
    const clientState = body?.clientState && typeof body.clientState === 'object'
      ? body.clientState
      : {}

    if (!sessionId) {
      return NextResponse.json({ error: lang === 'en' ? 'Missing session id.' : lang === 'es' ? 'Falta el id de sesión.' : 'Sessione mancante.' }, { status: 400 })
    }

    const { data: sessionRow, error: sessionError } = await admin
      .from('live_coach_sessions')
      .select('id, started_at, total_hp_charged')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (sessionError || !sessionRow?.id) {
      return NextResponse.json({ error: lang === 'en' ? 'Live session not found.' : lang === 'es' ? 'Sesión live no encontrada.' : 'Sessione live non trovata.' }, { status: 404 })
    }

    const now = new Date()
    const elapsedMs = Math.max(0, now.getTime() - new Date(sessionRow.started_at).getTime())
    const pricing = getLiveCoachPricingSummary(elapsedMs)

    const updatePayload = {
      status: 'ended',
      ended_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      updated_at: now.toISOString(),
      session_meta: {
        clientState,
        elapsedMs,
        finalPricingEstimate: pricing
      }
    }
    if (opponentContext) updatePayload.opponent_context = opponentContext

    await admin
      .from('live_coach_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .eq('user_id', userId)

    return NextResponse.json({
      ok: true,
      elapsedMs,
      totalHpCharged: Number(sessionRow.total_hp_charged) || pricing.totalCost
    })
  } catch (error) {
    console.error('[live-coach/end] Error:', error)
    return NextResponse.json({ error: 'Failed to close session.' }, { status: 500 })
  }
}
