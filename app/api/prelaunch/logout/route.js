import { NextResponse } from 'next/server'
import {
  PRELAUNCH_AUTH_COOKIE_NAME,
  PRELAUNCH_COOKIE_NAME,
  getPrelaunchCookieOptions,
} from '@/lib/prelaunchServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(PRELAUNCH_AUTH_COOKIE_NAME, '', {
    ...getPrelaunchCookieOptions(),
    maxAge: 0,
  })
  response.cookies.set(PRELAUNCH_COOKIE_NAME, '', {
    ...getPrelaunchCookieOptions(),
    maxAge: 0,
  })
  return response
}
