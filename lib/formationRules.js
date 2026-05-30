/**
 * Catalogo moduli eFootball (Konami) e riconoscimento nome da slot_positions.
 * Match primario: ruolo per slot_index (0=PT … 10), come nel builder di gioco.
 * Fallback: conteggio D-M-F da Y (validateFormationLimits).
 */

import { completeSlotPositions } from './formationDefaultSlots.js'

/** Alias posizione → sigla IT builder (slot). */
const POSITION_ALIASES = {
  ETD: 'TD',
  ETS: 'TS',
  EDE: 'EDA',
  CF: 'P',
  ST: 'P',
  GK: 'PT',
  CB: 'DC',
  RB: 'TD',
  LB: 'TS',
  DMF: 'MED',
  CDM: 'MED',
  CMF: 'CC',
  CM: 'CC',
  AMF: 'TRQ',
  CAM: 'TRQ',
  AM: 'TRQ',
  RWF: 'CLD',
  LWF: 'CLS',
  RW: 'CLD',
  LW: 'CLS',
  RMF: 'CLD',
  LMF: 'CLS',
  SS: 'SP'
}

/**
 * Slot 0–10: ruolo atteso (sinistra→destra sulle linee del modulo).
 * Fonte: layout ufficiale builder moduli (Attila / Konami IT).
 */
export const FORMATION_PRESETS = [
  // —— Difesa a 3 ——
  {
    name: '3-2-3-2',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'MED', 5: 'MED',
      6: 'CLD', 7: 'TRQ', 8: 'CLS', 9: 'SP', 10: 'P'
    }
  },
  {
    name: '3-2-2-3',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'MED', 5: 'MED',
      6: 'TRQ', 7: 'TRQ', 8: 'ESA', 9: 'P', 10: 'EDA'
    }
  },
  {
    name: '3-2-4-1',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'MED', 5: 'MED',
      6: 'ESA', 7: 'TRQ', 8: 'TRQ', 9: 'EDA', 10: 'P'
    }
  },
  {
    name: '3-3-1-3',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'MED', 5: 'CC', 6: 'CC',
      7: 'TRQ', 8: 'ESA', 9: 'P', 10: 'EDA'
    }
  },
  {
    name: '3-3-2-2',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'MED', 5: 'CC', 6: 'CC',
      7: 'SP', 8: 'TRQ', 9: 'SP', 10: 'P'
    }
  },
  {
    name: '3-4-3',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'CLD', 5: 'CC', 6: 'CC', 7: 'CLS',
      8: 'ESA', 9: 'P', 10: 'EDA'
    }
  },
  {
    name: '3-4-2-1',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'CLD', 5: 'MED', 6: 'CC', 7: 'CLS',
      8: 'TRQ', 9: 'SP', 10: 'P'
    }
  },
  // 3-4-1-2: stessi slot ruolo di 3-4-2-1 (Konami distingue solo per Y linee) — match → 3-4-2-1
  {
    name: '3-5-2',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'CLD', 5: 'CC', 6: 'MED', 7: 'CC', 8: 'CLS',
      9: 'SP', 10: 'P'
    }
  },
  // —— Difesa a 4 ——
  {
    name: '4-1-2-3',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CC', 7: 'CC',
      8: 'ESA', 9: 'P', 10: 'EDA'
    }
  },
  {
    name: '4-2-1-3',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CC', 7: 'TRQ',
      8: 'ESA', 9: 'P', 10: 'EDA'
    }
  },
  {
    name: '4-2-2-2',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CC', 7: 'CLD',
      8: 'CLS', 9: 'SP', 10: 'P'
    }
  },
  {
    name: '4-3-3',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'CC', 6: 'MED', 7: 'CC',
      8: 'ESA', 9: 'P', 10: 'EDA'
    }
  },
  {
    name: '4-3-2-1',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CC', 7: 'CC',
      8: 'TRQ', 9: 'SP', 10: 'P'
    }
  },
  // 4-3-1-2: stessi slot di 4-3-2-1 (linee Y diverse in game)
  {
    name: '4-1-3-2',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CLD', 7: 'TRQ', 8: 'CLS',
      9: 'SP', 10: 'P'
    }
  },
  {
    name: '4-4-2',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'CLD', 6: 'CC', 7: 'CC', 8: 'CLS',
      9: 'SP', 10: 'P'
    }
  },
  {
    name: '4-5-1',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'CLD', 6: 'MED', 7: 'CC', 8: 'CC', 9: 'CLS',
      10: 'P'
    }
  },
  {
    name: '4-1-4-1',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CLD', 7: 'CC', 8: 'CC', 9: 'CLS',
      10: 'P'
    }
  },
  {
    name: '4-2-3-1',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CC', 7: 'ESA', 8: 'TRQ', 9: 'EDA',
      10: 'P'
    }
  },
  {
    name: '4-4-1-1',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'CLD', 6: 'CC', 7: 'CC', 8: 'CLS', 9: 'TRQ',
      10: 'P'
    }
  },
  // —— Difesa a 5 ——
  {
    name: '5-2-1-2',
    slots: {
      0: 'PT', 1: 'ETD', 2: 'DC', 3: 'DC', 4: 'DC', 5: 'ETS', 6: 'MED', 7: 'CC', 8: 'TRQ',
      9: 'SP', 10: 'P'
    }
  },
  // 5-2-2-1: stessi slot di 5-2-1-2 (linee Y diverse in game)
  {
    name: '5-2-3',
    slots: {
      0: 'PT', 1: 'ETD', 2: 'DC', 3: 'DC', 4: 'DC', 5: 'ETS', 6: 'MED', 7: 'CC', 8: 'ESA', 9: 'P',
      10: 'EDA'
    }
  },
  {
    name: '5-3-2',
    slots: {
      0: 'PT', 1: 'ETD', 2: 'DC', 3: 'DC', 4: 'DC', 5: 'ETS', 6: 'MED', 7: 'CC', 8: 'CC', 9: 'SP',
      10: 'P'
    }
  },
  {
    name: '5-4-1',
    slots: {
      0: 'PT', 1: 'ETD', 2: 'DC', 3: 'DC', 4: 'DC', 5: 'ETS', 6: 'CLD', 7: 'MED', 8: 'CC', 9: 'CLS',
      10: 'P'
    }
  },
  // —— Varianti ——
  {
    name: '4-3-3 stretto',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CC', 7: 'CC',
      8: 'SP', 9: 'P', 10: 'SP'
    }
  },
  {
    name: '3-4-3 stretto',
    slots: {
      0: 'PT', 1: 'DC', 2: 'DC', 3: 'DC', 4: 'CLD', 5: 'MED', 6: 'CC', 7: 'CLS',
      8: 'SP', 9: 'P', 10: 'SP'
    }
  },
  {
    name: '4-2-2-2 stretto',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'MED', 7: 'TRQ', 8: 'TRQ',
      9: 'SP', 10: 'P'
    }
  },
  {
    name: '4-2-1-3 asimmetrico',
    slots: {
      0: 'PT', 1: 'TS', 2: 'DC', 3: 'DC', 4: 'TD', 5: 'MED', 6: 'CC', 7: 'TRQ',
      8: 'ESA', 9: 'P', 10: 'SP'
    }
  }
]

export function normalizeFormationPosition(value = '') {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return ''
  return POSITION_ALIASES[raw] || raw
}

function getSlotRecord(slotPositions, index) {
  if (!slotPositions || typeof slotPositions !== 'object') return null
  return slotPositions[index] ?? slotPositions[String(index)] ?? null
}

export function slotTemplateSignature(slots = {}) {
  return Array.from({ length: 11 }, (_, i) => normalizeFormationPosition(slots[i] || '')).join(',')
}

const PRESET_SLOT_SIGNATURES = FORMATION_PRESETS.map((preset) => ({
  name: preset.name,
  signature: slotTemplateSignature(preset.slots)
}))

export function matchesSlotTemplate(slotPositions, preset) {
  const complete = completeSlotPositions(slotPositions)
  for (let i = 0; i <= 10; i++) {
    const expected = normalizeFormationPosition(preset.slots?.[i])
    if (!expected) continue
    const actual = normalizeFormationPosition(getSlotRecord(complete, i)?.position)
    if (actual !== expected) return false
  }
  return true
}

/**
 * @returns {{ name: string, matched: true } | null}
 */
export function matchKonamiFormation(slotPositions) {
  const complete = completeSlotPositions(slotPositions)
  const signature = Array.from({ length: 11 }, (_, i) =>
    normalizeFormationPosition(getSlotRecord(complete, i)?.position)
  ).join(',')

  const hit = PRESET_SLOT_SIGNATURES.find((preset) => preset.signature === signature)
  if (hit) return { name: hit.name, matched: true }

  for (const preset of FORMATION_PRESETS) {
    if (matchesSlotTemplate(complete, preset)) {
      return { name: preset.name, matched: true }
    }
  }
  return null
}

export function resolveKonamiFormationName(slotPositions) {
  return matchKonamiFormation(slotPositions)?.name || null
}

export function getPresetByName(name = '') {
  const key = String(name || '').trim().toLowerCase()
  return FORMATION_PRESETS.find((preset) => preset.name.toLowerCase() === key) || null
}

/** Applica ruoli preset a slot_positions esistenti (mantiene x,y). */
export function applyPresetRolesToSlots(slotPositions, presetName) {
  const preset = getPresetByName(presetName)
  if (!preset) return slotPositions
  const complete = completeSlotPositions(slotPositions)
  const next = { ...complete }
  for (let i = 0; i <= 10; i++) {
    const role = preset.slots[i]
    if (!role) continue
    const cur = getSlotRecord(next, i) || {}
    next[i] = { ...cur, position: role }
  }
  return next
}
