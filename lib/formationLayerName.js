/**
 * Nome modulo Konami da layer verticali (Y), non da ruoli slot.
 * Split per i gap Y più ampi tra giocatori consecutivi (modello layer Konami).
 */

/** Gap Y minimo per considerare una nuova linea tattica. */
export const MIN_LINE_GAP_Y = 5

function getSlotRecord(slotPositions, index) {
  if (!slotPositions || typeof slotPositions !== 'object') return null
  return slotPositions[index] ?? slotPositions[String(index)] ?? null
}

/**
 * @param {Record<string|number, { position?: string, y?: number }>} slotPositions
 * @returns {{ position: string, y: number }[]}
 */
export function extractOutfieldPlayersFromSlots(slotPositions) {
  const players = []
  for (let i = 0; i <= 10; i += 1) {
    const slot = getSlotRecord(slotPositions, i)
    if (!slot) continue
    const position = String(slot.position || '').trim().toUpperCase()
    if (!position || position === 'PT') continue
    const y = slot.y != null ? Number(slot.y) : NaN
    if (!Number.isFinite(y)) continue
    players.push({ position, y })
  }
  return players
}

/**
 * @param {{ y: number }[]} sortedPlayers - ordinati per Y desc (difesa → attacco)
 * @param {number} numLines
 * @param {number} minGap
 * @returns {{ counts: number[], breakGapSum: number }|null}
 */
export function partitionByTopYGaps(sortedPlayers, numLines, minGap = MIN_LINE_GAP_Y) {
  if (!sortedPlayers.length || numLines < 2 || numLines > sortedPlayers.length) return null

  const breakCount = numLines - 1
  const gaps = []
  for (let i = 1; i < sortedPlayers.length; i += 1) {
    const gap = sortedPlayers[i - 1].y - sortedPlayers[i].y
    if (gap >= minGap) {
      gaps.push({ index: i, gap })
    }
  }

  if (gaps.length < breakCount) return null

  const selected = [...gaps]
    .sort((a, b) => b.gap - a.gap || a.index - b.index)
    .slice(0, breakCount)

  const breakIndices = selected.map((entry) => entry.index).sort((a, b) => a - b)
  const counts = []
  let prev = 0
  for (const idx of breakIndices) {
    const size = idx - prev
    if (size <= 0) return null
    counts.push(size)
    prev = idx
  }
  counts.push(sortedPlayers.length - prev)
  if (counts.some((size) => size <= 0)) return null

  const breakGapSum = selected.reduce((sum, entry) => sum + entry.gap, 0)
  const minBreakGap = Math.min(...selected.map((entry) => entry.gap))
  return { counts, breakGapSum, minBreakGap }
}

/**
 * @param {{ y: number }[]} players
 * @returns {number[]|null}
 */
export function clusterCountsByVerticalLayers(players) {
  if (!Array.isArray(players) || players.length < 8) return null

  const sorted = [...players].sort((a, b) => b.y - a.y)
  const three = partitionByTopYGaps(sorted, 3)
  const four = partitionByTopYGaps(sorted, 4)

  const valid = [three, four].filter(Boolean)
  if (valid.length === 0) return null

  if (three && four) {
    const threeMaxLine = Math.max(...three.counts)
    const preferThree =
      threeMaxLine <= 4
      && four.minBreakGap < 7
      && three.breakGapSum >= four.breakGapSum - 8
    if (preferThree) return three.counts
    return four.breakGapSum >= three.breakGapSum ? four.counts : three.counts
  }

  return (four || three).counts
}

/**
 * @param {Record<string|number, { position?: string, y?: number }>} slotPositions
 * @param {{ minPlayersWithY?: number }} [options]
 * @returns {string|null}
 */
export function formationNameFromVerticalLayers(slotPositions, options = {}) {
  const minPlayersWithY = options.minPlayersWithY ?? 8
  const players = extractOutfieldPlayersFromSlots(slotPositions)
  if (players.length < minPlayersWithY) return null

  const counts = clusterCountsByVerticalLayers(players)
  if (!counts || counts.length < 2) return null

  return counts.join('-')
}
