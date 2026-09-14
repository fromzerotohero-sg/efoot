/**
 * Resolve authenticated app user_id (Supabase or MetalGate → profile mapping).
 */
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export async function resolveHeroChatUser(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { error: 'Server not configured', status: 500 }
  }

  const token = extractBearerToken(req)
  if (!token) return { error: 'Authentication required', status: 401 }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) {
    return { error: 'Invalid or expired authentication', status: 401 }
  }

  let userId = userData.user.id
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .single()

    if (!existingProfile?.user_id) {
      return { error: 'User profile not found', status: 404 }
    }
    userId = existingProfile.user_id
  }

  return { userId, token, admin, supabaseUrl, anonKey }
}
