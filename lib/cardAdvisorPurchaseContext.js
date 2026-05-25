/**
 * Fatti vincolanti per Card Advisor Pro: ruoli in campo, anchor confronto, gap modulo.
 * Confronto skill: stesso ruolo sul modulo salvato, poi fascia larga, poi reparto.
 * Sinergie con compagni = sezione separata nel report, non paragoni difensori/attaccanti.
 */

import { getSlotPosition } from './buildCoachServerUtils.js'

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

/** Ruolo scheda rosa (DB `players.position`). */
function rosterRole(player) {
  return String(player?.position || '').trim().toUpperCase()
}

/**
 * Ruolo effettivo in campo: `formation_layout.slot_positions` per lo slot, altrimenti scheda.
 * @param {object|null} formation — riga `formation_layout`
 */
export function effectiveFieldRole(player, formation = null) {
  const fromLayout = getSlotPosition(player, formation)
  if (fromLayout) return String(fromLayout).trim().toUpperCase()
  return rosterRole(player)
}

function playerInFamilyOnPitch(player, family, formation = null) {
  const role = effectiveFieldRole(player, formation)
  return (FAMILY_POSITIONS[family] || []).includes(role)
}

function formatAnchorLabel(player, formation = null) {
  const onPitch = effectiveFieldRole(player, formation)
  const roster = rosterRole(player)
  if (!onPitch) return String(player?.player_name || '').trim()
  if (roster && roster !== onPitch) {
    return `${player.player_name} (${onPitch} in campo, scheda ${roster})`
  }
  return `${player.player_name} (${onPitch})`
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

function playerInWideFlankOnPitch(player, zone, formation = null) {
  const role = effectiveFieldRole(player, formation)
  if (zone === 'left_wide') return WIDE_LEFT_ATTACK.has(role)
  if (zone === 'right_wide') return WIDE_RIGHT_ATTACK.has(role)
  return false
}

function sortStarters(candidates, cardPosition, cardFamily, formation = null) {
  return [...candidates].sort((a, b) => {
    const fieldA =
      effectiveFieldRole(a, formation) === cardPosition ? 2 : playerInFamilyOnPitch(a, cardFamily, formation) ? 1 : 0
    const fieldB =
      effectiveFieldRole(b, formation) === cardPosition ? 2 : playerInFamilyOnPitch(b, cardFamily, formation) ? 1 : 0
    if (fieldA !== fieldB) return fieldB - fieldA
    const slotA = Number(a?.slot_index)
    const slotB = Number(b?.slot_index)
    if (Number.isFinite(slotA) && Number.isFinite(slotB)) return slotA - slotB
    return String(a.player_name || '').localeCompare(String(b.player_name || ''))
  })
}

function lineupMismatchNotes(starters, formation, lang) {
  if (!formation?.slot_positions) return ''
  const isEn = lang === 'en'
  const mismatches = starters
    .map((p) => {
      const onPitch = effectiveFieldRole(p, formation)
      const roster = rosterRole(p)
      if (!onPitch || !roster || onPitch === roster) return null
      return `${p.player_name}: ${roster} scheda → ${onPitch} in campo`
    })
    .filter(Boolean)
  if (!mismatches.length) return ''
  return isEn
    ? `Roster vs saved layout: ${mismatches.join('; ')}.`
    : `Scheda vs modulo salvato: ${mismatches.join('; ')}.`
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
export function pickComparisonAnchor(players = [], cardPosition = '', cardName = '', formation = null) {
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
  if (sameName && playerInFamilyOnPitch(sameName, cardFamily, formation)) {
    const role = effectiveFieldRole(sameName, formation)
    return {
      type: 'same_name',
      player: sameName,
      cardRole,
      fieldRole: role,
      displayLabel: formatAnchorLabel(sameName, formation),
      namingRule: `Same player already in starting XI (${role} on saved layout). Compare pack card vs ${formatAnchorLabel(sameName, formation)} only.`,
      compareFamily: cardFamily
    }
  }

  const sameField = starters.filter((p) => effectiveFieldRole(p, formation) === cardRole)
  if (sameField.length) {
    const player = sortStarters(sameField, cardRole, cardFamily, formation)[0]
    const role = effectiveFieldRole(player, formation)
    return {
      type: 'same_field_role',
      player,
      cardRole,
      fieldRole: role,
      displayLabel: formatAnchorLabel(player, formation),
      namingRule: `Use only "${formatAnchorLabel(player, formation)}" — same role on the saved formation as the pack card (${cardRole}).`,
      compareFamily: cardFamily
    }
  }

  const zone = wideFlankZone(cardRole)
  if (zone) {
    const inZone = starters.filter((p) => playerInWideFlankOnPitch(p, zone, formation))
    if (inZone.length) {
      const player = sortStarters(inZone, cardRole, cardFamily, formation)[0]
      const role = effectiveFieldRole(player, formation)
      return {
        type: 'same_wide_flank',
        player,
        cardRole,
        fieldRole: role,
        displayLabel: formatAnchorLabel(player, formation),
        namingRule:
          `Wide-band reference from saved layout: ${formatAnchorLabel(player, formation)}. Compare pack ${cardRole} to this flank starter — not a central striker from another role.`,
        compareFamily: cardFamily
      }
    }
  }

  const naturalOnly = starters.filter(
    (p) =>
      playerHasNaturalAt(p, cardRole) &&
      effectiveFieldRole(p, formation) !== cardRole &&
      playerInFamilyOnPitch(p, cardFamily, formation)
  )
  if (naturalOnly.length) {
    const player = sortStarters(naturalOnly, cardRole, cardFamily, formation)[0]
    const role = effectiveFieldRole(player, formation)
    return {
      type: 'natural_competence_only',
      player,
      cardRole,
      fieldRole: role,
      displayLabel: formatAnchorLabel(player, formation),
      namingRule:
        `NEVER write "${player.player_name} ${cardRole}" as field starter. On layout: ${role}; natural competence includes ${cardRole} on the card only.`,
      compareFamily: cardFamily
    }
  }

  const sameFamilyStarters = starters.filter((p) => playerInFamilyOnPitch(p, cardFamily, formation))
  if (sameFamilyStarters.length) {
    const player = sortStarters(sameFamilyStarters, cardRole, cardFamily, formation)[0]
    const role = effectiveFieldRole(player, formation)
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
      displayLabel: formatAnchorLabel(player, formation),
      namingRule:
        `Fallback — no starter in pack role ${cardRole} on saved layout: compare within the same line to ${formatAnchorLabel(player, formation)} (${familyLabel}). Do not compare to another line (def vs att).`,
      compareFamily: cardFamily
    }
  }

  return {
    type: 'none',
    player: null,
    cardRole,
    fieldRole: null,
    displayLabel: '',
    namingRule: `No starter in the same line (${cardFamily}) for role ${cardRole} on saved layout. Do not compare to players from another line (def vs att).`,
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
  const positions = starters.map((p) => effectiveFieldRole(p, formation) || '?').join(', ')
  const mod = formation?.formation ? String(formation.formation).trim() : ''
  const layoutNote = formation?.slot_positions
    ? ''
    : lang === 'en'
      ? ' (layout positions missing — using roster card roles)'
      : ' (modulo senza slot_positions — ruoli da scheda)'
  if (lang === 'en') {
    return mod
      ? `Saved formation: ${mod}. On field: ${positions || 'not set'}.${layoutNote}`
      : `On field: ${positions || 'not set'}.${layoutNote}`
  }
  return mod
    ? `Modulo salvato: ${mod}. In campo: ${positions || 'non impostata'}.${layoutNote}`
    : `In campo: ${positions || 'non impostata'}.${layoutNote}`
}

function familyLabelIt(family) {
  if (family === 'def') return 'difensori'
  if (family === 'mid') return 'centrocampo'
  if (family === 'att') return 'attacco'
  if (family === 'gk') return 'portieri'
  return 'rosa'
}

export function isPremiumCatalogCard(card = {}, catalogCard = null) {
  const cat = toAscii(
    [
      card?.category,
      card?.card_type,
      card?.card_category,
      catalogCard?.category,
      catalogCard?.card_type,
      catalogCard?.card_category,
      catalogCard?.players_payload?.category,
      catalogCard?.players_payload?.card_type
    ].filter(Boolean).join(' ')
  )
  return /(epic|legendary|leggendar|show time|showtime|big time)/.test(cat)
}

function playerStyleName(player, stylesLookup = {}) {
  return (
    (player?.playing_style_id && stylesLookup[player.playing_style_id])
    || player?.role
    || ''
  ).trim()
}

/** Titolari nello stesso ruolo in campo (es. 2 CF in 3-3-4). */
export function summarizeRotationPool(starters = [], cardRole = '', formation = null, stylesLookup = {}, cardStyle = '', lang = 'it') {
  const isEn = lang === 'en'
  const role = String(cardRole || '').trim().toUpperCase()
  const onRole = starters.filter((p) => effectiveFieldRole(p, formation) === role)
  const cardStyleKey = toAscii(cardStyle)
  const sameStyle = onRole.filter((p) => {
    const ps = toAscii(playerStyleName(p, stylesLookup))
    return cardStyleKey && ps && (ps === cardStyleKey || ps.includes(cardStyleKey) || cardStyleKey.includes(ps))
  })
  const names = onRole.map((p) => formatAnchorLabel(p, formation)).filter(Boolean)
  return {
    countOnRole: onRole.length,
    sameStyleCount: sameStyle.length,
    names,
    crowdedLane: onRole.length >= 2
  }
}

/**
 * Blocco testuale vincolante per il prompt (mantiene il JSON contesto esistente).
 */
export function buildPurchaseFactsBlock({
  card,
  catalogCard = null,
  players = [],
  formation = null,
  profile = {},
  gameAnalysis = null,
  patterns = {},
  stylesLookup = {},
  lang = 'it'
} = {}) {
  const isEn = lang === 'en'
  const cardRole = String(card?.position || '').trim().toUpperCase()
  const cardFamily = roleFamily(cardRole)
  const cardStyle = String(card?.style || catalogCard?.playing_style || '').trim()
  const premiumCard = isPremiumCatalogCard(card, catalogCard)
  const anchor = pickComparisonAnchor(players, cardRole, card?.name, formation)
  const starters = (players || []).filter(isStarter)
  const hasStarterAtCardRole = starters.some((p) => effectiveFieldRole(p, formation) === cardRole)
  const rotationPool = summarizeRotationPool(starters, cardRole, formation, stylesLookup, cardStyle, lang)
  const disposition = buildDispositionLine(players, formation, lang)
  const mismatchNote = lineupMismatchNotes(starters, formation, lang)
  const passPattern = summarizePassingPattern(gameAnalysis, lang)
  const weakPoint = profile?.ai_weak_point ? String(profile.ai_weak_point).trim() : ''
  const matchCount = Number(patterns?.last_50_matches_count) || 0

  const lines = []
  lines.push(isEn ? '--- PURCHASE FACTS (binding — do not contradict) ---' : '--- FATTI ACQUISTO (vincolanti — non contraddire) ---')
  lines.push(disposition)
  if (mismatchNote) lines.push(mismatchNote)
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
    isEn
      ? 'Decision principle: compare this pack card against the customer roster first. A favorable read is allowed only when it changes role coverage, rotation, movement, special tools, body type or TODAY match plan — never raw rating.'
      : 'Principio decisionale: confronta prima questa carta pack con la rosa del cliente. Lettura favorevole solo se cambia copertura ruolo, rotazione, movimento, tool speciali, body type o piano partita DI OGGI — mai rating grezzo.'
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
          ? ' (fallback — same line, no pack role on saved layout)'
          : ' (fallback — stesso reparto, nessun titolare nel ruolo pack sul modulo)'
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
          ? 'Purchase rule: same player name already in starting XI is not an automatic skip. Compare the new version by distinct skills, body type, movement, booster/showtime tools and rotation value. Use skip_duplicate only when there is no concrete new tool or rotation case.'
          : 'Regola acquisto: stesso nome già titolare non è skip automatico. Confronta la nuova versione per skill diverse, body type, movimento, booster/showtime e valore rotazione. Usa skip_duplicate solo se non c’è nessun tool nuovo concreto o caso rotazione.'
      )
    }
    if (anchor.type === 'natural_competence_only') {
      lines.push(
        isEn
          ? 'Purchase rule: pack role differs from field role — for premium cards, prefer fits_if_formation_change or fits_with_rotation with a clear setup condition when the card has concrete tools. Do not default to a cold verdict only because the saved layout uses a different role.'
          : 'Regola acquisto: ruolo pack diverso dal ruolo in campo — per carte premium preferisci fits_if_formation_change o fits_with_rotation con condizione chiara quando la carta ha tool concreti. Non raffreddare il verdetto solo perché il modulo salvato usa un ruolo diverso.'
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
        ? `Formation gap: no current ${cardRole} starter, but this is not a negative for premium cards. If the card has concrete tools, frame it as premium rotation with formation change, dedicated slot, or bench use.`
        : `Gap modulo: nessun titolare ${cardRole} attuale, ma non è negativo per carte premium. Se la carta ha tool concreti, leggila come rotazione premium con cambio modulo, slot dedicato o uso dalla panchina.`
    )
  }

  if (rotationPool.crowdedLane) {
    lines.push(
      isEn
        ? `Rotation pool context, not a penalty: ${rotationPool.countOnRole} starters already in ${cardRole} on field (${rotationPool.names.join(', ') || 'n/a'}). Judge whether this card adds a different match plan or bench rotation.`
        : `Contesto pool rotazione, non penalità: ${rotationPool.countOnRole} titolari già in ${cardRole} in campo (${rotationPool.names.join(', ') || 'n/d'}). Valuta se questa carta aggiunge piano partita diverso o rotazione dalla panchina.`
    )
  }

  if (premiumCard && hasStarterAtCardRole && anchor.type !== 'same_name') {
    lines.push(
      isEn
        ? 'Premium card in a covered role: default verdict premium_rotation or fits_with_rotation when pros list distinct card-only skills, body type or match-plan use. Forbidden: final_decision "not today" / "do not buy" only because another starter shares the same playing style — same Goal Poacher ≠ automatic duplicate; compare dribbling, finishing tools, connection lag and rotation value.'
        : 'Carta premium in ruolo già coperto: verdetto di default premium_rotation o fits_with_rotation se i pro citano skill solo carta, body type o piano partita. Vietato: final_decision "Oggi no" / "non comprare" solo perché un altro titolare ha lo stesso stile — stesso Opportunista ≠ doppione automatico; confronta dribbling, strumenti in finalizzazione, lag e valore rotazione.'
    )
    if (rotationPool.crowdedLane && rotationPool.sameStyleCount >= 1) {
      lines.push(
        isEn
          ? `Same movement style as ${rotationPool.sameStyleCount} current ${cardRole} starter(s): still valid as elite rotation — alternate by match plan (depth vs box presence), not as a forced weekly starter.`
          : `Stesso stile di movimento di ${rotationPool.sameStyleCount} titolare/i ${cardRole}: resta valida come rotazione d'élite — alterna per piano partita (profondità vs presenza in area), non come titolare fisso obbligatorio.`
      )
    }
  }

  if (premiumCard && cardFamily === 'gk') {
    lines.push(
      isEn
        ? 'Premium goalkeeper rule: do not call the card unnecessary just because the customer already has a goalkeeper. A new premium GK is at least a premium_rotation case when it offers reliability, reach/body, close saves, rebound control, distribution or form coverage.'
        : 'Regola portiere premium: non dire che la carta non è necessaria solo perché il cliente ha già un portiere. Un nuovo PT premium è almeno premium_rotation quando offre affidabilità, reach/body, parate ravvicinate, controllo rimbalzi, distribuzione o copertura forma.'
    )
  }

  if (passPattern) lines.push(passPattern)
  if (weakPoint) {
    lines.push(isEn ? `Profile weak point: ${weakPoint}.` : `Punto debole profilo: ${weakPoint}.`)
  }
  if (matchCount < 3) {
    lines.push(
      isEn
        ? 'Low match sample: keep wording honest, but do not downgrade a premium card with concrete tools; explain the rotation/match-plan case.'
        : 'Poche partite in archivio: resta onesto nel testo, ma non abbassare una premium con tool concreti; spiega il caso rotazione/piano partita.'
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
    hasStarterAtCardRole,
    premiumCard,
    rotationPool
  }
}

export function normalizePurchaseFit(value) {
  const key = String(value || '').trim()
  return VALID_PURCHASE_FIT.has(key) ? key : ''
}
