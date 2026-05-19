/**
 * Skill suggestions for Card Advisor catalog cards (virtual player).
 */

import { getNonProgressionReason } from './buildCoachServerUtils.js'
import { getMergedPlayerSkills, getTypicalMissingSkillsForPlayer } from './rosterSkillsContext.js'
import { getSkillDisplayLabel } from './playerSkillLabels.js'

const MAX_SKILL_SLOTS = 6

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

/**
 * @param {object} player Virtual advisor player
 * @param {{ lang?: 'it'|'en', max?: number }} options
 */
export function suggestSkillsForAdvisorCard(player, { lang = 'it', max = 4, catalogCard = null } = {}) {
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

  const merged = getMergedPlayerSkills(player)
  const slotsFree = Math.max(0, MAX_SKILL_SLOTS - merged.length)
  if (slotsFree === 0) {
    return {
      available: true,
      slotsFree: 0,
      items: [],
      message:
        lang === 'en'
          ? 'Skill slots are full on this profile.'
          : 'Gli slot abilità risultano pieni su questo profilo.'
    }
  }

  const seen = new Set()
  const items = []

  const pushItem = (skill, reason) => {
    const label = String(skill || '').trim()
    if (!label || playerHasSkill(player, label)) return
    const key = normalizeSkillToken(label)
    if (seen.has(key)) return
    seen.add(key)
    items.push({
      skill: label,
      display: getSkillDisplayLabel(label, lang),
      reason
    })
  }

  getTypicalMissingSkillsForPlayer(player, { max: 3 }).forEach(skill => {
    pushItem(
      skill,
      lang === 'en' ? 'Core for this role' : 'Core per questo ruolo'
    )
  })

  styleSkillHints(player).forEach(skill => {
    pushItem(
      skill,
      lang === 'en' ? 'Synergy with playing style' : 'Sinergia con lo stile di gioco'
    )
  })

  const roleKey = String(player?.position || '').trim().toUpperCase()
  if (['P', 'CF', 'SP', 'ST'].includes(roleKey)) {
    pushItem('Tiro di prima', lang === 'en' ? 'Finishing profile' : 'Profilo finalizzatore')
  }

  return {
    available: true,
    slotsFree,
    items: items.slice(0, max)
  }
}
