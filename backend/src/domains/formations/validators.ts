const PHASES = new Set(['attack', 'defense'])
const MAX_FORMATION_LENGTH = 50
const MAX_SLOT_JSON_BYTES = 500 * 1024

export type FormationPhase = 'attack' | 'defense'

export interface SlotPosition {
  x: number
  y: number
  position: string
}

export type SlotPositionsMap = Record<number, SlotPosition>

export function normalizePhase(value: unknown): FormationPhase | null {
  const phase = String(value || '').trim().toLowerCase()
  return PHASES.has(phase) ? phase as FormationPhase : null
}

export function isValidPhase(value: unknown): boolean {
  return Boolean(normalizePhase(value))
}

export function sanitizeFormationName(value: unknown): string | null {
  const name = String(value || '').trim()
  if (!name || name.length > MAX_FORMATION_LENGTH) return null
  return name
}

export function normalizeSlotPositions(value: unknown): SlotPositionsMap | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  let serialized = ''
  try {
    serialized = JSON.stringify(value)
  } catch {
    return null
  }
  if (serialized.length > MAX_SLOT_JSON_BYTES) return null

  const source = value as Record<string | number, unknown>
  const normalized: SlotPositionsMap = {}
  for (let i = 0; i <= 10; i += 1) {
    const raw = source[i] ?? source[String(i)]
    if (!raw || typeof raw !== 'object') return null
    const row = raw as Record<string, unknown>
    const x = Number(row.x)
    const y = Number(row.y)
    const position = String(row.position || '').trim().toUpperCase()
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

/**
 * Valida limitazioni ruolo secondo memoria Attila.
 */
export function validateFormationLimits(slotPositions: unknown): {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats?: {
    defenders: number
    midfielders: number
    attackers: number
    positionCounts: Record<string, number>
    defendersByY: number
    midfieldersByY: number
    attackersByY: number
  }
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!slotPositions || typeof slotPositions !== 'object') {
    return {
      valid: false,
      errors: ['slot_positions deve essere un oggetto valido'],
      warnings: []
    }
  }

  const positions = Object.values(slotPositions as Record<string, SlotPosition | null | undefined>)
  const positionCounts: Record<string, number> = {
    PT: 0,
    DC: 0,
    TD: 0,
    TS: 0,
    MED: 0,
    CC: 0,
    AMF: 0,
    TRQ: 0,
    ESA: 0,
    EDA: 0,
    EDE: 0,
    CLD: 0,
    CLS: 0,
    P: 0,
    SP: 0,
    CF: 0
  }

  const defendersByY: Array<{ position: string; y: number; index: number }> = []
  const midfieldersByY: Array<{ position: string; y: number; index: number }> = []
  const attackersByY: Array<{ position: string; y: number; index: number }> = []

  positions.forEach((pos, index) => {
    if (!pos || !pos.position) return

    const raw = String(pos.position).trim()
    const position = raw === 'EDE' ? 'EDA' : raw
    const y = pos.y != null ? Number(pos.y) : null

    if (Object.prototype.hasOwnProperty.call(positionCounts, position)) {
      positionCounts[position]++
    }

    if (y !== null) {
      if (y > 80) {
        if (position === 'PT') {
          // Portiere già contato.
        }
      } else if (y >= 63 && y <= 80) {
        if (['DC', 'TD', 'TS'].includes(position)) {
          defendersByY.push({ position, y, index })
        }
      } else if (y >= 40 && y <= 62) {
        if (['MED', 'CC', 'AMF', 'TRQ', 'ESA', 'EDA', 'CLD', 'CLS'].includes(position)) {
          midfieldersByY.push({ position, y, index })
        }
      } else if (y < 40) {
        if (['P', 'SP', 'CF', 'TRQ', 'CLD', 'CLS', 'ESA', 'EDA'].includes(position)) {
          attackersByY.push({ position, y, index })
        }
      }
    }
  })

  if (positionCounts.PT !== 1) {
    errors.push(`Deve esserci esattamente 1 portiere (PT) - attualmente: ${positionCounts.PT}`)
  }

  const totalDefenders = defendersByY.length
  if (totalDefenders < 2) {
    errors.push(`Difesa: minimo 2 giocatori (attualmente: ${totalDefenders})`)
  }
  if (totalDefenders > 5) {
    errors.push(`Difesa: massimo 5 giocatori (attualmente: ${totalDefenders})`)
  }

  const dcInDefense = defendersByY.filter((p) => p.position === 'DC').length
  const tdInDefense = defendersByY.filter((p) => p.position === 'TD').length
  const tsInDefense = defendersByY.filter((p) => p.position === 'TS').length

  if (dcInDefense > 3) {
    errors.push(`Difesa: massimo 3 DC (attualmente: ${dcInDefense})`)
  }
  if (tdInDefense > 1) {
    errors.push(`Difesa: massimo 1 TD (attualmente: ${tdInDefense})`)
  }
  if (tsInDefense > 1) {
    errors.push(`Difesa: massimo 1 TS (attualmente: ${tsInDefense})`)
  }
  if (totalDefenders >= 4 && dcInDefense >= 3 && tdInDefense + tsInDefense < 1) {
    errors.push('Difesa: con 3 DC, il 4° difensore deve essere un terzino (TD o TS)')
  }

  const totalMidfielders = midfieldersByY.length
  if (totalMidfielders < 1) {
    errors.push(`Centrocampo: minimo 1 giocatore (attualmente: ${totalMidfielders})`)
  }
  if (totalMidfielders > 6) {
    errors.push(`Centrocampo: massimo 6 giocatori (attualmente: ${totalMidfielders})`)
  }

  const cldInMidfield = midfieldersByY.filter((p) => p.position === 'CLD').length
  const clsInMidfield = midfieldersByY.filter((p) => p.position === 'CLS').length
  if (cldInMidfield > 1) {
    errors.push(`Centrocampo: massimo 1 CLD (attualmente: ${cldInMidfield})`)
  }
  if (clsInMidfield > 1) {
    errors.push(`Centrocampo: massimo 1 CLS (attualmente: ${clsInMidfield})`)
  }

  const totalAttackers = attackersByY.length
  if (totalAttackers < 1) {
    errors.push(`Attacco: minimo 1 giocatore (attualmente: ${totalAttackers})`)
  }
  if (totalAttackers > 5) {
    errors.push(`Attacco: massimo 5 giocatori (attualmente: ${totalAttackers})`)
  }

  const pInAttack = attackersByY.filter((p) => p.position === 'P').length
  if (pInAttack > 2) {
    errors.push(`Attacco: massimo 2 P (attualmente: ${pInAttack})`)
  }

  const esaInAttack = attackersByY.filter((p) => p.position === 'ESA').length
  const edaInAttack = attackersByY.filter((p) => p.position === 'EDA').length
  if (esaInAttack > 1) {
    errors.push(`Attacco: massimo 1 ESA (attualmente: ${esaInAttack})`)
  }
  if (edaInAttack > 1) {
    errors.push(`Attacco: massimo 1 EDA (attualmente: ${edaInAttack})`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      defenders: totalDefenders,
      midfielders: totalMidfielders,
      attackers: totalAttackers,
      positionCounts,
      defendersByY: defendersByY.length,
      midfieldersByY: midfieldersByY.length,
      attackersByY: attackersByY.length
    }
  }
}
