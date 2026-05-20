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
import { getSkillDisplayLabel } from './playerSkillLabels.js'

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

const TEAM_STYLE_LABELS = {
  contrattacco: { it: 'Contrattacco', en: 'Counter Attack' },
  contropiede_veloce: { it: 'Contropiede veloce', en: 'Quick Counter' },
  possesso_palla: { it: 'Possesso palla', en: 'Possession' },
  vie_laterali: { it: 'Vie laterali', en: 'Wing Play' }
}

function formatTeamStyleLabel(teamStyle, lang) {
  const key = String(teamStyle || '').trim().toLowerCase()
  if (!key) return null
  const entry = TEAM_STYLE_LABELS[key]
  if (entry) return lang === 'en' ? entry.en : entry.it
  return String(teamStyle).replace(/_/g, ' ')
}

function collectAdvisorComStyles(catalogCard) {
  const raw = [
    ...(Array.isArray(catalogCard?.ai_playstyles) ? catalogCard.ai_playstyles : []),
    ...(Array.isArray(catalogCard?.players_payload?.ai_playstyles)
      ? catalogCard.players_payload.ai_playstyles
      : []),
    ...(Array.isArray(catalogCard?.players_payload?.com_skills)
      ? catalogCard.players_payload.com_skills
      : [])
  ]
  const seen = new Set()
  const out = []
  for (const skill of raw) {
    const canon = String(skill || '').trim()
    if (!canon) continue
    const key = canon.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(canon)
  }
  return out
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
    com_skills: collectAdvisorComStyles(catalogCard),
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
    [/Passaggio valorizzato per creare linee di gioco e servire compagni\.?/i, 'Servi meglio i compagni e arrivi prima nelle zone pericolose.'],
    [/Dribbling e controllo stretto rinforzati per sfruttare le sue qualità tecniche e conduzione\.?/i, 'Più sicurezza con la palla ai piedi quando attacchi.'],
    [/Dribbling e controllo stretto rinforzati per sfruttare skill tecniche e conduzione\.?/i, 'Più sicurezza con la palla ai piedi quando attacchi.'],
    [/Destrezza usata per comportamento offensivo, accelerazione ed equilibrio nel ruolo\.?/i, 'Più scatto negli inserimenti: ti stacchi dal marcatore prima.'],
    [/Forza arti inferiori usata per velocita, potenza e resistenza nel sistema squadra\.?/i, 'Gambe più reattive per tutta la partita e sulle ripartenze.'],
    [/Tiro potenziato per finalizzazione e minaccia offensiva coerente con le skill\.?/i, 'Più pericoloso quando ti presenti davanti alla porta.'],
    [/Difesa prioritaria per copertura, contrasti e protezione della squadra\.?/i, 'Più solido nei duelli e quando recuperi palla.'],
    [/Forza in aria scelta per duelli fisici, salto e contatto\.?/i, 'Più forte nei duelli aerei e sulle seconde palle.'],
    [/Abilita native considerate per dare peso alle macro piu coerenti\.?/i, ''],
    [/Abilità native considerate per dare peso alle macro più coerenti\.?/i, ''],
    [/Build adattata allo stile squadra: ([^.]+)\.?/i, 'Pensata per come giochi con $1.'],
    [/Portiere ottimizzato sulle macro PT e presenza fisica\.?/i, 'Punti scelti per darti più sicurezza tra i pali.'],
    [/macro PT/gi, 'punti'],
    [/non su numeri “di comodo”/gi, ''],
    [/non su statistiche “di comodo”/gi, '']
  ]
  const replacementsEn = [
    [/Passing was emphasized to open lanes and supply teammates\.?/i, 'You serve teammates better and reach dangerous areas sooner.'],
    [/Dribbling and tight possession were boosted to leverage technical skills and ball carrying\.?/i, 'More confidence on the ball when you attack.'],
    [/Dexterity was used for offensive movement, acceleration and balance in role\.?/i, 'Quicker bursts on runs — you break away a step earlier.'],
    [/Lower-body strength was used for pace, shot power and stamina within the squad system\.?/i, 'Stronger legs for the full match and on transitions.'],
    [/Shooting was boosted for finishing and offensive threat aligned with skills\.?/i, 'More dangerous when you get a shooting chance.'],
    [/Defending was prioritized for coverage, duels and team protection\.?/i, 'Sturdier in duels and when you win the ball back.'],
    [/Aerial strength was chosen for physical duels, jumping and contact\.?/i, 'Stronger in the air and on second balls.'],
    [/Player skills were considered to weight the most coherent progression macros\.?/i, ''],
    [/Build tuned for team style: ([^.]+)\.?/i, 'Built for how you play with $1.'],
    [/Goalkeeper tuned on GK progression macros and physical presence\.?/i, 'Points chosen to make you feel safer in goal.']
  ]
  let out = raw
  for (const [pattern, value] of lang === 'en' ? replacementsEn : replacementsIt) {
    out = out.replace(pattern, value)
  }
  return out.trim()
}

const MACRO_GAMEPLAY_IT = {
  shooting: 'chiudi meglio le occasioni',
  passing: 'costruisci e servi prima che la difesa si riorganizzi',
  dribbling: 'vinci i duello in fascia e tieni palla sotto pressione',
  dexterity: 'stacchi il marcatore negli inserimenti',
  lowerBodyStrength: 'sostieni ritmo e ripartenze per novanta minuti',
  aerialStrength: 'vinci palle alte e secondi palloni',
  defending: 'recuperi e copri con più autorità',
  gk1: 'domini tra i pali',
  gk2: 'domini tra i pali',
  gk3: 'domini tra i pali'
}

const MACRO_GAMEPLAY_EN = {
  shooting: 'you finish chances cleaner',
  passing: 'you build and deliver before the block resets',
  dribbling: 'you win wide duels and keep the ball under pressure',
  dexterity: 'you break away on runs',
  lowerBodyStrength: 'you sustain pace and transitions',
  aerialStrength: 'you win air balls and second phases',
  defending: 'you recover and cover with authority',
  gk1: 'you command the box',
  gk2: 'you command the box',
  gk3: 'you command the box'
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

function getReasonSectionTitle(id, lang) {
  const titles = {
    context: { it: 'In pratica per te', en: 'What this means for you' },
    skills: { it: 'Cosa senti in partita', en: 'What you feel in matches' },
    allocation: { it: 'Dove mettiamo i punti', en: 'Where the points go' },
    vsMeta: { it: 'Perché questa è la scelta giusta', en: 'Why this fits you better' }
  }
  return titles[id]?.[lang === 'en' ? 'en' : 'it'] || ''
}

function macroGameplayPhrase(key, lang) {
  const map = lang === 'en' ? MACRO_GAMEPLAY_EN : MACRO_GAMEPLAY_IT
  return map[key] || (lang === 'en' ? 'it fits your match plan' : 'serve al tuo modo di giocare')
}

function matchSkillToken(skill, pattern) {
  return pattern.test(String(skill || ''))
}

function filterSkillsByPattern(skills, pattern) {
  return (Array.isArray(skills) ? skills : []).filter(skill => matchSkillToken(skill, pattern))
}

function labelSkills(skills, lang, max = 4) {
  return [...new Set(skills.map(skill => getSkillDisplayLabel(skill, lang)).filter(Boolean))].slice(0, max)
}

function joinLabels(labels, lang) {
  if (!labels.length) return ''
  if (labels.length === 1) return labels[0]
  if (lang === 'en') {
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
    return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
  }
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
}

/** Beneficio in partita legato ad abilità + macro top (tono coach, non audit). */
function buildSkillDriverLines(equipped, comStyles, topSliderKeys, lang) {
  const allTokens = [...equipped, ...comStyles]
  const lines = []
  const used = new Set()

  const pushLine = (macroKey, line) => {
    if (!line || used.has(macroKey)) return
    used.add(macroKey)
    lines.push(line)
  }

  for (const macroKey of topSliderKeys) {
    const outcome = macroGameplayPhrase(macroKey, lang)
    if (macroKey === 'shooting') {
      const matched = filterSkillsByPattern(allTokens, /first[- ]?time|acrobatic|dipping|rising|long[- ]?range shooting|power shot|knuckle|finishing|curler|outside curler|phenomenal finishing|blitz curler/i)
      const labels = labelSkills(matched, lang)
      if (labels.length) {
        pushLine(
          macroKey,
          lang === 'en'
            ? `Your card has ${joinLabels(labels, lang)}: Shooting points help you ${outcome}.`
            : `Hai ${joinLabels(labels, lang)}: i punti in Tiro ti fanno ${outcome}.`
        )
      }
    }
    if (macroKey === 'passing') {
      const matched = filterSkillsByPattern(allTokens, /through pass|one[- ]?touch pass|weighted pass|pinpoint cross|low lofted|no look|phenomenal passing|visionary|game.changing pass|edged cross|long[- ]?range shooting|long ball/i)
      const labels = labelSkills(matched, lang)
      if (labels.length) {
        pushLine(
          macroKey,
          lang === 'en'
            ? `With ${joinLabels(labels, lang)}, Passing points help you ${outcome}.`
            : `Con ${joinLabels(labels, lang)}, i punti in Passaggio ti fanno ${outcome}.`
        )
      }
    }
    if (macroKey === 'dribbling') {
      const matched = filterSkillsByPattern(allTokens, /double touch|sole control|flip flap|chop turn|cut behind|scissors|marseille|momentum dribbling|trickster|mazing run|magnetic feet|acceleration burst/i)
      const labels = labelSkills(matched, lang)
      if (labels.length) {
        pushLine(
          macroKey,
          lang === 'en'
            ? `Your skills (${joinLabels(labels, lang)}) shine here: Dribbling points help you ${outcome}.`
            : `Le tue abilità (${joinLabels(labels, lang)}) contano qui: il Dribbling ti fa ${outcome}.`
        )
      }
    }
    if (macroKey === 'dexterity') {
      const matched = filterSkillsByPattern(allTokens, /incisive run|speeding bullet|acceleration burst|mazing run|hole player|flip flap|double touch/i)
      const labels = labelSkills(matched, lang)
      if (labels.length) {
        pushLine(
          macroKey,
          lang === 'en'
            ? `With ${joinLabels(labels, lang)}, Dexterity helps you ${outcome}.`
            : `Con ${joinLabels(labels, lang)}, la Destrezza ti fa ${outcome}.`
        )
      }
    }
    if (macroKey === 'lowerBodyStrength') {
      const matched = filterSkillsByPattern(allTokens, /speeding bullet|incisive run|acceleration burst|long ball|long ranger|low screamer|track back|fighting spirit/i)
      const labels = labelSkills(matched, lang)
      if (labels.length) {
        pushLine(
          macroKey,
          lang === 'en'
            ? `With ${joinLabels(labels, lang)}, leg strength keeps you ${outcome}.`
            : `Con ${joinLabels(labels, lang)}, le gambe reggono così ${outcome}.`
        )
      }
    }
    if (macroKey === 'defending') {
      const matched = filterSkillsByPattern(allTokens, /interception|blocker|man marking|sliding tackle|track back|aerial fort|long.reach tackle/i)
      const labels = labelSkills(matched, lang)
      if (labels.length) {
        pushLine(
          macroKey,
          lang === 'en'
            ? `With ${joinLabels(labels, lang)}, you ${outcome}.`
            : `Con ${joinLabels(labels, lang)}, ${outcome}.`
        )
      }
    }
    if (macroKey === 'aerialStrength') {
      const matched = filterSkillsByPattern(allTokens, /heading|aerial superiority|bullet header|aerial fort|heel trick/i)
      const labels = labelSkills(matched, lang)
      if (labels.length) {
        pushLine(
          macroKey,
          lang === 'en'
            ? `In the air (${joinLabels(labels, lang)}): you ${outcome}.`
            : `In aria (${joinLabels(labels, lang)}): ${outcome}.`
        )
      }
    }
  }

  return lines.slice(0, 3)
}

function buildVsMetaPositiveLines(deltas, lang, teamStyleLabel) {
  const lines = []
  for (const { key, delta } of deltas) {
    const label = getBuildSliderLabel(key, lang)
    const outcome = macroGameplayPhrase(key, lang)
    if (delta > 0) {
      lines.push(
        lang === 'en'
          ? `We put more points in ${label} than the benchmark because your ${teamStyleLabel || 'style'} needs it — you will ${outcome}.`
          : `Mettiamo più punti in ${label} rispetto al confronto perché con il tuo ${teamStyleLabel || 'stile'} ti serve davvero — ${outcome}.`
      )
    } else if (delta < 0) {
      lines.push(
        lang === 'en'
          ? `We use fewer points in ${label} than the benchmark: your points stay where they help you win.`
          : `Usiamo meno punti in ${label} rispetto al confronto: i PT restano dove ti fanno vincere le partite.`
      )
    }
  }
  return lines.slice(0, 2)
}

function formatComStylesClause(comStyles, lang, max = 4) {
  const labels = labelSkills(comStyles, lang, max)
  if (!labels.length) return ''
  return joinLabels(labels, lang)
}

function buildRosterWhyLead({
  lang,
  rosterSliders,
  skillsClause,
  teamStyleLabel,
  formation,
  slot,
  playOverall,
  cardOverall
}) {
  const topSliders = getTopSliders(rosterSliders, 3)
  const spread = formatTopSlidersLine(rosterSliders, lang, 3).join(lang === 'en' ? ' · ' : ' · ')
  const primary = topSliders[0]
  const secondary = topSliders[1]
  const p1 = primary ? macroGameplayPhrase(primary.key, lang) : ''
  const p2 = secondary ? macroGameplayPhrase(secondary.key, lang) : ''
  const setup = [formation, teamStyleLabel, slot ? (lang === 'en' ? `as ${slot}` : `da ${slot}`) : null]
    .filter(Boolean)
    .join(' · ')

  if (lang === 'en') {
    const ovr =
      playOverall && cardOverall && playOverall !== cardOverall
        ? ` Estimated OVR with these points: ${playOverall} (level-1 card: ${cardOverall}).`
        : ''
    return `For your squad${setup ? ` (${setup})` : ''}: ${spread || 'see sliders above'}. In matches you ${p1}${p2 ? ` and ${p2}` : ''}.${ovr}`
  }
  const ovr =
    playOverall && cardOverall && playOverall !== cardOverall
      ? ` OVR stimato con questi PT: ${playOverall} (carta a liv. 1: ${cardOverall}).`
      : ''
  return `Per la tua rosa${setup ? ` (${setup})` : ''}: ${spread || 'vedi le macro sopra'}. In partita ${p1}${p2 ? ` e ${p2}` : ''}.${ovr}`
}

/** Una riga chiara: numeri + cosa non rappresenta (niente ripetizione “perché passaggio”). */
function buildMetaWhyLead({ lang, sliders, role }) {
  const spread = formatTopSlidersLine(sliders, lang, 4).join(lang === 'en' ? ' · ' : ' · ')
  if (lang === 'en') {
    return spread
      ? `Benchmark (${role || 'role'}): ${spread}. Generic pack spread without your squad, formation or coach — apply the Recommended build in-game.`
      : `Benchmark for ${role || 'this role'}: generic pack spread. Use Recommended in-game.`
  }
  return spread
    ? `Confronto meta (${role || 'ruolo'}): ${spread}. Profilo pacchetto generico, senza la tua rosa, modulo o allenatore — in gioco usa la build Consigliata.`
    : `Confronto meta sul ${role || 'ruolo'}: profilo generico. In gioco usa la build Consigliata.`
}

function formatSkillsClause(card, enrichedCatalog, lang, max = 5) {
  const { equipped } = getAdvisorEquippedSkills(card, enrichedCatalog)
  const labels = [...new Set(
    equipped.map(skill => getSkillDisplayLabel(skill, lang)).filter(Boolean)
  )].slice(0, max)
  if (!labels.length) return ''
  if (labels.length === 1) return labels[0]
  if (lang === 'en') {
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
    return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
  }
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`
}

function getTopSliderDeltas(rosterSliders, metaSliders, lang, limit = 2) {
  if (!metaSliders || !rosterSliders) return []
  return BUILD_SLIDER_ORDER.map(key => ({
    key,
    delta: Number(rosterSliders[key] || 0) - Number(metaSliders[key] || 0)
  }))
    .filter(entry => entry.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit)
    .map(({ key, delta }) => {
      const label = getBuildSliderLabel(key, lang)
      const sign = delta > 0 ? `+${delta}` : String(delta)
      return `${label} ${sign}`
    })
}

function buildMetaReasonSections({ lang, sliders, card, enrichedCatalog }) {
  const role = card?.position || enrichedCatalog?.position || null
  return {
    sections: [],
    whyLead: buildMetaWhyLead({ lang, sliders, role })
  }
}

function buildRosterReasonSections({
  lang,
  rosterContext,
  rosterSliders,
  metaSliders,
  card,
  enrichedCatalog,
  pointsUsed,
  targetPosition,
  playOverall = null,
  cardOverall = null
}) {
  const sections = []
  const formation =
    rosterContext?.layout?.formation_name ||
    rosterContext?.layout?.formation ||
    rosterContext?.formation_name ||
    null
  const coachName = rosterContext?.activeCoach?.coach_name || rosterContext?.activeCoach?.name || null
  const teamStyle = rosterContext?.tacticalSettings?.team_playing_style || null
  const teamStyleLabel = formatTeamStyleLabel(teamStyle, lang)
  const playingStyle = enrichedCatalog?.playing_style || card?.style || null
  const role = card?.position || enrichedCatalog?.position || null
  const skillsClause = formatSkillsClause(card, enrichedCatalog, lang, 6)
  const { equipped } = getAdvisorEquippedSkills(card, enrichedCatalog)
  const comStyles = collectAdvisorComStyles(enrichedCatalog)
  const topSliders = getTopSliders(rosterSliders, 4)
  const topKeys = topSliders.map(entry => entry.key)
  const contextItems = []

  const slot = targetPosition || role
  const tacticalBits = []
  if (formation) tacticalBits.push(formation)
  if (teamStyleLabel) tacticalBits.push(teamStyleLabel)
  if (coachName) tacticalBits.push(coachName)
  if (slot) tacticalBits.push(lang === 'en' ? `slot ${slot}` : `ruolo ${slot}`)

  if (skillsClause) {
    contextItems.push(
      lang === 'en'
        ? `Your card: ${skillsClause}${playingStyle && playingStyle !== 'Profilo da analizzare' ? ` · ${playingStyle}` : ''}. We strengthen what you already do well.`
        : `La tua carta: ${skillsClause}${playingStyle && playingStyle !== 'Profilo da analizzare' ? ` · ${playingStyle}` : ''}. Rafforziamo ciò che sai già fare.`
    )
  }

  if (tacticalBits.length) {
    contextItems.push(
      lang === 'en'
        ? `Your squad (${tacticalBits.join(' · ')}): these points match how you actually play.`
        : `La tua rosa (${tacticalBits.join(' · ')}): i punti seguono il tuo modo di giocare, non una build generica.`
    )
  } else if (role) {
    contextItems.push(
      lang === 'en'
        ? `Role ${role}: tailored to your starting XI.`
        : `Ruolo ${role}: pensata per la tua formazione.`
    )
  }

  if (contextItems.length) {
    sections.push({
      id: 'context',
      title: getReasonSectionTitle('context', lang),
      items: contextItems.slice(0, 1)
    })
  }

  const skillLines = buildSkillDriverLines(equipped, comStyles, topKeys, lang).slice(0, 1)
  if (skillLines.length) {
    sections.push({
      id: 'skills',
      title: getReasonSectionTitle('skills', lang),
      items: skillLines
    })
  }

  if (metaSliders) {
    const deltas = BUILD_SLIDER_ORDER.map(key => ({
      key,
      delta: Number(rosterSliders?.[key] || 0) - Number(metaSliders[key] || 0)
    }))
      .filter(entry => entry.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 2)

    if (deltas.length) {
      sections.push({
        id: 'vsMeta',
        title: getReasonSectionTitle('vsMeta', lang),
        items: buildVsMetaPositiveLines(deltas, lang, teamStyleLabel)
      })
    }
  }

  return {
    sections,
    whyLead: buildRosterWhyLead({
      lang,
      rosterSliders,
      skillsClause,
      teamStyleLabel,
      formation,
      slot,
      playOverall,
      cardOverall
    })
  }
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

  const whyBundle =
    variant === 'roster' && rosterContext
      ? buildRosterReasonSections({
          lang,
          rosterContext,
          rosterSliders: build.sliders,
          metaSliders,
          card,
          enrichedCatalog,
          pointsUsed: build.pointsUsed,
          pointsAvailable: build.pointsAvailable,
          targetPosition: build.targetPosition,
          playOverall,
          cardOverall: Number.isFinite(Number(cardOverall)) ? Number(cardOverall) : null
        })
      : buildMetaReasonSections({
          lang,
          sliders: build.sliders,
          card,
          enrichedCatalog
        })

  const reasonSections = whyBundle.sections || []
  const whyLead = whyBundle.whyLead || ''

  const reasons = flattenReasonSections(reasonSections)
  const maxReasons = variant === 'roster' ? 12 : 8

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
    whyLead,
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
