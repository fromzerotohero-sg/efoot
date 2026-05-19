/**
 * Dual build preview for Card Advisor: meta pack (no roster) + roster-fit.
 */

import { calculateGameplayBuild, pickBilingualList } from './gameplayBuildCoach.js'
import {
  enrichCatalogCardForBuildCoach,
  getNonProgressionReason,
  getSlotPosition,
  withFallbacks
} from './buildCoachServerUtils.js'
import { mapCatalogRowToBuildCard } from './cardAdvisorLabCatalog.js'
import { suggestSkillsForAdvisorCard } from './cardAdvisorSkillSuggestions.js'

export const BUILD_SLIDER_ORDER = [
  'shooting',
  'passing',
  'dribbling',
  'dexterity',
  'lowerBodyStrength',
  'aerialStrength',
  'defending',
  'gk1',
  'gk2',
  'gk3'
]

export const BUILD_SLIDER_LABELS = {
  shooting: { it: 'Tiro', en: 'Shooting' },
  passing: { it: 'Passaggio', en: 'Passing' },
  dribbling: { it: 'Dribbling', en: 'Dribbling' },
  dexterity: { it: 'Destrezza', en: 'Dexterity' },
  lowerBodyStrength: { it: 'Forza arti inferiori', en: 'Lower body' },
  aerialStrength: { it: 'Forza in aria', en: 'Aerial' },
  defending: { it: 'Difesa', en: 'Defending' },
  gk1: { it: 'PT 1', en: 'GK 1' },
  gk2: { it: 'PT 2', en: 'GK 2' },
  gk3: { it: 'PT 3', en: 'GK 3' }
}

export function getBuildSliderLabel(key, lang = 'it') {
  const entry = BUILD_SLIDER_LABELS[key]
  if (!entry) return key
  return lang === 'en' ? entry.en : entry.it
}

export function formatBuildPtCopy(sliders = {}, lang = 'it') {
  return BUILD_SLIDER_ORDER.filter(key => Number(sliders?.[key]) > 0)
    .map(key => `${getBuildSliderLabel(key, lang)}: ${sliders[key]}`)
    .join(' | ')
}

export function cardToVirtualPlayer(card, catalogCard) {
  const skillSet = new Set()
  ;(Array.isArray(catalogCard?.player_skills) ? catalogCard.player_skills : []).forEach(skill => {
    skillSet.add(String(skill || '').trim())
  })
  ;(Array.isArray(card?.skills) ? card.skills : []).forEach(skill => {
    skillSet.add(String(skill || '').trim())
  })

  const stats =
    catalogCard?.base_stats && Object.keys(catalogCard.base_stats).length > 0
      ? catalogCard.base_stats
      : catalogCard?.max_stats || {}

  return {
    id: `card-advisor-${card.id || card.sourcePlayerId || card.name}`,
    player_name: card.name,
    position: card.position,
    overall_rating: Number(card.overall) || Number(catalogCard?.overall_level_1) || null,
    base_stats: stats,
    skills: [...skillSet].filter(Boolean),
    com_skills: [],
    height: catalogCard?.height || 175,
    current_level: 1,
    level_cap: null,
    playing_style: catalogCard?.playing_style || card.style || null,
    role: catalogCard?.playing_style || card.style || null,
    metadata: {
      catalog_source: catalogCard?.source || card.source || 'efhub',
      catalog_source_player_id: catalogCard?.source_player_id || card.sourcePlayerId,
      playing_style: catalogCard?.playing_style || card.style,
      card_category: card.category || catalogCard?.card_category
    }
  }
}

function inferAdvisorSlotPosition(card, rosterContext) {
  const layout = rosterContext?.layout
  const players = rosterContext?.players || []
  const target = String(card.position || '').trim().toUpperCase()
  const starter = players.find(player => {
    const slot = Number(player.slot_index)
    return slot >= 0 && slot <= 10 && String(player.position || '').trim().toUpperCase() === target
  })
  if (!starter) return card.position
  return getSlotPosition(starter, layout) || card.position
}

function formatBuildResult(build, lang, cardOverall = null) {
  if (!build?.ok) {
    return {
      ok: false,
      code: build?.error || 'build_failed',
      estimatedFields: build?.estimatedFields || []
    }
  }
  const computed =
    build.afterOverall ??
    build.progressionOverall ??
    build.fieldOverall ??
    build.inGameOverall
  const playOverall = Number.isFinite(computed) && computed > 55 ? computed : null

  return {
    ok: true,
    sliders: build.sliders,
    pointsUsed: build.pointsUsed,
    pointsAvailable: build.pointsAvailable,
    beforeOverall: build.beforeOverall,
    playOverall,
    cardOverall: Number.isFinite(Number(cardOverall)) ? Number(cardOverall) : null,
    fieldOverall: build.fieldOverall ?? null,
    targetPosition: build.targetPosition,
    reasons: pickBilingualList(build.reasons, lang).slice(0, 2),
    warnings: pickBilingualList(build.warnings, lang).slice(0, 1),
    confidence: build.confidence ?? null,
    ptCopy: formatBuildPtCopy(build.sliders, lang)
  }
}

/**
 * @param {object} params
 * @param {ReturnType<typeof normalizeAdvisorCard>} params.card
 * @param {object|null} params.catalogRow
 * @param {object|null} params.rosterContext
 * @param {'it'|'en'} params.lang
 * @param {import('@supabase/supabase-js').SupabaseClient|null} params.admin
 */
export async function computeCardAdvisorBuildPreview({ card, catalogRow, rosterContext, lang = 'it', admin = null }) {
  const catalogCard = mapCatalogRowToBuildCard(catalogRow)
  if (!catalogCard) {
    return {
      ok: false,
      code: 'catalog_missing',
      meta: null,
      roster: null,
      skills: { available: false, items: [] }
    }
  }

  const preVirtual = cardToVirtualPlayer(card, catalogCard)
  const enrichedCatalog =
    admin != null
      ? (await enrichCatalogCardForBuildCoach(preVirtual, catalogCard)) || catalogCard
      : catalogCard

  const virtual = cardToVirtualPlayer(card, enrichedCatalog)
  const { player, estimated: fallbackEstimated } = withFallbacks(virtual, enrichedCatalog)
  const cardOverall =
    Number(card.overall) ||
    Number(enrichedCatalog?.overall_level_1) ||
    Number(enrichedCatalog?.overall_display) ||
    null
  const nonProg = getNonProgressionReason(player, enrichedCatalog)
  if (nonProg.blocked) {
    return {
      ok: false,
      code: nonProg.reason,
      cardType: nonProg.cardType,
      meta: null,
      roster: null,
      skills: suggestSkillsForAdvisorCard(player, { lang, catalogCard: enrichedCatalog })
    }
  }

  const roster = rosterContext?.players || []
  const teamStyle = rosterContext?.tacticalSettings?.team_playing_style || null
  const coach = rosterContext?.activeCoach || null
  const slotPosition = inferAdvisorSlotPosition(card, rosterContext)
  const hasRoster = roster.length > 0

  const metaRaw = calculateGameplayBuild({
    player,
    roster: [],
    teamStyle: null,
    slotPosition: card.position,
    catalogCard: enrichedCatalog,
    coach: null
  })

  const rosterRaw = hasRoster
    ? calculateGameplayBuild({
        player,
        roster,
        teamStyle,
        slotPosition,
        catalogCard: enrichedCatalog,
        coach
      })
    : null

  const meta = formatBuildResult(metaRaw, lang, cardOverall)
  const rosterBuild = rosterRaw ? formatBuildResult(rosterRaw, lang, cardOverall) : null

  const estimatedFields = [
    ...new Set([
      ...(fallbackEstimated || []),
      ...(metaRaw?.estimatedFields || []),
      ...(rosterRaw?.estimatedFields || [])
    ])
  ]

  if (!meta.ok) {
    return {
      ok: false,
      code: meta.code || 'build_failed',
      meta,
      roster: rosterBuild,
      skills: suggestSkillsForAdvisorCard(player, { lang, catalogCard: enrichedCatalog }),
      estimatedFields
    }
  }

  return {
    ok: true,
    hasRoster,
    slotPosition,
    teamStyle,
    estimatedFields,
    meta,
    roster: rosterBuild,
    skills: suggestSkillsForAdvisorCard(player, { lang, catalogCard: enrichedCatalog })
  }
}
