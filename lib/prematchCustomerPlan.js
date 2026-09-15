/**
 * Customer-facing prematch plan contract.
 * Internal AI fields stay for apply/audit; this is what Hero Chat should show.
 */

const INSTRUCTION_LABELS = {
  offensivo: { it: 'Offensivo', en: 'Offensive', es: 'Ofensivo' },
  difensivo: { it: 'Difensivo', en: 'Defensive', es: 'Defensivo' },
  ancoraggio: { it: 'Ancoraggio', en: 'Anchoring', es: 'Anclaje' },
  marcatura_stretta: { it: 'Marcatura stretta', en: 'Tight marking', es: 'Marca cerrada' },
  marcatura_uomo: { it: 'Marcatura a uomo', en: 'Man marking', es: 'Marca al hombre' },
  contropiede: { it: 'Obiettivo contropiede', en: 'Counter target', es: 'Objetivo contragolpe' },
  linea_bassa: { it: 'Linea bassa', en: 'Deep line', es: 'Línea baja' }
}

function asText(value, lang = 'it') {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object') {
    return String(value[lang] || value.it || value.en || value.es || '').trim()
  }
  return String(value).trim()
}

function cleanCustomerText(value, lang = 'it') {
  let text = asText(value, lang)
  if (!text) return ''
  return text
    .replace(/^in partita\s*:\s*/i, '')
    .replace(/^in match\s*:\s*/i, '')
    .replace(/\bGame Plan\s*→[^.]*/gi, '')
    .replace(/\bvoce menu\b/gi, '')
    .replace(/\bapplication_hint\b/gi, '')
    .replace(/\b(PA1|PA2|PA3)\b/gi, '')
    .replace(/\bconnection\b/gi, '')
    .replace(/\boverall\b/gi, '')
    .replace(/\bconfidenza\b/gi, '')
    .replace(/\bdata_quality\b/gi, '')
    .replace(/\bmarcatura_stretta\b/gi, 'Marcatura stretta')
    .replace(/\bmarcatura_uomo\b/gi, 'Marcatura a uomo')
    .replace(/\blinea_bassa\b/gi, 'Linea bassa')
    .replace(/\bancoraggio\b/gi, 'Ancoraggio')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function rosterNameList(roster) {
  return (Array.isArray(roster) ? roster : [])
    .map((player) => asText(player?.player_name || player?.name))
    .filter(Boolean)
}

function cleanRosterReference(value, lang = 'it', roster = []) {
  const text = cleanCustomerText(value, lang)
  if (!text || !roster.length) return text

  const knownNames = rosterNameList(roster)
  const normalizedKnown = knownNames.map((name) => name.toLowerCase())
  const nameToken = `[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'’.-]*`
  const referencePattern = new RegExp(
    `\\b(con\\s+(?:il|la|un|una)\\s+|con\\s+|with\\s+|usa\\s+|using\\s+|usando\\s+|su\\s+|per\\s+|for\\s+)(${nameToken}(?:\\s+${nameToken})?)`,
    'g'
  )
  const generic = lang === 'en' ? 'your wide player' : lang === 'es' ? 'tu extremo' : 'il tuo esterno'

  return text.replace(referencePattern, (match, prefix, candidate) => {
    const normalizedCandidate = String(candidate || '').trim().toLowerCase()
    const isKnown = normalizedKnown.some((name) => (
      name === normalizedCandidate
      || name.includes(normalizedCandidate)
      || normalizedCandidate.includes(name)
    ))
    if (isKnown) return match
    if (String(prefix || '').toLowerCase().startsWith('su ')) {
      return `${prefix}sul tuo esterno`
    }
    return `${prefix}${generic}`
  })
}

export function instructionLabel(instructionId, lang = 'it') {
  const raw = asText(instructionId, lang).toLowerCase().replace(/\s+/g, '_')
  const entry = INSTRUCTION_LABELS[raw]
  if (!entry) return cleanCustomerText(instructionId, lang)
  return entry[lang] || entry.it || raw
}

function extractOfficialStyle(text) {
  const blob = asText(text)
  const styles = [
    'Possesso palla',
    'Contropiede veloce',
    'Contrattacco',
    'Passaggio lungo',
    'Vie laterali',
    'Pressing totale'
  ]
  for (const style of styles) {
    if (new RegExp(style, 'i').test(blob)) return style
  }
  return null
}

function canonicalTeamStyle(value) {
  const raw = asText(value).trim()
  if (!raw) return ''
  const normalized = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
  const aliases = {
    'possesso palla': 'Possesso palla',
    'possession game': 'Possesso palla',
    'contropiede veloce': 'Contropiede veloce',
    'quick counter': 'Contropiede veloce',
    contrattacco: 'Contrattacco',
    'long ball counter': 'Contrattacco',
    'passaggio lungo': 'Passaggio lungo',
    'long ball': 'Passaggio lungo',
    'vie laterali': 'Vie laterali',
    'out wide': 'Vie laterali',
    'pressing totale': 'Pressing totale',
    overload: 'Pressing totale'
  }
  return aliases[normalized] || raw
}

function countermeasureText(value, lang) {
  return cleanCustomerText(value, lang)
    .replace(/^suggerimento\s*:\s*/i, '')
    .replace(/^azione\s*:\s*/i, '')
    .trim()
}

function countermeasurePhase(row) {
  const text = [
    row?.type,
    row?.category,
    row?.phase,
    row?.area,
    row?.suggestion,
    row?.application_hint
  ].map((value) => asText(value).toLowerCase()).join(' ')

  if (/(attacc|offens|fasce|ampiez|profond|uscita|possesso|cross|area avversaria)/i.test(text)) {
    return 'attack'
  }
  if (/(difes|press|chiud|blocc|marcat|linea|copri|recuper|centro)/i.test(text)) {
    return 'defense'
  }
  return null
}

function buildCountermeasureLines(cm, summary, lang, roster = []) {
  const attack = []
  const defense = []
  const add = (target, row) => {
    const title = cleanRosterReference(
      countermeasureText(row?.suggestion || row?.action || row, lang),
      lang,
      roster
    )
    if (!title || target.some((item) => item.title.toLowerCase() === title.toLowerCase())) return
    target.push({
      title,
      reason: cleanRosterReference(countermeasureText(row?.reason, lang), lang, roster) || null
    })
  }

  const adjustments = [
    ...(Array.isArray(cm.formation_adjustments) ? cm.formation_adjustments : []),
    ...(Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments : [])
  ].filter((row) => (
    row?.type !== 'team_playing_style'
    && row?.type !== 'playing_style_change'
    && row?.type !== 'game_plan_adjustment'
    && row?.type !== 'match_plan'
  ))

  for (const row of adjustments) {
    const phase = countermeasurePhase(row)
    if (phase === 'attack') add(attack, row)
    if (phase === 'defense') add(defense, row)
  }

  if (!attack.length) add(attack, { suggestion: summary.attacking })
  if (!defense.length) add(defense, { suggestion: summary.defending })

  return {
    attack: attack.slice(0, 3),
    defense: defense.slice(0, 3)
  }
}

export function opponentVisualTrait(profile, lang = 'it') {
  return traitFromProfile(profile, lang)
}

function traitFromProfile(profile, lang = 'it', players = []) {
  if (!profile || typeof profile !== 'object') return ''
  const density = String(profile.central_density || '').toLowerCase()
  const width = String(profile.width_profile || '').toLowerCase()
  const side = String(profile.side_bias || '').toLowerCase()
  const parts = []
  const creator = (Array.isArray(players) ? players : []).find((player) => (
    ['TRQ', 'AMF'].includes(String(player?.position || '').trim().toUpperCase())
    && String(player?.player_name || '').trim()
  ))

  if (creator) {
    parts.push(lang === 'en'
      ? `${String(creator.player_name).trim()} between the lines`
      : `${String(creator.player_name).trim()} tra le linee`)
  } else if (density === 'high') {
    parts.push(lang === 'en' ? 'Dense centre' : 'Centro denso')
  }

  if (profile.two_strikers) {
    parts.push(lang === 'en' ? 'two high strikers' : 'due punte alte')
  } else if (profile.isolated_striker) {
    parts.push(lang === 'en' ? 'isolated striker' : 'punta isolata')
  } else if (width === 'wide') {
    parts.push(lang === 'en' ? 'wide shape' : 'assetto largo')
  } else if (width === 'narrow') {
    parts.push(lang === 'en' ? 'narrow shape' : 'assetto stretto')
  }

  if (side === 'left') {
    parts.push(lang === 'en' ? 'left-side overload' : 'sovraccarico a sinistra')
  } else if (side === 'right') {
    parts.push(lang === 'en' ? 'right-side overload' : 'sovraccarico a destra')
  }

  const gaps = Array.isArray(profile.defensive_gaps) ? profile.defensive_gaps : []
  if (parts.length < 2 && gaps.includes('behind_fullbacks')) {
    parts.push(lang === 'en' ? 'space behind the full-backs' : 'spazio dietro i terzini')
  }

  return parts.slice(0, 2).join(' · ')
}

function opponentThreats(players = []) {
  const sorted = [...(Array.isArray(players) ? players : [])]
    .filter((player) => String(player?.player_name || '').trim())
    .sort((a, b) => (Number(b?.overall_rating) || 0) - (Number(a?.overall_rating) || 0))
  const inRoles = (roles) => sorted.filter((player) => (
    roles.includes(String(player?.position || '').trim().toUpperCase())
  ))
  return {
    strikers: inRoles(['P', 'CF', 'SP', 'SS']).slice(0, 2),
    creator: inRoles(['TRQ', 'AMF', 'CC', 'CMF']).slice(0, 1)[0] || null,
    wide: inRoles(['CLD', 'CLS', 'EDA', 'ESA', 'RWF', 'LWF', 'RMF', 'LMF']).slice(0, 1)[0] || null
  }
}

function enrichOpponentReferences(value, threats, lang = 'it') {
  let text = asText(value, lang)
  if (!text) return ''
  const strikerNames = (threats?.strikers || []).map((player) => String(player.player_name).trim()).filter(Boolean)
  const primaryStriker = strikerNames[0]
  const creator = threats?.creator?.player_name ? String(threats.creator.player_name).trim() : ''
  const wide = threats?.wide?.player_name ? String(threats.wide.player_name).trim() : ''

  if (strikerNames.length >= 2) {
    text = text
      .replace(/\b(?:le|queste)\s+due\s+punte\b/gi, `${strikerNames[0]} e ${strikerNames[1]}`)
      .replace(/\bdue\s+punte\b/gi, `${strikerNames[0]} e ${strikerNames[1]}`)
  }
  if (primaryStriker) {
    text = text
      .replace(/\b(?:una|la|loro)\s+punta\b/gi, primaryStriker)
      .replace(/\bil\s+centravanti\b/gi, primaryStriker)
  }
  if (creator) {
    text = text
      .replace(/\b(?:il|loro)\s+(?:trequartista|trq|amf)\b/gi, creator)
      .replace(/\bil\s+creatore\b/gi, creator)
  }
  if (wide) {
    text = text.replace(/\b(?:la|loro)\s+ala\b/gi, wide)
  }
  return text
}

function uniquePlanSteps(values, { lang = 'it', roster = [], threats = null, max = 2 } = {}) {
  const result = []
  for (const value of values.flatMap((item) => Array.isArray(item) ? item : [item])) {
    const enriched = enrichOpponentReferences(value, threats, lang)
    const text = cleanRosterReference(enriched, lang, roster)
    if (!text) continue
    if (result.some((item) => item.toLowerCase() === text.toLowerCase())) continue
    result.push(text)
    if (result.length >= max) break
  }
  return result
}

/**
 * Build the premium customer contract from AI + extract data.
 * Keeps raw countermeasures for apply; strips technical noise from UI fields.
 */
export function buildCustomerPrematchPlan(rawOutput, opts = {}) {
  const lang = opts.lang === 'en' || opts.lang === 'es' ? opts.lang : 'it'
  const roster = Array.isArray(opts.roster) ? opts.roster : []
  const raw = rawOutput || {}
  const cm = raw.countermeasures || {}
  const summary = raw.play_summary || {}
  const analysis = raw.analysis || {}
  const opponent = opts.opponentFormation || {}
  const profile = opponent.extracted_data?.visual_tactical_profile
    || opponent.visual_tactical_profile
    || null
  const opponentPlayers = opponent.players
    || opponent.extracted_data?.players
    || []
  const threats = opponentThreats(opponentPlayers)
  const knownMatchPlayers = [...roster, ...(Array.isArray(opponentPlayers) ? opponentPlayers : [])]

  const formation = String(
    opts.correctedFormation
      || opponent.formation_name
      || opponent.formation
      || analysis.meta_type
      || ''
  ).trim()

  const diagnosis = cleanRosterReference(
    enrichOpponentReferences(
      raw.diagnosis || summary.match_key || analysis.opponent_formation_analysis || '',
      threats,
      lang
    ),
    lang,
    knownMatchPlayers
  )

  const trait = traitFromProfile(profile, lang, opponentPlayers)
    || cleanRosterReference((analysis.weaknesses || [])[0], lang, roster)
    || ''

  const styleAdj = (Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments : [])
    .find((adj) => adj?.type === 'team_playing_style' || adj?.type === 'playing_style_change')
  const teamPlayingStyle = extractOfficialStyle(styleAdj?.suggestion)
    || extractOfficialStyle(styleAdj?.application_hint)

  const formationAdj = (Array.isArray(cm.formation_adjustments) ? cm.formation_adjustments : [])[0]
  const setupFormation = cleanRosterReference(formationAdj?.suggestion, lang, roster) || null

  const substitutions = (Array.isArray(cm.player_suggestions) ? cm.player_suggestions : [])
    .filter((row) => !row?.action || row.action === 'add_to_starting_xi')
    .slice(0, 1)
    .map((row) => ({
      in_player_id: row.player_id || null,
      in_player_name: row.player_name || null,
      out_player_id: row.replace_player_id || null,
      out_player_name: row.replace_player_name || null,
      position: row.replace_position || row.position || null
    }))
    .filter((row) => row.in_player_name || row.out_player_name)

  const individualInstructions = (Array.isArray(cm.individual_instructions) ? cm.individual_instructions : [])
    .slice(0, 2)
    .map((row) => {
      const id = asText(row.instruction, lang).toLowerCase().replace(/\s+/g, '_')
      return {
        slot: row.slot || null,
        player_id: row.player_id || null,
        player_name: row.player_name || null,
        position: row.position || null,
        instruction: id,
        instruction_label: instructionLabel(id, lang),
        target_name: ['marcatura_stretta', 'marcatura_uomo'].includes(id)
          ? row.target_player_name || threats.strikers[0]?.player_name || threats.creator?.player_name || null
          : null
      }
    })
    .filter((row) => row.player_name && row.instruction && !['offensivo', 'linea_bassa'].includes(row.instruction))

  const startingPlan = []
  const pushUnique = (value) => {
    const text = cleanRosterReference(value, lang, roster)
    if (!text) return
    if (startingPlan.some((item) => item.toLowerCase() === text.toLowerCase())) return
    if (startingPlan.length >= 3) return
    // Skip pure menu setup lines; those belong in setup chips.
    if (/^stile squadra:/i.test(text)) return
    if (/^istruzione individuale:/i.test(text)) return
    startingPlan.push(text)
  }

  for (const tip of Array.isArray(raw.starting_plan) ? raw.starting_plan : []) {
    pushUnique(tip)
  }
  for (const adj of Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments : []) {
    if (adj?.type === 'team_playing_style' || adj?.type === 'playing_style_change') continue
    if (adj?.type === 'game_plan_adjustment') continue
    pushUnique(adj?.suggestion)
  }
  pushUnique(summary.attacking)
  pushUnique(summary.defending)
  pushUnique(summary.base_plan)
  if (summary.avoid) {
    const avoid = cleanRosterReference(summary.avoid, lang, roster)
    if (avoid) pushUnique(lang === 'en' ? `Avoid: ${avoid}` : `Evita: ${avoid}`)
  }

  const countermeasureLines = buildCountermeasureLines(cm, summary, lang, roster)
  const setupActions = []
  if (setupFormation) {
    setupActions.push({
      type: 'formation',
      label: lang === 'en' ? 'Formation' : lang === 'es' ? 'Formación' : 'Modulo',
      value: setupFormation
    })
  }
  if (teamPlayingStyle) {
    const currentStyle = canonicalTeamStyle(opts.currentTacticalSettings?.team_playing_style)
    const isSameStyle = currentStyle && currentStyle.toLowerCase() === teamPlayingStyle.toLowerCase()
    setupActions.push({
      type: 'team_style',
      label: lang === 'en' ? 'Team style' : lang === 'es' ? 'Estilo de equipo' : 'Stile squadra',
      value: currentStyle && !isSameStyle ? `${currentStyle} → ${teamPlayingStyle}` : teamPlayingStyle,
      detail: cleanRosterReference(styleAdj?.reason, lang, knownMatchPlayers) || null,
      status: isSameStyle ? 'keep' : 'change'
    })
  }
  for (const substitution of substitutions) {
    const value = substitution.out_player_name && substitution.in_player_name
      ? `${substitution.out_player_name} → ${substitution.in_player_name}`
      : substitution.in_player_name || substitution.out_player_name
    if (value) {
      setupActions.push({
        type: 'substitution',
        label: lang === 'en' ? 'Starting XI' : lang === 'es' ? 'Once inicial' : 'Titolari',
        value
      })
    }
  }
  for (const instruction of individualInstructions) {
    const isMarking = ['marcatura_stretta', 'marcatura_uomo'].includes(instruction.instruction)
    const targetName = isMarking ? instruction.target_name : null
    const detail = instruction.instruction === 'ancoraggio'
      ? (threats.creator?.player_name
          ? `${lang === 'en' ? 'Protects the central lane from' : 'Protegge il corridoio centrale da'} ${threats.creator.player_name}`
          : (lang === 'en' ? 'Protects the space in front of the centre-backs' : 'Protegge lo spazio davanti ai centrali'))
      : null
    setupActions.push({
      type: 'instruction',
      label: instruction.player_name,
      value: targetName
        ? `${instruction.instruction_label} ${lang === 'en' ? 'on' : 'su'} ${targetName}`
        : instruction.instruction_label,
      detail
    })
  }

  const withBallSteps = uniquePlanSteps([
    raw.with_ball,
    summary.attacking,
    ...countermeasureLines.attack.map((item) => item.title),
    ...startingPlan.filter((tip) => !/(marcat|difend|protegg|chiud|agganc)/i.test(tip))
  ], { lang, roster: knownMatchPlayers, threats, max: 2 })
  const instructionDefenseSteps = individualInstructions.map((instruction) => {
    if (['marcatura_stretta', 'marcatura_uomo'].includes(instruction.instruction) && instruction.target_name) {
      return `${instruction.player_name}: ${instruction.instruction_label} ${lang === 'en' ? 'on' : 'su'} ${instruction.target_name}`
    }
    if (instruction.instruction === 'ancoraggio') {
      return threats.creator?.player_name
        ? `${instruction.player_name} ${lang === 'en' ? 'protects the lane into' : 'protegge il corridoio verso'} ${threats.creator.player_name}`
        : `${instruction.player_name} ${lang === 'en' ? 'protects the space in front of the centre-backs' : 'protegge lo spazio davanti ai centrali'}`
    }
    return ''
  })
  const withoutBallSteps = uniquePlanSteps([
    raw.without_ball,
    summary.defending,
    ...countermeasureLines.defense.map((item) => item.title),
    ...instructionDefenseSteps,
    ...startingPlan.filter((tip) => /(marcat|difend|protegg|chiud|agganc)/i.test(tip))
  ], { lang, roster: knownMatchPlayers, threats, max: 2 })
  const rawPlanB = raw.plan_b || summary.plan_b
  const planB = rawPlanB && typeof rawPlanB === 'object'
    ? {
        trigger: cleanRosterReference(enrichOpponentReferences(rawPlanB.trigger, threats, lang), lang, knownMatchPlayers) || null,
        action: cleanRosterReference(enrichOpponentReferences(rawPlanB.action, threats, lang), lang, knownMatchPlayers) || null
      }
    : {
        trigger: null,
        action: cleanRosterReference(enrichOpponentReferences(rawPlanB, threats, lang), lang, knownMatchPlayers) || null
      }
  const followUps = lang === 'en'
    ? ['Show me where to apply this setup', 'Give me a more cautious version', 'What if they change shape?']
    : lang === 'es'
      ? ['Muéstrame dónde aplicar este planteamiento', 'Dame una versión más prudente', '¿Qué hago si cambia de formación?']
      : ['Mostrami dove applicare questo setup', 'Dammi una versione più prudente', 'Cosa faccio se cambia modulo?']

  let fitProof = cleanRosterReference(raw.fit_proof || summary.fit_proof, lang, roster)
  if (!fitProof) {
    const named = individualInstructions[0]?.player_name
      || substitutions[0]?.in_player_name
      || null
    if (named && trait) {
      fitProof = lang === 'en'
        ? `Uses ${named} from your squad to exploit: ${trait}.`
        : `Usa ${named} dalla tua rosa per sfruttare: ${trait}.`
    } else if (named) {
      fitProof = lang === 'en'
        ? `Built around ${named} from your current starting XI.`
        : `Costruito intorno a ${named} nella tua formazione attuale.`
    } else if (trait) {
      fitProof = lang === 'en'
        ? `Keeps your current shape and targets: ${trait}.`
        : `Mantiene la tua disposizione e punta a: ${trait}.`
    }
  }

  const finalDiagnosis = diagnosis || (formation
    ? (lang === 'en' ? `Opponent in ${formation}` : `Avversario in ${formation}`)
    : (lang === 'en' ? 'Opponent shape read' : 'Lettura assetto avversario'))

  return {
    main_decision: finalDiagnosis,
    opponent_read: {
      formation: formation || null,
      trait: trait || null,
      assumption: cleanRosterReference(
        raw.opponent_read?.assumption || summary.assumption,
        lang,
        knownMatchPlayers
      ) || null
    },
    diagnosis: finalDiagnosis,
    fit_proof: fitProof || null,
    setup: {
      formation: setupFormation,
      team_playing_style: teamPlayingStyle,
      substitutions,
      individual_instructions: individualInstructions
    },
    setup_actions: setupActions.slice(0, 5),
    playbook: {
      with_ball: withBallSteps,
      without_ball: withoutBallSteps,
      avoid: cleanRosterReference(summary.avoid, lang, roster) || null
    },
    plan_b: planB.action ? planB : null,
    follow_ups: followUps,
    countermeasures: countermeasureLines,
    starting_plan: startingPlan,
    // Keep a compact structured mirror for persisted plan history.
    play_summary: {
      match_key: finalDiagnosis,
      base_plan: startingPlan[0] || cleanRosterReference(summary.base_plan, lang, roster) || '',
      attacking: startingPlan[1] || cleanRosterReference(summary.attacking, lang, roster) || '',
      defending: startingPlan[2] || cleanRosterReference(summary.defending, lang, roster) || '',
      avoid: cleanRosterReference(summary.avoid, lang, roster) || ''
    }
  }
}

/**
 * Strip technical/internal fields from the API response shown to clients.
 * Keeps raw countermeasures for apply, attaches customer_plan for UI.
 */
export function presentCountermeasuresForCustomer(rawOutput, opts = {}) {
  const customer_plan = buildCustomerPrematchPlan(rawOutput, opts)
  const clone = rawOutput && typeof rawOutput === 'object' ? { ...rawOutput } : {}

  // Prefer cleaned play_summary for any legacy UI still reading it.
  clone.play_summary = customer_plan.play_summary
  clone.customer_plan = customer_plan

  // Never expose self-grades or filter diagnostics to the customer.
  delete clone.confidence
  delete clone.data_quality
  delete clone.warnings

  if (clone.analysis && typeof clone.analysis === 'object') {
    clone.analysis = {
      opponent_formation_analysis: customer_plan.diagnosis,
      is_meta_formation: clone.analysis.is_meta_formation || false,
      meta_type: clone.analysis.meta_type || null,
      strengths: Array.isArray(clone.analysis.strengths) ? clone.analysis.strengths.slice(0, 1) : [],
      weaknesses: Array.isArray(clone.analysis.weaknesses) ? clone.analysis.weaknesses.slice(0, 1) : []
    }
  }

  return clone
}
