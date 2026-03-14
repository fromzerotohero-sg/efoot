import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { deductCredits, AI_COST } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLang(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

const ERRORS = {
  it: {
    config: 'Configurazione mancante.',
    auth: 'Autenticazione richiesta.',
    invalid: 'Token non valido o scaduto.',
    rateLimit: 'Troppe richieste. Riprova tra un minuto.',
    imageRequired: 'Immagine richiesta.',
    imageTooLarge: 'Immagine troppo grande (max 10MB).',
    extraction: 'Impossibile leggere i dati dell\'allenatore dall\'immagine. Prova con uno screenshot più nitido.',
    invalidData: 'Dati estratti non validi. Prova con un\'immagine diversa.',
    quota: 'Servizio momentaneamente sovraccarico. Riprova tra qualche minuto.',
    timeout: 'Ritardo nella risposta. Riprova tra poco.',
    server: 'Servizio temporaneamente non disponibile. Riprova tra poco.',
    network: 'Errore di connessione. Verifica la rete e riprova.'
  },
  en: {
    config: 'Server configuration missing.',
    auth: 'Authentication required.',
    invalid: 'Invalid or expired token.',
    rateLimit: 'Too many requests. Try again in a minute.',
    imageRequired: 'Image is required.',
    imageTooLarge: 'Image too large (max 10MB).',
    extraction: 'Could not read coach data from image. Try a clearer screenshot.',
    invalidData: 'Extracted data contains invalid values. Try a different image.',
    quota: 'Service temporarily overloaded. Try again in a few minutes.',
    timeout: 'Request took too long. Try again later.',
    server: 'Service temporarily unavailable. Try again later.',
    network: 'Connection error. Check your network and try again.'
  }
}

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function normalizeCoach(coach) {
  if (!coach || typeof coach !== 'object') return coach

  const normalized = { ...coach }

  // Normalizza age
  if (normalized.age !== null && normalized.age !== undefined) {
    normalized.age = toInt(normalized.age)
  }

  // Normalizza playing_style_competence (5 stili con valori numerici)
  if (normalized.playing_style_competence && typeof normalized.playing_style_competence === 'object') {
    const competence = normalized.playing_style_competence
    const normalizedCompetence = {}
    
    const styles = ['possesso_palla', 'contropiede_veloce', 'contrattacco', 'vie_laterali', 'passaggio_lungo']
    styles.forEach(style => {
      if (competence[style] !== null && competence[style] !== undefined) {
        normalizedCompetence[style] = toInt(competence[style])
      }
    })
    
    normalized.playing_style_competence = normalizedCompetence
  }

  // Normalizza stat_boosters (array di oggetti con stat_name e bonus)
  if (Array.isArray(normalized.stat_boosters)) {
    normalized.stat_boosters = normalized.stat_boosters
      .filter(b => b && typeof b === 'object' && b.stat_name && b.bonus !== undefined)
      .map(b => ({
        stat_name: String(b.stat_name || ''),
        bonus: toInt(b.bonus) || 0
      }))
      .slice(0, 10) // Max 10 booster
  }

  return normalized
}

export async function POST(req) {
  const lang = getLang(req)
  const L = ERRORS[lang] || ERRORS.en

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: L.config }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: L.auth }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)

    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: L.invalid }, { status: 401 })
    }

    let userId = userData.user.id

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: L.config }, { status: 500 })
    }

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

    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/extract-coach']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/extract-coach',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: L.rateLimit, resetAt: rateLimit.resetAt },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }

    // Check and deduct credits upfront
    const deduction = await deductCredits(admin, userId, token, AI_COST, 'extract-coach')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica.' : 'Insufficient credits. Please recharge.' },
        { status: 402, headers: { 'Content-Language': lang } }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: L.config }, { status: 500 })
    }

    const { imageDataUrl } = await req.json()

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json({ error: L.imageRequired }, { status: 400 })
    }

    if (imageDataUrl.startsWith('data:image/')) {
      const base64Image = imageDataUrl.split(',')[1]
      if (base64Image) {
        const imageSizeBytes = (base64Image.length * 3) / 4
        if (imageSizeBytes > 10 * 1024 * 1024) {
          return NextResponse.json({ error: L.imageTooLarge }, { status: 400 })
        }
      }
    }

    // Prompt per estrazione dati allenatore
    const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili dell'allenatore/manager.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai TUTTI questi dati: nome allenatore, età, nazionalità, squadra, categoria, tipo/pack

COMPETENZA STILE DI GIOCO (5 valori numerici):
Estrai i 5 valori numerici per questi stili:
- "possesso_palla" (Possesso palla / Ball Possession)
- "contropiede_veloce" (Contropiede veloce / Quick Counter)
- "contrattacco" (Contrattacco / Counter Attack)
- "vie_laterali" (Vie laterali / Wide)
- "passaggio_lungo" (Passaggio lungo / Long Ball)

AFFINITÀ DI ALLENAMENTO:
- "training_affinity_description": Descrizione testo completa (es. "Giocatori veterani+: +200% punti esperienza")
- "stat_boosters": Array di oggetti con {"stat_name": "Nome statistica", "bonus": valore numerico}
  Esempio: [{"stat_name": "Finalizzazione", "bonus": 1}, {"stat_name": "Comportamento difensivo", "bonus": 1}]

COLLEGAMENTO (opzionale - se presente):
Se c'è una sezione "Collegamento" con tatica speciale, estrai:
- "connection": {
    "name": "Nome collegamento (es. 'Passaggio sopra la testa A')",
    "description": "Descrizione completa",
    "focal_point": {
      "playing_style": "Stile di gioco (es. 'Tra le linee')",
      "position": "Posizione (es. 'MED')"
    },
    "key_man": {
      "playing_style": "Stile di gioco (es. 'Opportunista')",
      "position": "Posizione (es. 'P')"
    }
  }

Formato JSON richiesto:
{
  "coach_name": "Nome Completo Allenatore",
  "age": 45,
  "nationality": "Italia",
  "team": "AC Milan",
  "category": "Campionato italiano",
  "pack_type": "Manager Pack Fabio Capello 91-92",
  "playing_style_competence": {
    "possesso_palla": 46,
    "contropiede_veloce": 57,
    "contrattacco": 89,
    "vie_laterali": 64,
    "passaggio_lungo": 89
  },
  "training_affinity_description": "Descrizione testo completa",
  "stat_boosters": [
    {"stat_name": "Finalizzazione", "bonus": 1},
    {"stat_name": "Comportamento difensivo", "bonus": 1}
  ],
  "connection": {
    "name": "Nome collegamento",
    "description": "Descrizione completa",
    "focal_point": {
      "playing_style": "Tra le linee",
      "position": "MED"
    },
    "key_man": {
      "playing_style": "Opportunista",
      "position": "P"
    }
  }
}

Restituisci SOLO JSON valido, senza altro testo.`

    // Chiama OpenAI Vision API
    let openaiData = null
    try {
      const requestBody = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000
      }

      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, 'extract-coach')
      
      if (!openaiRes.ok) {
        const errorData = await openaiRes.json().catch(() => ({}))
        console.error('[extract-coach] OpenAI API error:', errorData)
        const status = openaiRes.status
        let msg = L.extraction
        if (status === 429) msg = L.quota
        else if (status === 408 || status === 504) msg = L.timeout
        else if (status >= 500) msg = L.server
        return NextResponse.json(
          { error: msg },
          { status: status >= 400 ? status : 500, headers: { 'Content-Language': lang } }
        )
      }

      openaiData = await openaiRes.json()
    } catch (err) {
      console.error('[extract-coach] Call error:', err)
      return NextResponse.json(
        { error: L.server },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    // Estrai contenuto JSON dalla risposta

    // Estrai contenuto JSON dalla risposta
    let coachData = null
    try {
      const content = openaiData.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse JSON dal contenuto
      coachData = JSON.parse(content)

      // Se c'è un campo "coach" nel JSON, usalo
      if (coachData.coach && typeof coachData.coach === 'object') {
        coachData = coachData.coach
      }
    } catch (parseErr) {
      console.error('[extract-coach] JSON parse error:', parseErr)
      return NextResponse.json(
        { error: L.extraction },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    // Normalizza dati
    const normalizedCoach = normalizeCoach(coachData)

    // Validazione semantica dei dati estratti
    const validationErrors = []
    
    // Validazione età: 16-70 (range realistico per allenatori)
    if (normalizedCoach.age !== null && normalizedCoach.age !== undefined) {
      const age = Number(normalizedCoach.age)
      if (isNaN(age) || age < 16 || age > 70) {
        validationErrors.push('Age must be between 16 and 70')
      }
    }
    
    // Validazione nome: formato valido (no caratteri estremi)
    if (normalizedCoach.coach_name && typeof normalizedCoach.coach_name === 'string') {
      const name = normalizedCoach.coach_name.trim()
      // Nome deve avere almeno 2 caratteri, max 100, no caratteri di controllo
      if (name.length < 2 || name.length > 100) {
        validationErrors.push('Coach name must be between 2 and 100 characters')
      } else if (/[\x00-\x1F\x7F]/.test(name)) {
        // Caratteri di controllo non permessi
        validationErrors.push('Coach name contains invalid characters')
      }
    }
    
    if (validationErrors.length > 0) {
      console.error('[extract-coach] Validation errors:', validationErrors)
      return NextResponse.json(
        { error: L.invalidData },
        { status: 400 }
      )
    }


    return NextResponse.json({
      coach: normalizedCoach
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString()
      }
    })
  } catch (err) {
    console.error('[extract-coach] Error:', err)
    return NextResponse.json(
      { error: L.extraction },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
