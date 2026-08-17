import { getTeamPlaystyleLabel, resolveTeamStyleId } from './efootballV6Rules.js'

const ADVISABLE_COMPETENCE = 70

function competenceEntries(coach) {
  const source = coach?.playing_style_competence
  if (!source || typeof source !== 'object') return []
  return Object.entries(source)
    .map(([style, rawValue]) => ({ style: resolveTeamStyleId(style) || style, value: Number(rawValue) }))
    .filter(({ value }) => Number.isFinite(value))
    .sort((left, right) => right.value - left.value)
}

function styleWithValue(entry, lang) {
  return `${getTeamPlaystyleLabel(entry.style, lang)} ${entry.value}`
}

export function buildCoachStyleDecisionContext(coach, teamStyle, lang = 'it') {
  const entries = competenceEntries(coach)
  if (!coach?.coach_name || entries.length === 0) return ''

  const currentStyleId = resolveTeamStyleId(teamStyle)
  const current = currentStyleId ? entries.find(entry => entry.style === currentStyleId) : null
  const advisable = entries.filter(entry => entry.value >= ADVISABLE_COMPETENCE)
  const maxValue = entries[0].value
  const strongest = entries.filter(entry => entry.value === maxValue)

  const strongestText = strongest.map(entry => styleWithValue(entry, lang)).join(', ')
  const candidatesText = advisable.map(entry => styleWithValue(entry, lang)).join(', ')
  const currentText = current
    ? styleWithValue(current, lang)
    : getTeamPlaystyleLabel(currentStyleId || teamStyle, lang)

  if (lang === 'en') {
    return [
      '[COACH/TEAM-STYLE DECISION CONTRACT]',
      `Coach strongest style competence: ${strongestText}.`,
      `Candidates eligible for team-fit reasoning (competence >= ${ADVISABLE_COMPETENCE}): ${candidatesText || 'none'}.`,
      `Current team style: ${currentText || 'not set'}${current && current.value < ADVISABLE_COMPETENCE ? ' — coach mismatch, not advisable' : ''}.`,
      'If asked for the coach strongest style, answer from the maximum competence. If asked for the best style for this team, compare only eligible candidates with roster, formation and match evidence. Never call a style below 70 the best for this coach. If team evidence favors a below-70 style, offer two paths: change coach to keep the style, or change style to keep the coach.'
    ].join('\n')
  }

  if (lang === 'es') {
    return [
      '[CONTRATO DE DECISIÓN ENTRENADOR/ESTILO]',
      `Competencia de estilo más fuerte del entrenador: ${strongestText}.`,
      `Candidatos válidos para evaluar el encaje del equipo (competencia >= ${ADVISABLE_COMPETENCE}): ${candidatesText || 'ninguno'}.`,
      `Estilo actual del equipo: ${currentText || 'no establecido'}${current && current.value < ADVISABLE_COMPETENCE ? ' — incompatibilidad con el entrenador, no recomendable' : ''}.`,
      'Si preguntan por el estilo más fuerte del entrenador, responde usando la competencia máxima. Si preguntan por el mejor estilo para este equipo, compara solo los candidatos válidos con plantilla, formación y partidos. Nunca declares mejor para este entrenador un estilo inferior a 70. Si los datos favorecen un estilo inferior a 70, ofrece dos vías: cambiar entrenador manteniendo el estilo o cambiar estilo manteniendo el entrenador.'
    ].join('\n')
  }

  return [
    '[CONTRATTO DECISIONE ALLENATORE/STILE]',
    `Competenza stile più forte dell’allenatore: ${strongestText}.`,
    `Candidati ammessi al ragionamento di fit squadra (competenza >= ${ADVISABLE_COMPETENCE}): ${candidatesText || 'nessuno'}.`,
    `Stile squadra attuale: ${currentText || 'non impostato'}${current && current.value < ADVISABLE_COMPETENCE ? ' — mismatch allenatore, non consigliabile' : ''}.`,
    'Se viene chiesto lo stile più forte dell’allenatore, rispondi dal valore massimo. Se viene chiesto il migliore per questa squadra, confronta solo i candidati ammessi con rosa, modulo e partite. Non chiamare mai migliore per questo allenatore uno stile sotto 70. Se i dati squadra favoriscono uno stile sotto 70, proponi due strade: cambiare allenatore mantenendo lo stile oppure cambiare stile mantenendo l’allenatore.'
  ].join('\n')
}
