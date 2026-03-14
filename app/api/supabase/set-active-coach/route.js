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

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
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

    // Rate limiting
    const rlConfig = RATE_LIMIT_CONFIG['/api/supabase/set-active-coach'] || { maxRequests: 20, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/supabase/set-active-coach', rlConfig.maxRequests, rlConfig.windowMs)
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
    const { coach_id } = requestBody

    if (!coach_id || typeof coach_id !== 'string') {
      return NextResponse.json({ error: 'coach_id is required' }, { status: 400 })
    }
    
    // Verifica che l'allenatore appartenga all'utente

    // Verifica che l'allenatore appartenga all'utente
    const { data: coach, error: fetchError } = await admin
      .from('coaches')
      .select('id, user_id')
      .eq('id', coach_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !coach) {
      return NextResponse.json({ error: 'Coach not found or access denied' }, { status: 404 })
    }

    // Disattiva tutti gli altri allenatori dell'utente (transazione atomica)
    const { error: deactivateError } = await admin
      .from('coaches')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('id', coach_id)

    if (deactivateError) {
      console.error('[set-active-coach] Deactivate error:', deactivateError)
      return NextResponse.json(
        { error: `Failed to deactivate other coaches: ${deactivateError.message}` },
        { status: 500 }
      )
    }

    // Attiva l'allenatore selezionato
    const { error: activateError } = await admin
      .from('coaches')
      .update({ is_active: true })
      .eq('id', coach_id)
      .eq('user_id', userId)

    if (activateError) {
      console.error('[set-active-coach] Activate error:', activateError)
      return NextResponse.json(
        { error: `Failed to activate coach: ${activateError.message}` },
        { status: 500 }
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[set-active-coach] Coach activated: id=${coach_id}`)
    }

    // Aggiorna AI Knowledge Score (async, non blocca risposta)
    if (supabaseUrl && serviceKey) {
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[set-active-coach] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[set-active-coach] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return NextResponse.json({
      success: true,
      coach_id: coach_id
    })
  } catch (e) {
    console.error('[set-active-coach] Error:', e)
    const lang = getLang(req)
    return NextResponse.json(
      { error: e?.message || SERVER_ERROR[lang] },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
