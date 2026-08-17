/**
 * Payload canonico per POST /api/supabase/save-player.
 * Usato da import catalogo e salvataggio da estrazione foto (Nuova rosa).
 */
import { getPlayingStylesContract, resolvePlayingStyleDbName } from '@/lib/playingStyleResolve'
import { normalizePlayerSkillsArray } from '@/lib/playerSkillLabels'
import { buildSlotRoleAugmentsForStarter, normPosCode } from '@/lib/playerSlotRoleMetadata'

const DEFAULT_COMPETENCE = 'Alta'

/** Salvataggio da picker catalogo Nuova rosa (o payload equivalente). */
export function isCatalogPlayerSave(player) {
  if (!player || typeof player !== 'object') return false
  const meta = player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  if (meta.source === 'player_catalog' || meta.catalog_link_method || meta.saved_via === 'nuova_rosa_catalog') {
    return true
  }
  const ex = player.extracted_data && typeof player.extracted_data === 'object' ? player.extracted_data : {}
  return ex.source === 'player_catalog'
}

/** Nome stile grezzo da payload save-player (catalogo / foto). Preferisce stile primario/ATT. */
export function resolvePlayingStyleNameFromPlayer(player) {
  if (!player || typeof player !== 'object') return null
  const styles = getPlayingStylesContract(player)
  if (styles.primary) return styles.primary
  const ex = player.extracted_data && typeof player.extracted_data === 'object' ? player.extracted_data : {}
  return (
    toText(player.playing_style) ||
    toText(player.role) ||
    toText(ex.playing_style) ||
    toText(ex.role) ||
    null
  )
}

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}

/**
 * @param {unknown} raw
 * @returns {{ position: string, competence: string }[]}
 */
export function normalizeOriginalPositionsArray(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out = []
  for (const entry of raw) {
    const position = typeof entry === 'string' ? toText(entry) : toText(entry?.position)
    if (!position) continue
    const competence =
      typeof entry === 'object' && entry?.competence && String(entry.competence).trim()
        ? String(entry.competence).trim()
        : DEFAULT_COMPETENCE
    out.push({ position: position.toUpperCase(), competence })
  }
  return out
}

/**
 * Converte `position_compatibility` catalogo (chiavi = posizioni eFootball) in `original_positions`.
 * @param {Record<string, unknown>|null|undefined} compatibility
 * @param {string|null|undefined} fallbackPosition
 */
export function positionCompatibilityToOriginalPositions(compatibility, fallbackPosition) {
  if (!compatibility || typeof compatibility !== 'object') return []
  const positions = Object.keys(compatibility)
    .map((pos) => String(pos || '').trim().toUpperCase())
    .filter(Boolean)
  if (positions.length > 0) {
    return positions.map((position) => ({ position, competence: DEFAULT_COMPETENCE }))
  }
  const main = toText(fallbackPosition)
  return main ? [{ position: main.toUpperCase(), competence: DEFAULT_COMPETENCE }] : []
}

/**
 * @param {object|null|undefined} card — riga catalogo (search API)
 */
export function resolveOriginalPositionsFromCatalogCard(card) {
  const payload =
    card?.players_payload && typeof card.players_payload === 'object' ? card.players_payload : {}

  const fromPayload = normalizeOriginalPositionsArray(payload.original_positions)
  if (fromPayload.length > 0) return fromPayload

  const fromCard = normalizeOriginalPositionsArray(card?.original_positions)
  if (fromCard.length > 0) return fromCard

  const fromCompat = positionCompatibilityToOriginalPositions(
    card?.position_compatibility,
    payload.position || card?.position
  )
  if (fromCompat.length > 0) return fromCompat

  const mainPosition = payload.position || card?.position
  return mainPosition
    ? [{ position: String(mainPosition).trim().toUpperCase(), competence: DEFAULT_COMPETENCE }]
    : []
}

export function buildCatalogMetadata(card) {
  return {
    catalog_source: card?.source || null,
    catalog_source_player_id: card?.source_player_id || null,
    catalog_card_instance_key: card?.card_instance_key || null,
    catalog_player_identity_key: card?.player_identity_key || null,
    catalog_card_type: card?.card_type || null,
    catalog_pack_name: card?.pack_name || null,
    catalog_card_front_url: card?.source_card_front_url || null,
    catalog_card_back_url: card?.source_card_back_url || null,
    catalog_card_id: card?.id || null,
    catalog_link_method: 'catalog_picker',
    catalog_link_confidence: 'high',
    catalog_linked_at: new Date().toISOString()
  }
}

function buildCatalogPhotoSlots(card, payload) {
  const existing =
    payload?.photo_slots && typeof payload.photo_slots === 'object' ? { ...payload.photo_slots } : {}
  const frontUrl = card?.source_card_front_url || existing.catalog_card || existing.main_url || null
  const hasStats =
    payload?.base_stats &&
    typeof payload.base_stats === 'object' &&
    Object.keys(payload.base_stats).length > 0
  const hasSkills =
    (Array.isArray(payload?.skills) && payload.skills.length > 0) ||
    (Array.isArray(card?.player_skills) && card.player_skills.length > 0)

  const slots = { ...existing }
  if (frontUrl) {
    slots.catalog_card = frontUrl
    slots.main_url = slots.main_url || frontUrl
    slots.card = true
  }
  if (hasStats && slots.statistiche !== true) slots.statistiche = true
  if (hasSkills && slots.abilita !== true) slots.abilita = true
  return Object.keys(slots).length > 0 ? slots : null
}

function resolveCatalogSkills(payload, card) {
  const merged = [
    ...(Array.isArray(payload?.skills) ? payload.skills : []),
    ...(Array.isArray(payload?.player_skills) ? payload.player_skills : []),
    ...(Array.isArray(card?.player_skills) ? card.player_skills : [])
  ]
  if (merged.length > 0) return normalizePlayerSkillsArray(merged)
  return []
}

/** Abilità COM / stili IA da catalogo (players_payload.com_skills o colonne ai_playstyles). */
function resolveCatalogComSkills(payload, card) {
  const merged = [
    ...(Array.isArray(payload?.com_skills) ? payload.com_skills : []),
    ...(Array.isArray(payload?.ai_playstyles) ? payload.ai_playstyles : []),
    ...(Array.isArray(card?.ai_playstyles) ? card.ai_playstyles : [])
  ]
  if (merged.length > 0) return normalizePlayerSkillsArray(merged)
  return []
}

/** Statistiche annidate (attacking/defending/athleticism) come in rosa / chat. */
function resolveCatalogBaseStats(payload, card) {
  const candidates = [payload?.base_stats, card?.players_base_stats, card?.base_stats]
  for (const raw of candidates) {
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
      return raw
    }
  }
  return {}
}

/**
 * Payload allineato a save-player / estrazione foto.
 * @param {object} card
 * @param {{
 *   slotIndex?: number|null,
 *   originalPositions?: { position: string, competence: string }[]|null,
 *   availableBoosters?: object[],
 *   metadataExtra?: object,
 *   fieldPosition?: string|null,
 * }} [options]
 */
export function buildCatalogPlayerSavePayload(card, options = {}) {
  const {
    slotIndex = null,
    originalPositions = null,
    availableBoosters = [],
    metadataExtra = {},
    fieldPosition = null
  } = options

  const payload =
    card?.players_payload && typeof card.players_payload === 'object' ? card.players_payload : {}

  const playingStyles = getPlayingStylesContract({
    ...card,
    players_payload: payload,
    metadata: {
      ...(card?.metadata && typeof card.metadata === 'object' ? card.metadata : {}),
      ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {})
    }
  })
  const rawPlayingStyle =
    playingStyles.primary ||
    payload.role ||
    payload.playing_style ||
    card.playing_style ||
    null
  const italianPlayingStyle = resolvePlayingStyleDbName(rawPlayingStyle)

  const resolvedPositions =
    originalPositions && originalPositions.length > 0
      ? normalizeOriginalPositionsArray(originalPositions)
      : resolveOriginalPositionsFromCatalogCard(card)

  const skills = resolveCatalogSkills(payload, card)
  const comSkills = resolveCatalogComSkills(payload, card)
  const baseStats = resolveCatalogBaseStats(payload, card)

  const metadata = {
    ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
    ...(card?.metadata && typeof card.metadata === 'object' ? card.metadata : {}),
    ...buildCatalogMetadata(card),
    source: 'player_catalog',
    saved_via: 'nuova_rosa_catalog',
    catalog_playing_style_raw: rawPlayingStyle || null,
    playing_styles: playingStyles,
    ...(metadataExtra && typeof metadataExtra === 'object' ? metadataExtra : {})
  }

  const cardNaturalPosition =
    resolvedPositions[0]?.position || payload.position || card?.position || null
  const isStarterSlot = slotIndex !== null && slotIndex !== undefined && Number(slotIndex) >= 0
  const slotFieldPosition = isStarterSlot && fieldPosition ? normPosCode(fieldPosition) : null
  const mainPosition = slotFieldPosition || cardNaturalPosition

  const extractedSnapshot = {
    ...payload,
    player_name: payload.player_name || card.player_name,
    position: mainPosition,
    role: italianPlayingStyle || rawPlayingStyle || null,
    playing_style: italianPlayingStyle || rawPlayingStyle || null,
    playing_styles: playingStyles,
    original_positions: resolvedPositions,
    position_compatibility: card?.position_compatibility || payload.position_compatibility || null,
    skills,
    com_skills: comSkills,
    base_stats: baseStats,
    catalog_card_id: card?.id || null,
    source: 'player_catalog'
  }

  let metadataOut = { ...metadata }
  let originalPositionsOut = resolvedPositions
  if (isStarterSlot && mainPosition) {
    const { augments } = buildSlotRoleAugmentsForStarter({
      playerRow: {
        position: mainPosition,
        original_positions: resolvedPositions,
        metadata: metadataOut
      },
      slotPosition: mainPosition,
      metadataBase: metadataOut
    })
    if (augments.metadata) metadataOut = augments.metadata
    if (augments.original_positions) originalPositionsOut = augments.original_positions
  }

  return {
    ...payload,
    player_name: payload.player_name || card.player_name,
    position: mainPosition,
    card_type: payload.card_type || card.card_type,
    team: payload.team || card.team_name || null,
    club_name: payload.club_name || card.team_name || null,
    nationality: payload.nationality || card.nationality || card.region || null,
    role: italianPlayingStyle || rawPlayingStyle || null,
    playing_style: italianPlayingStyle || rawPlayingStyle || null,
    overall_rating:
      payload.overall_rating ?? card.overall_level_1 ?? card.overall_max_level ?? null,
    height_cm: payload.height_cm ?? card.height ?? null,
    weight_kg: payload.weight_kg ?? card.weight ?? null,
    age: payload.age ?? card.age ?? null,
    base_stats: baseStats,
    skills,
    com_skills: comSkills,
    original_positions: originalPositionsOut,
    refresh_original_positions: originalPositionsOut.length > 0,
    slot_index: slotIndex,
    available_boosters: availableBoosters,
    boosters: availableBoosters,
    photo_slots: buildCatalogPhotoSlots(card, payload),
    metadata: metadataOut,
    extracted_data: {
      ...extractedSnapshot,
      position: mainPosition,
      original_positions: originalPositionsOut
    }
  }
}

/**
 * Allinea payload da estrazione foto prima di save-player.
 * @param {object} extracted
 * @param {{
 *   originalPositions: { position: string, competence: string }[],
 *   slotIndex?: number|null,
 *   photoSlots?: object|null,
 *   fieldPosition?: string|null,
 * }} options
 */
export function buildPhotoPlayerSavePayload(extracted, options = {}) {
  const { originalPositions, slotIndex, photoSlots, fieldPosition = null } = options
  const base = extracted && typeof extracted === 'object' ? { ...extracted } : {}

  const resolvedPositions = normalizeOriginalPositionsArray(originalPositions)
  const isStarterSlot = slotIndex !== null && slotIndex !== undefined && Number(slotIndex) >= 0
  const slotFieldPosition = isStarterSlot && fieldPosition ? normPosCode(fieldPosition) : null
  const mainPosition =
    slotFieldPosition || resolvedPositions[0]?.position || base.position || null

  const rawPlayingStyle = base.playing_style || base.role || null
  const italianPlayingStyle = resolvePlayingStyleDbName(rawPlayingStyle)

  let metadata = {
    ...(base.metadata && typeof base.metadata === 'object' ? base.metadata : {}),
    source: 'screenshot_extractor',
    saved_via: 'nuova_rosa_photo'
  }

  let originalPositionsOut = resolvedPositions
  if (isStarterSlot && mainPosition) {
    const { augments } = buildSlotRoleAugmentsForStarter({
      playerRow: {
        position: mainPosition,
        original_positions: resolvedPositions,
        metadata
      },
      slotPosition: mainPosition,
      metadataBase: metadata
    })
    if (augments.metadata) metadata = augments.metadata
    if (augments.original_positions) originalPositionsOut = augments.original_positions
  }

  const mergedPhotoSlots =
    photoSlots && typeof photoSlots === 'object' && Object.keys(photoSlots).length > 0
      ? photoSlots
      : base.photo_slots

  return {
    ...base,
    position: mainPosition || base.position,
    role: italianPlayingStyle || rawPlayingStyle || base.role || null,
    playing_style: italianPlayingStyle || rawPlayingStyle || base.playing_style || null,
    original_positions: originalPositionsOut,
    refresh_original_positions: originalPositionsOut.length > 0,
    slot_index: slotIndex !== undefined ? slotIndex : base.slot_index,
    photo_slots: mergedPhotoSlots,
    skills: normalizePlayerSkillsArray(base.skills),
    com_skills: normalizePlayerSkillsArray(base.com_skills),
    metadata,
    extracted_data: {
      ...base,
      original_positions: originalPositionsOut,
      position: mainPosition || base.position,
      role: italianPlayingStyle || rawPlayingStyle || base.role || null,
      playing_style: italianPlayingStyle || rawPlayingStyle || base.playing_style || null,
      source: 'screenshot_extractor'
    }
  }
}
