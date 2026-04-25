import { NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { deductCredits, refundCredits } from '@/lib/creditService'
import { getAuthenticatedSmartRequest } from '@/lib/smartCoachServer'
import { normalizeSmartPlayers } from '@/lib/smartCoach'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ERRORS = {
  it: {
    imageRequired: 'Immagine richiesta.',
    imageTooLarge: 'Immagine troppo grande (max 10MB).',
    extraction: 'Impossibile leggere bene la formazione Smart. Prova con uno screenshot più nitido.',
    server: 'Servizio Smart temporaneamente non disponibile.'
  },
  en: {
    imageRequired: 'Image is required.',
    imageTooLarge: 'Image too large (max 10MB).',
    extraction: 'Could not read the Smart formation clearly. Try a sharper screenshot.',
    server: 'Smart service temporarily unavailable.'
  }
}

export async function POST(req) {
  const auth = await getAuthenticatedSmartRequest(req)
  if (auth.errorResponse) return auth.errorResponse

  const { admin, userId, token, lang } = auth
  const L = ERRORS[lang] || ERRORS.it
  let charged = false
  const operationType = 'smart-extract-formation'
  const cost = 2

  try {
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/smart/extract-formation']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/smart/extract-formation',
      rateLimitConfig?.maxRequests,
      rateLimitConfig?.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: lang === 'en' ? 'Too many requests' : 'Troppe richieste' }, { status: 429 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: L.server }, { status: 500 })
    }

    const { imageDataUrl } = await req.json().catch(() => ({}))
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

    const deduction = await deductCredits(admin, userId, token, cost, operationType)
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402 }
      )
    }
    charged = true

    const prompt = `Analizza questo screenshot di eFootball che mostra la squadra del cliente in vista 2D.

Obiettivo SMART:
- riconoscere il modulo se leggibile
- riconoscere i titolari visibili
- riconoscere l'allenatore se visibile
- NON inventare dati non visibili

Per ogni giocatore estrai se possibile:
- player_name
- slot_index (0-10 in ordine logico sul campo)
- position
- overall_rating
- team
- nationality
- player_face_description

Allenatore (solo se visibile):
- coach_name
- age
- nationality
- team
- category
- pack_type

Rispondi SOLO con JSON valido:
{
  "formation": "4-3-1-2",
  "players": [
    {
      "player_name": "Nome",
      "slot_index": 0,
      "position": "PT",
      "overall_rating": 100,
      "team": "Club",
      "nationality": "Country",
      "player_face_description": "optional"
    }
  ],
  "coach": {
    "coach_name": "Nome Allenatore",
    "age": 45,
    "nationality": "Italia",
    "team": "Barcellona",
    "category": "optional",
    "pack_type": "optional"
  }
}`

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
      max_tokens: 3000
    }

    const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, 'smart-extract-formation')
    const formationData = await parseOpenAIResponse(openaiRes, 'smart-extract-formation')
    const players = normalizeSmartPlayers(formationData.players)

    return NextResponse.json({
      formation: typeof formationData.formation === 'string' ? formationData.formation.trim() : null,
      players,
      coach: formationData.coach && typeof formationData.coach === 'object' ? formationData.coach : null,
      extraction_meta: {
        detected_players: players.length,
        extracted_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('[smart/extract-formation] Error:', error)
    if (charged) {
      await refundCredits(admin, userId, cost, operationType)
    }
    return NextResponse.json({ error: L.extraction }, { status: 500 })
  }
}
