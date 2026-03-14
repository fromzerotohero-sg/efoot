/**
 * Valida limitazioni ruolo secondo memoria Attila
 * 
 * Limitazioni:
 * - Attacco (A): 1-5 giocatori (max 2 P e 1 EDA/ESA)
 * - Centrocampo (C): 1-6 giocatori (max 1 CLD/CLS)
 * - Difesa (D): 2-5 giocatori (max 3 DC e 1 TD/TS)
 * - Portiere (PT): Sempre 1 (slot 0)
 */

export function validateFormationLimits(slotPositions) {
  const errors = []
  const warnings = []
  
  if (!slotPositions || typeof slotPositions !== 'object') {
    return {
      valid: false,
      errors: ['slot_positions deve essere un oggetto valido'],
      warnings: []
    }
  }
  
  // Conta posizioni per ruolo
  const positions = Object.values(slotPositions || {})
  const positionCounts = {
    PT: 0,
    DC: 0,
    TD: 0,
    TS: 0,
    MED: 0,
    CC: 0,
    AMF: 0,
    TRQ: 0,
    ESA: 0,
    EDE: 0,
    CLD: 0,
    CLS: 0,
    P: 0,
    SP: 0,
    CF: 0
  }
  
  // Conta posizioni in base a position E coordinate y
  const defendersByY = [] // Difensori (y >= 60)
  const midfieldersByY = [] // Centrocampisti (y: 40-60)
  const attackersByY = [] // Attaccanti (y < 40)
  
  positions.forEach((pos, index) => {
    if (!pos || !pos.position) return
    
    const position = String(pos.position).trim()
    const y = pos.y != null ? Number(pos.y) : null
    
    // Conta per position
    if (positionCounts.hasOwnProperty(position)) {
      positionCounts[position]++
    }
    
    // Conta per zona campo (y coordinate)
    if (y !== null) {
      if (y > 80) {
        // Portiere (y > 80)
        if (position === 'PT') {
          // Già contato
        }
      } else if (y >= 60 && y <= 80) {
        // Difesa (y: 60-80)
        if (['DC', 'TD', 'TS'].includes(position)) {
          defendersByY.push({ position, y, index })
        }
      } else if (y >= 40 && y <= 60) {
        // Centrocampo (y: 40-60)
        if (['MED', 'CC', 'AMF', 'TRQ', 'ESA', 'EDE', 'CLD', 'CLS'].includes(position)) {
          midfieldersByY.push({ position, y, index })
        }
      } else if (y < 40) {
        // Attacco (y < 40)
        if (['P', 'SP', 'CF', 'TRQ', 'CLD', 'CLS'].includes(position)) {
          attackersByY.push({ position, y, index })
        }
      }
    }
  })
  
  // Validazione Portiere
  if (positionCounts.PT !== 1) {
    errors.push(`Deve esserci esattamente 1 portiere (PT) - attualmente: ${positionCounts.PT}`)
  }
  
  // Validazione Difesa (2-5 giocatori, max 3 DC e 1 TD/TS)
  // Conta solo posizioni in difesa (y: 60-80)
  const totalDefenders = defendersByY.length
  if (totalDefenders < 2) {
    errors.push(`Difesa: minimo 2 giocatori (attualmente: ${totalDefenders})`)
  }
  if (totalDefenders > 5) {
    errors.push(`Difesa: massimo 5 giocatori (attualmente: ${totalDefenders})`)
  }
  
  // DC/TD/TS in difesa (y: 60-80)
  const dcInDefense = defendersByY.filter(p => p.position === 'DC').length
  const tdInDefense = defendersByY.filter(p => p.position === 'TD').length
  const tsInDefense = defendersByY.filter(p => p.position === 'TS').length
  
  if (dcInDefense > 3) {
    errors.push(`Difesa: massimo 3 DC (attualmente: ${dcInDefense})`)
  }
  if (tdInDefense > 1) {
    errors.push(`Difesa: massimo 1 TD (attualmente: ${tdInDefense})`)
  }
  if (tsInDefense > 1) {
    errors.push(`Difesa: massimo 1 TS (attualmente: ${tsInDefense})`)
  }
  
  // Validazione Centrocampo (1-6 giocatori, max 1 CLD/CLS)
  // Conta solo posizioni in centrocampo (y: 40-60)
  const totalMidfielders = midfieldersByY.length
  if (totalMidfielders < 1) {
    errors.push(`Centrocampo: minimo 1 giocatore (attualmente: ${totalMidfielders})`)
  }
  if (totalMidfielders > 6) {
    errors.push(`Centrocampo: massimo 6 giocatori (attualmente: ${totalMidfielders})`)
  }
  
  // CLD/CLS in centrocampo (y: 40-60)
  const cldInMidfield = midfieldersByY.filter(p => p.position === 'CLD').length
  const clsInMidfield = midfieldersByY.filter(p => p.position === 'CLS').length
  if (cldInMidfield > 1) {
    errors.push(`Centrocampo: massimo 1 CLD (attualmente: ${cldInMidfield})`)
  }
  if (clsInMidfield > 1) {
    errors.push(`Centrocampo: massimo 1 CLS (attualmente: ${clsInMidfield})`)
  }
  
  // Validazione Attacco (1-5 giocatori, max 2 P e 1 EDA/ESA)
  // Conta solo posizioni in attacco (y < 40)
  const totalAttackers = attackersByY.length
  if (totalAttackers < 1) {
    errors.push(`Attacco: minimo 1 giocatore (attualmente: ${totalAttackers})`)
  }
  if (totalAttackers > 5) {
    errors.push(`Attacco: massimo 5 giocatori (attualmente: ${totalAttackers})`)
  }
  
  // P in attacco
  const pInAttack = attackersByY.filter(p => p.position === 'P').length
  if (pInAttack > 2) {
    errors.push(`Attacco: massimo 2 P (attualmente: ${pInAttack})`)
  }
  
  // EDA/ESA in attacco (y < 40) - raro, ma possibile
  const edaInAttack = attackersByY.filter(p => p.position === 'EDA').length
  const esaInAttack = attackersByY.filter(p => p.position === 'ESA').length
  if (edaInAttack + esaInAttack > 1) {
    errors.push(`Attacco: massimo 1 EDA/ESA (attualmente: ${edaInAttack + esaInAttack})`)
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

/** Gruppi ruolo per derivare nome modulo (coerente con countermeasuresHelper / assistant-chat) */
const DEF_POSITIONS = ['DC', 'TD', 'TS']
const MID_POSITIONS = ['MED', 'CC', 'TRQ', 'CLS', 'CLD', 'AMF', 'ESA', 'EDE']
const FWD_POSITIONS = ['P', 'SP', 'CF']

/**
 * Deriva il nome formazione (es. "4-3-3", "3-4-3") dalle posizioni negli slot.
 * Usato quando il cliente salva posizioni personalizzate: il modulo in formation_layout
 * deve riflettere la disposizione reale (def-mid-fwd), non solo il template iniziale.
 * @param {Record<string, { position?: string }>} slotPositions - slot_positions da formation_layout
 * @returns {string} es. "4-3-3" o "3-4-3"; "1-1-1" se dati insufficienti
 */
export function getFormationNameFromSlotPositions(slotPositions) {
  if (!slotPositions || typeof slotPositions !== 'object') return '1-1-1'
  const positions = Object.values(slotPositions).filter(p => p && p.position)
  let def = 0, mid = 0, fwd = 0
  positions.forEach(p => {
    const pos = (String(p.position || '').trim().toUpperCase())
    if (pos === 'PT') return
    if (DEF_POSITIONS.includes(pos)) def++
    else if (MID_POSITIONS.includes(pos)) mid++
    else if (FWD_POSITIONS.includes(pos)) fwd++
  })
  if (def === 0 && mid === 0 && fwd === 0) return '1-1-1'
  return `${def}-${mid}-${fwd}`
}
