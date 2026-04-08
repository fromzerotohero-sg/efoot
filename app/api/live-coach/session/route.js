import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractBearerToken, validateToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { checkCredits, deductCredits } from '@/lib/creditService'
import { buildLiveCoachContext } from '@/lib/liveCoachContext'
import { LIVE_COACH_HEARTBEAT_INTERVAL_MS, LIVE_COACH_MINUTE_COST, LIVE_COACH_START_COST } from '@/lib/liveCoachPricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_VOICE = 'marin'
const DEFAULT_MODEL = 'gpt-realtime'
const SUPPORTED_VOICES = new Set(['marin'])
const CONTEXT_TIMEOUT_MS = 3400

function normalizeOpponentContext(raw) {
  if (!raw || typeof raw !== 'object') return null

  const formation = raw.formation || raw.formation_name || raw?.extracted_data?.formation || null
  const playingStyle = raw.playing_style || raw?.extracted_data?.playing_style || null
  const tacticalStyle = raw.tactical_style || raw?.extracted_data?.tactical_style || null
  const players = Array.isArray(raw.players)
    ? raw.players
    : Array.isArray(raw?.extracted_data?.players)
      ? raw.extracted_data.players
      : []
  const coach = raw.coach && typeof raw.coach === 'object'
    ? raw.coach
    : raw?.extracted_data?.coach && typeof raw.extracted_data.coach === 'object'
      ? raw.extracted_data.coach
      : null

  if (!formation && players.length === 0 && !playingStyle && !tacticalStyle) return null

  return {
    formation,
    players: players.slice(0, 11),
    playing_style: playingStyle,
    tactical_style: tacticalStyle,
    ...(coach ? { coach } : {})
  }
}

async function fetchLatestOpponentContext(admin, userId) {
  try {
    const { data, error } = await admin
      .from('opponent_formations')
      .select('formation_name, playing_style, tactical_style, players, extracted_data, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return normalizeOpponentContext(data)
  } catch (error) {
    console.error('[live-coach/session] latest opponent fetch error:', error)
    return null
  }
}

function getFallbackLiveCoachContext(lang = 'it', { liveState = null, opponentContext = null } = {}) {
  const isEn = lang === 'en'
  const stateBits = []
  const minute = Number.parseInt(liveState?.minute, 10)
  const scoreFor = Number.parseInt(liveState?.scoreFor, 10)
  const scoreAgainst = Number.parseInt(liveState?.scoreAgainst, 10)
  const windowsLeft = Number.parseInt(liveState?.windowsLeft, 10)
  if (Number.isFinite(minute)) stateBits.push(isEn ? `minute ${minute}` : `minuto ${minute}`)
  if (Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst)) stateBits.push(isEn ? `score ${scoreFor}-${scoreAgainst}` : `risultato ${scoreFor}-${scoreAgainst}`)
  if (Number.isFinite(windowsLeft)) stateBits.push(isEn ? `windows left ${windowsLeft}` : `finestre residue ${windowsLeft}`)
  const opponentFormation = opponentContext?.formation || opponentContext?.formation_name
  if (opponentFormation) stateBits.push(isEn ? `opponent shape ${opponentFormation}` : `modulo avversario ${opponentFormation}`)
  const stateLine = stateBits.length ? stateBits.join(' | ') : (isEn ? 'live state missing' : 'stato live mancante')
  return {
    instructions: isEn
      ? `You are an enterprise eFootball live coach. Use short practical guidance only.
Rules: action first, max one tactical question, no invented facts, no app instructions.
Response format (mandatory): 1) Now in-play 2) Next break 3) Question only if decision-critical.
Substitutions: minute-aware (0-55 avoid automatic changes, 56-70 primary window, 71-85 scoreline-driven, 86+ control only). Defenders are changed rarely by default.
If opponent context is missing, do not invent opponent lineup/matchups. Ask one targeted question about opponent shape or main threat and keep advice conservative.
If context is incomplete, give the safest correction now and ask one high-value closed tactical question.
Live hints: ${stateLine}`
      : `Sei un coach live enterprise di eFootball. Dai solo indicazioni pratiche e brevi.
Regole: prima azione, massimo una domanda tattica, niente fatti inventati, niente istruzioni d'uso app.
Formato risposta (obbligatorio): 1) Adesso in-play 2) Prossima pausa 3) Domanda solo se decisiva.
Sostituzioni: logica per minutaggio (0-55 evita cambi automatici, 56-70 finestra principale, 71-85 guidate dal risultato, 86+ solo controllo). I difensori si cambiano raramente di default.
Se manca il contesto avversario, non inventare modulo o matchup avversari. Fai una sola domanda mirata su modulo/minaccia principale e tieni la correzione prudente.
Se il contesto e incompleto, dai subito la correzione piu sicura e fai una sola domanda tattica chiusa ad alto valore.
Indizi live: ${stateLine}`,
    snapshot: {
      liveState: liveState || null,
      opponent: opponentContext || null,
      contextQuality: 'fallback-smart'
    }
  }
}

async function buildContextWithTimeout({ userId, lang, opponentContext, liveState }) {
  const fallback = getFallbackLiveCoachContext(lang, { liveState, opponentContext })
  let timeoutHandle = null
  const timeoutPromise = new Promise(resolve => {
    timeoutHandle = setTimeout(() => resolve(fallback), CONTEXT_TIMEOUT_MS)
  })
  try {
    return await Promise.race([
      buildLiveCoachContext({ userId, lang, opponentContext, liveState }),
      timeoutPromise
    ])
  } catch (error) {
    console.error('[live-coach/session] context build error:', error)
    return fallback
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle)
  }
}

async function resolveUser(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { error: 'Server configuration missing.', status: 500 }
  }

  const token = extractBearerToken(req)
  if (!token) return { error: 'Authentication required.', status: 401 }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) {
    return { error: 'Invalid or expired authentication.', status: 401 }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .maybeSingle()

    if (!existingProfile?.user_id) {
      return { error: 'User profile not found.', status: 404 }
    }
    userId = existingProfile.user_id
  }

  return { admin, token, userId, userData }
}

function sanitizeVoice(voice) {
  const value = String(voice || '').trim().toLowerCase()
  return SUPPORTED_VOICES.has(value) ? value : DEFAULT_VOICE
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key missing.' }, { status: 500 })
    }

    const auth = await resolveUser(req)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { admin, token, userId } = auth
    const body = await req.json().catch(() => ({}))
    const lang = body?.lang === 'en' ? 'en' : 'it'
    const voice = sanitizeVoice(body?.voice)
    const providedOpponentContext = normalizeOpponentContext(
      body?.opponentContext && typeof body.opponentContext === 'object'
        ? body.opponentContext
        : null
    )
    const opponentContext = providedOpponentContext || await fetchLatestOpponentContext(admin, userId)
    const liveState = body?.liveState && typeof body.liveState === 'object'
      ? body.liveState
      : null

    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/live-coach/session'] || { maxRequests: 6, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/live-coach/session', rateLimitConfig.maxRequests, rateLimitConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: lang === 'en' ? 'Too many attempts. Try again shortly.' : 'Troppe richieste. Riprova tra poco.' }, { status: 429 })
    }

    const hasCredits = await checkCredits(admin, userId, LIVE_COACH_START_COST)
    if (!hasCredits) {
      return NextResponse.json(
        { error: lang === 'en' ? 'Insufficient Hero Points for Live Coach.' : 'Hero Points insufficienti per Coach Live.' },
        { status: 402 }
      )
    }

    const contextPromise = buildContextWithTimeout({ userId, lang, opponentContext, liveState })
    const context = await contextPromise

    const { data: sessionRow, error: sessionError } = await admin
      .from('live_coach_sessions')
      .insert({
        user_id: userId,
        language: lang,
        status: 'starting',
        realtime_model: DEFAULT_MODEL,
        voice,
        start_cost_hp: LIVE_COACH_START_COST,
        minute_cost_hp: LIVE_COACH_MINUTE_COST,
        total_hp_charged: 0,
        user_context: context.snapshot || {},
        opponent_context: opponentContext || {},
        session_meta: {
          source: 'premium_launcher',
          mode: 'webrtc_ephemeral',
          opponentContextSource: providedOpponentContext ? 'request' : (opponentContext ? 'supabase_latest' : 'missing'),
          liveState: liveState || null
        }
      })
      .select('id, created_at')
      .single()

    if (sessionError || !sessionRow?.id) {
      console.error('[live-coach/session] insert error:', sessionError)
      return NextResponse.json({ error: lang === 'en' ? 'Could not create live session.' : 'Impossibile creare la sessione live.' }, { status: 500 })
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: DEFAULT_MODEL,
          instructions: context.instructions,
          audio: {
            input: {
              turn_detection: {
                type: 'server_vad',
                idle_timeout_ms: 6000
              }
            },
            output: {
              voice
            }
          },
          truncation: {
            type: 'retention_ratio',
            retention_ratio: 0.8,
            token_limits: {
              post_instructions: 8000
            }
          }
        }
      })
    })

    const secretPayload = await openAiResponse.json().catch(() => ({}))
    const clientSecret = secretPayload?.value || secretPayload?.client_secret?.value || null

    if (!openAiResponse.ok || !clientSecret) {
      console.error('[live-coach/session] realtime secret error:', secretPayload)
      await admin
        .from('live_coach_sessions')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
          session_meta: {
            source: 'premium_launcher',
            mode: 'webrtc_ephemeral',
            openai_error: secretPayload?.error || secretPayload || null
          }
        })
        .eq('id', sessionRow.id)
        .eq('user_id', userId)

      return NextResponse.json(
        { error: lang === 'en' ? 'Realtime voice is temporarily unavailable.' : 'La voce realtime e temporaneamente non disponibile.' },
        { status: 503 }
      )
    }

    const deduction = await deductCredits(admin, userId, token, LIVE_COACH_START_COST, 'live-coach-start')
    if (!deduction.success) {
      await admin
        .from('live_coach_sessions')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
          session_meta: {
            source: 'premium_launcher',
            mode: 'webrtc_ephemeral',
            billing_error: 'insufficient_credits_on_finalize'
          }
        })
        .eq('id', sessionRow.id)
        .eq('user_id', userId)

      return NextResponse.json(
        { error: lang === 'en' ? 'Insufficient Hero Points for Live Coach.' : 'Hero Points insufficienti per Coach Live.' },
        { status: 402 }
      )
    }

    await admin
      .from('live_coach_sessions')
      .update({
        status: 'active',
        total_hp_charged: LIVE_COACH_START_COST,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionRow.id)
      .eq('user_id', userId)

    return NextResponse.json({
      sessionId: sessionRow.id,
      startedAt: sessionRow.created_at,
      clientSecret,
      model: DEFAULT_MODEL,
      voice,
      heartbeatMs: LIVE_COACH_HEARTBEAT_INTERVAL_MS,
      pricing: {
        startHp: LIVE_COACH_START_COST,
        eachExtraMinuteHp: LIVE_COACH_MINUTE_COST
      }
    })
  } catch (error) {
    console.error('[live-coach/session] Error:', error)
    return NextResponse.json({ error: 'Failed to initialize Live Coach.' }, { status: 500 })
  }
}
