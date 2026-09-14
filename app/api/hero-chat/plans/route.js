import { NextResponse } from 'next/server'
import { resolveHeroChatUser } from '@/lib/heroChatAuth'
import { buildPrematchChangeSet } from '@/lib/prematchChangeSet'
import { canonicalizeTeamPlayingStyleId } from '@/lib/teamPlayingStyles'
import { validateIndividualInstruction } from '@/lib/tacticalInstructions'
import { buildSlotRoleAugmentsForStarter } from '@/lib/playerSlotRoleMetadata'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authResponse(auth) {
  return NextResponse.json({ error: auth.error }, { status: auth.status })
}

async function rateLimitResponse(auth) {
  const config = RATE_LIMIT_CONFIG['/api/hero-chat/plans']
  const result = await checkRateLimit(auth.userId, '/api/hero-chat/plans', config.maxRequests, config.windowMs)
  if (result.allowed) return null
  return NextResponse.json(
    { error: 'Too many plan requests. Try again shortly.', resetAt: result.resetAt },
    { status: 429 }
  )
}

function jsonSize(value) {
  try {
    return JSON.stringify(value || {}).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function asId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function getPlan(admin, userId, planId) {
  const { data, error } = await admin
    .from('prematch_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single()

  if (error || !data) return { error: 'Plan not found', status: 404 }
  return { data }
}

export async function GET(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const url = new URL(req.url)
    const planId = url.searchParams.get('id')
    if (planId) {
      const result = await getPlan(auth.admin, auth.userId, planId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
      return NextResponse.json({ success: true, plan: result.data })
    }

    const { data, error } = await auth.admin
      .from('prematch_plans')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return NextResponse.json({ success: true, plans: data || [] })
  } catch (error) {
    console.error('[hero-chat/plans] GET error:', error)
    return NextResponse.json({ error: 'Unable to load plans' }, { status: 500 })
  }
}

export async function POST(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => ({}))
    if (jsonSize(body.countermeasures) > 300000) {
      return NextResponse.json({ error: 'Countermeasure plan is too large' }, { status: 413 })
    }

    const changeSet = buildPrematchChangeSet(body.countermeasures, { lang: body.language })
    const idempotencyKey = asId(body.idempotency_key)

    if (idempotencyKey) {
      const { data: existing } = await auth.admin
        .from('prematch_plans')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existing) return NextResponse.json({ success: true, plan: existing, reused: true })
    }

    const { data, error } = await auth.admin
      .from('prematch_plans')
      .insert({
        user_id: auth.userId,
        thread_id: asId(body.thread_id),
        opponent_formation_id: asId(body.opponent_formation_id),
        status: 'ready',
        countermeasures: body.countermeasures || {},
        change_set: changeSet,
        idempotency_key: idempotencyKey
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, plan: data })
  } catch (error) {
    console.error('[hero-chat/plans] POST error:', error)
    return NextResponse.json({ error: 'Unable to save countermeasure plan' }, { status: 500 })
  }
}

async function applyPlan(admin, userId, plan) {
  if (plan.status === 'applied') {
    return { success: true, alreadyApplied: true, result: plan.apply_result || {} }
  }
  if (plan.status !== 'ready' && plan.status !== 'draft') {
    return { error: 'This plan is no longer applicable', status: 409 }
  }

  const changeSet = plan.change_set || {}
  const { data: players, error: playersError } = await admin
    .from('players')
    .select('id, player_name, position, slot_index, original_positions, metadata')
    .eq('user_id', userId)

  if (playersError) throw playersError
  const allPlayers = players || []
  const starters = allPlayers.filter((player) => player.slot_index !== null && player.slot_index !== undefined)
  const playerById = new Map(allPlayers.map((player) => [player.id, player]))

  const { data: layout } = await admin
    .from('formation_layout')
    .select('formation, slot_positions')
    .eq('user_id', userId)
    .maybeSingle()
  const slotPositions = layout?.slot_positions || {}

  const individualInstructions = {}
  for (const [category, row] of Object.entries(changeSet.individual_instructions || {})) {
    const playerId = asId(row?.player_id)
    const instruction = asId(row?.instruction)
    if (!playerId || !instruction) continue
    const validation = validateIndividualInstruction(
      category,
      playerId,
      instruction,
      starters,
      layout || null
    )
    if (!validation.valid) {
      return { error: validation.error, status: 400 }
    }
    individualInstructions[category] = {
      player_id: playerId,
      instruction,
      enabled: row.enabled !== false
    }
  }

  const substitutions = []
  const seenSlots = new Set()
  for (const suggestion of Array.isArray(changeSet.substitutions) ? changeSet.substitutions : []) {
    const incoming = playerById.get(asId(suggestion.in_player_id))
    const outgoing = playerById.get(asId(suggestion.out_player_id))
    if (!incoming || !outgoing || incoming.id === outgoing.id) {
      return { error: 'A suggested substitution contains an invalid player', status: 400 }
    }
    if (incoming.slot_index !== null && incoming.slot_index !== undefined) {
      return { error: `${incoming.player_name || 'Incoming player'} is already a starter`, status: 400 }
    }
    if (outgoing.slot_index === null || outgoing.slot_index === undefined) {
      return { error: `${outgoing.player_name || 'Outgoing player'} is not a starter`, status: 400 }
    }
    const slot = Number(outgoing.slot_index)
    if (seenSlots.has(slot)) {
      return { error: 'Two substitutions target the same slot', status: 400 }
    }
    seenSlots.add(slot)
    substitutions.push({ incoming, outgoing, slot })
  }

  const { data: previousSettings, error: previousSettingsError } = await admin
    .from('team_tactical_settings')
    .select('id, user_id, team_playing_style, individual_instructions')
    .eq('user_id', userId)
    .maybeSingle()
  if (previousSettingsError) throw previousSettingsError

  const style = changeSet.team_playing_style
    ? canonicalizeTeamPlayingStyleId(changeSet.team_playing_style)
    : previousSettings?.team_playing_style || null
  const finalInstructions = {
    ...(previousSettings?.individual_instructions || {}),
    ...individualInstructions
  }

  const { error: settingsError } = await admin
    .from('team_tactical_settings')
    .upsert({
      user_id: userId,
      team_playing_style: style,
      individual_instructions: finalInstructions,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  if (settingsError) throw settingsError

  const changed = []
  try {
    for (const { incoming, outgoing, slot } of substitutions) {
      const now = new Date().toISOString()
      const originalPosition = Array.isArray(outgoing.original_positions) && outgoing.original_positions[0]?.position
        ? outgoing.original_positions[0].position
        : outgoing.position

      const { error: outgoingError } = await admin
        .from('players')
        .update({ slot_index: null, position: originalPosition, updated_at: now })
        .eq('id', outgoing.id)
        .eq('user_id', userId)
      if (outgoingError) throw outgoingError

      const slotPosition = slotPositions?.[slot]?.position || incoming.position
      const positionUpdate = {
        slot_index: slot,
        position: slotPosition,
        updated_at: now
      }
      const { augments } = buildSlotRoleAugmentsForStarter({
        playerRow: incoming,
        slotPosition
      })
      Object.assign(positionUpdate, augments)

      const { error: incomingError } = await admin
        .from('players')
        .update(positionUpdate)
        .eq('id', incoming.id)
        .eq('user_id', userId)
      if (incomingError) throw incomingError

      changed.push({
        slot,
        incoming: incoming.id,
        outgoing: outgoing.id
      })
    }
  } catch (error) {
    for (const { incoming, outgoing } of substitutions) {
      const outgoingPosition = slotPositions?.[outgoing.slot_index]?.position || outgoing.position
      await admin
        .from('players')
        .update({
          slot_index: outgoing.slot_index,
          position: outgoingPosition,
          updated_at: new Date().toISOString()
        })
        .eq('id', outgoing.id)
        .eq('user_id', userId)
      await admin
        .from('players')
        .update({
          slot_index: incoming.slot_index,
          position: incoming.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', incoming.id)
        .eq('user_id', userId)
    }

    if (previousSettings) {
      await admin
        .from('team_tactical_settings')
        .update({
          team_playing_style: previousSettings.team_playing_style,
          individual_instructions: previousSettings.individual_instructions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    } else {
      await admin.from('team_tactical_settings').delete().eq('user_id', userId)
    }
    throw error
  }

  await admin.from('user_diagnostic_cache').delete().eq('user_id', userId)
  const result = {
    team_playing_style: style,
    individual_instructions: individualInstructions,
    substitutions: changed,
    manual_substitutions: (changeSet.substitutions || []).filter(
      (suggestion) => !changed.some((row) => row.incoming === suggestion.in_player_id)
    )
  }

  return { success: true, result }
}

export async function PATCH(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => ({}))
    const planId = asId(body.id || body.plan_id)
    if (!planId) return NextResponse.json({ error: 'plan_id is required' }, { status: 400 })

    const planResult = await getPlan(auth.admin, auth.userId, planId)
    if (planResult.error) {
      return NextResponse.json({ error: planResult.error }, { status: planResult.status })
    }
    const plan = planResult.data

    if (body.action === 'dismiss') {
      const { data, error } = await auth.admin
        .from('prematch_plans')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', plan.id)
        .eq('user_id', auth.userId)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, plan: data })
    }

    if (body.action !== 'apply') {
      return NextResponse.json({ error: 'Unsupported plan action' }, { status: 400 })
    }

    const result = await applyPlan(auth.admin, auth.userId, plan)
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })

    const { data, error } = await auth.admin
      .from('prematch_plans')
      .update({
        status: 'applied',
        apply_result: result.result,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', plan.id)
      .eq('user_id', auth.userId)
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, plan: data, result: result.result })
  } catch (error) {
    console.error('[hero-chat/plans] PATCH error:', error)
    return NextResponse.json({ error: 'Unable to apply countermeasure plan' }, { status: 500 })
  }
}
