import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Proxy same-origin per /sso/verify Metalgate.
 * Evita CORS sui preview Vercel (*.vercel.app) verso api.fromzerotohero.io.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token required' }, { status: 400 })
    }

    const metalgateUrl = (process.env.NEXT_PUBLIC_METALGATE_API_URL || 'http://localhost:4001/api').replace(/\/+$/, '')
    const upstream = await fetch(`${metalgateUrl}/sso/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store'
    })

    const data = await upstream.json().catch(() => ({}))
    return NextResponse.json(data, { status: upstream.status })
  } catch (error) {
    console.error('[auth/metalgate-verify]', error)
    return NextResponse.json(
      { valid: false, error: 'Unable to verify Metalgate token' },
      { status: 502 }
    )
  }
}
