// Pure helpers for PrematchPitch — no JSX, no React.

export const POSITION_ALIASES = {
  GK: 'PT', PT: 'PT', CB: 'DC', DC: 'DC', RB: 'TD', TD: 'TD', LB: 'TS', TS: 'TS',
  DMF: 'MED', MED: 'MED', CMF: 'CC', CC: 'CC', AMF: 'TRQ', TRQ: 'TRQ',
  RMF: 'CLD', CLD: 'CLD', LMF: 'CLS', CLS: 'CLS', RWF: 'EDA', EDA: 'EDA',
  LWF: 'ESA', ESA: 'ESA', SS: 'SP', SP: 'SP', CF: 'P', P: 'P'
}

export function normalizePos(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!raw) return ''
  return POSITION_ALIASES[raw] || raw
}

export function nameKey(value) {
  return String(value || '')
    .toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

export function asText(value, lang = 'it') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object') return String(value[lang] || value.it || value.en || value.es || '').trim()
  return String(value).trim()
}

export function roleGroup(pos) {
  const p = normalizePos(pos)
  if (p === 'PT' || p === 'GK') return 'gk'
  if (['DC', 'TD', 'TS', 'CB', 'RB', 'LB'].includes(p)) return 'def'
  if (['EDA', 'ESA', 'SP', 'P', 'CF', 'RWF', 'LWF', 'SS'].includes(p)) return 'att'
  if (['MED', 'CC', 'TRQ', 'CLD', 'CLS', 'DMF', 'CMF', 'AMF', 'RMF', 'LMF'].includes(p)) return 'mid'
  return 'mid'
}

export function displayName(name) {
  const raw = String(name || '').trim()
  if (!raw) return ''
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]
  return parts.slice(1).join(' ') || parts[0]
}

export function shortInstruction(raw, lang) {
  const text = asText(raw, lang)
  if (!text) return ''
  const key = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const map = {
    ancoraggio: 'Anc', anchoring: 'Anc', offensivo: 'Off', offensive: 'Off',
    difensivo: 'Dif', defensive: 'Dif', marcatura_stretta: 'MS',
    'marcatura stretta': 'MS', marcatura_uomo: 'MU', 'marcatura a uomo': 'MU',
    contropiede: 'CP', linea_bassa: 'LB', 'linea bassa': 'LB',
    linea_alta: 'LA', 'linea alta': 'LA', pressing: 'PRS', pressing_alto: 'PA',
    'pressing alto': 'PA', pressing_basso: 'PB', 'pressing basso': 'PB',
    ampiezza: 'AMP', larghezza: 'AMP', width: 'AMP',
    profondita: 'PROF', depth: 'PROF', scambio: 'SCA', overlap: 'OVL'
  }
  const compact = key.replace(/\s+/g, '_')
  return map[key] || map[compact] || text.slice(0, 10)
}

// Maps an individual instruction to a movement vector (in % of pitch).
// Returns null if no movement is implied.
export function instructionMovement(raw, lang) {
  const text = asText(raw, lang).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  if (!text) return null
  const rules = [
    { re: /(spinta|push up|salire|aggredire|avanza|attacca|profond)/, dx: 0, dy: -14, label: 'Avanza' },
    { re: /(abbassa|scendi|drop deep|arretra|copri|resta bass)/, dx: 0, dy: 14, label: 'Arretra' },
    { re: /(sposta a sinistra|shift left|spostati a sinistra|verso sinistra|lato sinistro)/, dx: -14, dy: 0, label: 'Sinistra' },
    { re: /(sposta a destra|shift right|spostati a destra|verso destra|lato destro)/, dx: 14, dy: 0, label: 'Destra' },
    { re: /(allargati|wider|ampiezza|apriti|largo)/, dx: 0, dy: 0, label: 'Allargati', spread: 1 },
    { re: /(stringiti|narrow|stretti|chiuditi|restring)/, dx: 0, dy: 0, label: 'Stringiti', spread: -1 },
    { re: /(ancoragg|schermo|scherm|screen|regista|playmaker)/, dx: 0, dy: 0, label: 'Ancora', hold: 1 }
  ]
  for (const r of rules) {
    if (r.re.test(text)) return { dx: r.dx, dy: r.dy, label: r.label, spread: r.spread || 0, hold: r.hold || 0 }
  }
  return null
}

// Build multiple tactical zones (subtle) from focus text.
export function buildZones(text, lang) {
  const blob = nameKey(text)
  if (!blob) return []
  const labels = {
    center: { it: 'Centro', en: 'Center', es: 'Centro' },
    wings: { it: 'Fasce', en: 'Wings', es: 'Bandas' },
    depth: { it: 'Profondità', en: 'Depth', es: 'Profundidad' },
    highpress: { it: 'Pressing alto', en: 'High press', es: 'Pressión alta' },
    lowblock: { it: 'Blocco basso', en: 'Low block', es: 'Bloque bajo' },
    left: { it: 'Sinistra', en: 'Left', es: 'Izquierda' },
    right: { it: 'Destra', en: 'Right', es: 'Derecha' }
  }
  const zones = []
  if (/(pressing alto|pressing_alto|press alto|aggressivo|attacca i terzini)/.test(blob))
    zones.push({ id: 'highpress', cx: 50, cy: 18, rx: 40, ry: 16, className: 'hc-pitchZonePress', label: asText(labels.highpress, lang) })
  if (/(blocco basso|linea_bassa|linea bassa|arretrati|difensiv)/.test(blob))
    zones.push({ id: 'lowblock', cx: 50, cy: 82, rx: 44, ry: 16, className: 'hc-pitchZoneBlock', label: asText(labels.lowblock, lang) })
  if (/(profondit|vertical|dietro i terzin|attacca lo spazio|depth|profond)/.test(blob))
    zones.push({ id: 'depth', cx: 50, cy: 10, rx: 36, ry: 12, className: 'hc-pitchZoneDepth', label: asText(labels.depth, lang) })
  if (/(fasce|corsie|ampiezza|estern|lato|wing)/.test(blob)) {
    zones.push({ id: 'wingsL', cx: 12, cy: 50, rx: 12, ry: 30, className: 'hc-pitchZoneWings', label: asText(labels.wings, lang) })
    zones.push({ id: 'wingsR', cx: 88, cy: 50, rx: 12, ry: 30, className: 'hc-pitchZoneWings', label: asText(labels.wings, lang) })
  }
  if (/(trq|tra le linee|centrale|centro|ancoragg|scherm|mediana)/.test(blob))
    zones.push({ id: 'center', cx: 50, cy: 50, rx: 22, ry: 22, className: 'hc-pitchZoneCenter', label: asText(labels.center, lang) })
  if (/(sinistro|lato sinistro|left wing|fasca sinistra)/.test(blob))
    zones.push({ id: 'left', cx: 16, cy: 50, rx: 14, ry: 28, className: 'hc-pitchZoneLeft', label: asText(labels.left, lang) })
  if (/(destro|lato destro|right wing|fasca destra)/.test(blob))
    zones.push({ id: 'right', cx: 84, cy: 50, rx: 14, ry: 28, className: 'hc-pitchZoneRight', label: asText(labels.right, lang) })
  // Cap at 3 zones to keep it clean
  return zones.slice(0, 3)
}

export function claimSlot(slots, preferredPos, used) {
  const pos = normalizePos(preferredPos)
  if (pos) {
    const exact = slots.find((s) => !used.has(s.index) && normalizePos(s.position) === pos)
    if (exact) { used.add(exact.index); return exact }
  }
  const fallback = slots.find((s) => !used.has(s.index) && s.index !== 0)
  if (fallback) { used.add(fallback.index); return fallback }
  return null
}

export function findSlotByPlayer(slots, playerId, playerName) {
  if (playerId) {
    const byId = slots.find((s) => s.playerId && s.playerId === playerId)
    if (byId) return byId
  }
  const key = nameKey(playerName)
  if (!key) return null
  return slots.find((s) => {
    const candidates = [s.name, s.inName, s.outName].filter(Boolean).map(nameKey)
    return candidates.some((c) => c === key || c.includes(key) || key.includes(c))
  }) || null
}

export function buildSwapArrows(slots, playerSuggestions) {
  const arrows = []
  const seen = new Set()
  const suggestions = Array.isArray(playerSuggestions) ? playerSuggestions : []
  for (const sug of suggestions) {
    if (sug?.action && sug.action !== 'add_to_starting_xi') continue
    const outSlot = findSlotByPlayer(slots, sug.replace_player_id || sug.out_player_id, sug.replace_player_name || sug.out_player_name)
    const inSlot = findSlotByPlayer(slots, sug.player_id || sug.in_player_id, sug.player_name || sug.in_player_name)
    if (!outSlot || !inSlot || outSlot.index === inSlot.index) continue
    const key = `${outSlot.index}->${inSlot.index}`
    if (seen.has(key)) continue
    seen.add(key)
    arrows.push({ id: key, x1: outSlot.x, y1: outSlot.y, x2: inSlot.x, y2: inSlot.y })
  }
  return arrows
}

// Build curved movement arrows from individual instructions.
export function buildMovementArrows(overlay, individualInstructions, lang) {
  const arrows = []
  const instructions = Array.isArray(individualInstructions) ? individualInstructions : []
  for (const row of instructions) {
    const move = instructionMovement(row?.instruction, lang)
    if (!move || (!move.dx && !move.dy)) continue
    const slot = findSlotByPlayer(overlay, row?.player_id, row?.player_name)
    if (!slot) continue
    const x1 = slot.x, y1 = slot.y
    const x2 = Math.max(4, Math.min(96, slot.x + move.dx))
    const y2 = Math.max(4, Math.min(96, slot.y + move.dy))
    // Control point for a slight curve
    const cx = (x1 + x2) / 2 + (move.dy !== 0 ? 6 : 0)
    const cy = (y1 + y2) / 2 + (move.dx !== 0 ? 6 : 0)
    arrows.push({ id: `mv-${slot.index}`, x1, y1, x2, y2, cx, cy, label: move.label })
  }
  return arrows
}

export function formationLabel(formation, slotPositions, lang) {
  if (formation && String(formation).trim()) return String(formation).trim()
  // Derive from slot positions: count by y bands
  if (!slotPositions) return ''
  const positions = typeof slotPositions === 'object' && !Array.isArray(slotPositions)
    ? Object.values(slotPositions)
    : Array.isArray(slotPositions) ? slotPositions : []
  const ys = positions.map((p) => Number(p?.y)).filter((y) => Number.isFinite(y))
  if (ys.length < 2) return ''
  ys.sort((a, b) => a - b)
  // Cluster into lines by gaps
  const lines = []
  let current = [ys[0]]
  for (let i = 1; i < ys.length; i++) {
    if (ys[i] - ys[i - 1] <= 8) current.push(ys[i])
    else { lines.push(current); current = [ys[i]] }
  }
  lines.push(current)
  // Skip GK (first line of 1)
  const fieldLines = lines.filter((l) => l.length > 0).slice(lines[0].length === 1 ? 1 : 0)
  return fieldLines.map((l) => l.length).join('-')
}
