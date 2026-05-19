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

function countRosterStarters(rosterContext) {
  const players = rosterContext?.players || []
  return players.filter(player => {
    const slot = Number(player?.slot_index)
    return slot >= 0 && slot <= 10
  }).length
}

function getTopSliders(sliders = {}, limit = 4) {
  return BUILD_SLIDER_ORDER.map(key => ({ key, val: Number(sliders?.[key] || 0) }))
    .filter(entry => entry.val > 0)
    .sort((a, b) => b.val - a.val)
    .slice(0, limit)
}

function formatTopSlidersLine(sliders, lang, limit = 3) {
  return getTopSliders(sliders, limit).map(
    ({ key, val }) => `${getBuildSliderLabel(key, lang)} ${val} PT`
  )
}

function sectionTitle(id, lang) {
  const titles = {
    data: { it: 'Dati che abbiamo usato', en: 'Data we used' },
    allocation: { it: 'Dove investiamo i PT', en: 'Where points go' },
    vsMeta: { it: 'Rispetto al meta pack', en: 'Vs meta pack' },
    engine: { it: 'Logica sulla carta', en: 'Card logic' }
  }
  const entry = titles[id]
  if (!entry) return id
  return lang === 'en' ? entry.en : entry.it
}

function buildMetaReasonSections({ lang, sliders, pointsUsed, pointsAvailable, card, enrichedCatalog, engineReasons }) {
  const sections = []
  const role = card?.position || enrichedCatalog?.position || null
  const style = enrichedCatalog?.playing_style || card?.style || null
  const dataItems = [
    lang === 'en'
      ? 'Community meta pack: role and playing style without your squad, coach or formation.'
      : 'Benchmark meta pack: ruolo e stile community, senza rosa, coach né modulo salvato.'
  ]
  if (role) {
    dataItems.push(
      lang === 'en'
        ? `Role on card: ${role} — weights follow what works for this position in the generic meta.`
        : `Ruolo carta ${role}: i pesi seguono cosa funziona per questa posizione nel meta generico.`
    )
  }
  if (style && style !== 'Profilo da analizzare') {
    dataItems.push(
      lang === 'en'
        ? `Playing style ${style}: progression favors stats that match this profile on the card.`
        : `Stile ${style}: la progressione privilegia le statistiche coerenti con questo profilo in scheda.`
    )
  }
  sections.push({ id: 'data', title: sectionTitle('data', lang), items: dataItems })

  const topLine = formatTopSlidersLine(sliders, lang, 4)
  if (topLine.length > 0) {
    sections.push({
      id: 'allocation',
      title: sectionTitle('allocation', lang),
      items: [
        lang === 'en'
          ? `${pointsUsed}/${pointsAvailable} progression points on: ${topLine.join(' · ')}.`
          : `${pointsUsed}/${pointsAvailable} punti progressione su: ${topLine.join(' · ')}.`,
        lang === 'en'
          ? 'This is the reference spread before we apply your squad context.'
          : 'È la distribuzione di riferimento prima di applicare modulo, coach e stile squadra.'
      ]
    })
  }

  if (engineReasons.length > 0) {
    sections.push({
      id: 'engine',
      title: sectionTitle('engine', lang),
      items: engineReasons.slice(0, 3)
    })
  }

  return sections
}

function buildRosterReasonSections({
  lang,
  rosterContext,
  rosterSliders,
  metaSliders,
  card,
  enrichedCatalog,
  engineReasons,
  pointsUsed,
  pointsAvailable,
  targetPosition
}) {
  const sections = []
  const formation =
    rosterContext?.layout?.formation_name ||
    rosterContext?.layout?.formation ||
    rosterContext?.formation_name ||
    null
  const coachName = rosterContext?.activeCoach?.coach_name || rosterContext?.activeCoach?.name || null
  const coachConnection =
    rosterContext?.activeCoach?.connection?.name ||
    rosterContext?.activeCoach?.connection?.connection ||
    rosterContext?.activeCoach?.connection?.title ||
    null
  const teamStyle = rosterContext?.tacticalSettings?.team_playing_style || null
  const playingStyle = enrichedCatalog?.playing_style || card?.style || null
  const totalPlayers = (rosterContext?.players || []).length
  const starters = countRosterStarters(rosterContext)
  const role = card?.position || enrichedCatalog?.position || null
  const skillCount = Array.isArray(enrichedCatalog?.player_skills)
    ? enrichedCatalog.player_skills.length
    : Array.isArray(card?.skills)
      ? card.skills.length
      : 0

  const dataItems = []
  if (totalPlayers > 0) {
    dataItems.push(
      lang === 'en'
        ? `Linked squad: ${totalPlayers} players saved, ${starters} starters in your current XI.`
        : `Rosa collegata: ${totalPlayers} giocatori salvati, ${starters} titolari nel modulo attuale.`
    )
  }
  if (formation) {
    dataItems.push(
      lang === 'en'
        ? `Formation ${formation}: we place progression where this role is most useful in your shape.`
        : `Modulo ${formation}: i PT vanno dove questo ruolo incide di più nel tuo disegno tattico.`
    )
  }
  if (targetPosition && targetPosition !== role) {
    dataItems.push(
      lang === 'en'
        ? `Slot on pitch: ${targetPosition} (card role ${role || '—'}).`
        : `Slot in campo: ${targetPosition} (ruolo carta ${role || '—'}).`
    )
  } else if (targetPosition || role) {
    dataItems.push(
      lang === 'en'
        ? `Target role: ${targetPosition || role}.`
        : `Ruolo target: ${targetPosition || role}.`
    )
  }
  if (coachName) {
    const coachLine = coachConnection
      ? lang === 'en'
        ? `Active coach ${coachName} (${coachConnection}): boosts aligned with how you already play.`
        : `Coach attivo ${coachName} (${coachConnection}): i bonus seguono come giochi già in partita.`
      : lang === 'en'
        ? `Active coach ${coachName}: progression follows your coach bonuses.`
        : `Coach attivo ${coachName}: la progressione segue i bonus del tuo allenatore.`
    dataItems.push(coachLine)
  }
  if (teamStyle) {
    dataItems.push(
      lang === 'en'
        ? `Team style “${teamStyle}”: we weight stats that matter in your tactical settings.`
        : `Stile squadra “${teamStyle}”: pesiamo le statistiche che contano nelle impostazioni tattiche salvate.`
    )
  }
  if (playingStyle && playingStyle !== 'Profilo da analizzare') {
    dataItems.push(
      lang === 'en'
        ? `Card style ${playingStyle}: build supports how this player moves in your system.`
        : `Stile carta ${playingStyle}: la build supporta come si muove in campo nel tuo sistema.`
    )
  }
  if (skillCount > 0) {
    dataItems.push(
      lang === 'en'
        ? `${skillCount} skills/traits on file: native abilities influenced which macros got points.`
        : `${skillCount} abilità/tratti in scheda: le qualità native hanno influenzato quali macro ricevono punti.`
    )
  }
  if (dataItems.length > 0) {
    sections.push({ id: 'data', title: sectionTitle('data', lang), items: dataItems })
  }

  const topLine = formatTopSlidersLine(rosterSliders, lang, 4)
  if (topLine.length > 0) {
    sections.push({
      id: 'allocation',
      title: sectionTitle('allocation', lang),
      items: [
        lang === 'en'
          ? `We allocated ${pointsUsed}/${pointsAvailable} points on: ${topLine.join(' · ')}.`
          : `Abbiamo allocato ${pointsUsed}/${pointsAvailable} punti su: ${topLine.join(' · ')}.`,
        ...getTopSliders(rosterSliders, 4).map(({ key, val }) => {
          const label = getBuildSliderLabel(key, lang)
          return lang === 'en'
            ? `${label}: ${val} PT — priority for your squad context.`
            : `${label}: ${val} PT — priorità nel contesto della tua rosa.`
        })
      ].slice(0, 5)
    })
  }

  if (metaSliders && rosterSliders) {
    const vsMeta = []
    for (const key of BUILD_SLIDER_ORDER) {
      const metaVal = Number(metaSliders[key] || 0)
      const rosterVal = Number(rosterSliders[key] || 0)
      const delta = rosterVal - metaVal
      if (!delta) continue
      const label = getBuildSliderLabel(key, lang)
      vsMeta.push(
        lang === 'en'
          ? delta > 0
            ? `${label}: ${rosterVal} vs ${metaVal} meta (+${delta}) — more suited to your XI.`
            : `${label}: ${rosterVal} vs ${metaVal} meta (${delta}) — other stats matter more for you.`
          : delta > 0
            ? `${label}: ${rosterVal} vs ${metaVal} meta (+${delta}) — più adatto alla tua rosa.`
            : `${label}: ${rosterVal} vs ${metaVal} meta (${delta}) — per te contano di più altre aree.`
      )
    }
    if (vsMeta.length > 0) {
      sections.push({
        id: 'vsMeta',
        title: sectionTitle('vsMeta', lang),
        items: vsMeta.slice(0, 5)
      })
    }
  }

  if (engineReasons.length > 0) {
    sections.push({
      id: 'engine',
      title: sectionTitle('engine', lang),
      items: engineReasons.slice(0, 3)
    })
  }

  return sections
}

function flattenReasonSections(sections) {
  return sections.flatMap(section => section.items || []).filter(Boolean)
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

  const reasonSections =
    variant === 'roster' && rosterContext
      ? buildRosterReasonSections({
          lang,
          rosterContext,
          rosterSliders: build.sliders,
          metaSliders,
          card,
          enrichedCatalog,
          engineReasons,
          pointsUsed: build.pointsUsed,
          pointsAvailable: build.pointsAvailable,
          targetPosition: build.targetPosition
        })
      : buildMetaReasonSections({
          lang,
          sliders: build.sliders,
          pointsUsed: build.pointsUsed,
          pointsAvailable: build.pointsAvailable,
          card,
          enrichedCatalog,
          engineReasons
        })

  const reasons = flattenReasonSections(reasonSections)
  const maxReasons = variant === 'roster' ? 14 : 6

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
    reasonSections,
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
