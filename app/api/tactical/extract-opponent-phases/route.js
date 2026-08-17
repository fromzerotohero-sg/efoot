import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const VALID_POSITIONS = new Set(['PT','GK','DC','CB','TD','RB','TS','LB','MED','DMF','CC','CMF','TRQ','AMF','CLD','RMF','CLS','LMF','EDA','RWF','ESA','LWF','SP','SS','P','CF'])

function imageOk(value) {
  if (typeof value !== 'string' || !value.startsWith('data:image/')) return false
  const encoded = value.split(',')[1]
  if (!encoded) return false
  return (encoded.length * 3) / 4 <= MAX_IMAGE_BYTES
}

function cleanPhase(raw) {
  if (!raw || typeof raw !== 'object') return null
  const players = Array.isArray(raw.players)
    ? raw.players.slice(0, 11).map((player, index) => ({
        slot_index: Number.isFinite(Number(player?.slot_index)) ? Number(player.slot_index) : index,
        player_name: typeof player?.player_name === 'string' ? player.player_name.trim().slice(0, 80) : null,
        position: VALID_POSITIONS.has(String(player?.position || '').trim().toUpperCase())
          ? String(player.position).trim().toUpperCase()
          : null,
        overall_rating: Number.isFinite(Number(player?.overall_rating)) ? Number(player.overall_rating) : null
      }))
    : []

  const slotPositions = {}
  if (raw.slot_positions && typeof raw.slot_positions === 'object') {
    for (let i = 0; i <= 10; i += 1) {
      const item = raw.slot_positions[i] ?? raw.slot_positions[String(i)]
      if (!item || typeof item !== 'object') continue
      const x = Number(item.x)
      const y = Number(item.y)
      const position = String(item.position || '').trim().toUpperCase()
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      slotPositions[i] = {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        position: VALID_POSITIONS.has(position) ? position : (players[i]?.position || '?')
      }
    }
  }

  return {
    formation: typeof raw.formation === 'string' ? raw.formation.trim().slice(0, 50) : null,
    playing_style: typeof raw.playing_style === 'string' ? raw.playing_style.trim().slice(0, 100) : null,
    tactical_style: typeof raw.tactical_style === 'string' ? raw.tactical_style.trim().slice(0, 120) : null,
    overall_strength: Number.isFinite(Number(raw.overall_strength)) ? Number(raw.overall_strength) : null,
    players,
    slot_positions: slotPositions,
    visual_tactical_profile: raw.visual_tactical_profile && typeof raw.visual_tactical_profile === 'object'
      ? raw.visual_tactical_profile
      : null,
    coach: raw.coach && typeof raw.coach === 'object' ? raw.coach : null
  }
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

    const rate = await checkRateLimit(userId, '/api/tactical/extract-opponent-phases', 8, 60_000)
    if (!rate.allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const attackImage = body.attackImageDataUrl
    const defenseImage = body.defenseImageDataUrl || null
    if (!imageOk(attackImage) || (defenseImage && !imageOk(defenseImage))) {
      return NextResponse.json({ error: 'Carica una schermata Attacco valida e, se disponibile, una schermata Difesa valida (max 10MB).' }, { status: 400 })
    }

    const deduction = await deductCredits(admin, userId, token, AI_COST, 'extract-opponent-phases')
    if (!deduction.success) return NextResponse.json({ error: 'Crediti insufficienti. Ricarica per continuare.' }, { status: 402 })
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'extract-opponent-phases', functionName: 'extract-opponent-phases:POST' }

    const prompt = `Sei un estrattore tattico eFootball v6. Le immagini sono ETICHETTATE dall'utente: la prima è la formazione AVVERSARIA IN ATTACCO; ${defenseImage ? 'la seconda è la formazione AVVERSARIA IN DIFESA.' : 'non è stata fornita la fase DIFESA.'}

Non decidere tu quale fase rappresenta una foto. Non inventare giocatori, ruoli, modulo, allenatore, stile squadra o valori non leggibili.

Per ogni fase fornita estrai:
- formation: modulo visibile, se leggibile
- playing_style: stile squadra solo se visibile
- tactical_style: breve descrizione SOLO di ciò che la disposizione mostra
- overall_strength: solo se visibile
- players: max 11, con slot_index 0-10, player_name, position, overall_rating
- slot_positions: coordinate relative x/y 0-100 coerenti con la disposizione visiva + position
- coach: solo dati allenatore visibili
- visual_tactical_profile: central_density (low/medium/high), width_profile (narrow/balanced/wide), side_bias (left/right/balanced/unclear), attackable_zones[], defensive_gaps[], shape_confidence 0-1

Se sono presenti due fasi, confrontale senza inventare cause e restituisci movement_summary con i cambiamenti di disposizione visivamente evidenti. Se sono quasi uguali, fluid_detected=false. Se non sei sicuro, fluid_detected=null.

JSON ESATTO:
{
  "attack": {"formation":null,"playing_style":null,"tactical_style":null,"overall_strength":null,"players":[],"slot_positions":{},"coach":null,"visual_tactical_profile":null},
  "defense": ${defenseImage ? '{"formation":null,"playing_style":null,"tactical_style":null,"overall_strength":null,"players":[],"slot_positions":{},"coach":null,"visual_tactical_profile":null}' : 'null'},
  "fluid_detected": ${defenseImage ? 'true' : 'null'},
  "movement_summary": []
}

Restituisci SOLO JSON valido.`

    const content = [
      { type: 'text', text: prompt },
      { type: 'text', text: 'IMMAGINE 1 — ATTACCO' },
      { type: 'image_url', image_url: { url: attackImage, detail: 'high' } }
    ]
    if (defenseImage) {
      content.push({ type: 'text', text: 'IMMAGINE 2 — DIFESA' })
      content.push({ type: 'image_url', image_url: { url: defenseImage, detail: 'high' } })
    }

    const response = await callOpenAIWithRetry(apiKey, {
      model: 'gpt-4o',
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 4000
    }, 'extract-opponent-phases')
    const parsed = await parseOpenAIResponse(response, 'extract-opponent-phases')

    const attack = cleanPhase(parsed?.attack)
    const defense = defenseImage ? cleanPhase(parsed?.defense) : null
    if (!attack?.formation && attack?.players?.length === 0) {
      return NextResponse.json({ error: 'Non riesco a leggere la formazione di attacco. Usa uno screenshot più nitido.' }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      phases: {
        attack,
        defense,
        fluid_detected: defense ? (parsed?.fluid_detected === true ? true : parsed?.fluid_detected === false ? false : null) : null,
        movement_summary: Array.isArray(parsed?.movement_summary)
          ? parsed.movement_summary.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 12)
          : []
      },
      charged_hp: AI_COST
    })
  } catch (error) {
    console.error('[extract-opponent-phases] error:', error)
    if (creditChargeContext) {
      try {
        return await handleCreditOperationError(error, creditChargeContext)
      } catch {}
    }
    return NextResponse.json({ error: error?.message || 'Errore durante la lettura delle formazioni.' }, { status: 500 })
  }
}
