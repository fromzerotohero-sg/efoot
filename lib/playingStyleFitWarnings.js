/**
 * Avvisa quando position salvata non è tra compatible_positions dello stile (tabella playing_styles).
 * Riduce errori IA tipo "Collante per TRQ" e incoerenze rosa/catalogo.
 */

export function buildPlayingStyleFitWarnings(roster, styleRows, lang = 'it') {
  const byId = {}
  for (const row of styleRows || []) {
    if (row?.id) byId[row.id] = row
  }
  const warnings = []
  for (const p of roster || []) {
    const sid = p.playing_style_id
    if (!sid || !byId[sid]) continue
    const pos = String(p.position || '').toUpperCase().trim()
    if (!pos) continue
    const compat = byId[sid].compatible_positions
    if (!Array.isArray(compat) || compat.length === 0) continue
    if (compat.includes(pos)) continue
    const styleName = byId[sid].name || '?'
    const allowed = compat.join('/')
    if (lang === 'en') {
      warnings.push(`${p.player_name || '?'}: position ${pos} but style "${styleName}" only fits ${allowed}`)
    } else {
      warnings.push(`${p.player_name || '?'}: position ${pos} ma lo stile "${styleName}" in gioco è ammesso solo su ${allowed}`)
    }
  }
  return warnings.slice(0, 14)
}

export function formatFitWarningsBlock(warnings, lang = 'it') {
  if (!warnings?.length) return ''
  const title =
    lang === 'en'
      ? 'POSITION VS PLAYER STYLE (database — fix formation or player cards)'
      : 'POSITION VS STILE GIOCATORE (database — correggi formazione o carte)'
  return `${title}:\n${warnings.map((w) => `  - ${w}`).join('\n')}`
}
