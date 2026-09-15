import { validateIndividualInstruction as validateSharedInstruction } from '../../../../lib/tacticalInstructions.js'

export const TEAM_PLAYING_STYLES = [
  { id: 'possesso_palla', it: 'Possesso palla', en: 'Possession Game', es: 'Posesión' },
  { id: 'contropiede_veloce', it: 'Contropiede veloce', en: 'Quick Counter', es: 'Contraataque rápido' },
  { id: 'contrattacco', it: 'Contrattacco', en: 'Long Ball Counter', es: 'Contraataque con balón largo' },
  { id: 'passaggio_lungo', it: 'Passaggio lungo', en: 'Long Ball', es: 'Balón largo' },
  { id: 'vie_laterali', it: 'Vie laterali', en: 'Out Wide', es: 'Por las bandas' },
  { id: 'pressing_totale', it: 'Pressing totale', en: 'Overload', es: 'Superioridad' }
]

export const TEAM_PLAYING_STYLE_IDS = TEAM_PLAYING_STYLES.map((style) => style.id)

export const INDIVIDUAL_INSTRUCTIONS = {
  attacco_1: ['difensivo', 'ancoraggio'],
  attacco_2: ['difensivo', 'ancoraggio'],
  difesa_1: ['marcatura_stretta', 'marcatura_uomo', 'contropiede'],
  difesa_2: ['marcatura_stretta', 'marcatura_uomo', 'contropiede']
}

export function validateIndividualInstruction(category, playerId, instruction, starters, formationLayout = null) {
  return validateSharedInstruction(category, playerId, instruction, starters || [], formationLayout)
}

export function sanitizeTacticalSettings({ teamPlayingStyle, individualInstructions, starters, formationLayout }) {
  const style = typeof teamPlayingStyle === 'string' ? teamPlayingStyle.trim() : teamPlayingStyle
  if (style != null && style !== '' && !TEAM_PLAYING_STYLE_IDS.includes(style)) {
    const error = new Error(
      `Invalid team_playing_style. Must be one of: ${TEAM_PLAYING_STYLE_IDS.join(', ')}`
    )
    error.statusCode = 400
    throw error
  }
  if (
    individualInstructions !== undefined &&
    individualInstructions !== null &&
    (typeof individualInstructions !== 'object' ||
      Array.isArray(individualInstructions))
  ) {
    const error = new Error('individual_instructions must be an object')
    error.statusCode = 400
    throw error
  }

  const sanitized = {}
  const dropped = []
  for (const [category, data] of Object.entries(individualInstructions || {})) {
    const playerId = typeof data?.player_id === 'string' ? data.player_id.trim() : ''
    const instruction =
      typeof data?.instruction === 'string' ? data.instruction.trim() : ''
    if (!playerId || !instruction) {
      if (playerId || instruction) dropped.push(category)
      continue
    }
    const validation = validateIndividualInstruction(
      category,
      playerId,
      instruction,
      starters,
      formationLayout
    )
    if (!validation.valid) {
      dropped.push(category)
      continue
    }
    sanitized[category] = {
      player_id: playerId,
      instruction,
      enabled: data.enabled !== false
    }
  }
  return {
    teamPlayingStyle: style || null,
    individualInstructions: sanitized,
    droppedInstructions: dropped
  }
}
