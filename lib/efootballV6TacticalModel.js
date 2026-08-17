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

export function evaluateLinkUpPlay(play, starters = [], stylesLookup = {}) {
  const normalized = normalizeLinkUpPlay(play)
  if (!normalized) return null

  const matchSide = (requirement) => {
    if (!requirement) return []
    const requiredPositions = requirement.position
      ? String(requirement.position).split(/[\/,]/).map(v => v.trim()).filter(Boolean)
      : []
    const styleNeedle = String(requirement.playing_style || '').trim().toLowerCase()

    return (Array.isArray(starters) ? starters : []).filter(player => {
      const positionOk = requiredPositions.length === 0 || requiredPositions.some(req => {
        const aliases = positionAliases(req)
        return aliases.has(String(player?.position || '').trim().toUpperCase())
      })
      const style = playerStyleName(player, stylesLookup).toLowerCase()
      const styleOk = !styleNeedle || style === styleNeedle
      return positionOk && styleOk
    })
  }

  const focalCandidates = matchSide(normalized.focal_point)
  const keyManCandidates = matchSide(normalized.key_man)
  const activatable = Boolean(
    (!normalized.focal_point || focalCandidates.length > 0) &&
    (!normalized.key_man || keyManCandidates.length > 0)
  )

  return {
    ...normalized,
    activatable,
    focal_candidates: focalCandidates.map(p => ({ id: p.id, name: p.player_name, position: p.position })),
    key_man_candidates: keyManCandidates.map(p => ({ id: p.id, name: p.player_name, position: p.position }))
  }
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
  if (fluid.base?.formation) lines.push(`- Base: ${fluid.base.formation}`)
  if (fluid.enabled) {
    lines.push(`- Formazione fluida: ATTIVA`)
    lines.push(`- Attacco: ${fluid.attack?.formation || 'non disponibile'}`)
    lines.push(`- Difesa: ${fluid.defense?.formation || 'non disponibile'}`)
  } else {
    lines.push(`- Formazione fluida: NON configurata/attiva`)
  }
  return lines.join('\n')
}
