/**
 * Lookup righe card_advisor_cards per nome: RPC con unaccent (Postgres)
 * quando disponibile, altrimenti fallback ILIKE classico.
 */

export const CARD_ADVISOR_SELECT = [
  'source',
  'source_player_id',
  'source_url',
  'player_name',
  'position',
  'category',
  'card_type',
  'overall_display',
  'image_url',
  'playing_style',
  'player_skills',
  'ai_playstyles',
  'base_stats',
  'max_stats',
  'position_compatibility',
  'height',
  'weight',
  'age',
  'foot',
  'data_quality',
  'completeness_score',
  'enrichment_status',
  'error_message',
  'source_payload'
].join(',')

function safeIlikeFragment(value = '') {
  return String(value || '').replace(/[%_]/g, '').trim()
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ name: string, source?: string, position?: string, limit?: number }} opts
 * @returns {Promise<{ rows: object[], fromRpc: boolean }>}
 */
export async function searchCardAdvisorCardsByName(admin, { name, source, position, limit = 12 }) {
  const safeName = safeIlikeFragment(name)
  if (!safeName) return { rows: [], fromRpc: false }

  const lim = Math.max(1, Math.min(Number(limit) || 12, 40))
  const src = (String(source || 'efhub').trim() || 'efhub')
  const pos = String(position ?? '').trim()

  const { data, error } = await admin.rpc('rpc_card_advisor_cards_search_by_name', {
    p_q: safeName,
    p_source: src,
    p_position: pos,
    p_limit: lim
  })

  if (!error && Array.isArray(data)) {
    return { rows: data, fromRpc: true }
  }

  if (error) {
    console.warn('[cardAdvisorCardsLookup] rpc_card_advisor_cards_search_by_name:', error.message || error)
  }

  const { data: legacyData, error: legacyError } = await admin
    .from('card_advisor_cards')
    .select(CARD_ADVISOR_SELECT)
    .eq('is_active', true)
    .ilike('player_name', `%${safeName}%`)
    .eq('source', src)
    .eq('position', pos)
    .limit(lim)

  if (legacyError) {
    console.warn('[cardAdvisorCardsLookup] legacy ilike:', legacyError.message || legacyError)
    return { rows: [], fromRpc: false }
  }

  return { rows: legacyData || [], fromRpc: false }
}
