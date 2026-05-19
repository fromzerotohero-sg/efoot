/**
 * Skill suggestions for Card Advisor catalog cards (virtual player).
 */

import { getNonProgressionReason } from './buildCoachServerUtils.js'
import { getMergedPlayerSkills, getTypicalMissingSkillsForPlayer } from './rosterSkillsContext.js'
import {
  canonicalSkillStorageName,
  getSkillDisplayLabel,
  isKnownPlayerSkill,
  normalizeSkillKey
} from './playerSkillLabels.js'

const MAX_SKILL_SLOTS = 6

const AI_TRAIT_RE =
  /\b(phenomenal|edged crossing|mazing run|incisive run|trickster|speeding bullet|acceleration burst)\b/i

const STYLE_SKILL_HINTS = [
  { match: /opportunista|goal poacher|fox in the box|rapace/i, skills: ['Tiro di prima', "Istinto d'attacco", 'A giro da distante'] },
  { match: /regista|orchestrator|creative playmaker|classico numero 10/i, skills: ['Passaggio filtrante', 'Passaggio dosato', 'Passaggio di prima'] },
  { match: /giocatore chiave|hole player/i, skills: ['Passaggio filtrante', 'Tiro di prima', 'Spirito combattivo'] },
  { match: /box.to.box|box to box/i, skills: ['Tornante', 'Passaggio di prima', 'Contrasto aggressivo'] },
  { match: /collante|anchor man|distruttore|destroyer/i, skills: ['Intercettazione', 'Contrasto aggressivo', 'Spirito combattivo'] },
  { match: /terzino offensivo|offensive wingback|full.back finisher/i, skills: ['Cross preciso', 'Rientro difensivo', 'Passaggio di prima'] },
  { match: /ala|winger|roaming flank|taglio al centro/i, skills: ['Cross preciso', 'Doppio tocco', 'Passaggio di prima'] },
  { match: /fulcro|deep.lying forward/i, skills: ['Passaggio di prima', 'Colpo di testa', 'Tiro di prima'] },
  { match: /portiere offensivo|offensive goalkeeper/i, skills: ['Parata con piedi', 'Riflessi felini', 'Presa sicura'] }
]

function normalizeSkillToken(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function collectAiPlaystyleTokens(catalogCard) {
  const raw = [
    ...(Array.isArray(catalogCard?.ai_playstyles) ? catalogCard.ai_playstyles : []),
    ...(Array.isArray(catalogCard?.players_payload?.ai_playstyles) ? catalogCard.players_payload.ai_playstyles : [])
  ]
  return raw.map(s => normalizeSkillToken(s)).filter(Boolean)
}

function isAdvisorAiNoise(label, aiTokens) {
  const text = String(label || '').trim()
  if (!text) return true
  if (AI_TRAIT_RE.test(text)) return true
  const token = normalizeSkillToken(text)
  return aiTokens.some(ai => ai && (token.includes(ai) || ai.includes(token)))
}

/**
 * Abilità "equipaggiate" per Card Advisor: solo skill riconosciute, max 6, senza tratti AI.
 * @returns {{ equipped: string[], rawCount: number, catalogOverflow: boolean, slotsFree: number }}
 */
export function getAdvisorEquippedSkills(card, catalogCard = null) {
  const aiTokens = collectAiPlaystyleTokens(catalogCard)
  const rawOrdered = []

  const pushRaw = arr => {
    for (const skill of Array.isArray(arr) ? arr : []) {
      const label = String(skill || '').trim()
      if (label) rawOrdered.push(label)
    }
  }

  pushRaw(card?.skills)
  pushRaw(catalogCard?.player_skills)
  pushRaw(catalogCard?.players_payload?.player_skills)

  const rawCount = rawOrdered.length
  const seen = new Set()
  const equipped = []

  for (const label of rawOrdered) {
    if (isAdvisorAiNoise(label, aiTokens)) continue
    if (!isKnownPlayerSkill(label)) continue
    const canon = canonicalSkillStorageName(label)
    const key = normalizeSkillKey(canon)
    if (!key || seen.has(key)) continue
    seen.add(key)
    equipped.push(canon)
  }

  const catalogOverflow = rawCount > MAX_SKILL_SLOTS || equipped.length > MAX_SKILL_SLOTS
  const displayEquipped = equipped.slice(0, MAX_SKILL_SLOTS)

  let slotsFree
  if (catalogOverflow) {
    const usedForEstimate = Math.min(displayEquipped.length, MAX_SKILL_SLOTS - 1)
    slotsFree = Math.max(1, MAX_SKILL_SLOTS - usedForEstimate)
  } else {
    slotsFree = Math.max(0, MAX_SKILL_SLOTS - displayEquipped.length)
  }

  return {
    equipped: displayEquipped,
    rawCount,
    catalogOverflow,
    slotsFree
  }
}

function playerHasSkill(player, expectedLabel) {
  const expected = normalizeSkillToken(expectedLabel)
  return getMergedPlayerSkills(player).some(skill => {
    const have = normalizeSkillToken(skill)
    return have.includes(expected) || expected.includes(have)
  })
}

function styleSkillHints(player) {
  const style = String(player?.playing_style || player?.role || player?.metadata?.playing_style || '').trim()
  if (!style) return []
  const entry = STYLE_SKILL_HINTS.find(item => item.match.test(style))
  return entry?.skills || []
}

function mapEquippedNative(equipped, lang) {
  return equipped.map(skill => ({
    skill,
    display: getSkillDisplayLabel(skill, lang)
  }))
}

/**
 * @param {object} player Virtual advisor player
 * @param {{ lang?: 'it'|'en', max?: number, catalogCard?: object|null, card?: object|null }} options
 */
export function suggestSkillsForAdvisorCard(player, { lang = 'it', max = 4, catalogCard = null, card = null } = {}) {
  const nonProg = getNonProgressionReason(player, catalogCard)
  if (nonProg.blocked) {
    const reason =
      nonProg.reason === 'non_progression_card_type'
        ? lang === 'en'
          ? 'This card type does not use progression points.'
          : 'Questa tipologia di carta non usa punti progressione.'
        : lang === 'en'
          ? 'Build points are not available for this card.'
          : 'Punti build non disponibili per questa carta.'
    return { available: false, reason, code: nonProg.reason, items: [], slotsFree: 0 }
  }

  const { equipped, slotsFree, catalogOverflow } = getAdvisorEquippedSkills(card, catalogCard)
  const skillPlayer = { ...player, skills: equipped }
  const equippedNative = mapEquippedNative(equipped, lang)

  const seen = new Set()
  const items = []

  const pushItem = (skill, reason) => {
    const label = String(skill || '').trim()
    if (!label || playerHasSkill(skillPlayer, label)) return
    const key = normalizeSkillToken(label)
    if (seen.has(key)) return
    seen.add(key)
    items.push({
      skill: label,
      display: getSkillDisplayLabel(label, lang),
      reason
    })
  }

  getTypicalMissingSkillsForPlayer(skillPlayer, { max: 3 }).forEach(skill => {
    pushItem(skill, lang === 'en' ? 'Core for this role' : 'Core per questo ruolo')
  })

  styleSkillHints(skillPlayer).forEach(skill => {
    pushItem(skill, lang === 'en' ? 'Synergy with playing style' : 'Sinergia con lo stile di gioco')
  })

  const roleKey = String(skillPlayer?.position || '').trim().toUpperCase()
  if (['P', 'CF', 'SP', 'ST'].includes(roleKey)) {
    pushItem('Tiro di prima', lang === 'en' ? 'Finishing profile' : 'Profilo finalizzatore')
  }

  const sliced = items.slice(0, max)

  if (slotsFree === 0 && !catalogOverflow && sliced.length === 0) {
    return {
      available: true,
      slotsFree: 0,
      equippedNative,
      catalogOverflow: false,
      items: [],
      message:
        lang === 'en'
          ? 'All six skill slots appear used on this card profile.'
          : 'I 6 slot abilità risultano occupati su questo profilo carta.'
    }
  }

  if (catalogOverflow && sliced.length > 0) {
    return {
      available: true,
      slotsFree,
      equippedNative,
      catalogOverflow: true,
      items: sliced,
      message:
        lang === 'en'
          ? 'The catalog lists more than six entries (skills + AI traits). Suggestions assume you may still have free slots in-game.'
          : 'Il catalogo elenca più di 6 voci (abilità + tratti AI): i consigli valgono se hai ancora slot liberi in gioco.'
    }
  }

  return {
    available: true,
    slotsFree,
    equippedNative,
    catalogOverflow: Boolean(catalogOverflow),
    items: sliced
  }
}
