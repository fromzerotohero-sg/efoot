import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'
import { validateLinkUpPlays } from '@/lib/efootballV6TacticalModel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function imageSizeOk(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return false
  const base64 = value.split(',')[1]
  if (!base64) return false
  return (base64.length * 3) / 4 <= MAX_IMAGE_BYTES
}

export async function POST(req) {
  let creditChargeContext = null
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const apiKey = process.env.OPENAI_API_KEY
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    let userId = userData.user.id
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: profile } = await admin.from('user_profiles').select('user_id').eq('metalgate_user_id', userId).maybeSingle()
      if (!profile?.user_id) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      userId = profile.user_id
    }

    const rate = await checkRateLimit(userId, '/api/tactical/extract-coach-link-ups', 8, 60_000)
    if (!rate.allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const images = Array.isArray(body.images) ? body.images.filter(Boolean).slice(0, 2) : []
    if (images.length < 1 || images.some((image) => !imageSizeOk(image))) {
      return NextResponse.json({ error: 'Provide 1 or 2 valid coach screenshots (max 10MB each).' }, { status: 400 })
    }

    const deduction = await deductCredits(admin, userId, token, AI_COST, 'extract-coach-link-ups')
    if (!deduction.success) {
      return NextResponse.json({ error: 'Crediti insufficienti. Ricarica per continuare.' }, { status: 402 })
    }
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'extract-coach-link-ups', functionName: 'extract-coach-link-ups:POST' }

    const prompt = `Analizza gli screenshot di eFootball v6 allegati e leggi ESCLUSIVAMENTE le sezioni Link-up Play / Collegamento realmente visibili dell'allenatore.

REGOLE OBBLIGATORIE:
- Non inventare un secondo Collegamento se non è visibile.
- Restituisci al massimo 2 Collegamenti.
- Non dedurre nomi, posizioni o stili mancanti.
- Ogni Collegamento è indipendente e deve contenere solo i requisiti visibili di Punto focale/Focal Point e Uomo chiave/Key Man.
- Se due screenshot mostrano lo stesso Collegamento, restituiscilo una sola volta.
- Usa null per un campo non leggibile.

JSON ESATTO:
{
  "link_up_plays": [
    {
      "name": "nome visibile",
      "description": "descrizione visibile o null",
      "focal_point": { "playing_style": "stile visibile o null", "position": "posizione visibile o null" },
      "key_man": { "playing_style": "stile visibile o null", "position": "posizione visibile o null" }
    }
  ]
}

Restituisci SOLO JSON valido.`

    const content = [
      { type: 'text', text: prompt },
      ...images.map((image) => ({ type: 'image_url', image_url: { url: image, detail: 'high' } }))
    ]

    const response = await callOpenAIWithRetry(apiKey, {
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 1400
    }, 'extract-coach-link-ups')

    const parsed = await parseOpenAIResponse(response, 'extract-coach-link-ups')
    const validation = validateLinkUpPlays(Array.isArray(parsed?.link_up_plays) ? parsed.link_up_plays : [])
    if (!validation.valid) {
      return NextResponse.json({ error: 'I Collegamenti letti non sono validi. Prova con screenshot più nitidi.' }, { status: 422 })
    }

    return NextResponse.json({ success: true, link_up_plays: validation.items, charged_hp: AI_COST })
  } catch (error) {
    console.error('[extract-coach-link-ups] error:', error)
    if (creditChargeContext) {
      try {
        return await handleCreditOperationError(error, creditChargeContext)
      } catch {}
    }
    return NextResponse.json({ error: error?.message || 'Impossibile leggere i Collegamenti.' }, { status: 500 })
  }
}
