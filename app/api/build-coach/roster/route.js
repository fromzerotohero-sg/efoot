import { NextResponse } from 'next/server'
import {
  calculateAndPersistPlayerBuild,
  fetchRosterContext,
  resolveBuildCoachContext
} from '../_utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const resolved = await resolveBuildCoachContext(req)
    if (resolved.error) return NextResponse.json({ error: resolved.error.message }, { status: resolved.error.status })

    const { admin, userId } = resolved
    const rosterContext = await fetchRosterContext(admin, userId)
    const players = rosterContext.players.filter((player) => player?.id && player?.player_name)

    const results = []
    for (const player of players) {
      try {
        const result = await calculateAndPersistPlayerBuild({
          admin,
          userId,
          player,
          rosterContext,
          save: true
        })
        results.push(result)
      } catch (error) {
        results.push({
          ok: false,
          player_id: player.id,
          player_name: player.player_name,
          error: error.message || 'build_failed'
        })
      }
    }

    const updated = results.filter((entry) => entry.ok)
    const skipped = results.filter((entry) => !entry.ok)
    const estimated = updated.filter((entry) => Array.isArray(entry.estimated_fields) && entry.estimated_fields.length > 0)

    return NextResponse.json({
      ok: true,
      summary: {
        total: results.length,
        updated: updated.length,
        skipped: skipped.length,
        estimated: estimated.length
      },
      results
    })
  } catch (error) {
    console.error('[build-coach/roster] error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
