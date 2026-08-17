/**
 * Canonical compatibility rules for the current eFootball production ruleset.
 *
 * Keep this module framework-agnostic: it is imported by both client and server code.
 * It deliberately contains only rules that are safe to enforce application-wide.
 */

export const EFOOTBALL_RULESET = '6.0.0'

export const TEAM_PLAYSTYLES = Object.freeze([
  { id: 'possesso_palla', it: 'Possesso palla', en: 'Possession Game' },
  { id: 'contropiede_veloce', it: 'Contropiede veloce', en: 'Quick Counter' },
  { id: 'contrattacco', it: 'Contrattacco', en: 'Long Ball Counter' },
  { id: 'vie_laterali', it: 'Vie laterali', en: 'Out Wide' },
  { id: 'passaggio_lungo', it: 'Passaggio lungo', en: 'Long Ball' },
  { id: 'pressing_totale', it: 'Pressing totale', en: 'Overload' }
])

export const TEAM_PLAYSTYLE_IDS = Object.freeze(TEAM_PLAYSTYLES.map(style => style.id))

/**
 * eFootball v6.0.0 removed these two legacy Individual Instructions from the
 * current Game Plan. Existing app users may still have them persisted from a
 * previous ruleset, therefore they remain readable but must never be created
 * or recommended as current options.
 */
export const LEGACY_INDIVIDUAL_INSTRUCTIONS = Object.freeze({
  offensivo: {
    id: 'offensivo',
    it: 'Offensivo',
    en: 'Offensive',
    removedIn: EFOOTBALL_RULESET
  },
  linea_bassa: {
    id: 'linea_bassa',
    it: 'Linea bassa',
    en: 'Deep Line',
    removedIn: EFOOTBALL_RULESET
  }
})

export const LEGACY_INDIVIDUAL_INSTRUCTION_IDS = Object.freeze(
  Object.keys(LEGACY_INDIVIDUAL_INSTRUCTIONS)
)

export const CURRENT_INDIVIDUAL_INSTRUCTION_IDS = Object.freeze([
  'difensivo',
  'ancoraggio',
  'marcatura_stretta',
  'marcatura_uomo',
  'contropiede'
])

export function isLegacyIndividualInstruction(instruction) {
  return LEGACY_INDIVIDUAL_INSTRUCTION_IDS.includes(String(instruction || '').trim())
}

export function isCurrentIndividualInstruction(instruction) {
  return CURRENT_INDIVIDUAL_INSTRUCTION_IDS.includes(String(instruction || '').trim())
}

export function isValidTeamPlaystyle(style) {
  return TEAM_PLAYSTYLE_IDS.includes(String(style || '').trim())
}

export function getTeamPlaystyleLabel(style, lang = 'it') {
  const item = TEAM_PLAYSTYLES.find(entry => entry.id === String(style || '').trim())
  if (!item) return String(style || '')
  return lang === 'en' ? item.en : item.it
}

export function getLegacyInstructionLabel(instruction, lang = 'it') {
  const item = LEGACY_INDIVIDUAL_INSTRUCTIONS[String(instruction || '').trim()]
  if (!item) return String(instruction || '')
  return lang === 'en' ? item.en : item.it
}

export function findLegacyInstructionIssues(individualInstructions) {
  if (!individualInstructions || typeof individualInstructions !== 'object') return []

  return Object.entries(individualInstructions)
    .filter(([, value]) => value && typeof value === 'object' && isLegacyIndividualInstruction(value.instruction))
    .map(([slot, value]) => ({
      type: 'legacy_individual_instruction',
      slot,
      instruction: String(value.instruction || '').trim(),
      player_id: value.player_id ? String(value.player_id) : null,
      enabled: value.enabled !== false,
      ruleset: EFOOTBALL_RULESET
    }))
}

export function isPreservedLegacyAssignment(existingValue, incomingValue) {
  if (!incomingValue || typeof incomingValue !== 'object') return false
  if (!isLegacyIndividualInstruction(incomingValue.instruction)) return false
  if (!existingValue || typeof existingValue !== 'object') return false

  return (
    String(existingValue.instruction || '').trim() === String(incomingValue.instruction || '').trim() &&
    String(existingValue.player_id || '').trim() === String(incomingValue.player_id || '').trim()
  )
}

/**
 * Safety block to prepend to AI contexts when legacy tactical data still exists.
 * It protects chat/coach flows without mutating the user's stored configuration.
 */
export function buildLegacyTacticalAiNotice(individualInstructions, lang = 'it') {
  const issues = findLegacyInstructionIssues(individualInstructions)
  if (issues.length === 0) return ''

  const items = issues.map(issue => {
    const label = getLegacyInstructionLabel(issue.instruction, lang)
    return `${issue.slot}: ${label}`
  })

  if (lang === 'en') {
    return [
      `EFOOTBALL ${EFOOTBALL_RULESET} COMPATIBILITY NOTICE (MANDATORY):`,
      `The saved user configuration contains legacy Individual Instructions that are no longer current options: ${items.join(' | ')}.`,
      'Treat them as historical saved data only. Do NOT recommend, re-apply or describe them as currently selectable.',
      'If relevant, tell the user that the saved tactics need updating. Never delete or silently replace the saved data.'
    ].join('\n')
  }

  return [
    `AVVISO COMPATIBILITÀ EFOOTBALL ${EFOOTBALL_RULESET} (OBBLIGATORIO):`,
    `La configurazione salvata contiene Istruzioni Individuali legacy non più disponibili come opzioni correnti: ${items.join(' | ')}.`,
    'Trattale solo come storico salvato. NON consigliarle, NON riapplicarle e NON descriverle come selezionabili nella versione corrente.',
    'Se pertinente, informa l’utente che la tattica salvata va aggiornata. Non cancellare né sostituire silenziosamente il dato.'
  ].join('\n')
}
