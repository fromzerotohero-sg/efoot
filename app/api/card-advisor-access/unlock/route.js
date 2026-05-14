import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const accessCode = process.env.PRELAUNCH_ACCESS_CODE?.trim()
    if (!accessCode) {
      return NextResponse.json({ success: true, gateEnabled: false })
    }

    const body = await request.json().catch(() => ({}))
    const submittedCode = typeof body.code === 'string' ? body.code.trim() : ''
    if (!submittedCode) {
      return NextResponse.json({ error: 'Chiave di accesso richiesta.' }, { status: 400 })
    }

    if (submittedCode !== accessCode) {
      return NextResponse.json({ error: 'Chiave di accesso non valida.' }, { status: 403 })
    }

    return NextResponse.json({ success: true, gateEnabled: true })
  } catch (error) {
    console.error('[card-advisor-access] Unexpected error:', error)
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 })
  }
}
