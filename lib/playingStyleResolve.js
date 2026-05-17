/**
 * Risolve stili di gioco PESDB/EFHub (EN) verso i nomi in `playing_styles` (IT).
 * Usato da save-player, import catalogo, diagnostic e coach matching.
 */

/** Nomi esatti come in tabella `playing_styles` (Supabase). */
export const PLAYING_STYLE_DB_NAMES = [
  'Ala prolifica',
  'attacante di rientro',
  'Box-to-Box',
  'Classico n°10',
  'Collante',
  'Frontale extra',
  'Fulcro di gioco',
  'Giocatore chiave',
  'Incontrista',
  'Onnipresente',
  'Opportunista',
  'Portiere difensivo',
  'Portiere offensivo',
  "Rapace d'area",
  'Regista creativo',
  'Senza palla',
  'Specialista di cross',
  'Sviluppo',
  'Taglio al centro',
  'Terzino difensivo',
  'Terzino mattatore',
  'Terzino offensivo',
  'Tra le linee',
  'Orchestratore'
]

/** PESDB / EFHub (EN, normalizzato) → nome DB */
const PLAYING_STYLE_EN_TO_IT = {
  'anchor man': 'Collante',
  'box to box': 'Onnipresente',
  'box-to-box': 'Onnipresente',
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
  'fox in the box': "Rapace d'area",
  'full back finisher': 'Terzino mattatore',
  'full-back finisher': 'Terzino mattatore',
  'goal poacher': 'Opportunista',
  'hole player': 'Giocatore chiave',
  'offensive full back': 'Terzino offensivo',
  'offensive full-back': 'Terzino offensivo',
  'offensive goalkeeper': 'Portiere offensivo',
  'offensive wingback': 'Terzino offensivo',
  orchestrator: 'Orchestratore',
  'prolific winger': 'Ala prolifica',
  'roaming flank': 'Taglio al centro',
  'target man': 'Fulcro di gioco'
}

const IT_ALIASES = {
  'classico n 10': 'Classico n°10',
  'classico n° 10': 'Classico n°10',
  'classico no 10': 'Classico n°10',
  'classic 10': 'Classico n°10',
  'rapace d area': "Rapace d'area",
  'opportunista': 'Opportunista',
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
  orchestratore: 'Orchestratore'
}

const DB_NAME_BY_KEY = new Map(
  PLAYING_STYLE_DB_NAMES.map((name) => [normalizePlayingStyleKey(name), name])
)

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
  if (!key || key === 'no style') return null

  if (PLAYING_STYLE_EN_TO_IT[key]) return PLAYING_STYLE_EN_TO_IT[key]
  if (IT_ALIASES[key]) return IT_ALIASES[key]
  if (DB_NAME_BY_KEY.has(key)) return DB_NAME_BY_KEY.get(key)

  return null
}

export function playingStylesMatch(a, b) {
  if (!a || !b) return !a && !b
  const left = resolvePlayingStyleDbName(a) || String(a).trim()
  const right = resolvePlayingStyleDbName(b) || String(b).trim()
  return normalizePlayingStyleKey(left) === normalizePlayingStyleKey(right)
}

/**
 * @param {object} player
 * @param {Record<string, string>} [stylesLookup] id → name
 */
export function getPlayerStyleDisplayName(player, stylesLookup = {}) {
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
