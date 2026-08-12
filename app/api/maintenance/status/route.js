import { NextResponse } from 'next/server'
import { hasMaintenanceBypass, isMaintenanceModeEnabled } from '@/lib/maintenanceServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const maintenanceEnabled = isMaintenanceModeEnabled()

  return NextResponse.json({
    maintenanceEnabled,
    hasBypass: hasMaintenanceBypass(request),
  })
}
