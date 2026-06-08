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
    sectionInvalid: 'Sezione non valida.',
    imageTooLarge: 'Immagine troppo grande (max 10MB).',
    extraction: 'Impossibile leggere i dati dall\'immagine. Prova con uno screenshot più nitido.',
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
    sectionInvalid: 'Invalid section.',
    imageTooLarge: 'Image too large (max 10MB).',
    extraction: 'Could not read data from image. Try a clearer screenshot.',
    quota: 'Service temporarily overloaded. Try again in a few minutes.',
    timeout: 'Request took too long. Try a smaller image.',
    server: 'Service temporarily unavailable. Try again later.',
    network: 'Connection error. Check your network and try again.'
  }
}

// Tipi di sezione supportati
const VALID_SECTIONS = ['player_ratings', 'team_stats', 'attack_areas', 'ball_recovery_zones', 'formation_style']

/**
 * Normalizza dati estratti per player_ratings
 * @param {Object} data - Dati estratti
 * @param {boolean|null} isHome - Se true, team1 = cliente; se false, team2 = cliente; se null, usa logica vecchia
 */
function normalizePlayerRatings(data, isHome = null) {
  if (!data || typeof data !== 'object') return {}
  
  const ratings = {}
  const clienteRatings = {}
  const avversarioRatings = {}
  
  // Supporta sia { ratings: {...} } che { ... } diretto
  const ratingsData = data.ratings || data
  
  if (typeof ratingsData === 'object') {
    Object.entries(ratingsData).forEach(([playerName, playerData]) => {
      if (playerName && typeof playerData === 'object' && playerData !== null) {
        // Funzione helper per convertire valori a number
        const toNumber = (value) => {
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            // Rimuovi caratteri non numerici e converti
            const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.')
            const num = parseFloat(cleaned)
            return !isNaN(num) ? num : null
          }
          return null
        }
        
        // Estrai SOLO il rating (voto) - è l'unico dato disponibile nelle pagelle
        const rating = toNumber(playerData.rating)
        
        if (rating !== null) {
          const playerRating = { rating: rating }
          
          // Identifica se è cliente o avversario
          const team = String(playerData.team || '').toLowerCase()
          
          // Logica nuova: usa is_home se disponibile
          if (isHome !== null && isHome !== undefined) {
            if (team.includes('cliente') || team === 'cliente') {
              clienteRatings[playerName] = playerRating
            } else if (team.includes('avversario') || team === 'avversario' || team === 'opponent') {
              avversarioRatings[playerName] = playerRating
            } else if (team === 'team1' || team.includes('team1') || team.includes('first')) {
              // team1 = cliente se casa, avversario se fuori
              if (isHome) {
                clienteRatings[playerName] = playerRating
              } else {
                avversarioRatings[playerName] = playerRating
              }
            } else if (team === 'team2' || team.includes('team2') || team.includes('second')) {
              // team2 = avversario se casa, cliente se fuori
              if (isHome) {
                avversarioRatings[playerName] = playerRating
              } else {
                clienteRatings[playerName] = playerRating
              }
            } else {
              // Fallback: metti in ratings generale
              ratings[playerName] = playerRating
            }
          } else {
            // Logica vecchia: usa etichette esplicite o team1/team2 (assume team1 = cliente)
            if (team.includes('cliente') || team === 'cliente' || team === 'team1') {
              clienteRatings[playerName] = playerRating
            } else if (team.includes('avversario') || team === 'avversario' || team === 'opponent' || team === 'team2') {
              avversarioRatings[playerName] = playerRating
            } else {
              // Se non specificato, metti in ratings generale (compatibilità retroattiva)
              ratings[playerName] = playerRating
            }
          }
        }
      }
    })
  }
  
  // Restituisci struttura con separazione cliente/avversario se disponibile
  if (Object.keys(clienteRatings).length > 0 || Object.keys(avversarioRatings).length > 0) {
    return {
      cliente: Object.keys(clienteRatings).length > 0 ? clienteRatings : null,
      avversario: Object.keys(avversarioRatings).length > 0 ? avversarioRatings : null
    }
  }
  
  // Fallback: restituisci ratings senza distinzione (compatibilità)
  return ratings
}

/**
 * Normalizza dati estratti per team_stats
 */
function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return !isNaN(num) ? num : null
  }
  return null
}

function pickClientSide(data, isHome) {
  if (!data || typeof data !== 'object') return null
  if (isHome === true) return data.team1 || data.left || data.home || null
  if (isHome === false) return data.team2 || data.right || data.away || null
  return data.team1 || data.left || data.home || null
}

function parseScreenResult(raw) {
  if (!raw || typeof raw !== 'string') return null
  const normalized = raw.replace(/\s/g, '')
  if (!/^\d+-\d+$/.test(normalized)) return null
  const [left, right] = normalized.split('-').map((part) => parseInt(part, 10))
  return Number.isFinite(left) && Number.isFinite(right) ? { left, right } : null
}

function resultFromScreenScore(data, isHome) {
  if (!data || typeof data !== 'object') return null

  const left =
    toNumber(data.score_left) ??
    toNumber(data.left_score) ??
    toNumber(data.home_score) ??
    toNumber(data.team1_score)
  const right =
    toNumber(data.score_right) ??
    toNumber(data.right_score) ??
    toNumber(data.away_score) ??
    toNumber(data.team2_score)

  if (left !== null && right !== null) {
    return isHome === false ? `${right}-${left}` : `${left}-${right}`
  }

  const parsed = parseScreenResult(data.result)
  if (!parsed) return null
  return isHome === false ? `${parsed.right}-${parsed.left}` : `${parsed.left}-${parsed.right}`
}

function normalizeTeamStats(data, isHome = null) {
  if (!data || typeof data !== 'object') return {}
  
  const stats = {}
  const sideData = pickClientSide(data, isHome) || data
  
  // Estrai risultato se presente
  const normalizedResult = resultFromScreenScore(data, isHome)
  if (normalizedResult) {
    stats.result = normalizedResult
    const [goalsScored, goalsConceded] = normalizedResult.split('-').map((part) => parseInt(part, 10))
    if (Number.isFinite(goalsScored) && Number.isFinite(goalsConceded)) {
      stats.goals_scored = goalsScored
      stats.goals_conceded = goalsConceded
    }
  }
  
  // Estrai statistiche comuni
  const statFields = [
    'possession', 'shots', 'shots_on_target', 'fouls', 'offsides',
    'corner_kicks', 'free_kicks', 'passes', 'successful_passes',
    'crosses', 'interceptions', 'tackles', 'saves',
    'goals_scored', 'goals_conceded'
  ]
  
  statFields.forEach(field => {
    if (normalizedResult && (field === 'goals_scored' || field === 'goals_conceded')) return
    const value = toNumber(sideData[field])
    if (value !== null) {
      stats[field] = value
    }
  })
  
  return stats
}

/**
 * Normalizza dati estratti per attack_areas
 */
function normalizeAttackAreas(data) {
  if (!data || typeof data !== 'object') return {}
  
  const areas = {}
  
  // Supporta sia { team1: {...}, team2: {...} } che { left: ..., center: ..., right: ... }
  if (data.team1 || data.team2) {
    if (data.team1 && typeof data.team1 === 'object') {
      areas.team1 = {
        left: typeof data.team1.left === 'number' ? data.team1.left : null,
        center: typeof data.team1.center === 'number' ? data.team1.center : null,
        right: typeof data.team1.right === 'number' ? data.team1.right : null
      }
    }
    if (data.team2 && typeof data.team2 === 'object') {
      areas.team2 = {
        left: typeof data.team2.left === 'number' ? data.team2.left : null,
        center: typeof data.team2.center === 'number' ? data.team2.center : null,
        right: typeof data.team2.right === 'number' ? data.team2.right : null
      }
    }
  } else {
    // Se non c'è team1/team2, assume che siano per la squadra dell'utente
    areas.team1 = {
      left: typeof data.left === 'number' ? data.left : null,
      center: typeof data.center === 'number' ? data.center : null,
      right: typeof data.right === 'number' ? data.right : null
    }
  }
  
  return areas
}

/**
 * Normalizza dati estratti per ball_recovery_zones
 */
function normalizeBallRecoveryZones(data) {
  if (!data) return []
  
  // Supporta sia array diretto che oggetto con array
  const zones = Array.isArray(data) ? data : (data.zones || data.recovery_zones || [])
  
  if (!Array.isArray(zones)) return []
  
  return zones
    .filter(zone => zone && typeof zone === 'object')
    .map(zone => ({
      x: typeof zone.x === 'number' ? Math.max(0, Math.min(1, zone.x)) : null,
      y: typeof zone.y === 'number' ? Math.max(0, Math.min(1, zone.y)) : null,
      team: typeof zone.team === 'string' ? zone.team : 'team1'
    }))
    .filter(zone => zone.x !== null && zone.y !== null)
}

/**
 * Normalizza dati estratti per formation_style
 */
function normalizeFormationStyle(data) {
  if (!data || typeof data !== 'object') return {}
  
  return {
    formation_played: typeof data.formation === 'string' ? data.formation.trim() : null,
    playing_style_played: typeof data.playing_style === 'string' ? data.playing_style.trim() : null,
    team_strength: typeof data.team_strength === 'number' ? data.team_strength : 
                  (typeof data.strength === 'number' ? data.strength : null)
  }
}

/**
 * Genera prompt per estrazione dati in base alla sezione
 * @param {string} section - Sezione da estrarre
 * @param {Object|null} userTeamInfo - Info squadra utente (logica vecchia)
 * @param {boolean|null} isHome - Se true, team1 = cliente; se false, team2 = cliente; se null, usa logica vecchia
 */
function getPromptForSection(section, userTeamInfo = null, isHome = null) {
  // Costruisci hint per identificare squadra cliente
  let teamHint = ''
  
  if (isHome !== null && isHome !== undefined) {
    teamHint = `
IDENTIFICAZIONE SQUADRA CLIENTE:
- eFootball mostra sempre SINISTRA/CASA vs DESTRA/FUORI.
- team1 = squadra a SINISTRA / CASA; team2 = squadra a DESTRA / FUORI.
- Il cliente ha giocato ${isHome ? 'IN CASA: cliente = team1/sinistra' : 'FUORI CASA: cliente = team2/destra'}.
- Estrai SEMPRE il risultato grezzo come appare sullo schermo (sinistra-destra), non ribaltarlo tu.
`
  } else if (userTeamInfo) {
    // Vecchia logica: usa team_name
    const hints = []
    if (userTeamInfo.team_name) hints.push(`Nome squadra cliente: "${userTeamInfo.team_name}"`)
    if (userTeamInfo.favorite_team) hints.push(`Squadra preferita: "${userTeamInfo.favorite_team}"`)
    if (userTeamInfo.name) hints.push(`Nome utente: "${userTeamInfo.name}"`)
    if (hints.length > 0) {
      teamHint = `\n\nIDENTIFICAZIONE SQUADRA CLIENTE:\n${hints.join('\n')}\n- La squadra del cliente potrebbe corrispondere a uno di questi nomi o essere simile.\n- L'altra squadra è l'avversario.`
    }
  }

  const prompts = {
    player_ratings: `Analizza questo screenshot di eFootball e estrai TUTTE le pagelle (ratings) dei giocatori.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine
- Questa schermata mostra SOLO i VOTI (ratings) dei giocatori, NON ci sono goals, assists o minuti giocati
- Se vedi il RISULTATO della partita (es. "3-1", "2-2", "4-0", "6-1"), estrailo nel campo "result" ESATTAMENTE come appare sullo schermo: gol squadra sinistra/casa - gol squadra destra/fuori
- Per ogni giocatore visibile nella lista delle pagelle, estrai:
  * nome (nome completo del giocatore come appare nella lista)
  * rating (voto numerico, es. 8.5, 7.0, 6.5, 5.5 - OBBLIGATORIO, è l'unico dato visibile)
      * team ("team1" se il giocatore è nella lista squadra sinistra/casa, "team2" se è nella lista squadra destra/fuori)
- I valori numerici devono essere numeri, non stringhe
- Se vedi una lista di giocatori con voti, estrai TUTTI i giocatori visibili
- DISTINGUI CHIARAMENTE: identifica quale giocatore appartiene alla squadra del CLIENTE e quale all'AVVERSARIO
- NON inventare dati che non vedi (goals, assists, minutes_played non sono visibili in questa schermata)${teamHint}

Formato JSON richiesto:
{
  "result": "6-1",
  "ratings": {
    "Nome Giocatore Squadra Sinistra": {
      "rating": 8.5,
      "team": "team1"
    },
    "Nome Giocatore Squadra Destra": {
      "rating": 6.5,
      "team": "team2"
    }
  }
}

Restituisci SOLO JSON valido, senza altro testo.`,

    team_stats: `Analizza questo screenshot di eFootball e estrai TUTTE le statistiche di squadra.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai il RISULTATO nel campo "result" ESATTAMENTE come appare sullo schermo: gol squadra sinistra/casa - gol squadra destra/fuori
- Estrai le statistiche separate per entrambe le squadre:
  * team1 = squadra a sinistra/casa
  * team2 = squadra a destra/fuori
- Per ogni squadra estrai: possession %, shots, shots_on_target, fouls, offsides, corner_kicks, free_kicks, passes, successful_passes, crosses, interceptions, tackles, saves

Formato JSON richiesto:
{
  "result": "0-4",
  "team1": {
    "possession": 45,
    "shots": 5,
    "shots_on_target": 1,
    "passes": 110,
    "successful_passes": 81
  },
  "team2": {
    "possession": 55,
    "shots": 16,
    "shots_on_target": 10,
    "passes": 152,
    "successful_passes": 132
  }
}

Restituisci SOLO JSON valido, senza altro testo.`,

    attack_areas: `Analizza questo screenshot di eFootball e estrai le aree di attacco.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Se vedi il RISULTATO della partita (es. "3-1", "2-2", "4-0", "6-1"), estrailo nel campo "result" ESATTAMENTE come appare sullo schermo: gol squadra sinistra/casa - gol squadra destra/fuori
- Estrai le percentuali per zona: sinistra (left), centro (center), destra (right)
- Se ci sono dati per entrambe le squadre, usa team1 per la squadra sinistra/casa e team2 per la squadra destra/fuori

Formato JSON richiesto:
{
  "result": "6-1",
  "team1": {
    "left": 46,
    "center": 45,
    "right": 9
  },
  "team2": {
    "left": 19,
    "center": 64,
    "right": 17
  }
}

Restituisci SOLO JSON valido, senza altro testo.`,

    ball_recovery_zones: `Analizza questo screenshot di eFootball e estrai le zone di recupero palla.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Se vedi il RISULTATO della partita (es. "3-1", "2-2", "4-0", "6-1"), estrailo nel campo "result" ESATTAMENTE come appare sullo schermo: gol squadra sinistra/casa - gol squadra destra/fuori
- Per ogni punto verde sul campo, estrai la posizione normalizzata (x: 0-1, y: 0-1 dove 0,0 è in alto a sinistra)
- Identifica quale squadra ha recuperato: team1 = sinistra/casa, team2 = destra/fuori

Formato JSON richiesto:
{
  "result": "6-1",
  "zones": [
    { "x": 0.3, "y": 0.5, "team": "team1" },
    { "x": 0.7, "y": 0.4, "team": "team2" }
  ]
}

Restituisci SOLO JSON valido, senza altro testo.`,

    formation_style: `Analizza questo screenshot di eFootball e estrai formazione, stile di gioco e forza squadra.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Se vedi il RISULTATO della partita (es. "3-1", "2-2", "4-0"), estrailo nel campo "result" ESATTAMENTE come appare sullo schermo: gol squadra sinistra/casa - gol squadra destra/fuori
- Estrai: formazione (es. "4-2-1-3", "4-3-3"), stile di gioco (es. "Contrattacco", "Possesso palla"), forza complessiva (team_strength, numero grande tipo 3245)

Formato JSON richiesto:
{
  "result": "3-1",
  "formation": "4-2-1-3",
  "playing_style": "Contrattacco",
  "team_strength": 3245
}

Restituisci SOLO JSON valido, senza altro testo.`
  }
  
  return prompts[section] || prompts.player_ratings
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
    
    // Initialize admin client early for Metalgate lookup
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

    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/extract-match-data']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/extract-match-data',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: L.rateLimit,
          resetAt: rateLimit.resetAt
        },
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

    // Recupera informazioni utente per identificare squadra cliente
    let userTeamInfo = null
    try {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('team_name, favorite_team, first_name, last_name')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (profile) {
        userTeamInfo = {
          team_name: profile.team_name,
          favorite_team: profile.favorite_team,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        }
      }
    } catch (err) {
      console.warn('[extract-match-data] Error fetching user profile:', err)
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: L.config }, { status: 500 })
    }

    const { imageDataUrl, section, is_home } = await req.json()
    const isHome = typeof is_home === 'boolean' ? is_home : null

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json({ error: L.imageRequired }, { status: 400 })
    }

    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json({ error: L.sectionInvalid }, { status: 400 })
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

    const deduction = await deductCredits(admin, userId, token, AI_COST, 'extract-match-data')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402, headers: { 'Content-Language': lang } }
      )
    }
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'extract-match-data', functionName: 'extract-match-data:POST' }

    // Genera prompt per sezione (con info utente se disponibili o is_home)
    const prompt = getPromptForSection(section, userTeamInfo, isHome)

    // Chiama OpenAI Vision API
    let extractedData = null
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

      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, `extract-match-data-${section}`)
      const parsedData = await parseOpenAIResponse(openaiRes, `extract-match-data-${section}`)

      extractedData = parsedData
    } catch (error) {
      console.error(`[extract-match-data] OpenAI error for section ${section}:`, error)
      if (creditChargeContext?.admin && creditChargeContext?.userId) {
        await handleCreditOperationError(creditChargeContext.admin, {
          userId: creditChargeContext.userId,
          cost: creditChargeContext.cost,
          operationType: creditChargeContext.operationType,
          functionName: creditChargeContext.functionName,
          error,
          errorType: error?.type || null,
          metadata: { endpoint: '/api/extract-match-data', section }
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

    // Normalizza dati in base alla sezione
    let normalizedData = null
    switch (section) {
      case 'player_ratings':
        normalizedData = normalizePlayerRatings(extractedData, isHome)
        break
      case 'team_stats':
        normalizedData = normalizeTeamStats(extractedData, isHome)
        break
      case 'attack_areas':
        normalizedData = normalizeAttackAreas(extractedData)
        break
      case 'ball_recovery_zones':
        normalizedData = normalizeBallRecoveryZones(extractedData)
        break
      case 'formation_style':
        normalizedData = normalizeFormationStyle(extractedData)
        break
      default:
        return NextResponse.json(
          { error: L.sectionInvalid },
          { status: 400 }
        )
    }

    // Estrai risultato se presente (può essere in qualsiasi sezione: player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_style)
    let result = null
    if (extractedData.result && typeof extractedData.result === 'string') {
      result = extractedData.result.trim()
    } else if (normalizedData && normalizedData.result && typeof normalizedData.result === 'string') {
      result = normalizedData.result.trim()
    }

    // CORREZIONE: eFootball mostra il punteggio sempre in ordine Casa-Fuori (Home-Away).
    // Se il cliente ha giocato FUORI CASA, sullo schermo è Opponent-Cliente → invertiamo a Cliente-Opponent.
    if (result && isHome === false && /^\d+-\d+$/.test(result.replace(/\s/g, ''))) {
      const parts = result.replace(/\s/g, '').split('-')
      if (parts.length === 2) {
        result = `${parts[1]}-${parts[0]}`
      }
    }

    // Rimuovi result da normalizedData (non fa parte dei dati della sezione specifica)
    if (normalizedData && normalizedData.result) {
      delete normalizedData.result
    }


    return NextResponse.json({
      section,
      data: normalizedData,
      result: result || null, // Includi risultato se estratto
      raw: extractedData // Include dati raw per debug
    })
  } catch (err) {
    console.error('[extract-match-data] Error:', err)
    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error: err,
        errorType: err?.type || null,
        metadata: { endpoint: '/api/extract-match-data', stage: 'outer_catch' }
      })
    }
    return NextResponse.json(
      { error: L.extraction },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
