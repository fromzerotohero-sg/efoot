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

export function opponentVisualTrait(profile, lang = 'it') {
  return traitFromProfile(profile, lang)
}

function traitFromProfile(profile, lang = 'it') {
  if (!profile || typeof profile !== 'object') return ''
  const density = String(profile.central_density || '').toLowerCase()
  const width = String(profile.width_profile || '').toLowerCase()
  const side = String(profile.side_bias || '').toLowerCase()
  if (density === 'high') {
    return lang === 'en'
      ? 'Dense centre, space on the wings'
      : 'Centro denso, spazio sulle fasce'
  }
  if (width === 'wide') {
    return lang === 'en'
      ? 'Wide shape, vulnerable between the lines'
      : 'Modulo largo, vulnerabile tra le linee'
  }
  if (side === 'left') {
    return lang === 'en' ? 'Bias to their left side' : 'Carico sul loro lato sinistro'
  }
  if (side === 'right') {
    return lang === 'en' ? 'Bias to their right side' : 'Carico sul loro lato destro'
  }
  if (profile.isolated_striker) {
    return lang === 'en' ? 'Isolated striker' : 'Punta isolata'
  }
  if (profile.two_strikers) {
    return lang === 'en' ? 'Two strikers up front' : 'Due punte alte'
  }
  return ''
}

/**
 * Build the premium customer contract from AI + extract data.
 * Keeps raw countermeasures for apply; strips technical noise from UI fields.
 */
export function buildCustomerPrematchPlan(rawOutput, opts = {}) {
  const lang = opts.lang === 'en' || opts.lang === 'es' ? opts.lang : 'it'
  const raw = rawOutput || {}
  const cm = raw.countermeasures || {}
  const summary = raw.play_summary || {}
  const analysis = raw.analysis || {}
  const opponent = opts.opponentFormation || {}
  const profile = opponent.extracted_data?.visual_tactical_profile
    || opponent.visual_tactical_profile
    || null

  const formation = String(
    opts.correctedFormation
      || opponent.formation_name
      || opponent.formation
      || analysis.meta_type
      || ''
  ).trim()

  const diagnosis = cleanCustomerText(
    summary.match_key || analysis.opponent_formation_analysis || '',
    lang
  )

  const trait = traitFromProfile(profile, lang)
    || cleanCustomerText((analysis.weaknesses || [])[0], lang)
    || ''

  const styleAdj = (Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments : [])
    .find((adj) => adj?.type === 'team_playing_style' || adj?.type === 'playing_style_change')
  const teamPlayingStyle = extractOfficialStyle(styleAdj?.suggestion)
    || extractOfficialStyle(styleAdj?.application_hint)

  const formationAdj = (Array.isArray(cm.formation_adjustments) ? cm.formation_adjustments : [])[0]
  const setupFormation = cleanCustomerText(formationAdj?.suggestion, lang) || null

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
        instruction_label: instructionLabel(id, lang)
      }
    })
    .filter((row) => row.player_name && row.instruction)

  const startingPlan = []
  const pushUnique = (value) => {
    const text = cleanCustomerText(value, lang)
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
    const avoid = cleanCustomerText(summary.avoid, lang)
    if (avoid) pushUnique(lang === 'en' ? `Avoid: ${avoid}` : `Evita: ${avoid}`)
  }

  let fitProof = cleanCustomerText(raw.fit_proof || summary.fit_proof, lang)
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

  return {
    opponent_read: {
      formation: formation || null,
      trait: trait || null,
      assumption: cleanCustomerText(raw.opponent_read?.assumption || summary.assumption, lang) || null
    },
    diagnosis: diagnosis || (formation
      ? (lang === 'en' ? `Opponent in ${formation}` : `Avversario in ${formation}`)
      : (lang === 'en' ? 'Opponent shape read' : 'Lettura assetto avversario')),
    fit_proof: fitProof || null,
    setup: {
      formation: setupFormation,
      team_playing_style: teamPlayingStyle,
      substitutions,
      individual_instructions: individualInstructions
    },
    starting_plan: startingPlan,
    // Keep apply-ready structured mirror
    play_summary: {
      match_key: diagnosis,
      base_plan: startingPlan[0] || cleanCustomerText(summary.base_plan, lang) || '',
      attacking: startingPlan[1] || cleanCustomerText(summary.attacking, lang) || '',
      defending: startingPlan[2] || cleanCustomerText(summary.defending, lang) || '',
      avoid: cleanCustomerText(summary.avoid, lang) || ''
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
