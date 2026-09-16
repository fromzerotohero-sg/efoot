const SIDES = Object.freeze(['left', 'center', 'right'] as const)

export type ZoneSide = (typeof SIDES)[number]
export type ZoneMap = Partial<Record<ZoneSide, number>>
export type ZoneAverages = Record<ZoneSide, number>

export interface MatchAttackZoneSplit {
  ours: ZoneMap | null
  theirs: ZoneMap | null
}

export interface MatchAttackZoneSummary {
  oursAvg: ZoneAverages | null
  theirsAvg: ZoneAverages | null
  oursCount: number
  theirsCount: number
  matchCount: number
}

const SIDE_ALIASES: Readonly<Record<string, ZoneSide>> = Object.freeze({
  left: 'left',
  l: 'left',
  sinistra: 'left',
  wide_left: 'left',
  center: 'center',
  centre: 'center',
  c: 'center',
  centro: 'center',
  right: 'right',
  r: 'right',
  destra: 'right',
  wide_right: 'right'
})

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isHomeMatch(isHome: unknown): boolean {
  return !(isHome === false || isHome === 'false' || isHome === 0)
}

export function normalizeSideKey(key: unknown): ZoneSide | null {
  if (key == null) return null
  return SIDE_ALIASES[String(key).trim().toLowerCase()] || null
}

export function toZoneMap(value: unknown): ZoneMap | null {
  if (!isPlainObject(value)) return null

  const zone: ZoneMap = {}
  for (const [key, rawValue] of Object.entries(value)) {
    const side = normalizeSideKey(key)
    if (!side) continue

    const number = typeof rawValue === 'number'
      ? rawValue
      : Number.parseFloat(String(rawValue))
    if (Number.isNaN(number)) continue
    zone[side] = number
  }

  return Object.keys(zone).length ? zone : null
}

/**
 * Splits attack heatmaps by meaning. `theirs` is opponent attack, which may be
 * used as a pressure-conceded proxy, but it is never a conceded-goal map.
 */
export function resolveMatchAttackZones(attackAreas: unknown, isHome: unknown = true): MatchAttackZoneSplit {
  if (!isPlainObject(attackAreas)) return { ours: null, theirs: null }

  const labeledOurs = toZoneMap(
    attackAreas.cliente || attackAreas.ours || attackAreas.user
  )
  const labeledTheirs = toZoneMap(
    attackAreas.avversario || attackAreas.opponent || attackAreas.theirs
  )
  if (labeledOurs || labeledTheirs) {
    return { ours: labeledOurs, theirs: labeledTheirs }
  }

  const team1 = toZoneMap(attackAreas.team1)
  const team2 = toZoneMap(attackAreas.team2)
  if (team1 || team2) {
    return isHomeMatch(isHome)
      ? { ours: team1, theirs: team2 }
      : { ours: team2, theirs: team1 }
  }

  return { ours: toZoneMap(attackAreas), theirs: null }
}

export function averageZoneMaps(maps: unknown[] = []): ZoneAverages | null {
  const sums: ZoneAverages = { left: 0, center: 0, right: 0 }
  let readableMapCount = 0

  for (const candidate of maps || []) {
    const zone = toZoneMap(candidate)
    if (!zone) continue

    let contributed = false
    for (const side of SIDES) {
      const value = zone[side]
      if (value == null) continue
      sums[side] += value
      contributed = true
    }
    if (contributed) readableMapCount += 1
  }

  if (!readableMapCount) return null
  const total = sums.left + sums.center + sums.right
  if (total <= 0) return null

  return {
    left: Math.round((sums.left / total) * 100),
    center: Math.round((sums.center / total) * 100),
    right: Math.round((sums.right / total) * 100)
  }
}

export function summarizeMatchAttackZones(matches: unknown = []): MatchAttackZoneSummary {
  const ourAttackMaps: ZoneMap[] = []
  const opponentAttackMaps: ZoneMap[] = []

  for (const match of Array.isArray(matches) ? matches : []) {
    const split = resolveMatchAttackZones(match?.attack_areas, match?.is_home)
    if (split.ours) ourAttackMaps.push(split.ours)
    if (split.theirs) opponentAttackMaps.push(split.theirs)
  }

  return {
    oursAvg: averageZoneMaps(ourAttackMaps),
    theirsAvg: averageZoneMaps(opponentAttackMaps),
    oursCount: ourAttackMaps.length,
    theirsCount: opponentAttackMaps.length,
    matchCount: Array.isArray(matches) ? matches.length : 0
  }
}

export function formatZonePct(map: unknown, lang = 'it'): string {
  const zone = toZoneMap(map)
  if (!zone) return ''

  const labels: Record<ZoneSide, string> = lang === 'en' || lang === 'es'
    ? { left: 'left', center: 'center', right: 'right' }
    : { left: 'sinistra', center: 'centro', right: 'destra' }

  return SIDES
    .filter((side) => zone[side] != null)
    .map((side) => `${labels[side]} ${Math.round(Number(zone[side]))}%`)
    .join(', ')
}

export function formatCompactZonePair(ours: unknown, theirs: unknown): string {
  const compact = (map: unknown): string => {
    const zone = toZoneMap(map)
    if (!zone) return ''

    const parts: string[] = []
    if (zone.left != null) parts.push(`L${Math.round(zone.left)}`)
    if (zone.center != null) parts.push(`C${Math.round(zone.center)}`)
    if (zone.right != null) parts.push(`R${Math.round(zone.right)}`)
    return parts.join(' ')
  }

  const oursText = compact(ours)
  const theirsText = compact(theirs)
  if (oursText && theirsText) return ` [tue: ${oursText} | avv: ${theirsText}]`
  if (oursText) return ` [tue: ${oursText}]`
  if (theirsText) return ` [avv: ${theirsText}]`
  return ''
}

export function buildMatchZonePromptBlock(matches: unknown = [], lang = 'it'): string {
  const summary = summarizeMatchAttackZones(matches)
  const english = lang === 'en' || lang === 'es'
  const ours = formatZonePct(summary.oursAvg, lang)
  const theirs = formatZonePct(summary.theirsAvg, lang)
  const lines = english
    ? ['MATCH ZONES (live, override any cached "attack zones" line):']
    : ['ZONE PARTITE (live, prioritarie su eventuali "zone attacco" in cache):']

  if (ours) {
    lines.push(english
      ? `- Your attack (avg, ${summary.oursCount} matches): ${ours}`
      : `- Attacco tuo (media, ${summary.oursCount} partite): ${ours}`)
  }
  if (theirs) {
    lines.push(english
      ? `- Opponent attack / pressure conceded (avg, ${summary.theirsCount} matches). NOT conceded-goal locations: ${theirs}`
      : `- Attacco avversario / pressione concessa (media, ${summary.theirsCount} partite). NON sono zone dei gol subiti: ${theirs}`)
  }
  lines.push(english
    ? '- Conceded-goal zones: not in the database. If asked centre vs wing defensively, use opponent attack as a pressure proxy and say so. Do not invent a central corridor if the proxy points wide.'
    : '- Zone dei gol subiti: non sono in database. Se chiedono centro vs fascia in difesa, usa la pressione avversaria come indicatore e dillo. Non inventare il corridoio centrale se il dato punta in fascia.')

  if (ours || theirs) return lines.join('\n')
  if (!summary.matchCount) {
    return english
      ? [
          'MATCH ZONES: none saved.',
          'If they ask centre vs wing on conceded goals: still advise from current roster/tactics, then ask them to send the match attack-zone heatmap screenshot IN THIS CHAT (not the 10-match Analisi screen).',
          'Do not send them to another page. Do not say a generic "upload matches".'
        ].join('\n')
      : [
          'ZONE PARTITE: nessuna partita salvata.',
          'Se chiedono centro vs fascia sui gol subiti: consiglia comunque da rosa/tattica attuale, poi chiedi di mandare QUI lo screenshot della mappa attacco della partita (non la schermata Analisi ultime 10).',
          'Non mandarli su un’altra pagina. Non dire un generico "carica partite".'
        ].join('\n')
  }

  return english
    ? [
        `MATCH ZONES: ${summary.matchCount} matches saved but no readable opponent attack split.`,
        'If asked centre vs wing defensively: do NOT say "upload matches". Ask for the attack-zone heatmap of one match in this chat.',
        'Still coach from roster/tactics. Do not invent a central corridor.'
      ].join('\n')
    : [
        `ZONE PARTITE: ${summary.matchCount} partite salvate ma senza split attacco avversario.`,
        'Se chiedono centro vs fascia in difesa: NON dire "carica partite". Chiedi la heat map attacco di una partita qui in chat.',
        'Consiglia comunque da rosa/tattica. Non inventare il corridoio centrale.'
      ].join('\n')
}
