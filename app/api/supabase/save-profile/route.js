import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Costanti validazione
const MAX_TEXT_LENGTH = 255
const MAX_TEXTAREA_LENGTH = 1000 // Per how_to_remember (più lungo)

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toTextArray(v) {
  if (!Array.isArray(v)) return null
  return v.filter(item => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
    .slice(0, 20) // Max 20 problemi
}

/**
 * POST /api/supabase/save-profile
 * 
 * Salva o aggiorna il profilo utente.
 * Il trigger automatico calcola profile_completion_score.
 * 
 * Input:
 * {
 *   first_name?: string,
 *   last_name?: string,
 *   current_division?: string,
 *   favorite_team?: string,
 *   team_name?: string,
 *   ai_name?: string,
 *   how_to_remember?: string,
 *   hours_per_week?: number,
 *   common_problems?: string[]
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   profile: {
 *     id: string,
 *     profile_completion_score: number,
 *     profile_completion_level: string
 *   }
 * }
 */

/** GET non supportato: usare POST per salvare. Evita 405 quando qualcosa (es. redirect) invia GET. */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to save profile.' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const metalgateSession = req.headers.get('x-metalgate-session') === '1'
    const claimedMetalgateUserId = req.headers.get('x-metalgate-user-id')
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, { forbidSupabaseFallback: metalgateSession })
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    if (metalgateSession && claimedMetalgateUserId && claimedMetalgateUserId !== userData.user.id) {
      return NextResponse.json({ error: 'Session mismatch. Please login again.' }, { status: 401 })
    }

    let userId = userData.user.id
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Se è un utente Metalgate, dobbiamo recuperare il vero user_id (Supabase UUID)
    // perché validateToken restituisce l'ID di Metalgate che non esiste in auth.users
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        console.error('[save-profile] Metalgate user profile not found for ID:', userId)
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    // Rate limiting
    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/save-profile'] || { maxRequests: 30, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/save-profile', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt }, { status: 429 })
    }
    
    // JSON parsing con gestione errore 400
    let profileData
    try {
      profileData = await req.json()
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    // Validazione e normalizzazione campi
    const profileUpdate = {
      user_id: userId
    }

    // Dati Anagrafici
    if (profileData.first_name !== undefined) {
      const firstName = toText(profileData.first_name)
      if (firstName && firstName.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ 
          error: `First name too long. Maximum ${MAX_TEXT_LENGTH} characters.` 
        }, { status: 400 })
      }
      profileUpdate.first_name = firstName
    }

    if (profileData.last_name !== undefined) {
      const lastName = toText(profileData.last_name)
      if (lastName && lastName.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ 
          error: `Last name too long. Maximum ${MAX_TEXT_LENGTH} characters.` 
        }, { status: 400 })
      }
      profileUpdate.last_name = lastName
    }

    // Dati Gioco
    if (profileData.current_division !== undefined) {
      const division = toText(profileData.current_division)
      if (division && division.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ 
          error: `Current division too long. Maximum ${MAX_TEXT_LENGTH} characters.` 
        }, { status: 400 })
      }
      profileUpdate.current_division = division
    }

    if (profileData.favorite_team !== undefined) {
      const favoriteTeam = toText(profileData.favorite_team)
      if (favoriteTeam && favoriteTeam.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ 
          error: `Favorite team too long. Maximum ${MAX_TEXT_LENGTH} characters.` 
        }, { status: 400 })
      }
      profileUpdate.favorite_team = favoriteTeam
    }

    if (profileData.team_name !== undefined) {
      const teamName = toText(profileData.team_name)
      if (teamName && teamName.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ 
          error: `Team name too long. Maximum ${MAX_TEXT_LENGTH} characters.` 
        }, { status: 400 })
      }
      profileUpdate.team_name = teamName
    }

    // Preferenze IA
    if (profileData.ai_name !== undefined) {
      const aiName = toText(profileData.ai_name)
      if (aiName && aiName.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ 
          error: `AI name too long. Maximum ${MAX_TEXT_LENGTH} characters.` 
        }, { status: 400 })
      }
      profileUpdate.ai_name = aiName
    }

    if (profileData.how_to_remember !== undefined) {
      const howToRemember = toText(profileData.how_to_remember)
      if (howToRemember && howToRemember.length > MAX_TEXTAREA_LENGTH) {
        return NextResponse.json({ 
          error: `Description too long. Maximum ${MAX_TEXTAREA_LENGTH} characters.` 
        }, { status: 400 })
      }
      profileUpdate.how_to_remember = howToRemember
    }

    // Esperienza Gioco
    if (profileData.hours_per_week !== undefined) {
      const hoursPerWeek = toInt(profileData.hours_per_week)
      if (hoursPerWeek !== null && (hoursPerWeek < 0 || hoursPerWeek > 168)) { // Max 168 ore (7 giorni × 24)
        return NextResponse.json({ 
          error: 'Hours per week must be between 0 and 168.' 
        }, { status: 400 })
      }
      profileUpdate.hours_per_week = hoursPerWeek
    }

    if (profileData.common_problems !== undefined) {
      profileUpdate.common_problems = toTextArray(profileData.common_problems)
    }

    // Upsert profilo (crea se non esiste, aggiorna se esiste)
    const { data: savedProfile, error: upsertError } = await admin
      .from('user_profiles')
      .upsert(profileUpdate, {
        onConflict: 'user_id'
      })
      .select('id, profile_completion_score, profile_completion_level, first_name, last_name, current_division, favorite_team, team_name, ai_name, how_to_remember, hours_per_week, common_problems')
      .single()

    if (upsertError) {
      console.error('[save-profile] Error upserting profile:', upsertError)
      return NextResponse.json({ 
        error: 'Unable to save profile. Please try again.' 
      }, { status: 500 })
    }

    // Log senza PII (rimosso nome utente)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-profile] Profile saved: completion_score=${savedProfile.profile_completion_score}%, level=${savedProfile.profile_completion_level}`)
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('../../../../lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[save-profile] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[save-profile] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: savedProfile.id,
        profile_completion_score: savedProfile.profile_completion_score,
        profile_completion_level: savedProfile.profile_completion_level,
        first_name: savedProfile.first_name,
        last_name: savedProfile.last_name,
        current_division: savedProfile.current_division,
        favorite_team: savedProfile.favorite_team,
        team_name: savedProfile.team_name,
        ai_name: savedProfile.ai_name,
        how_to_remember: savedProfile.how_to_remember,
        hours_per_week: savedProfile.hours_per_week,
        common_problems: savedProfile.common_problems
      }
    })

  } catch (error) {
    console.error('[save-profile] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
