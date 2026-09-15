const MAX_HISTORY_MESSAGES = 10
const MAX_HISTORY_CONTENT_LENGTH = 2000
const MAX_MESSAGE_LENGTH = 2000
const MAX_CONVERSATION_MESSAGES = 20
const MAX_TEXT = 255
const MAX_NOTES = 500
const AI_COST = 2

const PROFILE_WHITELIST = {
  connection_quality: ['good', 'unstable', 'lag'],
  slow_opponent_connection_issues: ['yes', 'no', 'sometimes'],
  input_delay: ['yes', 'no', 'sometimes'],
  pass_level: ['pa1', 'pa2', 'pa3'],
  smart_assist: ['yes', 'no'],
  platform: ['console', 'pc', 'mobile', 'other'],
  ai_weak_point: ['defence', 'attack', 'set_pieces', 'transitions', 'final_minutes']
}

const WEAK_POINT_TO_LABEL = {
  defence: 'Difesa',
  attack: 'Attacco',
  set_pieces: 'Piazzati',
  transitions: 'Transizioni',
  final_minutes: 'Finale partita'
}

function serviceError(message, statusCode, type = 'validation') {
  const error = new Error(message)
  error.statusCode = statusCode
  error.type = type
  return error
}

function assertLive(config) {
  if (config?.dormant) {
    throw serviceError('Coach feedback is disabled in dormant mode', 403, 'dormant')
  }
}

function requireIdempotencyKey(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw serviceError('Idempotency key is required', 400, 'idempotency_key_required')
  }
  return value.trim()
}

export function normalizeHistory(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const output = []
  for (let index = 0; index < Math.min(raw.length, MAX_HISTORY_MESSAGES); index += 1) {
    const item = raw[index]
    if (!item || typeof item !== 'object') continue
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null
    if (!role) continue
    let content = typeof item.content === 'string' ? item.content.trim() : ''
    if (content.length > MAX_HISTORY_CONTENT_LENGTH) {
      content = content.slice(0, MAX_HISTORY_CONTENT_LENGTH)
    }
    if (content) output.push({ role, content })
  }
  return output
}

export function buildProfileContext(profile) {
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
    profile.platform,
    profile.connection_quality,
    profile.pass_level,
    profile.smart_assist,
    profile.input_delay,
    profile.ai_weak_point
  ].filter((value) => value != null && String(value).trim() !== '').length
  if (filledCount < 3) lines.push('[PROFILO INCOMPLETO — chiedi le info mancanti]')
  return lines.join('\n')
}

export function buildMatchContext(match) {
  if (!match) return ''
  const lines = []
  if (match.opponent_name) lines.push(`Avversario: ${match.opponent_name}`)
  if (match.result) lines.push(`Risultato: ${match.result}`)
  if (match.formation_played) lines.push(`Formazione: ${match.formation_played}`)
  if (match.playing_style_played) lines.push(`Stile: ${match.playing_style_played}`)
  if (match.match_date) lines.push(`Data: ${new Date(match.match_date).toLocaleDateString('it-IT')}`)
  return lines.join('\n')
}

export function buildSystemPrompt(lang, profileContext, matchContext) {
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
  if (profileContext) {
    context += `\n\n${isIt ? 'PROFILO ATTUALE DEL CLIENTE' : 'CURRENT CLIENT PROFILE'}:\n${profileContext}`
  }
  if (matchContext) {
    context += `\n\n${isIt ? 'ULTIMA PARTITA GIOCATA' : 'LAST MATCH PLAYED'}:\n${matchContext}`
  }
  return rules + context
}

export function validateProfileUpdates(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const clean = {}
  for (const [key, allowed] of Object.entries(PROFILE_WHITELIST)) {
    if (raw[key] === undefined || raw[key] === null) continue
    const value = String(raw[key]).trim().toLowerCase()
    if (!value) continue
    if (key === 'ai_weak_point') {
      if (allowed.includes(value) || value.length <= 60) clean[key] = value
    } else if (allowed.includes(value)) {
      clean[key] = value
    }
  }
  for (const key of ['first_name', 'ai_name', 'ai_learn_goals', 'favourite_player_name']) {
    if (raw[key] === undefined || raw[key] === null) continue
    const value = String(raw[key]).trim()
    if (value && value.length <= MAX_TEXT) clean[key] = value
  }
  if (raw.ai_notes !== undefined && raw.ai_notes !== null) {
    const value = String(raw.ai_notes).trim()
    if (value && value.length <= MAX_NOTES) clean.ai_notes = value
  }
  if (raw.hours_per_week !== undefined && raw.hours_per_week !== null) {
    const value = Number.parseInt(String(raw.hours_per_week), 10)
    if (Number.isFinite(value) && value >= 0 && value <= 168) clean.hours_per_week = value
  }
  return clean
}

export function validateInsights(raw) {
  if (!Array.isArray(raw)) return []
  const validTypes = new Set(['weakness', 'strength', 'lesson'])
  return raw
    .filter((item) =>
      item &&
      typeof item === 'object' &&
      validTypes.has(item.type) &&
      typeof item.text === 'string' &&
      item.text.trim().length > 0)
    .slice(0, 10)
    .map((item) => ({ type: item.type, text: item.text.trim().slice(0, 200) }))
}

export function buildExtractionPrompt(conversation, matchInfo) {
  const conversationText = conversation
    .map((message) => `${message.role === 'user' ? 'UTENTE' : 'COACH'}: ${message.content}`)
    .join('\n')
  const matchContext = matchInfo
    ? `CONTESTO PARTITA: formazione ${matchInfo.formation_played || '?'}, avversario ${matchInfo.opponent_name || '?'}, risultato ${matchInfo.result || '?'}`
    : ''
  return `Analizza questa conversazione tra un utente eFootball e il suo coach AI.
Estrai TUTTI i dati menzionati dall'utente in formato JSON.

CONVERSAZIONE:
${conversationText}

${matchContext}

Rispondi SOLO con JSON valido, nient'altro:
{
  "profile_updates": {
    // Includi SOLO campi menzionati dall'utente. Valori ammessi:
    // "platform": "console"|"pc"|"mobile"|"other"
    // "connection_quality": "good"|"unstable"|"lag"
    // "slow_opponent_connection_issues": "yes"|"no"|"sometimes"
    // "pass_level": "pa1"|"pa2"|"pa3"
    // "smart_assist": "yes"|"no"
    // "input_delay": "yes"|"no"|"sometimes"
    // "ai_weak_point": "defence"|"attack"|"set_pieces"|"transitions"|"final_minutes" OPPURE testo libero max 60 char
    // "ai_learn_goals": testo libero max 255 char
    // "ai_notes": testo libero max 500 char
    // "first_name": testo
    // "ai_name": testo
    // "hours_per_week": numero 0-168
    // "favourite_player_name": testo
    // Se un campo NON è stato menzionato, NON includerlo.
  },
  "tactical_insights": [
    // Array di insight tattici AZIONABILI (può essere vuoto se solo profilo).
    // Ogni insight deve essere specifico e collegato a giocatori/formazione/tattica.
    // BUONO: {"type":"weakness","text":"Ronaldo inattivo nel 4-2-1-3 — troppo isolato in attacco"}
    // BUONO: {"type":"strength","text":"Contropiede con Mbappé e Eto'o efficace — velocità in transizione"}
    // BUONO: {"type":"lesson","text":"4-3-3 meglio del 4-2-1-3 vs pressing alto — più opzioni centrali"}
    // CATTIVO: {"type":"weakness","text":"non funzionava"} (troppo vago!)
    // { "type": "weakness"|"strength"|"lesson", "text": "insight specifico e azionabile, max 150 char" }
  ],
  "conversation_summary": "riassunto 1-2 frasi della conversazione",
  "outcome": null
  // "outcome": "win"|"loss"|"draw"|null — solo se l'utente ha menzionato l'esito
}`
}

async function charge(credits, capability, input) {
  const charged = {
    capability,
    amount: AI_COST,
    userId: input.userId,
    idempotencyKey: requireIdempotencyKey(input.idempotencyKey)
  }
  const result = await credits.deduct(charged)
  if (!result?.ok) throw serviceError('Insufficient credits', 402, 'insufficient_credits')
  return charged
}

async function withRefund(credits, charged, action, logger) {
  try {
    return await action()
  } catch (error) {
    try {
      await credits.refund(charged)
    } catch (refundError) {
      logger?.error?.({ error: refundError }, 'Coach feedback refund failed')
    }
    throw error
  }
}

async function completionText(openai, body, operation) {
  const response = await openai.complete(body, operation)
  const data = await response.json()
  return data?.choices?.[0]?.message?.content
}

async function chatCompletion(openai, body) {
  try {
    return await completionText(openai, body, 'coach-feedback-chat')
  } catch (error) {
    if (error?.type !== 'model_not_found' || body.model === 'gpt-4o') throw error
    return completionText(openai, { ...body, model: 'gpt-4o' }, 'coach-feedback-chat-fallback')
  }
}

export function createCoachFeedbackService({
  openai,
  credits,
  db,
  aiKnowledge,
  config = {},
  logger = console
}) {
  if (!openai || !credits || !db || !aiKnowledge) {
    throw new TypeError('openai, credits, db, and aiKnowledge are required')
  }

  return {
    async chat(input) {
      assertLive(config)
      const message = typeof input.message === 'string' ? input.message.trim() : ''
      if (!message) throw serviceError('Message is required', 400, 'message_required')
      if (message.length > MAX_MESSAGE_LENGTH) {
        throw serviceError('Message too long', 400, 'message_too_long')
      }
      const history = normalizeHistory(input.history)
      const context = await db.loadChatContext(input)
      const messages = [
        {
          role: 'system',
          content: buildSystemPrompt(
            input.lang,
            buildProfileContext(context.profile),
            buildMatchContext(context.match)
          )
        },
        ...history,
        { role: 'user', content: message }
      ]
      const charged = await charge(credits, 'coach-feedback-chat', input)
      return withRefund(credits, charged, async () => {
        const content = await chatCompletion(openai, {
          model: config.openAiModel || 'gpt-5.2',
          messages,
          max_completion_tokens: 400,
          temperature: 0.7
        })
        return {
          response: content || (input.lang === 'it'
            ? 'Non ho capito, puoi ripetere?'
            : "I didn't understand, can you repeat?"),
          remaining: input.rateLimit?.remaining,
          resetAt: input.rateLimit?.resetAt,
          matchId: context.match?.id || null
        }
      }, logger)
    },

    async save(input) {
      assertLive(config)
      const conversation = Array.isArray(input.conversation)
        ? input.conversation.slice(0, MAX_CONVERSATION_MESSAGES)
        : []
      if (conversation.length === 0) {
        throw serviceError('Empty conversation', 400, 'conversation_required')
      }
      const sessionType = ['profile_setup', 'feedback', 'update'].includes(input.sessionType)
        ? input.sessionType
        : 'feedback'
      const requestedMatchId =
        typeof input.matchId === 'string' && input.matchId.length > 10 ? input.matchId : null
      const match = await db.loadOwnedMatch({ ...input, matchId: requestedMatchId })
      const charged = await charge(credits, 'save-coach-feedback', input)

      const result = await withRefund(credits, charged, async () => {
        const content = await completionText(openai, {
          model: config.openAiModel || 'gpt-5.2',
          messages: [
            {
              role: 'system',
              content: 'You extract structured data from conversations. Respond ONLY with valid JSON, no markdown, no backticks.'
            },
            { role: 'user', content: buildExtractionPrompt(conversation, match) }
          ],
          max_completion_tokens: 800,
          temperature: 0.1,
          response_format: { type: 'json_object' }
        }, 'save-coach-feedback')
        let extracted
        try {
          extracted = JSON.parse(content || '{}')
        } catch {
          throw serviceError('Unable to parse extracted feedback', 502, 'parse_error')
        }
        const profileUpdates = validateProfileUpdates(extracted.profile_updates)
        const profileFieldsUpdated = Object.keys(profileUpdates)
        if (profileUpdates.ai_weak_point) {
          profileUpdates.common_problems = [
            WEAK_POINT_TO_LABEL[profileUpdates.ai_weak_point] || profileUpdates.ai_weak_point
          ]
        }
        const insights = validateInsights(extracted.tactical_insights)
        const summary = typeof extracted.conversation_summary === 'string'
          ? extracted.conversation_summary.trim().slice(0, 500)
          : ''
        const outcome = ['win', 'loss', 'draw'].includes(extracted.outcome)
          ? extracted.outcome
          : null
        await db.saveFeedback({
          ...input,
          match,
          sessionType,
          profileUpdates,
          profileFieldsUpdated,
          insights,
          summary,
          outcome
        })
        return {
          response: {
            success: true,
            profile_fields_updated: profileFieldsUpdated,
            insights_count: insights.length,
            session_type: sessionType
          },
          knowledgeInput: { token: input.token, userId: input.userId }
        }
      }, logger)

      Promise.resolve()
        .then(() => aiKnowledge.update(result.knowledgeInput))
        .catch((error) => logger?.error?.({ error }, 'AI knowledge update failed'))
      return result.response
    }
  }
}
