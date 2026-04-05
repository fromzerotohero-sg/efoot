import { NextResponse } from 'next/server'
import { extractBearerToken, validateToken } from '@/lib/authHelper'
import {
  LIVE_COACH_BETA_COOKIE_NAME,
  getLiveCoachBetaCookieOptions,
  isLiveCoachBetaGateEnabled,
} from '@/lib/liveCoachBetaServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const accessCode = process.env.LIVE_COACH_BETA_ACCESS_CODE?.trim()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    if (!isLiveCoachBetaGateEnabled()) {
      const response = NextResponse.json({ success: true, gateEnabled: false })
      response.cookies.set(LIVE_COACH_BETA_COOKIE_NAME, 'granted', getLiveCoachBetaCookieOptions())
      return response
    }

    let body = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const submittedCode = typeof body.code === 'string' ? body.code.trim() : ''
    if (!submittedCode) {
      return NextResponse.json({ error: 'Access code required' }, { status: 400 })
    }

    if (submittedCode !== accessCode) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 403 })
    }

    const response = NextResponse.json({ success: true, gateEnabled: true })
    response.cookies.set(LIVE_COACH_BETA_COOKIE_NAME, 'granted', getLiveCoachBetaCookieOptions())
    return response
  } catch (error) {
    console.error('[live-coach-beta-unlock] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
