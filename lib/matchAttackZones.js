/**
 * Distingue zone attacco del cliente vs avversario.
 * Le zone dei gol subiti hanno colonne riservate (NULL finché non c'è estrazione).
 */

const SIDE_ALIASES = {
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
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeSideKey(key) {
  if (key == null) return null
  return SIDE_ALIASES[String(key).trim().toLowerCase()] || null
}

function isZoneMap(value) {
  if (!isPlainObject(value)) return false
  return Object.keys(value).some((key) => normalizeSideKey(key))
}

function toZoneMap(value) {
  if (!isZoneMap(value)) return null
  const out = {}
  for (const [key, raw] of Object.entries(value)) {
    const side = normalizeSideKey(key)
    if (!side) continue
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw))
    if (Number.isNaN(num)) continue
    out[side] = num
  }
  return Object.keys(out).length ? out : null
}

function isHomeMatch(isHome) {
  if (isHome === false || isHome === 'false' || isHome === 0) return false
  return true
}

/**
 * @param {object|null} attackAreas
 * @param {boolean|null} [isHome]
 * @returns {{ ours: object|null, theirs: object|null }}
 */
export function resolveMatchAttackZones(attackAreas, isHome = true) {
  if (!isPlainObject(attackAreas)) return { ours: null, theirs: null }

  const labeledOurs = toZoneMap(attackAreas.cliente || attackAreas.ours || attackAreas.user)
  const labeledTheirs = toZoneMap(
    attackAreas.avversario || attackAreas.opponent || attackAreas.theirs
  )
  if (labeledOurs || labeledTheirs) {
    return { ours: labeledOurs, theirs: labeledTheirs }
  }

  const team1 = toZoneMap(attackAreas.team1)
  const team2 = toZoneMap(attackAreas.team2)
  if (team1 || team2) {
    if (!isHomeMatch(isHome)) return { ours: team2, theirs: team1 }
    return { ours: team1, theirs: team2 }
  }

  return { ours: toZoneMap(attackAreas), theirs: null }
}

export function averageZoneMaps(maps) {
  const sum = { left: 0, center: 0, right: 0 }
  let n = 0
  for (const map of maps || []) {
    const zone = toZoneMap(map)
    if (!zone) continue
    let added = false
    for (const side of ['left', 'center', 'right']) {
      if (zone[side] == null) continue
      sum[side] += zone[side]
      added = true
    }
    if (added) n += 1
  }
  if (!n) return null
  const total = sum.left + sum.center + sum.right
  if (total <= 0) return null
  return {
    left: Math.round((sum.left / total) * 100),
    center: Math.round((sum.center / total) * 100),
    right: Math.round((sum.right / total) * 100)
  }
}

export function formatZonePct(map, lang = 'it') {
  const zone = toZoneMap(map)
  if (!zone) return ''
  const en = lang === 'en' || lang === 'es'
  const labels = en
    ? { left: 'left', center: 'center', right: 'right' }
    : { left: 'sinistra', center: 'centro', right: 'destra' }
  return ['left', 'center', 'right']
    .filter((side) => zone[side] != null)
    .map((side) => `${labels[side]} ${Math.round(Number(zone[side]))}%`)
    .join(', ')
}

export function formatCompactZonePair(ours, theirs) {
  const compact = (map) => {
    const zone = toZoneMap(map)
    if (!zone) return ''
    const parts = []
    if (zone.left != null) parts.push(`L${Math.round(zone.left)}`)
    if (zone.center != null) parts.push(`C${Math.round(zone.center)}`)
    if (zone.right != null) parts.push(`R${Math.round(zone.right)}`)
    return parts.join(' ')
  }
  const oursStr = compact(ours)
  const theirsStr = compact(theirs)
  if (!oursStr && !theirsStr) return ''
  if (oursStr && theirsStr) return ` [tue: ${oursStr} | avv: ${theirsStr}]`
  if (oursStr) return ` [tue: ${oursStr}]`
  return ` [avv: ${theirsStr}]`
}

export function summarizeMatchAttackZones(matches = []) {
  const ours = []
  const theirs = []
  for (const match of matches) {
    const split = resolveMatchAttackZones(match?.attack_areas, match?.is_home)
    if (split.ours) ours.push(split.ours)
    if (split.theirs) theirs.push(split.theirs)
  }
  return {
    oursAvg: averageZoneMaps(ours),
    theirsAvg: averageZoneMaps(theirs),
    oursCount: ours.length,
    theirsCount: theirs.length,
    matchCount: Array.isArray(matches) ? matches.length : 0
  }
}

export function buildMatchZonePromptBlock(matches = [], lang = 'it') {
  const summary = summarizeMatchAttackZones(matches)
  const en = lang === 'en' || lang === 'es'
  const oursPct = formatZonePct(summary.oursAvg, lang)
  const theirsPct = formatZonePct(summary.theirsAvg, lang)
  const lines = en
    ? ['MATCH ZONES (live, override any cached "attack zones" line):']
    : ['ZONE PARTITE (live, prioritarie su eventuali "zone attacco" in cache):']

  if (oursPct) {
    lines.push(
      en
        ? `- Your attack (avg, ${summary.oursCount} matches): ${oursPct}`
        : `- Attacco tuo (media, ${summary.oursCount} partite): ${oursPct}`
    )
  }
  if (theirsPct) {
    lines.push(
      en
        ? `- Opponent attack / pressure conceded (avg, ${summary.theirsCount} matches). NOT conceded-goal locations: ${theirsPct}`
        : `- Attacco avversario / pressione concessa (media, ${summary.theirsCount} partite). NON sono zone dei gol subiti: ${theirsPct}`
    )
  }
  lines.push(
    en
      ? '- Conceded-goal zones: not in the database. If asked centre vs wing defensively, use opponent attack as a pressure proxy and say so. Do not invent a central corridor if the proxy points wide.'
      : '- Zone dei gol subiti: non sono in database. Se chiedono centro vs fascia in difesa, usa la pressione avversaria come indicatore e dillo. Non inventare il corridoio centrale se il dato punta in fascia.'
  )
  if (oursPct || theirsPct) return lines.join('\n')

  if (!summary.matchCount) {
    return en
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

  return en
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

export function buildPatternZonePayload(matches = []) {
  const summary = summarizeMatchAttackZones(matches)
  const goals = { scored: 0, conceded: 0, scoredN: 0, concededN: 0 }
  for (const match of matches || []) {
    const stats = match?.team_stats
    if (!stats || typeof stats !== 'object') continue
    const scored = Number(stats.goals_scored)
    const conceded = Number(stats.goals_conceded)
    if (Number.isFinite(scored)) {
      goals.scored += scored
      goals.scoredN += 1
    }
    if (Number.isFinite(conceded)) {
      goals.conceded += conceded
      goals.concededN += 1
    }
  }
  return {
    our_attack_areas_avg: summary.oursAvg,
    opponent_attack_areas_avg: summary.theirsAvg,
    conceded_goal_zones_avg: null,
    total_goals_scored: goals.scoredN ? goals.scored : null,
    total_goals_conceded: goals.concededN ? goals.conceded : null
  }
}
