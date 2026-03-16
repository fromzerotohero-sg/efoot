import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROFILE_SELECT_FIELDS = [
  // Identita e metadati
  'id',
  'user_id',
  'metalgate_user_id',
  'is_metalgate_user',
  'created_at',
  'updated_at',
  // Dati personali
  'first_name',
  'last_name',
  // Dati gioco
  'current_division',
  'favorite_team',
  'team_name',
  // Preferenze IA
  'ai_name',
  'how_to_remember',
  // Esperienza gioco
  'hours_per_week',
  'common_problems',
  // Classifica
  'leaderboard_consent',
  'nickname',
  // Profilazione
  'profile_completion_score',
  'profile_completion_level',
  'ai_knowledge_score',
  // Dati tecnici coach
  'platform',
  'connection_quality',
  'pass_level',
  'ai_weak_point'
].join(', ')

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const metalgateSession = request.headers.get('x-metalgate-session') === '1'
    const claimedMetalgateUserId = request.headers.get('x-metalgate-user-id')
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, { forbidSupabaseFallback: metalgateSession })
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (metalgateSession && claimedMetalgateUserId && claimedMetalgateUserId !== userData.user.id) {
      return NextResponse.json({ error: 'Session mismatch. Please login again.' }, { status: 401 })
    }

    let userId = userData.user.id

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT_FIELDS)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json(profile || {}, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
