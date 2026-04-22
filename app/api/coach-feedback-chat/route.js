import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_HISTORY_MESSAGES = 10
const MAX_HISTORY_CONTENT_LENGTH = 2000
const MAX_MESSAGE_LENGTH = 2000

const ERRORS = {
  AUTH_REQUIRED: { it: 'Autenticazione richiesta.', en: 'Authentication required.' },
  AUTH_INVALID: { it: 'Token non valido o scaduto.', en: 'Invalid or expired token.' },
  BODY_INVALID: { it: 'Corpo della richiesta non valido.', en: 'Invalid request body.' },
  MESSAGE_REQUIRED: { it: 'Il messaggio è obbligatorio.', en: 'Message is required.' },
  MESSAGE_TOO_LONG: { it: 'Messaggio troppo lungo.', en: 'Message too long.' },
  RATE_LIMIT: { it: 'Troppe richieste. Riprova tra poco.', en: 'Rate limit exceeded.' },
  CONFIG: { it: 'Configurazione mancante.', en: 'Server configuration missing.' },
  SERVER: { it: 'Errore temporaneo. Riprova.', en: 'Temporary error. Please retry.' }
}

function getLang(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

function normalizeHistory(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out = []
  for (let i = 0; i < Math.min(raw.length, MAX_HISTORY_MESSAGES); i++) {
    const item = raw[i]
    if (!item || typeof item !== 'object') continue
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null
    if (!role) continue
    let content = typeof item.content === 'string' ? item.content.trim() : ''
    if (content.length > MAX_HISTORY_CONTENT_LENGTH) content = content.slice(0, MAX_HISTORY_CONTENT_LENGTH)
    if (content.length === 0) continue
    out.push({ role, content })
  }
  return out
}

/**
 * System prompt BLINDATO: un solo scopo (profilo + feedback), zero fuori contesto.
 */
function buildSystemPrompt(lang, profileContext, matchContext) {
  const isIt = lang === 'it'

  const rules = isIt
    ? `UNICO SCOPO della Palestra Coach: raccogliere (1) profilo di gioco del cliente e (2) feedback post-partita. Nient'altro.

LINGUA DI RISPOSTA: DEVI TASSATIVAMENTE RISPONDERE NELLA STESSA LINGUA USATA DALL'UTENTE NEL SUO MESSAGGIO (se l'utente scrive in inglese, rispondi in inglese; se scrive in italiano, rispondi in italiano).

FEEDBACK SUGGERITO DALL'APP (NON redirect):
Le frasi che l'app suggerisce ("È andata bene", "Non ha funzionato", "Ho seguito il tuo consiglio") sono FEEDBACK sulla partita. Rispondi continuando a raccogliere feedback: chiedi come è andato, cosa ha funzionato o no, cosa cambierebbe. Non usare mai la frase di redirect per queste.

FUORI CONTESTO (redirect solo qui):
Solo se il cliente chiede esplicitamente consigli tattici, formazioni, chi schierare, strategie, contromisure o analisi: rispondi con "Qui raccogliamo solo il tuo profilo e il feedback sulle partite. Per consigli tattici personalizzati usa la chat principale." Non per frasi tipo "ho seguito il consiglio" o "non ha funzionato" — quelle sono feedback, prosegui con domande su come è andata.

DIVIETI ASSOLUTI (non violare MAI):
- NON dare consigli tattici, suggerimenti di formazione, o raccomandazioni di gioco
- NON suggerire cambi di giocatori, stili, o strategie
- NON rispondere a domande tattiche oltre la frase di redirect sopra
- NON fare analisi partite o formazioni: il tuo ruolo è solo raccogliere dati

OBIETTIVO 1 - CONOSCERE IL CLIENTE (se profilo incompleto):
Chiedi in modo naturale e conversazionale:
- Piattaforma (console/pc/mobile)
- Qualità connessione (buona/instabile/lag)
- Livello passaggio (PA1/PA2/PA3)
- Smart assist (sì/no)
- Input delay (sì/no/a volte)
- Punto debole (difesa/attacco/piazzati/transizioni/finale partita)
- Cosa vuole imparare
- Note particolari
Non fare un interrogatorio: integra le domande nel flusso naturale, una alla volta.

OBIETTIVO 2 - RACCOGLIERE FEEDBACK PARTITA (se c'è una partita recente):
Chiedi:
- Come è andata
- Cosa ha funzionato e cosa no
- Se ha seguito consigli precedenti e come sono andati
- Cosa cambierebbe

FORMATO RISPOSTE:
- Max 2-3 frasi per risposta
- Sii empatico e breve
- Fai UNA domanda alla volta
- Ringrazia per le informazioni condivise
- Redirect solo se chiede esplicitamente consigli/formazioni/chi schierare; mai per "è andata bene" / "non ha funzionato" / "ho seguito il consiglio" (sono feedback).`
    : `SINGLE PURPOSE of Coach Gym: collect (1) the client's gaming profile and (2) post-match feedback. Nothing else.

RESPONSE LANGUAGE: YOU MUST STRICTLY REPLY IN THE SAME LANGUAGE USED BY THE USER IN THEIR MESSAGE (if the user writes in Italian, reply in Italian; if they write in English, reply in English).

APP-SUGGESTED FEEDBACK (no redirect):
The phrases the app suggests ("It went well", "It didn't work", "I followed your advice") are MATCH FEEDBACK. Reply by continuing to collect feedback: ask how it went, what worked or not, what they'd change. Never use the redirect sentence for these.

OFF-TOPIC (redirect only here):
Only if the client explicitly asks for tactical advice, formations, who to play, strategies, or countermeasures: reply with "Here we only collect your profile and match feedback. For personalized tactical advice use the main chat." Not for phrases like "I followed your advice" or "it didn't work" — those are feedback, follow up with questions.

ABSOLUTE PROHIBITIONS (never violate):
- Do NOT give tactical advice, formation suggestions, or gameplay recommendations
- Do NOT suggest player changes, styles, or strategies
- Do NOT answer tactical questions beyond the redirect sentence above
- Do NOT analyze matches or formations: your role is only to collect data

GOAL 1 - KNOW THE CLIENT (if profile is incomplete):
Ask naturally and conversationally:
- Platform (console/pc/mobile)
- Connection quality (good/unstable/lag)
- Pass level (PA1/PA2/PA3)
- Smart assist (yes/no)
- Input delay (yes/no/sometimes)
- Weak point (defense/attack/set pieces/transitions/final minutes)
- What they want to learn
- Special notes
Don't interrogate: integrate questions naturally, one at a time.

GOAL 2 - COLLECT MATCH FEEDBACK (if there's a recent match):
Ask about:
- How it went
- What worked and what didn't
- If they followed previous advice and how it went
- What they'd change

RESPONSE FORMAT:
- Max 2-3 sentences per response
- Be empathetic and brief
- Ask ONE question at a time
- Thank for shared information
- Redirect only when they explicitly ask for advice/formations/who to play; never for "it went well" / "it didn't work" / "I followed your advice" (those are feedback).`

  let context = ''
  if (profileContext) context += `\n\n${isIt ? 'PROFILO ATTUALE DEL CLIENTE' : 'CURRENT CLIENT PROFILE'}:\n${profileContext}`
  if (matchContext) context += `\n\n${isIt ? 'ULTIMA PARTITA GIOCATA' : 'LAST MATCH PLAYED'}:\n${matchContext}`

  return rules + context
}

function buildProfileContext(profile) {
  if (!profile) return ''
  const lines = []
  if (profile.first_name) lines.push(`Nome: ${profile.first_name}`)
  if (profile.platform) lines.push(`Piattaforma: ${profile.platform}`)
  if (profile.connection_quality) lines.push(`Connessione: ${profile.connection_quality}`)
  if (profile.pass_level) lines.push(`Pass level: ${profile.pass_level}`)
  if (profile.smart_assist) lines.push(`Smart assist: ${profile.smart_assist}`)
  if (profile.input_delay) lines.push(`Input delay: ${profile.input_delay}`)
  if (profile.ai_weak_point) lines.push(`Punto debole: ${profile.ai_weak_point}`)
  if (profile.ai_learn_goals) lines.push(`Vuole imparare: ${profile.ai_learn_goals}`)
  if (profile.ai_notes) lines.push(`Note: ${profile.ai_notes}`)
  if (profile.current_division) lines.push(`Divisione: ${profile.current_division}`)
  if (profile.hours_per_week != null) lines.push(`Ore/settimana: ${profile.hours_per_week}`)

  const filledCount = [
    profile.platform, profile.connection_quality, profile.pass_level,
    profile.smart_assist, profile.input_delay, profile.ai_weak_point
  ].filter(v => v != null && String(v).trim() !== '').length

  if (filledCount < 3) lines.push('[PROFILO INCOMPLETO — chiedi le info mancanti]')
  return lines.join('\n')
}

function buildMatchContext(match) {
  if (!match) return ''
  const lines = []
  if (match.opponent_name) lines.push(`Avversario: ${match.opponent_name}`)
  if (match.result) lines.push(`Risultato: ${match.result}`)
  if (match.formation_played) lines.push(`Formazione: ${match.formation_played}`)
  if (match.playing_style_played) lines.push(`Stile: ${match.playing_style_played}`)
  if (match.match_date) lines.push(`Data: ${new Date(match.match_date).toLocaleDateString('it-IT')}`)
  return lines.join('\n')
}

export async function POST(req) {
  const lang = getLang(req)
  let creditChargeContext = null

  try {
    // 1. Config
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !openaiApiKey || !serviceKey) {
      return NextResponse.json({ error: ERRORS.CONFIG[lang] }, { status: 500 })
    }

    // 2. Auth
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: ERRORS.AUTH_REQUIRED[lang] }, { status: 401 })
    }
    const metalgateSession = req.headers.get('x-metalgate-session') === '1'
    const claimedMetalgateUserId = req.headers.get('x-metalgate-user-id')
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, { forbidSupabaseFallback: metalgateSession })
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: ERRORS.AUTH_INVALID[lang] }, { status: 401 })
    }
    if (metalgateSession && claimedMetalgateUserId && claimedMetalgateUserId !== userData.user.id) {
      return NextResponse.json({ error: ERRORS.AUTH_INVALID[lang] }, { status: 401 })
    }
    let userId = userData.user.id

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

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

    // 3. Rate limit
    const rlConfig = RATE_LIMIT_CONFIG['/api/coach-feedback-chat'] || { maxRequests: 30, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/coach-feedback-chat', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: ERRORS.RATE_LIMIT[lang], resetAt: rateLimit.resetAt }, { status: 429 })
    }

    // 4. Parse body
    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: ERRORS.BODY_INVALID[lang] }, { status: 400 }) }

    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) return NextResponse.json({ error: ERRORS.MESSAGE_REQUIRED[lang] }, { status: 400 })
    if (message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: ERRORS.MESSAGE_TOO_LONG[lang] }, { status: 400 })

    const history = normalizeHistory(body.history)

    // 5. Load context (profilo + ultima partita)
    const [profileRes, matchRes] = await Promise.all([
      admin.from('user_profiles')
        .select('first_name, ai_name, current_division, hours_per_week, platform, connection_quality, pass_level, smart_assist, input_delay, ai_weak_point, ai_learn_goals, ai_notes, slow_opponent_connection_issues, favourite_player_name')
        .eq('user_id', userId)
        .maybeSingle(),
      admin.from('matches')
        .select('id, opponent_name, result, formation_played, playing_style_played, match_date, is_home')
        .eq('user_id', userId)
        .order('match_date', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])

    const profile = profileRes.data
    const lastMatch = matchRes.data

    const profileContext = buildProfileContext(profile)
    const matchContext = buildMatchContext(lastMatch)
    const systemPrompt = buildSystemPrompt(lang, profileContext, matchContext)

    // 6. Build messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ]

    // Check and deduct credits upfront
    const deduction = await deductCredits(admin, userId, token, AI_COST, 'coach-feedback-chat')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402 }
      )
    }
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'coach-feedback-chat', functionName: 'coach-feedback-chat:POST' }

    // 7. Call OpenAI (default gpt-5.2, come assistant-chat; fallback a gpt-4o se modello non disponibile)
    const model = process.env.OPENAI_MODEL || 'gpt-5.2'
    const requestBody = { model, messages, max_completion_tokens: 400, temperature: 0.7 }
    let response
    try {
      response = await callOpenAIWithRetry(openaiApiKey, requestBody, 'coach-feedback-chat')
    } catch (openaiErr) {
      const isModelError = openaiErr?.type === 'model_not_found' || model === 'gpt-5.2'
      if (isModelError) {
        try {
          requestBody.model = 'gpt-4o'
          response = await callOpenAIWithRetry(openaiApiKey, requestBody, 'coach-feedback-chat')
          if (response?.ok) {
            const data = await response.json()
            const assistantResponse = data?.choices?.[0]?.message?.content || (lang === 'it' ? 'Non ho capito, puoi ripetere?' : 'I didn\'t understand, can you repeat?')
            return NextResponse.json({
              response: assistantResponse,
              remaining: rateLimit.remaining,
              resetAt: rateLimit.resetAt,
              matchId: lastMatch?.id || null
            })
          }
        } catch (fallbackErr) {
          console.error('[coach-feedback-chat] Fallback gpt-4o failed:', fallbackErr?.message || fallbackErr)
        }
      }
      throw openaiErr
    }

    const data = await response.json()
    const assistantResponse = data?.choices?.[0]?.message?.content || (lang === 'it' ? 'Non ho capito, puoi ripetere?' : 'I didn\'t understand, can you repeat?')

    return NextResponse.json({
      response: assistantResponse,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
      matchId: lastMatch?.id || null
    })

  } catch (error) {
    console.error('[coach-feedback-chat] Error:', error?.message || error, 'type:', error?.type)
    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error,
        errorType: error?.type || null,
        metadata: { endpoint: '/api/coach-feedback-chat' }
      })
    }
    return NextResponse.json({ error: ERRORS.SERVER[lang] }, { status: 500 })
  }
}
