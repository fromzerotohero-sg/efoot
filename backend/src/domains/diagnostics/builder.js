export { buildDiagnostic } from '../../../../lib/diagnosticBuilder.js'

export function sanitizeForPrompt(value, maxLength = 200) {
  if (value == null) return ''
  const text = String(value).replace(/\r\n|\r|\n/g, ' ').trim()
  return maxLength > 0 && text.length > maxLength
    ? `${text.slice(0, maxLength)}…`
    : text
}
