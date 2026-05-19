#!/usr/bin/env node
/**
 * Allinea players salvati da catalogo (stile, competenze, abilità, stats, posizione slot).
 *
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 *   node scripts/backfill-players-catalog-alignment.mjs
 *   node scripts/backfill-players-catalog-alignment.mjs --apply
 *   node scripts/backfill-players-catalog-alignment.mjs --apply --user-id <uuid>
 */

import { createClient } from '@supabase/supabase-js'
import {
  buildBackfillUpdate,
  CATALOG_PLAYER_FILTER,
  fetchCatalogCardsForPlayer,
  isCatalogLinkedPlayerRow,
  resolvePlayingStyleIdForUpdate
} from '../lib/catalogPlayerBackfill.js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const argv = new Set(process.argv.slice(2))
const dryRun = !argv.has('--apply')
const userIdArg = (() => {
  const i = process.argv.indexOf('--user-id')
  return i >= 0 ? process.argv[i + 1] : null
})()

const PAGE = 200

async function fetchCatalogPlayers(admin, userId) {
  let q = admin
    .from('players')
    .select(
      'id, user_id, player_name, position, overall_rating, playing_style_id, role, slot_index, card_type, skills, com_skills, base_stats, original_positions, metadata, extracted_data'
    )
    .or(
      'metadata->>catalog_source_player_id.not.is.null,metadata->>catalog_link_method.not.is.null,metadata->>saved_via.eq.nuova_rosa_catalog,metadata->>source.eq.player_catalog'
    )
    .order('id', { ascending: true })
    .limit(PAGE)

  if (userId) q = q.eq('user_id', userId)

  const all = []
  let from = 0
  while (true) {
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data || []).filter(isCatalogLinkedPlayerRow)
    all.push(...rows)
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function main() {
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const players = await fetchCatalogPlayers(admin, userIdArg)
  console.log(`Catalog-linked players: ${players.length} (${dryRun ? 'DRY-RUN' : 'APPLY'})`)

  const formationCache = new Map()
  const touchedUsers = new Set()
  let updated = 0
  let skipped = 0

  for (const player of players) {
    const card = await fetchCatalogCardsForPlayer(admin, player)
    if (!card) {
      skipped++
      console.log(`[skip no_card] ${player.player_name || player.id}`)
      continue
    }

    let formationRow = formationCache.get(player.user_id)
    if (formationRow === undefined) {
      const { data } = await admin
        .from('formation_layout')
        .select('slot_positions')
        .eq('user_id', player.user_id)
        .maybeSingle()
      formationRow = data || null
      formationCache.set(player.user_id, formationRow)
    }

    const { update, skipReason } = buildBackfillUpdate(player, card, formationRow)
    if (!update) {
      skipped++
      console.log(`[skip ${skipReason}] ${player.player_name || player.id}`)
      continue
    }

    const playingStyleId = await resolvePlayingStyleIdForUpdate(admin, update)
    update.playing_style_id = playingStyleId

    if (dryRun) {
      updated++
      console.log(
        `[would update] ${player.player_name} | pos ${player.position}→${update.position} | role ${player.role}→${update.role} | skills ${(player.skills || []).length}→${(update.skills || []).length} | fk ${player.playing_style_id || 'null'}→${playingStyleId || 'null'}`
      )
      continue
    }

    const { error } = await admin.from('players').update(update).eq('id', player.id).eq('user_id', player.user_id)
    if (error) {
      skipped++
      console.error(`[error] ${player.player_name}: ${error.message}`)
      continue
    }
    touchedUsers.add(player.user_id)
    updated++
    console.log(`[ok] ${player.player_name}`)
  }

  if (!dryRun && touchedUsers.size > 0) {
    const ids = [...touchedUsers]
    const { error: delErr } = await admin.from('user_diagnostic_cache').delete().in('user_id', ids)
    if (delErr) console.error('diagnostic cache clear:', delErr.message)
    else console.log(`Cleared diagnostic cache for ${ids.length} user(s) — si rigenera al prossimo refresh/save.`)
  }

  console.log(`Done: ${updated} ${dryRun ? 'would update' : 'updated'}, ${skipped} skipped`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
