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
  { match: /regista|orchestrator|creative playmaker|classico numero 10/i, skills: ['Passaggio filtrante', 'Passaggio calibrato', 'Passaggio di prima'] },
  { match: /giocatore chiave|hole player/i, skills: ['Passaggio filtrante', 'Tiro di prima', 'Spirito combattivo'] },
  { match: /box.to.box|box to box/i, skills: ['Tornante', 'Passaggio di prima', 'Contrasto aggressivo'] },
  { match: /collante|anchor man|distruttore|destroyer/i, skills: ['Intercettazione', 'Contrasto aggressivo', 'Spirito combattivo'] },
  { match: /terzino offensivo|offensive wingback|full.back finisher/i, skills: ['Cross calibrato', 'Rientro difensivo', 'Passaggio di prima'] },
  { match: /ala|winger|roaming flank|taglio al centro/i, skills: ['Cross calibrato', 'Doppio tocco', 'Passaggio di prima'] },
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

function buildEquippedKeySet(equipped) {
  const keys = new Set()
  for (const skill of equipped) {
    const key = normalizeSkillKey(canonicalSkillStorageName(skill))
    if (key) keys.add(key)
  }
  return keys
}

function advisorPlayerHasSkill(equippedKeys, label) {
  const key = normalizeSkillKey(canonicalSkillStorageName(label))
  return Boolean(key && equippedKeys.has(key))
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

function skillSuggestionReason(kind, lang) {
  if (lang === 'en') {
    if (kind === 'style') return 'Pairs well with how this card plays'
    if (kind === 'finish') return 'Useful if you want more threat in front of goal'
    return 'Often chosen for this role in your squad'
  }
  if (kind === 'style') return 'Si abbina a come gioca questa carta'
  if (kind === 'finish') return 'Utile se vuoi più minaccia sotto porta'
  return 'Spesso scelta per questo ruolo in rosa'
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
          ? 'This card type cannot add skills with progression points.'
          : 'Questa carta non permette di aggiungere abilità con i punti progressione.'
        : lang === 'en'
          ? 'We cannot suggest skill upgrades for this card profile.'
          : 'Non possiamo suggerire abilità aggiuntive per questo profilo carta.'
    return { available: false, reason, code: nonProg.reason, items: [], slotsFree: 0 }
  }

  const { equipped, slotsFree, catalogOverflow } = getAdvisorEquippedSkills(card, catalogCard)
  const equippedKeys = buildEquippedKeySet(equipped)
  const skillPlayer = { ...player, skills: equipped }
  const equippedNative = mapEquippedNative(equipped, lang)

  const seen = new Set()
  const items = []

  const pushItem = (skill, reasonKind) => {
    const label = String(skill || '').trim()
    if (!label || advisorPlayerHasSkill(equippedKeys, label)) return
    const key = normalizeSkillKey(canonicalSkillStorageName(label))
    if (!key || seen.has(key)) return
    seen.add(key)
    items.push({
      skill: label,
      display: getSkillDisplayLabel(label, lang),
      reason: skillSuggestionReason(reasonKind, lang)
    })
  }

  getTypicalMissingSkillsForPlayer(skillPlayer, { max: 6 }).forEach(skill => {
    pushItem(skill, 'role')
  })

  styleSkillHints(skillPlayer).forEach(skill => {
    pushItem(skill, 'style')
  })

  const roleKey = String(skillPlayer?.position || '').trim().toUpperCase()
  if (['P', 'CF', 'SP', 'ST'].includes(roleKey)) {
    pushItem('Tiro di prima', 'finish')
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
          ? 'All six skill slots look full on this card.'
          : 'Sembra che i 6 slot abilità siano già tutti occupati su questa carta.'
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
          ? 'If you still have a free slot in-game, these are worth considering next.'
          : 'Se in gioco hai ancora uno slot libero, queste sono le prossime da valutare.'
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
