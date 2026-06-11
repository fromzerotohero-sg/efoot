/**
 * Ruota giornaliera: ordine visivo spicchi e pesi estrazione.
 * L'accredito usa solo reward_amount; questa config non tocca creditService.
 */

/** Ordine sulla ruota: duplicati separati da altri premi */
export const WHEEL_SEGMENTS = [5, 10, 5, 20, 5, 0, 30, 0, 10, 100]

/**
 * Pesi in unita (totale ~17020).
 * Piu peso su 5 HP; premi medi/alti e jackpot ridotti (100 ~0.12%).
 */
export const REWARD_WEIGHT_UNITS = {
  5: 9000,
  0: 3200,
  10: 2800,
  20: 1000,
  30: 1000,
  100: 20,
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
