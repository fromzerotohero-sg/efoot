export const PRELAUNCH_PUBLIC_PATHS = [
  '/login',
  '/login-success',
  '/forgot-password',
  '/reset-password',
  '/access',
]

export const PRELAUNCH_PUBLIC_PREFIXES = [
  '/auth/',
]

export function isPrelaunchPublicPath(pathname) {
  const normalized = pathname === '/' ? '/' : (pathname || '').replace(/\/$/, '')

  if (!normalized) return false
  if (PRELAUNCH_PUBLIC_PATHS.includes(normalized)) return true

  return PRELAUNCH_PUBLIC_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}
