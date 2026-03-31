import { NextResponse } from 'next/server'
import { extractBearerToken, validateToken } from '@/lib/authHelper'
import {
  PRELAUNCH_AUTH_COOKIE_NAME,
  getPrelaunchCookieOptions,
} from '@/lib/prelaunchServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const metalgateSession = request.headers.get('x-metalgate-session') === '1'
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, {
      forbidSupabaseFallback: metalgateSession,
    })

    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(PRELAUNCH_AUTH_COOKIE_NAME, 'granted', getPrelaunchCookieOptions())
    return response
  } catch (error) {
    console.error('[prelaunch-session] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
