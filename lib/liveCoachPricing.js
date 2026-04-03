export const LIVE_COACH_START_COST = 2
export const LIVE_COACH_MINUTE_COST = 5
export const LIVE_COACH_HEARTBEAT_INTERVAL_MS = 30000

export function getLiveCoachMinuteBlocks(elapsedMs = 0) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0
  return Math.max(0, Math.floor(elapsedMs / 60000))
}

export function getLiveCoachPricingSummary(elapsedMs = 0) {
  const minuteBlocks = getLiveCoachMinuteBlocks(elapsedMs)
  return {
    startCost: LIVE_COACH_START_COST,
    minuteBlocks,
    additionalCost: minuteBlocks * LIVE_COACH_MINUTE_COST,
    totalCost: LIVE_COACH_START_COST + (minuteBlocks * LIVE_COACH_MINUTE_COST)
  }
}
