/**
 * Dopo login: dashboard se tutto ok, altrimenti pagina manutenzione.
 * @returns {Promise<'/'|'/maintenance'>}
 */
export async function getPostLoginDestination() {
  try {
    const response = await fetch('/api/maintenance/status', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    const payload = await response.json().catch(() => ({}))
    if (payload?.maintenanceEnabled && !payload?.hasBypass) {
      return '/maintenance'
    }
  } catch (error) {
    console.error('[postLoginRedirect] maintenance check failed:', error)
  }

  return '/'
}
