import { PROGRESSION_KEYS } from './efootballBuildRules.js'

const SLIDER_LABELS = {
  shooting: { it: 'Tiro', en: 'Shooting' },
  passing: { it: 'Passaggio', en: 'Passing' },
  dribbling: { it: 'Dribbling', en: 'Dribbling' },
  dexterity: { it: 'Destrezza', en: 'Dexterity' },
  lowerBodyStrength: { it: 'Forza arti inf.', en: 'Lower body' },
  aerialStrength: { it: 'Forza aerea', en: 'Aerial' },
  defending: { it: 'Difesa', en: 'Defending' },
  gk1: { it: 'PT 1', en: 'GK 1' },
  gk2: { it: 'PT 2', en: 'GK 2' },
  gk3: { it: 'PT 3', en: 'GK 3' }
}

/** Stessi dati usati in Nuova rosa (metadata + development_points). */
export function getMergedBuildCoachData(player) {
  if (!player || typeof player !== 'object') return null
  const meta = player.metadata?.build_coach
  const dev = player.development_points?.build_coach
  if (!meta && !dev) return null

  const sliders = dev?.sliders ?? meta?.sliders
  if (!sliders || typeof sliders !== 'object') return null

  const active = PROGRESSION_KEYS.filter((k) => Number(sliders[k]) > 0)
  if (active.length === 0) return null

  const reasonsRaw = meta?.reasons
  const reasons =
    reasonsRaw && typeof reasonsRaw === 'object'
      ? (Array.isArray(reasonsRaw.it) ? reasonsRaw.it : Array.isArray(reasonsRaw.en) ? reasonsRaw.en : [])
      : []

  return {
    sliders,
    activeKeys: active,
    reasons: reasons.filter((r) => typeof r === 'string' && r.trim()),
    pointsUsed: dev?.points_used ?? meta?.points_used ?? null,
    pointsAvailable: dev?.points_available ?? meta?.points_available ?? null,
    method: meta?.method ?? dev?.method ?? null,
    targetPosition: dev?.target_position ?? meta?.target_position ?? null,
    fromApp: Boolean(meta?.method || dev?.method || meta?.reasons)
  }
}

function sliderLabel(key, lang) {
  const e = SLIDER_LABELS[key]
  return e ? (lang === 'en' ? e.en : e.it) : key
}

function formatSlidersCompact(sliders, activeKeys, lang) {
  return activeKeys
    .map((k) => `${sliderLabel(k, lang)} +${Number(sliders[k])}`)
    .join(', ')
}

/**
 * Riga compatta per rosa/diagnostic (opzionale).
 */
export function formatBuildCoachSnippet(player, lang = 'it') {
  const bc = getMergedBuildCoachData(player)
  if (!bc) return ''
  const pts =
    bc.pointsUsed != null && bc.pointsAvailable != null
      ? ` (${bc.pointsUsed}/${bc.pointsAvailable} PT)`
      : ''
  return ` | build PT app: ${formatSlidersCompact(bc.sliders, bc.activeKeys, lang)}${pts}`
}

/**
 * Sezione dedicata per RIASSUNTO ANALISI / chat.
 */
export function formatBuildProgressionSection(players, lang = 'it', { maxPlayers = 18 } = {}) {
  if (!Array.isArray(players) || players.length === 0) return ''

  const lines = []
  for (const p of players) {
    if (lines.length >= maxPlayers) break
    const bc = getMergedBuildCoachData(p)
    if (!bc) continue

    const name = String(p.player_name || '?').slice(0, 50)
    const pos = String(p.position || p.role || '?').slice(0, 12)
    const pts =
      bc.pointsUsed != null && bc.pointsAvailable != null
        ? ` — ${bc.pointsUsed}/${bc.pointsAvailable} PT`
        : ''
    const target =
      bc.targetPosition && String(bc.targetPosition).trim()
        ? `, ruolo build ${String(bc.targetPosition).trim()}`
        : ''

    let line = `  ${name} (${pos}${target}): ${formatSlidersCompact(bc.sliders, bc.activeKeys, lang)}${pts}`
    if (bc.reasons.length > 0) {
      const why = bc.reasons
        .slice(0, 4)
        .map((r) => r.replace(/\s+/g, ' ').trim())
        .join('; ')
      line += `. ${lang === 'en' ? 'Why' : 'Motivi'}: ${why.slice(0, 420)}`
    }
    lines.push(line)
  }

  if (lines.length === 0) return ''

  const header =
    lang === 'en'
      ? 'Progression builds (saved by Build coach in app — use these when the client asks if builds are correct; explain using the Why lines, do not contradict without data):'
      : 'Build progressione PT (salvate da Build coach in app — se chiede se le build sono giuste, usa questi dati e i Motivi; non dire che sono sbagliate senza incrocio):'

  return `${header}\n${lines.join('\n')}`
}
