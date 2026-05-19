/**
 * Backfill rosa utenti da player_catalog (allineato a buildCatalogPlayerSavePayload + save-player).
 */
import {
  buildCatalogPlayerSavePayload,
  resolveOriginalPositionsFromCatalogCard
} from './playerSavePayload.js'
import { lookupPlayingStyleId } from './playingStyleResolve.js'
import { normPosCode } from './playerSlotRoleMetadata.js'

const CATALOG_PLAYER_FILTER = `metadata->>'catalog_source_player_id' IS NOT NULL
  OR metadata->>'catalog_link_method' IS NOT NULL
  OR metadata->>'saved_via' = 'nuova_rosa_catalog'
  OR metadata->>'source' = 'player_catalog'
  OR (extracted_data->>'source') = 'player_catalog'`

export function isCatalogLinkedPlayerRow(player) {
  const m = player?.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const ex =
    player?.extracted_data && typeof player.extracted_data === 'object'
      ? player.extracted_data
      : {}
  return Boolean(
    m.catalog_source_player_id ||
      m.catalog_link_method ||
      m.saved_via === 'nuova_rosa_catalog' ||
      m.source === 'player_catalog' ||
      ex.source === 'player_catalog'
  )
}

export function slotPositionFromFormation(formationRow, slotIndex) {
  if (slotIndex == null || slotIndex < 0 || slotIndex > 10) return null
  const sp = formationRow?.slot_positions
  if (!sp || typeof sp !== 'object') return null
  const slot = sp[String(slotIndex)] ?? sp[slotIndex]
  const pos = slot?.position
  return pos ? normPosCode(String(pos).trim()) : null
}

export function pickCatalogCard(cards, player) {
  if (!Array.isArray(cards) || cards.length === 0) return null
  if (cards.length === 1) return cards[0]
  const ovr = player.overall_rating != null ? Number(player.overall_rating) : null
  const type = player.card_type ? String(player.card_type).trim() : null
  let pool = cards
  if (type) {
    const typed = cards.filter((c) => c.card_type && String(c.card_type).trim() === type)
    if (typed.length > 0) pool = typed
  }
  if (ovr != null && Number.isFinite(ovr)) {
    pool = [...pool].sort(
      (a, b) =>
        Math.abs(Number(a.overall_level_1 ?? a.overall_max_level ?? 0) - ovr) -
        Math.abs(Number(b.overall_level_1 ?? b.overall_max_level ?? 0) - ovr)
    )
  }
  return pool[0]
}

export async function fetchCatalogCardsForPlayer(admin, player) {
  const meta = player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const ex =
    player.extracted_data && typeof player.extracted_data === 'object'
      ? player.extracted_data
      : {}
  const cardId = meta.catalog_card_id || ex.catalog_card_id
  if (cardId) {
    const { data } = await admin.from('player_catalog').select('*').eq('id', cardId).maybeSingle()
    if (data) return data
  }
  const sourceId = meta.catalog_source_player_id
  if (sourceId) {
    const { data } = await admin
      .from('player_catalog')
      .select('*')
      .eq('source_player_id', String(sourceId))
      .limit(20)
    return pickCatalogCard(data || [], player)
  }
  return null
}

function hasForcedOutOfRole(player) {
  const m = player?.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  return m.forced_out_of_role === true || m.intentional_slot_vs_card === true
}

/**
 * @returns {{ update: object, skipReason?: string }}
 */
export function buildBackfillUpdate(player, card, formationRow) {
  if (!card) return { update: null, skipReason: 'no_catalog_card' }
  if (!isCatalogLinkedPlayerRow(player)) return { update: null, skipReason: 'not_catalog_linked' }

  const slotIndex =
    player.slot_index != null && player.slot_index >= 0 && player.slot_index <= 10
      ? Number(player.slot_index)
      : null
  const slotPos = slotPositionFromFormation(formationRow, slotIndex)
  const keepOriginalPositions =
    Array.isArray(player.original_positions) && player.original_positions.length > 0
      ? player.original_positions
      : null

  const payload = buildCatalogPlayerSavePayload(card, {
    slotIndex,
    fieldPosition: hasForcedOutOfRole(player) ? null : slotPos,
    originalPositions: keepOriginalPositions || resolveOriginalPositionsFromCatalogCard(card)
  })

  const update = {
    role: payload.role || null,
    playing_style: payload.playing_style || null,
    position: hasForcedOutOfRole(player)
      ? player.position
      : payload.position || player.position,
    original_positions: payload.original_positions?.length ? payload.original_positions : player.original_positions,
    skills: payload.skills || [],
    com_skills: payload.com_skills || [],
    base_stats:
      payload.base_stats && typeof payload.base_stats === 'object' && Object.keys(payload.base_stats).length > 0
        ? payload.base_stats
        : player.base_stats,
    metadata: {
      ...(player.metadata && typeof player.metadata === 'object' ? player.metadata : {}),
      ...payload.metadata,
      source: 'player_catalog',
      data_backfill_catalog: '2026_05_16'
    },
    extracted_data: {
      ...(player.extracted_data && typeof player.extracted_data === 'object' ? player.extracted_data : {}),
      ...payload.extracted_data,
      source: 'player_catalog'
    },
    updated_at: new Date().toISOString()
  }

  return { update, payload }
}

export async function resolvePlayingStyleIdForUpdate(admin, update) {
  const name = update.role || update.playing_style
  if (!name) return null
  const { id } = await lookupPlayingStyleId(admin, name)
  return id
}

export { CATALOG_PLAYER_FILTER }
