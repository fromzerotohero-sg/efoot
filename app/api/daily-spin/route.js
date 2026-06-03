import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { accreditBonus } from '@/lib/creditService'
import { pickWeightedReward } from '@/lib/dailySpinConfig'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getTodayRomeDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
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
    const { data: claim } = await admin
      .from('daily_spin_claims')
      .select('reward_amount, spin_date, created_at')
      .eq('user_id', userId)
      .eq('spin_date', today)
      .maybeSingle()

    const giftedTotals = await getGiftedTotalsForUser(admin, userId, today)

    return NextResponse.json({
      available: !claim,
      claimed_today: !!claim,
      spin_date: today,
      reward_amount: claim?.reward_amount ?? null,
      claimed_at: claim?.created_at ?? null,
      gifted_month_total: giftedTotals.monthTotal,
      gifted_lifetime_total: giftedTotals.lifetimeTotal
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
    const today = getTodayRomeDate()
    const referenceId = `daily-spin:${userId}:${today}`

    const { data: existingClaim } = await admin
      .from('daily_spin_claims')
      .select('reward_amount, created_at')
      .eq('user_id', userId)
      .eq('spin_date', today)
      .maybeSingle()

    if (existingClaim) {
      const existingReward = Number(existingClaim.reward_amount || 0)
      if (existingReward > 0) {
        const creditResult = await accreditBonus(
          admin,
          userId,
          existingReward,
          referenceId,
          'Daily spin reward'
        )
        if (!creditResult.ok) {
          return NextResponse.json({ error: creditResult.error || 'Unable to accredit reward' }, { status: 500 })
        }
      }
      return NextResponse.json({
        ok: true,
        already_claimed: true,
        reward_amount: existingClaim.reward_amount,
        spin_date: today,
        claimed_at: existingClaim.created_at
      })
    }

    const giftedTotals = await getGiftedTotalsForUser(admin, userId, today)
    const hasWon100ThisMonth = giftedTotals.monthBounds
      ? (await admin
          .from('daily_spin_claims')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('reward_amount', 100)
          .gte('spin_date', giftedTotals.monthBounds.firstDay)
          .lte('spin_date', giftedTotals.monthBounds.lastDay)).count > 0
      : false

    const reward = pickWeightedReward({ exclude100: hasWon100ThisMonth })
    const { error: claimError } = await admin.from('daily_spin_claims').insert({
      user_id: userId,
      spin_date: today,
      reward_amount: reward
    })

    if (claimError) {
      const { data: claimAfterError } = await admin
        .from('daily_spin_claims')
        .select('reward_amount, created_at')
        .eq('user_id', userId)
        .eq('spin_date', today)
        .maybeSingle()
      if (claimAfterError) {
        const recoveredReward = Number(claimAfterError.reward_amount || 0)
        if (recoveredReward > 0) {
          const creditResult = await accreditBonus(
            admin,
            userId,
            recoveredReward,
            referenceId,
            'Daily spin reward'
          )
          if (!creditResult.ok) {
            return NextResponse.json({ error: creditResult.error || 'Unable to accredit reward' }, { status: 500 })
          }
        }
        return NextResponse.json({
          ok: true,
          already_claimed: true,
          reward_amount: claimAfterError.reward_amount,
          spin_date: today,
          claimed_at: claimAfterError.created_at
        })
      }
      return NextResponse.json({ error: 'Unable to save daily spin claim' }, { status: 500 })
    }

    if (Number(reward) > 0) {
      const creditResult = await accreditBonus(admin, userId, reward, referenceId, 'Daily spin reward')
      if (!creditResult.ok) {
        return NextResponse.json({ error: creditResult.error || 'Unable to accredit reward' }, { status: 500 })
      }
    }

    return NextResponse.json({
      ok: true,
      already_claimed: false,
      reward_amount: reward,
      spin_date: today,
      monthly_100_blocked: hasWon100ThisMonth
    })
  } catch (err) {
    console.error('[daily-spin] POST error:', err)
    return NextResponse.json({ error: 'Error claiming daily spin reward' }, { status: 500 })
  }
}
