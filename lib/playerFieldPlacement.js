/**
 * Dove è schierato un titolare (modulo / Fluida) vs competenze carta.
 * Non muta players.position. Usato da chat Coach e diagnostic.
 */
import { getPhasePositionFit, getPhaseSlotPosition } from './efootballV6TacticalModel.js'
import { normPosCode } from './playerSlotRoleMetadata.js'

function starterList(players) {
  return (Array.isArray(players) ? players : [])
    .filter((p) => p?.slot_index != null && Number(p.slot_index) >= 0 && Number(p.slot_index) <= 10)
    .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
}

function phaseRole(fluid, phase, slotIndex, fallback) {
  const fromPhase = getPhaseSlotPosition(fluid?.[phase]?.slot_positions, slotIndex)
  if (fromPhase) return normPosCode(fromPhase)
  const fromBase = getPhaseSlotPosition(fluid?.base?.slot_positions, slotIndex)
  if (fromBase) return normPosCode(fromBase)
  return fallback || ''
}

export function getStarterPhaseRoles(player, fluid) {
  const saved = normPosCode(player?.position)
  const slotIndex = player?.slot_index
  if (!fluid?.enabled) {
    return { fluidEnabled: false, assigned: saved, attack: saved, defense: saved }
  }
  return {
    fluidEnabled: true,
    assigned: saved,
    attack: phaseRole(fluid, 'attack', slotIndex, saved),
    defense: phaseRole(fluid, 'defense', slotIndex, saved)
  }
}

export function formatStarterPlacementToken(player, fluid, lang = 'it') {
  const roles = getStarterPhaseRoles(player, fluid)
  if (!roles.fluidEnabled) return roles.assigned || '?'
  if (lang === 'en') return `attack ${roles.attack || '?'} / defence ${roles.defense || '?'}`
  if (lang === 'es') return `ataque ${roles.attack || '?'} / defensa ${roles.defense || '?'}`
  return `attacco ${roles.attack || '?'} / difesa ${roles.defense || '?'}`
}

export function formatDispositionRoles(starters, fluid, lang = 'it') {
  const list = starterList(starters)
  if (!fluid?.enabled) {
    return list.map((p) => getStarterPhaseRoles(p, fluid).assigned || '?').join(', ')
  }
  const attack = list.map((p) => getStarterPhaseRoles(p, fluid).attack || '?').join(', ')
  const defense = list.map((p) => getStarterPhaseRoles(p, fluid).defense || '?').join(', ')
  if (lang === 'en') return `ATTACK ${attack}. DEFENCE ${defense}`
  if (lang === 'es') return `ATAQUE ${attack}. DEFENSA ${defense}`
  return `ATTACCO ${attack}. DIFESA ${defense}`
}

function formatCardCompetences(originalPositions, lang) {
  const empty = lang === 'en' ? 'not set' : lang === 'es' ? 'no establecidas' : 'non impostate'
  if (!Array.isArray(originalPositions) || originalPositions.length === 0) return empty
  const s = originalPositions
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim()
      if (!entry?.position) return ''
      return entry.competence ? `${entry.position} ${entry.competence}` : entry.position
    })
    .filter(Boolean)
    .join(', ')
  return s || empty
}

function phaseFitNote(role, originals, lang) {
  const fit = getPhasePositionFit(role, originals)
  if (fit.fit === 'alta') {
    return lang === 'en' ? 'card Alta' : lang === 'es' ? 'carta Alta' : 'carta Alta'
  }
  if (fit.fit === 'intermedia') {
    return lang === 'en'
      ? 'card Intermediate (not High)'
      : lang === 'es'
        ? 'carta Intermedia (no Alta)'
        : 'carta Intermedia (non Alta)'
  }
  if (fit.fit === 'bassa') {
    return lang === 'en'
      ? 'card Low (not High)'
      : lang === 'es'
        ? 'carta Baja (no Alta)'
        : 'carta Bassa (non Alta)'
  }
  return lang === 'en'
    ? 'out of card role (no High competence)'
    : lang === 'es'
      ? 'fuera de rol de carta (sin competencia Alta)'
      : 'fuori ruolo carta (nessuna competenza Alta)'
}

function phaseNeedsWarning(role, originals) {
  if (!role) return false
  const fit = getPhasePositionFit(role, originals)
  return fit.fit !== 'alta' && fit.fit !== 'unknown'
}

export function getPlacementWarningTitle(lang = 'it') {
  if (lang === 'en') {
    return 'LINEUP VS CARD (client slot is where he is; missing High competence is a trade-off, not "he is not there"):'
  }
  if (lang === 'es') {
    return 'ALINEACIÓN VS CARTA (el slot del cliente es dónde está; sin competencia Alta es un compromiso, no "no está ahí"):'
  }
  return 'SCHIERAMENTO VS CARTA (lo slot del cliente è dove sta; senza competenza Alta è un compromesso, non "non è lì"):'
}

/**
 * Avvisi competenza/fuori ruolo. Non riscrivono lo schieramento.
 */
export function getPlacementWarningLines(players, lang = 'it', fluid = null) {
  const lines = []
  for (const player of starterList(players)) {
    const originals = Array.isArray(player.original_positions) ? player.original_positions : []
    if (originals.length === 0) continue
    const roles = getStarterPhaseRoles(player, fluid)
    const card = formatCardCompetences(originals, lang)
    const slot = player.slot_index != null ? ` slot ${player.slot_index}` : ''
    const name = player.player_name || '?'

    if (!roles.fluidEnabled) {
      if (!phaseNeedsWarning(roles.assigned, originals)) continue
      const note = phaseFitNote(roles.assigned, originals, lang)
      if (lang === 'en') {
        lines.push(
          `- ${name}${slot}: fielded ${roles.assigned || '?'}. Card: ${card}. ${note}. He is ${roles.assigned} in the XI; card natural roles are a suggestion, not his current slot.`
        )
      } else if (lang === 'es') {
        lines.push(
          `- ${name}${slot}: alineado ${roles.assigned || '?'}. Carta: ${card}. ${note}. En plantilla está ${roles.assigned}; el rol natural de carta es sugerencia, no su slot actual.`
        )
      } else {
        lines.push(
          `- ${name}${slot}: schierato ${roles.assigned || '?'}. Carta: ${card}. ${note}. In rosa è ${roles.assigned}; il ruolo naturale della carta è un suggerimento, non lo slot attuale.`
        )
      }
      continue
    }

    const attackWarn = phaseNeedsWarning(roles.attack, originals)
    const defenseWarn = phaseNeedsWarning(roles.defense, originals)
    if (!attackWarn && !defenseWarn) continue
    const attackNote = phaseFitNote(roles.attack, originals, lang)
    const defenseNote = phaseFitNote(roles.defense, originals, lang)
    if (lang === 'en') {
      lines.push(
        `- ${name}${slot}: attack ${roles.attack || '?'} (${attackNote}); defence ${roles.defense || '?'} (${defenseNote}). Card: ${card}. If he is CC in attack, do NOT say he is currently a defender.`
      )
    } else if (lang === 'es') {
      lines.push(
        `- ${name}${slot}: ataque ${roles.attack || '?'} (${attackNote}); defensa ${roles.defense || '?'} (${defenseNote}). Carta: ${card}. Si en ataque es CC, NO digas que ahora es defensa.`
      )
    } else {
      lines.push(
        `- ${name}${slot}: in attacco ${roles.attack || '?'} (${attackNote}); in difesa ${roles.defense || '?'} (${defenseNote}). Carta: ${card}. Se in attacco è CC, NON dire che in questo momento è un difensore.`
      )
    }
  }
  return lines
}
