export const PRELAUNCH_COOKIE_NAME = 'fzth_prelaunch_access'
export const PRELAUNCH_AUTH_COOKIE_NAME = 'fzth_prelaunch_auth'

export function isPrelaunchGateEnabled() {
  return false
}

export function hasPrelaunchAccess(request) {
  if (!isPrelaunchGateEnabled()) return true
  return request.cookies.get(PRELAUNCH_COOKIE_NAME)?.value === 'granted'
}

export function hasPrelaunchAuth(request) {
  return request.cookies.get(PRELAUNCH_AUTH_COOKIE_NAME)?.value === 'granted'
}

export function getPrelaunchCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}
