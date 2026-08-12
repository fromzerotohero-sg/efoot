export const MAINTENANCE_PUBLIC_PATHS = [
  '/maintenance',
  '/login',
  '/login-success',
  '/forgot-password',
  '/reset-password',
  '/access',
]

export const MAINTENANCE_PUBLIC_PREFIXES = [
  '/auth/',
  '/api/maintenance/',
]

export function isMaintenancePublicPath(pathname) {
  const normalized = pathname === '/' ? '/' : (pathname || '').replace(/\/$/, '')

  if (!normalized) return false
  if (MAINTENANCE_PUBLIC_PATHS.includes(normalized)) return true

  return MAINTENANCE_PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}
