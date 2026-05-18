import { NextResponse } from 'next/server'
import {
  fetchPlayersWithBuildCoachMetadata,
  fetchRosterContext,
  repairSinglePlayerBuildCoachBaseline
} from '@/lib/buildCoachBaselineRepair.js'
import { resolveBuildCoachContext } from '../_utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Ricalcola e salva stat/OVR profilo Play per tutti i giocatori con build_coach (slider PT salvati).
 */
export async function POST(req) {
  try {
    const resolved = await resolveBuildCoachContext(req)
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error.message }, { status: resolved.error.status })
    }

    const { admin, userId } = resolved
    const rows = (await fetchPlayersWithBuildCoachMetadata(admin)).filter((p) => p.user_id === userId)
    const rosterContext = await fetchRosterContext(admin, userId)

    const results = []
    for (const player of rows) {
      const sliders = player.development_points?.build_coach?.sliders
      if (!sliders || typeof sliders !== 'object' || Object.keys(sliders).length === 0) {
        results.push({ ok: false, player_id: player.id, player_name: player.player_name, skip: 'no_sliders' })
        continue
      }
      const result = await repairSinglePlayerBuildCoachBaseline(admin, player, rosterContext, { dryRun: false })
      results.push(result)
    }

    const repaired = results.filter((r) => r.ok)
    const skipped = results.filter((r) => !r.ok)

    return NextResponse.json({
      ok: true,
      summary: {
        total: results.length,
        repaired: repaired.length,
        skipped: skipped.length
      },
      results
    })
  } catch (error) {
    console.error('[build-coach/repair-play-profile] error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
