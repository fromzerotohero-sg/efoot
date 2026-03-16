import { getValidAccessToken } from '@/lib/supabaseClient'

export const EMPTY_PROFILE_FORM = {
  first_name: '',
  last_name: '',
  current_division: '',
  favorite_team: '',
  team_name: '',
  ai_name: '',
  how_to_remember: '',
  hours_per_week: null,
  common_problems: [],
  leaderboard_consent: false,
  nickname: ''
}

export function mapApiProfileToForm(apiProfile) {
  return {
    first_name: apiProfile?.first_name || '',
    last_name: apiProfile?.last_name || '',
    current_division: apiProfile?.current_division || '',
    favorite_team: apiProfile?.favorite_team || '',
    team_name: apiProfile?.team_name || '',
    ai_name: apiProfile?.ai_name || '',
    how_to_remember: apiProfile?.how_to_remember || '',
    hours_per_week: apiProfile?.hours_per_week ?? null,
    common_problems: apiProfile?.common_problems || [],
    leaderboard_consent: Boolean(apiProfile?.leaderboard_consent),
    nickname: apiProfile?.nickname || ''
  }
}

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

export async function fetchProfileFromApi(token, options = {}) {
  const query = options.cacheBuster === false ? '' : `?t=${Date.now()}`
  return await fetch(`/api/user/profile${query}`, {
    headers: buildAuthHeaders(token),
    cache: 'no-store'
  })
}
