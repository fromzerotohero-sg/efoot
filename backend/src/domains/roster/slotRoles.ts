// @ts-nocheck
const POSITION_GROUPS = [
  ['PT', 'GK'],
  ['DC', 'CB'],
  ['TD'],
  ['TS'],
  ['MED', 'DMF', 'CDM', 'DM'],
  ['CC', 'CMF', 'CM'],
  ['TRQ', 'AMF', 'AM', 'CAM'],
  ['P', 'CF', 'ST'],
  ['SP', 'SS'],
  ['CLS', 'LMF', 'LM'],
  ['CLD', 'RMF', 'RM'],
  ['ESA', 'LWF', 'LW'],
  ['EDA', 'EDE', 'RWF', 'RW']
]

const GROUP_BY_POSITION = new Map()
POSITION_GROUPS.forEach((group, index) => {
  group.forEach((position) => GROUP_BY_POSITION.set(position, index))
})

export function normalizePosition(value) {
  return String(value || '').trim().toUpperCase()
}

export function positionsAreEquivalent(left, right) {
  const a = normalizePosition(left)
  const b = normalizePosition(right)
  if (!a || !b) return false
  if (a === b) return true
  return GROUP_BY_POSITION.has(a) &&
    GROUP_BY_POSITION.get(a) === GROUP_BY_POSITION.get(b)
}

export function slotVsCardMismatch(slotPosition, originalPositions) {
  const slot = normalizePosition(slotPosition)
  if (!slot || !Array.isArray(originalPositions) || !originalPositions.length) return false
  return !originalPositions.some((entry) =>
    positionsAreEquivalent(slot, typeof entry === 'string' ? entry : entry?.position)
  )
}

export function buildSlotRoleAugments({ player, slotPosition, metadataBase, now }) {
  const row = player || {}
  const augments = {}
  let originalPositions =
    Array.isArray(row.original_positions) && row.original_positions.length
      ? row.original_positions
      : null
  if (!originalPositions && row.position) {
    originalPositions = [{ position: normalizePosition(row.position), competence: 'Alta' }]
    augments.original_positions = originalPositions
  }

  const metadata =
    metadataBase && typeof metadataBase === 'object'
      ? { ...metadataBase }
      : row.metadata && typeof row.metadata === 'object'
        ? { ...row.metadata }
        : {}
  const flagKeys = [
    'intentional_slot_vs_card',
    'intentional_slot_position',
    'intentional_slot_vs_card_at',
    'forced_out_of_role',
    'forced_slot_position'
  ]
  const hadFlags = flagKeys.some((key) => Boolean(metadata[key]))
  if (slotVsCardMismatch(slotPosition, originalPositions || [])) {
    metadata.intentional_slot_vs_card = true
    metadata.intentional_slot_position = normalizePosition(slotPosition)
    metadata.intentional_slot_vs_card_at = (now || new Date()).toISOString()
    augments.metadata = metadata
  } else if (hadFlags) {
    flagKeys.forEach((key) => delete metadata[key])
    augments.metadata = metadata
  }
  return augments
}

export function metadataAfterMovingToReserves(value) {
  const metadata = value && typeof value === 'object' ? { ...value } : {}
  const keys = [
    'intentional_slot_vs_card',
    'intentional_slot_position',
    'intentional_slot_vs_card_at',
    'forced_out_of_role',
    'forced_slot_position'
  ]
  const changed = keys.some((key) => Object.hasOwn(metadata, key))
  keys.forEach((key) => delete metadata[key])
  return changed ? metadata : undefined
}
