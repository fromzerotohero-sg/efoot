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
      { id: 'offensivo', nameKey: 'offensive' },
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
      { id: 'offensivo', nameKey: 'offensive' },
      { id: 'ancoraggio', nameKey: 'anchoring' }
    ]
  },
  
  difesa_1: {
    nameKey: 'defense1',
    descriptionKey: 'defense1Description',
    // Filtra giocatori: tutti tranne portiere
    // NOTA: "linea_bassa" non può essere assegnata a difensori (validazione separata)
    // NOTA: "contropiede" (obiettivo contropiede) solo per centrocampisti e attaccanti (validazione separata)
    filterPlayers: (players) => players.filter(p => 
      p.position && p.position !== 'PT'
    ),
    availableInstructions: [
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' },
      { id: 'contropiede', nameKey: 'counterTarget' },
      { id: 'linea_bassa', nameKey: 'deepLine' }
    ]
  },
  
  difesa_2: {
    nameKey: 'defense2',
    descriptionKey: 'defense2Description',
    // NOTA: "linea_bassa" non può essere assegnata a difensori (validazione separata)
    // NOTA: "contropiede" (obiettivo contropiede) solo per centrocampisti e attaccanti (validazione separata)
    filterPlayers: (players) => players.filter(p => 
      p.position && p.position !== 'PT'
    ),
    availableInstructions: [
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' },
      { id: 'contropiede', nameKey: 'counterTarget' },
      { id: 'linea_bassa', nameKey: 'deepLine' }
    ]
  }
}

// Validazione: verifica che giocatore e istruzione siano compatibili
export function validateIndividualInstruction(category, playerId, instruction, titolari, formationLayout = null) {
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
  
  // Verifica che l'istruzione sia disponibile
  const instructionObj = config.availableInstructions.find(i => i.id === instruction)
  if (!instructionObj) {
    return { 
      valid: false, 
      error: `Instruction ${instruction} not available for ${category}` 
    }
  }
  
  // ✅ VALIDAZIONE SPECIFICA PER "linea_bassa" (da immagini eFootball)
  if (instruction === 'linea_bassa') {
    // Regola 1: Impossibile indicare un difensore (TD, TS, DC)
    const defenderPositions = ['TD', 'TS', 'DC']
    if (defenderPositions.includes(player.position)) {
      return { 
        valid: false, 
        error: 'Impossibile indicare un difensore per l\'istruzione "Linea Bassa"' 
      }
    }
    
    // Regola 2: Con 5 difensori, impossibile assegnare a centrocampisti
    if (formationLayout && formationLayout.slot_positions) {
      // Conta difensori nella formazione (y: 60-80)
      const defenders = Object.values(formationLayout.slot_positions).filter(slot => {
        if (!slot || slot.y === undefined) return false
        const y = typeof slot.y === 'number' ? slot.y : parseFloat(slot.y)
        return y >= 60 && y <= 80
      })
      
      if (defenders.length >= 5) {
        // Con 5+ difensori, non può essere assegnata a centrocampisti (MED, CC)
        const midfielderPositions = ['MED', 'CC']
        if (midfielderPositions.includes(player.position)) {
          return { 
            valid: false, 
            error: 'Quando si utilizza uno schema con 5 difensori, è impossibile assegnare "Linea Bassa" a un centrocampista' 
          }
        }
      }
    }
  }
  
  // ✅ VALIDAZIONE SPECIFICA PER "contropiede" in DIFESA (Obiettivo Contropiede)
  // Secondo la spiegazione: "Penso che questo possa essere applicato solo a centrocampisti e attaccanti"
  if (instruction === 'contropiede' && (category === 'difesa_1' || category === 'difesa_2')) {
    const allowedPositions = ['MED', 'CC', 'TRQ', 'SP', 'P', 'CF', 'CLD', 'CLS', 'EDA', 'ESA']
    if (!allowedPositions.includes(player.position)) {
      return { 
        valid: false, 
        error: 'L\'istruzione "Obiettivo Contropiede" può essere applicata solo a centrocampisti e attaccanti' 
      }
    }
  }
  
  return { valid: true, config, player, instructionObj }
}
