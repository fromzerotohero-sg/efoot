import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true // necessario per recovery password: legge token da hash (#access_token=...&type=recovery)
        }
      })
    : null

/**
 * Restituisce un access token valido per le API (refresh + getSession).
 * Riduce 401 "Invalid or expired authentication" quando il JWT in cache è scaduto.
 * @returns {Promise<string|null>}
 */
export async function getValidAccessToken() {
  if (!supabase) return null
  try {
    await supabase.auth.refreshSession()
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token ?? null
  } catch {
    return null
  }
}

