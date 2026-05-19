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
import { getAdvisorEquippedSkills, suggestSkillsForAdvisorCard } from './cardAdvisorSkillSuggestions.js'

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
  const { equipped, catalogOverflow, rawCount } = getAdvisorEquippedSkills(card, catalogCard)

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
    skills: equipped,
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
      card_category: card.category || catalogCard?.card_category,
      advisor_skills_catalog_overflow: catalogOverflow,
      advisor_skills_raw_count: rawCount
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

function simplifyEngineReason(text, lang) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  const replacementsIt = [
    [/macro PT/gi, 'punti progressione'],
    [/valorizzato per creare linee di gioco/gi, 'rafforzato per costruire il gioco'],
    [/rinforzati per sfruttare skill tecniche/gi, 'rafforzati per sfruttare le sue qualità tecniche'],
    [/Abilita native considerate/gi, 'Le abilità già presenti sulla carta'],
    [/Build adattata allo stile squadra/gi, 'Adattata allo stile della tua squadra']
  ]
  const replacementsEn = [
    [/progression macros/gi, 'progression points'],
    [/were considered to weight/gi, 'helped choose'],
    [/Build tuned for team style/gi, 'Adjusted for your team style']
  ]
  let out = raw
  for (const [pattern, value] of lang === 'en' ? replacementsEn : replacementsIt) {
    out = out.replace(pattern, value)
  }
  return out
}

function buildRosterAdvisorReasons({
  lang,
  rosterContext,
  rosterSliders,
  metaSliders,
  card,
  enrichedCatalog
}) {
  const reasons = []
  const formation =
    rosterContext?.layout?.formation_name ||
    rosterContext?.layout?.formation ||
    rosterContext?.formation_name ||
    null
  const coachName = rosterContext?.activeCoach?.coach_name || rosterContext?.activeCoach?.name || null
  const teamStyle = rosterContext?.tacticalSettings?.team_playing_style || null
  const playingStyle = enrichedCatalog?.playing_style || card?.style || null

  if (formation) {
    reasons.push(
      lang === 'en'
        ? `Your ${formation} formation: points go where this role is most useful in your XI.`
        : `Nel tuo modulo ${formation} i punti vanno dove questo ruolo serve di più in campo.`
    )
  }
  if (coachName) {
    reasons.push(
      lang === 'en'
        ? `With coach ${coachName}, the spread follows the strengths you already play with.`
        : `Con ${coachName} la distribuzione segue i punti di forza che usi già in partita.`
    )
  }
  if (teamStyle) {
    reasons.push(
      lang === 'en'
        ? `Team style “${teamStyle}”: we boost stats that matter in how your squad actually plays.`
        : `Stile squadra “${teamStyle}”: valorizziamo le statistiche che contano nel modo in cui giochi.`
    )
  }
  if (playingStyle) {
    reasons.push(
      lang === 'en'
        ? `Playing style ${playingStyle}: the build supports how this card moves in your system.`
        : `Stile ${playingStyle}: la build supporta come questa carta si muove nel tuo sistema di gioco.`
    )
  }

  if (metaSliders && rosterSliders) {
    for (const key of BUILD_SLIDER_ORDER) {
      const metaVal = Number(metaSliders[key] || 0)
      const rosterVal = Number(rosterSliders[key] || 0)
      const delta = rosterVal - metaVal
      if (!delta) continue
      const label = getBuildSliderLabel(key, lang)
      reasons.push(
        lang === 'en'
          ? delta > 0
            ? `More on ${label} than the generic meta pack (+${delta}): better for your real squad.`
            : `Less on ${label} than the meta pack (${delta}): other areas matter more for you.`
          : delta > 0
            ? `Più ${label} rispetto al meta pack (+${delta}): più adatto alla tua rosa.`
            : `Meno ${label} rispetto al meta pack (${delta}): per te contano di più altre caratteristiche.`
      )
    }
  }

  return reasons
}

function formatBuildResult(
  build,
  lang,
  cardOverall = null,
  { variant = 'meta', rosterContext = null, metaSliders = null, card = null, enrichedCatalog = null } = {}
) {
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

  const engineReasons = pickBilingualList(build.reasons, lang)
    .map(reason => simplifyEngineReason(reason, lang))
    .filter(Boolean)

  let reasons = engineReasons
  if (variant === 'roster' && rosterContext) {
    const advisorReasons = buildRosterAdvisorReasons({
      lang,
      rosterContext,
      rosterSliders: build.sliders,
      metaSliders,
      card,
      enrichedCatalog
    })
    reasons = [...advisorReasons, ...engineReasons]
  }
  const maxReasons = variant === 'roster' ? 6 : 2

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
    reasons: reasons.slice(0, maxReasons),
    warnings: pickBilingualList(build.warnings, lang).slice(0, 1),
    confidence: build.confidence ?? null,
    ptCopy: formatBuildPtCopy(build.sliders, lang),
    variant
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
      skills: suggestSkillsForAdvisorCard(player, { lang, catalogCard: enrichedCatalog, card })
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

  const meta = formatBuildResult(metaRaw, lang, cardOverall, { variant: 'meta' })
  const rosterBuild = rosterRaw
    ? formatBuildResult(rosterRaw, lang, cardOverall, {
        variant: 'roster',
        rosterContext,
        metaSliders: metaRaw?.sliders,
        card,
        enrichedCatalog
      })
    : null

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
      skills: suggestSkillsForAdvisorCard(player, { lang, catalogCard: enrichedCatalog, card }),
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
    skills: suggestSkillsForAdvisorCard(player, { lang, catalogCard: enrichedCatalog, card })
  }
}
