/**
 * Card Advisor — contesto eFootball v6 (Slice 3).
 *
 * Raccoglie la logica deterministica che porta il Card Advisor fuori dal
 * "vecchio mondo" (formazione base, un solo playing style, niente Link-up):
 * - riconoscimento team style tramite ID canonici v6 (niente substring);
 * - contratto dual playing style della carta (attacco/difesa, 'Basic' = neutro);
 * - contesto formazione fluida (ruolo della carta per fase);
 * - verifica Link-up come caso d'acquisto SOLO se matematicamente verificato.
 *
 * Nessuna logica di scoring qui: queste funzioni producono solo contesto e
 * testo di reasoning. Modulo puro (nessuna dipendenza Next/Supabase) così i
 * test in scripts/ possono importarlo direttamente.
 */

import { resolveTeamStyleId, getTeamPlaystyleLabel } from './efootballV6Rules.js'
import {
  evaluateLinkUpPlay,
  getPhaseSlotPosition,
  normalizeLinkUpPlays,
  startersForLinkUpVerification
} from './efootballV6TacticalModel.js'
import { getPlayingStylesContract, normalizePlayingStyleKey } from './playingStyleResolve.js'
import { isStarterPlayer } from './rosterSlotUtils.js'

/**
 * ID canonico v6 del team style (o null). Sostituisce i riconoscimenti via
 * substring: 'contrattacco' (Long Ball Counter) non matcha 'contropiede'/'counter'.
 */
export function teamStyleCategory(tacticalStyle) {
  return resolveTeamStyleId(tacticalStyle)
}

/** Gioco di rimessa: Contropiede veloce (Quick Counter) o Contrattacco (Long Ball Counter). */
export function isCounterTeamStyle(tacticalStyle) {
  const id = teamStyleCategory(tacticalStyle)
  return id === 'contropiede_veloce' || id === 'contrattacco'
}

/**
 * 'Basic' in fase difensiva = nessuno stile difensivo speciale documentato dalla
 * sorgente: va trattato come neutro, senza inventare meccaniche.
 */
export function isNeutralDefenseStyle(value) {
  return normalizePlayingStyleKey(value) === 'basic'
}

/**
 * Contratto dual/single della carta Card Advisor. Il record catalogo non ha una
 * colonna dedicata (niente schema change): il contratto vive in
 * `source_payload.playing_styles` (sync EFHub) o in `playing_styles` se presente.
 * Fallback legacy: il solo `playing_style` (= stile di attacco).
 *
 * @param {object|null} catalogRow riga card_advisor_cards o dettaglio EFHub live
 * @param {string} fallbackStyle stile legacy della carta pack (card.style)
 */
export function getCardPlayingStylesContract(catalogRow = null, fallbackStyle = '') {
  const row = catalogRow && typeof catalogRow === 'object' ? catalogRow : {}
  const payload = row.source_payload && typeof row.source_payload === 'object' ? row.source_payload : null
  return getPlayingStylesContract({
    playing_style: row.playing_style || fallbackStyle || null,
    playing_styles: row.playing_styles || payload?.playing_styles || null
  })
}

/**
 * Stile di gioco della carta per fase. Attacco → contract.attack (o legacy).
 * Difesa → contract.defense solo se documentato e non 'Basic'; altrimenti
 * fallback neutro allo stile di attacco (nessuna meccanica inventata).
 *
 * @returns {{ style: string|null, source: 'attack'|'defense'|'attack_fallback'|'none', defenseNeutral: boolean }}
 */
export function getPhasePlayingStyle(contract, phase = 'attack') {
  const resolved = contract && typeof contract === 'object'
    ? contract
    : getPlayingStylesContract(contract)
  const attack = resolved?.attack || resolved?.primary || null
  const rawDefense = resolved?.defense || null
  const defenseNeutral = Boolean(rawDefense) && isNeutralDefenseStyle(rawDefense)
  if (phase === 'defense') {
    const defense = rawDefense && !defenseNeutral ? rawDefense : null
    if (defense) return { style: defense, source: 'defense', defenseNeutral }
    return { style: attack || null, source: attack ? 'attack_fallback' : 'none', defenseNeutral }
  }
  return { style: attack || null, source: attack ? 'attack' : 'none', defenseNeutral }
}

/**
 * Contesto formazione fluida per la carta valutata: formazione base/attacco/difesa
 * e presenza del ruolo pack negli slot di ciascuna fase (la carta non è in rosa,
 * quindi il "ruolo per fase" è letto dagli slot_positions di fase).
 */
export function buildCardFluidContext({ fluid, cardPosition } = {}) {
  const base = fluid?.base || null
  const enabled = Boolean(fluid?.enabled)
  const position = String(cardPosition || '').trim().toUpperCase()

  const phaseInfo = (phase) => {
    if (!phase) return null
    const slots = []
    for (let i = 0; i <= 10; i += 1) {
      const slotPosition = getPhaseSlotPosition(phase.slot_positions, i)
      if (slotPosition) slots.push({ slot: i, position: slotPosition })
    }
    const matchingSlots = position
      ? slots.filter((entry) => entry.position === position).map((entry) => entry.slot)
      : []
    return {
      formation: phase.formation || null,
      position_present: position ? matchingSlots.length > 0 : null,
      slots: matchingSlots
    }
  }

  return {
    fluid_enabled: enabled,
    formation_base: base?.formation || null,
    formation_attack: (enabled ? fluid.attack : null)?.formation || base?.formation || null,
    formation_defense: (enabled ? fluid.defense : null)?.formation || base?.formation || null,
    attack: enabled ? phaseInfo(fluid.attack) : null,
    defense: enabled ? phaseInfo(fluid.defense) : null
  }
}

/**
 * Overload (pressing_totale): superiorità numerica lato palla, passaggi corti e
 * possesso in zone dense, compattezza, chiusura rapida sul portatore.
 * Il fit ragiona su supporto corto, ricezione sotto pressione, passaggio rapido,
 * mobilità in spazi congestionati, copertura lato palla e recupero coerente col
 * ruolo — NIENTE shortcut numerici ("passaggio 80 = carta Overload"): il gate
 * usa gruppi di skill/ruolo, non una stat soglia.
 *
 * @param {{ family: string, groups?: { passing?: boolean, dribble?: boolean, defensive?: boolean } }} input
 */
export function overloadFitApplies({ family, groups = {} } = {}) {
  if (family === 'gk') return Boolean(groups.passing)
  if (family === 'def') return Boolean(groups.defensive || groups.passing)
  if (family === 'mid') return Boolean(groups.passing || groups.dribble)
  return Boolean(groups.passing || groups.dribble)
}

/**
 * Linea di reasoning testuale per Overload. Nessun bonus di punteggio: solo
 * lettura tattica coerente col ruolo.
 */
export function overloadFitLine({ family, groups = {} } = {}, lang = 'it') {
  if (!overloadFitApplies({ family, groups })) return ''
  const isEn = lang === 'en'
  const isEs = lang === 'es'
  if (family === 'def') {
    return isEn
      ? 'Fits Overload: ball-side coverage and role-coherent recovery keep the team compact while pressing the carrier.'
      : isEs
        ? 'Encaja con Overload: cobertura del lado del balón y recuperación coherente con el rol mantienen el equipo compacto al presionar al portador.'
        : 'Si lega a Overload: copertura lato palla e recupero coerente col ruolo tengono la squadra compatta mentre si chiude sul portatore.'
  }
  if (family === 'gk') {
    return isEn
      ? 'Fits Overload: a clean first pass supports the short build-up that fuels ball-side numerical superiority.'
      : isEs
        ? 'Encaja con Overload: una salida limpia apoya la construcción corta que alimenta la superioridad numérica lato balón.'
        : 'Si lega a Overload: un’uscita palla pulita supporta la costruzione corta che alimenta la superiorità numerica lato palla.'
  }
  if (family === 'mid') {
    return isEn
      ? 'Fits Overload: short support and quick passing keep possession in dense zones and sustain the ball-side overload.'
      : isEs
        ? 'Encaja con Overload: apoyo corto y pase rápido mantienen la posesión en zonas densas y sostienen la superioridad lato balón.'
        : 'Si lega a Overload: supporto corto e passaggio rapido tengono il possesso nelle zone dense e alimentano la superiorità numerica lato palla.'
  }
  return isEn
    ? 'Fits Overload: receiving under pressure and moving in congested spaces give the short-passing game an outlet near the ball.'
    : isEs
      ? 'Encaja con Overload: recepción bajo presión y movimiento en espacios congestionados dan una salida al juego corto cerca del balón.'
      : 'Si lega a Overload: ricezione sotto pressione e mobilità negli spazi congestionati danno uno sbocco al giro palla corto vicino al portatore.'
}

/**
 * Verifica deterministica (mai GPT): la carta, INSIEME alla rosa attuale, rende
 * attivabile un Link-up del coach oggi non attivabile? Vero solo se: il coach ha
 * quel Link-up, la carta soddisfa posizione E playing style richiesti, l'altro
 * membro esiste davvero in rosa, i due giocatori sono distinti. Con formazione
 * fluida attiva le posizioni rilevanti sono quelle della fase ATTACCO.
 *
 * @returns {{ status: 'none'|'verified'|'not_verified'|'already_active', linkUps: object[] }}
 */
export function verifyCardLinkUpPurchase({ coach, players = [], card = {}, cardContract = null, fluid = null, stylesLookup = {} } = {}) {
  const plays = normalizeLinkUpPlays(coach)
  if (!plays.length) return { status: 'none', linkUps: [] }

  const contract = cardContract || getCardPlayingStylesContract(card, card?.style)
  // Link-up = sinergia di costruzione: per la carta vale lo stile di ATTACCO.
  const attackStyle = contract.attack || contract.primary || card?.playing_style || card?.style || ''
  const virtualCard = {
    id: `card:${String(card?.name || 'pack').trim()}`,
    player_name: String(card?.name || 'Carta pack').trim(),
    position: String(card?.position || '').trim().toUpperCase(),
    playing_style: attackStyle
  }

  const starters = (Array.isArray(players) ? players : []).filter((player) => isStarterPlayer(player))
  const phaseStarters = startersForLinkUpVerification(starters, fluid)
  const augmented = [...phaseStarters, virtualCard]

  const linkUps = plays.map((play) => {
    const today = evaluateLinkUpPlay(play, phaseStarters, stylesLookup)
    const withCard = evaluateLinkUpPlay(play, augmented, stylesLookup)
    const todayActivatable = Boolean(today?.activatable)
    const enabledByCard = !todayActivatable && Boolean(withCard?.activatable)
    let partner = null
    if (enabledByCard) {
      const cardInFocal = (withCard.focal_candidates || []).some((item) => String(item?.id) === virtualCard.id)
      const partnerList = cardInFocal ? withCard.key_man_candidates : withCard.focal_candidates
      partner = (partnerList || []).find((item) => String(item?.id) !== virtualCard.id) || null
    }
    return {
      name: play.name,
      verification_status: enabledByCard
        ? 'enabled_by_card'
        : todayActivatable
          ? 'already_activatable'
          : 'not_verified',
      today_activatable: todayActivatable,
      enabled_by_card: enabledByCard,
      partner_name: partner?.name || null,
      partner_position: partner?.position || null
    }
  })

  const verified = linkUps.filter((item) => item.enabled_by_card)
  return {
    status: verified.length ? 'verified' : linkUps.some((item) => item.today_activatable) ? 'already_active' : 'not_verified',
    linkUps
  }
}

/**
 * Linea di reasoning deterministico per la formazione fluida: la stessa carta
 * può occupare uno slot diverso in fase offensiva. '' se fluid spenta (mai
 * menzionarla in quel caso).
 */
export function buildFluidCardReasonLine({ fluidContext, cardPosition, lang = 'it' } = {}) {
  if (!fluidContext?.fluid_enabled) return ''
  const isEn = lang === 'en'
  const isEs = lang === 'es'
  const position = String(cardPosition || '').trim().toUpperCase()
  const attackFormation = fluidContext.formation_attack || fluidContext.formation_base || '?'
  const defenseFormation = fluidContext.formation_defense || fluidContext.formation_base || '?'
  const attackHasRole = fluidContext.attack?.position_present
  const defenseHasRole = fluidContext.defense?.position_present

  if (attackHasRole === true && defenseHasRole === false) {
    return isEn
      ? `Fluid formation active: the ${position} slot exists in your attack shape (${attackFormation}) but not in your defense shape (${defenseFormation}) — judge the card by its attacking-phase role.`
      : isEs
        ? `Formación fluida activa: el rol ${position} existe en tu forma ofensiva (${attackFormation}) pero no en la defensiva (${defenseFormation}) — evalúa la carta por su rol en fase ofensiva.`
        : `Formazione fluida attiva: il ruolo ${position} esiste nel tuo assetto offensivo (${attackFormation}) ma non in quello difensivo (${defenseFormation}) — valuta la carta per il suo ruolo in fase offensiva.`
  }
  if (attackHasRole === false && defenseHasRole === true) {
    return isEn
      ? `Fluid formation active: the ${position} slot exists in your defense shape (${defenseFormation}) but not in your attack shape (${attackFormation}) — judge the card by its defensive-phase role.`
      : isEs
        ? `Formación fluida activa: el rol ${position} existe en tu forma defensiva (${defenseFormation}) pero no en la ofensiva (${attackFormation}) — evalúa la carta por su rol en fase defensiva.`
        : `Formazione fluida attiva: il ruolo ${position} esiste nel tuo assetto difensivo (${defenseFormation}) ma non in quello offensivo (${attackFormation}) — valuta la carta per il suo ruolo in fase difensiva.`
  }
  return isEn
    ? `Fluid formation active: attack shape ${attackFormation}, defense shape ${defenseFormation} — judge the card phase by phase, not only on the base formation.`
    : isEs
      ? `Formación fluida activa: forma ofensiva ${attackFormation}, forma defensiva ${defenseFormation} — evalúa la carta por fases, no solo sobre la formación base.`
      : `Formazione fluida attiva: assetto offensivo ${attackFormation}, assetto difensivo ${defenseFormation} — valuta la carta per fase, non solo sulla formazione base.`
}

/**
 * Motivo d'acquisto Link-up verificato (deterministico). '' se non verificato:
 * in quel caso nessun bonus e nessuna menzione come vantaggio.
 */
export function buildLinkUpPurchaseReason({ linkUpContext, card, lang = 'it' } = {}) {
  const verified = (linkUpContext?.linkUps || []).filter((item) => item.enabled_by_card)
  if (!verified.length) return ''
  const isEn = lang === 'en'
  const isEs = lang === 'es'
  const item = verified[0]
  const partner = item.partner_name || (isEn ? 'a roster starter' : isEs ? 'un titular de tu plantilla' : 'un titolare della tua rosa')
  return isEn
    ? `Verified Link-up: ${card?.name || 'This card'} activates your coach's "${item.name}" together with ${partner} — a concrete purchase reason, checked against your current starters.`
    : isEs
      ? `Link-up verificado: ${card?.name || 'Esta carta'} activa "${item.name}" de tu entrenador junto a ${partner} — un motivo de compra concreto, verificado con tus titulares actuales.`
      : `Link-up verificato: ${card?.name || 'Questa carta'} attiva "${item.name}" del tuo allenatore insieme a ${partner} — un motivo d'acquisto concreto, verificato sui titolari attuali.`
}

/**
 * Nota dual playing style per il reasoning deterministico. 'Basic'/assente in
 * difesa = neutro → nessuna nota (non inventare meccaniche).
 */
export function buildDualStyleNote({ contract, lang = 'it' } = {}) {
  const defense = getPhasePlayingStyle(contract, 'defense')
  if (defense.source !== 'defense') return ''
  const isEn = lang === 'en'
  const isEs = lang === 'es'
  return isEn
    ? `Dual playing style: in the defensive phase the card has a documented "${defense.style}" style.`
    : isEs
      ? `Estilo dual: en fase defensiva la carta tiene un estilo documentado "${defense.style}".`
      : `Stile dual: in fase difensiva la carta ha uno stile documentato "${defense.style}".`
}

/**
 * Blocco dati v6 per il prompt Pro/deep-analysis. NON riscrive il prompt: è un
 * blocco additivo con istruzioni brevi. '' quando non c'è nulla di v6 da dire
 * (fluid spenta E niente dual E niente Link-up coach).
 */
export function buildCardV6PromptBlock({ fluidContext = null, cardContract = null, linkUpContext = null, lang = 'it' } = {}) {
  const isEn = lang === 'en'
  const lines = []
  const fluidOn = Boolean(fluidContext?.fluid_enabled)
  const contract = cardContract && typeof cardContract === 'object' ? cardContract : null
  const defensePhase = contract ? getPhasePlayingStyle(contract, 'defense') : null
  const linkUps = linkUpContext?.linkUps || []

  if (!fluidOn && !contract && linkUps.length === 0) return ''

  lines.push(isEn ? '--- V6 CONTEXT (binding data — brief rules) ---' : '--- CONTESTO V6 (dati vincolanti — regole brevi) ---')

  if (fluidOn) {
    lines.push(isEn
      ? `FLUID FORMATION ACTIVE: base ${fluidContext.formation_base || '?'}, attack ${fluidContext.formation_attack || '?'}, defense ${fluidContext.formation_defense || '?'}. Evaluate the card by its phase role (attack/defense slot), not only on the base formation.`
      : `FORMAZIONE FLUIDA ATTIVA: base ${fluidContext.formation_base || '?'}, attacco ${fluidContext.formation_attack || '?'}, difesa ${fluidContext.formation_defense || '?'}. Valuta la carta per il suo ruolo di fase (slot attacco/difesa), non solo sulla formazione base.`)
  } else {
    lines.push(isEn
      ? 'Fluid formation: OFF. Do NOT mention fluid/phase formations at all.'
      : 'Formazione fluida: NON attiva. NON menzionarla affatto.')
  }

  if (contract) {
    const attack = contract.attack || contract.primary || null
    if (contract.format === 'dual' && defensePhase?.source === 'defense') {
      lines.push(isEn
        ? `DUAL PLAYING STYLE: attack "${attack || '-'}", defense "${defensePhase.style}". In the attacking phase use the attack style, in the defensive phase the defense one.`
        : `PLAYING STYLE DUAL: attacco "${attack || '-'}", difesa "${defensePhase.style}". In fase offensiva usa lo stile di attacco, in fase difensiva quello di difesa.`)
    } else if (contract.format === 'dual' && defensePhase?.defenseNeutral) {
      lines.push(isEn
        ? `DUAL PLAYING STYLE: attack "${attack || '-'}", defense "Basic" = no special defensive style documented. Treat it as neutral: do NOT invent defensive mechanics.`
        : `PLAYING STYLE DUAL: attacco "${attack || '-'}", difesa "Basic" = nessuno stile difensivo speciale documentato. Trattalo come neutro: NON inventare meccaniche difensive.`)
    } else {
      lines.push(isEn
        ? `PLAYING STYLE: single ("${attack || '-'}"), used in both phases.`
        : `PLAYING STYLE: singolo ("${attack || '-'}"), vale per entrambe le fasi.`)
    }
  }

  if (linkUps.length) {
    const enabled = linkUps.filter((item) => item.enabled_by_card)
    if (enabled.length) {
      enabled.forEach((item) => {
        lines.push(isEn
          ? `LINK-UP VERIFIED: this card activates coach Link-up "${item.name}" together with ${item.partner_name || 'a roster starter'}. You MAY cite it as an explicit purchase reason.`
          : `LINK-UP VERIFICATO: questa carta attiva il Link-up "${item.name}" dell'allenatore insieme a ${item.partner_name || 'un titolare della rosa'}. PUOI citarlo come motivo d'acquisto esplicito.`)
      })
    } else {
      lines.push(isEn
        ? 'LINK-UP NOT VERIFIED: no coach Link-up becomes activatable with this card. No bonus, and NEVER mention a Link-up as an advantage.'
        : 'LINK-UP NON VERIFICATO: nessun Link-up del coach diventa attivabile con questa carta. Nessun bonus e MAI citare un Link-up come vantaggio.')
    }
  }

  lines.push(isEn ? '--- END V6 CONTEXT ---' : '--- FINE CONTESTO V6 ---')
  return lines.join('\n')
}

export { getTeamPlaystyleLabel }
