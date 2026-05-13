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

/**
 * Ricerca catalogo: preferisce RPC Postgres con `unaccent` (v. migration
 * `20260513_player_catalog_search_unaccent.sql`) così "Ibrahimovic" trova
 * "Ibrahimović". Se la RPC non esiste ancora, fallback su ILIKE classico.
 */
async function queryPlayerCatalog(supabase, { q, cardType, limit, offset, sort }) {
  const sortKey = sort || 'name_asc'
  const { data, error } = await supabase.rpc('rpc_player_catalog_search', {
    p_q: q || '',
    p_card_type: cardType || null,
    p_sort: sortKey,
    p_limit: limit,
    p_offset: offset
  })

  if (!error && data && typeof data === 'object' && Array.isArray(data.rows)) {
    return {
      rows: data.rows,
      total: Number(data.total ?? data.rows.length)
    }
  }

  if (error) {
    console.warn('[player-catalog/search] rpc_player_catalog_search:', error.message || error)
  }

  let legacy = supabase
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
      `, { count: 'exact' })
    .eq('source', 'pesdb')
    .eq('catalog_ready', true)
    .eq('needs_review', false)

  if (cardType) {
    legacy = legacy.eq('card_type', cardType)
  }

  if (q) {
    legacy = legacy.or([
      `player_name.ilike.%${q}%`,
      `position.ilike.%${q}%`,
      `card_type.ilike.%${q}%`,
      `playing_style.ilike.%${q}%`,
      `pack_name.ilike.%${q}%`
    ].join(','))
  }

  if (sortKey === 'ovr_desc') {
    legacy = legacy
      .order('overall_level_1', { ascending: false, nullsFirst: false })
      .order('player_name', { ascending: true, nullsFirst: false })
  } else if (sortKey === 'role_asc') {
    legacy = legacy
      .order('position', { ascending: true, nullsFirst: false })
      .order('player_name', { ascending: true, nullsFirst: false })
  } else {
    legacy = legacy.order('player_name', { ascending: true, nullsFirst: false })
  }

  legacy = legacy.range(offset, offset + limit - 1)

  const { data: legacyData, error: legacyError, count } = await legacy
  if (legacyError) {
    throw legacyError
  }
  return {
    rows: legacyData || [],
    total: typeof count === 'number' ? count : (legacyData || []).length
  }
}

function slotCompatibility(slotPosition = '', cardPosition = '') {
  const slot = String(slotPosition || '').toUpperCase().trim()
  const card = String(cardPosition || '').toUpperCase().trim()
  if (!slot || !card) return 'unknown'
  if (slot === card) return 'perfect'
  const compatible = SLOT_COMPATIBILITY[slot] || []
  return compatible.includes(card) ? 'adaptable' : 'out_of_role'
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
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 24
    const offsetRaw = Number(searchParams.get('offset') || 0)
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0
    const sort = toText(searchParams.get('sort')) || 'name_asc'

    let data
    let total
    try {
      ;({ rows: data, total } = await queryPlayerCatalog(supabase, {
        q,
        cardType,
        limit,
        offset,
        sort
      }))
    } catch (queryError) {
      console.error('[player-catalog/search] Query error:', queryError)
      return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
    }

    const results = (data || []).map((row) => normalizeResult(row, slotPosition))

    return NextResponse.json({
      results,
      total,
      offset,
      limit,
      hasMore: offset + results.length < total
    })
  } catch (error) {
    console.error('[player-catalog/search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
