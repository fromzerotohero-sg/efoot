/**
 * GET /api/leaderboard/me
 * Storico classifica per l'utente autenticato (rank, points per mese).
 * Sicurezza: solo dati dell'utente loggato.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const token = extractBearerToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { userData, error } = await validateToken(token, supabaseUrl, anonKey)
  if (error || !userData?.user?.id) {
    return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
  }

  let userId = userData.user.id
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Metalgate ID lookup
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .single()
    
    if (existingProfile?.user_id) {
      userId = existingProfile.user_id
    } else {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }
  }

  const rlConfig = RATE_LIMIT_CONFIG['/api/leaderboard/me'] || { maxRequests: 30, windowMs: 60000 }
  const rateLimit = await checkRateLimit(userId, '/api/leaderboard/me', rlConfig.maxRequests, rlConfig.windowMs)
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

  const { data: snapshots } = await admin
    .from('leaderboard_snapshots')
    .select('month, rank, points, points_breakdown')
    .eq('user_id', userId)
    .order('month', { ascending: false })
    .limit(24)

  const history = (snapshots || []).map(s => ({
    month: s.month,
    rank: s.rank,
    points: s.points,
    pointsBreakdown: s.points_breakdown || {}
  }))

  return NextResponse.json(
    { history },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-RateLimit-Remaining': String(Math.max(0, rateLimit.remaining - 1))
      }
    }
  )
}
