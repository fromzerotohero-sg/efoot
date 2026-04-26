import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { extractBearerToken, validateToken } from '@/lib/authHelper'
import { isSmartEnabledServer } from '@/lib/smartCoach'

export function getPreferredLanguage(req) {
  const appLang = req?.headers?.get?.('x-app-language') || ''
  const normalizedAppLang = appLang.toLowerCase().trim()
  if (normalizedAppLang === 'en' || normalizedAppLang.startsWith('en-')) return 'en'
  if (normalizedAppLang === 'it' || normalizedAppLang.startsWith('it-')) return 'it'

  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('en') ? 'en' : 'it'
}

export function getServerClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error('Server configuration error')
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  return { supabaseUrl, anonKey, serviceKey, admin }
}

export function smartDisabledResponse() {
  return NextResponse.json({ error: 'Smart coach disabled' }, { status: 404 })
}

export async function getAuthenticatedSmartRequest(req) {
  if (!isSmartEnabledServer()) {
    return { errorResponse: smartDisabledResponse() }
  }

  let clients
  try {
    clients = getServerClients()
  } catch (error) {
    return {
      errorResponse: NextResponse.json({ error: error.message || 'Server configuration error' }, { status: 500 })
    }
  }

  const { supabaseUrl, anonKey, admin } = clients
  const token = extractBearerToken(req)

  if (!token) {
    return { errorResponse: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) {
    return { errorResponse: NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 }) }
  }

  let userId = userData.user.id

  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .single()

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id
    } else {
      return { errorResponse: NextResponse.json({ error: 'User profile not found' }, { status: 404 }) }
    }
  }

  return {
    admin,
    userId,
    token,
    lang: getPreferredLanguage(req),
    errorResponse: null
  }
}
