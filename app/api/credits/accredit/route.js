import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { accreditPurchase } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Estrae e valida l'API key per l'accredito crediti (sito pagamenti).
 * Accetta: Authorization: Bearer <key> oppure X-Webhook-Secret: <key>
 */
function getAccreditApiKey(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const secret = req.headers.get('x-webhook-secret') || req.headers.get('X-Webhook-Secret') || ''
  return secret.trim()
}

/**
 * POST /api/credits/accredit
 * Chiamato dal sito pagamenti dopo acquisto pacchetto per accreditare Hero Point.
 * Body: { user_id?, email?, credits_amount, order_id, period_key? }
 * Auth: Bearer <CREDITS_ACCREDIT_API_KEY> o X-Webhook-Secret: <key>
 * Vedi docs/INTEGRAZIONE_SITO_PAGAMENTI_HERO_POINTS.md
 */
export async function POST(req) {
  try {
    const apiKey = process.env.CREDITS_ACCREDIT_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Credits accredit not configured' },
        { status: 503 }
      )
    }

    const providedKey = getAccreditApiKey(req)
    if (!providedKey || providedKey !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const rawUserId = body.user_id != null ? String(body.user_id).trim() : null
    const email = typeof body.email === 'string' ? body.email.trim() : null
    const creditsAmount = body.credits_amount
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : null
    const periodKey = typeof body.period_key === 'string' ? body.period_key.trim() : null

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const userId = rawUserId && UUID_REGEX.test(rawUserId) ? rawUserId : null

    if (rawUserId && !userId) {
      return NextResponse.json(
        { error: 'Invalid user_id format (expected UUID)' },
        { status: 400 }
      )
    }
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Missing user_id or email' },
        { status: 400 }
      )
    }
    if (orderId === null || orderId === '') {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }
    const amount = Number(creditsAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'credits_amount must be a positive number' },
        { status: 400 }
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    let resolvedUserId = userId

    // Metalgate ID lookup: if userId is provided, check if it's a Metalgate ID
    if (userId) {
      // Check if it's a Metalgate ID by querying user_profiles
      const { data: profileByMetalgateId } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .maybeSingle()
      
      if (profileByMetalgateId?.user_id) {
        resolvedUserId = profileByMetalgateId.user_id
      }
    }

    if (!resolvedUserId && email) {
      const { data: rpcResult, error } = await admin.rpc('get_user_id_by_email', {
        user_email: email
      })
      if (error) {
        console.error('[credits/accredit] get_user_id_by_email error:', error.message)
        return NextResponse.json({ error: 'Error resolving user' }, { status: 500 })
      }
      const id = rpcResult
      resolvedUserId = (typeof id === 'string' ? id : (Array.isArray(id) ? id[0] : (id && typeof id === 'object' ? Object.values(id)[0] : null))) || null
    }

    if (!resolvedUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const result = await accreditPurchase(
      admin,
      resolvedUserId,
      amount,
      orderId,
      periodKey || undefined
    )

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Accredit failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      idempotent: result.idempotent === true,
      user_id: resolvedUserId,
      credits_amount: amount,
      order_id: orderId
    })
  } catch (err) {
    console.error('[credits/accredit] POST Error:', err)
    return NextResponse.json(
      { error: 'Error processing accredit request' },
      { status: 500 }
    )
  }
}
