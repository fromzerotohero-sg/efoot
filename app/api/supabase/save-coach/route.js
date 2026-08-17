import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLang(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

const SERVER_ERROR = { it: 'Errore server', en: 'Server error' }

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
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
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
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
        console.error('[save-coach] Metalgate user profile not found for ID:', userId)
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    // Rate limiting
    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/save-coach'] || { maxRequests: 20, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/save-coach', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt }, { status: 429 })
    }
    
    // JSON parsing con gestione errore 400
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    const { coach } = requestBody

    if (!coach || !coach.coach_name) {
      return NextResponse.json({ error: 'Coach data is required' }, { status: 400 })
    }

    // Validazione lunghezza campi testo (max 255 caratteri)
    const MAX_TEXT_LENGTH = 255
    if (coach.coach_name && toText(coach.coach_name) && toText(coach.coach_name).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `coach_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (coach.team && toText(coach.team) && toText(coach.team).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `team exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (coach.nationality && toText(coach.nationality) && toText(coach.nationality).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `nationality exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // Prepara dati allenatore
    const coachData = {
      user_id: userId,
      coach_name: toText(coach.coach_name),
      age: toInt(coach.age),
      nationality: toText(coach.nationality),
      team: toText(coach.team),
      category: toText(coach.category),
      pack_type: toText(coach.pack_type),
      playing_style_competence: coach.playing_style_competence && typeof coach.playing_style_competence === 'object' 
        ? coach.playing_style_competence 
        : {},
      training_affinity_description: toText(coach.training_affinity_description),
      stat_boosters: Array.isArray(coach.stat_boosters) ? coach.stat_boosters : [],
      connection: coach.connection && typeof coach.connection === 'object' ? coach.connection : null,
      photo_slots: coach.photo_slots && typeof coach.photo_slots === 'object' 
        ? coach.photo_slots 
        : {},
      extracted_data: coach
    }

    const catalogId = toText(coach?.source_catalog?.catalog_id)
    if (catalogId) {
      const { data: existingCoach, error: existingError } = await admin
        .from('coaches')
        .select('id, user_id, coach_name, is_active')
        .eq('user_id', userId)
        .contains('extracted_data', { source_catalog: { catalog_id: catalogId } })
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingError) {
        console.error('[save-coach] Existing catalog coach lookup error:', existingError.message)
        return NextResponse.json(
          { error: `Failed to check existing coach: ${existingError.message}` },
          { status: 500 }
        )
      }

      if (existingCoach?.id) {
        const { error: updateError } = await admin
          .from('coaches')
          .update(coachData)
          .eq('id', existingCoach.id)
          .eq('user_id', userId)

        if (updateError) {
          console.error('[save-coach] Catalog coach update error:', updateError.message)
          return NextResponse.json(
            { error: `Failed to update coach: ${updateError.message}` },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          coach_id: existingCoach.id,
          is_new: false
        })
      }
    }

    // Inserisci nuovo allenatore (log senza PII in produzione)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-coach] Inserting coach for user_id: ${userId}`)
    }
    const { data: inserted, error: insertErr } = await admin
      .from('coaches')
      .insert({ ...coachData, is_active: false })
      .select('id, user_id, coach_name')
      .single()

    if (insertErr) {
      console.error('[save-coach] Insert error:', insertErr.message)
      return NextResponse.json(
        { error: `Failed to create coach: ${insertErr.message}` },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[save-coach] Coach saved: id=${inserted.id}`)
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[save-coach] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[save-coach] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })

    }

    return NextResponse.json({
      success: true,
      coach_id: inserted.id,
      is_new: true
    })
  } catch (e) {
    console.error('[save-coach] Error:', e)
    const lang = getLang(req)
    return NextResponse.json(
      { error: e?.message || SERVER_ERROR[lang] },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
