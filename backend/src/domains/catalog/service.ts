// @ts-nocheck
export const SLOT_COMPATIBILITY = {
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

export const COACH_PLAYSTYLE_KEYS = new Set([
  'possesso_palla',
  'contropiede_veloce',
  'contrattacco',
  'vie_laterali',
  'passaggio_lungo',
  'pressing_totale'
])

export function toCatalogText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function safeCatalogLike(value) {
  return String(value || '').replace(/[%_]/g, '').trim()
}

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function getLegacyPlayerRelevance(row, query) {
  const needle = normalizeSearchText(query)
  if (!needle) return 0
  const name = normalizeSearchText(row?.player_name)
  if (name.startsWith(needle)) return 0
  if (name.includes(` ${needle}`)) return 1
  if (name.includes(needle)) return 2
  if (needle.length >= 3 && normalizeSearchText(row?.position).includes(needle)) return 3
  if (needle.length >= 3 && normalizeSearchText(row?.card_type).includes(needle)) return 4
  if (needle.length >= 3 && normalizeSearchText(row?.playing_style).includes(needle)) return 5
  if (needle.length >= 3 && normalizeSearchText(row?.pack_name).includes(needle)) return 6
  return 99
}

export function sortLegacyPlayerRows(rows, { q, sort }) {
  const sortKey = sort || 'name_asc'
  return [...rows].sort((left, right) => {
    const relevanceDelta =
      getLegacyPlayerRelevance(left, q) - getLegacyPlayerRelevance(right, q)
    if (relevanceDelta !== 0) return relevanceDelta
    if (sortKey === 'ovr_desc' || (sortKey === 'name_asc' && q)) {
      const ovrDelta =
        Number(right?.overall_level_1 || 0) - Number(left?.overall_level_1 || 0)
      if (ovrDelta !== 0) return ovrDelta
    }
    if (sortKey === 'role_asc') {
      const roleDelta = String(left?.position || '').localeCompare(
        String(right?.position || '')
      )
      if (roleDelta !== 0) return roleDelta
    }
    return String(left?.player_name || '').localeCompare(
      String(right?.player_name || '')
    )
  })
}

export function normalizeRpcCatalogResponse(data) {
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return normalizeRpcCatalogResponse(JSON.parse(data))
    } catch (_) {
      return null
    }
  }
  if (Array.isArray(data)) {
    const first = data[0]
    if (first?.rpc_player_catalog_search) {
      return normalizeRpcCatalogResponse(first.rpc_player_catalog_search)
    }
    if (Array.isArray(first?.rows)) {
      return {
        rows: first.rows,
        total: Number(first.total ?? first.rows.length)
      }
    }
    return null
  }
  if (typeof data === 'object' && Array.isArray(data.rows)) {
    return {
      rows: data.rows,
      total: Number(data.total ?? data.rows.length)
    }
  }
  return null
}

export function slotCompatibility(slotPosition = '', cardPosition = '') {
  const slot = String(slotPosition || '').toUpperCase().trim()
  const card = String(cardPosition || '').toUpperCase().trim()
  if (!slot || !card) return 'unknown'
  if (slot === card) return 'perfect'
  const compatible = SLOT_COMPATIBILITY[slot] || []
  return compatible.includes(card) ? 'adaptable' : 'out_of_role'
}

export function normalizePlayerCatalogResult(row, slotPosition) {
  const payload =
    row?.players_payload && typeof row.players_payload === 'object'
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
    players_payload: payload,
    player_skills: Array.isArray(row.player_skills)
      ? row.player_skills
      : payload.player_skills || [],
    ai_playstyles: Array.isArray(row.ai_playstyles)
      ? row.ai_playstyles
      : payload.ai_playstyles || payload.com_skills || []
  }
}

export function normalizeCoachCatalogResult(row) {
  const payload =
    row?.coach_payload && typeof row.coach_payload === 'object'
      ? row.coach_payload
      : {}

  return {
    id: row.id,
    source: row.source,
    source_coach_id: row.source_coach_id,
    source_card_image_url: row.source_card_image_url || null,
    coach_name: row.coach_name,
    coach_name_ja: row.coach_name_ja || null,
    category: row.category || null,
    pack_type: row.pack_type || null,
    playing_style_competence: row.playing_style_competence || {},
    stat_boosters: Array.isArray(row.stat_boosters) ? row.stat_boosters : [],
    boost_ids: Array.isArray(row.boost_ids) ? row.boost_ids : [],
    catalog_ready: !!row.catalog_ready,
    needs_review: !!row.needs_review,
    metadata: row.metadata || {},
    coach_payload: payload
  }
}

export function filterAndSortCoachCatalog(
  rows,
  { playstyle = '', min = 0, sort = 'name_asc' } = {}
) {
  let results = (Array.isArray(rows) ? rows : []).map(normalizeCoachCatalogResult)

  if (COACH_PLAYSTYLE_KEYS.has(playstyle) && min > 0) {
    results = results.filter((coach) => {
      const value = Number(coach.playing_style_competence?.[playstyle])
      return Number.isFinite(value) && value >= min
    })
  }

  if (sort === 'best_playstyle' && COACH_PLAYSTYLE_KEYS.has(playstyle)) {
    results.sort((left, right) => {
      const leftValue = Number(left.playing_style_competence?.[playstyle] || 0)
      const rightValue = Number(right.playing_style_competence?.[playstyle] || 0)
      if (rightValue !== leftValue) return rightValue - leftValue
      return String(left.coach_name || '').localeCompare(String(right.coach_name || ''))
    })
  }

  return results
}

export function paginateCatalogResults(results, offset, limit) {
  const rows = Array.isArray(results) ? results : []
  const total = rows.length
  const page = rows.slice(offset, offset + limit)
  return {
    results: page,
    total,
    offset,
    limit,
    hasMore: offset + page.length < total
  }
}
