/**
 * Strip stale tactical/FIT/profile-AI sections from a cached diagnostic
 * when live overlays / PROFILE header are prepended.
 * Plain relative module — safe for offline Node tests.
 */
export function stripStaleDiagnosticSections(cachedText = '', { stripAiInfo = false, stripMatchZones = false } = {}) {
  if (!cachedText || typeof cachedText !== 'string') return ''
  let text = cachedText
  // Drop embedded Fluid blocks (live overlay replaces them)
  text = text.replace(/(?:^|\n)(?:FORMAZIONE FLUIDA|FLUID FORMATION)[\s\S]*?(?=\n(?:[A-ZÀ-Ü][^\n]{0,40}:|\n\[|$))/gi, '\n')
  // Drop tactical lines that live overlay covers
  text = text.replace(/(?:^|\n)Tattica:[^\n]*/gi, '\n')
  text = text.replace(/(?:^|\n)Tactics:[^\n]*/gi, '\n')
  text = text.replace(/(?:^|\n)(?:Titolari fuori posizione|Out-of-position starters)[^\n]*(?:\n {2}[^\n]*)*/gi, '\n')
  if (stripAiInfo) {
    text = text.replace(/(?:^|\n)Informazioni per l'IA:[^\n]*/gi, '\n')
    text = text.replace(/(?:^|\n)Notes for AI:[^\n]*/gi, '\n')
    text = text.replace(/(?:^|\n)AI info:[^\n]*/gi, '\n')
  }
  if (stripMatchZones) {
    text = text.replace(/(?:^|\n)(?:Dati dalle partite inserite|Data from entered matches)[^\n]*/gi, '\n')
    text = text.replace(/(?:^|\n)(?:ZONE PARTITE|MATCH ZONES)[\s\S]*?(?=\n(?:[A-ZÀ-Ü[]|\n\[|$))/gi, '\n')
  }
  return text.replace(/\n{3,}/g, '\n\n').trim()
}
