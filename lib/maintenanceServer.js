export const MAINTENANCE_COOKIE_NAME = 'fzth_maintenance_bypass'

export function isMaintenanceModeEnabled() {
  const raw = process.env.MAINTENANCE_MODE?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

export function hasMaintenanceBypass(request) {
  if (!isMaintenanceModeEnabled()) return true
  return request.cookies.get(MAINTENANCE_COOKIE_NAME)?.value === 'granted'
}

export function getMaintenanceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  }
}
