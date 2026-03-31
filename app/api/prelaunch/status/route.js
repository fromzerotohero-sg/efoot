import { NextResponse } from 'next/server'
import { hasPrelaunchAccess, hasPrelaunchAuth, isPrelaunchGateEnabled } from '@/lib/prelaunchServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const gateEnabled = isPrelaunchGateEnabled()

  return NextResponse.json({
    gateEnabled,
    isAuthenticated: hasPrelaunchAuth(request),
    hasAccess: hasPrelaunchAccess(request),
  })
}
