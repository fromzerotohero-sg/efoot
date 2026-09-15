/**
 * Notifiche in-app (campanella).
 * Inserisce righe in public.notifications lato server (service role, bypassa RLS).
 * Rispetta le preferenze utente (user_profiles.notification_prefs): chiave assente = ON,
 * prefs[type] === false = opt-out → skip insert.
 * Fail-soft: non lancia mai; logga e ritorna { ok: false }.
 */

import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

/**
 * @param {string} userId - user_profiles.user_id (Supabase auth uid; stesso id usato da daily_spin_claims ecc.)
 * @param {{ type: string, title: string, body?: string|null, href?: string|null }} payload
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function notifyUser(userId, { type, title, body = null, href = null } = {}) {
  try {
    if (!userId || !type || !title) {
      return { ok: false, error: 'Invalid parameters' }
    }
    const admin = getAdminClient()
    if (!admin) {
      console.error('[notifyUser] Supabase not configured')
      return { ok: false, error: 'Supabase not configured' }
    }

    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('notification_prefs')
      .eq('user_id', userId)
      .maybeSingle()
    if (profileError) {
      // Fail-open sulle prefs: meglio notificare che perdere la notifica
      console.error('[notifyUser] prefs read error:', profileError.message)
    }

    const prefs = profile?.notification_prefs
    if (prefs && typeof prefs === 'object' && prefs[type] === false) {
      return { ok: true, skipped: true }
    }

    const { error } = await admin.from('notifications').insert({
      user_id: userId,
      type: String(type),
      title: String(title),
      body: body != null ? String(body) : null,
      href: href != null ? String(href) : null
    })
    if (error) {
      console.error('[notifyUser] insert error:', error.message)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error('[notifyUser] exception:', err?.message || err)
    return { ok: false, error: err?.message || String(err) }
  }
}

/**
 * Invia la stessa notifica a più utenti (sequenziale, fail-soft per singolo utente).
 * @param {string[]} userIds
 * @param {{ type: string, title: string, body?: string|null, href?: string|null }} payload
 */
export async function notifyUsers(userIds, payload) {
  const results = []
  for (const userId of Array.isArray(userIds) ? userIds : []) {
    results.push(await notifyUser(userId, payload))
  }
  return results
}
