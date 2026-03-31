import { NextResponse } from 'next/server'
import { hasPrelaunchAccess, isPrelaunchGateEnabled } from '@/lib/prelaunchServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const gateEnabled = isPrelaunchGateEnabled()

  return NextResponse.json({
    gateEnabled,
    hasAccess: hasPrelaunchAccess(request),
  })
}
