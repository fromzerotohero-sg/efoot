/**
 * Contesto abilità rosa per diagnostic / assistant-chat:
 * card type, slot 6, incrocio con priorità ruolo (allineato a info_rag §8.9–8.10).
 */

import { getEffectiveCardType, getNonProgressionReason } from '@/lib/buildCoachServerUtils'
import { canonicalSkillStorageName, getSkillDisplayLabel, normalizeSkillKey } from '@/lib/playerSkillLabels'

const MAX_SKILLS_LISTED = 6
const MAX_SKILL_ADVISORY_PLAYERS = 14

/** Priorità tipiche per ruolo (nomi ufficiali eFootball). */
const ROLE_SKILL_PRIORITY = {
  PT: ['Riflessi felini', 'Presa sicura', 'Parata con piedi'],
  DC: ['Intercettazione', 'Marcatore', 'Dominio palle alte', 'Spirito combattivo'],
  TD: ['Intercettazione', 'Tornante', 'Cross calibrato'],
  TS: ['Intercettazione', 'Tornante', 'Cross calibrato'],
  MED: ['Intercettazione', 'Passaggio a scavalcare', 'Spirito combattivo', 'Contrasto aggressivo'],
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

function normalizeSkillToken(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getMergedPlayerSkills(player) {
  return [...(Array.isArray(player?.skills) ? player.skills : []), ...(Array.isArray(player?.com_skills) ? player.com_skills : [])]
    .map(s => String(s || '').trim())
    .filter(Boolean)
}

function playerHasSkill(player, expectedLabel) {
  const expectedKey = normalizeSkillKey(canonicalSkillStorageName(expectedLabel))
  if (!expectedKey) return false
  return getMergedPlayerSkills(player).some(skill => {
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
  return priorities.filter(label => !playerHasSkill(player, label)).slice(0, max)
}

export function formatPlayerSkillContext(player, lang = 'it', { maxListed = MAX_SKILLS_LISTED } = {}) {
  const skills = getMergedPlayerSkills(player)
  const listed = skills.slice(0, maxListed).map((s) => getSkillDisplayLabel(s, lang))
  const countLabel = (lang === 'en' || lang === 'es') ? 'skills' : 'abilità'
  const skillsPart = listed.length > 0 ? listed.join(', ') : ((lang === 'en' || lang === 'es') ? 'none listed' : 'nessuna elencata')
  const slotPart = `${listed.length}/${MAX_SKILLS_LISTED} ${countLabel}`

  const cardTypeRaw = getEffectiveCardType(player)
  const cardType = cardTypeRaw ? String(cardTypeRaw).trim() : ''
  const nonProg = getNonProgressionReason(player)
  const programsLabel = nonProg.blocked
    ? ((lang === 'en' || lang === 'es') ? 'Programs: no (Trending/max)' : 'Programmi: no (Trending/maxi)')
    : cardType
      ? ((lang === 'en' || lang === 'es') ? 'Programs: yes if slots free' : 'Programmi: sì se slot liberi')
      : ((lang === 'en' || lang === 'es') ? 'Programs: check card type' : 'Programmi: verifica tipo card')

  const cardPart = cardType ? `card ${cardType}` : ((lang === 'en' || lang === 'es') ? 'card type unknown' : 'tipo card non indicato')
  return `${slotPart}: ${skillsPart} | ${cardPart} | ${programsLabel}`
}

function rosterHasSkill(roster, expectedLabel) {
  return (roster || []).some(p => playerHasSkill(p, expectedLabel))
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
  if (highNormalShot && /normal/i.test(highNormalShot.key) && !rosterHasSkill(roster, 'Tiro calibrato')) {
    hints.push(
      lang === 'en'
        ? `Mostly normal shots: consider Calibrated Shot / curl skills on finishers (Programs if not Trending).`
        : `Prevalenza tiro normale: valuta Tiro calibrato / abilità a giro sui finalizzatori (Programmi se non Trending).`
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
    .filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
    .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
  const riserve = list.filter(p => p.slot_index == null)
  const ordered = [...titolari, ...riserve].slice(0, MAX_SKILL_ADVISORY_PLAYERS)

  const lines = ordered.map(p => {
    const name = String(p.player_name || '?').slice(0, 50)
    const pos = String(p.position || '?').slice(0, 12)
    const ctx = formatPlayerSkillContext(p, lang)
    const missing = getTypicalMissingSkillsForPlayer(p, { max: 3 })
    const nonProg = getNonProgressionReason(p)
    const skills = getMergedPlayerSkills(p)

    let tail = ''
    if (nonProg.blocked) {
      tail = (lang === 'en' || lang === 'es') ? 'No skill Programs on this card.' : 'Programmi abilità non disponibili su questa card.'
    } else if (skills.length >= MAX_SKILLS_LISTED) {
      tail = (lang === 'en' || lang === 'es') ? 'Skill slots full (6/6).' : 'Slot abilità pieni (6/6).'
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
      ? 'Skill Programs advisory (use with RAG §8; cite only players listed here; do not invent skills):'
      : 'Consigli Programmi abilità (usa con RAG §8; cita solo giocatori qui elencati; non inventare abilità):'

  const parts = [header, ...lines]
  if (analysisHint) {
    parts.push((lang === 'en' || lang === 'es') ? `Game-analysis cross-check: ${analysisHint}` : `Incrocio Analisi eFootball: ${analysisHint}`)
  }
  return parts.join('\n')
}
