/**
 * Stili squadra selezionabili (Team Playstyle) — unica fonte IT/EN/ES + alias.
 * Fonte: Konami eFootball v6.0.0 (eFootball 2027).
 * IT "Pressing totale" = EN "Overload" = ES "Superioridad".
 */

function normalizeStyleText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const TEAM_PLAYING_STYLES = [
  {
    id: 'possesso_palla',
    it: 'Possesso palla',
    en: 'Possession Game',
    es: 'Posesión',
    aliases: ['possesso palla', 'possession game', 'ball possession', 'posesion']
  },
  {
    id: 'contropiede_veloce',
    it: 'Contropiede veloce',
    en: 'Quick Counter',
    es: 'Contraataque rápido',
    aliases: ['contropiede veloce', 'quick counter']
  },
  {
    id: 'contrattacco',
    it: 'Contrattacco',
    en: 'Long Ball Counter',
    es: 'Contraataque con balón largo',
    aliases: ['contrattacco', 'long ball counter', 'lbc']
  },
  {
    id: 'passaggio_lungo',
    it: 'Passaggio lungo',
    en: 'Long Ball',
    es: 'Balón largo',
    aliases: ['passaggio lungo', 'long ball', 'lancio lungo']
  },
  {
    id: 'vie_laterali',
    it: 'Vie laterali',
    en: 'Out Wide',
    es: 'Por las bandas',
    aliases: ['vie laterali', 'out wide', 'wing play']
  },
  {
    id: 'pressing_totale',
    it: 'Pressing totale',
    en: 'Overload',
    es: 'Superioridad',
    aliases: [
      'pressing totale',
      'pressione totale',
      'overload',
      'sovraccarico',
      'superioridad',
      'presion total',
      'total pressing'
    ]
  }
]

export const TEAM_PLAYING_STYLE_IDS = TEAM_PLAYING_STYLES.map((style) => style.id)

export function getTeamPlayingStyleLabel(idOrName, lang = 'it') {
  const style = resolveTeamPlayingStyle(idOrName)
  if (!style) return String(idOrName || '').replace(/_/g, ' ')
  if (lang === 'en') return style.en
  if (lang === 'es') return style.es
  return style.it
}

export function resolveTeamPlayingStyle(raw) {
  const normalized = normalizeStyleText(raw)
  if (!normalized) return null

  const asId = normalized.replace(/ /g, '_')
  const byId = TEAM_PLAYING_STYLES.find((style) => style.id === asId)
  if (byId) return byId

  for (const style of TEAM_PLAYING_STYLES) {
    const needles = [style.it, style.en, style.es, ...style.aliases]
      .map(normalizeStyleText)
      .filter((needle) => needle.length >= 5 || needle === style.id.replace(/_/g, ' '))
    if (needles.some((needle) => normalized === needle || normalized.includes(needle))) {
      return style
    }
  }
  return null
}

export function canonicalizeTeamPlayingStyleId(raw) {
  const resolved = resolveTeamPlayingStyle(raw)
  return resolved?.id || null
}

const COACH_STYLE_THRESHOLD = 70

export function rankCoachTeamStyles(competence = {}) {
  if (!competence || typeof competence !== 'object') return []
  return TEAM_PLAYING_STYLES.map((style) => {
    const raw = competence[style.id]
    const value = typeof raw === 'number' ? raw : parseInt(raw, 10)
    return {
      id: style.id,
      label: style.it,
      value: Number.isFinite(value) ? value : 0
    }
  }).sort((a, b) => b.value - a.value || TEAM_PLAYING_STYLES.findIndex((style) => style.id === a.id) - TEAM_PLAYING_STYLES.findIndex((style) => style.id === b.id))
}

export function decideCoachTeamStyle({ competence, currentStyle, suggestedStyle } = {}) {
  const ranked = rankCoachTeamStyles(competence)
  const advisable = ranked.filter((style) => style.value >= COACH_STYLE_THRESHOLD)
  const currentId = canonicalizeTeamPlayingStyleId(currentStyle)
  const suggestedId = canonicalizeTeamPlayingStyleId(suggestedStyle)
  const current = currentId ? ranked.find((style) => style.id === currentId) : null
  const suggested = suggestedId ? ranked.find((style) => style.id === suggestedId) : null
  const maxValue = advisable[0]?.value || 0
  const identity = advisable.filter((style) => style.value === maxValue)

  if (current && current.value >= COACH_STYLE_THRESHOLD) {
    if (!suggested || suggested.value < COACH_STYLE_THRESHOLD || suggested.value < current.value) {
      return { action: 'keep', style: current, reason: 'downgrade_blocked' }
    }
    if (suggested.id === current.id) {
      return { action: 'keep', style: current, reason: 'already_active' }
    }
    return { action: 'change', style: suggested, reason: 'peer_or_upgrade' }
  }

  if (suggested && suggested.value >= COACH_STYLE_THRESHOLD && suggested.value === maxValue) {
    return { action: 'change', style: suggested, reason: 'coach_identity' }
  }
  if (identity.length > 0) {
    return { action: 'change', style: identity[0], reason: 'rewrite_to_identity' }
  }
  return { action: 'omit', style: null, reason: 'none_advisable' }
}

export function formatCoachTeamStylePromptBlock(competence, currentStyle, lang = 'it') {
  const ranked = rankCoachTeamStyles(competence)
  if (!ranked.length) return ''
  const currentId = canonicalizeTeamPlayingStyleId(currentStyle)
  const current = currentId ? ranked.find((style) => style.id === currentId) : null
  const maxValue = Math.max(0, ...ranked.map((style) => style.value))
  const identity = ranked.filter((style) => style.value >= COACH_STYLE_THRESHOLD && style.value === maxValue)
  const weakerAllowed = ranked.filter((style) => style.value >= COACH_STYLE_THRESHOLD && style.value < maxValue)
  const forbidden = ranked.filter((style) => style.value < COACH_STYLE_THRESHOLD)

  const lines = lang === 'en'
    ? ['COACH TEAM-STYLE CONSTRAINT (mandatory, do not ignore):']
    : ['VINCOLO STILE ALLENATORE (obbligatorio, non ignorare):']

  ranked.forEach((style) => {
    const level = style.value >= 80 ? 'ALTA' : style.value >= COACH_STYLE_THRESHOLD ? 'MEDIA' : 'BASSA'
    lines.push(`  * ${style.label}: ${style.value} ${level}`)
  })

  if (identity.length) {
    lines.push(lang === 'en'
      ? `- Coach identity (max competence, use these): ${identity.map((style) => `${style.label} ${style.value}`).join(', ')}`
      : `- Identità allenatore (competenza massima, usa questi): ${identity.map((style) => `${style.label} ${style.value}`).join(', ')}`)
  }
  if (weakerAllowed.length) {
    lines.push(lang === 'en'
      ? `- Allowed but weaker (>=70, below identity): ${weakerAllowed.map((style) => `${style.label} ${style.value}`).join(', ')}. Do NOT pick these if an identity style is already active.`
      : `- Ammessi ma più deboli (>=70, sotto l'identità): ${weakerAllowed.map((style) => `${style.label} ${style.value}`).join(', ')}. NON proporli se uno stile di identità è già attivo.`)
  }
  if (forbidden.length) {
    lines.push(lang === 'en'
      ? `- Forbidden (<70): ${forbidden.map((style) => `${style.label} ${style.value}`).join(', ')}`
      : `- Vietati (<70): ${forbidden.map((style) => `${style.label} ${style.value}`).join(', ')}`)
  }
  if (current) {
    lines.push(lang === 'en'
      ? `- Current team style: ${current.label} (${current.value}). If this is >=70, KEEP it. Never downgrade to a weaker style.`
      : `- Stile squadra ATTUALE: ${current.label} (${current.value}). Se è >=70, MANTIENILO. Vietato scendere a uno stile più debole.`)
  } else {
    lines.push(lang === 'en'
      ? '- Current team style: not set. Recommend only a coach-identity style, never a weaker allowed style by default.'
      : '- Stile squadra ATTUALE: non impostato. Consiglia solo uno stile di identità, mai uno più debole per default.')
  }
  lines.push(lang === 'en'
    ? '- Possession is NOT a default. Do not suggest Possession just because the opponent is compact. Example: Pressing totale 89 + Passaggio lungo 89 + Possesso 75 → keep Pressing totale if active; Possesso 75 is not an upgrade.'
    : '- Possesso palla NON è il default. Non suggerirlo solo perché l\'avversario è compatto. Esempio: Pressing totale 89, Passaggio lungo 89, Possesso 75 → mantieni Pressing totale se già attivo; Possesso 75 non è un upgrade.')
  return lines.join('\n')
}

export function enforceCoachTeamStyleOnOutput(output, { competence, currentStyle, lang = 'it' } = {}) {
  const tactical = output?.countermeasures?.tactical_adjustments
  if (!Array.isArray(tactical) || !competence || typeof competence !== 'object') return output

  const styleIndexes = []
  tactical.forEach((adj, index) => {
    if (!adj || typeof adj !== 'object') return
    if (adj.type === 'team_playing_style' || adj.type === 'playing_style_change') styleIndexes.push(index)
  })
  if (!styleIndexes.length) return output

  const primary = tactical[styleIndexes[0]]
  const decision = decideCoachTeamStyle({
    competence,
    currentStyle,
    suggestedStyle: primary?.suggestion || primary?.application_hint
  })

  const keepOnlyPrimary = () => {
    output.countermeasures.tactical_adjustments = tactical.filter((_, index) => (
      index === styleIndexes[0] || !styleIndexes.includes(index)
    ))
  }

  if (decision.action === 'omit' || !decision.style) {
    output.countermeasures.tactical_adjustments = tactical.filter((_, index) => !styleIndexes.includes(index))
    return output
  }

  keepOnlyPrimary()
  const adj = output.countermeasures.tactical_adjustments.find((item) => (
    item?.type === 'team_playing_style' || item?.type === 'playing_style_change'
  ))
  if (!adj) return output

  adj.type = 'team_playing_style'
  adj.suggestion = lang === 'en'
    ? `Team style: ${getTeamPlayingStyleLabel(decision.style.id, 'en')}`
    : `Stile squadra: ${decision.style.label}`
  adj.application_hint = lang === 'en'
    ? 'Game Plan → Tactics → Team Playstyle. Use only the six official styles; keep the coach identity if it is already active.'
    : 'Game Plan → Tattica → Stile squadra. Usa solo i 6 stili ufficiali; mantieni l\'identità dell\'allenatore se è già attiva.'
  if (decision.action === 'keep') {
    adj.reason = lang === 'en'
      ? `Keep ${decision.style.label}: it is already one of this coach's strongest styles.`
      : `Mantieni ${decision.style.label}: è già tra gli stili più forti di questo allenatore.`
    adj.priority = adj.priority || 'medium'
  } else if (decision.reason === 'rewrite_to_identity') {
    adj.reason = lang === 'en'
      ? `Use ${decision.style.label}: it is this coach's identity, not a weaker fallback.`
      : `Usa ${decision.style.label}: è l'identità di questo allenatore, non un fallback più debole.`
  }
  return output
}

/** Espande alias community/ufficiali nel testo normalizzato usato dallo scoring RAG. */
export function expandQueryWithTeamStyleAliases(messageNorm) {
  const normalized = normalizeStyleText(messageNorm)
  if (!normalized) return ''
  const extras = []
  for (const style of TEAM_PLAYING_STYLES) {
    const needles = [style.id.replace(/_/g, ' '), style.it, style.en, style.es, ...style.aliases]
      .map(normalizeStyleText)
      .filter((needle) => needle.length >= 5)
    if (needles.some((needle) => normalized.includes(needle))) {
      extras.push(normalizeStyleText(style.it), normalizeStyleText(style.en), 'stile squadra')
    }
  }
  if (!extras.length) return normalized
  return `${normalized} ${Array.from(new Set(extras)).join(' ')}`
}
