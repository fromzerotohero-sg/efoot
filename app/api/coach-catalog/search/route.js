import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { normalizeCoachCatalogResult } from '@/lib/coachCatalogNormalization'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLAYSTYLE_KEYS = new Set([
  'possesso_palla',
  'contropiede_veloce',
  'contrattacco',
  'vie_laterali',
  'passaggio_lungo',
  'pressing_totale'
])

function toText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function safeLike(value) {
  return String(value || '').replace(/[%_]/g, '').trim()
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
    const playstyle = toText(searchParams.get('playstyle'))
    const minRaw = Number(searchParams.get('min') || 0)
    const min = Number.isFinite(minRaw) ? Math.max(0, Math.min(Math.trunc(minRaw), 99)) : 0
    const limitRaw = Number(searchParams.get('limit') || 24)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 24
    const offsetRaw = Number(searchParams.get('offset') || 0)
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0
    const sort = toText(searchParams.get('sort')) || 'name_asc'

    let query = supabase
      .from('coach_catalog')
      .select(`
        id,
        source,
        source_coach_id,
        source_card_image_url,
        coach_name,
        coach_name_ja,
        category,
        pack_type,
        playing_style_competence,
        stat_boosters,
        boost_ids,
        connection,
        catalog_ready,
        needs_review,
        metadata,
        coach_payload
      `, { count: 'exact' })
      .eq('source', 'efhub')
      .eq('catalog_ready', true)
      .eq('needs_review', false)

    if (q) {
      query = query.or([
        `coach_name.ilike.%${q}%`,
        `coach_name_ja.ilike.%${q}%`,
        `category.ilike.%${q}%`,
        `pack_type.ilike.%${q}%`
      ].join(','))
    }

    query = query.order('coach_name', { ascending: true, nullsFirst: false })

    const { data, error } = await query

    if (error) {
      console.error('[coach-catalog/search] Query error:', error)
      return NextResponse.json({ error: 'Failed to load coach catalog' }, { status: 500 })
    }

    let results = (data || []).map(normalizeCoachCatalogResult)

    if (PLAYSTYLE_KEYS.has(playstyle) && min > 0) {
      results = results.filter((coach) => {
        const value = Number(coach.playing_style_competence?.[playstyle])
        return Number.isFinite(value) && value >= min
      })
    }

    if (sort === 'best_playstyle' && PLAYSTYLE_KEYS.has(playstyle)) {
      results.sort((left, right) => {
        const leftValue = Number(left.playing_style_competence?.[playstyle] || 0)
        const rightValue = Number(right.playing_style_competence?.[playstyle] || 0)
        if (rightValue !== leftValue) return rightValue - leftValue
        return String(left.coach_name || '').localeCompare(String(right.coach_name || ''))
      })
    }

    const total = results.length
    results = results.slice(offset, offset + limit)

    return NextResponse.json({
      results,
      total,
      offset,
      limit,
      hasMore: offset + results.length < total
    })
  } catch (error) {
    console.error('[coach-catalog/search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
