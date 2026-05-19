/**
 * Catalog resolution for Card Advisor (evaluate + build-preview).
 */

import { CARD_ADVISOR_SELECT, searchCardAdvisorCardsByName } from './cardAdvisorCardsLookup.js'

function toAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sanitizeIlike(value = '') {
  return String(value).replace(/[%_]/g, '').trim()
}

export function normalizeAdvisorCard(raw = {}) {
  return {
    id: String(raw.id || raw.sourcePlayerId || ''),
    name: String(raw.name || '').trim(),
    position: String(raw.position || '').trim(),
    overall: Number(raw.overall) || null,
    category: String(raw.category || '').trim(),
    style: String(raw.style || '').trim(),
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    imageUrl: String(raw.imageUrl || '').trim(),
    sourcePlayerId: String(raw.sourcePlayerId || '').trim(),
    source: String(raw.source || 'efhub').trim() || 'efhub'
  }
}

async function fetchCardAdvisorCandidates(admin, card) {
  const tasks = []
  if (card.sourcePlayerId) {
    tasks.push(
      admin
        .from('card_advisor_cards')
        .select(CARD_ADVISOR_SELECT)
        .eq('source', card.source || 'efhub')
        .eq('source_player_id', card.sourcePlayerId)
        .eq('is_active', true)
        .limit(8)
    )
  }
  const safeName = sanitizeIlike(card.name)
  if (safeName) {
    tasks.push(
      searchCardAdvisorCardsByName(admin, {
        name: card.name,
        source: card.source || 'efhub',
        position: card.position,
        limit: 12
      }).then(({ rows }) => ({ data: rows, error: null }))
    )
  }
  if (tasks.length === 0) return []
  const results = await Promise.allSettled(tasks)
  const merged = []
  results.forEach(result => {
    if (result.status !== 'fulfilled' || result.value?.error) return
    const rows = Array.isArray(result.value?.data) ? result.value.data : []
    rows.forEach(row => {
      const key = `${row.source || 'x'}:${row.source_player_id || row.player_name || ''}:${row.card_type || ''}`
      if (!merged.some(existing => `${existing.source || 'x'}:${existing.source_player_id || existing.player_name || ''}:${existing.card_type || ''}` === key)) {
        merged.push(row)
      }
    })
  })
  return merged
}

function candidateScore(card, candidate) {
  let score = 0
  const cardName = toAscii(card.name)
  const candidateName = toAscii(candidate.player_name)
  if (card.sourcePlayerId && String(candidate.source_player_id || '') === card.sourcePlayerId) score += 80
  if (candidateName === cardName) score += 28
  if (candidateName.includes(cardName) || cardName.includes(candidateName)) score += 12
  if (candidate.position === card.position) score += 12
  if (candidate.enrichment_status === 'complete') score += 12
  if (candidate.enrichment_status === 'partial') score += 4
  const baseOverall = Number(card.overall) || 0
  const candidateOverall = Number(candidate.overall_display || 0)
  if (baseOverall && candidateOverall) {
    score -= Math.min(15, Math.abs(baseOverall - candidateOverall) * 2)
  }
  return score
}

export function pickCatalogCard(card, candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  return [...candidates].sort((a, b) => candidateScore(card, b) - candidateScore(card, a))[0] || null
}

export function mapCatalogRowToBuildCard(row) {
  if (!row) return null
  return {
    source: row.source || 'efhub',
    source_player_id: row.source_player_id,
    player_name: row.player_name,
    position: row.position,
    card_type: row.card_type || row.category,
    card_category: row.card_category || row.card_type || row.category,
    max_level: row.max_level,
    overall_level_1: row.overall_level_1 ?? row.overall_display ?? null,
    overall_max_level: row.overall_max_level ?? null,
    height: row.height,
    base_stats: row.base_stats,
    max_stats: row.max_stats,
    playing_style: row.playing_style,
    player_skills: row.player_skills,
    players_payload: row.source_payload || row.players_payload
  }
}

export async function resolveCardAdvisorCatalog(admin, card) {
  const candidates = await fetchCardAdvisorCandidates(admin, card).catch(() => [])
  const picked = pickCatalogCard(card, candidates)
  if (picked) {
    return { catalogRow: picked, catalogCard: mapCatalogRowToBuildCard(picked), source: 'card_advisor_cards' }
  }
  const { fetchEfhubCardDetail } = await import('./efhubPlayerDetail.js')
  const efhub = await fetchEfhubCardDetail(card)
  if (efhub) {
    return { catalogRow: efhub, catalogCard: mapCatalogRowToBuildCard(efhub), source: 'efhub_live' }
  }
  return { catalogRow: null, catalogCard: null, source: null }
}

export async function resolveCardAdvisorUserId(userData, admin) {
  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile, error } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .maybeSingle()
    if (error) {
      console.warn('[card-advisor-lab] user profile lookup failed:', error.message || error)
    }
    userId = existingProfile?.user_id || null
  }
  return userId
}
