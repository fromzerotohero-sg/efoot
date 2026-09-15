import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

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
    extraction: 'Impossibile leggere i dati dal giocatore. Prova con uno screenshot più nitido.',
    quota: 'Servizio momentaneamente sovraccarico. Riprova tra qualche minuto.',
    timeout: 'Ritardo nella risposta. Riprova con un\'immagine più piccola.',
    server: 'Servizio temporaneamente non disponibile. Riprova tra poco.',
    network: 'Errore di connessione. Verifica la rete e riprova.',
    playerNameRequired: 'Nome giocatore obbligatorio.'
  },
  en: {
    config: 'Server configuration missing.',
    auth: 'Authentication required.',
    invalid: 'Invalid or expired token.',
    rateLimit: 'Too many requests. Try again in a minute.',
    imageRequired: 'Image is required.',
    imageTooLarge: 'Image too large (max 10MB).',
    extraction: 'Could not read player data from image. Try a clearer screenshot.',
    quota: 'Service temporarily overloaded. Try again in a few minutes.',
    timeout: 'Request took too long. Try a smaller image.',
    server: 'Service temporarily unavailable. Try again later.',
    network: 'Connection error. Check your network and try again.',
    playerNameRequired: 'Player name is required.'
  }
}

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function normalizePlayer(player) {
  if (!player || typeof player !== 'object') return player

  const normalized = { ...player }

  // Converte overall_rating a number
  if (normalized.overall_rating !== null && normalized.overall_rating !== undefined) {
    normalized.overall_rating = toInt(normalized.overall_rating)
  }

  // Normalizza base_stats
  if (normalized.base_stats && typeof normalized.base_stats === 'object') {
    const stats = normalized.base_stats
    const normalizedStats = {}

    // Attacking
    if (stats.attacking && typeof stats.attacking === 'object') {
      normalizedStats.attacking = {}
      Object.entries(stats.attacking).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          normalizedStats.attacking[key] = toInt(value)
        }
      })
    }

    // Defending
    if (stats.defending && typeof stats.defending === 'object') {
      normalizedStats.defending = {}
      Object.entries(stats.defending).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          normalizedStats.defending[key] = toInt(value)
        }
      })
    }

    // Athleticism
    if (stats.athleticism && typeof stats.athleticism === 'object') {
      normalizedStats.athleticism = {}
      Object.entries(stats.athleticism).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          normalizedStats.athleticism[key] = toInt(value)
        }
      })
    }

    normalized.base_stats = normalizedStats
  }

  // Normalizza array skills (max 40)
  if (Array.isArray(normalized.skills)) {
    normalized.skills = normalized.skills.slice(0, 40)
  }

  // Native / Additional (v6 Skill Training): keep separate for metadata persistence (no new DB columns).
  if (Array.isArray(normalized.additional_skills)) {
    normalized.additional_skills = normalized.additional_skills.slice(0, 5)
  } else {
    normalized.additional_skills = []
  }
  if (Array.isArray(normalized.native_skills)) {
    normalized.native_skills = normalized.native_skills.slice(0, 40)
  } else if (Array.isArray(normalized.skills) && normalized.additional_skills.length > 0) {
    const additionalKeys = new Set(
      normalized.additional_skills.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    )
    normalized.native_skills = normalized.skills.filter(
      (s) => !additionalKeys.has(String(s || '').trim().toLowerCase())
    )
  } else {
    normalized.native_skills = Array.isArray(normalized.skills) ? [...normalized.skills] : []
  }

  // Normalizza array com_skills (max 20)
  if (Array.isArray(normalized.com_skills)) {
    normalized.com_skills = normalized.com_skills.slice(0, 20)
  }

  // Normalizza array ai_playstyles (max 10)
  if (Array.isArray(normalized.ai_playstyles)) {
    normalized.ai_playstyles = normalized.ai_playstyles.slice(0, 10)
  }

  // Normalizza array boosters
  if (Array.isArray(normalized.boosters)) {
    normalized.boosters = normalized.boosters.slice(0, 10)
  }

  return normalized
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

    const rlConfig = RATE_LIMIT_CONFIG['/api/extract-player'] || { maxRequests: 15, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/extract-player', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: L.rateLimit, resetAt: rateLimit.resetAt }, { status: 429 })
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: L.config }, { status: 500 })
    }

    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      return NextResponse.json({ error: L.imageRequired }, { status: 400 })
    }
    const { imageDataUrl } = requestBody

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

    // Addebita solo dopo validazione input (errori utente non vengono addebitati)
    const deduction = await deductCredits(admin, userId, token, AI_COST, 'extract-player')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402, headers: { 'Content-Language': lang } }
      )
    }
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'extract-player', functionName: 'extract-player:POST' }

    // Prompt per estrazione dati giocatore
    const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- PRIORITÀ: Usa la TABELLA statistiche se presente (non il radar chart)

OVERALL RATING (CRITICO - Leggi con attenzione):
- L'overall_rating è SEMPRE posizionato in una posizione precisa nella card:
  * Cerca il "playing_style" (stile di gioco) del giocatore (es. "Ala prolifica", "Attaccante", ecc.)
  * L'overall_rating è SEMPRE posizionato DIRETTAMENTE SOTTO lo stile di gioco
  * L'overall_rating è SEMPRE posizionato DIRETTAMENTE SOPRA la bandiera nazionale o lo stemma del club
  * Cerca un numero grande (es. "99", "85", "92") che appare tra lo stile e la bandiera
  * Il numero può avere accanto lettere (es. "99 ESA", "85", "92") - estrai SOLO il numero
  * NON fare calcoli, NON sottrarre o aggiungere nulla
  * Estrai ESATTAMENTE il numero che vedi in quella posizione specifica
  * Il numero può essere da 40 a 110 (con boosters può superare 99)
  * Se non vedi chiaramente il numero in quella posizione, usa null (non indovinare)

- Estrai TUTTI questi dati: nome giocatore, posizione, overall rating, team, card_type, base_stats (attacking, defending, athleticism), skills, com_skills, boosters, height, weight, age, nationality, level, form, role, playing_style, ai_playstyles, matches_played, goals, assists, weak_foot_frequency, weak_foot_accuracy, injury_resistance

STILI DI GIOCO (v6.0.0):
- "playing_style" = stile principale visibile sotto il nome se ce n'è uno solo.
- Se la card mostra DUE stili (attacco e difesa), metti:
  * "attacking_playing_style"
  * "defensive_playing_style"
- Non inventare il secondo stile se non è visibile.

ABILITÀ (due sezioni distinte in eFootball):
- "Abilità giocatore" = prima lista (spesso in griglia, es. Cross calibrato, Marcatore, Intercettazione...). Mettila in "skills".
- "Abilità aggiuntive" / "COM" = seconda lista sotto. Se è COM/stili IA (Funambolo, Treno in corsa, Long Ranger), mettila in "com_skills" e "ai_playstyles". Se è Additional Skills, mettila in "additional_skills" e tienila anche in "skills" solo se è la stessa lista visibile.
- Se nella card vedi ENTRAMBE le sezioni, compila ENTRAMBE. Se vedi solo la prima, compila solo "skills".
- Non restituire array vuoti al posto di una lista già letta da un'altra foto.

STILI DI GIOCO IA (sezione "Stili di gioco IA" nella card):
- Elenco di stili IA (es. "Treno in corsa", "Crossatore"). Mettili in "ai_playstyles" come array di stringhe. NON mescolarli in "skills".

POSIZIONI ORIGINALI (NUOVO - Guarda Mini-Campo in Alto a Destra):
- Guarda la sezione in alto a destra della card dove c'è un MINI-CAMPO diviso in zone
- Il mini-campo mostra le posizioni originali del giocatore evidenziate in VERDE
- Estrai TUTTE le zone evidenziate e mappale a posizioni:
  * Zone verdi brillanti = Alta competenza
  * Zone verdi sfumate = Intermedia competenza
  * Zone grigie = Bassa competenza o nessuna
- Mappa zone a posizioni standard:
  * Zona centrale difesa = DC
  * Zona sinistra difesa = TS
  * Zona destra difesa = TD
  * Zona centrale centrocampo = CC/CMF
  * Zona sinistra centrocampo = ESA
  * Zona destra centrocampo = EDA
  * Zona centrale attacco = AMF/TRQ
  * Zona sinistra attacco = LWF/CLS
  * Zona destra attacco = RWF/CLD
  * Zona centrale punta = CF/P
  * Zona laterale punta = SP
- Se non vedi il mini-campo o non ci sono zone evidenziate, usa solo la posizione principale

Formato JSON richiesto:
{
  "player_name": "Nome Completo",
  "position": "AMF",  // Posizione principale (quella più grande/centrale)
  "original_positions": [  // NUOVO: Array di posizioni originali dal mini-campo
    {
      "position": "AMF",
      "competence": "Alta"  // Alta, Intermedia, Bassa (basato su colore verde)
    },
    {
      "position": "LWF",
      "competence": "Alta"
    },
    {
      "position": "RWF",
      "competence": "Alta"
    }
  ],
  "overall_rating": 85,
  "team": "Team Name",
  "card_type": "Type",
  "base_stats": {
    "attacking": { "offensive_awareness": 85, "finishing": 80, ... },
    "defending": { "defensive_awareness": 60, ... },
    "athleticism": { "speed": 75, "stamina": 70, ... }
  },
  "skills": ["Skill 1", "Skill 2"],
  "com_skills": ["Com Skill 1"],
  "boosters": [{ "name": "Booster Name", "effect": "..." }],
  "ai_playstyles": ["Style 1", "Style 2"],
  "height_cm": 180,
  "weight_kg": 75,
  "age": 25,
  "nationality": "Country",
  "level_current": 10,
  "level_cap": 50,
  "form": "B",
  "role": "Role",
  "playing_style": "Style Name",
  "attacking_playing_style": "Attacking Style or null",
  "defensive_playing_style": "Defensive Style or null",
  "additional_skills": ["Additional Skill 1"],
  "matches_played": 204,
  "goals": 86,
  "assists": 37,
  "weak_foot_frequency": "Raramente",
  "weak_foot_accuracy": "Alta",
  "injury_resistance": "Media"
}

Restituisci SOLO JSON valido, senza altro testo.`

    // Chiama OpenAI Vision API con retry e timeout
    let playerData = null
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
        max_tokens: 2500
      }

      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, 'extract-player')
      const parsedData = await parseOpenAIResponse(openaiRes, 'extract-player')

      // Se c'è un campo "player" nel JSON, usalo
      playerData = parsedData.player && typeof parsedData.player === 'object' 
        ? parsedData.player 
        : parsedData
    } catch (error) {
      console.error('[extract-player] OpenAI error:', error)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error,
          errorType: error?.type || null,
          metadata: { endpoint: '/api/extract-player' }
        })
      }

      let errorMessage = L.extraction
      let statusCode = 500

      if (error.type === 'rate_limit') {
        errorMessage = L.quota
        statusCode = 429
      } else if (error.type === 'timeout') {
        errorMessage = L.timeout
        statusCode = 408
      } else if (error.type === 'server_error') {
        errorMessage = L.server
        statusCode = 503
      } else if (error.type === 'network_error') {
        errorMessage = L.network
        statusCode = 503
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode, headers: { 'Content-Language': lang } }
      )
    }

    // Normalizza dati
    const normalizedPlayer = normalizePlayer(playerData)

    // Validazione e normalizzazione original_positions
    if (normalizedPlayer.original_positions && !Array.isArray(normalizedPlayer.original_positions)) {
      // Se non è array, converti o ignora
      normalizedPlayer.original_positions = []
    }

    // Se array vuoto o non presente, usa position come originale
    if (!normalizedPlayer.original_positions || normalizedPlayer.original_positions.length === 0) {
      if (normalizedPlayer.position) {
        normalizedPlayer.original_positions = [{ position: normalizedPlayer.position, competence: "Alta" }]
      } else {
        normalizedPlayer.original_positions = []
      }
    }

    // Validazione semantica dei dati estratti (non bloccante - solo warning)
    // Rimossa validazione rigida che bloccava dati validi (es. rating > 100 con boosters, stats > 99)
    // Il sistema funzionava perfettamente il 21 gennaio senza queste validazioni
    
    if (!normalizedPlayer.player_name || typeof normalizedPlayer.player_name !== 'string' || normalizedPlayer.player_name.trim().length === 0) {
      return NextResponse.json(
        { error: L.playerNameRequired },
        { status: 400 }
      )
    }


    return NextResponse.json({
      player: normalizedPlayer
    })
  } catch (err) {
    console.error('[extract-player] Error:', err)
    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error: err,
        errorType: err?.type || null,
        metadata: { endpoint: '/api/extract-player', stage: 'outer_catch' }
      })
    }
    return NextResponse.json(
      { error: L.extraction },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
