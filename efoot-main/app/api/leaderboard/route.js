/**
 * GET /api/leaderboard?month=YYYY-MM
 * Classifica mensile From Zero to Hero.
 *
 * Nome in classifica: solo da user_profiles (nickname, fallback first_name). Nessun trigger Supabase
 * modifica nickname; leaderboard_snapshots non contiene nickname. Mese corrente: nickname dall'array
 * computed (stessa richiesta). Mesi passati: fetch user_profiles o RPC che fa JOIN user_profiles.
 *
 * Sicurezza: in classifica solo rank, nickname, punti. Nessun user_id né breakdown per altri.
 * Se Authorization presente: aggiunge currentUser (rank, points, pointsBreakdown) solo per l'utente loggato.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import {
  computeLeaderboardForMonth,
  saveLeaderboardSnapshot,
  getMonthBounds,
  getCurrentMonth
} from '@/lib/leaderboardHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/
const MONTH_MAX_LENGTH = 7

export async function GET(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  let month = searchParams.get('month') || getCurrentMonth()
  if (typeof month !== 'string') month = getCurrentMonth()
  month = month.trim().slice(0, MONTH_MAX_LENGTH)
  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: 'Invalid month; use YYYY-MM' }, { status: 400 })
  }

  const endOfMonth = getMonthBounds(month)
  const daysLeftInMonth = endOfMonth ? Math.max(0, Math.ceil((new Date(endOfMonth.end) - new Date()) / (24 * 60 * 60 * 1000))) : null

  const token = extractBearerToken(req)
  let authUserId = null
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  if (token && anonKey) {
    const { userData } = await validateToken(token, supabaseUrl, anonKey)
    authUserId = userData?.user?.id ?? null

    // Metalgate ID lookup if authenticated
    if (authUserId && userData?.user?.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', authUserId)
        .single()
      
      if (existingProfile?.user_id) {
        authUserId = existingProfile.user_id
      }
      // If not found, authUserId remains Metalgate ID (might cause issues but handled gracefully or treated as not found)
    }
  }
  const rateLimitKey = authUserId ?? (token ? 'auth' : 'anon')
  const rlConfig = RATE_LIMIT_CONFIG['/api/leaderboard'] || { maxRequests: 60, windowMs: 60000 }
  const rateLimit = await checkRateLimit(rateLimitKey, '/api/leaderboard', rlConfig.maxRequests, rlConfig.windowMs)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'X-RateLimit-Limit': String(rlConfig.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt.getTime())
        }
      }
    )
  }

  const isCurrentMonth = month === getCurrentMonth()

  let rankings = []
  let computedForCurrentUser = null
  let computedCurrentMonth = null
  let snapshots = null
  let snapError = null

  // Per il mese corrente: ricalcoliamo sempre la classifica (tutti eleggibili, senza consenso) così lo snapshot non resta obsoleto.
  if (isCurrentMonth) {
    const computed = await computeLeaderboardForMonth(month, admin)
    computedCurrentMonth = computed?.length ? computed : null
    if (computed.length) {
      await saveLeaderboardSnapshot(month, computed, admin)
    }
    snapshots = computed?.length ? computed.map(r => ({
      user_id: r.user_id,
      rank: r.rank,
      points: r.points,
      points_breakdown: r.points_breakdown || {}
    })) : []
  } else {
    const res = await admin
      .from('leaderboard_snapshots')
      .select('user_id, points, rank, points_breakdown')
      .eq('month', month)
      .order('rank', { ascending: true })
    snapshots = res.data
    snapError = res.error
  }

  if (snapError) {
    console.error('[leaderboard] snapshots error:', snapError.message)
    return NextResponse.json(
      { error: 'Leaderboard unavailable', _debug: { step: 'snapshots', message: snapError.message } },
      { status: 500 }
    )
  }

  // Fallback: se la SELECT diretta restituisce 0 righe (es. anon key / RLS), usa RPC SECURITY DEFINER.
  // Se RPC non esiste o fallisce, restituiamo 200 con rankings vuoti (evitiamo di chiamare computeLeaderboardForMonth con anon e 500).
  if ((snapshots || []).length === 0 && !isCurrentMonth) {
    const supabaseProject = supabaseUrl ? (() => { try { return new URL(supabaseUrl).hostname.split('.')[0] } catch { return 'invalid-url' } })() : 'not-set'
    const { data: rpcRankings, error: rpcErr } = await admin.rpc('get_leaderboard_for_month', { month_param: month })
    if (rpcErr) {
      console.warn('[leaderboard] RPC get_leaderboard_for_month failed:', rpcErr.message)
      return NextResponse.json({
        month,
        rankings: [],
        daysLeftInMonth,
        _debug: { month, snapshotsFound: 0, source: 'rpc_fallback', rpcError: rpcErr.message, supabaseProject, expectedProject: 'zliuuorrwdetylollrua' }
      })
    }
    if (!rpcRankings?.length) {
      return NextResponse.json({
        month,
        rankings: [],
        daysLeftInMonth,
        _debug: { month, snapshotsFound: 0, source: 'rpc_fallback', empty: true, supabaseProject, expectedProject: 'zliuuorrwdetylollrua' }
      })
    }
    const rankingsFromRpc = rpcRankings.map((r, idx) => ({
      rank: r.rank ?? idx + 1,
      nickname: r.nickname ?? '—',
      points: r.points ?? 0
    }))
    let currentUserFromRpc = null
    if (authUserId) {
      const { data: cuRows } = await admin.rpc('get_leaderboard_current_user', {
        month_param: month,
        user_id_param: authUserId
      })
      const cu = Array.isArray(cuRows) ? cuRows[0] : cuRows
      if (cu) currentUserFromRpc = { rank: cu.rank, points: cu.points, pointsBreakdown: cu.points_breakdown || {} }
    }
    return NextResponse.json({
      month,
      rankings: rankingsFromRpc,
      currentUser: currentUserFromRpc,
      daysLeftInMonth,
      _debug: { month, snapshotsFound: 0, source: 'rpc', supabaseProject, expectedProject: 'zliuuorrwdetylollrua' }
    })
  }

  const snapshotUserIds = new Set((snapshots || []).map(s => s.user_id))
  const authUserNotInSnapshot = authUserId && snapshotUserIds.size > 0 && !snapshotUserIds.has(authUserId)

  // Retroattivo (solo mesi passati): se l'utente loggato non è in classifica, ricalcola il mese per includerlo. Per mese corrente abbiamo già ricalcolato sopra.
  let snapshotsToUse = snapshots
  if (authUserNotInSnapshot && !isCurrentMonth) {
    const computed = await computeLeaderboardForMonth(month, admin)
    if (computed.length) {
      await saveLeaderboardSnapshot(month, computed, admin)
      snapshotsToUse = computed.map(r => ({
        user_id: r.user_id,
        rank: r.rank,
        points: r.points,
        points_breakdown: r.points_breakdown || {}
      }))
    }
  }

  const snapshotByUserForCurrent = {}
  if (snapshotsToUse?.length) {
    // Mese corrente: usa i nickname già presenti in computedCurrentMonth (stessa richiesta, niente seconda fetch potenzialmente stale)
    if (isCurrentMonth && computedCurrentMonth?.length) {
      rankings = computedCurrentMonth.map(r => ({
        rank: r.rank,
        nickname: r.nickname ?? '—',
        points: r.points
      }))
      computedCurrentMonth.forEach(r => {
        snapshotByUserForCurrent[r.user_id] = { rank: r.rank, points: r.points, points_breakdown: r.points_breakdown || {} }
      })
    } else {
      const { data: profiles, error: profError } = await admin
        .from('user_profiles')
        .select('user_id, nickname, first_name')
        .in('user_id', snapshotsToUse.map(s => s.user_id))
      if (profError) {
        console.error('[leaderboard] profiles error:', profError.message)
        return NextResponse.json(
          { error: 'Leaderboard unavailable', _debug: { step: 'profiles', message: profError.message } },
          { status: 500 }
        )
      }
      const displayNameByUser = {}
      ;(profiles || []).forEach(p => {
        const name = (p.nickname && p.nickname.trim()) || (p.first_name && p.first_name.trim()) || null
        displayNameByUser[p.user_id] = name
      })
      rankings = snapshotsToUse.map((s, idx) => {
        snapshotByUserForCurrent[s.user_id] = { rank: idx + 1, points: s.points, points_breakdown: s.points_breakdown || {} }
        return {
          rank: idx + 1,
          nickname: displayNameByUser[s.user_id] ?? '—',
          points: s.points
        }
      })
    }
  } else {
    const computed = await computeLeaderboardForMonth(month, admin)
    if (computed.length) {
      await saveLeaderboardSnapshot(month, computed, admin)
    }
    rankings = computed.map(r => ({
      rank: r.rank,
      nickname: r.nickname ?? '—',
      points: r.points
    }))
    computedForCurrentUser = computed
  }

  let currentUser = null
  if (authUserId) {
    const uid = authUserId
    if (Object.keys(snapshotByUserForCurrent).length > 0) {
      const from = snapshotByUserForCurrent[uid]
      if (from) currentUser = { rank: from.rank, points: from.points, pointsBreakdown: from.points_breakdown || {} }
    } else {
      const snapshotRow = snapshotsToUse?.find(s => s.user_id === uid)
      if (snapshotRow) {
        currentUser = { rank: snapshotRow.rank, points: snapshotRow.points, pointsBreakdown: snapshotRow.points_breakdown || {} }
      }
      if (!currentUser && computedForCurrentUser) {
        const me = computedForCurrentUser.find(r => r.user_id === uid)
        if (me) currentUser = { rank: me.rank, points: me.points, pointsBreakdown: me.points_breakdown || {} }
      }
    }
  }

  const supabaseProject = supabaseUrl ? (() => { try { return new URL(supabaseUrl).hostname.split('.')[0] } catch { return 'invalid-url' } })() : 'not-set'
  const body = {
    month,
    rankings,
    ...(currentUser && { currentUser }),
    daysLeftInMonth
  }
  if (rankings.length === 0) {
    body._debug = {
      month,
      snapshotsFound: (snapshotsToUse || snapshots || []).length,
      supabaseProject,
      expectedProject: 'zliuuorrwdetylollrua'
    }
  }

  return NextResponse.json(
    body,
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-RateLimit-Remaining': String(Math.max(0, rateLimit.remaining - 1))
      }
    }
  )
}
