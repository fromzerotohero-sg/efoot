import { NextResponse } from 'next/server'
import {
  PRELAUNCH_COOKIE_NAME,
  getPrelaunchCookieOptions,
  isPrelaunchGateEnabled,
} from '@/lib/prelaunchServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const accessCode = process.env.PRELAUNCH_ACCESS_CODE?.trim()

    if (!isPrelaunchGateEnabled()) {
      const response = NextResponse.json({ success: true, gateEnabled: false })
      response.cookies.set(PRELAUNCH_COOKIE_NAME, 'granted', getPrelaunchCookieOptions())
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
    response.cookies.set(PRELAUNCH_COOKIE_NAME, 'granted', getPrelaunchCookieOptions())
    return response
  } catch (error) {
    console.error('[prelaunch-unlock] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
