import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'

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
    extraction: 'Impossibile leggere la formazione dall\'immagine. Prova con uno screenshot più nitido.',
    quota: 'Servizio momentaneamente sovraccarico. Riprova tra qualche minuto.',
    timeout: 'Ritardo nella risposta. Riprova con un\'immagine più piccola.',
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
    extraction: 'Could not read formation from image. Try a clearer screenshot.',
    quota: 'Service temporarily overloaded. Try again in a few minutes.',
    timeout: 'Request took too long. Try a smaller image.',
    server: 'Service temporarily unavailable. Try again later.',
    network: 'Connection error. Check your network and try again.'
  }
}

export async function POST(req) {
  const lang = getLang(req)
  const L = ERRORS[lang] || ERRORS.en
  let creditChargeContext = null

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

    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/extract-formation']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/extract-formation',
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

    const deduction = await deductCredits(admin, userId, token, AI_COST, 'extract-formation')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402, headers: { 'Content-Language': lang } }
      )
    }
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'extract-formation', functionName: 'extract-formation:POST' }

    // Prompt per estrazione formazione completa (11 giocatori + allenatore opzionale)
    const prompt = `Analizza questo screenshot di eFootball che mostra una formazione completa con 11 giocatori sul campo.

IMPORTANTE:
- Identifica TUTTI gli 11 giocatori visibili sul campo (formazione completa)
- Per ogni giocatore, estrai: nome giocatore, posizione sul campo (slot_index 0-10), posizione giocatore (CF, MF, ecc.), overall rating, team, nationality (se visibile)
- Lo slot_index deve essere basato sulla posizione sul campo:
  * Portiere (PT): slot_index = 0
  * Difensori (DC, TS, TD): slot_index = 1-4 (da sinistra a destra)
  * Centrocampisti (MED, CC, CCB, TRQ, ESA): slot_index = 5-8 (da sinistra a destra)
  * Attaccanti (SP, CF, CLD, CLS): slot_index = 9-10 (da sinistra a destra)
- Estrai anche la formazione (es. "4-2-1-3", "4-3-3", ecc.) se visibile
- Se vedi il volto/faccia del giocatore nella card, indicane la descrizione visiva

ALLENATORE (OPZIONALE - Solo se presente):
- A volte nella schermata è presente anche l'allenatore/manager
- L'allenatore è solitamente visibile in una sezione separata (sidebar, in basso, o in un box dedicato)
- L'allenatore NON è uno dei giocatori sul campo - è una figura separata con card/stats diverse
- Se vedi l'allenatore, estrai: nome allenatore, età, nazionalità, squadra, categoria, pack_type (se visibile)
- Se NON vedi l'allenatore nella schermata, usa null per il campo "coach" (NON è un errore)
- IMPORTANTE: Se l'allenatore non è visibile, NON inventare dati - usa null

Formato JSON richiesto:
{
  "formation": "4-2-1-3",
  "players": [
    {
      "player_name": "Nome Completo",
      "slot_index": 0,
      "position": "PT",
      "overall_rating": 95,
      "team": "Team Name",
      "nationality": "Country (se visibile)",
      "player_face_description": "Descrizione volto se visibile (colore pelle, capelli, caratteristiche distintive)"
    },
    // ... altri 10 giocatori
  ],
  "coach": {
    "coach_name": "Nome Allenatore",
    "age": 45,
    "nationality": "Italia",
    "team": "AC Milan",
    "category": "Campionato italiano",
    "pack_type": "Manager Pack (se visibile)"
  }
}

IMPORTANTE:
- Il campo "coach" deve essere null se l'allenatore NON è visibile nella schermata
- Assicurati che ci siano ESATTAMENTE 11 giocatori nell'array "players"
- Se vedi meno di 11 giocatori, indica solo quelli visibili (ma avvisa nel campo "note" se presente)

Restituisci SOLO JSON valido, senza altro testo.`

    // Chiama OpenAI Vision API con retry e timeout
    let formationData = null
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
        max_tokens: 4500 // Più token per 11 giocatori + allenatore opzionale
      }

      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, 'extract-formation')
      formationData = await parseOpenAIResponse(openaiRes, 'extract-formation')

      // Valida che ci siano 11 giocatori (o almeno alcuni)
      if (!formationData.players || !Array.isArray(formationData.players)) {
        console.warn(`[extract-formation] No players array found`)
        formationData.players = []
      } else if (formationData.players.length !== 11) {
        console.warn(`[extract-formation] Expected 11 players, got ${formationData.players.length}`)
        // Non blocco, ma avverto - potrebbe essere formazione parziale
      }

      // Normalizza coach (può essere null se non presente)
      if (formationData.coach && typeof formationData.coach === 'object') {
        // Valida campi coach base
        if (!formationData.coach.coach_name || typeof formationData.coach.coach_name !== 'string') {
          console.warn(`[extract-formation] Coach present but missing coach_name, setting to null`)
          formationData.coach = null
        }
      } else if (formationData.coach !== null && formationData.coach !== undefined) {
        // Coach non è null/undefined ma non è un oggetto valido
        console.warn(`[extract-formation] Invalid coach format, setting to null`)
        formationData.coach = null
      }

      // Normalizza slot_index per essere sicuri che siano 0-10 e UNIVOCI
      // IMPORTANTE: Il constraint UNIQUE (user_id, slot_index) richiede slot_index univoci
      if (formationData.players && Array.isArray(formationData.players)) {
        const usedSlots = new Set()
        const maxSlots = 11 // 0-10
        
        formationData.players = formationData.players.map((player, index) => {
          let slotIndex = player.slot_index !== undefined 
            ? Math.max(0, Math.min(10, Number(player.slot_index))) 
            : index
          
          // Se slot già usato, trova primo slot disponibile
          if (usedSlots.has(slotIndex)) {
            // Cerca primo slot disponibile da 0 a 10
            for (let i = 0; i < maxSlots; i++) {
              if (!usedSlots.has(i)) {
                slotIndex = i
                break
              }
            }
            // Se tutti gli slot sono occupati, usa l'indice dell'array (non dovrebbe mai succedere con 11 giocatori)
            if (usedSlots.has(slotIndex)) {
              slotIndex = Math.min(index, 10)
            }
          }
          
          usedSlots.add(slotIndex)
          
          return {
            ...player,
            slot_index: slotIndex
          }
        })
      }
      
      // Validazione semantica formazione
      const validFormations = [
        '4-3-3', '4-4-2', '4-2-1-3', '4-1-2-3', '4-3-1-2', '4-2-3-1', '4-1-4-1',
        '3-4-3', '3-5-2', '3-4-1-2', '3-1-4-2',
        '5-3-2', '5-4-1',
        '4-5-1', '4-1-3-2',
        '3-3-2-2', '4-2-2-2'
      ]
      
      if (formationData.formation && typeof formationData.formation === 'string') {
        const formation = formationData.formation.trim()
        // Valida formato formazione (es. "4-3-3", non "5-5-5" o "999-999")
        const formationPattern = /^\d+-\d+(-\d+)?(-\d+)?$/
        if (!formationPattern.test(formation)) {
          console.warn(`[extract-formation] Invalid formation format: ${formation}`)
          formationData.formation = null // Rimuovi formazione non valida
        } else if (!validFormations.includes(formation)) {
          // Formazione non nella lista valida, ma formato corretto - avvisa ma non blocca
          console.warn(`[extract-formation] Formation "${formation}" not in valid list, but format is correct`)
        }
      }
      
      // Validazione giocatori nella formazione
      if (formationData.players && Array.isArray(formationData.players)) {
        formationData.players.forEach((player, index) => {
          // Validazione overall_rating per ogni giocatore
          // FIX: Supporta valori fino a 110 (con boosters applicati)
          if (player.overall_rating !== null && player.overall_rating !== undefined) {
            const rating = Number(player.overall_rating)
            if (isNaN(rating) || rating < 40 || rating > 110) {
              console.warn(`[extract-formation] Invalid rating for player ${index}: ${player.overall_rating}`)
              player.overall_rating = null // Rimuovi rating non valido
            }
          }
          
          // Validazione nome giocatore
          if (player.player_name && typeof player.player_name === 'string') {
            const name = player.player_name.trim()
            if (name.length < 2 || name.length > 100 || /[\x00-\x1F\x7F]/.test(name)) {
              console.warn(`[extract-formation] Invalid name for player ${index}: ${player.player_name}`)
              player.player_name = null // Rimuovi nome non valido
            }
          }
        })
      }
    } catch (parseErr) {
      console.error('[extract-formation] JSON parse error:', parseErr)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error: parseErr,
          errorType: 'server_error',
          metadata: { endpoint: '/api/extract-formation' }
        })
      }
      return NextResponse.json(
        { error: L.extraction },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }


    return NextResponse.json({
      formation: formationData.formation || null,
      slot_positions: formationData.slot_positions || {},
      players: formationData.players || [], // Opzionale, per preview
      coach: formationData.coach || null // Allenatore opzionale (null se non presente)
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toString()
      }
    })
  } catch (err) {
    console.error('[extract-formation] Error:', err)
    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error: err,
        errorType: err?.type || null,
        metadata: { endpoint: '/api/extract-formation', stage: 'outer_catch' }
      })
    }
    return NextResponse.json(
      { error: L.extraction },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
