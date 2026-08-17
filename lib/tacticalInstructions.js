import { isLegacyIndividualInstruction } from './efootballV6Rules'

// Configurazione completa Istruzioni Individuali eFootball
// Basata su ricerche e immagini fornite

export const INDIVIDUAL_INSTRUCTIONS_CONFIG = {
  attacco_1: {
    nameKey: 'attack1',
    descriptionKey: 'attack1Description',
    // Filtra giocatori: tutti tranne portiere (come da spiegazione: "adatta e valida per tutti i giocatori della tua squadra, tranne il portiere")
    filterPlayers: (players) => players.filter(p => 
      p.position && p.position !== 'PT'
    ),
    availableInstructions: [
      { id: 'difensivo', nameKey: 'defensive' },
      { id: 'ancoraggio', nameKey: 'anchoring' }
    ]
  },
  
  attacco_2: {
    nameKey: 'attack2',
    descriptionKey: 'attack2Description',
    // Filtra giocatori: tutti tranne portiere
    filterPlayers: (players) => players.filter(p => 
      p.position && p.position !== 'PT'
    ),
    availableInstructions: [
      { id: 'difensivo', nameKey: 'defensive' },
      { id: 'ancoraggio', nameKey: 'anchoring' }
    ]
  },
  
  difesa_1: {
    nameKey: 'defense1',
    descriptionKey: 'defense1Description',
    // Filtra giocatori: tutti tranne portiere
    // NOTA: "contropiede" (obiettivo contropiede) solo per centrocampisti e attaccanti (validazione separata)
    filterPlayers: (players) => players.filter(p => 
      p.position && p.position !== 'PT'
    ),
    availableInstructions: [
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' },
      { id: 'contropiede', nameKey: 'counterTarget' }
    ]
  },
  
  difesa_2: {
    nameKey: 'defense2',
    descriptionKey: 'defense2Description',
    // NOTA: "contropiede" (obiettivo contropiede) solo per centrocampisti e attaccanti (validazione separata)
    filterPlayers: (players) => players.filter(p => 
      p.position && p.position !== 'PT'
    ),
    availableInstructions: [
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' },
      { id: 'contropiede', nameKey: 'counterTarget' }
    ]
  }
}

// Validazione: verifica che giocatore e istruzione siano compatibili
export function validateIndividualInstruction(category, playerId, instruction, titolari) {
  const config = INDIVIDUAL_INSTRUCTIONS_CONFIG[category]
  
  if (!config) {
    return { valid: false, error: 'Invalid category' }
  }
  
  // Verifica che il giocatore esista e sia titolare
  const player = titolari.find(p => p.id === playerId)
  if (!player) {
    return { valid: false, error: 'Player not found or not in starting lineup' }
  }
  
  // Verifica che la posizione sia compatibile
  const compatiblePlayers = config.filterPlayers(titolari)
  if (!compatiblePlayers.find(p => p.id === playerId)) {
    return { 
      valid: false, 
      error: `Player position ${player.position} not compatible with ${category}` 
    }
  }
  
  // Le istruzioni rimosse in eFootball v6 restano leggibili solo per compatibilità dati.
  // Nuove assegnazioni devono essere rifiutate; il salvataggio gestisce separatamente il round-trip legacy.
  if (isLegacyIndividualInstruction(instruction)) {
    return {
      valid: false,
      errorCode: 'LEGACY_INSTRUCTION_NOT_CREATABLE',
      error: `Instruction ${instruction} is legacy and cannot be assigned in eFootball v6.0.0`
    }
  }

  // Verifica che l'istruzione sia disponibile
  const instructionObj = config.availableInstructions.find(i => i.id === instruction)
  if (!instructionObj) {
    return { 
      valid: false, 
      error: `Instruction ${instruction} not available for ${category}` 
    }
  }

  // ✅ VALIDAZIONE SPECIFICA PER "contropiede" in DIFESA (Obiettivo Contropiede)
  if (instruction === 'contropiede' && (category === 'difesa_1' || category === 'difesa_2')) {
    // Regole prodotto: contropiede consentito a tutti (portiere già escluso dal filtro)
  }
  
  return { valid: true, config, player, instructionObj }
}
