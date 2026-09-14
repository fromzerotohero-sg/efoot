import { getValidAccessToken } from '@/lib/supabaseClient'

export function getStoredMetalgateUserId() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('metalgate_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.metalgate_user_id || null
  } catch {
    return null
  }
}

export function isMetalgateSession() {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem('metalgate_user'))
}

export async function resolveAuthToken() {
  if (typeof window !== 'undefined') {
    const customToken = localStorage.getItem('auth_token')
    if (customToken) return customToken
  }
  return await getValidAccessToken()
}

export function buildAuthHeaders(token, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`
  }

  if (options.json) {
    headers['Content-Type'] = 'application/json'
  }

  if (isMetalgateSession()) {
    headers['X-Metalgate-Session'] = '1'
    const metalgateUserId = getStoredMetalgateUserId()
    if (metalgateUserId) {
      headers['X-Metalgate-User-Id'] = metalgateUserId
    }
  }

  return headers
}

export async function fetchCoachProfileFromApi(token) {
  const res = await fetch(`/api/supabase/save-ai-info?t=${Date.now()}`, {
    headers: buildAuthHeaders(token),
    cache: 'no-store'
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  return data?.profile || null
}
