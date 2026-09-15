import { isRemovedIndividualInstruction } from './efootballTruthLayer.js'

// Istruzioni individuali eFootball v6.0.0.
// Offensivo / Linea bassa rimossi dal Game Plan: restano solo come legacy display.

export const LEGACY_INDIVIDUAL_INSTRUCTIONS = {
  offensivo: { id: 'offensivo', nameKey: 'offensive' },
  linea_bassa: { id: 'linea_bassa', nameKey: 'deepLine' }
}

export const INDIVIDUAL_INSTRUCTIONS_CONFIG = {
  attacco_1: {
    nameKey: 'attack1',
    descriptionKey: 'attack1Description',
    filterPlayers: (players) => players.filter((p) => p.position && p.position !== 'PT'),
    availableInstructions: [
      { id: 'difensivo', nameKey: 'defensive' },
      { id: 'ancoraggio', nameKey: 'anchoring' }
    ]
  },
  attacco_2: {
    nameKey: 'attack2',
    descriptionKey: 'attack2Description',
    filterPlayers: (players) => players.filter((p) => p.position && p.position !== 'PT'),
    availableInstructions: [
      { id: 'difensivo', nameKey: 'defensive' },
      { id: 'ancoraggio', nameKey: 'anchoring' }
    ]
  },
  difesa_1: {
    nameKey: 'defense1',
    descriptionKey: 'defense1Description',
    filterPlayers: (players) => players.filter((p) => p.position && p.position !== 'PT'),
    availableInstructions: [
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' },
      { id: 'contropiede', nameKey: 'counterTarget' }
    ]
  },
  difesa_2: {
    nameKey: 'defense2',
    descriptionKey: 'defense2Description',
    filterPlayers: (players) => players.filter((p) => p.position && p.position !== 'PT'),
    availableInstructions: [
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' },
      { id: 'contropiede', nameKey: 'counterTarget' }
    ]
  }
}

export function getSelectableInstructions(category, currentInstruction = '') {
  const config = INDIVIDUAL_INSTRUCTIONS_CONFIG[category]
  const available = [...(config?.availableInstructions || [])]
  const current = String(currentInstruction || '').trim()
  if (current && isRemovedIndividualInstruction(current) && LEGACY_INDIVIDUAL_INSTRUCTIONS[current]) {
    available.push({
      ...LEGACY_INDIVIDUAL_INSTRUCTIONS[current],
      legacy: true
    })
  }
  return available
}

export function validateIndividualInstruction(category, playerId, instruction, titolari, formationLayout = null) {
  const config = INDIVIDUAL_INSTRUCTIONS_CONFIG[category]

  if (!config) {
    return { valid: false, error: 'Invalid category' }
  }

  const player = titolari.find((p) => p.id === playerId)
  if (!player) {
    return { valid: false, error: 'Player not found or not in starting lineup' }
  }

  const compatiblePlayers = config.filterPlayers(titolari)
  if (!compatiblePlayers.find((p) => p.id === playerId)) {
    return {
      valid: false,
      error: `Player position ${player.position} not compatible with ${category}`
    }
  }

  if (isRemovedIndividualInstruction(instruction)) {
    return {
      valid: false,
      error: 'Instruction removed in eFootball v6.0.0. Use Fluid Formation instead of Attacking / Deep Line.',
      legacy: true
    }
  }

  const instructionObj = config.availableInstructions.find((i) => i.id === instruction)
  if (!instructionObj) {
    return {
      valid: false,
      error: `Instruction ${instruction} not available for ${category}`
    }
  }

  return { valid: true, config, player, instructionObj }
}
