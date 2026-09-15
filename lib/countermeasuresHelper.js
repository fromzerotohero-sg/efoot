/**
 * Helper per generazione contromisure tattiche
 */

import { getRelevantSectionsForContext } from './ragHelper'
import { getPlayerStyleDisplayName, playingStylesMatch } from './playingStyleResolve'
import { formatDefenseLineupSummary, rolesAreEquivalent } from './formationDefenseRules'

function sanitizeForPrompt(val, maxLen = 180) {
  if (val == null) return ''
  const s = String(val).replace(/\r\n|\r|\n/g, ' ').trim()
  return maxLen > 0 && s.length > maxLen ? s.slice(0, maxLen) + '…' : s
}

/**
 * Verifica se una posizione è tra quelle originali del giocatore
 * @param {string} currentPosition - Posizione attuale (es. "LWF")
 * @param {Array} originalPositions - Array di posizioni originali (es. [{"position": "AMF", "competence": "Alta"}, ...])
 * @returns {Object} - { isOriginal: boolean, competence: string | null }
 */
function isPositionOriginal(currentPosition, originalPositions) {
  if (!currentPosition || !Array.isArray(originalPositions) || originalPositions.length === 0) {
    return { isOriginal: false, competence: null }
  }
  
  const found = originalPositions.find(
    op => op.position && rolesAreEquivalent(op.position, currentPosition)
  )
  
  if (found) {
    return { 
      isOriginal: true, 
      competence: found.competence || "Alta" 
    }
  }
  
  return { isOriginal: false, competence: null }
}

function formatOriginalPositions(originalPositions) {
  if (!Array.isArray(originalPositions)) return ''
  return originalPositions
    .map(op => {
      if (typeof op === 'string') return op
      if (!op?.position) return ''
      return op.competence ? `${op.position} ${op.competence}` : op.position
    })
    .filter(Boolean)
    .join(', ')
}

function normalizeRole(value) {
  return String(value || '').trim().toUpperCase()
}

function formationNumbers(formationName) {
  const nums = String(formationName || '')
    .match(/\d+/g)
    ?.map(n => Number(n))
    .filter(n => Number.isFinite(n) && n > 0) || []
  return nums.length >= 2 ? nums : []
}

function countByRoleLine(players, formationName = '') {
  const counts = { pt: 0, def: 0, mid: 0, fwd: 0, unknown: 0 }
  const DEF = ['DC', 'CB', 'TD', 'RB', 'TS', 'LB']
  const MID = ['MED', 'DMF', 'CC', 'CMF', 'CCB', 'TRQ', 'AMF', 'CLD', 'RMF', 'CLS', 'LMF']
  const FWD = ['P', 'CF', 'SP', 'SS', 'EDA', 'RWF', 'ESA', 'LWF']

  for (const player of players || []) {
    const pos = normalizeRole(player?.position)
    if (pos === 'PT' || pos === 'GK') counts.pt += 1
    else if (DEF.includes(pos)) counts.def += 1
    else if (MID.includes(pos)) counts.mid += 1
    else if (FWD.includes(pos)) counts.fwd += 1
    else counts.unknown += 1
  }

  // OCR sometimes returns vague labels. Fall back to the visible module for macro-shape.
  const nums = formationNumbers(formationName)
  if (counts.def === 0 && nums[0]) counts.def = nums[0]
  if (counts.mid === 0 && nums.length > 2) counts.mid = nums.slice(1, -1).reduce((sum, n) => sum + n, 0)
  else if (counts.mid === 0 && nums.length === 2) counts.mid = nums[1]
  if (counts.fwd === 0 && nums.length > 0) counts.fwd = nums[nums.length - 1]
  if (counts.pt === 0 && (players || []).length >= 10) counts.pt = 1

  return counts
}

function inferOpponentShape(players, formationName, extractedProfile) {
  const counts = countByRoleLine(players, formationName)
  const nums = formationNumbers(formationName)
  const attackers = counts.fwd || (nums.length ? nums[nums.length - 1] : 0)
  const midfielders = counts.mid
  const centralDensity = extractedProfile?.central_density || (
    midfielders >= 4 || String(formationName || '').includes('4-3-1-2') ? 'high' : midfielders >= 3 ? 'medium' : 'low'
  )
  const widthProfile = extractedProfile?.width_profile || (
    /4-3-1-2|4-1-2-1-2|4-3-2-1|3-5-2/i.test(String(formationName || '')) ? 'narrow' :
      /4-3-3|5-2-3|3-4-3/i.test(String(formationName || '')) ? 'wide' : 'balanced'
  )
  const strikerSetup = attackers >= 2 ? 'two_strikers' : attackers === 1 ? 'isolated_or_single_striker' : 'unclear'

  return {
    ...counts,
    centralDensity,
    widthProfile,
    strikerSetup,
    sideBias: extractedProfile?.side_bias || 'unclear',
    attackableZones: Array.isArray(extractedProfile?.attackable_zones) ? extractedProfile.attackable_zones.slice(0, 4) : [],
    defensiveGaps: Array.isArray(extractedProfile?.defensive_gaps) ? extractedProfile.defensive_gaps.slice(0, 4) : [],
    shapeConfidence: Number(extractedProfile?.shape_confidence || extractedProfile?.formation_confidence || 0) || null
  }
}

function formatOpponentRosterText(players, formationName, extractedProfile) {
  if (!Array.isArray(players) || players.length === 0) return ''
  const sorted = [...players].sort((a, b) => (Number(a?.slot_index) || 0) - (Number(b?.slot_index) || 0)).slice(0, 11)
  const shape = inferOpponentShape(sorted, formationName, extractedProfile)
  const lines = []

  lines.push(`\nXI AVVERSARIO DALLA FOTO (${sorted.length} giocatori rilevati):`)
  sorted.forEach((p) => {
    const slot = Number.isFinite(Number(p?.slot_index)) ? Number(p.slot_index) : '?'
    const name = sanitizeForPrompt(p?.player_name || 'Nome non letto', 50)
    const pos = sanitizeForPrompt(p?.position || 'ruolo n/d', 12)
    const ovr = p?.overall_rating != null ? `, OVR ${p.overall_rating}` : ''
    lines.push(`- Slot ${slot}: ${pos} - ${name}${ovr}`)
  })

  lines.push(`\nSHAPE AVVERSARIO (uso interno, non verbalizzare come certezza assoluta):`)
  lines.push(`- Linee: ${shape.pt || 1} PT, ${shape.def} difensori, ${shape.mid} centrocampisti, ${shape.fwd} attaccanti`)
  lines.push(`- Densita centrale: ${shape.centralDensity}`)
  lines.push(`- Ampiezza: ${shape.widthProfile}`)
  lines.push(`- Setup attacco: ${shape.strikerSetup}`)
  if (shape.sideBias && shape.sideBias !== 'unclear') lines.push(`- Lato piu carico: ${shape.sideBias}`)
  if (shape.attackableZones.length > 0) lines.push(`- Zone attaccabili rilevate: ${shape.attackableZones.map(z => sanitizeForPrompt(z, 30)).join(', ')}`)
  if (shape.defensiveGaps.length > 0) lines.push(`- Gap difensivi rilevati: ${shape.defensiveGaps.map(z => sanitizeForPrompt(z, 30)).join(', ')}`)
  if (shape.shapeConfidence) lines.push(`- Confidenza lettura shape: ${Math.round(shape.shapeConfidence * 100)}%`)

  return `${lines.join('\n')}\n`
}

function buildMatchupEngineText({ opponentFormation, opponentPlayers, clientStarters, extractedProfile }) {
  const opponentShape = inferOpponentShape(opponentPlayers, opponentFormation?.formation_name, extractedProfile)
  const clientShape = countByRoleLine(clientStarters || [], '')
  const hints = []

  if (opponentShape.centralDensity === 'high') {
    hints.push('rischio_principale: densita_centrale/TRQ tra le linee')
    hints.push('leva_preferita: istruzione_individuale su MED/CC + uscita su fasce')
  }
  if (opponentShape.widthProfile === 'narrow') {
    hints.push('opportunita: ampiezza e cambi lato contro squadra stretta')
  }
  if (opponentShape.strikerSetup === 'two_strikers') {
    hints.push('rischio: filtranti e combinazioni rapide su due punte')
  }
  if (opponentShape.widthProfile === 'wide') {
    hints.push('rischio_principale: corsie esterne e isolamento terzini')
    hints.push('leva_preferita: copertura fascia/terzino + marcatura su esterno solo se concreto')
  }
  if (clientShape.mid > 0 && opponentShape.mid > clientShape.mid + 1) {
    hints.push('mismatch_centrocampo: avversario superiore numericamente')
  }
  if (opponentShape.attackableZones.length > 0) {
    hints.push(`attacca_zone: ${opponentShape.attackableZones.map(z => sanitizeForPrompt(z, 30)).join(', ')}`)
  }

  if (hints.length === 0) return ''

  return `\nMATCHUP_ENGINE (uso interno, non mostrare all'utente):\n- ${hints.join('\n- ')}\n- Regola anti-ripetizione: scegli la leva primaria in base a questi segnali; non proporre sempre linea bassa/compattezza se il rischio principale e fascia, ampiezza o TRQ.\n`
}

function compactList(values, max = 5) {
  return (Array.isArray(values) ? values : [])
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .slice(0, max)
    .join(', ')
}

function getRelevantStatsSummary(baseStats) {
  if (!baseStats || typeof baseStats !== 'object') return ''
  const wanted = [
    [/passaggio.*alto|lofted|long.*pass|pass.*alto/i, 'Passaggio alto'],
    [/passaggio.*rasoterra|low.*pass|ground.*pass/i, 'Passaggio rasoterra'],
    [/veloc|speed/i, 'Velocita'],
    [/acceler/i, 'Accelerazione'],
    [/resistenza|stamina/i, 'Resistenza'],
    [/finalizz|finishing/i, 'Finalizzazione'],
    [/colpo.*testa|heading/i, 'Colpo di testa'],
    [/comportamento.*difensivo|defensive.*awareness/i, 'Comportamento difensivo'],
    [/contrasto|tackl/i, 'Contrasto'],
    [/aggress/i, 'Aggressivita']
  ]
  const lines = []
  for (const [key, value] of Object.entries(baseStats)) {
    const label = wanted.find(([re]) => re.test(String(key)))?.[1]
    if (!label) continue
    const num = Number(value)
    if (!Number.isFinite(num)) continue
    lines.push(`${label} ${num}`)
  }
  return [...new Set(lines)].slice(0, 5).join(', ')
}

function describePlayingStyleUse(styleName) {
  const s = String(styleName || '').toLowerCase()
  if (!s) return ''
  if (s.includes('tra le linee')) return 'rimane arretrato e offre primo lancio/uscita pulita'
  if (s.includes('collante')) return 'stabilizza davanti alla difesa e aiuta l uscita sicura'
  if (s.includes('giocatore chiave')) return 'attacca gli spazi e si inserisce in transizione'
  if (s.includes('opportunista')) return 'attacca ultima linea e filtranti'
  if (s.includes('rapace')) return 'rende su cross, ribalzi e area'
  if (s.includes('regista creativo')) return 'crea linee di passaggio e soluzioni tra le linee'
  if (s.includes('ala prolifica')) return 'parte larga e taglia dentro'
  if (s.includes('specialista') && s.includes('cross')) return 'mantiene ampiezza e cross'
  if (s.includes('box-to-box')) return 'copre campo e accompagna entrambe le fasi'
  if (s.includes('onnipresente')) return 'copre molte zone e sostiene pressione/transizioni'
  if (s.includes('incontrista')) return 'porta aggressivita e recupero palla'
  if (s.includes('sviluppo')) return 'imposta da dietro e apre con lanci'
  if (s.includes('terzino offensivo')) return 'dà sovrapposizione e ampiezza'
  if (s.includes('terzino difensivo')) return 'resta prudente e protegge la fascia'
  if (s.includes('terzino mattatore')) return 'si inserisce dentro al campo'
  if (s.includes('fulcro')) return 'gioca da riferimento fisico e sponda'
  if (s.includes('senza palla')) return 'muove la difesa e apre spazi'
  if (s.includes('classico')) return 'gestisce ritmo e rifinitura'
  return ''
}

function formatCardLevers(player, stylesLookup) {
  const styleName = getPlayerStyleDisplayName(player, stylesLookup)
  const styleUse = describePlayingStyleUse(styleName)
  const skills = compactList(player?.skills, 5) || compactList(player?.com_skills, 4)
  const stats = getRelevantStatsSummary(player?.base_stats)
  const parts = []
  if (styleName) parts.push(`Stile card: ${styleName}${styleUse ? ` (${styleUse})` : ''}`)
  if (skills) parts.push(`Skill: ${skills}`)
  if (stats) parts.push(`Stat utili: ${stats}`)
  return parts.join(' | ')
}

function buildCardUsageText(titolari, stylesLookup) {
  if (!Array.isArray(titolari) || titolari.length === 0) return ''
  const rows = titolari
    .map((p) => {
      const levers = formatCardLevers(p, stylesLookup)
      if (!levers) return ''
      return `- [${p.id}] ${p.player_name || 'N/A'} (${p.position || 'N/A'}): ${levers}`
    })
    .filter(Boolean)
    .slice(0, 11)
  if (rows.length === 0) return ''
  return `\nLEVE CARD TITOLARI (uso interno per consigli pratici):\n${rows.join('\n')}\n- Usa queste leve per costruire piani concreti: chi deve lanciare, chi deve ricevere, chi copre, chi tiene ampiezza. Non inventare azioni fatte: trasforma skill/stili in istruzioni pratiche sicure.\n`
}

/**
 * Identifica se formazione è meta
 */
export function identifyMetaFormation(formationName, playingStyle) {
  const metaFormations = ['4-3-3', '4-2-3-1', '5-2-3', '3-5-2']
  const metaStyles = ['quick_counter', 'contropiede_veloce']
  
  const isMetaFormation = formationName && metaFormations.some(meta => 
    formationName.includes(meta) || formationName === meta
  )
  
  const isMetaStyle = playingStyle && metaStyles.some(meta => 
    playingStyle.toLowerCase().includes(meta.replace('_', ' '))
  )
  
  return {
    isMeta: isMetaFormation || isMetaStyle,
    metaType: isMetaFormation ? formationName : (isMetaStyle ? 'quick_counter' : null),
    formationName,
    playingStyle
  }
}

/**
 * Genera prompt per contromisure GPT-5.2
 * @async
 */
export async function generateCountermeasuresPrompt(
  opponentFormation,
  clientRoster,
  clientFormation,
  tacticalSettings,
  activeCoach,
  matchHistory,
  tacticalPatterns,
  playerPerformance,
  lang = 'it'
) {
  const metaInfo = identifyMetaFormation(
    opponentFormation.formation_name,
    opponentFormation.playing_style
  )
  
  // Costruisci sezione formazione avversaria
  // Leggi da campi separati (con fallback su extracted_data per retrocompatibilità)
  const overallStrength = opponentFormation.overall_strength || opponentFormation.extracted_data?.overall_strength
  const players = opponentFormation.players || opponentFormation.extracted_data?.players || []
  const tacticalStyle = opponentFormation.tactical_style || opponentFormation.extracted_data?.tactical_style
  const opponentCoach = opponentFormation.extracted_data?.coach || null // Coach avversario (opzionale)
  const visualTacticalProfile = opponentFormation.extracted_data?.visual_tactical_profile || null
  
  let opponentText = `Formazione AVVERSARIA:\n`
  opponentText += `- Formazione: ${opponentFormation.formation_name || 'N/A'}\n`
  opponentText += `- Stile: ${opponentFormation.playing_style || 'N/A'}\n`
  if (tacticalStyle) {
    opponentText += `- Stile Tattico: ${tacticalStyle}\n`
  }
  if (overallStrength) {
    opponentText += `- Forza: ${overallStrength}\n`
  }
  if (Array.isArray(players) && players.length > 0) {
    opponentText += formatOpponentRosterText(players, opponentFormation.formation_name, visualTacticalProfile)
  }
  
  // Aggiungi info allenatore avversario se presente
  if (opponentCoach && opponentCoach.coach_name) {
    opponentText += `\nALLENATORE AVVERSARIO:\n`
    opponentText += `- Nome: ${opponentCoach.coach_name || 'N/A'}\n`
    if (opponentCoach.age) {
      opponentText += `- Età: ${opponentCoach.age}\n`
    }
    if (opponentCoach.nationality) {
      opponentText += `- Nazionalità: ${opponentCoach.nationality}\n`
    }
    if (opponentCoach.team) {
      opponentText += `- Squadra: ${opponentCoach.team}\n`
    }
    if (opponentCoach.category) {
      opponentText += `- Categoria: ${opponentCoach.category}\n`
    }
    if (opponentCoach.pack_type) {
      opponentText += `- Pack: ${opponentCoach.pack_type}\n`
    }
    // Competenze stile di gioco se presenti
    if (opponentCoach.playing_style_competence && typeof opponentCoach.playing_style_competence === 'object') {
      opponentText += `- Competenze Stili di Gioco:\n`
      Object.entries(opponentCoach.playing_style_competence).forEach(([style, value]) => {
        const styleNames = {
          'possesso_palla': 'Possesso Palla',
          'contropiede_veloce': 'Contropiede Veloce',
          'contrattacco': 'Contrattacco',
          'vie_laterali': 'Vie Laterali',
          'passaggio_lungo': 'Passaggio Lungo'
        }
        const styleName = styleNames[style] || style
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0
        opponentText += `  * ${styleName}: ${numValue}\n`
      })
    }
    // Stat boosters se presenti
    if (opponentCoach.stat_boosters && Array.isArray(opponentCoach.stat_boosters) && opponentCoach.stat_boosters.length > 0) {
      opponentText += `- Stat Boosters: ${opponentCoach.stat_boosters.length} boosters\n`
      opponentCoach.stat_boosters.slice(0, 3).forEach(booster => {
        const statName = booster.stat_name || booster.name || 'N/A'
        const bonus = booster.bonus || booster.value || 0
        opponentText += `  * ${statName}: +${bonus}\n`
      })
    }
    // Connection se presente
    if (opponentCoach.connection && opponentCoach.connection.name) {
      opponentText += `- Connection: ${opponentCoach.connection.name}\n`
      if (opponentCoach.connection.focal_point) {
        opponentText += `  * Focal Point: ${opponentCoach.connection.focal_point.playing_style || 'N/A'} (${opponentCoach.connection.focal_point.position || 'N/A'})\n`
      }
      if (opponentCoach.connection.key_man) {
        opponentText += `  * Key Man: ${opponentCoach.connection.key_man.playing_style || 'N/A'} (${opponentCoach.connection.key_man.position || 'N/A'})\n`
      }
    }
    opponentText += `\n⚠️ NOTA: Considera le competenze dell'allenatore avversario per prevedere le sue scelte tattiche.\n`
  }
  
  if (metaInfo.isMeta) {
    opponentText += `\n⚠️ FORMAZIONE META IDENTIFICATA: ${metaInfo.metaType || opponentFormation.formation_name}\n`
    opponentText += `Questa è una formazione meta comune. Applica contromisure specifiche basate su best practices community.\n`
  }

  // Titolari/riserve da playerPerformance (route passa titolari/riserve). Definire prima dell'uso.
  const titolari = playerPerformance?.titolari || []
  const riserve = playerPerformance?.riserve || []
  const hasTitolariRiserve = Array.isArray(titolari) && Array.isArray(riserve)
  const stylesLookup = playerPerformance?.stylesLookup || {}
  const matchupEngineText = buildMatchupEngineText({
    opponentFormation,
    opponentPlayers: players,
    clientStarters: titolari,
    extractedProfile: visualTacticalProfile
  })
  
  // Costruisci sezione rosa cliente: se abbiamo titolari/riserve espliciti, usali (audit contromisure)
  let rosterText = ''
  const outOfPositionStarters = []
  if (hasTitolariRiserve) {
    rosterText = `\nTITOLARI (in campo, ${titolari.length}):\n`
    titolari.forEach((p, idx) => {
      const currentPosition = p.position // Posizione attuale (adattata allo slot)
      const originalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
        ? p.original_positions
        : (p.position ? [{ position: p.position, competence: "Alta" }] : [])
      
      // Verifica se posizione attuale è tra quelle originali
      const positionCheck = isPositionOriginal(currentPosition, originalPositions)
      const isOriginalPosition = positionCheck.isOriginal
      
      const slot = p.slot_index != null ? ` slot ${p.slot_index}` : ''
      const cardLevers = formatCardLevers(p, stylesLookup)
      const sk = (p.skills && Array.isArray(p.skills) ? p.skills.slice(0, 5).join(', ') : '') || (p.com_skills && Array.isArray(p.com_skills) ? p.com_skills.slice(0, 4).join(', ') : '')
      const skillsPart = sk ? ` (${sk})` : ''
      
      // Verifica se dati sono verificati (per regole comunicazione)
      const isVerified = p.photo_slots && typeof p.photo_slots === 'object' && p.photo_slots.card === true
      const hasOriginalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
      const verifiedMarker = isVerified && hasOriginalPositions ? ' ✅' : (isVerified ? ' ⚠️' : ' ❌')
      
      // DISCRETO: Mostra solo info base, NON dire esplicitamente "ATTENZIONE" nel prompt
      rosterText += `- [${p.id}] ${p.player_name || 'N/A'} - ${currentPosition || 'N/A'} - Overall ${p.overall_rating || 'N/A'}${skillsPart}${slot}${verifiedMarker}\n`
      if (cardLevers) {
        rosterText += `  Leve card: ${cardLevers}\n`
      }
      
      // Solo se NON è originale, aggiungi info discreta (per analisi IA, NON per cliente)
      if (!isOriginalPosition && originalPositions.length > 0) {
        const originalPosList = formatOriginalPositions(originalPositions)
        outOfPositionStarters.push({
          id: p.id,
          name: p.player_name || 'N/A',
          currentPosition: currentPosition || 'N/A',
          originalPositions: originalPosList || 'N/A',
          slot: p.slot_index
        })
        rosterText += `  (FUORI POSIZIONE: ruolo attuale ${currentPosition || 'N/A'}; posizioni card: ${originalPosList || 'N/A'})\n`
      }
      
      // Se NON verificato, aggiungi warning discreto per IA
      if (!isVerified || !hasOriginalPositions) {
        rosterText += `  (⚠️ Dati posizione/overall non verificati - NON menzionare posizione specifica o overall al cliente)\n`
      }
      
      // Warning su skills/overall = caratteristiche, non performance match
      if (skillsPart) {
        rosterText += `  (⚠️ Skills/Overall = caratteristiche giocatore, NON azioni/performance nel match)\n`
      }
    })

    if (outOfPositionStarters.length > 0) {
      rosterText += `\n⚠️ TITOLARI FUORI POSIZIONE (priorità fit prima di altri cambi):\n`
      outOfPositionStarters.forEach(p => {
        const slot = p.slot != null ? ` slot ${p.slot}` : ''
        rosterText += `- [${p.id}] ${p.name}${slot}: in campo ${p.currentPosition}; posizioni card ${p.originalPositions}\n`
      })
    }

    rosterText += `\nRISERVE (panchina, ${riserve.length}):\n`
    riserve.slice(0, 12).forEach((p, idx) => {
      const sk = (p.skills && Array.isArray(p.skills) ? p.skills.slice(0, 4).join(', ') : '') || (p.com_skills && Array.isArray(p.com_skills) ? p.com_skills.slice(0, 3).join(', ') : '')
      const skillsPart = sk ? ` (${sk})` : ''
      const cardLevers = formatCardLevers(p, stylesLookup)
      const originalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
        ? p.original_positions.map(op => (typeof op === 'string' ? op : op?.position)).filter(Boolean)
        : []
      const originalPart = originalPositions.length > 0 ? ` | Posizioni card: ${originalPositions.join(', ')}` : ''
      rosterText += `- [${p.id}] ${p.player_name || 'N/A'} - ${p.position || 'N/A'} - Overall ${p.overall_rating || 'N/A'}${skillsPart}${originalPart}\n`
      if (cardLevers) {
        rosterText += `  Leve card: ${cardLevers}\n`
      }
    })
  }
  if (!rosterText) {
    rosterText = `\nROSA CLIENTE (${clientRoster.length} giocatori):\n`
    clientRoster.slice(0, 50).forEach((player, idx) => {
      const skills = player.skills && Array.isArray(player.skills) ? player.skills.slice(0, 3).join(', ') : ''
      const comSkills = player.com_skills && Array.isArray(player.com_skills) ? player.com_skills.slice(0, 2).join(', ') : ''
      const skillsText = skills || comSkills ? ` (Skills: ${skills || comSkills})` : ''
      rosterText += `${idx + 1}. ${player.player_name || 'N/A'} - ${player.position || 'N/A'} - Overall: ${player.overall_rating || 'N/A'}${skillsText}\n`
    })
    if (clientRoster.length > 50) rosterText += `... e altri ${clientRoster.length - 50} giocatori\n`
  }

  // Costruisci sezione formazione cliente: DISPOSIZIONE REALE in campo (da titolari per slot),
  // non solo il nome modulo (formation_layout.formation), per coerenza con la formazione effettiva.
  let formationText = `\nFormazione CLIENTE ATTUALE:\n`
  if (hasTitolariRiserve && titolari.length > 0) {
    const positionsOrdered = titolari.map(p => (p.position || '?').trim() || '?').join(', ')
    const DEF = ['DC', 'TD', 'TS']
    const MID = ['MED', 'CC', 'TRQ', 'CLS', 'CLD']
    const FWD = ['P', 'SP', 'CF']
    const counts = { pt: 0, def: 0, mid: 0, fwd: 0 }
    titolari.forEach(p => {
      const pos = (p.position || '').toUpperCase().trim()
      if (pos === 'PT') counts.pt += 1
      else if (DEF.includes(pos)) counts.def += 1
      else if (MID.includes(pos)) counts.mid += 1
      else if (FWD.includes(pos)) counts.fwd += 1
    })
    const summaryParts = []
    if (counts.pt) summaryParts.push('1 PT')
    if (counts.def) summaryParts.push(`${counts.def} difensori`)
    if (counts.mid) summaryParts.push(`${counts.mid} centrocampo`)
    if (counts.fwd) summaryParts.push(`${counts.fwd} attaccanti`)
    const dispositionSummary = summaryParts.length ? ` (${summaryParts.join(', ')})` : ''
    formationText += `- Disposizione in campo (RIFERIMENTO PRINCIPALE): ${positionsOrdered || 'N/A'}${dispositionSummary}\n`
    formationText += `- Difesa attuale (DC/TD/TS in titolari): ${formatDefenseLineupSummary(titolari)}\n`
    formationText += `- Titolari: ${titolari.length} giocatori (vedi elenco TITOLARI sopra)\n`
  }
  if (clientFormation) {
    formationText += `- Modulo (etichetta): ${clientFormation.formation || 'N/A'}\n`
    if (!hasTitolariRiserve && clientFormation.slot_positions) {
      const slotCount = Object.keys(clientFormation.slot_positions).filter(slot =>
        clientFormation.slot_positions[slot] && slot >= 0 && slot <= 10
      ).length
      formationText += `- Titolari: ${slotCount} slot formazione\n`
    }
  } else if (!hasTitolariRiserve || titolari.length === 0) {
    formationText += `- Formazione: Non configurata\n`
  }
  
  // Costruisci sezione impostazioni tattiche
  let tacticalText = `\nIMPOSTAZIONI TATTICHE CLIENTE:\n`
  if (tacticalSettings) {
    tacticalText += `- Team Playing Style: ${tacticalSettings.team_playing_style || 'N/A'}\n`
    if (tacticalSettings.individual_instructions && Object.keys(tacticalSettings.individual_instructions).length > 0) {
      tacticalText += `- Istruzioni Individuali (${Object.keys(tacticalSettings.individual_instructions).length} configurate):\n`
      
      // Mostra dettagli per ogni istruzione
      Object.entries(tacticalSettings.individual_instructions).forEach(([category, instruction]) => {
        if (instruction && instruction.enabled && instruction.player_id) {
          // Trova giocatore nella rosa
          const player = hasTitolariRiserve 
            ? [...titolari, ...riserve].find(p => p.id === instruction.player_id)
            : clientRoster.find(p => p.id === instruction.player_id)
          const playerName = player ? player.player_name : `ID: ${instruction.player_id}`
          const instructionName = instruction.instruction || 'N/A'
          
          tacticalText += `  - ${category}: ${playerName} → ${instructionName}\n`
        }
      })
    }
  } else {
    tacticalText += `- Impostazioni: Non configurate\n`
  }
  
  // ✅ FIX: Costruisci sezione allenatore con competenze numeriche e istruzioni esplicite
  let coachText = `\nALLENATORE CLIENTE:\n`
  if (activeCoach) {
    if (activeCoach.coach_name) {
      coachText += `- Nome: ${activeCoach.coach_name}\n`
    }
    
    if (activeCoach.playing_style_competence && typeof activeCoach.playing_style_competence === 'object') {
      coachText += `- Competenze Stili di Gioco (valori 0-100, più alto = più competente):\n`
      
      // Mappa nomi italiani per chiarezza
      const styleNames = {
        'possesso_palla': 'Possesso Palla',
        'contropiede_veloce': 'Contropiede Veloce',
        'contrattacco': 'Contrattacco',
        'vie_laterali': 'Vie Laterali',
        'passaggio_lungo': 'Passaggio Lungo'
      }
      
      const competences = []
      Object.entries(activeCoach.playing_style_competence).forEach(([style, value]) => {
        const styleName = styleNames[style] || style
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0
        competences.push({ style, styleName, value: numValue })
      })
      
      // Ordina per valore (dal più alto)
      competences.sort((a, b) => b.value - a.value)
      
      competences.forEach(({ styleName, value }) => {
        const level = value >= 80 ? '🔴 ALTA' : value >= 60 ? '🟡 MEDIA' : '⚪ BASSA'
        coachText += `  * ${styleName}: ${value} ${level}\n`
      })
      
      // Identifica stili suggeribili (>= 70) e VIETATI (< 70)
      const highCompetences = competences.filter(c => c.value >= 70).map(c => c.styleName)
      const forbiddenStyles = competences.filter(c => c.value < 70).map(c => `${c.styleName} (${c.value})`)
      
      coachText += `\n⚠️ VINCOLO OBBLIGATORIO ALLENATORE (NON IGNORARE):\n`
      if (highCompetences.length > 0) {
        coachText += `- Stili SUGGERIBILI (competenza >= 70): ${highCompetences.join(', ')}\n`
        coachText += `  → Puoi suggerire SOLO questi stili. L'allenatore è competente solo in questi.\n`
      }
      if (forbiddenStyles.length > 0) {
        coachText += `- Stili VIETATI (competenza < 70): ${forbiddenStyles.join(', ')}\n`
        coachText += `  → NON SUGGERIRE MAI questi stili. Anche 60 o 65 NON basta: serve >= 70.\n`
      }
      coachText += `- Se suggerisci formazione + stile, lo stile DEVE essere tra quelli con competenza >= 70\n`
      coachText += `- Esempio: Contropiede 60 → VIETATO. Possesso 85 → OK. Contrattacco 72 → OK.\n`
    }
    
    if (activeCoach.stat_boosters && Array.isArray(activeCoach.stat_boosters) && activeCoach.stat_boosters.length > 0) {
      coachText += `- Stat Boosters: ${activeCoach.stat_boosters.length} boosters attivi\n`
      activeCoach.stat_boosters.slice(0, 3).forEach(booster => {
        const statName = booster.stat_name || booster.name || 'N/A'
        const bonus = booster.bonus || booster.value || 0
        coachText += `  * ${statName}: +${bonus}\n`
      })
    }
    
    if (activeCoach.connection && activeCoach.connection.name) {
      coachText += `- Connection: ${activeCoach.connection.name}\n`
    }
  } else {
    coachText += `- Allenatore: Non configurato\n`
    coachText += `⚠️ Nota: Senza allenatore configurato, i suggerimenti non considerano competenze specifiche.\n`
  }
  
  const cardUsageText = buildCardUsageText(titolari, stylesLookup)

  // ✅ Sezione dati memoria Attila modulare (RAG selettivo)
  const teamPlayingStyle = playerPerformance?.team_playing_style || null
  let attilaMemoryAnalysis = ''
  
  // Carica memoria Attila modulare basata su contesto
  try {
    // Budget stretto: solo regole pre-partita essenziali, evitando rumore da meccaniche in-match.
    const attilaMemoryContent = getRelevantSectionsForContext('countermeasures', 22000)
    
    // Mantieni logica esistente per stili critici e connection (coerenza con codice esistente)
    if (hasTitolariRiserve && (titolari.length > 0 || riserve.length > 0)) {
      attilaMemoryAnalysis = `\n\n📌 MEMORIA ATTILA - eFootball (Conoscenza Tattica):\n`
      attilaMemoryAnalysis += `Usa questi dati per suggerimenti, ma SE NON SEI SICURO di una compatibilità/sinergia, NON menzionarla esplicitamente.\n`
      attilaMemoryAnalysis += `MEGLIO GENERICO CHE SBAGLIATO. Comunica solo decisioni chiare, non spiegazioni tecniche complesse.\n\n`
      
      // Aggiungi contenuto modulare se disponibile
      if (attilaMemoryContent && attilaMemoryContent.length > 0) {
        attilaMemoryAnalysis += `${attilaMemoryContent}\n\n`
      }
      
      const allPlayers = [...titolari, ...riserve]
      const playersWithStyle = allPlayers.filter(p => getPlayerStyleDisplayName(p, stylesLookup))
      
      // Solo stili speciali critici (Collante, Giocatore chiave) - quelli davvero importanti
      if (playersWithStyle.length > 0) {
        const criticalStyles = ['Collante', 'Giocatore chiave']
        const playersByStyle = {}
        playersWithStyle.forEach(p => {
          const styleName = getPlayerStyleDisplayName(p, stylesLookup)
          criticalStyles.forEach(critical => {
            if (styleName && styleName.includes(critical)) {
              if (!playersByStyle[critical]) playersByStyle[critical] = []
              playersByStyle[critical].push(p)
            }
          })
        })
        
        if (Object.keys(playersByStyle).length > 0) {
          attilaMemoryAnalysis += `**STILI SPECIALI CRITICI (solo se presenti):**\n`
          if (playersByStyle['Collante']) {
            attilaMemoryAnalysis += `- Collante: ${playersByStyle['Collante'].map(p => p.player_name).join(', ')} (centrocampista arretrato, bilancia difesa/attacco)\n`
          }
          if (playersByStyle['Giocatore chiave']) {
            attilaMemoryAnalysis += `- Giocatore chiave: ${playersByStyle['Giocatore chiave'].map(p => p.player_name).join(', ')} (fiuto del gol, sempre in avanti)\n`
          }
          attilaMemoryAnalysis += `\n`
        }
      }
      
      // Connection solo se presente e con giocatori compatibili CERTI
      if (activeCoach && activeCoach.connection && activeCoach.connection.name) {
        const allPlayers = [...titolari, ...riserve]
        let hasCompatiblePlayers = false
        let compatibleInfo = ''
        
        if (activeCoach.connection.focal_point) {
          const focalPoint = activeCoach.connection.focal_point
          const compatible = allPlayers.filter(p => {
            // Solo match esatti, niente fuzzy
            if (focalPoint.position && p.position === focalPoint.position) return true
            if (focalPoint.playing_style) {
              return playingStylesMatch(getPlayerStyleDisplayName(p, stylesLookup), focalPoint.playing_style)
            }
            return false
          })
          if (compatible.length > 0) {
            hasCompatiblePlayers = true
            compatibleInfo += `Focal Point: ${compatible.map(p => p.player_name).join(', ')} | `
          }
        }
        
        if (activeCoach.connection.key_man) {
          const keyMan = activeCoach.connection.key_man
          const compatible = allPlayers.filter(p => {
            // Solo match esatti, niente fuzzy
            if (keyMan.position && p.position === keyMan.position) return true
            if (keyMan.playing_style) {
              return playingStylesMatch(getPlayerStyleDisplayName(p, stylesLookup), keyMan.playing_style)
            }
            return false
          })
          if (compatible.length > 0) {
            hasCompatiblePlayers = true
            compatibleInfo += `Key Man: ${compatible.map(p => p.player_name).join(', ')}`
          }
        }
        
        // Solo se ci sono giocatori compatibili CERTI
        if (hasCompatiblePlayers) {
          attilaMemoryAnalysis += `**CONNECTION ALLENATORE:** ${activeCoach.connection.name}\n`
          attilaMemoryAnalysis += `Giocatori compatibili: ${compatibleInfo}\n`
          attilaMemoryAnalysis += `(Considera questi giocatori per sinergie, ma solo se sei SICURO della compatibilità)\n\n`
        }
      }
      
      // Team playing style solo se presente
      if (teamPlayingStyle) {
        attilaMemoryAnalysis += `**TEAM PLAYING STYLE:** ${teamPlayingStyle}\n`
        attilaMemoryAnalysis += `(Considera compatibilità con stili giocatori, ma solo se sei SICURO)\n\n`
      }
      
      // Regola generale: posizioni originali (SICURA per pre-partita)
      attilaMemoryAnalysis += `**REGOLA GENERALE (SICURA - PRE-PARTITA):**\n`
      attilaMemoryAnalysis += `- Giocatori performano meglio in posizioni originali (competenza ALTA/INTERMEDIA)\n`
      attilaMemoryAnalysis += `- Quando suggerisci cambi formazione o sostituzioni PRE-PARTITA, privilegia giocatori in posizioni originali\n`
      attilaMemoryAnalysis += `- Questa è una regola SICURA e sempre applicabile per preparazione pre-partita\n\n`
    }
  } catch (error) {
    // Fallback graceful: se memoria modulare fallisce, usa solo logica esistente
    console.error('[countermeasuresHelper] Error loading Attila memory:', error)
    // Mantieni comportamento esistente senza memoria modulare
    if (hasTitolariRiserve && (titolari.length > 0 || riserve.length > 0)) {
      attilaMemoryAnalysis = `\n\n📌 DATI ROSA PER DECISIONI (Memoria Attila - eFootball):\n`
      attilaMemoryAnalysis += `Usa questi dati per suggerimenti, ma SE NON SEI SICURO di una compatibilità/sinergia, NON menzionarla esplicitamente.\n`
      attilaMemoryAnalysis += `MEGLIO GENERICO CHE SBAGLIATO. Comunica solo decisioni chiare, non spiegazioni tecniche complesse.\n\n`
      
      // Regola generale: posizioni originali (SICURA per pre-partita)
      attilaMemoryAnalysis += `**REGOLA GENERALE (SICURA - PRE-PARTITA):**\n`
      attilaMemoryAnalysis += `- Giocatori performano meglio in posizioni originali (competenza ALTA/INTERMEDIA)\n`
      attilaMemoryAnalysis += `- Quando suggerisci cambi formazione o sostituzioni PRE-PARTITA, privilegia giocatori in posizioni originali\n`
      attilaMemoryAnalysis += `- Questa è una regola SICURA e sempre applicabile per preparazione pre-partita\n\n`
    }
  }
  
  // Costruisci sezione storico con analisi approfondita
  let historyText = ''
  let similarFormationAnalysis = ''
  let playerPerformanceAnalysis = ''
  let tacticalHabitsAnalysis = ''
  
  // Estrai dati analisi approfondita
  const similarFormationMatches = playerPerformance?.similarFormationMatches || []
  const playerPerformanceAgainstSimilar = playerPerformance?.playerPerformanceAgainstSimilar || {}
  const tacticalHabits = playerPerformance?.tacticalHabits || {}
  
  if (matchHistory && matchHistory.length > 0) {
    historyText = `\nSTORICO MATCH COMPLETO (ultimi ${matchHistory.length}):\n`
    matchHistory.slice(0, 15).forEach((match, idx) => {
      const isSimilar = similarFormationMatches.some(sm => sm.id === match.id)
      const marker = isSimilar ? '⚠️ SIMILE' : ''
      historyText += `${idx + 1}. ${marker} vs ${sanitizeForPrompt(match.opponent_name || 'N/A', 40)} - ${sanitizeForPrompt(match.result || 'N/A', 20)} - Formazione: ${sanitizeForPrompt(match.formation_played || 'N/A', 20)} - Stile: ${sanitizeForPrompt(match.playing_style_played || 'N/A', 20)}\n`
    })
  }

  // Analisi match con formazioni simili
  if (similarFormationMatches.length > 0) {
    const wins = similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
    }).length
    const losses = similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')
    }).length
    const draws = similarFormationMatches.length - wins - losses
    const winRate = similarFormationMatches.length > 0 ? ((wins / similarFormationMatches.length) * 100).toFixed(0) : 0
    
    similarFormationAnalysis = `\n⚠️ ANALISI CRITICA: MATCH CONTRO FORMAZIONI SIMILI:\n`
    similarFormationAnalysis += `- Match trovati con formazione simile: ${similarFormationMatches.length}\n`
    similarFormationAnalysis += `- Vittorie: ${wins} | Sconfitte: ${losses} | Pareggi: ${draws}\n`
    similarFormationAnalysis += `- Win Rate: ${winRate}%\n`
    
    if (losses > wins) {
      similarFormationAnalysis += `\n🚨 PROBLEMA IDENTIFICATO: Il cliente ha più sconfitte che vittorie contro formazioni simili!\n`
      similarFormationAnalysis += `- Questo indica una debolezza tattica specifica contro questo tipo di formazione\n`
      similarFormationAnalysis += `- È CRITICO suggerire contromisure specifiche e alternative tattiche\n`
    }
    
    if (similarFormationMatches.length >= 3) {
      similarFormationAnalysis += `\n- Pattern identificato: Il cliente ha già giocato ${similarFormationMatches.length} volte contro formazioni simili\n`
      similarFormationAnalysis += `- Usa questo storico per suggerimenti basati su esperienza reale\n`
    }
  } else {
    similarFormationAnalysis = `\n⚠️ NOTA: Nessun match storico trovato contro formazioni simili.\n`
    similarFormationAnalysis += `- Questo è il primo match contro questo tipo di formazione (o dati insufficienti)\n`
    similarFormationAnalysis += `- Suggerisci contromisure basate su best practices community\n`
  }

  // Analisi performance giocatori contro formazioni simili
  if (Object.keys(playerPerformanceAgainstSimilar).length > 0) {
    playerPerformanceAnalysis = `\n📊 PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:\n`
    
    // Identifica giocatori che soffrono (rating medio < 6.0)
    const strugglingPlayers = []
    const strongPlayers = []
    
    Object.entries(playerPerformanceAgainstSimilar).forEach(([playerId, perf]) => {
      const avgRating = perf.matches > 0 ? perf.totalRating / perf.matches : 0
      const playerInfo = {
        id: playerId,
        name: perf.playerName,
        avgRating: avgRating.toFixed(1),
        matches: perf.matches,
        minRating: Math.min(...perf.ratings),
        maxRating: Math.max(...perf.ratings)
      }
      
      if (avgRating < 6.0 && perf.matches >= 2) {
        strugglingPlayers.push(playerInfo)
      } else if (avgRating >= 7.0 && perf.matches >= 2) {
        strongPlayers.push(playerInfo)
      }
    })
    
    if (strugglingPlayers.length > 0) {
      playerPerformanceAnalysis += `\n🚨 GIOCATORI CHE SOFFRONO (rating < 6.0):\n`
      strugglingPlayers.forEach(player => {
        playerPerformanceAnalysis += `- ${player.name}: Rating medio ${player.avgRating} in ${player.matches} match (min: ${player.minRating}, max: ${player.maxRating})\n`
        playerPerformanceAnalysis += `  → Proponi cambio diretto X→Y solo se esiste una riserva compatibile nello stesso slot; altrimenti non proporre sostituzioni\n`
      })
    }
    
    if (strongPlayers.length > 0) {
      playerPerformanceAnalysis += `\n✅ GIOCATORI CHE PERFORMANO BENE (rating >= 7.0):\n`
      strongPlayers.forEach(player => {
        playerPerformanceAnalysis += `- ${player.name}: Rating medio ${player.avgRating} in ${player.matches} match\n`
        playerPerformanceAnalysis += `  → Mantieni in formazione, sono efficaci contro questo tipo di avversario\n`
      })
    }
    
    if (strugglingPlayers.length === 0 && strongPlayers.length === 0) {
      playerPerformanceAnalysis += `- Dati insufficienti per analisi performance specifiche\n`
    }
  }

  // Analisi abitudini tattiche cliente
  if (tacticalHabits.preferredFormations && Object.keys(tacticalHabits.preferredFormations).length > 0) {
    tacticalHabitsAnalysis = `\n🎯 ABITUDINI TATTICHE CLIENTE:\n`
    
    // Formazioni preferite
    const sortedFormations = Object.entries(tacticalHabits.preferredFormations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    tacticalHabitsAnalysis += `\nFormazioni Preferite (più usate):\n`
    sortedFormations.forEach(([formation, count]) => {
      const winRate = tacticalHabits.winRateByFormation[formation]
      if (winRate) {
        const winRatePct = winRate.total > 0 ? ((winRate.wins / winRate.total) * 100).toFixed(0) : 0
        tacticalHabitsAnalysis += `- ${formation}: ${count} match | Win Rate: ${winRatePct}% (${winRate.wins}W/${winRate.losses}L/${winRate.draws}D)\n`
      } else {
        tacticalHabitsAnalysis += `- ${formation}: ${count} match\n`
      }
    })
    
    // Stili preferiti
    if (tacticalHabits.preferredStyles && Object.keys(tacticalHabits.preferredStyles).length > 0) {
      const sortedStyles = Object.entries(tacticalHabits.preferredStyles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
      
      tacticalHabitsAnalysis += `\nStili di Gioco Preferiti:\n`
      sortedStyles.forEach(([style, count]) => {
        tacticalHabitsAnalysis += `- ${style}: ${count} match\n`
      })
    }
    
    // Identifica problematiche
    const problematicFormations = Object.entries(tacticalHabits.winRateByFormation)
      .filter(([formation, stats]) => {
        const winRate = stats.total > 0 ? stats.wins / stats.total : 0
        return stats.total >= 3 && winRate < 0.4 // Win rate < 40% con almeno 3 match
      })
    
    if (problematicFormations.length > 0) {
      tacticalHabitsAnalysis += `\n⚠️ FORMAZIONI PROBLEMATICHE (Win Rate < 40%):\n`
      problematicFormations.forEach(([formation, stats]) => {
        const winRate = (stats.wins / stats.total * 100).toFixed(0)
        tacticalHabitsAnalysis += `- ${formation}: Win Rate ${winRate}% (${stats.wins}W/${stats.losses}L in ${stats.total} match)\n`
        tacticalHabitsAnalysis += `  → Il cliente ha difficoltà con questa formazione, suggerisci alternative\n`
      })
    }
  }
  
  // Costruisci sezione pattern tattici (opzionale)
  let patternsText = ''
  if (tacticalPatterns) {
    if (tacticalPatterns.formation_usage && Object.keys(tacticalPatterns.formation_usage).length > 0) {
      patternsText = `\nPATTERN FORMAZIONI CLIENTE:\n`
      Object.entries(tacticalPatterns.formation_usage).slice(0, 5).forEach(([formation, stats]) => {
        patternsText += `- ${formation}: ${stats.matches || 0} match, win rate: ${(stats.win_rate * 100).toFixed(0)}%\n`
      })
    }
    if (tacticalPatterns.recurring_issues && Array.isArray(tacticalPatterns.recurring_issues) && tacticalPatterns.recurring_issues.length > 0) {
      patternsText += `\nPROBLEMI RICORRENTI:\n`
      tacticalPatterns.recurring_issues.slice(0, 3).forEach(issue => {
        patternsText += `- ${issue.issue} (frequenza: ${issue.frequency})\n`
      })
    }
  }
  
  // Esperienza utente dalla Palestra Coach (feedback reali — allineamento con chat principale)
  let userExperienceText = ''
  const feedbackRows = playerPerformance?.coachFeedback || []
  const userProf = playerPerformance?.userProfile || null
  const gameStats = playerPerformance?.gameAnalysis || null

  if (feedbackRows.length > 0 || userProf?.ai_weak_point || gameStats) {
    userExperienceText = '\n\nESPERIENZA UTENTE (feedback reali — DEVI tenerne conto):\n'

    if (feedbackRows.length > 0) {
      const weaknesses = []
      const strengths = []
      const lessons = []
      for (const row of feedbackRows) {
        const ins = Array.isArray(row.insights) ? row.insights : []
        const ctx = [
          sanitizeForPrompt(row.formation_played, 20),
          sanitizeForPrompt(row.opponent_name, 30),
          sanitizeForPrompt(row.outcome, 20)
        ].filter(Boolean).join(', ')
        for (const i of ins) {
          if (!i || !i.text) continue
          const entry = `${sanitizeForPrompt(i.text, 180)}${ctx ? ` [${ctx}]` : ''}`
          if (i.type === 'weakness') weaknesses.push(entry)
          else if (i.type === 'strength') strengths.push(entry)
          else lessons.push(entry)
        }
      }
      if (weaknesses.length > 0) userExperienceText += `  EVITA (problemi segnalati dal cliente): ${weaknesses.join('; ')}\n`
      if (strengths.length > 0) userExperienceText += `  RINFORZA (ha funzionato bene): ${strengths.join('; ')}\n`
      if (lessons.length > 0) userExperienceText += `  ADATTA (lezioni apprese): ${lessons.join('; ')}\n`
    }

    if (userProf) {
      const profLines = []
      if (userProf.ai_weak_point) profLines.push(`Punto debole dichiarato: ${userProf.ai_weak_point}`)
      if (userProf.connection_quality) profLines.push(`Connessione: ${userProf.connection_quality}`)
      if (userProf.input_delay && userProf.input_delay !== 'no') profLines.push(`Input delay: ${userProf.input_delay}`)
      if (userProf.pass_level) profLines.push(`Pass level: ${userProf.pass_level}`)
      if (profLines.length > 0) userExperienceText += `  PROFILO GIOCATORE: ${profLines.join('. ')}\n`
    }

    if (gameStats) {
      const statLines = []
      if (gameStats.passing?.passaggio_filtrante_rasoterra) {
        const pct = gameStats.passing.passaggio_filtrante_rasoterra
        if (pct > 30) statLines.push(`Usa molto passaggi filtranti rasoterra (${pct}%)`)
      }
      if (gameStats.defense) {
        const defStyle = Object.entries(gameStats.defense).sort(([,a],[,b]) => b - a)[0]
        if (defStyle) statLines.push(`Difende prevalentemente con: ${defStyle[0]} (${defStyle[1]}%)`)
      }
      if (statLines.length > 0) userExperienceText += `  STILE DI GIOCO REALE: ${statLines.join('. ')}\n`
    }

    userExperienceText += '  ⚠️ Tieni conto di questi dati nelle contromisure: evita suggerimenti che contraddicono l\'esperienza reale del cliente.\n'
  }

  // Contromisure specifiche per meta (da best practices community)
  let metaCountermeasures = ''
  if (metaInfo.isMeta) {
    metaCountermeasures = `\n\n⚠️ CONTROMISURE SPECIFICHE PER FORMAZIONE META:\n`
    
    if (opponentFormation.formation_name?.includes('4-3-3')) {
      metaCountermeasures += `- Contro 4-3-3: priorità a coprire le corsie laterali e a non lasciare il MED/CC isolato\n`
      metaCountermeasures += `- Preferisci istruzioni individuali o sostituzioni nello stesso ruolo prima di proporre cambio modulo\n`
      metaCountermeasures += `- Se proponi marcatura, usa solo istruzione ufficiale Marcatura stretta/Marcatura uomo con titolare reale\n`
    } else if (opponentFormation.formation_name?.includes('4-2-3-1')) {
      metaCountermeasures += `- Contro 4-2-3-1: priorità a schermare il TRQ/AMF e uscire pulito dal centro\n`
      metaCountermeasures += `- Non proporre automaticamente due punte: prima usa il modulo attuale con istruzioni e sostituzioni compatibili\n`
      metaCountermeasures += `- Se serve più presenza offensiva, suggerisci solo giocatori compatibili con lo slot che sostituiscono\n`
    } else if (opponentFormation.formation_name?.includes('5-2-3')) {
      metaCountermeasures += `- Contro 5-2-3: cerca ampiezza e cambio lato come piano in partita, non come stile inventato\n`
      metaCountermeasures += `- Mantieni sostituzioni solo role-safe: esterno per esterno, punta per punta, centrocampista per centrocampista compatibile\n`
      metaCountermeasures += `- Non trasformare "ampiezza" in Stile squadra se non è Vie laterali ufficiale e compatibile col coach\n`
    } else if (opponentFormation.formation_name?.includes('3-5-2')) {
      metaCountermeasures += `- Contro 3-5-2: priorità a usare ampiezza e lato debole senza forzare cambio modulo\n`
      metaCountermeasures += `- Suggerisci terzini/esterni solo se sono già titolari o riserve compatibili con lo slot\n`
      metaCountermeasures += `- Evita di togliere punte o MED solo perché il centro è affollato: serve sostituzione role-safe\n`
    }
    
    if (opponentFormation.playing_style?.toLowerCase().includes('quick counter') || 
        opponentFormation.playing_style?.toLowerCase().includes('contropiede')) {
      metaCountermeasures += `- Contro contropiede veloce / ripartenze: se serve coprire profondità, proponi Linea Bassa solo come istruzione individuale ufficiale su MED/CC valido\n`
      metaCountermeasures += `- Come piano in partita: evita pressing continuo e proteggi prima la zona centrale\n`
      metaCountermeasures += `- Non scrivere "abbassa la difesa" o "linea più bassa" senza azione ufficiale applicabile\n`
    }
  }
  
  // Calcola regole per suggerimenti giocatori (prima del template string)
  // Calcola regole critiche per portiere e riserve
  let gkRulesText = ''
  if (hasTitolariRiserve && riserve.length > 0) {
    const gkPositions = ['GK', 'Goalkeeper', 'Portiere']
    const hasGKReserve = riserve.some(p => gkPositions.includes(p.position))
    const hasGKTitolare = titolari.some(p => gkPositions.includes(p.position))
    
    if (hasGKTitolare && !hasGKReserve) {
      gkRulesText = `\n\n⚠️ REGOLA CRITICA - PORTIERE:\n   - C'è un portiere titolare ma NON ci sono riserve portiere disponibili\n   - NON suggerire MAI "remove_from_starting_xi" per il portiere titolare (non c'è sostituto)\n   - NON suggerire "add_to_starting_xi" per un portiere (non ci sono riserve portiere)\n   - Il portiere titolare DEVE rimanere in campo (non ci sono alternative)`
    }
  }

  const defenseSubstitutionRules = hasTitolariRiserve && titolari.length > 0
    ? `\n   ⚠️ LIMITI DIFESA (§3.4 — OBBLIGATORI, verifica prima di ogni sostituzione):
   - Puoi avere **fino a 3 DC** (è valido e comune, es. 3-5-2). Regola chiave: con **4° difensore** e 3 DC già presenti, quel quarto deve essere **TD o TS**, mai DC
   - Stato attuale: ${formatDefenseLineupSummary(titolari)}
   - **Con 3 DC già in campo**: NON suggerire un'altra riserva **DC** (es. Thuram) al posto di centrocampo/attacco — solo swap DC↔DC. Se serve il quarto difensore, proponi un TD/TS
   - Eccezione: una card marcata DC può essere proposta da terzino SOLO se nei dati ha posizione/competenza TD o TS e il ruolo suggerito è davvero TD/TS. In quel caso scrivi chiaramente TD/TS, non DC
   - La riserva entra nello **stesso slot** del titolare (replace_position = ruolo titolare in lista TITOLARI)
   - "position" nel JSON = ruolo **card** riserva; **replace_position** = ruolo in campo del titolare uscente
   - Se replace_position/slot_role è **DC**, il reason deve motivare da centrale (duelli, profondità, marcatura centrale, fisicità). VIETATO motivare con "terzino naturale", "coprire fascia/corsia/laterale": quello è valido solo se lo slot è TD/TS/CLD/CLS
   - NON scrivere "metti Thuram (DC)" se Marcelo è CLS e in campo ci sono già 3 DC — è fuorviante e non risolve la difesa
   - Nel "reason", se card ≠ slot, una frase breve sulla transizione solo se lo swap è ammesso (sostituzione DC↔DC o TD/TS↔TD/TS)\n`
    : ''
  
  return `Sei un esperto tattico di eFootball con conoscenza approfondita delle formazioni meta e delle contromisure efficaci utilizzate dalla community professionale.
LINGUA DI RISPOSTA: DEVI TASSATIVAMENTE RISPONDERE IN ${lang === 'en' ? 'INGLESE' : 'ITALIANO'}. Qualsiasi testo, spiegazione o motivazione deve essere in ${lang === 'en' ? 'inglese' : 'italiano'}.

⚠️ CONTESTO CRITICO - PREPARAZIONE PRE-PARTITA:
I suggerimenti che generi sono per PREPARAZIONE PRE-PARTITA. Il cliente deve applicare questi suggerimenti PRIMA di giocare la partita.
- Focus su MODIFICHE CONFIGURABILI: formazione, stile di gioco, giocatori titolari/riserve, istruzioni individuali
- NON suggerire azioni durante la partita (dribbling, passaggi, ecc.) - quelle sono decisioni del cliente durante il gioco
- Suggerisci solo modifiche che il cliente può configurare PRIMA della partita nel sistema eFootball
- Essere ENTERPRISE: robusto, professionale, orientato a decisioni chiare e applicabili

🎮 CONTESTO VIDEOGIOCO:
- I giocatori sono CARD DIGITALI di eFootball, non persone reali con esperienze/crescita
- NON parlare di "esperienza", "carriera", "maturità" dei giocatori
- Progression Points e Skill Training (max 5 Additional Skills) esistono: consigliali solo se i dati rosa li mostrano. Non inventare slider.
- Formazione fluida: consiglia schema attacco e schema difesa; non applicarla in app.
- NON suggerire Offensivo o Linea bassa: rimossi in v6.0.0.

${opponentText}${rosterText}${formationText}${tacticalText}${coachText}${cardUsageText}${attilaMemoryAnalysis}${historyText}${similarFormationAnalysis}${playerPerformanceAnalysis}${tacticalHabitsAnalysis}${patternsText}${userExperienceText}${matchupEngineText}${metaCountermeasures}

⚠️ OBBLIGATORIO: applica regola NON INFERIRE CAUSE (vedi blocco MEMORIA ATTILA sopra). Vietato ragionamenti causali "X perché Y".

⚠️ REGOLE CRITICHE - COMUNICAZIONE PROFESSIONALE (ENTERPRISE):
1. **CONTESTO PRE-PARTITA**: I suggerimenti sono per PREPARAZIONE PRE-PARTITA. Focus su modifiche configurabili PRIMA della partita.
2. NON dire ragionamenti espliciti: NON dire "perché l'avversario ha X quindi Y"
3. NON dire incroci dati: NON dire "Ho incrociato formazione, storico, rosa"
4. Dire solo COSA fare, non PERCHÉ: "Usa 4-2-3-1. Funziona." (non "Usa 4-2-3-1 perché...")
5. Essere professionale, fermo, diretto: tono sicuro, orientato a decisioni enterprise
6. NON menzionare overall/posizioni se non verificati (photo_slots vuoto o original_positions vuoto)
7. Se dati incerti, usa generico: "Messi va bene in campo" (non "Messi va bene in SP")
8. NON suggerire azioni durante la partita: dribbling, passaggi, tiri, contrasti, recuperi, ecc. (quelle sono decisioni del cliente durante il gioco)
9. NON analizzare video o azioni: abbiamo SOLO rating/voti, NON dettagli su come ha giocato
10. Se menzioni performance giocatori, usa SOLO rating: "Giocatore X ha performato bene (rating 8.5)" (non "ha fatto dribbling")
11. **ROBUSTEZZA**: Se non sei sicuro, meglio generico che sbagliato. Enterprise = affidabilità, non speculazioni.

⚠️ DISTINZIONI CRITICHE - CARATTERISTICHE vs PERFORMANCE:
1. **Skills/Com_Skills** = Caratteristiche giocatore, NON azioni nel match
   - ❌ SBAGLIATO: "Usa Messi perché ha skill Dribbling quindi farà dribbling"
   - ✅ CORRETTO: "Usa Messi. Overall: 99, Rating storico contro 4-3-3: 8.2" (usa dati verificati)
2. **Overall Rating** = Caratteristica giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Usa Messi perché ha overall 99 quindi giocherà bene"
   - ✅ CORRETTO: "Usa Messi. Overall: 99, Posizione originale: AMF" (usa caratteristiche, non inferire performance)
3. **Base Stats** = Caratteristiche giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Usa Messi perché ha finishing 95 quindi segnerà"
   - ✅ CORRETTO: "Usa Messi. Finishing: 95, Posizione: SP" (usa caratteristiche, non inferire azioni)
4. **Form** = Forma generale, NON performance nel match
   - ❌ SBAGLIATO: "Usa Messi perché è in forma A quindi giocherà bene"
   - ✅ CORRETTO: "Usa Messi. Form: A, Overall: 99" (usa caratteristiche, non inferire performance)
5. **Boosters** = Bonus statistici, NON azioni effettuate
   - ❌ SBAGLIATO: "Usa Messi perché ha booster Speed quindi correrà veloce"
   - ✅ CORRETTO: "Usa Messi. Boosters: Speed +5" (usa bonus, non inferire azioni)
6. **Connection** = Bonus statistici, NON causa diretta
   - ❌ SBAGLIATO: "Usa Messi perché ha connection X quindi giocherà bene"
   - ✅ CORRETTO: "Usa Messi. Connection: X (bonus statistici)" (usa bonus, non inferire causa)

⚠️ NON INFERIRE CAUSE - DATI STORICI/STATISTICI ≠ CAUSE DIRETTE:
1. **Competenze Allenatore** = Competenze disponibili, NON stile usato nel match
   - ❌ SBAGLIATO: "Usa Contrattacco perché allenatore ha competenza 89"
   - ✅ CORRETTO: "Allenatore ha competenza Contrattacco: 89. Suggerisci Contrattacco." (non inferire che lo userà)
2. **Win Rate** = Statistica storica, NON causa vittoria
   - ❌ SBAGLIATO: "Usa 4-3-3 perché ha win rate 60% quindi vincerà"
   - ✅ CORRETTO: "4-3-3: win rate storico 60%. Suggerisci 4-3-3." (non inferire vittoria)
3. **Performance Storiche** = Pattern storico, NON causa performance attuale
   - ❌ SBAGLIATO: "Non usare Messi perché ha sempre giocato male contro 4-3-3"
   - ✅ CORRETTO: "Messi: rating medio storico contro 4-3-3: 5.8. Considera alternativa." (non inferire che giocherà male)
4. **Istruzioni Individuali** = Istruzioni configurate, NON azioni effettuate
   - ❌ SBAGLIATO: "Messi ha istruzione offensiva quindi attaccherà"
   - ✅ CORRETTO: "Messi: istruzione offensiva configurata" (non inferire azioni)
5. **Formazione Avversaria** = Formazione avversaria, NON causa performance
   - ❌ SBAGLIATO: "Usa 4-2-3-1 perché sfrutta debolezze 4-3-3"
   - ✅ CORRETTO: "Formazione avversaria: 4-3-3. Suggerisci 4-2-3-1." (non inferire causa)
6. **Meta Formation** = Classificazione, NON causa risultato
   - ❌ SBAGLIATO: "Avversario usa meta quindi perderai"
   - ✅ CORRETTO: "Formazione avversaria: 4-3-3 (meta). Applica contromisure specifiche." (non inferire sconfitta)
7. **Posizioni Originali** = Posizioni naturali, NON posizione nel match
   - ❌ SBAGLIATO: "Metti Messi in AMF perché è sua posizione originale"
   - ✅ CORRETTO: "Messi: posizioni originali [AMF, SP]. Posizione suggerita: AMF" (non inferire che deve essere originale)
8. **Playing Style Giocatore** = Stile giocatore, NON stile squadra
   - ❌ SBAGLIATO: "Usa stile X perché giocatore ha playing style X"
   - ✅ CORRETTO: "Giocatore: playing style X. Squadra: team playing style Y" (non inferire che devono coincidere)

ISTRUZIONI SPECIFICHE (Focus Community eFootball):

1. **IDENTIFICA FORMAZIONE META:**
   ${metaInfo.isMeta ? `⚠️ FORMAZIONE META: ${metaInfo.metaType || opponentFormation.formation_name}\n   Identifica i suoi punti di forza.\n   Applica contromisure SPECIFICHE basate su best practices community.` : 'Formazione non meta. Analizza punti di forza/debolezza standard.'}

2. **CONTROMISURE CONTRO META:**
   ${metaInfo.isMeta ? metaCountermeasures : 'Analizza formazione standard e suggerisci contromisure tattiche generali.'}

3. **ANALISI PUNTI FORZA/DEBOLEZZA:**
   - Identifica punti di forza formazione avversaria (es: "4-3-3 ha centrocampo forte ma ali isolate")
   - Identifica punti deboli (es: "4-2-3-1 ha attaccante solitario, vulnerabile a due attaccanti")
   - Usa lo SHAPE AVVERSARIO e MATCHUP_ENGINE come priorita interna: se la foto mostra squadra stretta/centrale, privilegia ampiezza, copertura TRQ e gestione due punte; se mostra squadra larga, privilegia coperture fascia e lato debole.
   - Non ripetere automaticamente "linea bassa", "compattezza" o "marcatura" se il rischio principale letto dalla foto e diverso.
   - Incrocia SEMPRE questi segnali con LEVE CARD TITOLARI: stili card, skill e stat utili. Esempio: se hai un "Tra le linee" con passaggio alto, puoi proporre uscita/cambio lato; se hai Opportunista/Giocatore chiave, puoi proporre filtrante o attacco profondita; se hai Collante/MED, puoi proporre copertura TRQ o uscita sicura.
   - Non trasformare skill/stili in promesse ("fara dribbling", "vincera"). Trasformali in piano pratico: "usa X come primo passaggio", "cerca Y sul lato debole", "metti Z a coprire".

4. **SUGGERIMENTI PERSONALIZZATI (CRITICO):**
   - Se nella sezione "TITOLARI FUORI POSIZIONE" ci sono giocatori, segnalali prima di proporre altri cambi: il FIT ruolo/card è una correzione prioritaria.
   - Non ignorare un titolare fuori posizione per suggerire un cambio meno urgente. Esempio: se Costacurta card TS/TD è in P, devi dirlo chiaramente e proporre ruolo/cambio coerente prima di altri swap.
   ${similarFormationMatches.length > 0 ? `⚠️ IL CLIENTE HA GIÀ GIOCATO ${similarFormationMatches.length} MATCH CONTRO FORMAZIONI SIMILI:
   - Analizza pattern di vittorie/sconfitte per identificare cosa ha funzionato/non funzionato
   - Se win rate < 50%, identifica errori tattici ricorrenti e suggerisci alternative
   - Evita di suggerire formazioni/stili che hanno già fallito in passato
   - Suggerisci cambiamenti specifici basati su esperienza reale del cliente` : `- Nessun match storico contro formazioni simili, usa best practices community`}
   
   ${Object.keys(playerPerformanceAgainstSimilar).length > 0 ? `⚠️ PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:
   - Giocatori con rating < 6.0: SUGGERISCI SOSTITUZIONE o cambio ruolo
   - Giocatori con rating >= 7.0: MANTIENI in formazione, sono efficaci
   - Considera queste performance per suggerimenti giocatori specifici
   - ⚠️ IMPORTANTE: Performance storiche = pattern, NON causa diretta. NON dire "giocherà male perché ha sempre giocato male"
   - ⚠️ Usa solo rating storico come indicatore, non inferire causa` : `- Dati performance giocatori insufficienti per analisi specifica`}
   
   ${tacticalHabits.preferredFormations && Object.keys(tacticalHabits.preferredFormations).length > 0 ? `⚠️ ABITUDINI TATTICHE CLIENTE:
   - Formazioni preferite: ${Object.keys(tacticalHabits.preferredFormations).slice(0, 3).join(', ')}
   - Rispetta preferenze ma suggerisci adeguamenti se necessario
   - Se formazione preferita ha win rate basso, suggerisci alternative
   - Considera stile di gioco preferito per coerenza
   - ⚠️ IMPORTANTE: Win rate = statistica storica, NON causa vittoria. NON dire "vincerà perché ha win rate 60%"
   - ⚠️ Usa win rate come indicatore, non inferire causa` : `- Dati abitudini tattiche insufficienti`}
   
   - Suggerisci giocatori SPECIFICI dalla rosa ideali per ogni ruolo
   - Considera formazione cliente attuale: se già ottimale, suggerisci solo adeguamenti
   - Rispetta stile preferito cliente: se preferisce **Possesso palla**, evita di spingerlo verso **Contropiede veloce** salvo necessità chiara (e viceversa).
   ${activeCoach && activeCoach.playing_style_competence ? `⚠️ VINCOLO ALLENATORE (OBBLIGATORIO):
   - Suggerisci SOLO stili con competenza >= 70. Stili < 70 sono VIETATI (anche 60, 65 no).
   - Esempio: Allenatore ha Contrattacco 89, Contropiede 57, Possesso 46
     → ✅ SUGGERISCI: Contrattacco (89 >= 70)
     → ❌ VIETATO: Contropiede (57 < 70), Possesso (46 < 70)
   - Se suggerisci "cambia in 4-4-2 e contropiede", ma Contropiede < 70 → SBAGLIATO. Suggerisci formazione + stile con competenza >= 70.` : `- Se allenatore configurato, verifica competenze prima di suggerire stile.`}

5. **PRIORITÀ LEVE (ORDINE OBBLIGATORIO – il cliente non può cambiare modulo ogni partita):**
   - (0) **FIT RUOLO/CARD** – Se un titolare è fuori posizione rispetto alle posizioni card, segnala/correggi prima. È un problema di XI, non una finezza tattica.
   - (1) **ISTRUZIONI INDIVIDUALI** – Priorità massima. Sono veloci da applicare, non richiedono cambio formazione.
   - (2) **CHI SCHIERARE** – Sostituzioni titolari/riserve. Stesso modulo, diverso giocatore.
   - (3) **Stile squadra** – Solo se competenza allenatore >= 70 per quello stile.
   - (4) **CAMBIO FORMAZIONE** – Ultima risorsa. Suggerisci solo se davvero necessario. Preferisci sempre come giocare MEGLIO con la formazione attuale.
   - Se MATCHUP_ENGINE indica una leva primaria (fascia, centro, TRQ, due punte), almeno una tactical_adjustment o individual_instruction deve rispondere a quella leva.
   - Il riferimento per CHI è in campo è la "Disposizione in campo" sopra (ruoli reali per slot), NON solo il nome modulo. Il modulo (${clientFormation?.formation || 'N/A'}) è solo l'etichetta: suggerisci contromisure per USARE MEGLIO la disposizione reale, non per sostituirla a priori.

6. **ADEGUAMENTI TATTICI PRE-PARTITA (terminologia ufficiale + azione applicabile):**
   - Ogni contromisura deve dire COSA TOCCARE o COSA FARE. Vietato output vago.
   - **Stile squadra configurabile:** usa SOLO questi 6 nomi: Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali, Pressing totale (EN Overload). NON Pressing Alto, Gegenpressing, Tiki-Taka, Catenaccio, Contenimento. "Pressing totale" È uno stile ufficiale v6.0.0: non negarlo.
   - **Istruzioni individuali ufficiali v6.0.0:** Difensivo, Ancoraggio, Marcatura stretta, Marcatura uomo, Obiettivo Contropiede. Se proponi una di queste, preferisci l'array individual_instructions con player_id reale.
   - **Rimosse in v6.0.0:** Offensivo/Attacking e Linea bassa/Deep Line. NON consigliarle. Per alzare o abbassare un giocatore usa Formazione fluida (schema attacco vs schema difesa) in un tactical_adjustment type "game_plan_adjustment".
   - **Distinzione obbligatoria:** la linea di squadra (frecce) è un setting di Game Plan, NON l'istruzione individuale "Linea bassa" (rimossa). Per un giocatore più alto/basso usa Formazione fluida.
   - Per consigliare prudenza difensiva senza azione di menu certa, usa tactical_adjustment type "match_plan" e inizia la suggestion con "In partita:".
   - Per consigliare una modifica ufficiale di Game Plan che non è una istruzione individuale, usa type "game_plan_adjustment" e aggiungi application_hint con dove applicarla.
   - **Parole vietate come suggestion da sole:** "bassa", "contenimento", "controllo", "compattezza", "pressing selettivo", "abbassa la difesa", "linea più bassa". Se usi questi concetti, trasformali in frase applicabile.
   - PIANO PRATICO CON CARD: per "passaggio alto", "cambio lato", "filtrante", "cross" o "uscita dal pressing", usa tactical_adjustments type "match_plan" con un giocatore reale dalla rosa nella frase. Non metterlo in individual_instructions perché non sono istruzioni di menu.
   - Nei match_plan non scrivere cambi ruolo ("come CLD", "come TRQ", "per cambiare ruolo"). Scrivi solo il comportamento pratico: "usa Nedvěd per cambiare lato" o "cerca Rijkaard come primo scarico".
   - Non ripetere il prefisso: una suggestion match_plan deve iniziare una sola volta con "In partita:".
   - Per tactical_adjustments scegli 2-3 leve diverse, non tre frasi uguali. Preferisci varietà tra: piano offensivo, piano difensivo, uscita dal pressing, gestione ritmo, zona da colpire, errore da evitare.
   - Ogni tactical_adjustment deve essere un tassello della match_key scelta in play_summary, mai una direzione alternativa. Varietà = leve diverse per lo STESSO piano, non piani diversi.
   - Le frasi devono parlare al cliente: niente "Game Plan →", niente "voce menu", niente spiegazioni da sistema.

7. **SUGGERIMENTI GIOCATORI (OBBLIGATORIO):**
   ${hasTitolariRiserve ? `- Usa SOLO gli elenchi TITOLARI e RISERVE sopra. Titolari = in campo, Riserve = panchina.\n   - add_to_starting_xi: SOLO giocatori dalla lista RISERVE. Mai "aggiungi" per chi è in TITOLARI.\n   - Per OGNI add_to_starting_xi DEVI indicare CHI SOSTITUIRE: include sempre replace_player_id, replace_player_name e replace_position (sigla ruolo del titolare uscente come in lista TITOLARI). Formula decisionale obbligatoria: "Cambia [titolare] con [riserva]". Senza titolare uscente il suggerimento è invalido.\n   - VIETATO remove_from_starting_xi isolato: non dire mai solo "togli X". Se un titolare deve uscire, proponi sempre una sostituzione completa add_to_starting_xi con riserva compatibile nello stesso slot.\n   - La riserva deve avere posizione card o original_positions compatibile con lo slot del titolare uscente (P~CF, SP~SS, TRQ~AMF, MED~DMF, CC~CMF, EDA~RWF, ESA~LWF, CLD~RMF, CLS~LMF, DC~CB, TD~RB, TS~LB). Se non è compatibile, NON proporla.\n   - Vietato linguaggio condizionale nei cambi: NON scrivere "se vuoi", "valuta", "considera". Se il cambio è valido scrivi una decisione; se non è valido ometti il cambio.\n   - Usa sempre il player_id (UUID) tra [ ] negli elenchi. Non inventare id.${defenseSubstitutionRules}${riserve.length === 0 ? `\n\n⚠️ REGOLA CRITICA - NESSUNA RISERVA DISPONIBILE:\n   - NON ci sono riserve disponibili (panchina vuota)\n   - NON suggerire player_suggestions: niente add_to_starting_xi e niente remove_from_starting_xi isolato\n   - Puoi solo usare tactical_adjustments o individual_instructions valide sui titolari esistenti\n   - IMPORTANTE: Non inventare riserve che non esistono` : ''}${gkRulesText}` : `- Identifica giocatori dalla rosa ideali per contromisura. Usa Overall, Skills, Stats solo per decidere cambi validi.`}
   - Motivazione breve (1-2 righe) per ogni suggerimento: deve spiegare il vantaggio pratico nello slot reale in cui entra. Se sostituisce un DC, non usare motivazioni da fascia/terzino; se vuoi coprire fascia, proponi uno slot laterale reale.

8. **ISTRUZIONI INDIVIDUALI:**
   - Suggerisci SOLO questi ID tecnici nel campo "instruction": difensivo, ancoraggio, marcatura_stretta, marcatura_uomo, contropiede. Non usare label con spazi nel JSON.
   - Etichette umane corrispondenti: Difensivo, Ancoraggio, Marcatura stretta, Marcatura uomo, Contropiede. NO Offensivo, NO Linea bassa, NO passaggi corti/cross.
   - Per alzare/abbassare un giocatore: Formazione fluida, non istruzioni rimosse.
   - **OBBLIGATORIO:** Per OGNI istruzione indica un **titolare concreto** dalla lista TITOLARI sopra: \`player_id\` (UUID dalla lista) + \`player_name\` (nome esatto come in lista) + \`position\` (sigla ruolo, es. DMF). Vietato suggerire solo "i terzini" o "il centrocampo" senza nome: il cliente deve sapere CHI impostare nel gioco.
   - Considera formazione avversaria
   - ⚠️ IMPORTANTE: Istruzioni individuali = istruzioni configurate, NON azioni effettuate
   - ⚠️ NON inferire: "Messi attaccherà perché ha istruzione offensiva" (suggerisci, non dire che lo farà)

9. **PRIORITÀ (solo due livelli — NO "low", evita contraddizioni):**
   - HIGH: Contromisure essenziali per contrastare formazione avversaria
   - MEDIUM: Ottimizzazioni utili; se un suggerimento è marginale, integra il motivo nel "reason" o ometti il punto invece di usare una terza priorità

10. **MOTIVAZIONI:**
   - Ogni suggerimento DEVE avere motivazione chiara
   - Ogni suggerimento DEVE essere chiaro e diretto
   - Riferisci a best practices community quando rilevante

11. **AVVERTENZE E PROBLEMATICHE IDENTIFICATE:**
    ${similarFormationMatches.length > 0 && similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')
    }).length > similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
    }).length ? `⚠️ PROBLEMA CRITICO: Il cliente ha più sconfitte che vittorie contro formazioni simili!
    - Questo indica una debolezza tattica specifica
    - È ESSENZIALE suggerire una correzione chiara e applicabile, non una lista di esperimenti
    - Cambia modulo/stile solo se è davvero la leva principale; altrimenti usa istruzioni, cambi ruolo-safe o piano in partita
    - ⚠️ IMPORTANTE: Pattern storico = pattern, NON causa diretta. NON dire "perderai perché hai sempre perso"
    - ⚠️ Usa pattern come indicatore, suggerisci cambiamenti, non inferire sconfitta` : ''}
    
    ${Object.keys(playerPerformanceAgainstSimilar).filter(pid => {
      const perf = playerPerformanceAgainstSimilar[pid]
      return perf.matches >= 2 && (perf.totalRating / perf.matches) < 6.0
    }).length > 0 ? `⚠️ PROBLEMA GIOCATORI: Alcuni giocatori hanno performance scarse contro formazioni simili
    - Identifica questi giocatori e suggerisci sostituzioni specifiche
    - ⚠️ IMPORTANTE: Performance storiche = pattern, NON causa diretta. NON dire "giocherà male perché ha sempre giocato male"
    - ⚠️ Usa rating storico come indicatore, suggerisci sostituzione, non inferire performance` : ''}
    
    - Se formazione avversaria è meta, avverti cliente
    - Se rosa cliente non ha giocatori ideali, suggerisci alternative
    - Se suggerimenti contrastano con stile preferito, indica alternativa
    - Se dati insufficienti, sottolinea limitazioni
    - Se cliente ha pattern di sconfitte, identifica cause specifiche e soluzioni concrete
    - ⚠️ IMPORTANTE: Meta formation = classificazione, NON causa risultato. NON dire "perderai perché è meta"
    - ⚠️ IMPORTANTE: Formazione avversaria = formazione, NON causa performance. NON dire "giocherà bene perché sfrutta debolezze"
    - ⚠️ Usa classificazione/formazione come contesto, suggerisci contromisure, non inferire causa

OUTPUT FORMATO JSON (STRUTTURATO - PREPARAZIONE PRE-PARTITA):
⚠️ IMPORTANTE: Questo output è un PIANO DI SETUP PRE-PARTITA, non coaching live.
Il cliente deve capire in 10 secondi: cosa hai letto, cosa impostare, come iniziare.
FOCUS OUTPUT:
- Massimo 1 sostituzione valida (player_suggestions).
- Massimo 2 istruzioni individuali ufficiali.
- Massimo 1 stile squadra ufficiale (solo se competenza allenatore >= 70).
- Massimo 1 cambio formazione e solo se davvero necessario.
- starting_plan: massimo 3 indicazioni brevi di AVVIO partita (non minuti, non "al 65'", non Live Coach).
- Non riempire categorie per forza. Meglio 2 azioni forti che 6 deboli.
- Ordine impatto: (1) sostituzione valida X→Y, (2) istruzione individuale ufficiale, (3) stile squadra ufficiale, (4) piano iniziale, (5) cambio modulo ultima risorsa.
DIAGNOSI E FIT:
- opponent_read.formation = modulo letto dalla foto (correggibile dal cliente).
- opponent_read.trait = UNA sola caratteristica visiva dominante (es. "Centro denso, spazio sulle fasce").
- diagnosis = UNA frase chiara per il cliente (ex match_key), senza gergo interno.
- fit_proof = UNA prova concreta di personalizzazione sulla rosa reale (cita un giocatore/stile tuo).
- Vietato overall, connection, PA1, confidenza, data_quality, warning tecnici, ID con underscore nel testo cliente.
- Vietato prefisso "In partita:" e copy da radiocronaca live.
COERENZA PIANO:
- Ordine: scegli PRIMA diagnosis, POI setup e starting_plan in funzione di quella lettura.
- Nessuna azione può contraddire la diagnosis.
- Se un cambio/istruzione non è applicabile alla rosa, OMETTILO: non inventare alternative fittizie.

{
  "opponent_read": {
    "formation": "4-2-1-3",
    "trait": "Centro denso, spazio sulle fasce",
    "assumption": "Il loro AMF resta alto"
  },
  "diagnosis": "Loro chiudono il centro: aprilo sulle fasce.",
  "fit_proof": "Usa Nedvěd dalla tua rosa per ricevere fuori dalla densità centrale.",
  "analysis": {
    "opponent_formation_analysis": "Breve lettura avversaria (1 frase)...",
    "is_meta_formation": ${String(metaInfo.isMeta)},
    "meta_type": ${metaInfo.isMeta && metaInfo.metaType ? JSON.stringify(metaInfo.metaType) : 'null'},
    "strengths": ["Punto forza dominante"],
    "weaknesses": ["Punto debole dominante"]
  },
  "countermeasures": {
    "formation_adjustments": [],
    "tactical_adjustments": [
      {
        "type": "team_playing_style",
        "suggestion": "Stile squadra: Contrattacco",
        "application_hint": "Imposta lo stile squadra ufficiale nel Game Plan.",
        "reason": "Motivazione breve (uso interno)",
        "priority": "medium"
      }
    ],
    "player_suggestions": [
      {
        "player_id": "uuid dalla lista RISERVE",
        "player_name": "Nome Giocatore",
        "action": "add_to_starting_xi",
        "position": "SP",
        "replace_player_id": "uuid del TITOLARE da sostituire",
        "replace_player_name": "Nome titolare",
        "replace_position": "CLS",
        "reason": "Motivazione breve (uso interno)",
        "priority": "high"
      }
    ],
    "individual_instructions": [
      {
        "slot": "attacco_1",
        "player_id": "uuid del TITOLARE",
        "player_name": "Nome come in lista TITOLARI",
        "position": "MED",
        "instruction": "ancoraggio",
        "reason": "Motivazione breve (uso interno)"
      }
    ]
  },
  "starting_plan": [
    "Apri sulle fasce",
    "Attira il loro mediano",
    "Attacca lo spazio lasciato"
  ],
  "play_summary": {
    "match_key": "Stessa frase di diagnosis",
    "base_plan": "Prima indicazione di starting_plan",
    "attacking": "Seconda indicazione di starting_plan",
    "defending": "Terza indicazione di starting_plan o vuoto",
    "avoid": "Unico errore da non fare in avvio"
  }
}

IMPORTANTE - PREPARAZIONE PRE-PARTITA:
- Rispondi SOLO in formato JSON valido
- Non includere markdown o codice
- Priorità: SOLO "high" o "medium"
- player_suggestions: SOLO add_to_starting_xi da RISERVE, sempre con replace_player_id + replace_player_name + replace_position. Massimo 1.
- individual_instructions.instruction: SOLO ID tecnici (difensivo, ancoraggio, marcatura_stretta, marcatura_uomo, contropiede). Massimo 2. Mai offensivo o linea_bassa.
- tactical_adjustments type consentiti: team_playing_style, game_plan_adjustment. NON usare match_plan live.
- starting_plan: 0-3 frasi corte, linguaggio umano, senza menu e senza minutaggio.
- Non includere confidence, data_quality, warnings nel JSON cliente.
- reason è per audit interno: breve, senza "perché l'avversario ha X quindi Y".
- Il cliente vuole DECISIONI DI SETUP, non un saggio tattico.`
}

/**
 * Normalizza priorità legacy: "low" → "medium" (prodotto: solo high/medium)
 */
function normalizeCountermeasurePriorities(countermeasures) {
  if (!countermeasures || typeof countermeasures !== 'object') return
  const keys = ['formation_adjustments', 'tactical_adjustments', 'player_suggestions']
  for (const k of keys) {
    const arr = countermeasures[k]
    if (!Array.isArray(arr)) continue
    for (const s of arr) {
      if (s && typeof s === 'object' && s.priority === 'low') s.priority = 'medium'
    }
  }
}

function asText(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return value.it || value.en || ''
  return ''
}

const OFFICIAL_TEAM_STYLES = [
  { label: 'Possesso palla', patterns: [/possesso palla/i, /possession game/i, /\bpossession\b/i] },
  { label: 'Contropiede veloce', patterns: [/contropiede veloce/i, /quick counter/i] },
  { label: 'Contrattacco', patterns: [/\bcontrattacco\b/i, /long ball counter/i] },
  { label: 'Passaggio lungo', patterns: [/passaggio lungo/i, /long ball(?! counter)/i] },
  { label: 'Vie laterali', patterns: [/vie laterali/i, /out wide/i] },
  { label: 'Pressing totale', patterns: [/pressing totale/i, /pressione totale/i, /\boverload\b/i, /sovraccarico/i, /superioridad/i, /presi[oó]n total/i] }
]

function stripCustomerFacingTechnicalText(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/(^|\s)non è una voce menu:?\s*/gi, '$1')
    .replace(/(^|\s)this is not (a )?menu setting:?\s*/gi, '$1')
    .replace(/(^|\s)non è una voce configurabile abbastanza chiara:?\s*/gi, '$1')
    .replace(/(^|\s)trattalo come piano pratico in partita,?\s*/gi, '$1')
    .replace(/(^|\s)treat it as a match plan, not a setting\.?\s*/gi, '$1')
    .replace(/(^|\s)è un piano pratico (di|da)\s*/gi, '$1')
    .replace(/(^|\s)is a behavior plan( to)?\s*/gi, '$1')
    .replace(/\s*\((CLD|CLS|TD|TS|DC|MED|CC|TRQ|SP|P|EDA|ESA)\)\s*/gi, ' ')
    .replace(/\s+come riferimento esterno\b/gi, ' per allargare il gioco')
}

function normalizeVisibleTerminology(value) {
  if (typeof value !== 'string') return value
  return stripCustomerFacingTechnicalText(value)
    .replace(/\bTeam Playing Style\b/gi, 'Stile squadra')
    .replace(/\bTeam Playstyle\b/gi, 'Stile squadra')
    .replace(/\bDeep Line\b/gi, 'Linea Bassa')
    .replace(/\bCounter Target\b/gi, 'Obiettivo Contropiede')
    .replace(/\bTight Marking\b/gi, 'Marcatura stretta')
    .replace(/\bMan Marking\b/gi, 'Marcatura uomo')
    .replace(/^(in (partita|match)\s*:\s*){2,}/i, (match) => match.toLowerCase().includes('match') ? 'In match: ' : 'In partita: ')
    .replace(/\b(inserisci|usa)\s+(.+?)\s+come\s+(.+?)\s+per\s+cambiare\s+gioco\b/gi, 'usa $2 per cambiare gioco')
    .replace(/\bsviluppo azione usando\b/gi, 'usa')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeVisibleTerminologyField(obj, key) {
  const current = obj?.[key]
  if (typeof current === 'string') {
    obj[key] = normalizeVisibleTerminology(current)
  } else if (current && typeof current === 'object') {
    if (typeof current.it === 'string') current.it = normalizeVisibleTerminology(current.it)
    if (typeof current.en === 'string') current.en = normalizeVisibleTerminology(current.en)
  }
}

function extractOfficialTeamStyle(value) {
  const text = asText(value)
  for (const style of OFFICIAL_TEAM_STYLES) {
    if (style.patterns.some((pattern) => pattern.test(text))) return style.label
  }
  return null
}

function startsWithMatchPlan(value) {
  return /^in (partita|match)\s*:/i.test(asText(value).trim())
}

function toMatchPlanSuggestion(value) {
  const text = normalizeVisibleTerminology(asText(value))
  const lower = text.toLowerCase()
  if (lower.includes('ampiezza') || lower.includes('fasce') || lower.includes('laterali') || lower.includes('wide')) {
    return 'In partita: attacca con più ampiezza usando le corsie laterali quando il centro è chiuso'
  }
  if (lower.includes('press')) {
    return 'In partita: pressa solo a scatti e chiudi prima la zona centrale'
  }
  if (lower.includes('possesso') || lower.includes('controllo')) {
    return 'In partita: gestisci il possesso cercando il lato libero prima della verticalizzazione'
  }
  if (text && !startsWithMatchPlan(text)) return normalizeVisibleTerminology(`In partita: ${text.charAt(0).toLowerCase()}${text.slice(1)}`)
  return normalizeVisibleTerminology(text || 'In partita: applica questa indicazione in partita')
}

function isTooVagueTacticalText(value) {
  const text = asText(value).toLowerCase().trim()
  if (!text) return true
  return [
    /^bassa$/,
    /^alta$/,
    /^controllo$/,
    /^contenimento$/,
    /^compattezza$/,
    /^pressing selettivo$/,
    /abbassa (la )?difesa/,
    /linea difensiva (piu |più )?bassa$/,
    /mantieni una linea difensiva leggermente (piu |più )?bassa$/
  ].some((re) => re.test(text))
}

function ensureTextField(obj, key, fallback) {
  const current = obj?.[key]
  if (typeof current === 'string') {
    if (!current.trim()) obj[key] = fallback
    return
  }
  if (current && typeof current === 'object') {
    if (!current.it && !current.en) obj[key] = fallback
    return
  }
  obj[key] = fallback
}

/**
 * Normalizza i vecchi tipi liberi in blocchi leggibili e applicabili.
 * Evita che la UI mostri "bassa", "contenimento" o "pressing selettivo" senza istruzione ufficiale.
 */
export function normalizeCountermeasureTerminology(output) {
  for (const adj of output?.countermeasures?.formation_adjustments || []) {
    if (!adj || typeof adj !== 'object') continue
    normalizeVisibleTerminologyField(adj, 'suggestion')
    normalizeVisibleTerminologyField(adj, 'reason')
  }

  const tactical = output?.countermeasures?.tactical_adjustments
  if (!Array.isArray(tactical)) return output

  for (const adj of tactical) {
    if (!adj || typeof adj !== 'object') continue
    const type = String(adj.type || '').trim()
    normalizeVisibleTerminologyField(adj, 'suggestion')
    normalizeVisibleTerminologyField(adj, 'application_hint')
    normalizeVisibleTerminologyField(adj, 'reason')

    const suggestion = asText(adj.suggestion)

    if (type === 'playing_style_change') {
      adj.type = 'team_playing_style'
    } else if (type === 'defensive_line') {
      adj.type = 'game_plan_adjustment'
      if (isTooVagueTacticalText(suggestion)) {
        adj.suggestion = 'Istruzione ufficiale: imposta Linea Bassa su un MED/CC titolare valido'
        adj.application_hint = 'Game Plan → Istruzioni individuali → Difesa 1/2 → Linea Bassa. Non assegnarla a TD, TS o DC.'
      }
    } else if (type === 'pressing' || type === 'possession_strategy') {
      adj.type = 'match_plan'
      if (isTooVagueTacticalText(suggestion)) {
        adj.suggestion = type === 'pressing'
          ? 'In partita: pressa solo a scatti e chiudi prima la zona centrale'
          : 'In partita: gestisci il possesso cercando il lato libero prima della verticalizzazione'
      }
    }

    if (adj.type === 'team_playing_style') {
      const officialStyle = extractOfficialTeamStyle(adj.suggestion)
      if (officialStyle) {
        adj.suggestion = `Stile squadra: ${officialStyle}`
      } else {
        adj.type = 'match_plan'
        adj.suggestion = toMatchPlanSuggestion(adj.suggestion)
        adj.application_hint = 'Non è uno dei 6 stili squadra ufficiali: trattalo come piano pratico in partita, non come impostazione.'
      }
    }

    if (adj.type === 'team_playing_style') {
      ensureTextField(adj, 'application_hint', 'Game Plan → Tattica → Stile squadra. Usa solo Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali o Pressing totale.')
    } else if (adj.type === 'game_plan_adjustment') {
      if (isTooVagueTacticalText(adj.suggestion)) {
        adj.type = 'match_plan'
        adj.suggestion = toMatchPlanSuggestion(adj.suggestion)
        adj.application_hint = 'Non è una voce configurabile abbastanza chiara: trattalo come piano pratico in partita.'
      }
    }

    if (adj.type === 'game_plan_adjustment') {
      ensureTextField(adj, 'application_hint', 'Azione configurabile nel Game Plan o nelle Istruzioni individuali: applicala solo se la voce esiste nel tuo menu.')
    } else if (adj.type === 'match_plan') {
      if (!startsWithMatchPlan(adj.suggestion)) adj.suggestion = toMatchPlanSuggestion(adj.suggestion)
      delete adj.application_hint
    }
  }

  return output
}

const WIDE_DIRECTION_RE = /\b(corsie?|fasc(?:ia|e)|lato debole|ampiezza|estern[oiae]|laterali|wide|flank)\b/i
const CENTRAL_DIRECTION_RE = /\b(centro|central[ei]|vie centrali|tra le linee|centralmente|centrally|between the lines)\b/i
const SEQUENCE_LANGUAGE_RE = /\b(prima|poi|quando|allora|solo dopo|dopo che|appena|alterna|se (?:il|la|salta|chiudono))\b/i
const ATTACK_INTENT_RE = /\b(attacca|costruisci|sviluppa|verticalizza|cerca|scarico|ricevitore|imbucata|rifinisci|insisti|apri il gioco|apri (?:subito )?sulle)\b/i

function planDirection(text) {
  const wide = WIDE_DIRECTION_RE.test(text)
  const central = CENTRAL_DIRECTION_RE.test(text)
  if (wide && !central) return 'wide'
  if (central && !wide) return 'central'
  return null
}

/**
 * Coerenza piano: la match_key domina. Scarta i piani offensivi/di costruzione che
 * spingono stabilmente nella direzione opposta alla chiave (centro vs corsie),
 * salvo che siano espressi come sequenza esplicita ("prima..., poi...").
 */
export function enforcePlanCoherence(output) {
  const keyDirection = planDirection(asText(output?.play_summary?.match_key))
  const tactical = output?.countermeasures?.tactical_adjustments
  if (!keyDirection || !Array.isArray(tactical)) return output

  const opposite = keyDirection === 'wide' ? 'central' : 'wide'
  output.countermeasures.tactical_adjustments = tactical.filter((adj) => {
    if (!adj || typeof adj !== 'object') return true
    const text = `${asText(adj.suggestion)} ${asText(adj.reason)}`
    if (!ATTACK_INTENT_RE.test(text)) return true
    if (SEQUENCE_LANGUAGE_RE.test(text)) return true
    return planDirection(text) !== opposite
  })
  return output
}

function byPriority(a, b) {
  const score = (item) => item?.priority === 'high' ? 0 : 1
  return score(a) - score(b)
}

function limitArray(arr, max) {
  return Array.isArray(arr) ? [...arr].sort(byPriority).slice(0, max) : []
}

/**
 * Rende l'output focalizzato: più consigli utili, senza tornare a liste rumorose.
 * La route lo richiama dopo aver filtrato cambi/istruzioni invalidi.
 */
export function focusCountermeasuresOutput(output) {
  const cm = output?.countermeasures
  if (!cm || typeof cm !== 'object') return output

  // Demote leftover live match_plan items into starting_plan tips (pre-match only).
  const starting = Array.isArray(output.starting_plan) ? output.starting_plan.map((s) => asText(s)).filter(Boolean) : []
  const keptTactical = []
  for (const adj of Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments : []) {
    if (!adj || typeof adj !== 'object') continue
    if (adj.type === 'match_plan') {
      const tip = asText(adj.suggestion).replace(/^in partita\s*:\s*/i, '').trim()
      if (tip && starting.length < 3) starting.push(tip)
      continue
    }
    keptTactical.push(adj)
  }
  cm.tactical_adjustments = keptTactical
  if (starting.length) output.starting_plan = starting.slice(0, 3)

  cm.formation_adjustments = limitArray(cm.formation_adjustments, 1)
  cm.player_suggestions = limitArray(cm.player_suggestions, 1)
  cm.individual_instructions = limitArray(cm.individual_instructions, 2)
  cm.tactical_adjustments = limitArray(cm.tactical_adjustments, 2)

  // Prefer diagnosis coherence: keep play_summary.match_key aligned with diagnosis.
  if (output.diagnosis && output.play_summary && typeof output.play_summary === 'object') {
    if (!asText(output.play_summary.match_key)) {
      output.play_summary.match_key = output.diagnosis
    }
  }

  if (output.analysis) {
    if (Array.isArray(output.analysis.strengths)) output.analysis.strengths = output.analysis.strengths.slice(0, 1)
    if (Array.isArray(output.analysis.weaknesses)) output.analysis.weaknesses = output.analysis.weaknesses.slice(0, 1)
  }

  return output
}

/**
 * Valida output contromisure
 */
export function validateCountermeasuresOutput(output) {
  if (!output || typeof output !== 'object') {
    return { valid: false, error: 'Output must be an object' }
  }
  
  if (!output.analysis || typeof output.analysis !== 'object') {
    return { valid: false, error: 'Missing or invalid analysis field' }
  }
  
  if (!output.countermeasures || typeof output.countermeasures !== 'object') {
    return { valid: false, error: 'Missing or invalid countermeasures field' }
  }

  normalizeCountermeasureTerminology(output)
  normalizeCountermeasurePriorities(output.countermeasures)
  
  // Valida priorità (solo high | medium)
  const validPriorities = ['high', 'medium']
  const allSuggestions = [
    ...(output.countermeasures.formation_adjustments || []),
    ...(output.countermeasures.tactical_adjustments || []),
    ...(output.countermeasures.player_suggestions || [])
  ]
  
  for (const suggestion of allSuggestions) {
    if (suggestion.priority && !validPriorities.includes(suggestion.priority)) {
      return { valid: false, error: `Invalid priority: ${suggestion.priority}` }
    }
    // reason is internal audit; accept string or bilingual object; fill empty if missing
    if (suggestion.reason == null || suggestion.reason === '') {
      suggestion.reason = 'Setup consigliato'
    } else if (typeof suggestion.reason === 'object') {
      // ok bilingual
    } else if (typeof suggestion.reason !== 'string') {
      return { valid: false, error: 'All suggestions must have a reason' }
    }
  }
  
  return { valid: true }
}
