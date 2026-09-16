/** Soft readiness nudge: dismissable, never blocking. */

export const COACH_NUDGE_STORAGE_KEY = 'coach_readiness_nudge_v1'
export const COACH_NUDGE_SESSION_KEY = 'coach_readiness_nudge_session_v1'

const LATER_MS = 3 * 24 * 60 * 60 * 1000

/** States that can show a soft coach nudge (not OPERATIONAL). */
export const NUDGEABLE_STATES = new Set([
  'NEW',
  'ROSTER_INCOMPLETE',
  'NO_COACH',
  'POST_MATCH',
  'PROFILE_THIN',
  'READY_NO_STATS',
  'STALE_STATS',
])

function readMap(storage, key) {
  if (typeof window === 'undefined' || !storage) return {}
  try {
    const raw = storage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(storage, key, map) {
  if (typeof window === 'undefined' || !storage) return
  try {
    storage.setItem(key, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} homeState
 * @returns {boolean}
 */
export function isReadinessNudgeDismissed(homeState) {
  if (!homeState || !NUDGEABLE_STATES.has(homeState)) return true
  if (typeof window === 'undefined') return false

  const session = readMap(sessionStorage, COACH_NUDGE_SESSION_KEY)
  if (session[homeState] === true) return true

  const lasting = readMap(localStorage, COACH_NUDGE_STORAGE_KEY)
  const until = lasting[homeState]
  if (typeof until === 'number' && Date.now() < until) return true
  return false
}

/**
 * @param {string} homeState
 * @param {'session' | 'later'} mode
 */
export function dismissReadinessNudge(homeState, mode = 'session') {
  if (!homeState || typeof window === 'undefined') return
  if (mode === 'later') {
    const lasting = readMap(localStorage, COACH_NUDGE_STORAGE_KEY)
    lasting[homeState] = Date.now() + LATER_MS
    writeMap(localStorage, COACH_NUDGE_STORAGE_KEY, lasting)
    return
  }
  const session = readMap(sessionStorage, COACH_NUDGE_SESSION_KEY)
  session[homeState] = true
  writeMap(sessionStorage, COACH_NUDGE_SESSION_KEY, session)
}
