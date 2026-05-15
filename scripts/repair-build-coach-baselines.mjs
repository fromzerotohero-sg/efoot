#!/usr/bin/env node
/**
 * Ripara giocatori con metadata.build_coach (baseline in colonna + effective in metadata).
 *
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 *   node scripts/repair-build-coach-baselines.mjs
 *   node scripts/repair-build-coach-baselines.mjs --apply
 */

import { createClient } from '@supabase/supabase-js'
import {
  fetchPlayersWithBuildCoachMetadata,
  fetchRosterContext,
  repairSinglePlayerBuildCoachBaseline
} from '../lib/buildCoachBaselineRepair.js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const argv = new Set(process.argv.slice(2))
const dryRun = !argv.has('--apply')

async function main() {
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const rows = await fetchPlayersWithBuildCoachMetadata(admin)
  console.log(`Players with build_coach: ${rows.length} (${dryRun ? 'dry-run' : 'APPLY'})`)

  const rosterCache = new Map()
  let ok = 0
  let skip = 0

  for (const player of rows) {
    let rosterContext = rosterCache.get(player.user_id)
    if (!rosterContext) {
      rosterContext = await fetchRosterContext(admin, player.user_id)
      rosterCache.set(player.user_id, rosterContext)
    }
    const result = await repairSinglePlayerBuildCoachBaseline(admin, player, rosterContext, { dryRun })
    if (result.ok) {
      ok++
      if (!dryRun) console.log(`OK ${result.player_name} OVR ${result.after_overall} (cap ${result.overall_cap})`)
    } else {
      skip++
      console.log(`[skip ${result.skip}] ${player.player_name || player.id}`)
    }
  }

  console.log(`Done: ${ok} repaired${dryRun ? ' (would write)' : ''}, ${skip} skipped`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
