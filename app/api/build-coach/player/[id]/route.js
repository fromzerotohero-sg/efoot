import { NextResponse } from 'next/server'
import {
  calculateAndPersistPlayerBuild,
  fetchRosterContext,
  resolveBuildCoachContext
} from '../../_utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req, { params }) {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })

    const resolved = await resolveBuildCoachContext(req)
    if (resolved.error) return NextResponse.json({ error: resolved.error.message }, { status: resolved.error.status })

    const { admin, userId } = resolved
    const rosterContext = await fetchRosterContext(admin, userId)
    const player = rosterContext.players.find((entry) => String(entry.id) === String(id))
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const result = await calculateAndPersistPlayerBuild({
      admin,
      userId,
      player,
      rosterContext,
      save: true
    })

    if (!result.ok) {
      const messages = {
        max_level_one: 'Questa carta non ha punti crescita utilizzabili (livello massimo 1). Se in gioco si potenzia, imposta il livello massimo corretto nel profilo giocatore.',
        non_progression_card_type: 'Questo tipo di carta ha progressione fissa nel gioco e non può ricevere una build automatica.'
      }
      return NextResponse.json({
        error: result.error,
        message: messages[result.error] || result.error,
        result
      }, { status: 422 })
    }

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('[build-coach/player] error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
