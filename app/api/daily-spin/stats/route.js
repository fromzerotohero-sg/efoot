import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getApiKey(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return (req.headers.get('x-webhook-secret') || req.headers.get('X-Webhook-Secret') || '').trim()
}

function currentMonthBoundsRome() {
  const now = new Date()
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric' }).format(now)
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', month: '2-digit' }).format(now)
  const firstDay = `${y}-${m}-01`
  const nextMonthDate = new Date(Date.UTC(Number(y), Number(m), 1))
  const lastDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(nextMonthDate.getTime() - 24 * 60 * 60 * 1000))
  return { firstDay, lastDay }
}

export async function GET(req) {
  try {
    const apiKey = process.env.CREDITS_ACCREDIT_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Stats not configured' }, { status: 503 })
    if (getApiKey(req) !== apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    const { firstDay, lastDay } = currentMonthBoundsRome()

    const { data: allRows } = await admin.from('daily_spin_claims').select('reward_amount, user_id')
    const { data: monthRows } = await admin
      .from('daily_spin_claims')
      .select('reward_amount, user_id')
      .gte('spin_date', firstDay)
      .lte('spin_date', lastDay)

    const gifted_total = Array.isArray(allRows) ? allRows.reduce((sum, row) => sum + Number(row?.reward_amount || 0), 0) : 0
    const gifted_current_month = Array.isArray(monthRows) ? monthRows.reduce((sum, row) => sum + Number(row?.reward_amount || 0), 0) : 0
    const claims_total = Array.isArray(allRows) ? allRows.length : 0
    const claims_current_month = Array.isArray(monthRows) ? monthRows.length : 0
    const winners_100_current_month = Array.isArray(monthRows)
      ? new Set(monthRows.filter((row) => Number(row?.reward_amount) === 100).map((row) => row.user_id)).size
      : 0

    return NextResponse.json({
      gifted_total,
      gifted_current_month,
      claims_total,
      claims_current_month,
      winners_100_current_month,
      month_range: { first_day: firstDay, last_day: lastDay }
    })
  } catch (err) {
    console.error('[daily-spin/stats] GET error:', err)
    return NextResponse.json({ error: 'Error loading daily spin stats' }, { status: 500 })
  }
}
