import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { deductCredits, AI_COST } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Stessa whitelist di save-ai-info per validazione profilo */
const PROFILE_WHITELIST = {
  connection_quality: ['good', 'unstable', 'lag'],
  slow_opponent_connection_issues: ['yes', 'no', 'sometimes'],
  input_delay: ['yes', 'no', 'sometimes'],
  pass_level: ['pa1', 'pa2', 'pa3'],
  smart_assist: ['yes', 'no'],
  platform: ['console', 'pc', 'mobile', 'other'],
  ai_weak_point: ['defence', 'attack', 'set_pieces', 'transitions', 'final_minutes']
}

const MAX_TEXT = 255
const MAX_NOTES = 500
const MAX_CONVERSATION_MESSAGES = 20

const ERRORS = {
  AUTH_REQUIRED: { it: 'Autenticazione richiesta.', en: 'Authentication required.' },
  AUTH_INVALID: { it: 'Token non valido o scaduto.', en: 'Invalid or expired token.' },
  BODY_INVALID: { it: 'Corpo della richiesta non valido.', en: 'Invalid request body.' },
  CONVERSATION_REQUIRED: { it: 'Conversazione vuota.', en: 'Empty conversation.' },
  RATE_LIMIT: { it: 'Troppe richieste.', en: 'Rate limit exceeded.' },
  CONFIG: { it: 'Configurazione mancante.', en: 'Server configuration missing.' },
  SERVER: { it: 'Errore durante il salvataggio.', en: 'Error saving. Please retry.' }
}

function getLang(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

/**
 * Prompt di estrazione duale: profilo + insight tattici.
 * L'output deve essere JSON puro.
 */
function buildExtractionPrompt(conversation, matchInfo) {
  const conversationText = conversation
    .map(m => `${m.role === 'user' ? 'UTENTE' : 'COACH'}: ${m.content}`)
    .join('\n')

  return `Analizza questa conversazione tra un utente eFootball e il suo coach AI.
Estrai TUTTI i dati menzionati dall'utente in formato JSON.

CONVERSAZIONE:
${conversationText}

${matchInfo ? `CONTESTO PARTITA: formazione ${matchInfo.formation_played || '?'}, avversario ${matchInfo.opponent_name || '?'}, risultato ${matchInfo.result || '?'}` : ''}

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

/**
 * Valida e pulisce profile_updates contro la whitelist.
 * Scarta silenziosamente valori non validi.
 */
function validateProfileUpdates(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const clean = {}

  // Campi whitelist
  for (const [key, allowed] of Object.entries(PROFILE_WHITELIST)) {
    if (raw[key] === undefined || raw[key] === null) continue
    const v = String(raw[key]).trim().toLowerCase()
    if (!v) continue
    if (key === 'ai_weak_point') {
      // Accetta sia whitelist che testo libero
      if (allowed.includes(v)) {
        clean[key] = v
      } else if (v.length <= 60) {
        clean[key] = v
      }
    } else if (allowed.includes(v)) {
      clean[key] = v
    }
    // Se non valido, scartato silenziosamente
  }

  // Campi testo libero
  const textFields = ['first_name', 'ai_name', 'ai_learn_goals', 'favourite_player_name']
  for (const key of textFields) {
    if (raw[key] === undefined || raw[key] === null) continue
    const v = String(raw[key]).trim()
    if (v && v.length <= MAX_TEXT) clean[key] = v
  }

  // ai_notes (max 500)
  if (raw.ai_notes !== undefined && raw.ai_notes !== null) {
    const v = String(raw.ai_notes).trim()
    if (v && v.length <= MAX_NOTES) clean.ai_notes = v
  }

  // hours_per_week (numero)
  if (raw.hours_per_week !== undefined && raw.hours_per_week !== null) {
    const n = parseInt(String(raw.hours_per_week), 10)
    if (Number.isFinite(n) && n >= 0 && n <= 168) clean.hours_per_week = n
  }

  return clean
}

/**
 * Valida tactical_insights.
 */
function validateInsights(raw) {
  if (!Array.isArray(raw)) return []
  const validTypes = ['weakness', 'strength', 'lesson']
  return raw
    .filter(i => i && typeof i === 'object' && validTypes.includes(i.type) && typeof i.text === 'string' && i.text.trim().length > 0)
    .slice(0, 10) // max 10 insight per sessione
    .map(i => ({ type: i.type, text: i.text.trim().slice(0, 200) }))
}

export async function POST(req) {
  const lang = getLang(req)

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
    if (!token) return NextResponse.json({ error: ERRORS.AUTH_REQUIRED[lang] }, { status: 401 })
    const metalgateSession = req.headers.get('x-metalgate-session') === '1'
    const claimedMetalgateUserId = req.headers.get('x-metalgate-user-id')
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey, { forbidSupabaseFallback: metalgateSession })
    if (authError || !userData?.user?.id) return NextResponse.json({ error: ERRORS.AUTH_INVALID[lang] }, { status: 401 })
    if (metalgateSession && claimedMetalgateUserId && claimedMetalgateUserId !== userData.user.id) {
      return NextResponse.json({ error: ERRORS.AUTH_INVALID[lang] }, { status: 401 })
    }
    let userId = userData.user.id

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Se è un utente Metalgate, dobbiamo recuperare il vero user_id (Supabase UUID)
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        console.error('[save-coach-feedback] Metalgate user profile not found for ID:', userId)
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    // 3. Rate limit
    const rlConfig = RATE_LIMIT_CONFIG['/api/save-coach-feedback'] || { maxRequests: 5, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/save-coach-feedback', rlConfig.maxRequests, rlConfig.windowMs)
    if (!rateLimit.allowed) return NextResponse.json({ error: ERRORS.RATE_LIMIT[lang], resetAt: rateLimit.resetAt }, { status: 429 })

    // 4. Parse body
    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: ERRORS.BODY_INVALID[lang] }, { status: 400 }) }

    const conversation = Array.isArray(body.conversation) ? body.conversation.slice(0, MAX_CONVERSATION_MESSAGES) : []
    if (conversation.length === 0) return NextResponse.json({ error: ERRORS.CONVERSATION_REQUIRED[lang] }, { status: 400 })

    const sessionType = ['profile_setup', 'feedback', 'update'].includes(body.session_type) ? body.session_type : 'feedback'
    const matchId = typeof body.match_id === 'string' && body.match_id.length > 10 ? body.match_id : null

    // 5. Load match info (se match_id fornito)
    let matchInfo = null
    if (matchId) {
      const { data: match } = await admin.from('matches')
        .select('id, opponent_name, result, formation_played, playing_style_played')
        .eq('id', matchId).eq('user_id', userId).maybeSingle()
      matchInfo = match
    }

    // Check and deduct credits upfront
    const deduction = await deductCredits(admin, userId, token, AI_COST, 'save-coach-feedback')
    if (!deduction.success) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.' },
        { status: 402 }
      )
    }

    // 6. Estrazione duale via OpenAI (1 call)
    const extractionPrompt = buildExtractionPrompt(conversation, matchInfo)
    let extracted = {}

    try {
      const response = await callOpenAIWithRetry(openaiApiKey, {
        model: process.env.OPENAI_MODEL || 'gpt-5.2',
        messages: [
          { role: 'system', content: 'You extract structured data from conversations. Respond ONLY with valid JSON, no markdown, no backticks.' },
          { role: 'user', content: extractionPrompt }
        ],
        max_completion_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }, 'save-coach-feedback')

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content || '{}'
      extracted = JSON.parse(content)
    } catch (parseErr) {
      console.error('[save-coach-feedback] Extraction parse error:', parseErr)
      extracted = {}
    }

    // 7. Validate & apply profile updates
    const profileUpdates = validateProfileUpdates(extracted.profile_updates)
    const profileFieldsUpdated = Object.keys(profileUpdates)

    if (profileFieldsUpdated.length > 0) {
      // Sincronizza common_problems se ai_weak_point aggiornato
      if (profileUpdates.ai_weak_point) {
        const WEAK_POINT_TO_LABEL = { defence: 'Difesa', attack: 'Attacco', set_pieces: 'Piazzati', transitions: 'Transizioni', final_minutes: 'Finale partita' }
        profileUpdates.common_problems = [WEAK_POINT_TO_LABEL[profileUpdates.ai_weak_point] || profileUpdates.ai_weak_point]
      }
      profileUpdates.updated_at = new Date().toISOString()

      const { error: profileError } = await admin.from('user_profiles')
        .update(profileUpdates)
        .eq('user_id', userId)

      if (profileError) {
        console.error('[save-coach-feedback] Profile update error:', profileError)
      } else {
        if (process.env.NODE_ENV !== 'production') console.log(`[save-coach-feedback] Updated ${profileFieldsUpdated.length} profile fields: ${profileFieldsUpdated.join(', ')}`)
      }
    }

    // 8. Validate & save tactical feedback
    const insights = validateInsights(extracted.tactical_insights)
    const summary = typeof extracted.conversation_summary === 'string'
      ? extracted.conversation_summary.trim().slice(0, 500) : ''
    const outcome = ['win', 'loss', 'draw'].includes(extracted.outcome) ? extracted.outcome : null

    const { error: feedbackError } = await admin.from('user_tactical_feedback').insert({
      user_id: userId,
      match_id: matchId,
      session_type: sessionType,
      formation_played: matchInfo?.formation_played || null,
      style_played: matchInfo?.playing_style_played || null,
      opponent_name: matchInfo?.opponent_name || null,
      outcome,
      conversation_summary: summary,
      insights,
      profile_fields_updated: profileFieldsUpdated
    })

    if (feedbackError) {
      console.error('[save-coach-feedback] Feedback insert error:', feedbackError)
      return NextResponse.json({ error: ERRORS.SERVER[lang] }, { status: 500 })
    }

    // 10. Aggiorna AI Knowledge Score e Classifica (async)
    if (supabaseUrl && serviceKey) {
      // AI Knowledge (Coach Training component)
      import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[save-coach-feedback] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[save-coach-feedback] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })

    }

    return NextResponse.json({
      success: true,
      profile_fields_updated: profileFieldsUpdated,
      insights_count: insights.length,
      session_type: sessionType
    })

  } catch (error) {
    console.error('[save-coach-feedback] Error:', error)
    return NextResponse.json({ error: ERRORS.SERVER[lang] }, { status: 500 })
  }
}
