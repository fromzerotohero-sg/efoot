import { NextResponse } from 'next/server'
import { getAuthenticatedSmartRequest } from '@/lib/smartCoachServer'
import {
  getSmartReadiness,
  normalizeSmartPlayers,
} from '@/lib/smartCoach'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeContextRow(row) {
  if (!row) return null

  const players = normalizeSmartPlayers(row.players)
  return {
    id: row.id,
    formation: typeof row.formation === 'string' ? row.formation.trim() : null,
    players,
    coach: row.coach && typeof row.coach === 'object' ? row.coach : null,
    extraction_meta: row.extraction_meta && typeof row.extraction_meta === 'object' ? row.extraction_meta : {},
    chat_used: !!row.chat_used,
    chat_count: Number(row.chat_count) || 0,
    countermeasures_used: Number(row.countermeasures_used) || 0,
    last_countermeasures: Array.isArray(row.last_countermeasures) ? row.last_countermeasures : [],
    last_chat_answer: typeof row.last_chat_answer === 'string' ? row.last_chat_answer : '',
    last_chat_suggestions: Array.isArray(row.last_chat_suggestions) ? row.last_chat_suggestions : [],
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export async function GET(req) {
  const auth = await getAuthenticatedSmartRequest(req)
  if (auth.errorResponse) return auth.errorResponse

  const { admin, userId } = auth

  const { data, error } = await admin
    .from('smart_coach_contexts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[smart/context] GET error:', error.message)
    return NextResponse.json({ error: 'Failed to load smart context' }, { status: 500 })
  }

  const context = normalizeContextRow(data)
  return NextResponse.json({
    context,
    readiness: getSmartReadiness(context)
  })
}

export async function POST(req) {
  const auth = await getAuthenticatedSmartRequest(req)
  if (auth.errorResponse) return auth.errorResponse

  const { admin, userId } = auth
  const body = await req.json().catch(() => ({}))

  const players = normalizeSmartPlayers(body.players)
  const formation = typeof body.formation === 'string' && body.formation.trim().length > 0
    ? body.formation.trim().slice(0, 50)
    : null
  const coach = body.coach && typeof body.coach === 'object' ? body.coach : null
  const extractionMeta = body.extraction_meta && typeof body.extraction_meta === 'object'
    ? body.extraction_meta
    : {}

  if (players.length < 1) {
    return NextResponse.json({ error: 'At least one detected player is required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('smart_coach_contexts')
    .upsert({
      user_id: userId,
      formation,
      players,
      coach,
      extraction_meta: extractionMeta,
      chat_used: false,
      chat_count: 0,
      countermeasures_used: 0,
      last_countermeasures: [],
      last_chat_answer: null,
      last_chat_suggestions: [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) {
    console.error('[smart/context] POST error:', error.message)
    return NextResponse.json({ error: 'Failed to save smart context' }, { status: 500 })
  }

  const context = normalizeContextRow(data)
  return NextResponse.json({
    success: true,
    context,
    readiness: getSmartReadiness(context)
  })
}

export async function DELETE(req) {
  const auth = await getAuthenticatedSmartRequest(req)
  if (auth.errorResponse) return auth.errorResponse

  const { admin, userId } = auth
  const { error } = await admin
    .from('smart_coach_contexts')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('[smart/context] DELETE error:', error.message)
    return NextResponse.json({ error: 'Failed to reset smart context' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
