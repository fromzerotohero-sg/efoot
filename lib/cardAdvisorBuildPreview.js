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
    [/Passaggio valorizzato per creare linee di gioco e servire compagni\.?/i, 'Più qualità sul pallone servito: arrivi prima in area e sfrutti le abilità da passaggio.'],
    [/Dribbling e controllo stretto rinforzati per sfruttare le sue qualità tecniche e conduzione\.?/i, 'Più sicurezza in conduzione e nei cambi di direzione quando entri nel vivo del gioco.'],
    [/Destrezza usata per comportamento offensivo, accelerazione ed equilibrio nel ruolo\.?/i, 'Più scatto e equilibrio negli inserimenti — ti stacchi dal marcatore un attimo prima.'],
    [/Forza arti inferiori usata per velocita, potenza e resistenza nel sistema squadra\.?/i, 'Gambe che reggono tutta la partita: accelerazione e potenza sulle ripartenze.'],
    [/Tiro potenziato per finalizzazione e minaccia offensiva coerente con le skill\.?/i, 'Minaccia conclusiva più credibile quando ti presenti in zona tiro.'],
    [/Difesa prioritaria per copertura, contrasti e protezione della squadra\.?/i, 'Più solidità nei duelli e nel recupero palla.'],
    [/Forza in aria scelta per duelli fisici, salto e contatto\.?/i, 'Dominio nei duelli aerei e sulle seconde palle.'],
    [/Abilita native considerate per dare peso alle macro piu coerenti\.?/i, ''],
    [/Build adattata allo stile squadra: ([^.]+)\.?/i, 'Calibrata sul tuo stile di gioco: $1.'],
    [/macro PT/gi, 'punti'],
    [/non su numeri “di comodo”/gi, ''],
    [/non su statistiche “di comodo”/gi, '']
  ]
  const replacementsEn = [
    [/Passing was emphasized to open lanes and supply teammates\.?/i, 'Better service: you reach the box earlier and use your passing skills.'],
    [/Dexterity was used for offensive movement, acceleration and balance in role\.?/i, 'Sharper bursts and balance on runs — you separate half a step earlier.'],
    [/Lower-body strength was used for pace, shot power and stamina within the squad system\.?/i, 'Legs for the full match: acceleration and power on transitions.'],
    [/Player skills were considered to weight the most coherent progression macros\.?/i, ''],
    [/Build tuned for team style: ([^.]+)\.?/i, 'Tuned to how you play: $1.']
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
    context: { it: 'Per te in breve', en: 'The short version' },
    skills: { it: 'Il vantaggio in campo', en: 'What you feel in-game' },
    allocation: { it: 'Dove investiamo', en: 'Where points go' },
    vsMeta: { it: 'Perché non è il meta', en: 'Why not the meta copy' }
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
            ? `With ${joinLabels(labels, lang)} on the card, Shooting points mean ${outcome} — not random stat padding.`
            : `Con ${joinLabels(labels, lang)} in scheda, i punti in Tiro servono a ${outcome}.`
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
            ? `${joinLabels(labels, lang)} are your weapon: Passing points make you ${outcome}.`
            : `${joinLabels(labels, lang)} sono il tuo punto di forza: i punti in Passaggio fanno sì che ${outcome}.`
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
            ? `Technical kit (${joinLabels(labels, lang)}): Dribbling points help you ${outcome}.`
            : `Kit tecnico (${joinLabels(labels, lang)}): i punti in Dribbling ti fanno ${outcome}.`
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
            ? `Movement profile (${joinLabels(labels, lang)}): Dexterity points so you ${outcome}.`
            : `Profilo di movimento (${joinLabels(labels, lang)}): Destrezza così ${outcome}.`
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
            ? `Pace tools (${joinLabels(labels, lang)}): lower-body points keep you ${outcome}.`
            : `Ritmo (${joinLabels(labels, lang)}): forza alle gambe così ${outcome}.`
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
            ? `Defensive tools (${joinLabels(labels, lang)}): you ${outcome}.`
            : `Strumenti difensivi (${joinLabels(labels, lang)}): ${outcome}.`
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
          ? `More ${label} than the meta template: your ${teamStyleLabel || 'squad'} actually needs it — ${outcome}.`
          : `Più ${label} del meta online: nel tuo ${teamStyleLabel || 'modo di giocare'} serve davvero — ${outcome}.`
      )
    } else if (delta < 0) {
      lines.push(
        lang === 'en'
          ? `Less ${label} than the crowd max: we kept points where you win matches, not on showcase stats.`
          : `Meno ${label} del max “da template”: i punti restano dove vinci le partite, non sullo showcase del meta.`
      )
    }
  }
  if (lines.length && lang === 'en') {
    lines.push('Bottom line: copy the roster build, use meta only as a curiosity check.')
  } else if (lines.length) {
    lines.push('In sintesi: applica la build Consigliata; il meta è solo un confronto veloce.')
  }
  return lines.slice(0, 3)
}

function formatComStylesClause(comStyles, lang, max = 4) {
  const labels = labelSkills(comStyles, lang, max)
  if (!labels.length) return ''
  return joinLabels(labels, lang)
}

function buildRosterWhyLead({ lang, pointsUsed, topSliders, skillsClause, teamStyleLabel, formation, slot, playOverall, cardOverall }) {
  const primary = topSliders[0]
  const secondary = topSliders[1]
  const p1 = primary ? macroGameplayPhrase(primary.key, lang) : ''
  const p2 = secondary ? macroGameplayPhrase(secondary.key, lang) : ''
  const setup = [formation, teamStyleLabel, slot ? (lang === 'en' ? `as ${slot}` : `da ${slot}`) : null]
    .filter(Boolean)
    .join(lang === 'en' ? ' · ' : ' · ')

  if (lang === 'en') {
    const ovr =
      playOverall && cardOverall && playOverall !== cardOverall
        ? ` Play profile ${playOverall} (card ${cardOverall}).`
        : ''
    return `Built for how you actually play${setup ? ` — ${setup}` : ''}: ${skillsClause ? `${skillsClause} ` : ''}→ ${p1}${p2 ? `, then ${p2}` : ''}.${ovr}`
  }
  const ovr =
    playOverall && cardOverall && playOverall !== cardOverall
      ? ` Profilo in partita ${playOverall} (carta ${cardOverall}).`
      : ''
  return `Build per come giochi davvero${setup ? ` (${setup})` : ''}: ${skillsClause ? `con ${skillsClause} ` : ''}potenziamo ciò che senti in campo — ${p1}${p2 ? ` e ${p2}` : ''}.${ovr}`
}

function buildMetaWhyLead({ lang, pointsUsed, topSliders, skillsClause, role }) {
  const primary = topSliders[0]
  const phrase = primary ? macroGameplayPhrase(primary.key, lang) : ''
  if (lang === 'en') {
    return `What most players max on ${role || 'this role'}${skillsClause ? ` (${skillsClause})` : ''} — useful to compare, not to copy blindly. Typical focus: ${phrase}.`
  }
  return `Come la community maxa di solito ${role || 'questo ruolo'}${skillsClause ? ` (${skillsClause})` : ''}: utile per confrontare, non da copiare alla cieca. Focus tipico: ${phrase}.`
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

function buildMetaReasonSections({ lang, sliders, pointsUsed, card, enrichedCatalog, engineReasons }) {
  const sections = []
  const role = card?.position || enrichedCatalog?.position || null
  const playingStyle = enrichedCatalog?.playing_style || card?.style || null
  const skillsClause = formatSkillsClause(card, enrichedCatalog, lang, 6)
  const { equipped } = getAdvisorEquippedSkills(card, enrichedCatalog)
  const comStyles = collectAdvisorComStyles(enrichedCatalog)
  const topSliders = getTopSliders(sliders, 4)
  const topKeys = topSliders.map(entry => entry.key)
  const contextItems = []

  if (skillsClause && playingStyle && playingStyle !== 'Profilo da analizzare') {
    contextItems.push(
      lang === 'en'
        ? `${playingStyle} with ${skillsClause} — that’s what the average online max chases for this card.`
        : `${playingStyle} con ${skillsClause}: è il profilo che la community maxa più spesso su questa carta.`
    )
  } else if (skillsClause) {
    contextItems.push(
      lang === 'en'
        ? `Card identity: ${skillsClause}.`
        : `Identità carta: ${skillsClause}.`
    )
  } else if (role) {
    contextItems.push(
      lang === 'en'
        ? `Typical ${role} max from public builds — no your formation or coach.`
        : `Max tipico da ${role} nelle build pubbliche — senza il tuo modulo o coach.`
    )
  }
  if (contextItems.length) {
    sections.push({
      id: 'context',
      title: getReasonSectionTitle('context', lang),
      items: contextItems.slice(0, 2)
    })
  }

  const skillLines = buildSkillDriverLines(equipped, comStyles, topKeys, lang)
  if (skillLines.length) {
    sections.push({
      id: 'skills',
      title: getReasonSectionTitle('skills', lang),
      items: skillLines
    })
  }

  const allocItems = []
  const top = topSliders[0]
  if (top) {
    allocItems.push(
      lang === 'en'
        ? `Priority: ${getBuildSliderLabel(top.key, lang)} (${top.val} PT) — ${macroGameplayPhrase(top.key, lang)}.`
        : `Priorità: ${getBuildSliderLabel(top.key, lang)} (${top.val} PT) — ${macroGameplayPhrase(top.key, lang)}.`
    )
  }
  for (const reason of engineReasons.slice(0, 1)) {
    if (reason) allocItems.push(reason)
  }
  if (allocItems.length) {
    sections.push({
      id: 'allocation',
      title: getReasonSectionTitle('allocation', lang),
      items: allocItems.slice(0, 2)
    })
  }

  return {
    sections,
    whyLead: buildMetaWhyLead({ lang, pointsUsed, topSliders, skillsClause, role })
  }
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
        ? `Your card: ${skillsClause}${playingStyle && playingStyle !== 'Profilo da analizzare' ? ` · ${playingStyle}` : ''}. We boost what you already do well.`
        : `La tua carta: ${skillsClause}${playingStyle && playingStyle !== 'Profilo da analizzare' ? ` · ${playingStyle}` : ''}. Potenziamo ciò che fai già bene.`
    )
  }

  if (tacticalBits.length) {
    contextItems.push(
      lang === 'en'
        ? `Your setup (${tacticalBits.join(' · ')}): points follow transitions, width and service — not a YouTube max.`
        : `La tua rosa (${tacticalBits.join(' · ')}): i punti seguono ripartenze, ampiezza e servizio — non un max copiato da YouTube.`
    )
  } else if (role) {
    contextItems.push(
      lang === 'en'
        ? `Role ${role}: built for your XI, not a generic template.`
        : `Ruolo ${role}: build sulla tua formazione, non un template generico.`
    )
  }

  if (contextItems.length) {
    sections.push({
      id: 'context',
      title: getReasonSectionTitle('context', lang),
      items: contextItems.slice(0, 2)
    })
  }

  const skillLines = buildSkillDriverLines(equipped, comStyles, topKeys, lang)
  if (skillLines.length) {
    sections.push({
      id: 'skills',
      title: getReasonSectionTitle('skills', lang),
      items: skillLines
    })
  }

  const allocItems = []
  if (topSliders.length >= 2) {
    const [a, b] = topSliders
    allocItems.push(
      lang === 'en'
        ? `${pointsUsed} PT: main stack ${getBuildSliderLabel(a.key, lang)} (${a.val}) + ${getBuildSliderLabel(b.key, lang)} (${b.val}) — ${macroGameplayPhrase(a.key, lang)}, ${macroGameplayPhrase(b.key, lang)}.`
        : `${pointsUsed} PT: cuore su ${getBuildSliderLabel(a.key, lang)} (${a.val}) e ${getBuildSliderLabel(b.key, lang)} (${b.val}) — ${macroGameplayPhrase(a.key, lang)}, ${macroGameplayPhrase(b.key, lang)}.`
    )
  } else if (topSliders.length === 1) {
    const t = topSliders[0]
    allocItems.push(
      lang === 'en'
        ? `${pointsUsed} PT focused on ${getBuildSliderLabel(t.key, lang)} (${t.val}) — ${macroGameplayPhrase(t.key, lang)}.`
        : `${pointsUsed} PT sul ${getBuildSliderLabel(t.key, lang)} (${t.val}) — ${macroGameplayPhrase(t.key, lang)}.`
    )
  }
  for (const reason of engineReasons.slice(0, 1)) {
    if (reason) allocItems.push(reason)
  }
  if (allocItems.length) {
    sections.push({
      id: 'allocation',
      title: getReasonSectionTitle('allocation', lang),
      items: allocItems.slice(0, 2)
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
      pointsUsed,
      topSliders,
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

  const engineReasons = pickBilingualList(build.reasons, lang)
    .map(reason => simplifyEngineReason(reason, lang))
    .filter(Boolean)

  const whyBundle =
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
          targetPosition: build.targetPosition,
          playOverall,
          cardOverall: Number.isFinite(Number(cardOverall)) ? Number(cardOverall) : null
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
