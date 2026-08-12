import { NextResponse } from 'next/server'
import {
  MAINTENANCE_COOKIE_NAME,
  getMaintenanceCookieOptions,
  isMaintenanceModeEnabled,
} from '@/lib/maintenanceServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const bypassKey = process.env.MAINTENANCE_BYPASS_KEY?.trim()

    if (!isMaintenanceModeEnabled()) {
      const response = NextResponse.json({ success: true, maintenanceEnabled: false })
      response.cookies.set(MAINTENANCE_COOKIE_NAME, 'granted', getMaintenanceCookieOptions())
      return response
    }

    if (!bypassKey) {
      return NextResponse.json({ error: 'Maintenance bypass not configured' }, { status: 503 })
    }

    let body = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const submittedKey = typeof body.key === 'string' ? body.key.trim() : ''
    if (!submittedKey) {
      return NextResponse.json({ error: 'Access key required' }, { status: 400 })
    }

    if (submittedKey !== bypassKey) {
      return NextResponse.json({ error: 'Invalid access key' }, { status: 403 })
    }

    const response = NextResponse.json({ success: true, maintenanceEnabled: true })
    response.cookies.set(MAINTENANCE_COOKIE_NAME, 'granted', getMaintenanceCookieOptions())
    return response
  } catch (error) {
    console.error('[maintenance-unlock] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
