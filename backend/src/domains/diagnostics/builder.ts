// @ts-nocheck — re-exports repo-root lib outside backend rootDir
export { buildDiagnostic } from '../../../../lib/diagnosticBuilder.js'

export function sanitizeForPrompt(value: unknown, maxLength = 200): string {
  if (value == null) return ''
  const text = String(value).replace(/\r\n|\r|\n/g, ' ').trim()
  return maxLength > 0 && text.length > maxLength
    ? `${text.slice(0, maxLength)}…`
    : text
}
