/**
 * Contesto abilità rosa per diagnostic / assistant-chat:
 * native vs additional vs COM/AI, max 5 Additional Skills (Konami Dream Team).
 */

import { MAX_ADDITIONAL_SKILLS, isComAiPlaystyle } from './efootballTruthLayer.js'
import { getEffectiveCardType } from './buildCoachServerUtils.js'
import {
  canonicalSkillStorageName,
  getSkillDisplayLabel,
  isKnownPlayerSkill,
  normalizeSkillKey
} from './playerSkillLabels.js'

const MAX_SKILLS_LISTED = 8
const MAX_SKILL_ADVISORY_PLAYERS = 14

/** Priorità tipiche per ruolo (nomi ufficiali eFootball presenti nel dizionario). */
const ROLE_SKILL_PRIORITY = {
  PT: ['Uscita portiere', 'Para-rigori', 'Direzione alla difesa'],
  DC: ['Intercettazione', 'Marcatore', 'Dominio palle alte', 'Spirito combattivo'],
  TD: ['Intercettazione', 'Tornante', 'Cross calibrato'],
  TS: ['Intercettazione', 'Tornante', 'Cross calibrato'],
  MED: ['Intercettazione', 'Passaggio a scavalcare', 'Spirito combattivo', 'Muro'],
  CC: ['Passaggio di prima', 'Passaggio filtrante', 'Tornante'],
  TRQ: ['Passaggio di prima', 'Passaggio filtrante', 'Passaggio calibrato', 'Spirito combattivo'],
  CLS: ['Passaggio di prima', 'Passaggio filtrante', 'Tiro di prima'],
  CLD: ['Passaggio di prima', 'Passaggio filtrante', 'Tiro di prima'],
  P: ['Passaggio di prima', 'Tiro di prima', 'Colpo di testa'],
  SP: ['Passaggio di prima', 'Passaggio filtrante', 'Tiro di prima'],
  CF: ['Passaggio di prima', 'Tiro di prima', 'Colpo di testa', 'A giro da distante'],
  ALA: ['Cross calibrato', 'Doppio tocco', 'Tornante'],
  EDA: ['Cross calibrato', 'Doppio tocco', 'Passaggio di prima'],
  ESA: ['Cross calibrato', 'Doppio tocco', 'Passaggio di prima']
}

function uniqueCanonSkills(list = []) {
  const out = []
  const seen = new Set()
  for (const raw of Array.isArray(list) ? list : []) {
    const canon = canonicalSkillStorageName(String(raw || '').trim())
    if (!canon) continue
    const key = normalizeSkillKey(canon)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(canon)
  }
  return out
}

function isPlayerSkillToken(raw) {
  if (isComAiPlaystyle(raw)) return false
  return isKnownPlayerSkill(raw)
}

export function getPlayerComAiPlaystyles(player) {
  return uniqueCanonSkills([
    ...(Array.isArray(player?.com_skills) ? player.com_skills : []),
    ...(Array.isArray(player?.ai_playstyles) ? player.ai_playstyles : [])
  ]).filter((item) => isComAiPlaystyle(item))
}

function readMetaArray(player, key) {
  const meta = player?.metadata && typeof player.metadata === 'object' ? player.metadata : null
  const extracted = player?.extracted_data && typeof player.extracted_data === 'object' ? player.extracted_data : null
  if (Array.isArray(player?.[key])) return player[key]
  if (Array.isArray(meta?.[key])) return meta[key]
  if (Array.isArray(extracted?.[key])) return extracted[key]
  return null
}

export function getNativePlayerSkills(player) {
  const rawNative = readMetaArray(player, 'native_skills')
  if (Array.isArray(rawNative)) return uniqueCanonSkills(rawNative).filter(isPlayerSkillToken)
  return []
}

export function getAdditionalOrUnclassifiedPlayerSkills(player) {
  const rawAdditional = readMetaArray(player, 'additional_skills')
  if (Array.isArray(rawAdditional)) return uniqueCanonSkills(rawAdditional).filter(isPlayerSkillToken)
  // Without provenance, never guess that a card skill consumes an additional slot.
  if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production' && Array.isArray(player?.skills) && player.skills.length) {
    console.warn('[rosterSkillsContext] additional_skills missing; slot usage remains unknown')
  }
  return []
}

/** Player skills only: never merge COM/AI into the set used for slot counts or build advice. */
export function getMergedPlayerSkills(player) {
  return uniqueCanonSkills([
    ...(Array.isArray(player?.skills) ? player.skills : []),
    ...(readMetaArray(player, 'native_skills') || []),
    ...(readMetaArray(player, 'additional_skills') || [])
  ]).filter(isPlayerSkillToken)
}

function playerHasSkill(player, expectedLabel) {
  const expectedKey = normalizeSkillKey(canonicalSkillStorageName(expectedLabel))
  if (!expectedKey) return false
  return getMergedPlayerSkills(player).some((skill) => {
    const haveKey = normalizeSkillKey(canonicalSkillStorageName(skill))
    return haveKey === expectedKey
  })
}

function resolveRoleKey(position) {
  const pos = String(position || '').toUpperCase().trim()
  if (ROLE_SKILL_PRIORITY[pos]) return pos
  if (['TD', 'TS'].includes(pos)) return pos
  if (['MED', 'DM', 'CDM'].includes(pos)) return 'MED'
  if (['CC', 'CM'].includes(pos)) return 'CC'
  if (['TRQ', 'AMF', 'AM'].includes(pos)) return 'TRQ'
  if (['P', 'CF', 'ST'].includes(pos)) return pos === 'ST' ? 'CF' : pos
  return pos || 'CC'
}

export function getTypicalMissingSkillsForPlayer(player, { max = 3 } = {}) {
  const roleKey = resolveRoleKey(player?.position)
  const priorities = ROLE_SKILL_PRIORITY[roleKey] || ROLE_SKILL_PRIORITY.CC
  return priorities.filter((label) => isKnownPlayerSkill(label) && !playerHasSkill(player, label)).slice(0, max)
}

export function formatPlayerSkillContext(player, lang = 'it', { maxListed = MAX_SKILLS_LISTED } = {}) {
  const skills = getMergedPlayerSkills(player)
  const additional = getAdditionalOrUnclassifiedPlayerSkills(player)
  const comStyles = getPlayerComAiPlaystyles(player)
  const listed = skills.slice(0, maxListed).map((s) => getSkillDisplayLabel(s, lang))
  const skillsPart = listed.length > 0 ? listed.join(', ') : ((lang === 'en' || lang === 'es') ? 'none listed' : 'nessuna elencata')
  const additionalKnown = Array.isArray(readMetaArray(player, 'additional_skills'))
  const slotPart = additionalKnown
    ? `${additional.length}/${MAX_ADDITIONAL_SKILLS} additional`
    : (lang === 'en' || lang === 'es'
      ? `${skills.length} player skills listed (additional origin unclassified, max ${MAX_ADDITIONAL_SKILLS})`
      : `${skills.length} abilità elencate (origine additional non classificata, max ${MAX_ADDITIONAL_SKILLS})`)
  const comPart = comStyles.length
    ? (lang === 'en' || lang === 'es'
      ? `COM/AI: ${comStyles.slice(0, 4).map((s) => getSkillDisplayLabel(s, lang)).join(', ')}`
      : `COM/IA: ${comStyles.slice(0, 4).map((s) => getSkillDisplayLabel(s, lang)).join(', ')}`)
    : ''

  const cardTypeRaw = getEffectiveCardType(player)
  const cardType = cardTypeRaw ? String(cardTypeRaw).trim() : ''
  const programsLabel = additionalKnown
    ? ((lang === 'en' || lang === 'es')
      ? `Additional slots: ${additional.length}/${MAX_ADDITIONAL_SKILLS}`
      : `Slot aggiuntivi: ${additional.length}/${MAX_ADDITIONAL_SKILLS}`)
    : ((lang === 'en' || lang === 'es')
      ? 'Additional slots: unknown provenance'
      : 'Slot aggiuntivi: provenienza non disponibile')

  const cardPart = cardType ? `card ${cardType}` : ((lang === 'en' || lang === 'es') ? 'card type unknown' : 'tipo card non indicato')
  return [slotPart, skillsPart, cardPart, programsLabel, comPart].filter(Boolean).join(' | ')
}

function rosterHasSkill(roster, expectedLabel) {
  return (roster || []).some((p) => playerHasSkill(p, expectedLabel))
}

/**
 * Hint da Analisi eFootball (stats salvate) incrociato con rosa — allineato a RAG §7.9.
 */
export function buildGameAnalysisSkillHints(gameAnalysisRow, roster, lang = 'it') {
  const stats = gameAnalysisRow?.stats
  if (!stats || typeof stats !== 'object') return ''

  const hints = []
  const passing = stats.passing && typeof stats.passing === 'object' ? stats.passing : {}
  const shot = stats.shot_usage && typeof stats.shot_usage === 'object' ? stats.shot_usage : stats.shot && typeof stats.shot === 'object' ? stats.shot : {}

  const pickHighPctKey = (obj, threshold = 30) => {
    let best = null
    for (const [k, v] of Object.entries(obj)) {
      const num = typeof v === 'number' ? v : parseFloat(String(v).replace('%', '').trim())
      if (Number.isNaN(num) || num < threshold) continue
      if (!best || num > best.pct) best = { key: k, pct: num }
    }
    return best
  }

  const highThrough = pickHighPctKey(passing, 28)
  if (highThrough && /filtrant|through/i.test(highThrough.key) && !rosterHasSkill(roster, 'Passaggio filtrante')) {
    hints.push(
      lang === 'en'
        ? `High through-ball usage (${highThrough.key} ~${Math.round(highThrough.pct)}%): roster lacks Through Ball skill on key roles — add via Programs (non-Trending) or field players who have it.`
        : `Uso elevato passaggio filtrante (${highThrough.key} ~${Math.round(highThrough.pct)}%): in rosa manca Passaggio filtrante sui ruoli chiave — aggiungi con Programmi (non Trending) o schiera chi ce l'ha.`
    )
  }

  const highNormalShot = pickHighPctKey(shot, 70)
  if (highNormalShot && /normal/i.test(highNormalShot.key) && !rosterHasSkill(roster, 'A giro da distante')) {
    hints.push(
      lang === 'en'
        ? `Mostly normal shots: consider curl / first-time shot skills on finishers (Programs if not Trending).`
        : `Prevalenza tiro normale: valuta A giro da distante / Tiro di prima sui finalizzatori (Programmi se non Trending).`
    )
  }

  return hints.slice(0, 2).join(' ')
}

/**
 * Sezione diagnostic/chat: per giocatore, abilità presenti, Programmi, tipiche mancanti per ruolo.
 */
export function buildRosterSkillAdvisorySection(roster, gameAnalysisRow, lang = 'it') {
  const list = Array.isArray(roster) ? roster : []
  if (list.length === 0) return ''

  const titolari = list
    .filter((p) => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
    .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
  const riserve = list.filter((p) => p.slot_index == null)
  const ordered = [...titolari, ...riserve].slice(0, MAX_SKILL_ADVISORY_PLAYERS)

  const lines = ordered.map((p) => {
    const name = String(p.player_name || '?').slice(0, 50)
    const pos = String(p.position || '?').slice(0, 12)
    const ctx = formatPlayerSkillContext(p, lang)
    const missing = getTypicalMissingSkillsForPlayer(p, { max: 3 })
    const additional = getAdditionalOrUnclassifiedPlayerSkills(p)
    const additionalKnown = Array.isArray(readMetaArray(p, 'additional_skills'))

    let tail = ''
    if (additionalKnown && additional.length >= MAX_ADDITIONAL_SKILLS) {
      tail = (lang === 'en' || lang === 'es')
        ? `Additional skill slots full (${MAX_ADDITIONAL_SKILLS}/${MAX_ADDITIONAL_SKILLS}).`
        : `Slot Additional Skills pieni (${MAX_ADDITIONAL_SKILLS}/${MAX_ADDITIONAL_SKILLS}).`
    } else if (!additionalKnown) {
      tail = (lang === 'en' || lang === 'es')
        ? 'Do not estimate free slots until native/additional provenance is available.'
        : 'Non stimare gli slot liberi finché manca la provenienza native/aggiuntive.'
    } else if (missing.length > 0) {
      tail =
        lang === 'en'
          ? `Typical adds for role: ${missing.join(', ')}.`
          : `Tipiche da valutare per ruolo: ${missing.join(', ')}.`
    } else {
      tail = (lang === 'en' || lang === 'es') ? 'Core role skills present in list.' : 'Abilità core ruolo già presenti in elenco.'
    }

    return `  ${name} (${pos}): ${ctx}. ${tail}`
  })

  const analysisHint = buildGameAnalysisSkillHints(gameAnalysisRow, list, lang)
  const header =
    lang === 'en'
      ? `Skill Programs advisory (max ${MAX_ADDITIONAL_SKILLS} additional; COM/AI are not skill slots; cite only players listed here):`
      : `Consigli Programmi abilità (max ${MAX_ADDITIONAL_SKILLS} additional; COM/IA non occupano gli slot; cita solo giocatori qui elencati):`

  const parts = [header, ...lines]
  if (analysisHint) {
    parts.push((lang === 'en' || lang === 'es') ? `Game-analysis cross-check: ${analysisHint}` : `Incrocio Analisi eFootball: ${analysisHint}`)
  }
  return parts.join('\n')
}
