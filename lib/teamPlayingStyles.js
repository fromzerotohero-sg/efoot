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
