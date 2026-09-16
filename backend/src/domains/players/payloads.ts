// @ts-nocheck
import {
  MAX_ADDITIONAL_SKILLS,
  domainError,
  isCatalogPlayerSave,
  mergeV6Styles,
  normalizeOriginalPositions,
  normalizePlayerSkillsArray,
  omitClientFlags,
  playerStyleContract,
  toInt,
  toText
} from './contracts.js'
import {
  buildSlotRoleAugments,
  metadataAfterMovingToReserves
} from '../roster/slotRoles.js'
import { enrichPlayerMetadataWithCardImage } from '../../../../lib/playerCardImage.js'

const MAX_TEXT_LENGTH = 255
const BASE_STAT_BUCKETS = ['attacking', 'defending', 'athleticism', 'goalkeeping']

export function mergePlayerBaseStats(existing, patch) {
  const base = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && BASE_STAT_BUCKETS.includes(key)) {
      const previous =
        base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])
          ? base[key]
          : {}
      next[key] = { ...previous, ...value }
    } else if (value !== undefined) {
      next[key] = value
    }
  }
  return next
}

function assertTextLengths(player) {
  for (const field of ['player_name', 'team', 'nationality', 'club_name']) {
    const value = toText(player[field])
    if (value && value.length > MAX_TEXT_LENGTH) {
      throw domainError(`${field} exceeds maximum length (${MAX_TEXT_LENGTH} characters)`)
    }
  }
}

function skillsContract(player, existingMetadata = {}) {
  const requestMetadata =
    player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const native = normalizePlayerSkillsArray(
    Array.isArray(player.native_skills)
      ? player.native_skills
      : Array.isArray(requestMetadata.native_skills)
        ? requestMetadata.native_skills
        : existingMetadata.native_skills
  )
  const nativeKeys = new Set(native.map((skill) => skill.toLowerCase()))
  const additional = normalizePlayerSkillsArray(
    Array.isArray(player.additional_skills)
      ? player.additional_skills
      : requestMetadata.additional_skills
  ).filter((skill) => !nativeKeys.has(skill.toLowerCase()))
  if (additional.length > MAX_ADDITIONAL_SKILLS) {
    throw domainError(`A player can have at most ${MAX_ADDITIONAL_SKILLS} additional skills`)
  }
  return { native, additional }
}

export function buildPlayerInsert(player, { userId, styleId = null, styleName = null, now = new Date() }) {
  if (!player || !toText(player.player_name)) throw domainError('Player data is required')
  assertTextLengths(player)
  const fromCatalog = isCatalogPlayerSave(player)
  const { native, additional } = skillsContract(player)
  const inputSkills = normalizePlayerSkillsArray(player.skills)
  const skills = native.length || additional.length
    ? normalizePlayerSkillsArray([...native, ...additional])
    : inputSkills
  const position = toText(player.position)
  const originalPositions = normalizeOriginalPositions(player.original_positions, position)
  const metadataInput = {
    ...(player.metadata && typeof player.metadata === 'object' ? player.metadata : {}),
    source: fromCatalog ? 'player_catalog' : (player.metadata?.source || 'screenshot_extractor'),
    saved_at: now.toISOString(),
    native_skills: native,
    additional_skills: additional
  }
  const metadata = enrichPlayerMetadataWithCardImage(
    player,
    mergeV6Styles(metadataInput, player)
  )
  const styleContract = playerStyleContract(player)
  const requestedSlot = Number(player.slot_index)
  const slotIndex =
    player.slot_index !== undefined &&
    player.slot_index !== null &&
    Number.isFinite(requestedSlot)
      ? Math.max(0, Math.min(10, Math.trunc(requestedSlot)))
      : null

  return {
    user_id: userId,
    player_name: toText(player.player_name),
    position,
    card_type: toText(player.card_type),
    team: toText(player.team),
    overall_rating: typeof player.overall_rating === 'number'
      ? player.overall_rating
      : toInt(player.overall_rating),
    base_stats: player.base_stats && typeof player.base_stats === 'object' ? player.base_stats : {},
    skills,
    com_skills: normalizePlayerSkillsArray(player.com_skills),
    position_ratings:
      player.position_ratings && typeof player.position_ratings === 'object'
        ? player.position_ratings
        : {},
    available_boosters: Array.isArray(player.boosters)
      ? player.boosters
      : Array.isArray(player.available_boosters) ? player.available_boosters : [],
    height: toInt(player.height_cm ?? player.height),
    weight: toInt(player.weight_kg ?? player.weight),
    age: toInt(player.age),
    nationality: toText(player.nationality) || toText(player.region_or_nationality),
    club_name: toText(player.club_name),
    form: toText(player.form),
    role: styleName || styleContract.attack || toText(player.role),
    playing_style_id: styleId,
    current_level: toInt(player.level_current ?? player.current_level),
    level_cap: toInt(player.level_cap),
    active_booster_name:
      toText(player.active_booster_name) ||
      (Array.isArray(player.boosters) ? toText(player.boosters[0]?.name) : null),
    development_points:
      player.development_points && typeof player.development_points === 'object'
        ? player.development_points
        : {},
    extracted_data: omitClientFlags(player),
    metadata,
    slot_index: slotIndex,
    photo_slots:
      player.photo_slots && typeof player.photo_slots === 'object' && Object.keys(player.photo_slots).length
        ? player.photo_slots
        : null,
    original_positions: originalPositions
  }
}

export function buildPlayerPatch(existing, body, { styleId, styleName, slotPosition, now = new Date() } = {}) {
  const patch = {}
  const textFields = ['player_name', 'position', 'card_type', 'nationality', 'club_name', 'role']
  const numberFields = ['overall_rating', 'age', 'level_cap', 'current_level']
  for (const field of textFields) {
    if (body[field] !== undefined) patch[field] = toText(body[field]) || existing[field]
  }
  for (const field of numberFields) {
    if (body[field] !== undefined) patch[field] = toInt(body[field]) ?? existing[field]
  }
  if (styleId !== undefined && styleId !== null) patch.playing_style_id = styleId
  if (styleName) patch.role = styleName

  if (body.base_stats !== undefined) {
    patch.base_stats = body.base_stats && typeof body.base_stats === 'object' && Object.keys(body.base_stats).length
      ? mergePlayerBaseStats(existing.base_stats, body.base_stats)
      : existing.base_stats
  }
  const existingMetadata =
    existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}
  const hasSkillContract =
    Array.isArray(existingMetadata.native_skills) ||
    Array.isArray(body.native_skills) ||
    Array.isArray(body.additional_skills) ||
    Array.isArray(body.metadata?.native_skills) ||
    Array.isArray(body.metadata?.additional_skills)
  if (body.skills !== undefined || hasSkillContract) {
    const { native, additional } = skillsContract(body, existingMetadata)
    patch.skills = hasSkillContract
      ? normalizePlayerSkillsArray([...native, ...additional])
      : normalizePlayerSkillsArray([
          ...(Array.isArray(existing.skills) ? existing.skills : []),
          ...(Array.isArray(body.skills) ? body.skills : [])
        ])
  }
  if (body.com_skills !== undefined) {
    patch.com_skills = normalizePlayerSkillsArray([
      ...(Array.isArray(existing.com_skills) ? existing.com_skills : []),
      ...(Array.isArray(body.com_skills) ? body.com_skills : [])
    ])
  }
  for (const field of ['available_boosters']) {
    if (body[field] !== undefined) {
      patch[field] = Array.isArray(body[field]) && body[field].length ? body[field] : existing[field]
    }
  }
  if (body.active_booster_name !== undefined) patch.active_booster_name = toText(body.active_booster_name)
  for (const field of ['photo_slots', 'development_points', 'position_ratings']) {
    if (body[field] !== undefined) {
      patch[field] =
        body[field] && typeof body[field] === 'object' && !Array.isArray(body[field]) && Object.keys(body[field]).length
          ? { ...(existing[field] || {}), ...body[field] }
          : existing[field]
    }
  }
  if (body.original_positions !== undefined) {
    patch.original_positions = Array.isArray(body.original_positions) && body.original_positions.length
      ? normalizeOriginalPositions(body.original_positions)
      : existing.original_positions
  }
  if (body.slot_index !== undefined) {
    const raw = body.slot_index
    const number = Number(raw)
    patch.slot_index =
      raw === null || raw === '' || !Number.isFinite(number) || number < 0 || number > 10
        ? null
        : number
  }

  let metadata = {
    ...existingMetadata,
    ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {})
  }
  metadata = mergeV6Styles(metadata, { ...existing, ...body })
  if (patch.slot_index === null) {
    patch.metadata = metadataAfterMovingToReserves(metadata) || metadata
  } else if (patch.slot_index != null || slotPosition) {
    const augments = buildSlotRoleAugments({
      player: {
        ...existing,
        position: patch.position ?? existing.position,
        original_positions: patch.original_positions ?? existing.original_positions,
        metadata
      },
      slotPosition,
      metadataBase: metadata,
      now
    })
    patch.metadata = augments.metadata || metadata
    if (augments.original_positions && patch.original_positions === undefined) {
      patch.original_positions = augments.original_positions
    }
  } else if (body.metadata !== undefined || body.playing_styles || body.attacking_playing_style || body.defensive_playing_style) {
    patch.metadata = metadata
  }
  patch.updated_at = now.toISOString()
  return patch
}
