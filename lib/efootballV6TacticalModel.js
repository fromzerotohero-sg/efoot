import { playingStylesMatch, getPlayerPhaseStyle } from './playingStyleResolve.js'
import { rolesAreEquivalent } from './formationDefenseRules.js'

const PHASES = new Set(['attack', 'defense'])
const MAX_LINK_UP_PLAYS = 2
const MAX_FORMATION_LENGTH = 50
const MAX_SLOT_JSON_BYTES = 500 * 1024

export function normalizePhase(value) {
  const phase = String(value || '').trim().toLowerCase()
  return PHASES.has(phase) ? phase : null
}

export function isValidPhase(value) {
  return Boolean(normalizePhase(value))
}

export function sanitizeFormationName(value) {
  const name = String(value || '').trim()
  if (!name || name.length > MAX_FORMATION_LENGTH) return null
  return name
}

export function normalizeSlotPositions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  let serialized = ''
  try {
    serialized = JSON.stringify(value)
  } catch {
    return null
  }
  if (serialized.length > MAX_SLOT_JSON_BYTES) return null

  const normalized = {}
  for (let i = 0; i <= 10; i += 1) {
    const raw = value[i] ?? value[String(i)]
    if (!raw || typeof raw !== 'object') return null
    const x = Number(raw.x)
    const y = Number(raw.y)
    const position = String(raw.position || '').trim().toUpperCase()
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100 || !position) {
      return null
    }
    normalized[i] = {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      position: position.slice(0, 12)
    }
  }
  return normalized
}

export function normalizeFormationVariant(row) {
  if (!row) return null
  const phase = normalizePhase(row.phase)
  const formation = sanitizeFormationName(row.formation)
  const slotPositions = normalizeSlotPositions(row.slot_positions)
  if (!phase || !formation || !slotPositions) return null
  return {
    id: row.id || null,
    phase,
    formation,
    slot_positions: slotPositions,
    is_active: row.is_active !== false,
    source_version: row.source_version || 'v6.0.0',
    updated_at: row.updated_at || null
  }
}

export function buildFluidFormationState(baseLayout, rows = []) {
  const byPhase = { attack: null, defense: null }
  for (const row of Array.isArray(rows) ? rows : []) {
    const normalized = normalizeFormationVariant(row)
    if (!normalized) continue
    byPhase[normalized.phase] = normalized
  }
  const enabled = Boolean(byPhase.attack?.is_active && byPhase.defense?.is_active)
  return {
    enabled,
    base: baseLayout ? {
      formation: baseLayout.formation || null,
      slot_positions: baseLayout.slot_positions || null
    } : null,
    attack: byPhase.attack,
    defense: byPhase.defense
  }
}

function cleanText(value, max = 500) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, max) : null
}

function normalizeLinkSide(value) {
  if (!value || typeof value !== 'object') return null
  const playingStyle = cleanText(value.playing_style, 120)
  const position = cleanText(value.position, 40)
  if (!playingStyle && !position) return null
  return {
    playing_style: playingStyle,
    position
  }
}

export function normalizeLinkUpPlay(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const name = cleanText(value.name, 180)
  const description = cleanText(value.description, 1200)
  const focalPoint = normalizeLinkSide(value.focal_point || value.centerpiece)
  const keyMan = normalizeLinkSide(value.key_man)
  if (!name && !focalPoint && !keyMan) return null
  return {
    name: name || 'Link-up Play',
    description,
    focal_point: focalPoint,
    key_man: keyMan
  }
}

export function normalizeLinkUpPlays(source) {
  if (!source) return []
  const extracted = source.extracted_data && typeof source.extracted_data === 'object'
    ? source.extracted_data
    : {}
  const candidates = []

  if (Array.isArray(extracted.link_up_plays)) candidates.push(...extracted.link_up_plays)
  else if (Array.isArray(extracted.connections)) candidates.push(...extracted.connections)

  if (Array.isArray(source.link_up_plays)) candidates.push(...source.link_up_plays)
  if (Array.isArray(source.connection)) candidates.push(...source.connection)
  else if (source.connection && typeof source.connection === 'object') candidates.push(source.connection)

  const normalized = []
  const seen = new Set()
  for (const candidate of candidates) {
    const item = normalizeLinkUpPlay(candidate)
    if (!item) continue
    const key = [item.name, item.focal_point?.playing_style, item.focal_point?.position, item.key_man?.playing_style, item.key_man?.position]
      .filter(Boolean)
      .join('|')
      .toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(item)
    if (normalized.length >= MAX_LINK_UP_PLAYS) break
  }
  return normalized
}

export function validateLinkUpPlays(value) {
  if (!Array.isArray(value)) return { valid: false, items: [], error: 'link_up_plays must be an array' }
  if (value.length > MAX_LINK_UP_PLAYS) return { valid: false, items: [], error: 'Maximum 2 Link-up Plays' }
  const items = value.map(normalizeLinkUpPlay).filter(Boolean)
  if (items.length !== value.length) return { valid: false, items: [], error: 'Invalid Link-up Play data' }
  return { valid: true, items, error: null }
}

function positionAliases(position) {
  const p = String(position || '').trim().toUpperCase()
  const map = {
    GK: ['GK', 'PT'], PT: ['PT', 'GK'],
    CB: ['CB', 'DC'], DC: ['DC', 'CB'],
    RB: ['RB', 'TD', 'ETD'], TD: ['TD', 'RB', 'ETD'], ETD: ['ETD', 'TD', 'RB'],
    LB: ['LB', 'TS', 'ETS'], TS: ['TS', 'LB', 'ETS'], ETS: ['ETS', 'TS', 'LB'],
    DMF: ['DMF', 'MED'], MED: ['MED', 'DMF'],
    CMF: ['CMF', 'CC'], CC: ['CC', 'CMF'],
    AMF: ['AMF', 'TRQ'], TRQ: ['TRQ', 'AMF'],
    RMF: ['RMF', 'CLD'], CLD: ['CLD', 'RMF'],
    LMF: ['LMF', 'CLS'], CLS: ['CLS', 'LMF'],
    RWF: ['RWF', 'EDA'], EDA: ['EDA', 'RWF'],
    LWF: ['LWF', 'ESA'], ESA: ['ESA', 'LWF'],
    SS: ['SS', 'SP'], SP: ['SP', 'SS'],
    CF: ['CF', 'P'], P: ['P', 'CF']
  }
  return new Set(map[p] || [p])
}

function playerStyleName(player, stylesLookup = {}) {
  return String(stylesLookup[player?.playing_style_id] || player?.playing_style || player?.role || '').trim()
}

function isCompleteLinkSide(side) {
  return Boolean(side?.playing_style && side?.position)
}

function playerIdentity(player) {
  return String(player?.id || player?.player_name || '').trim()
}

function compactSlotLine(slotPositions) {
  const parts = []
  for (let i = 0; i <= 10; i += 1) {
    const slot = slotPositions?.[i] ?? slotPositions?.[String(i)]
    if (!slot || typeof slot !== 'object') {
      parts.push(`${i}:?`)
      continue
    }
    const position = String(slot.position || '?').trim().toUpperCase() || '?'
    const x = Number.isFinite(Number(slot.x)) ? Math.round(Number(slot.x)) : '?'
    const y = Number.isFinite(Number(slot.y)) ? Math.round(Number(slot.y)) : '?'
    parts.push(`${i}:${position}(${x},${y})`)
  }
  return parts.join(' | ')
}

function relevantSlotDiffs(fromSlots, toSlots) {
  if (!fromSlots || !toSlots) return []
  const diffs = []
  for (let i = 0; i <= 10; i += 1) {
    const from = fromSlots[i] ?? fromSlots[String(i)]
    const to = toSlots[i] ?? toSlots[String(i)]
    if (!from && !to) continue
    const fromPos = String(from?.position || '?').trim().toUpperCase() || '?'
    const toPos = String(to?.position || '?').trim().toUpperCase() || '?'
    const fromX = Number.isFinite(Number(from?.x)) ? Math.round(Number(from.x)) : null
    const fromY = Number.isFinite(Number(from?.y)) ? Math.round(Number(from.y)) : null
    const toX = Number.isFinite(Number(to?.x)) ? Math.round(Number(to.x)) : null
    const toY = Number.isFinite(Number(to?.y)) ? Math.round(Number(to.y)) : null
    const moved = (fromX != null && toX != null && Math.abs(fromX - toX) >= 2)
      || (fromY != null && toY != null && Math.abs(fromY - toY) >= 2)
    if (fromPos !== toPos || moved) {
      diffs.push(`slot ${i}: ${fromPos}(${fromX ?? '?'},${fromY ?? '?'}) → ${toPos}(${toX ?? '?'},${toY ?? '?'})`)
    }
  }
  return diffs
}

function compactPlayersLine(players) {
  if (!Array.isArray(players) || players.length === 0) return null
  return players.slice(0, 11).map((player) => {
    const slot = player?.slot_index ?? '?'
    const position = player?.position || '?'
    const name = player?.player_name || '?'
    return `${slot}:${position}:${name}`
  }).join(' | ')
}

function compactVisualProfile(profile) {
  if (!profile || typeof profile !== 'object') return null
  const bits = []
  if (profile.central_density) bits.push(`centro=${profile.central_density}`)
  if (profile.width_profile) bits.push(`ampiezza=${profile.width_profile}`)
  if (profile.side_bias) bits.push(`lato=${profile.side_bias}`)
  if (Array.isArray(profile.attackable_zones) && profile.attackable_zones.length) {
    bits.push(`zone attaccabili=${profile.attackable_zones.slice(0, 4).join(',')}`)
  }
  if (Array.isArray(profile.defensive_gaps) && profile.defensive_gaps.length) {
    bits.push(`buchi=${profile.defensive_gaps.slice(0, 4).join(',')}`)
  }
  return bits.length ? bits.join('; ') : null
}

function formatPhaseDisposition(label, phase, { extra = false } = {}) {
  if (!phase) return [`${label}: non disponibile`]
  const lines = [
    `${label}:`,
    `- formation: ${phase.formation || 'non disponibile'}`,
    `- slot_positions 0-10: ${compactSlotLine(phase.slot_positions)}`
  ]
  if (extra) {
    const players = compactPlayersLine(phase.players)
    if (players) lines.push(`- players: ${players}`)
    const visual = compactVisualProfile(phase.visual_tactical_profile)
    if (visual) lines.push(`- visual_tactical_profile: ${visual}`)
  }
  return lines
}

export function evaluateLinkUpPlay(play, starters = [], stylesLookup = {}) {
  const normalized = normalizeLinkUpPlay(play)
  if (!normalized) return null

  const matchSide = (requirement) => {
    if (!isCompleteLinkSide(requirement)) return []
    const requiredPositions = String(requirement.position)
      .split(/[\/,]/)
      .map((value) => value.trim())
      .filter(Boolean)
    const requiredStyle = requirement.playing_style

    return (Array.isArray(starters) ? starters : []).filter((player) => {
      const positionOk = requiredPositions.some((req) => {
        const aliases = positionAliases(req)
        return aliases.has(String(player?.position || '').trim().toUpperCase())
      })
      const playerStyle = playerStyleName(player, stylesLookup)
      return positionOk && playingStylesMatch(playerStyle, requiredStyle)
    })
  }

  if (!isCompleteLinkSide(normalized.focal_point) || !isCompleteLinkSide(normalized.key_man)) {
    return {
      ...normalized,
      activatable: false,
      verification_status: 'insufficient_data',
      focal_candidates: [],
      key_man_candidates: []
    }
  }

  const focalCandidates = matchSide(normalized.focal_point)
  const keyManCandidates = matchSide(normalized.key_man)
  const hasDistinctPair = focalCandidates.some((focal) =>
    keyManCandidates.some((keyMan) => {
      const left = playerIdentity(focal)
      const right = playerIdentity(keyMan)
      return Boolean(left && right && left !== right)
    })
  )
  const activatable = focalCandidates.length > 0 && keyManCandidates.length > 0 && hasDistinctPair

  return {
    ...normalized,
    activatable,
    verification_status: activatable ? 'activatable' : 'not_activatable',
    focal_candidates: focalCandidates.map((player) => ({ id: player.id, name: player.player_name, position: player.position })),
    key_man_candidates: keyManCandidates.map((player) => ({ id: player.id, name: player.player_name, position: player.position }))
  }
}

export function shouldOmitFluidFormationRecommendation(clientFluid, opponentFluid) {
  return clientFluid?.enabled === false && !opponentFluid?.defense
}

export function getPhaseSlotPosition(slotPositions, slotIndex) {
  if (!slotPositions || typeof slotPositions !== 'object') return null
  const slot = slotPositions[slotIndex] ?? slotPositions[String(slotIndex)]
  const position = slot?.position ? String(slot.position).trim() : ''
  return position || null
}

export function getFluidCardRoleLabel({ fluidEnabled, isEditMode, slotPosition, playerPosition }) {
  const slot = slotPosition ? String(slotPosition).trim() : ''
  const player = playerPosition ? String(playerPosition).trim() : ''
  if (fluidEnabled) return slot || player || '-'
  if (isEditMode) return slot || player || '-'
  return player || slot || '-'
}

function normalizeCompetenceFit(value) {
  const raw = String(value || 'Alta').trim()
  const key = raw.toLowerCase()
  if (key.startsWith('inter')) return { fit: 'intermedia', competence: 'Intermedia' }
  if (key.startsWith('bass') || key === 'low') return { fit: 'bassa', competence: 'Bassa' }
  return { fit: 'alta', competence: 'Alta' }
}

export function getPhasePositionFit(slotPosition, originalPositions) {
  const slot = slotPosition ? String(slotPosition).trim() : ''
  if (!slot) return { fit: 'unknown', competence: null }
  const originals = Array.isArray(originalPositions) ? originalPositions : []
  const found = originals.find((entry) => {
    const position = typeof entry === 'string' ? entry : entry?.position
    return Boolean(position && rolesAreEquivalent(position, slot))
  })
  if (!found) return { fit: 'fuori_ruolo', competence: null }
  if (typeof found === 'string') return { fit: 'alta', competence: 'Alta' }
  return normalizeCompetenceFit(found.competence)
}

export function getPhasePositionFitLabel(fit, lang = 'it') {
  if (fit === 'fuori_ruolo') return lang === 'en' ? 'Out of role' : lang === 'es' ? 'Fuera de rol' : 'Fuori ruolo'
  if (fit === 'intermedia') return lang === 'en' ? 'Intermediate' : lang === 'es' ? 'Intermedia' : 'Intermedia'
  if (fit === 'bassa') return lang === 'en' ? 'Low' : lang === 'es' ? 'Baja' : 'Bassa'
  if (fit === 'alta') return lang === 'en' ? 'High' : lang === 'es' ? 'Alta' : 'Alta'
  return ''
}

/**
 * Slot della fase, con fallback prudente alla formazione base solo per quello slot.
 * Non inventa x/y/position se mancano in entrambe le fonti.
 */
export function resolvePhaseSlot(phaseSlots, baseSlots, slotIndex) {
  const read = (slots) => {
    if (!slots || typeof slots !== 'object') return null
    const raw = slots[slotIndex] ?? slots[String(slotIndex)]
    if (!raw || typeof raw !== 'object') return null
    const position = String(raw.position || '').trim()
    const x = Number(raw.x)
    const y = Number(raw.y)
    if (!position && !Number.isFinite(x) && !Number.isFinite(y)) return null
    return {
      position: position || null,
      x: Number.isFinite(x) ? x : null,
      y: Number.isFinite(y) ? y : null
    }
  }
  const phase = read(phaseSlots)
  if (phase) return { ...phase, source: 'phase' }
  const base = read(baseSlots)
  if (base) return { ...base, source: 'base' }
  return null
}

function coordLabel(value) {
  return Number.isFinite(Number(value)) ? String(Math.round(Number(value) * 100) / 100) : '?'
}

function formatPhaseRosterLines(label, phase, starterBySlot, baseSlots, lang) {
  const lines = [`${label}:`, `- modulo: ${phase?.formation || 'non disponibile'}`]
  for (let i = 0; i <= 10; i += 1) {
    const player = starterBySlot.get(i)
    const resolved = resolvePhaseSlot(phase?.slot_positions, baseSlots, i)
    if (!player && !resolved) continue
    const name = player?.player_name || '?'
    const role = resolved?.position || player?.position || '?'
    const fit = player ? getPhasePositionFit(role, player.original_positions) : { fit: 'unknown' }
    const fitLabel = getPhasePositionFitLabel(fit.fit, lang)
    const fitPart = fitLabel ? ` — ${fitLabel}` : ''
    lines.push(`  slot ${i}: ${name} — ${role}${fitPart} (${coordLabel(resolved?.x)}, ${coordLabel(resolved?.y)})`)
  }
  return lines
}

const FLUID_EVIDENCE_RE = /fasce|fascia|transizion|ampiezza|wide|wing|flank|copertura|coverage|compattezz|compact|esterni|terzin|full-?back|sovraccaric|ripartenz|attacco.+difesa|difesa.+attacco|ataque.+defensa|defensa.+ataque|attack.+defen|defen.+attack/i

export function hasMotivatedFluidEvaluationEvidence(evidence = {}) {
  const blobs = [
    ...(Array.isArray(evidence.recurringIssues) ? evidence.recurringIssues.map((item) => item?.issue ?? item) : []),
    ...(Array.isArray(evidence.problems) ? evidence.problems : []),
    ...(Array.isArray(evidence.feedbackRows) ? evidence.feedbackRows.map((row) => JSON.stringify(row?.insights || row || '')) : []),
    evidence.gameAnalysis ? JSON.stringify(evidence.gameAnalysis) : '',
    evidence.matchDerived || '',
    evidence.attackAreas || ''
  ].join(' ')
  return FLUID_EVIDENCE_RE.test(blobs)
}

export function getFluidAdviceDirective({ enabled = false, evidenceOk = false, lang = 'it' } = {}) {
  if (enabled) {
    if (lang === 'en') return 'FLUID FORMATION: already ACTIVE. Recognise it. Evaluate ATTACK and DEFENCE separately (phase roles, out of role, coverage, width, compactness, team style, coach, Link-up). Do NOT say "turn Fluid on". Do not change formation_layout.'
    if (lang === 'es') return 'FORMACIÓN FLUIDA: ya ACTIVA. Reconócela. Evalúa ATAQUE y DEFENSA por separado (roles de fase, fuera de rol, coberturas, amplitud, compactación, estilo de equipo, entrenador, Link-up). NO digas "activa Fluid". No cambies formation_layout.'
    return 'FORMAZIONE FLUIDA: già ATTIVA. Riconoscila. Valuta ATTACCO e DIFESA separatamente (ruoli fase, fuori ruolo, coperture, ampiezza, compattezza, stile squadra, allenatore, Link-up). NON dire "attiva la formazione fluida". Non cambiare formation_layout.'
  }
  if (evidenceOk) {
    if (lang === 'en') return 'FLUID FORMATION: OFF. You MAY suggest evaluating Fluid Formation only because real data show a different attack vs defence need. Motivate it. Forbidden: "Turn Fluid on, it is better." Do not propose a new base module or change formation_layout unless asked.'
    if (lang === 'es') return 'FORMACIÓN FLUIDA: NO ACTIVA. PUEDES sugerir EVALUARLA solo porque los datos reales muestran una necesidad distinta entre ataque y defensa. Motívalo. Prohibido: "Activa Fluid, es mejor." No propongas un módulo base nuevo ni cambies formation_layout si no te lo piden.'
    return 'FORMAZIONE FLUIDA: NON ATTIVA. Puoi suggerire di VALUTARLA solo perché i dati reali mostrano un bisogno diverso tra attacco e difesa. Motiva il consiglio. Vietato: "Attiva Fluid, è migliore." Non proporre un nuovo modulo base né cambiare formation_layout se il cliente non lo chiede.'
  }
  if (lang === 'en') return 'FLUID FORMATION: OFF. No attack/defence mismatch evidence in the data. Do NOT suggest Fluid Formation. Do not propose a new base module or change formation_layout unless asked.'
  if (lang === 'es') return 'FORMACIÓN FLUIDA: NO ACTIVA. No hay evidencia de desajuste ataque/defensa en los datos. NO sugieras Formación fluida. No propongas un módulo base nuevo ni cambies formation_layout si no te lo piden.'
  return 'FORMAZIONE FLUIDA: NON ATTIVA. Nessuna evidenza di mismatch attacco/difesa nei dati. NON suggerire la Formazione fluida. Non proporre un nuovo modulo base né cambiare formation_layout se il cliente non lo chiede.'
}

/**
 * Contesto Hero/Diagnostic: formazione base + due fasi reali con ruoli slot, non player.position.
 * Non muta roster né formation_layout.
 */
export function formatHeroFluidContext({ fluid, starters = [], lang = 'it' } = {}) {
  const starterBySlot = new Map()
  for (const player of Array.isArray(starters) ? starters : []) {
    if (player?.slot_index == null) continue
    const slot = Number(player.slot_index)
    if (!Number.isInteger(slot) || slot < 0 || slot > 10) continue
    starterBySlot.set(slot, player)
  }
  const base = fluid?.base || null
  const baseFormation = base?.formation || (lang === 'en' ? 'not set' : lang === 'es' ? 'no establecida' : 'non impostata')
  const lines = [`FORMAZIONE BASE: ${baseFormation}`]
  if (!fluid?.enabled) {
    lines.push('FORMAZIONE FLUIDA: NON ATTIVA')
    return lines.join('\n')
  }
  lines.push('FORMAZIONE FLUIDA: ATTIVA')
  lines.push(...formatPhaseRosterLines('ATTACCO', fluid.attack, starterBySlot, base?.slot_positions, lang))
  lines.push(...formatPhaseRosterLines('DIFESA', fluid.defense, starterBySlot, base?.slot_positions, lang))
  const diffs = relevantSlotDiffs(fluid.attack?.slot_positions, fluid.defense?.slot_positions)
  if (diffs.length) {
    lines.push(`- Differenze ATTACCO vs DIFESA (stesso nome modulo non implica stessa disposizione): ${diffs.join('; ')}`)
  } else {
    lines.push('- Differenze ATTACCO vs DIFESA: nessuna differenza di slot rilevata nei dati.')
  }
  return lines.join('\n')
}

export function buildHeroFluidPromptBlock({ fluid, starters = [], lang = 'it', evidence = {} } = {}) {
  const enabled = Boolean(fluid?.enabled)
  const evidenceOk = !enabled && hasMotivatedFluidEvaluationEvidence(evidence)
  return [
    formatHeroFluidContext({ fluid, starters, lang }),
    getFluidAdviceDirective({ enabled, evidenceOk, lang })
  ].join('\n')
}

/**
 * Overlay LIVE per Hero: lo stato fluido letto ora da formation_variants
 * prevale su un riassunto diagnostico in cache che può ancora dire ATTIVA/NON ATTIVA.
 * Non muta roster né formation_layout.
 */
export function prependLiveFluidOverride(cachedContext, liveFluidText, lang = 'it') {
  const live = String(liveFluidText || '').trim()
  const cached = String(cachedContext || '')
  if (!live) return cached
  const notice = lang === 'en'
    ? 'This LIVE Fluid Formation status overrides any Fluid status in the summary below.'
    : lang === 'es'
      ? 'Este estado LIVE de Formación fluida prevalece sobre cualquier estado Fluida del resumen siguiente.'
      : 'Questo stato LIVE della Formazione fluida prevale su qualsiasi stato Fluida nel riassunto sotto.'
  return `[AGGIORNAMENTO LIVE]\n${live}\n${notice}\n\n${cached}`.trim()
}

/**
 * Link-up è una sinergia di costruzione: con Fluid ON la posizione pertinente è la fase ATTACCO.
 * Copia i titolari; non muta player.position salvato. Slot fase mancante → fallback base di quello slot.
 */
export function startersForLinkUpVerification(starters = [], fluid = null) {
  const list = Array.isArray(starters) ? starters : []
  if (!fluid?.enabled) return list
  return list.map((player) => {
    const resolved = resolvePhaseSlot(
      fluid.attack?.slot_positions,
      fluid.base?.slot_positions,
      player?.slot_index
    )
    if (!resolved?.position) return player
    return { ...player, position: resolved.position }
  })
}

export function buildPhaseMatchupContext({ clientFluid, opponentFluid }) {
  const clientBase = clientFluid?.base || null
  const clientAttack = clientFluid?.enabled && clientFluid.attack ? clientFluid.attack : clientBase
  const clientDefense = clientFluid?.enabled && clientFluid.defense ? clientFluid.defense : clientBase

  const opponentBase = opponentFluid?.base || null
  const opponentAttack = opponentFluid?.attack || opponentBase
  const opponentDefense = opponentFluid?.defense || opponentBase

  return {
    client_attack: clientAttack,
    client_defense: clientDefense,
    opponent_attack: opponentAttack,
    opponent_defense: opponentDefense,
    pairings: {
      when_client_attacks: {
        client: clientAttack,
        opponent: opponentDefense
      },
      when_client_defends: {
        client: clientDefense,
        opponent: opponentAttack
      }
    }
  }
}

export function formatFluidFormationForPrompt(fluid, label = 'CLIENTE') {
  if (!fluid) return `${label}: dati formazione non disponibili.`
  const lines = [`${label}:`]
  if (fluid.enabled) {
    lines.push('- Formazione fluida: ATTIVA')
    lines.push(...formatPhaseDisposition(`${label} BASE`, fluid.base))
    lines.push(...formatPhaseDisposition(`${label} ATTACCO`, fluid.attack || fluid.base))
    lines.push(...formatPhaseDisposition(`${label} DIFESA`, fluid.defense || fluid.base))
    const diffs = relevantSlotDiffs(
      (fluid.attack || fluid.base)?.slot_positions,
      (fluid.defense || fluid.base)?.slot_positions
    )
    if (diffs.length) {
      lines.push(`- Differenze ATTACCO vs DIFESA (stesso nome modulo non implica stessa disposizione): ${diffs.join('; ')}`)
    }
  } else {
    lines.push('- Formazione fluida: NO')
    lines.push(...formatPhaseDisposition(`${label} BASE`, fluid.base))
  }
  return lines.join('\n')
}

export function opponentFluidFromRow(row) {
  const extracted = row?.extracted_data && typeof row.extracted_data === 'object' ? row.extracted_data : {}
  const fluid = extracted.fluid_formation && typeof extracted.fluid_formation === 'object'
    ? extracted.fluid_formation
    : null
  const base = {
    formation: row?.formation_name || extracted.formation || null,
    slot_positions: extracted.slot_positions || null,
    players: Array.isArray(row?.players) && row.players.length
      ? row.players
      : (Array.isArray(extracted.players) ? extracted.players : []),
    visual_tactical_profile: extracted.visual_tactical_profile || null,
    playing_style: row?.playing_style || extracted.playing_style || null
  }
  if (!fluid) {
    return { base, attack: base, defense: null, fluid_detected: null, movement_summary: [] }
  }
  return {
    base,
    attack: fluid.attack || base,
    defense: fluid.defense || null,
    fluid_detected: fluid.fluid_detected ?? null,
    movement_summary: Array.isArray(fluid.movement_summary) ? fluid.movement_summary.slice(0, 12) : []
  }
}

function formationLabel(value) {
  return value?.formation || 'non disponibile'
}

export function formatPhaseMatchupForPrompt({ clientFluid, opponentFluid, matchup, linkUps, clientStarters, stylesLookup } = {}) {
  const hasLinkUps = Array.isArray(linkUps) && linkUps.length > 0
  // Nessun dato v6 → nessun blocco "non disponibile": il chiamante omette la sezione.
  if (!clientFluid && !opponentFluid && !matchup && !hasLinkUps) return ''

  const clientAttack = matchup?.pairings?.when_client_attacks?.client || (clientFluid?.enabled ? clientFluid.attack : clientFluid?.base) || clientFluid?.base
  const clientDefense = matchup?.pairings?.when_client_defends?.client || (clientFluid?.enabled ? clientFluid.defense : clientFluid?.base) || clientFluid?.base
  const opponentAttack = matchup?.pairings?.when_client_defends?.opponent || opponentFluid?.attack || opponentFluid?.base
  const opponentDefense = opponentFluid?.defense || null
  const opponentDefenseForPairing = matchup?.pairings?.when_client_attacks?.opponent || opponentDefense || opponentAttack

  const lines = ['\nFORMAZIONE FLUIDA E INCROCIO ATTACCO/DIFESA:']
  lines.push(`- Cliente formazione fluida: ${clientFluid?.enabled ? 'ATTIVA' : 'NO (usa la formazione normale in attacco e in difesa)'}`)
  lines.push(...formatPhaseDisposition('CLIENTE BASE', clientFluid?.base))
  lines.push(...formatPhaseDisposition('CLIENTE ATTACCO', clientAttack))
  lines.push(...formatPhaseDisposition('CLIENTE DIFESA', clientDefense))
  const clientDiffs = relevantSlotDiffs(clientAttack?.slot_positions, clientDefense?.slot_positions)
  if (clientDiffs.length) {
    lines.push(`- Differenze cliente ATTACCO vs DIFESA (anche se il nome modulo è identico): ${clientDiffs.join('; ')}`)
  } else if (clientFluid?.enabled) {
    lines.push('- Differenze cliente ATTACCO vs DIFESA: nessuna differenza di slot rilevata nei dati.')
  }

  lines.push(`- Avversario formazione fluida: ${opponentDefense ? 'SÌ (due schermate)' : 'NO'}`)
  lines.push(...formatPhaseDisposition('AVVERSARIO ATTACCO', opponentAttack, { extra: true }))
  if (opponentDefense) {
    lines.push(...formatPhaseDisposition('AVVERSARIO DIFESA', opponentDefense, { extra: true }))
    const opponentDiffs = relevantSlotDiffs(opponentAttack?.slot_positions, opponentDefense?.slot_positions)
    if (opponentDiffs.length) {
      lines.push(`- Differenze avversario ATTACCO vs DIFESA (anche se il nome modulo è identico): ${opponentDiffs.join('; ')}`)
    } else {
      lines.push('- Differenze avversario ATTACCO vs DIFESA: nessuna differenza di slot rilevata nei dati.')
    }
  } else {
    lines.push('- AVVERSARIO DIFESA: NON FORNITA. NON inventare una seconda disposizione. Usa la formazione visibile come unica forma avversaria.')
  }
  if (Array.isArray(opponentFluid?.movement_summary) && opponentFluid.movement_summary.length) {
    lines.push(`- Movimenti letti: ${opponentFluid.movement_summary.slice(0, 8).join('; ')}`)
  }

  lines.push('REGOLA INCROCIO (obbligatoria):')
  lines.push(`1. Quando il cliente ATTACCA: nostro ATTACCO vs loro DIFESA. Nostro ATTACCO=${formationLabel(clientAttack)} | Loro DIFESA=${formationLabel(opponentDefenseForPairing)}${opponentDefense ? '' : ' (unica formazione visibile, non inventata)'}.`)
  lines.push(`2. Quando il cliente DIFENDE: loro ATTACCO vs nostra DIFESA. Loro ATTACCO=${formationLabel(opponentAttack)} | Nostra DIFESA=${formationLabel(clientDefense)}.`)
  lines.push('Se due fasi hanno lo stesso nome modulo ma slot_positions diversi, trattale come due disposizioni differenti.')

  const phaseStarters = Array.isArray(clientStarters) ? clientStarters : []
  if (phaseStarters.length) {
    const lookup = stylesLookup && typeof stylesLookup === 'object' ? stylesLookup : {}
    const attackStyles = phaseStarters.map((player) =>
      `${player?.player_name || '?'}: ${getPlayerPhaseStyle(player, 'attack', lookup) || '-'}`)
    const defenseStyles = phaseStarters.map((player) =>
      `${player?.player_name || '?'}: ${getPlayerPhaseStyle(player, 'defense', lookup) || 'nessuno stile difensivo speciale'}`)
    lines.push('STILI GIOCATORI CLIENTE PER FASE (dual playing styles v6; senza dato duale vale lo stile singolo della card):')
    lines.push(`- Quando il cliente ATTACCA (nostro ATTACCO vs loro DIFESA): ${attackStyles.join(' | ')}`)
    lines.push(`- Quando il cliente DIFENDE (nostra DIFESA vs loro ATTACCO): ${defenseStyles.join(' | ')}`)
    lines.push('- "Basic" in difesa = nessuno Playing Style difensivo speciale documentato dalla sorgente; non inferire meccaniche, effetti né stili.')
  }

  if (Array.isArray(linkUps) && linkUps.length) {
    lines.push('\nCOLLEGAMENTI ALLENATORE CLIENTE (fino a 2, indipendenti):')
    linkUps.forEach((play, index) => {
      const status = play.verification_status || (play.activatable ? 'activatable' : 'not_activatable')
      const statusLabel = status === 'activatable'
        ? 'attivabile'
        : status === 'insufficient_data'
          ? 'dati insufficienti per verificarlo'
          : 'non attivabile con questi titolari'
      lines.push(`- ${index + 1}. ${play.name || 'Collegamento'}: ${statusLabel}`)
      if (play.focal_point) {
        const names = (play.focal_candidates || []).map((item) => item.name).filter(Boolean).join(', ')
        lines.push(`  Punto focale: ${play.focal_point.playing_style || '-'} (${play.focal_point.position || '-'}) → ${status === 'insufficient_data' ? 'non verificabile' : (names || 'nessun titolare compatibile')}`)
      }
      if (play.key_man) {
        const names = (play.key_man_candidates || []).map((item) => item.name).filter(Boolean).join(', ')
        lines.push(`  Uomo chiave: ${play.key_man.playing_style || '-'} (${play.key_man.position || '-'}) → ${status === 'insufficient_data' ? 'non verificabile' : (names || 'nessun titolare compatibile')}`)
      }
    })
    lines.push('- Valuta ogni Collegamento separatamente. Non dire che si attivano insieme se i titolari non coprono entrambi i ruoli distinti.')
    lines.push('- Se i dati sono insufficienti, NON trattarlo come incompatibile e NON inventare Punto focale/Uomo chiave.')
  }
  return lines.join('\n')
}
