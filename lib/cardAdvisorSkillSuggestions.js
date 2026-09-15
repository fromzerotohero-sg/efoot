/**
 * Skill suggestions for Card Advisor catalog cards (virtual player).
 */

import { getTypicalMissingSkillsForPlayer } from './rosterSkillsContext.js'
import { MAX_ADDITIONAL_SKILLS } from './efootballTruthLayer.js'
import {
  canonicalSkillStorageName,
  getSkillDisplayLabel,
  isKnownPlayerSkill,
  normalizeSkillKey
} from './playerSkillLabels.js'

const STYLE_SKILL_HINTS = [
  { match: /opportunista|goal poacher|fox in the box|rapace/i, skills: ['Tiro di prima', 'Finalizzazione acrobatica', 'A giro da distante'] },
  { match: /regista|orchestrator|creative playmaker|classico numero 10/i, skills: ['Passaggio filtrante', 'Passaggio calibrato', 'Passaggio di prima'] },
  { match: /giocatore chiave|hole player/i, skills: ['Passaggio filtrante', 'Tiro di prima', 'Spirito combattivo'] },
  { match: /box.to.box|box to box/i, skills: ['Tornante', 'Passaggio di prima', 'Intercettazione'] },
  { match: /collante|anchor man|distruttore|destroyer/i, skills: ['Intercettazione', 'Muro', 'Spirito combattivo'] },
  { match: /terzino offensivo|offensive wingback|full.back finisher/i, skills: ['Cross calibrato', 'Tornante', 'Passaggio di prima'] },
  { match: /ala|winger|roaming flank|taglio al centro/i, skills: ['Cross calibrato', 'Doppio tocco', 'Passaggio di prima'] },
  { match: /fulcro|deep.lying forward/i, skills: ['Passaggio di prima', 'Colpo di testa', 'Tiro di prima'] },
  { match: /portiere offensivo|offensive goalkeeper/i, skills: ['Uscita portiere', 'Para-rigori', 'Direzione alla difesa'] }
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
    ...(Array.isArray(catalogCard?.players_payload?.ai_playstyles) ? catalogCard.players_payload.ai_playstyles : []),
    ...(Array.isArray(catalogCard?.players_payload?.com_skills) ? catalogCard.players_payload.com_skills : [])
  ]
  return raw.map(s => normalizeSkillToken(s)).filter(Boolean)
}

/** Esclude solo duplicati di `ai_playstyles` catalogo (non le player_skills native Showtime). */
function isAdvisorAiNoise(label, aiTokens) {
  const text = String(label || '').trim()
  if (!text) return true
  if (!aiTokens.length) return false
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
 * Le `player_skills` del catalogo sono native della specifica carta.
 * Soltanto le skill marcate esplicitamente come aggiuntive consumano i 5 slot.
 * @returns {{
 *   equipped: string[],
 *   rawCount: number,
 *   catalogOverflow: boolean,
 *   slotsFree: number,
 *   fixedCount: number,
 *   programSlotUsed: number
 * }}
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
  pushRaw(catalogCard?.players_payload?.skills)

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

  const additionalSkills = normalizeExplicitAdditionalSkills(card, catalogCard)
  const programSlotUsed = additionalSkills.length
  const fixedCount = equipped.length
  const slotsFree = Math.max(0, MAX_ADDITIONAL_SKILLS - programSlotUsed)
  const catalogOverflow = additionalSkills.length > MAX_ADDITIONAL_SKILLS

  return {
    equipped,
    additional: additionalSkills,
    rawCount,
    catalogOverflow,
    slotsFree,
    fixedCount,
    programSlotUsed
  }
}

function normalizeExplicitAdditionalSkills(card, catalogCard) {
  const raw = [
    ...(Array.isArray(card?.additional_skills) ? card.additional_skills : []),
    ...(Array.isArray(card?.metadata?.additional_skills) ? card.metadata.additional_skills : []),
    ...(Array.isArray(catalogCard?.additional_skills) ? catalogCard.additional_skills : []),
    ...(Array.isArray(catalogCard?.players_payload?.additional_skills)
      ? catalogCard.players_payload.additional_skills
      : [])
  ]
  const seen = new Set()
  return raw
    .map((skill) => canonicalSkillStorageName(skill))
    .filter((skill) => {
      const key = normalizeSkillKey(skill)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
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
    display: getSkillDisplayLabel(skill, lang),
    fixed: true
  }))
}

function skillSuggestionReason(kind, lang) {
  if (lang === 'en') {
    if (kind === 'style') return 'Fits this card’s playing style'
    if (kind === 'finish') return 'More threat in front of goal'
    return 'Useful for your role in the squad'
  }
  if (kind === 'style') return 'Si abbina allo stile di gioco della carta'
  if (kind === 'finish') return 'Più minaccia sotto porta'
  return 'Utile per il ruolo che giochi in rosa'
}

/**
 * @param {object} player Virtual advisor player
 * @param {{ lang?: 'it'|'en', max?: number, catalogCard?: object|null, card?: object|null }} options
 */
export function suggestSkillsForAdvisorCard(player, { lang = 'it', max = 4, catalogCard = null, card = null } = {}) {
  const { equipped, additional, slotsFree, catalogOverflow, fixedCount, programSlotUsed } = getAdvisorEquippedSkills(
    card,
    catalogCard
  )
  const equippedKeys = buildEquippedKeySet([...equipped, ...additional])
  const skillPlayer = { ...player, skills: [...equipped, ...additional] }
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

  const sliced = items.slice(0, Math.min(max, slotsFree))

  if (slotsFree === 0 && sliced.length === 0) {
    return {
      available: true,
      slotsFree: 0,
      equippedNative,
      catalogOverflow,
      fixedCount,
      programSlotUsed,
      items: [],
      message:
        lang === 'en'
          ? 'All five additional-skill slots are already occupied.'
          : 'Tutti e cinque gli slot per le abilità aggiuntive sono già occupati.'
    }
  }

  return {
    available: true,
    slotsFree,
    equippedNative,
    catalogOverflow: Boolean(catalogOverflow),
    fixedCount,
    programSlotUsed,
    items: sliced
  }
}
