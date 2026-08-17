import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'
import { getRelevantSectionsForContext } from '@/lib/ragHelper'
import { CURRENT_INDIVIDUAL_INSTRUCTION_IDS } from '@/lib/efootballV6Rules'
import {
  buildFluidFormationState,
  buildPhaseMatchupContext,
  evaluateLinkUpPlay,
  normalizeLinkUpPlays
} from '@/lib/efootballV6TacticalModel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DECISIONS = new Set(['keep_current', 'use', 'modify_attack', 'modify_defense', 'disable', 'not_needed', 'insufficient_data'])
const VALID_SLOTS = new Set(['attacco_1', 'attacco_2', 'difesa_1', 'difesa_2'])
const ATTACK_INSTRUCTIONS = new Set(['difensivo', 'ancoraggio'])
const DEFENSE_INSTRUCTIONS = new Set(['marcatura_stretta', 'marcatura_uomo', 'contropiede'])

function text(value, max = 500) {
  return typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : ''
}

function phaseFromOpponentRow(row) {
  const extracted = row?.extracted_data && typeof row.extracted_data === 'object' ? row.extracted_data : {}
  const fluid = extracted.fluid_formation && typeof extracted.fluid_formation === 'object'
    ? extracted.fluid_formation
    : null
  const base = {
    formation: row?.formation_name || extracted.formation || null,
    slot_positions: extracted.slot_positions || null,
    players: Array.isArray(row?.players) && row.players.length ? row.players : (Array.isArray(extracted.players) ? extracted.players : []),
    visual_tactical_profile: extracted.visual_tactical_profile || null,
    playing_style: row?.playing_style || extracted.playing_style || null
  }
  if (!fluid) return { base, attack: base, defense: null, fluid_detected: null, movement_summary: [] }
  return {
    base,
    attack: fluid.attack || base,
    defense: fluid.defense || null,
    fluid_detected: fluid.fluid_detected ?? null,
    movement_summary: Array.isArray(fluid.movement_summary) ? fluid.movement_summary.slice(0, 12) : []
  }
}

function roleLine(slotPositions = {}) {
  const counts = { defense: 0, midfield: 0, attack: 0, goalkeeper: 0 }
  const defs = new Set(['DC','CB','TD','RB','TS','LB','ETD','ETS'])
  const mids = new Set(['MED','DMF','CC','CMF','TRQ','AMF','CLD','RMF','CLS','LMF'])
  const atks = new Set(['EDA','RWF','ESA','LWF','SP','SS','P','CF'])
  for (const item of Object.values(slotPositions || {})) {
    const position = String(item?.position || '').trim().toUpperCase()
    if (position === 'PT' || position === 'GK') counts.goalkeeper += 1
    else if (defs.has(position)) counts.defense += 1
    else if (mids.has(position)) counts.midfield += 1
    else if (atks.has(position)) counts.attack += 1
  }
  return counts
}

function compactFormation(value) {
  if (!value) return null
  return {
    formation: value.formation || null,
    slot_positions: value.slot_positions || null,
    shape: roleLine(value.slot_positions || {})
  }
}

function compactOpponentPhase(value) {
  if (!value) return null
  return {
    formation: value.formation || null,
    playing_style: value.playing_style || null,
    slot_positions: value.slot_positions || null,
    visual_tactical_profile: value.visual_tactical_profile || null,
    players: Array.isArray(value.players)
      ? value.players.slice(0, 11).map((p) => ({
          slot_index: p.slot_index,
          player_name: p.player_name || p.name || null,
          position: p.position || null,
          overall_rating: p.overall_rating ?? null
        }))
      : []
  }
}

function sanitizeAiOutput(raw, starters, linkUps) {
  const rosterById = new Map((starters || []).map((p) => [String(p.id), p]))
  const rosterByName = new Map((starters || []).map((p) => [String(p.player_name || '').trim().toLowerCase(), p]))

  const decision = DECISIONS.has(raw?.fluid_formation_recommendation?.decision)
    ? raw.fluid_formation_recommendation.decision
    : 'insufficient_data'

  const instructions = []
  for (const item of Array.isArray(raw?.individual_instructions) ? raw.individual_instructions : []) {
    const slot = String(item?.slot || '').trim().toLowerCase()
    const instruction = String(item?.instruction || '').trim().toLowerCase()
    const playerById = item?.player_id ? rosterById.get(String(item.player_id)) : null
    const playerByName = item?.player_name ? rosterByName.get(String(item.player_name).trim().toLowerCase()) : null
    const player = playerById || playerByName
    if (!player || !VALID_SLOTS.has(slot) || !CURRENT_INDIVIDUAL_INSTRUCTION_IDS.includes(instruction)) continue
    if (slot.startsWith('attacco_') && !ATTACK_INSTRUCTIONS.has(instruction)) continue
    if (slot.startsWith('difesa_') && !DEFENSE_INSTRUCTIONS.has(instruction)) continue
    instructions.push({
      slot,
      instruction,
      player_id: player.id,
      player_name: player.player_name,
      position: player.position,
      reason: text(item.reason, 500)
    })
    if (instructions.length >= 4) break
  }

  const changes = []
  for (const item of Array.isArray(raw?.starting_xi_changes) ? raw.starting_xi_changes : []) {
    const incoming = item?.incoming_player_id ? rosterById.get(String(item.incoming_player_id)) : null
    const outgoing = item?.outgoing_player_id ? rosterById.get(String(item.outgoing_player_id)) : null
    // This endpoint receives starters only for strict no-hallucination output; it therefore
    // does not surface an unverified bench substitution.
    if (!incoming || !outgoing || incoming.id === outgoing.id) continue
    changes.push({
      incoming_player_id: incoming.id,
      incoming_player_name: incoming.player_name,
      outgoing_player_id: outgoing.id,
      outgoing_player_name: outgoing.player_name,
      reason: text(item.reason, 500)
    })
  }

  const allowedLinkNames = new Set((linkUps || []).map((item) => String(item.name || '').toLowerCase()))
  const linkAdvice = (Array.isArray(raw?.link_up_recommendations) ? raw.link_up_recommendations : [])
    .filter((item) => allowedLinkNames.has(String(item?.name || '').toLowerCase()))
    .slice(0, 2)
    .map((item) => ({
      name: text(item.name, 180),
      decision: ['use', 'do_not_use', 'not_activatable'].includes(item.decision) ? item.decision : 'not_activatable',
      focal_player: text(item.focal_player, 100),
      key_man_player: text(item.key_man_player, 100),
      reason: text(item.reason, 600)
    }))

  return {
    analysis: {
      client_attack_vs_opponent_defense: text(raw?.analysis?.client_attack_vs_opponent_defense, 1400),
      opponent_attack_vs_client_defense: text(raw?.analysis?.opponent_attack_vs_client_defense, 1400),
      key_risks: (Array.isArray(raw?.analysis?.key_risks) ? raw.analysis.key_risks : []).map((x) => text(x, 300)).filter(Boolean).slice(0, 5),
      key_opportunities: (Array.isArray(raw?.analysis?.key_opportunities) ? raw.analysis.key_opportunities : []).map((x) => text(x, 300)).filter(Boolean).slice(0, 5)
    },
    fluid_formation_recommendation: {
      decision,
      title: text(raw?.fluid_formation_recommendation?.title, 220),
      reason: text(raw?.fluid_formation_recommendation?.reason, 900),
      attack_action: text(raw?.fluid_formation_recommendation?.attack_action, 700),
      defense_action: text(raw?.fluid_formation_recommendation?.defense_action, 700)
    },
    link_up_recommendations: linkAdvice,
    individual_instructions: instructions,
    starting_xi_changes: changes,
    play_summary: {
      match_key: text(raw?.play_summary?.match_key, 500),
      attacking: text(raw?.play_summary?.attacking, 700),
      defending: text(raw?.play_summary?.defending, 700),
      avoid: text(raw?.play_summary?.avoid, 500)
    },
    confidence: Math.max(0, Math.min(100, Number(raw?.confidence) || 0)),
    data_quality: ['high', 'medium', 'low'].includes(raw?.data_quality) ? raw.data_quality : 'medium'
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

    const rate = await checkRateLimit(userId, '/api/tactical/generate-v6-countermeasures', 10, 60_000)
    if (!rate.allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const opponentId = String(body.opponent_formation_id || '').trim()
    const language = body.language === 'en' ? 'en' : 'it'
    if (!UUID_RE.test(opponentId)) return NextResponse.json({ error: 'Invalid opponent formation id' }, { status: 400 })

    const [
      { data: opponent, error: opponentError },
      { data: baseFormation, error: baseError },
      { data: variants, error: variantsError },
      { data: roster, error: rosterError },
      { data: styles, error: stylesError },
      { data: tactics, error: tacticsError },
      { data: coach, error: coachError },
      { data: patterns },
      { data: gameAnalysis },
      { data: feedback }
    ] = await Promise.all([
      admin.from('opponent_formations')
        .select('id, user_id, formation_name, playing_style, tactical_style, overall_strength, players, extracted_data')
        .eq('id', opponentId).eq('user_id', userId).maybeSingle(),
      admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
      admin.from('formation_variants').select('id, phase, formation, slot_positions, is_active, source_version, updated_at').eq('user_id', userId),
      admin.from('players')
        .select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions, photo_slots')
        .eq('user_id', userId).order('slot_index', { ascending: true, nullsFirst: false }),
      admin.from('playing_styles').select('id, name'),
      admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
      admin.from('coaches').select('id, coach_name, playing_style_competence, stat_boosters, connection, extracted_data').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      admin.from('team_tactical_patterns').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('user_game_analysis').select('stats, updated_at').eq('user_id', userId).maybeSingle(),
      admin.from('user_tactical_feedback').select('insights, formation_played, outcome, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
    ])

    if (opponentError || !opponent) return NextResponse.json({ error: 'Opponent formation not found' }, { status: 404 })
    if (baseError || variantsError || rosterError || stylesError || tacticsError || coachError) {
      console.error('[v6-countermeasures] context errors:', { baseError, variantsError, rosterError, stylesError, tacticsError, coachError })
      return NextResponse.json({ error: 'Unable to load the tactical context' }, { status: 500 })
    }

    const starters = (roster || []).filter((p) => Number.isInteger(p.slot_index) && p.slot_index >= 0 && p.slot_index <= 10)
    if (starters.length < 11 || !baseFormation) {
      return NextResponse.json({ error: 'Completa gli 11 titolari e salva la formazione prima di generare le Contromisure v6.' }, { status: 409 })
    }

    const styleLookup = Object.fromEntries((styles || []).map((item) => [item.id, item.name]))
    const clientFluid = buildFluidFormationState(baseFormation, variants || [])
    const opponentFluid = phaseFromOpponentRow(opponent)
    const matchup = buildPhaseMatchupContext({ clientFluid, opponentFluid })

    const linkUps = normalizeLinkUpPlays(coach || {})
      .map((play) => evaluateLinkUpPlay(play, starters, styleLookup))
      .filter(Boolean)

    const startersForPrompt = starters.map((p) => ({
      id: p.id,
      player_name: p.player_name,
      position: p.position,
      overall_rating: p.overall_rating,
      playing_style: styleLookup[p.playing_style_id] || null,
      skills: Array.isArray(p.skills) ? p.skills.slice(0, 8) : [],
      com_skills: Array.isArray(p.com_skills) ? p.com_skills.slice(0, 5) : [],
      original_positions: p.original_positions || []
    }))

    const rag = getRelevantSectionsForContext('countermeasures', 12000)
    const facts = {
      client: {
        base: compactFormation(clientFluid.base),
        fluid_enabled: clientFluid.enabled,
        attack: compactFormation(clientFluid.enabled ? clientFluid.attack : clientFluid.base),
        defense: compactFormation(clientFluid.enabled ? clientFluid.defense : clientFluid.base),
        starters: startersForPrompt,
        team_playing_style: tactics?.team_playing_style || null,
        current_individual_instructions: tactics?.individual_instructions || null
      },
      opponent: {
        attack: compactOpponentPhase(opponentFluid.attack || opponentFluid.base),
        defense: compactOpponentPhase(opponentFluid.defense),
        fluid_detected: opponentFluid.fluid_detected,
        movement_summary: opponentFluid.movement_summary
      },
      phase_pairings: {
        when_client_attacks: {
          client_formation: matchup.pairings.when_client_attacks.client?.formation || null,
          opponent_formation: matchup.pairings.when_client_attacks.opponent?.formation || null
        },
        when_client_defends: {
          client_formation: matchup.pairings.when_client_defends.client?.formation || null,
          opponent_formation: matchup.pairings.when_client_defends.opponent?.formation || null
        }
      },
      coach: coach ? {
        coach_name: coach.coach_name,
        playing_style_competence: coach.playing_style_competence || {},
        link_up_plays: linkUps
      } : null,
      patterns: patterns || null,
      game_analysis: gameAnalysis || null,
      recent_feedback: feedback || []
    }

    const outputLanguage = language === 'en' ? 'English' : 'Italian'
    const prompt = `You are Hero, the deterministic eFootball v6 tactical coach. Answer in ${outputLanguage}.

OFFICIAL v6 FACTS PROVIDED BY THE PRODUCT SOURCE LOCK:
- Fluid Formation can have a different attacking formation and defensive formation.
- A manager may have up to two Link-up Plays.
- A Link-up Play is evaluated from its own Focal Point and Key Man requirements.

HERO COACH RULES (PRODUCT HEURISTICS, NOT KONAMI FACTS):
1. ALWAYS analyse CLIENT ATTACK vs OPPONENT DEFENCE when opponent defence data exists.
2. ALWAYS analyse OPPONENT ATTACK vs CLIENT DEFENCE.
3. If a phase is missing, say the plan is based on the available phase. NEVER invent the missing formation.
4. When the evidence is sufficient, make a decision. Do not tell the customer "choose", "maybe", "you could evaluate" or equivalent.
5. Fluid Formation is a tactical lever, not automatically better. Decide among: keep_current, use, modify_attack, modify_defense, disable, not_needed. Use insufficient_data only if a decisive recommendation is genuinely impossible.
6. Never change the identity of the XI. A Fluid Formation uses the same starters; it changes their phase layout.
7. Use ONLY player ids/names present in CLIENT STARTERS.
8. Current Individual Instruction ids are ONLY: ${CURRENT_INDIVIDUAL_INSTRUCTION_IDS.join(', ')}. Never recommend Offensive or Deep Line. Never use the technical word "legacy" in customer-facing text.
9. Attack slots attacco_1/attacco_2 accept only difensivo or ancoraggio. Defence slots difesa_1/difesa_2 accept only marcatura_stretta, marcatura_uomo or contropiede.
10. Anchoring is for keeping the assigned player's horizontal positioning more fixed. Do not describe it as lowering the whole defensive line and do not use it as a generic balance instruction.
11. There is no automatic 1:1 replacement for an instruction removed from the current game.
12. Evaluate each Link-up Play separately. If it has no compatible Focal Point or Key Man in the starting XI, mark it not_activatable. Do not claim that two Link-up bonuses necessarily activate simultaneously.
13. Distinguish official mechanics from tactical inference. Do not present Hero heuristics as official Konami rules.
14. Be decisive but never invent unsupported facts, card attributes or hidden game behaviour.

RAG KNOWLEDGE:
${rag}

VERIFIED LIVE DATA:
${JSON.stringify(facts)}

Return ONLY valid JSON with this schema:
{
  "analysis": {
    "client_attack_vs_opponent_defense": "direct phase analysis or clear note that defence phase is unavailable",
    "opponent_attack_vs_client_defense": "direct phase analysis",
    "key_risks": ["max 5"],
    "key_opportunities": ["max 5"]
  },
  "fluid_formation_recommendation": {
    "decision": "keep_current|use|modify_attack|modify_defense|disable|not_needed|insufficient_data",
    "title": "short customer title",
    "reason": "decisive reason grounded in live data",
    "attack_action": "exact action for attacking phase; use player names when relevant",
    "defense_action": "exact action for defensive phase; use player names when relevant"
  },
  "link_up_recommendations": [
    {"name":"existing Link-up name","decision":"use|do_not_use|not_activatable","focal_player":"real starter or empty","key_man_player":"real starter or empty","reason":"why"}
  ],
  "individual_instructions": [
    {"slot":"attacco_1|attacco_2|difesa_1|difesa_2","instruction":"current id only","player_id":"real starter UUID","player_name":"real starter","reason":"why"}
  ],
  "starting_xi_changes": [],
  "play_summary": {"match_key":"one decisive key","attacking":"exact attacking behaviour","defending":"exact defending behaviour","avoid":"what not to do"},
  "confidence": 0,
  "data_quality": "high|medium|low"
}`

    const deduction = await deductCredits(admin, userId, token, AI_COST, 'generate-v6-countermeasures')
    if (!deduction.success) return NextResponse.json({ error: 'Crediti insufficienti. Ricarica per continuare.' }, { status: 402 })
    creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'generate-v6-countermeasures', functionName: 'generate-v6-countermeasures:POST' }

    const preferredModel = process.env.OPENAI_MODEL || 'gpt-5.2'
    const models = [...new Set([preferredModel, 'gpt-4o'])]
    let parsed = null
    let usedModel = null
    let lastError = null

    for (const model of models) {
      try {
        const requestBody = {
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_completion_tokens: 3200
        }
        if (model === 'gpt-4o') requestBody.temperature = 0.15
        const response = await callOpenAIWithRetry(apiKey, requestBody, 'generate-v6-countermeasures')
        parsed = await parseOpenAIResponse(response, 'generate-v6-countermeasures')
        usedModel = model
        break
      } catch (error) {
        lastError = error
        if (error?.type !== 'model_not_found' && model !== 'gpt-4o') {
          // Let the known compatible fallback try once before failing.
          continue
        }
      }
    }

    if (!parsed) throw lastError || new Error('Unable to generate the tactical plan')
    const result = sanitizeAiOutput(parsed, starters, linkUps)

    // Ensure the response never hides the actual availability of the opponent phase data.
    result.phase_data = {
      client_fluid_enabled: clientFluid.enabled,
      opponent_defense_available: Boolean(opponentFluid.defense),
      opponent_fluid_detected: opponentFluid.fluid_detected,
      client_attack_formation: matchup.pairings.when_client_attacks.client?.formation || null,
      client_defense_formation: matchup.pairings.when_client_defends.client?.formation || null,
      opponent_attack_formation: matchup.pairings.when_client_defends.opponent?.formation || null,
      opponent_defense_formation: matchup.pairings.when_client_attacks.opponent?.formation || null
    }
    result.verified_link_ups = linkUps

    return NextResponse.json({ success: true, countermeasures: result, model_used: usedModel, charged_hp: AI_COST })
  } catch (error) {
    console.error('[generate-v6-countermeasures] error:', error)
    if (creditChargeContext) {
      try {
        return await handleCreditOperationError(error, creditChargeContext)
      } catch {}
    }
    return NextResponse.json({ error: error?.message || 'Unable to generate v6 countermeasures' }, { status: 500 })
  }
}
