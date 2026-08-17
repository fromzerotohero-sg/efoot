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
import { rolesAreEquivalent } from './formationDefenseRules.js'
import { getPlayingStylesContract, normalizePlayingStyleKey } from './playingStyleResolve.js'
import { isStarterPlayer, parseSlotIndex } from './rosterSlotUtils.js'

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
 * Difesa → contract.defense solo se documentato e non 'Basic'.
 * Contratto DUAL con defense 'Basic' → { style: null, defenseNeutral: true }:
 * la fase difesa NON eredita lo stile di attacco (nessuna meccanica inventata).
 * Legacy single-style (nessun contratto duale) → fallback legacy preservato:
 * lo stile singolo vale per entrambe le fasi.
 *
 * @returns {{ style: string|null, source: 'attack'|'defense'|'attack_fallback'|'defense_neutral'|'none', defenseNeutral: boolean }}
 */
export function getPhasePlayingStyle(contract, phase = 'attack') {
  const resolved = contract && typeof contract === 'object'
    ? contract
    : getPlayingStylesContract(contract)
  const attack = resolved?.attack || resolved?.primary || null
  const rawDefense = resolved?.defense || null
  const isDual = resolved?.format === 'dual'
  const defenseNeutral = isDual && Boolean(rawDefense) && isNeutralDefenseStyle(rawDefense)
  if (phase === 'defense') {
    const defense = rawDefense && !defenseNeutral ? rawDefense : null
    if (defense) return { style: defense, source: 'defense', defenseNeutral }
    if (defenseNeutral) return { style: null, source: 'defense_neutral', defenseNeutral }
    return { style: attack || null, source: attack ? 'attack_fallback' : 'none', defenseNeutral }
  }
  return { style: attack || null, source: attack ? 'attack' : 'none', defenseNeutral }
}

/**
 * Piazzamenti concreti della carta candidata sulla formazione salvata.
 * Ogni placement è uno slot REALE (0-10) il cui ruolo base è compatibile con la
 * posizione nativa della carta secondo le regole già esistenti
 * (rolesAreEquivalent, stessa equivalenza usata da swap/fit: nessuna regola
 * eFootball nuova). Per ogni slot: ruolo base, ruolo di fase ATTACCO e ruolo di
 * fase DIFESA letti dagli slot_positions di quella fase (fallback al base dello
 * stesso slot). TUTTI i placement validi sono mantenuti, mai scelto il primo.
 * Senza formation_layout o senza slot compatibili → placements []: il chiamante
 * deve trattare il contesto come insufficiente e restare sul ragionamento
 * legacy statico. Con Fluid OFF i ruoli di fase coincidono col ruolo base
 * (comportamento legacy invariato).
 *
 * @returns {{ status: 'resolved'|'no_compatible_slot'|'unknown', placements: Array<{
 *   slot_index: number,
 *   base_role: string,
 *   attack_role: string,
 *   defense_role: string,
 *   replaced_player_id: string|null,
 *   replaced_player_name: string|null
 * }> }}
 */
export function resolveCandidatePlacements({ card = null, players = [], fluid = null } = {}) {
  const cardPosition = String(card?.position || '').trim().toUpperCase()
  const baseSlots = fluid?.base?.slot_positions || null
  if (!cardPosition || !baseSlots || typeof baseSlots !== 'object') {
    return { status: 'unknown', placements: [] }
  }
  const fluidOn = Boolean(fluid?.enabled)
  const starterBySlot = new Map()
  for (const player of Array.isArray(players) ? players : []) {
    if (!isStarterPlayer(player)) continue
    starterBySlot.set(parseSlotIndex(player.slot_index), player)
  }
  const placements = []
  for (let slot = 0; slot <= 10; slot += 1) {
    const baseRole = getPhaseSlotPosition(baseSlots, slot)
    if (!baseRole || !rolesAreEquivalent(baseRole, cardPosition)) continue
    const attackRole = fluidOn
      ? getPhaseSlotPosition(fluid.attack?.slot_positions, slot) || baseRole
      : baseRole
    const defenseRole = fluidOn
      ? getPhaseSlotPosition(fluid.defense?.slot_positions, slot) || baseRole
      : baseRole
    const replaced = starterBySlot.get(slot) || null
    placements.push({
      slot_index: slot,
      base_role: baseRole,
      attack_role: attackRole,
      defense_role: defenseRole,
      replaced_player_id: replaced?.id ?? null,
      replaced_player_name: replaced?.player_name ?? null
    })
  }
  return { status: placements.length ? 'resolved' : 'no_compatible_slot', placements }
}

/**
 * Contesto formazione fluida per la carta valutata. Sorgente primaria: i
 * placement concreti (resolveCandidatePlacements) — per ogni slot reale in cui
 * la carta può giocare: ruolo BASE, ruolo ATTACCO e ruolo DIFESA dello STESSO
 * slot (es. slot 4 base TD, attacco CLD, difesa TD → base_role=TD,
 * attack_role=CLD, defense_role=TD). I booleani position_present restano come
 * riepilogo legacy ("esiste uno slot con card.position in questa fase?"), ma i
 * ruoli reali vivono in placements / card_*_role. Placement multipli preservati
 * esplicitamente; nessun placement → ruoli null (contesto insufficiente).
 *
 * @param {{ fluid: object|null, cardPosition?: string, card?: object|null, players?: object[] }} input
 */
export function buildCardFluidContext({ fluid, cardPosition, card = null, players = [] } = {}) {
  const base = fluid?.base || null
  const enabled = Boolean(fluid?.enabled)
  const position = String(cardPosition || card?.position || '').trim().toUpperCase()

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

  const placementCard = card || (position ? { position } : null)
  const { status: placementStatus, placements } = resolveCandidatePlacements({
    card: placementCard,
    players,
    fluid
  })
  const primary = placements[0] || null

  return {
    fluid_enabled: enabled,
    formation_base: base?.formation || null,
    formation_attack: (enabled ? fluid.attack : null)?.formation || base?.formation || null,
    formation_defense: (enabled ? fluid.defense : null)?.formation || base?.formation || null,
    attack: enabled ? phaseInfo(fluid.attack) : null,
    defense: enabled ? phaseInfo(fluid.defense) : null,
    placement_status: placementStatus,
    placements,
    card_base_role: primary?.base_role || null,
    card_attack_role: primary?.attack_role || null,
    card_defense_role: primary?.defense_role || null
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
 * Con Fluid ON la carta NON usa più card.position statico: per ogni placement
 * concreto (resolveCandidatePlacements) la carta virtuale occupa quello slot
 * (sostituendo il titolare dello slot) con posizione = ruolo di fase ATTACCO e
 * stile = playing style di ATTACCO. La carta non può coprire entrambi i membri
 * (l'altro deve essere un titolare reale distinto). Nessun placement concreto
 * → nessuna verifica (mai un falso positivo da posizione statica). Placement
 * multipli: verificato se ALMENO UNO soddisfa tutto; il placement che abilita
 * è riportato (candidate_slot_index / candidate_attack_role). Con Fluid OFF il
 * comportamento legacy è invariato (carta virtuale su card.position).
 *
 * @returns {{ status: 'none'|'verified'|'not_verified'|'already_active', linkUps: object[] }}
 */
export function verifyCardLinkUpPurchase({ coach, players = [], card = {}, cardContract = null, fluid = null, stylesLookup = {} } = {}) {
  const plays = normalizeLinkUpPlays(coach)
  if (!plays.length) return { status: 'none', linkUps: [] }

  const contract = cardContract || getCardPlayingStylesContract(card, card?.style)
  // Link-up = sinergia di costruzione: per la carta vale lo stile di ATTACCO.
  const attackStyle = contract.attack || contract.primary || card?.playing_style || card?.style || ''
  const cardName = String(card?.name || 'Carta pack').trim()
  const buildVirtualCard = (position, slotTag) => ({
    id: `card:${String(card?.name || 'pack').trim()}:${slotTag}`,
    player_name: cardName,
    position: String(position || '').trim().toUpperCase(),
    playing_style: attackStyle
  })

  const starters = (Array.isArray(players) ? players : []).filter((player) => isStarterPlayer(player))
  const phaseStarters = startersForLinkUpVerification(starters, fluid)
  const fluidOn = Boolean(fluid?.enabled)
  const { placements } = fluidOn
    ? resolveCandidatePlacements({ card, players: starters, fluid })
    : { placements: [] }

  const linkUps = plays.map((play) => {
    const today = evaluateLinkUpPlay(play, phaseStarters, stylesLookup)
    const todayActivatable = Boolean(today?.activatable)

    const baseResult = {
      name: play.name,
      today_activatable: todayActivatable,
      enabled_by_card: false,
      partner_name: null,
      partner_position: null,
      candidate_slot_index: null,
      candidate_attack_role: null
    }

    // Fluid ON senza placement concreto → nessuna verifica: la posizione
    // statica della carta non è una prova.
    if (fluidOn && placements.length === 0) {
      return {
        ...baseResult,
        verification_status: todayActivatable ? 'already_activatable' : 'not_verified'
      }
    }

    // Un tentativo per placement concreto (Fluid ON) o un solo tentativo
    // legacy statico (Fluid OFF).
    const attempts = fluidOn
      ? placements.map((placement) => {
          const virtualCard = buildVirtualCard(placement.attack_role, placement.slot_index)
          const squad = [
            ...phaseStarters.filter((player) => parseSlotIndex(player?.slot_index) !== placement.slot_index),
            virtualCard
          ]
          return { placement, virtualCard, squad }
        })
      : [(() => {
          const virtualCard = buildVirtualCard(card?.position, 'static')
          return { placement: null, virtualCard, squad: [...phaseStarters, virtualCard] }
        })()]

    for (const attempt of attempts) {
      const withCard = evaluateLinkUpPlay(play, attempt.squad, stylesLookup)
      if (todayActivatable || !withCard?.activatable) continue
      const cardInFocal = (withCard.focal_candidates || []).some((item) => String(item?.id) === attempt.virtualCard.id)
      const cardInKeyMan = (withCard.key_man_candidates || []).some((item) => String(item?.id) === attempt.virtualCard.id)
      // La carta deve soddisfare uno dei due lati: altrimenti l'attivazione non
      // dipende da lei (non dovrebbe accadere: il resto della squadra è un
      // sottoinsieme dei titolari di oggi).
      if (!cardInFocal && !cardInKeyMan) continue
      const partnerList = cardInFocal ? withCard.key_man_candidates : withCard.focal_candidates
      const partner = (partnerList || []).find((item) => String(item?.id) !== attempt.virtualCard.id) || null
      if (!partner) continue // la carta non può soddisfare entrambi i lati
      return {
        ...baseResult,
        verification_status: 'enabled_by_card',
        enabled_by_card: true,
        partner_name: partner?.name || null,
        partner_position: partner?.position || null,
        candidate_slot_index: attempt.placement ? attempt.placement.slot_index : null,
        candidate_attack_role: attempt.placement ? attempt.placement.attack_role : null
      }
    }

    return {
      ...baseResult,
      verification_status: todayActivatable ? 'already_activatable' : 'not_verified'
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
 * blocco additivo con istruzioni brevi. '' quando non c'è nulla di v6 da dire:
 * emesso SOLO se formazione fluida attiva O contratto dual esplicito O il coach
 * ha Link-up da verificare. Una carta legacy single-style con Fluid OFF e senza
 * Link-up NON produce il blocco (niente rumore v6 nel prompt).
 */
export function buildCardV6PromptBlock({ fluidContext = null, cardContract = null, linkUpContext = null, lang = 'it' } = {}) {
  const isEn = lang === 'en'
  const isEs = lang === 'es'
  const lines = []
  const fluidOn = Boolean(fluidContext?.fluid_enabled)
  const contract = cardContract && typeof cardContract === 'object' ? cardContract : null
  const hasDualContract = contract?.format === 'dual'
  const defensePhase = hasDualContract ? getPhasePlayingStyle(contract, 'defense') : null
  const linkUps = linkUpContext?.linkUps || []

  if (!fluidOn && !hasDualContract && linkUps.length === 0) return ''

  lines.push(
    isEn
      ? '--- V6 CONTEXT (binding data — brief rules) ---'
      : isEs
        ? '--- CONTEXTO V6 (datos vinculantes — reglas breves) ---'
        : '--- CONTESTO V6 (dati vincolanti — regole brevi) ---'
  )

  if (fluidOn) {
    lines.push(isEn
      ? `FLUID FORMATION ACTIVE: base ${fluidContext.formation_base || '?'}, attack ${fluidContext.formation_attack || '?'}, defense ${fluidContext.formation_defense || '?'}. Evaluate the card by its phase role (attack/defense slot), not only on the base formation.`
      : isEs
        ? `FORMACIÓN FLUIDA ACTIVA: base ${fluidContext.formation_base || '?'}, ataque ${fluidContext.formation_attack || '?'}, defensa ${fluidContext.formation_defense || '?'}. Evalúa la carta por su rol de fase (slot ataque/defensa), no solo sobre la formación base.`
        : `FORMAZIONE FLUIDA ATTIVA: base ${fluidContext.formation_base || '?'}, attacco ${fluidContext.formation_attack || '?'}, difesa ${fluidContext.formation_defense || '?'}. Valuta la carta per il suo ruolo di fase (slot attacco/difesa), non solo sulla formazione base.`)
    const placements = Array.isArray(fluidContext?.placements) ? fluidContext.placements : []
    if (placements.length) {
      placements.forEach((placement) => {
        const replaced = placement.replaced_player_name
          ? isEn
            ? `, replacing ${placement.replaced_player_name}`
            : isEs
              ? `, en lugar de ${placement.replaced_player_name}`
              : `, al posto di ${placement.replaced_player_name}`
          : ''
        lines.push(isEn
          ? `CANDIDATE SLOT ${placement.slot_index}: base role ${placement.base_role}, attack role ${placement.attack_role}, defense role ${placement.defense_role}${replaced}. Judge the card in THIS slot phase by phase.`
          : isEs
            ? `SLOT CANDIDATO ${placement.slot_index}: rol base ${placement.base_role}, rol ataque ${placement.attack_role}, rol defensa ${placement.defense_role}${replaced}. Evalúa la carta en ESTE slot fase por fase.`
            : `SLOT CANDIDATO ${placement.slot_index}: ruolo base ${placement.base_role}, ruolo attacco ${placement.attack_role}, ruolo difesa ${placement.defense_role}${replaced}. Valuta la carta in QUESTO slot fase per fase.`)
      })
    } else {
      lines.push(isEn
        ? 'No concrete slot is compatible with this card position: fall back to an honest static evaluation on the card base position only.'
        : isEs
          ? 'Ningún slot concreto es compatible con la posición de esta carta: vuelve a una evaluación estática honesta solo sobre la posición base de la carta.'
          : 'Nessuno slot concreto è compatibile con la posizione di questa carta: valutazione onesta solo sulla posizione base della carta.')
    }
  } else {
    lines.push(isEn
      ? 'Fluid formation: OFF. Do NOT mention fluid/phase formations at all.'
      : isEs
        ? 'Formación fluida: NO activa. NO la menciones en absoluto.'
        : 'Formazione fluida: NON attiva. NON menzionarla affatto.')
  }

  if (contract) {
    const attack = contract.attack || contract.primary || null
    if (hasDualContract && defensePhase?.source === 'defense') {
      lines.push(isEn
        ? `DUAL PLAYING STYLE: attack "${attack || '-'}", defense "${defensePhase.style}". In the attacking phase use the attack style, in the defensive phase the defense one.`
        : isEs
          ? `ESTILO DE JUEGO DUAL: ataque "${attack || '-'}", defensa "${defensePhase.style}". En fase ofensiva usa el estilo de ataque, en fase defensiva el de defensa.`
          : `PLAYING STYLE DUAL: attacco "${attack || '-'}", difesa "${defensePhase.style}". In fase offensiva usa lo stile di attacco, in fase difensiva quello di difesa.`)
    } else if (hasDualContract && defensePhase?.defenseNeutral) {
      lines.push(isEn
        ? `DUAL PLAYING STYLE: attack "${attack || '-'}", defense "Basic" = no special defensive style documented. Treat it as neutral: do NOT invent defensive mechanics.`
        : isEs
          ? `ESTILO DE JUEGO DUAL: ataque "${attack || '-'}", defensa "Basic" = ningún estilo defensivo especial documentado. Trátalo como neutro: NO inventes mecánicas defensivas.`
          : `PLAYING STYLE DUAL: attacco "${attack || '-'}", difesa "Basic" = nessuno stile difensivo speciale documentato. Trattalo come neutro: NON inventare meccaniche difensive.`)
    } else {
      lines.push(isEn
        ? `PLAYING STYLE: single ("${attack || '-'}"), used in both phases.`
        : isEs
          ? `ESTILO DE JUEGO: único ("${attack || '-'}"), vale para ambas fases.`
          : `PLAYING STYLE: singolo ("${attack || '-'}"), vale per entrambe le fasi.`)
    }
  }

  if (linkUps.length) {
    const enabled = linkUps.filter((item) => item.enabled_by_card)
    if (enabled.length) {
      enabled.forEach((item) => {
        const slotDetail = item.candidate_slot_index != null
          ? isEn
            ? ` in slot ${item.candidate_slot_index} (attack role ${item.candidate_attack_role || '?'})`
            : isEs
              ? ` en el slot ${item.candidate_slot_index} (rol ataque ${item.candidate_attack_role || '?'})`
              : ` nello slot ${item.candidate_slot_index} (ruolo attacco ${item.candidate_attack_role || '?'})`
          : ''
        lines.push(isEn
          ? `LINK-UP VERIFIED: this card activates coach Link-up "${item.name}" together with ${item.partner_name || 'a roster starter'}${slotDetail}. You MAY cite it as an explicit purchase reason.`
          : isEs
            ? `LINK-UP VERIFICADO: esta carta activa el Link-up "${item.name}" de tu entrenador junto a ${item.partner_name || 'un titular de tu plantilla'}${slotDetail}. PUEDES citarlo como motivo de compra explícito.`
            : `LINK-UP VERIFICATO: questa carta attiva il Link-up "${item.name}" dell'allenatore insieme a ${item.partner_name || 'un titolare della rosa'}${slotDetail}. PUOI citarlo come motivo d'acquisto esplicito.`)
      })
    } else {
      lines.push(isEn
        ? 'LINK-UP NOT VERIFIED: no coach Link-up becomes activatable with this card. No bonus, and NEVER mention a Link-up as an advantage.'
        : isEs
          ? 'LINK-UP NO VERIFICADO: ningún Link-up del entrenador se vuelve activable con esta carta. Sin bonus y NUNCA cites un Link-up como ventaja.'
          : 'LINK-UP NON VERIFICATO: nessun Link-up del coach diventa attivabile con questa carta. Nessun bonus e MAI citare un Link-up come vantaggio.')
    }
  }

  lines.push(
    isEn
      ? '--- END V6 CONTEXT ---'
      : isEs
        ? '--- FIN CONTEXTO V6 ---'
        : '--- FINE CONTESTO V6 ---'
  )
  return lines.join('\n')
}

export { getTeamPlaystyleLabel }
