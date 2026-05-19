/**
 * Fatti vincolanti per Card Advisor Pro: ruoli in campo, anchor confronto, gap modulo.
 * Confronto skill: stesso reparto (dif vs dif), stesso ruolo in campo se possibile.
 * Sinergie con compagni = sezione separata nel report, non paragoni difensori/attaccanti.
 */

const VALID_PURCHASE_FIT = new Set([
  'fits_current_setup',
  'fits_with_rotation',
  'fits_if_formation_change',
  'skill_only_no_slot',
  'not_your_playstyle',
  'skip_duplicate',
  'insufficient_data'
])

const FAMILY_POSITIONS = {
  gk: ['PT'],
  def: ['DC', 'TD', 'TS'],
  mid: ['MED', 'CC', 'TRQ', 'CLS', 'CLD'],
  att: ['P', 'SP', 'CF', 'ESA', 'EDA']
}

/** Fascia offensiva: solo per carte att/mid larghe — mai TD/TS con ESA */
const WIDE_LEFT_ATTACK = new Set(['CLS', 'ESA'])
const WIDE_RIGHT_ATTACK = new Set(['CLD', 'EDA'])

function toAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function roleFamily(position = '') {
  const pos = String(position || '').trim().toUpperCase()
  if (pos === 'PT') return 'gk'
  if (FAMILY_POSITIONS.def.includes(pos)) return 'def'
  if (FAMILY_POSITIONS.mid.includes(pos)) return 'mid'
  return 'att'
}

function isStarter(player) {
  const slot = Number(player?.slot_index)
  return Number.isFinite(slot) && slot >= 0 && slot <= 10
}

function fieldRole(player) {
  return String(player?.position || '').trim().toUpperCase()
}

function playerInFamily(player, family) {
  const role = fieldRole(player)
  return (FAMILY_POSITIONS[family] || []).includes(role)
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

function findSameNameStarter(starters, cardName) {
  const key = toAscii(cardName)
  if (!key) return null
  return (
    starters.find((p) => toAscii(p.player_name) === key) ||
    starters.find((p) => key.length >= 4 && toAscii(p.player_name).includes(key)) ||
    null
  )
}

function allowsWideFlankComparison(cardRole) {
  const family = roleFamily(cardRole)
  if (family === 'def' || family === 'gk') return false
  return WIDE_LEFT_ATTACK.has(cardRole) || WIDE_RIGHT_ATTACK.has(cardRole)
}

function wideFlankZone(cardRole) {
  if (!allowsWideFlankComparison(cardRole)) return null
  if (WIDE_LEFT_ATTACK.has(cardRole)) return 'left_wide'
  if (WIDE_RIGHT_ATTACK.has(cardRole)) return 'right_wide'
  return null
}

function playerInWideFlank(player, zone) {
  const role = fieldRole(player)
  if (zone === 'left_wide') return WIDE_LEFT_ATTACK.has(role)
  if (zone === 'right_wide') return WIDE_RIGHT_ATTACK.has(role)
  return false
}

function sortStarters(candidates, cardPosition, cardFamily) {
  return [...candidates].sort((a, b) => {
    const fieldA = fieldRole(a) === cardPosition ? 2 : playerInFamily(a, cardFamily) ? 1 : 0
    const fieldB = fieldRole(b) === cardPosition ? 2 : playerInFamily(b, cardFamily) ? 1 : 0
    if (fieldA !== fieldB) return fieldB - fieldA
    const slotA = Number(a?.slot_index)
    const slotB = Number(b?.slot_index)
    if (Number.isFinite(slotA) && Number.isFinite(slotB)) return slotA - slotB
    return String(a.player_name || '').localeCompare(String(b.player_name || ''))
  })
}

/**
 * @returns {{
 *   type: 'same_name'|'same_field_role'|'same_family'|'same_wide_flank'|'natural_competence_only'|'none',
 *   player: object|null,
 *   cardRole: string,
 *   fieldRole: string|null,
 *   displayLabel: string,
 *   namingRule: string,
 *   compareFamily: string
 * }}
 */
export function pickComparisonAnchor(players = [], cardPosition = '', cardName = '') {
  const cardRole = String(cardPosition || '').trim().toUpperCase()
  const cardFamily = roleFamily(cardRole)
  const starters = (players || []).filter((p) => p?.player_name && isStarter(p))

  if (!cardRole || starters.length === 0) {
    return {
      type: 'none',
      player: null,
      cardRole,
      fieldRole: null,
      displayLabel: '',
      namingRule: '',
      compareFamily: cardFamily
    }
  }

  const sameName = findSameNameStarter(starters, cardName)
  if (sameName && playerInFamily(sameName, cardFamily)) {
    const role = fieldRole(sameName)
    return {
      type: 'same_name',
      player: sameName,
      cardRole,
      fieldRole: role,
      displayLabel: `${sameName.player_name} (${role})`,
      namingRule: `Same player already in roster as ${role}. Compare pack card vs your ${sameName.player_name} (${role}) only.`,
      compareFamily: cardFamily
    }
  }

  const sameField = starters.filter((p) => fieldRole(p) === cardRole)
  if (sameField.length) {
    const player = sortStarters(sameField, cardRole, cardFamily)[0]
    const role = fieldRole(player)
    return {
      type: 'same_field_role',
      player,
      cardRole,
      fieldRole: role,
      displayLabel: `${player.player_name} (${role})`,
      namingRule: `Use only "${player.player_name} (${role})" — same field role as the pack card.`,
      compareFamily: cardFamily
    }
  }

  const sameFamilyStarters = starters.filter((p) => playerInFamily(p, cardFamily))
  if (sameFamilyStarters.length) {
    const player = sortStarters(sameFamilyStarters, cardRole, cardFamily)[0]
    const role = fieldRole(player)
    const familyLabel =
      cardFamily === 'def'
        ? 'difensore in rosa'
        : cardFamily === 'mid'
          ? 'centrocampista in rosa'
          : cardFamily === 'att'
            ? 'attaccante in rosa'
            : 'portiere in rosa'
    return {
      type: 'same_family',
      player,
      cardRole,
      fieldRole: role,
      displayLabel: `${player.player_name} (${role})`,
      namingRule:
        `Compare only within the same line: ${player.player_name} (${role}) as your ${familyLabel}. NEVER compare a defender to an attacker (e.g. not Ronaldinho for a DC/TD/TS card).`,
      compareFamily: cardFamily
    }
  }

  const zone = wideFlankZone(cardRole)
  if (zone) {
    const inZone = starters.filter((p) => playerInWideFlank(p, zone) && playerInFamily(p, cardFamily))
    if (inZone.length) {
      const player = sortStarters(inZone, cardRole, cardFamily)[0]
      const role = fieldRole(player)
      return {
        type: 'same_wide_flank',
        player,
        cardRole,
        fieldRole: role,
        displayLabel: `${player.player_name} (${role})`,
        namingRule:
          `Wide reference only: ${player.player_name} (${role}). Same attacking/mid wide band — not a defender.`,
        compareFamily: cardFamily
      }
    }
  }

  const naturalOnly = starters.filter(
    (p) =>
      playerHasNaturalAt(p, cardRole) &&
      fieldRole(p) !== cardRole &&
      playerInFamily(p, cardFamily)
  )
  if (naturalOnly.length) {
    const player = sortStarters(naturalOnly, cardRole, cardFamily)[0]
    const role = fieldRole(player)
    return {
      type: 'natural_competence_only',
      player,
      cardRole,
      fieldRole: role,
      displayLabel: `${player.player_name} (${role} in rosa)`,
      namingRule:
        `NEVER write "${player.player_name} ${cardRole}". Field role is ${role}; natural competence includes ${cardRole} on the card only. Same family (${cardFamily}) only.`,
      compareFamily: cardFamily
    }
  }

  return {
    type: 'none',
    player: null,
    cardRole,
    fieldRole: null,
    displayLabel: '',
    namingRule: `No starter in the same line (${cardFamily}) for role ${cardRole}. Do not compare to players from another line (def vs att).`,
    compareFamily: cardFamily
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

function familyLabelIt(family) {
  if (family === 'def') return 'difensori'
  if (family === 'mid') return 'centrocampo'
  if (family === 'att') return 'attacco'
  if (family === 'gk') return 'portieri'
  return 'rosa'
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
  const cardFamily = roleFamily(cardRole)
  const anchor = pickComparisonAnchor(players, cardRole, card?.name)
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
      ? `Pack card: ${card?.name || '?'}, role ${cardRole || '?'}, style ${card?.style || 'n/a'}, line ${cardFamily}.`
      : `Carta pack: ${card?.name || '?'}, ruolo ${cardRole || '?'}, stile ${card?.style || 'n/d'}, reparto ${familyLabelIt(cardFamily)}.`
  )
  lines.push(
    isEn
      ? `Skill comparison rule: ONLY same line (${cardFamily}) — defenders vs defenders, midfield vs midfield, attack vs attack. Teammate synergies go in "synergies", NOT by comparing a defender to an attacker.`
      : `Regola confronto skill: SOLO stesso reparto (${familyLabelIt(cardFamily)}) — difensori vs difensori, centrocampo vs centrocampo, attacco vs attacco. Sinergie con compagni in "synergies", NON paragonando un difensore a un attaccante.`
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

  if (['same_name', 'same_field_role', 'same_family', 'same_wide_flank', 'natural_competence_only'].includes(anchor.type)) {
    const typeNote =
      anchor.type === 'same_family'
        ? isEn
          ? ' (same defensive/mid/att line — closest starter)'
          : ' (stesso reparto — titolare più vicino)'
        : anchor.type === 'same_wide_flank'
          ? isEn
            ? ' (wide attack/mid only)'
            : ' (solo fascia offensiva)'
          : anchor.type === 'natural_competence_only'
            ? isEn
              ? ' (natural competence — different field role)'
              : ' (competenza naturale — ruolo in campo diverso)'
            : ''
    lines.push(
      isEn
        ? `Official skill comparison anchor: ${anchor.displayLabel}${typeNote}.`
        : `Riferimento confronto skill ufficiale: ${anchor.displayLabel}${typeNote}.`
    )
    lines.push(anchor.namingRule)
    if (anchor.type === 'same_name') {
      lines.push(
        isEn
          ? 'Purchase rule: same player name already in starting XI — default purchase_fit skip_duplicate and verdict not_priority or skip unless skill_delta_sentence lists clear new skills worth the coins.'
          : 'Regola acquisto: stesso nome già titolare — di default purchase_fit skip_duplicate e verdict not_priority o skip, salvo skill_delta con skill nuove chiare che valgono i coins.'
      )
    }
    if (anchor.type === 'natural_competence_only') {
      lines.push(
        isEn
          ? 'Purchase rule: pack role differs from field role — purchase_fit fits_if_formation_change or skill_only_no_slot; setup_condition must say how to field the pack role.'
          : 'Regola acquisto: ruolo pack diverso dal ruolo in campo — purchase_fit fits_if_formation_change o skill_only_no_slot; setup_condition deve spiegare come schierare il ruolo pack.'
      )
    }
  } else {
    lines.push(
      isEn
        ? `Official skill comparison anchor: none in line ${cardFamily} for role ${cardRole}.`
        : `Riferimento confronto skill: nessuno nel reparto ${familyLabelIt(cardFamily)} per ruolo ${cardRole}.`
    )
    lines.push(
      isEn
        ? 'Do not compare to players from another line (e.g. no Ronaldinho for a defender card).'
        : 'Non confrontare con giocatori di altro reparto (es. niente Ronaldinho per una carta difensiva).'
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
