/**
 * Fatti vincolanti per Card Advisor Pro: ruoli in campo, anchor confronto, gap modulo.
 * Condiviso tra skill_delta e prompt deep-analysis.
 */

import { getMergedPlayerSkills } from '@/lib/rosterSkillsContext'
import { canonicalSkillStorageName, getSkillDisplayLabel, normalizeSkillKey } from '@/lib/playerSkillLabels'

const FLANK_LEFT = new Set(['CLS', 'ESA', 'TS'])
const FLANK_RIGHT = new Set(['CLD', 'EDA', 'TD'])
const VALID_PURCHASE_FIT = new Set([
  'fits_current_setup',
  'fits_with_rotation',
  'fits_if_formation_change',
  'skill_only_no_slot',
  'not_your_playstyle',
  'skip_duplicate',
  'insufficient_data'
])

function toAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isStarter(player) {
  const slot = Number(player?.slot_index)
  return Number.isFinite(slot) && slot >= 0 && slot <= 10
}

function fieldRole(player) {
  return String(player?.position || '').trim().toUpperCase()
}

function naturalHighPositions(player) {
  const list = Array.isArray(player?.original_positions) ? player.original_positions : []
  return list
    .map((entry) => {
      const position = typeof entry === 'string' ? entry : entry?.position
      const competence = typeof entry === 'object' ? String(entry?.competence || '').toLowerCase() : ''
      if (!position) return null
      if (competence && !competence.includes('alta') && !competence.includes('high')) return null
      return String(position).trim().toUpperCase()
    })
    .filter(Boolean)
}

function playerHasNaturalAt(player, targetPosition) {
  return naturalHighPositions(player).includes(String(targetPosition || '').trim().toUpperCase())
}

function flankZoneForCardRole(cardPosition) {
  const pos = String(cardPosition || '').trim().toUpperCase()
  if (FLANK_LEFT.has(pos)) return 'left_flank'
  if (FLANK_RIGHT.has(pos)) return 'right_flank'
  return null
}

function playerInFlankZone(player, zone) {
  const role = fieldRole(player)
  if (zone === 'left_flank') return FLANK_LEFT.has(role)
  if (zone === 'right_flank') return FLANK_RIGHT.has(role)
  return false
}

function sortStarters(candidates, cardPosition) {
  return [...candidates].sort((a, b) => {
    const slotA = Number(a?.slot_index)
    const slotB = Number(b?.slot_index)
    const fieldA = fieldRole(a) === cardPosition ? 1 : 0
    const fieldB = fieldRole(b) === cardPosition ? 1 : 0
    if (fieldA !== fieldB) return fieldB - fieldA
    if (Number.isFinite(slotA) && Number.isFinite(slotB)) return slotA - slotB
    return String(a.player_name || '').localeCompare(String(b.player_name || ''))
  })
}

/**
 * @returns {{
 *   type: 'same_field_role'|'same_flank_zone'|'natural_competence_only'|'none',
 *   player: object|null,
 *   cardRole: string,
 *   fieldRole: string|null,
 *   displayLabel: string,
 *   namingRule: string
 * }}
 */
export function pickComparisonAnchor(players = [], cardPosition = '') {
  const cardRole = String(cardPosition || '').trim().toUpperCase()
  const starters = (players || []).filter((p) => p?.player_name && isStarter(p))

  if (!cardRole || starters.length === 0) {
    return {
      type: 'none',
      player: null,
      cardRole,
      fieldRole: null,
      displayLabel: '',
      namingRule: ''
    }
  }

  const sameField = starters.filter((p) => fieldRole(p) === cardRole)
  if (sameField.length) {
    const player = sortStarters(sameField, cardRole)[0]
    const role = fieldRole(player)
    return {
      type: 'same_field_role',
      player,
      cardRole,
      fieldRole: role,
      displayLabel: `${player.player_name} (${role})`,
      namingRule: `Use only "${player.player_name} (${role})" — same role as the pack card.`
    }
  }

  const zone = flankZoneForCardRole(cardRole)
  if (zone) {
    const inZone = starters.filter((p) => playerInFlankZone(p, zone))
    if (inZone.length) {
      const player = sortStarters(inZone, cardRole)[0]
      const role = fieldRole(player)
      const zoneIt = zone === 'left_flank' ? 'fascia sinistra in campo' : 'fascia destra in campo'
      const zoneEn = zone === 'left_flank' ? 'left flank in your lineup' : 'right flank in your lineup'
      return {
        type: 'same_flank_zone',
        player,
        cardRole,
        fieldRole: role,
        displayLabel: `${player.player_name} (${role})`,
        namingRule:
          `Compare to ${player.player_name} (${role}) as ${zoneEn}. NEVER label ${player.player_name} as ${cardRole} unless field role is ${cardRole}.`
      }
    }
  }

  const naturalOnly = starters.filter((p) => playerHasNaturalAt(p, cardRole) && fieldRole(p) !== cardRole)
  if (naturalOnly.length) {
    const player = sortStarters(naturalOnly, cardRole)[0]
    const role = fieldRole(player)
    return {
      type: 'natural_competence_only',
      player,
      cardRole,
      fieldRole: role,
      displayLabel: `${player.player_name} (${role} in rosa)`,
      namingRule:
        `NEVER write "${player.player_name} ${cardRole}". Field role is ${role}; natural competence includes ${cardRole} on the card only.`
    }
  }

  return {
    type: 'none',
    player: null,
    cardRole,
    fieldRole: null,
    displayLabel: '',
    namingRule: `No starter in field role ${cardRole}. Do not invent a ${cardRole} starter from natural competences alone.`
  }
}

function summarizePassingPattern(gameAnalysis, lang) {
  const passing = gameAnalysis?.stats?.passing
  if (!passing || typeof passing !== 'object') return ''
  const entries = Object.entries(passing)
    .map(([key, value]) => ({ key: toAscii(key), value: Number(value) || 0 }))
    .filter((e) => e.value > 0)
  if (!entries.length) return ''
  const crossKeys = ['cross', 'corner']
  const crossTotal = entries.filter((e) => crossKeys.some((k) => e.key.includes(k))).reduce((s, e) => s + e.value, 0)
  const groundTotal = entries
    .filter((e) => e.key.includes('rasoterra') || e.key.includes('ground') || e.key.includes('short'))
    .reduce((s, e) => s + e.value, 0)
  const throughTotal = entries
    .filter((e) => e.key.includes('filtrant') || e.key.includes('through'))
    .reduce((s, e) => s + e.value, 0)
  if (lang === 'en') {
    if (crossTotal > 0 && crossTotal <= throughTotal) return 'Game stats: few crosses relative to through/ground passes.'
    if (throughTotal > crossTotal) return 'Game stats: through balls and ground passes dominate over crosses.'
  } else {
    if (crossTotal > 0 && crossTotal <= throughTotal) return 'Statistiche gioco: pochi cross rispetto a filtranti/rasoterra.'
    if (throughTotal > crossTotal) return 'Statistiche gioco: prevalgono filtranti e passaggi rasoterra sui cross.'
  }
  return ''
}

function buildDispositionLine(players, formation, lang) {
  const starters = (players || [])
    .filter(isStarter)
    .sort((a, b) => Number(a.slot_index) - Number(b.slot_index))
  const positions = starters.map((p) => fieldRole(p) || '?').join(', ')
  const mod = formation?.formation ? String(formation.formation).trim() : ''
  if (lang === 'en') {
    return mod
      ? `Saved formation: ${mod}. On field: ${positions || 'not set'}.`
      : `On field: ${positions || 'not set'}.`
  }
  return mod
    ? `Modulo salvato: ${mod}. In campo: ${positions || 'non impostata'}.`
    : `In campo: ${positions || 'non impostata'}.`
}

/**
 * Blocco testuale vincolante per il prompt (mantiene il JSON contesto esistente).
 */
export function buildPurchaseFactsBlock({
  card,
  players = [],
  formation = null,
  profile = {},
  gameAnalysis = null,
  patterns = {},
  lang = 'it'
} = {}) {
  const isEn = lang === 'en'
  const cardRole = String(card?.position || '').trim().toUpperCase()
  const anchor = pickComparisonAnchor(players, cardRole)
  const starters = (players || []).filter(isStarter)
  const hasStarterAtCardRole = starters.some((p) => fieldRole(p) === cardRole)
  const disposition = buildDispositionLine(players, formation, lang)
  const passPattern = summarizePassingPattern(gameAnalysis, lang)
  const weakPoint = profile?.ai_weak_point ? String(profile.ai_weak_point).trim() : ''
  const matchCount = Number(patterns?.last_50_matches_count) || 0

  const lines = []
  lines.push(isEn ? '--- PURCHASE FACTS (binding — do not contradict) ---' : '--- FATTI ACQUISTO (vincolanti — non contraddire) ---')
  lines.push(disposition)
  lines.push(
    isEn
      ? `Pack card: ${card?.name || '?'}, role ${cardRole || '?'}, style ${card?.style || 'n/a'}.`
      : `Carta pack: ${card?.name || '?'}, ruolo ${cardRole || '?'}, stile ${card?.style || 'n/d'}.`
  )
  lines.push(
    hasStarterAtCardRole
      ? isEn
        ? `Starter in same field role ${cardRole}: yes.`
        : `Titolare con stesso ruolo in campo (${cardRole}): sì.`
      : isEn
        ? `Starter in same field role ${cardRole}: none.`
        : `Titolare con stesso ruolo in campo (${cardRole}): nessuno.`
  )

  if (anchor.type === 'same_field_role' || anchor.type === 'same_flank_zone' || anchor.type === 'natural_competence_only') {
    const zoneNote =
      anchor.type === 'same_flank_zone'
        ? isEn
          ? ' (flank zone reference, not same pack role)'
          : ' (riferimento fascia, non stesso ruolo pack)'
        : anchor.type === 'natural_competence_only'
          ? isEn
            ? ' (skill comparison only — different field role)'
            : ' (solo confronto skill — ruolo in campo diverso)'
          : ''
    lines.push(
      isEn
        ? `Official comparison anchor: ${anchor.displayLabel}${zoneNote}.`
        : `Riferimento confronto ufficiale: ${anchor.displayLabel}${zoneNote}.`
    )
    lines.push(anchor.namingRule)
  } else {
    lines.push(
      isEn
        ? `Official comparison anchor: none in field role ${cardRole}.`
        : `Riferimento confronto ufficiale: nessuno nel ruolo in campo ${cardRole}.`
    )
    lines.push(
      isEn
        ? 'Do not claim the card changes hierarchies over a invented starter at this role.'
        : 'Non dire che la carta cambia gerarchie su un titolare inventato in quel ruolo.'
    )
  }

  if (!hasStarterAtCardRole && cardRole) {
    lines.push(
      isEn
        ? `Formation gap: to use this card in pack role ${cardRole} you likely need a formation change, a dedicated slot, or bench rotation — state this if the card is worth buying.`
        : `Gap modulo: per usare la carta nel ruolo pack ${cardRole} serve probabilmente cambio modulo, slot dedicato o rotazione in panchina — dillo se ha senso comprarla.`
    )
  }

  if (passPattern) lines.push(passPattern)
  if (weakPoint) {
    lines.push(isEn ? `Profile weak point: ${weakPoint}.` : `Punto debole profilo: ${weakPoint}.`)
  }
  if (matchCount < 3) {
    lines.push(
      isEn
        ? 'Low match sample: keep purchase verdict prudent.'
        : 'Poche partite in archivio: verdetto acquisto prudente.'
    )
  }
  if (!(players || []).length) {
    lines.push(
      isEn
        ? 'No roster: card-only review, purchase_fit should be insufficient_data.'
        : 'Rosa assente: solo review carta, purchase_fit = insufficient_data.'
    )
  }
  lines.push(isEn ? '--- END PURCHASE FACTS ---' : '--- FINE FATTI ACQUISTO ---')

  return {
    text: lines.join('\n'),
    anchor,
    hasStarterAtCardRole
  }
}

export function normalizePurchaseFit(value) {
  const key = String(value || '').trim()
  return VALID_PURCHASE_FIT.has(key) ? key : ''
}
