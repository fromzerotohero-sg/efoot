import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SLOT_COMPATIBILITY = {
  PT: ['PT'],
  DC: ['DC', 'TD', 'TS', 'MED'],
  TD: ['TD', 'DC', 'TS', 'CLD', 'EDA'],
  TS: ['TS', 'DC', 'TD', 'CLS', 'ESA'],
  MED: ['MED', 'CC', 'DC', 'TRQ'],
  CC: ['CC', 'MED', 'TRQ', 'CLS', 'CLD'],
  TRQ: ['TRQ', 'CC', 'SP', 'ESA', 'EDA', 'CLS', 'CLD'],
  CLS: ['CLS', 'ESA', 'TRQ', 'CC', 'SP'],
  CLD: ['CLD', 'EDA', 'TRQ', 'CC', 'SP'],
  ESA: ['ESA', 'CLS', 'SP', 'TRQ', 'EDA'],
  EDA: ['EDA', 'CLD', 'SP', 'TRQ', 'ESA'],
  SP: ['SP', 'P', 'TRQ', 'ESA', 'EDA'],
  P: ['P', 'SP', 'TRQ', 'ESA', 'EDA']
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function safeLike(value) {
  return String(value || '').replace(/[%_]/g, '').trim()
}

function slotCompatibility(slotPosition = '', cardPosition = '') {
  const slot = String(slotPosition || '').toUpperCase().trim()
  const card = String(cardPosition || '').toUpperCase().trim()
  if (!slot || !card) return 'unknown'
  if (slot === card) return 'perfect'
  const compatible = SLOT_COMPATIBILITY[slot] || []
  return compatible.includes(card) ? 'adaptable' : 'out_of_role'
}

function buildOrderScore(slotPosition, card) {
  const compatibility = slotCompatibility(slotPosition, card?.position)
  const overall =
    Number(card?.overall_level_1) ||
    Number(card?.overall_max_level) ||
    0

  const compatibilityScore =
    compatibility === 'perfect' ? 3000 :
    compatibility === 'adaptable' ? 2000 :
    compatibility === 'out_of_role' ? 1000 : 0

  return compatibilityScore + overall
}

function normalizeResult(row, slotPosition) {
  const payload = row?.players_payload && typeof row.players_payload === 'object'
    ? row.players_payload
    : {}

  return {
    id: row.id,
    source: row.source,
    source_player_id: row.source_player_id,
    card_instance_key: row.card_instance_key || `${row.source}:${row.source_player_id}`,
    player_identity_id: row.player_identity_id || null,
    player_identity_key: row.player_identity_key || null,
    player_name: row.player_name,
    position: row.position,
    card_type: row.card_type,
    overall_level_1: row.overall_level_1,
    overall_max_level: row.overall_max_level,
    playing_style: row.playing_style,
    pack_name: row.pack_name,
    source_card_front_url: row.source_card_front_url || null,
    source_card_back_url: row.source_card_back_url || null,
    catalog_ready: !!row.catalog_ready,
    needs_review: !!row.needs_review,
    data_quality: row.data_quality || null,
    completeness_score: row.completeness_score ?? null,
    position_compatibility: row.position_compatibility || {},
    compatibility: slotCompatibility(slotPosition, row.position),
    players_payload: payload
  }
}

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { searchParams } = new URL(req.url)
    const q = safeLike(searchParams.get('q'))
    const slotPosition = toText(searchParams.get('slot_position')).toUpperCase()
    const cardType = toText(searchParams.get('card_type'))
    const limitRaw = Number(searchParams.get('limit') || 24)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 60)) : 24

    let query = supabase
      .from('player_catalog')
      .select(`
        id,
        source,
        source_player_id,
        card_type,
        player_name,
        position,
        overall_level_1,
        overall_max_level,
        playing_style,
        pack_name,
        source_card_front_url,
        source_card_back_url,
        catalog_ready,
        needs_review,
        data_quality,
        completeness_score,
        position_compatibility,
        players_payload,
        player_identity_id,
        player_identity_key,
        card_instance_key
      `)
      .eq('source', 'pesdb')
      .eq('catalog_ready', true)
      .eq('needs_review', false)
      .order('overall_level_1', { ascending: false, nullsFirst: false })
      .limit(Math.max(limit * 3, 30))

    if (cardType) {
      query = query.eq('card_type', cardType)
    }

    if (q) {
      query = query.or([
        `player_name.ilike.%${q}%`,
        `position.ilike.%${q}%`,
        `card_type.ilike.%${q}%`,
        `playing_style.ilike.%${q}%`,
        `pack_name.ilike.%${q}%`
      ].join(','))
    } else if (slotPosition) {
      const candidates = SLOT_COMPATIBILITY[slotPosition] || [slotPosition]
      query = query.in('position', candidates)
    }

    const { data, error } = await query

    if (error) {
      console.error('[player-catalog/search] Query error:', error)
      return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
    }

    const normalized = (data || []).map((row) => normalizeResult(row, slotPosition))
    const sorted = normalized
      .sort((a, b) => buildOrderScore(slotPosition, b) - buildOrderScore(slotPosition, a))
      .slice(0, limit)

    const suggested = sorted.filter((row) => row.compatibility !== 'out_of_role').slice(0, Math.min(8, limit))

    return NextResponse.json({
      results: sorted,
      suggested,
      total: sorted.length
    })
  } catch (error) {
    console.error('[player-catalog/search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
