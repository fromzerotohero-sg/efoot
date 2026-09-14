/**
 * Readiness del cliente per la chat-guida.
 * Nessun dato fake: solo gap reali (rosa, coach, stats mancanti/stale, post-match).
 */

export const STATS_STALE_DAYS = 7

export function daysSince(isoOrDate) {
  if (!isoOrDate) return null
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Spezza una risposta coach lunga in tip card.
 * Nessun troncamento del testo: body resta completo.
 * maxTips limita solo quanti card mostrare, non taglia il contenuto.
 */
export function splitAdviceIntoTips(content = '', maxTips = 3) {
  const text = String(content || '').trim()
  if (!text) return []

  const chunks = text
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÀÁÈÉÌÍÒÓÙÚ0-9•\-–])/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter((s) => s.length >= 18)

  if (chunks.length <= 1) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (sentences.length > 1) {
      return sentences.slice(0, maxTips).map((body, i) => ({
        id: `tip-${i}`,
        title: i === 0 ? 'Priorità' : i === 1 ? 'Azione' : 'Dettaglio',
        body
      }))
    }
    return [{ id: 'tip-0', title: 'Consiglio', body: text }]
  }

  const titles = ['Priorità', 'Azione', 'Dettaglio', 'Extra']
  return chunks.slice(0, maxTips).map((body, i) => ({
    id: `tip-${i}`,
    title: titles[i] || `Punto ${i + 1}`,
    body
  }))
}
