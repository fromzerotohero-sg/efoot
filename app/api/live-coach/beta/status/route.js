import { NextResponse } from 'next/server'
import { hasLiveCoachBetaAccess, isLiveCoachBetaGateEnabled } from '@/lib/liveCoachBetaServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  return NextResponse.json({
    gateEnabled: isLiveCoachBetaGateEnabled(),
    hasAccess: hasLiveCoachBetaAccess(request),
  })
}
