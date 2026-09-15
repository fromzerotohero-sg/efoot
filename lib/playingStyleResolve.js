/**
 * Risolve stili di gioco PESDB/EFHub (EN) verso i nomi in `playing_styles` (IT).
 * Usato da save-player, import catalogo, diagnostic e coach matching.
 *
 * v6.0.0: una card può avere stile attacco e/o difesa. Il FK singolo
 * `playing_style_id` resta il nome principale salvato; i due stili extra
 * vivono in metadata/extracted_data e non vengono finti come un unico stile.
 */

/** Nomi esatti come in tabella `playing_styles` (Supabase). */
export const PLAYING_STYLE_DB_NAMES = [
  'Ala prolifica',
  'attacante di rientro',
  'Box-to-Box',
  'Classico n°10',
  'Collante',
  'Difensore instancabile',
  'Disturbatore di passaggi',
  'Frontale extra',
  "Fulcro dell'attacco",
  'Fulcro di gioco',
  'Giocatore chiave',
  'Incontrista',
  'Maestro della difesa alta',
  'Onnipresente',
  'Opportunista',
  'Orchestratore',
  'Portiere difensivo',
  'Portiere offensivo',
  'Pressione in attacco',
  'PT stopper',
  "Rapace d'area",
  'Rapace in avanti',
  'Regista creativo',
  'Ruolo di copertura',
  'Senza palla',
  'Specialista di cross',
  'Sviluppo',
  'Taglio al centro',
  'Terzino difensivo',
  'Terzino mattatore',
  'Terzino offensivo',
  'Tra le linee'
]

/** Stesso stile, etichette diverse (IT client vs catalogo EN/DB). */
const PLAYING_STYLE_EQUIVALENTS = [
  ['Onnipresente', 'Box-to-Box'],
  ['Tra le linee', 'Orchestratore']
]

/** PESDB / EFHub (EN, normalizzato) → nome DB */
const PLAYING_STYLE_EN_TO_IT = {
  'anchor man': 'Collante',
  'box to box': 'Onnipresente',
  'build up': 'Sviluppo',
  'classic no 10': 'Classico n°10',
  'creative playmaker': 'Regista creativo',
  'cross specialist': 'Specialista di cross',
  'deep lying forward': 'attacante di rientro',
  'deep-lying forward': 'attacante di rientro',
  'defensive full back': 'Terzino difensivo',
  'defensive full-back': 'Terzino difensivo',
  'defensive goalkeeper': 'Portiere difensivo',
  destroyer: 'Incontrista',
  'the destroyer': 'Incontrista',
  'dummy runner': 'Senza palla',
  'extra frontman': 'Frontale extra',
  'fox in the box': "Rapace d'area",
  'full back finisher': 'Terzino mattatore',
  'full-back finisher': 'Terzino mattatore',
  'goal poacher': 'Opportunista',
  'hole player': 'Giocatore chiave',
  'offensive full back': 'Terzino offensivo',
  'offensive full-back': 'Terzino offensivo',
  'attacking full back': 'Terzino offensivo',
  'attacking full-back': 'Terzino offensivo',
  'offensive goalkeeper': 'Portiere offensivo',
  'offensive wingback': 'Terzino offensivo',
  orchestrator: 'Tra le linee',
  'prolific winger': 'Ala prolifica',
  'roaming flank': 'Taglio al centro',
  'target man': 'Fulcro di gioco',
  'front line pressure': 'Pressione in attacco',
  'attacking pressure': 'Pressione in attacco',
  'covering role': 'Ruolo di copertura',
  'relentless defender': 'Difensore instancabile',
  'pass disruptor': 'Disturbatore di passaggi',
  'passing interrupter': 'Disturbatore di passaggi',
  'attacking hub': "Fulcro dell'attacco",
  'high line gk': 'Maestro della difesa alta',
  'gk stopper': 'PT stopper',
  'fox forward': 'Rapace in avanti'
}

const IT_ALIASES = {
  'classico n 10': 'Classico n°10',
  'classico n° 10': 'Classico n°10',
  'classico no 10': 'Classico n°10',
  'classic 10': 'Classico n°10',
  'rapace d area': "Rapace d'area",
  opportunista: 'Opportunista',
  'giocatore chiave': 'Giocatore chiave',
  'regista creativo': 'Regista creativo',
  'tra le linee': 'Tra le linee',
  'ala prolifica': 'Ala prolifica',
  collante: 'Collante',
  incollabile: 'Collante',
  'gocatore chiave': 'Giocatore chiave',
  onnipresente: 'Onnipresente',
  sviluppo: 'Sviluppo',
  incontrista: 'Incontrista',
  orchestratore: 'Tra le linee',
  'attaccante di rientro': 'attacante di rientro',
  'pressione in attacco': 'Pressione in attacco',
  'ruolo di copertura': 'Ruolo di copertura'
}

const DB_NAME_BY_KEY = new Map(
  PLAYING_STYLE_DB_NAMES.map((name) => [normalizePlayingStyleKey(name), name])
)

const EQUIVALENT_KEYS = (() => {
  const map = new Map()
  for (const group of PLAYING_STYLE_EQUIVALENTS) {
    const keys = group.map(normalizePlayingStyleKey)
    for (const key of keys) map.set(key, keys)
  }
  return map
})()

export function normalizePlayingStyleKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[°º]/g, '')
    .replace(/\./g, '')
    .replace(/-/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null} Nome canonico in `playing_styles`, o null se non riconosciuto / "No Style"
 */
export function resolvePlayingStyleDbName(raw) {
  const key = normalizePlayingStyleKey(raw)
  if (!key || key === 'no style' || key === 'basic') return null

  // Exact DB name first so "Box-to-Box" stored in DB is not remapped away.
  if (DB_NAME_BY_KEY.has(key)) return DB_NAME_BY_KEY.get(key)
  if (IT_ALIASES[key]) return IT_ALIASES[key]
  if (PLAYING_STYLE_EN_TO_IT[key]) return PLAYING_STYLE_EN_TO_IT[key]

  return null
}

export function playingStylesMatch(a, b) {
  if (!a || !b) return !a && !b
  const left = resolvePlayingStyleDbName(a) || String(a).trim()
  const right = resolvePlayingStyleDbName(b) || String(b).trim()
  const leftKey = normalizePlayingStyleKey(left)
  const rightKey = normalizePlayingStyleKey(right)
  if (leftKey === rightKey) return true
  const group = EQUIVALENT_KEYS.get(leftKey)
  return Array.isArray(group) && group.includes(rightKey)
}

function readSplitStyles(source) {
  if (!source || typeof source !== 'object') return { attacking: null, defending: null }
  const attacking = resolvePlayingStyleDbName(
    source.attacking_playing_style || source.playing_style_attack || source.attackingPlayingStyle
  )
  const defending = resolvePlayingStyleDbName(
    source.defensive_playing_style || source.playing_style_defense || source.defensivePlayingStyle
  )
  return { attacking, defending }
}

/**
 * @param {object} player
 * @param {Record<string, string>} [stylesLookup] id → name
 */
export function getPlayerStyleDisplayName(player, stylesLookup = {}) {
  const split = getPlayerSplitPlayingStyles(player, stylesLookup)
  if (split.attacking && split.defending && !playingStylesMatch(split.attacking, split.defending)) {
    return `${split.attacking} / ${split.defending}`
  }

  if (player?.playing_style_id && stylesLookup[player.playing_style_id]) {
    return stylesLookup[player.playing_style_id]
  }
  const fromRole = resolvePlayingStyleDbName(player?.role)
  if (fromRole) return fromRole
  const fromPlayingStyle = resolvePlayingStyleDbName(player?.playing_style)
  if (fromPlayingStyle) return fromPlayingStyle

  const ex =
    player?.extracted_data && typeof player.extracted_data === 'object'
      ? player.extracted_data
      : null
  if (ex) {
    const fromExRole = resolvePlayingStyleDbName(ex.role)
    if (fromExRole) return fromExRole
    const fromExStyle = resolvePlayingStyleDbName(ex.playing_style)
    if (fromExStyle) return fromExStyle
  }

  return player?.role ? String(player.role).trim() : ''
}

/**
 * Stili attacco/difesa se presenti nei metadati. Il campo singolo resta il fallback.
 */
export function getPlayerSplitPlayingStyles(player, stylesLookup = {}) {
  const meta = player?.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const extracted = player?.extracted_data && typeof player.extracted_data === 'object' ? player.extracted_data : {}
  const fromMeta = readSplitStyles(meta)
  const fromExtracted = readSplitStyles(extracted)
  const fromPlayer = readSplitStyles(player)
  const primary =
    (player?.playing_style_id && stylesLookup[player.playing_style_id]) ||
    resolvePlayingStyleDbName(player?.role) ||
    resolvePlayingStyleDbName(player?.playing_style) ||
    null

  return {
    attacking: fromPlayer.attacking || fromMeta.attacking || fromExtracted.attacking || primary,
    defending: fromPlayer.defending || fromMeta.defending || fromExtracted.defending || null
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string|null|undefined} raw
 */
export async function lookupPlayingStyleId(admin, raw) {
  const dbName = resolvePlayingStyleDbName(raw)
  if (!dbName || !admin) return { id: null, name: null }

  const { data: playingStyle } = await admin
    .from('playing_styles')
    .select('id, name')
    .ilike('name', dbName)
    .maybeSingle()

  return {
    id: playingStyle?.id || null,
    name: playingStyle?.name || dbName
  }
}
