/**
 * Ruota giornaliera: ordine visivo spicchi e pesi estrazione.
 * L'accredito usa solo reward_amount; questa config non tocca creditService.
 */

/** Ordine sulla ruota: duplicati separati da altri premi */
export const WHEEL_SEGMENTS = [5, 10, 5, 20, 5, 0, 30, 0, 10, 100]

/**
 * Pesi in unita (totale 20000 con 100 incluso).
 * 100 HP = 100/20000 = 0.5%; il resto scala la vecchia ripartizione 3:2:2:1:1.
 */
export const REWARD_WEIGHT_UNITS = {
  5: 6633,
  0: 4422,
  10: 4422,
  20: 2211,
  30: 2211,
  100: 100,
}

const UNIQUE_REWARDS = [5, 0, 10, 20, 30, 100]

/**
 * @param {{ exclude100?: boolean }} [options]
 * @returns {number}
 */
export function pickWeightedReward(options = {}) {
  const { exclude100 = false } = options
  const values = exclude100 ? UNIQUE_REWARDS.filter((v) => v !== 100) : UNIQUE_REWARDS
  let total = 0
  const entries = values.map((value) => {
    const weight = REWARD_WEIGHT_UNITS[value] ?? 0
    total += weight
    return { value, weight }
  })
  if (total <= 0) return 5

  let roll = Math.random() * total
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) return entry.value
  }
  return entries[entries.length - 1].value
}

/**
 * @param {number} value
 * @returns {number[]}
 */
export function getSegmentIndicesForValue(value) {
  const target = Number(value)
  return WHEEL_SEGMENTS.map((segmentValue, index) =>
    segmentValue === target ? index : -1,
  ).filter((index) => index >= 0)
}

/**
 * @param {number} value
 * @returns {number}
 */
export function pickRandomSegmentIndex(value) {
  const indices = getSegmentIndicesForValue(value)
  if (!indices.length) return 0
  return indices[Math.floor(Math.random() * indices.length)]
}
