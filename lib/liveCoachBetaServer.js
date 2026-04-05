export const LIVE_COACH_BETA_COOKIE_NAME = 'fzth_live_coach_beta_access'

export function isLiveCoachBetaGateEnabled() {
  return Boolean(process.env.LIVE_COACH_BETA_ACCESS_CODE && process.env.LIVE_COACH_BETA_ACCESS_CODE.trim())
}

export function hasLiveCoachBetaAccess(request) {
  if (!isLiveCoachBetaGateEnabled()) return true
  return request.cookies.get(LIVE_COACH_BETA_COOKIE_NAME)?.value === 'granted'
}

export function getLiveCoachBetaCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}
