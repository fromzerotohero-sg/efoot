import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { accreditBonus } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REWARDS = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100]

function getTodayRomeDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function pickReward() {
  return REWARDS[Math.floor(Math.random() * REWARDS.length)]
}

function monthBoundsFromDateString(dateStr) {
  const [year, month] = String(dateStr || '').split('-')
  if (!year || !month) return null
  const firstDay = `${year}-${month}-01`
  const nextMonthDate = new Date(Date.UTC(Number(year), Number(month), 1))
  const lastDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(nextMonthDate.getTime() - 24 * 60 * 60 * 1000))
  return { firstDay, lastDay }
}

async function getGiftedTotalsForUser(admin, userId, today) {
  const monthBounds = monthBoundsFromDateString(today)
  let monthTotal = 0
  let lifetimeTotal = 0

  if (monthBounds) {
    const { data: monthRows } = await admin
      .from('daily_spin_claims')
      .select('reward_amount')
      .eq('user_id', userId)
      .gte('spin_date', monthBounds.firstDay)
      .lte('spin_date', monthBounds.lastDay)
    monthTotal = Array.isArray(monthRows)
      ? monthRows.reduce((sum, row) => sum + Number(row?.reward_amount || 0), 0)
      : 0
  }

  const { data: allRows } = await admin
    .from('daily_spin_claims')
    .select('reward_amount')
    .eq('user_id', userId)
  lifetimeTotal = Array.isArray(allRows)
    ? allRows.reduce((sum, row) => sum + Number(row?.reward_amount || 0), 0)
    : 0

  return { monthTotal, lifetimeTotal, monthBounds }
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

  return { admin, userId }
}

export async function GET(req) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { admin, userId } = auth
    const today = getTodayRomeDate()
    return NextResponse.json({
      available: true,
      claimed_today: false,
      spin_date: today,
      reward_amount: null,
      claimed_at: null
    })
  } catch (err) {
    console.error('[daily-spin] GET error:', err)
    return NextResponse.json({ error: 'Error loading daily spin status' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { admin, userId } = auth
    const nowIso = new Date().toISOString()
    const reward = REWARDS[Math.floor(Math.random() * REWARDS.length)] || pickReward()
    const referenceId = `daily-spin:${userId}:${nowIso}:${Math.random().toString(36).slice(2, 10)}`
    const creditResult = await accreditBonus(admin, userId, reward, referenceId, 'Daily spin reward')
    if (!creditResult.ok) {
      return NextResponse.json({ error: creditResult.error || 'Unable to accredit reward' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      already_claimed: false,
      reward_amount: reward,
      spin_date: getTodayRomeDate()
    })
  } catch (err) {
    console.error('[daily-spin] POST error:', err)
    return NextResponse.json({ error: 'Error claiming daily spin reward' }, { status: 500 })
  }
}
