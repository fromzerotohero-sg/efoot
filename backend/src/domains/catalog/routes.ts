// @ts-nocheck
import {
  filterAndSortCoachCatalog,
  normalizePlayerCatalogResult,
  normalizeRpcCatalogResponse,
  paginateCatalogResults,
  safeCatalogLike,
  sortLegacyPlayerRows,
  toCatalogText
} from './service.js'

const PLAYER_FIELDS = `
  id, source, source_player_id, card_type, player_name, position,
  overall_level_1, overall_max_level, playing_style, pack_name,
  source_card_front_url, source_card_back_url, catalog_ready, needs_review,
  data_quality, completeness_score, position_compatibility, players_payload,
  player_skills, ai_playstyles, player_identity_id, player_identity_key,
  card_instance_key
`

const COACH_FIELDS = `
  id, source, source_coach_id, source_card_image_url, coach_name, coach_name_ja,
  category, pack_type, playing_style_competence, stat_boosters, boost_ids,
  catalog_ready, needs_review, metadata, coach_payload
`

function boundedNumber(value, fallback, min, max) {
  const parsed = Number(value)
  return Number.isFinite(parsed)
    ? Math.max(min, Math.min(Math.trunc(parsed), max))
    : fallback
}

export function createCatalogReadService(readOnlyProvider) {
  return {
    async searchPlayers({ q, cardType, slotPosition, limit, offset, sort }) {
      const client = readOnlyProvider.forServerCatalog()
      const rpc = await client.rpc('rpc_player_catalog_search', {
        p_q: q || '',
        p_card_type: cardType || null,
        p_sort: sort,
        p_limit: limit,
        p_offset: offset
      })
      const rpcResult = !rpc.error ? normalizeRpcCatalogResponse(rpc.data) : null
      let rows
      let total

      if (rpcResult) {
        rows = rpcResult.rows
        total = rpcResult.total
      } else {
        let query = client
          .from('player_catalog')
          .select(PLAYER_FIELDS, { count: 'exact' })
          .eq('source', 'pesdb')
          .eq('catalog_ready', true)
          .eq('needs_review', false)
        if (cardType) query = query.eq('card_type', cardType)
        if (q) {
          const filters = [`player_name.ilike.%${q}%`]
          if (q.length >= 3) {
            filters.push(
              `position.ilike.%${q}%`,
              `card_type.ilike.%${q}%`,
              `playing_style.ilike.%${q}%`,
              `pack_name.ilike.%${q}%`
            )
          }
          query = query.or(filters.join(','))
        }
        if (sort === 'ovr_desc') {
          query = query.order('overall_level_1', { ascending: false, nullsFirst: false })
            .order('player_name', { ascending: true, nullsFirst: false })
        } else if (sort === 'role_asc') {
          query = query.order('position', { ascending: true, nullsFirst: false })
            .order('player_name', { ascending: true, nullsFirst: false })
        } else {
          query = query.order('player_name', { ascending: true, nullsFirst: false })
        }
        query = q ? query.range(0, 4999) : query.range(offset, offset + limit - 1)
        const result = await query
        if (result.error) throw Object.assign(new Error(result.error.message), { statusCode: 500 })
        const legacyRows = result.data || []
        rows = q
          ? sortLegacyPlayerRows(legacyRows, { q, sort }).slice(offset, offset + limit)
          : legacyRows
        total = typeof result.count === 'number' ? result.count : legacyRows.length
      }

      const results = rows.map((row) => normalizePlayerCatalogResult(row, slotPosition))
      return { results, total, offset, limit, hasMore: offset + results.length < total }
    },

    async searchCoaches({ q, playstyle, min, limit, offset, sort }) {
      const client = readOnlyProvider.forServerCatalog()
      let query = client
        .from('coach_catalog')
        .select(COACH_FIELDS)
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
      const result = await query.order('coach_name', { ascending: true, nullsFirst: false })
      if (result.error) throw Object.assign(new Error(result.error.message), { statusCode: 500 })
      const filtered = filterAndSortCoachCatalog(result.data || [], { playstyle, min, sort })
      return paginateCatalogResults(filtered, offset, limit)
    },

    async listPlayingStyles() {
      const client = readOnlyProvider.forServerCatalog()
      const { data, error } = await client
        .from('playing_styles')
        .select('id, name, compatible_positions, category')
        .order('name')
      if (error) throw Object.assign(new Error(error.message), { statusCode: 500 })
      return data || []
    }
  }
}

export function registerCatalogRoutes(app, { identity, catalogReads }) {
  app.get('/v1/catalog/players', async (request) => {
    await identity.resolveUser(request)
    const query = request.query || {}
    return catalogReads.searchPlayers({
      q: safeCatalogLike(query.q),
      slotPosition: toCatalogText(query.slot_position).toUpperCase(),
      cardType: toCatalogText(query.card_type),
      limit: boundedNumber(query.limit, 24, 1, 100),
      offset: boundedNumber(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      sort: toCatalogText(query.sort) || 'name_asc'
    })
  })

  app.get('/v1/catalog/coaches', async (request) => {
    await identity.resolveUser(request)
    const query = request.query || {}
    return catalogReads.searchCoaches({
      q: safeCatalogLike(query.q),
      playstyle: toCatalogText(query.playstyle),
      min: boundedNumber(query.min, 0, 0, 99),
      limit: boundedNumber(query.limit, 24, 1, 100),
      offset: boundedNumber(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
      sort: toCatalogText(query.sort) || 'name_asc'
    })
  })
}
