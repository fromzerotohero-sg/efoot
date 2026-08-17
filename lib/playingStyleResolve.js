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
 * Strip PESDB v6 phase labels ("Att:", "Def:") so legacy resolvers keep working.
 * Does not invent names; returns the remaining style token or the original trim.
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export function stripPlayingStylePhasePrefix(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return null
  const match = text.match(/^(?:att|def)\s*:\s*(.+)$/i)
  if (match?.[1]) return match[1].trim() || null
  return text
}

/**
 * Additive playing-style contract for legacy single + eFootball v6 dual cards.
 * Source of truth for dual lives in metadata/extracted_data.playing_styles.
 * `primary` / catalog `playing_style` stays the attack (or sole) style without phase prefix.
 *
 * @param {{
 *   attack?: string|null,
 *   defense?: string|null,
 *   primary?: string|null,
 *   playing_style?: string|null,
 *   rawLines?: string[],
 *   format?: 'single'|'dual'|null
 * }|string|null|undefined} input
 */
export function normalizePlayingStylesContract(input) {
  if (typeof input === 'string') {
    return normalizePlayingStylesContract({ playing_style: input })
  }
  const raw = input && typeof input === 'object' ? input : {}
  const attack =
    stripPlayingStylePhasePrefix(raw.attack) ||
    stripPlayingStylePhasePrefix(raw.primary) ||
    stripPlayingStylePhasePrefix(raw.playing_style) ||
    null
  const defenseRaw = raw.defense
  const defense =
    defenseRaw === undefined || defenseRaw === null || defenseRaw === ''
      ? null
      : stripPlayingStylePhasePrefix(defenseRaw)
  const hasDefense = Boolean(defense)
  const format = hasDefense ? 'dual' : (raw.format === 'dual' && attack ? 'dual' : 'single')
  const primary = attack
  const out = {
    format: attack || hasDefense ? format : 'single',
    attack,
    defense: hasDefense ? defense : null,
    primary
  }
  if (Array.isArray(raw.rawLines) && raw.rawLines.length > 0) {
    out.source_raw = raw.rawLines.map((line) => String(line || '').trim()).filter(Boolean)
  }
  return out
}

/**
 * Parse one PESDB Playing Style cell ("Att: Hole Player", "Def: Basic", "Hole Player").
 * @param {string|null|undefined} text
 * @returns {{ phase: 'attack'|'defense'|null, name: string|null, raw: string|null }}
 */
export function parsePesdbPlayingStyleCell(text) {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw || raw === '-') return { phase: null, name: null, raw: null }
  const att = raw.match(/^att\s*:\s*(.+)$/i)
  if (att?.[1]) return { phase: 'attack', name: att[1].trim() || null, raw }
  const def = raw.match(/^def\s*:\s*(.+)$/i)
  if (def?.[1]) return { phase: 'defense', name: def[1].trim() || null, raw }
  return { phase: null, name: raw, raw }
}

/**
 * Build contract from PESDB Playing Style section cells (ordered).
 * @param {string[]} cells
 */
export function buildPlayingStylesFromPesdbCells(cells = []) {
  const lines = Array.isArray(cells) ? cells : []
  let attack = null
  let defense = null
  const rawLines = []
  for (const cell of lines) {
    const parsed = parsePesdbPlayingStyleCell(cell)
    if (!parsed.raw) continue
    rawLines.push(parsed.raw)
    if (parsed.phase === 'attack' && !attack) attack = parsed.name
    else if (parsed.phase === 'defense' && !defense) defense = parsed.name
    else if (!parsed.phase && !attack) attack = parsed.name
  }
  return normalizePlayingStylesContract({ attack, defense, rawLines })
}

/**
 * Read dual/single contract from catalog card, players_payload, metadata, or player row.
 * Never invents a defensive style.
 */
export function getPlayingStylesContract(source) {
  if (!source || typeof source !== 'object') {
    return normalizePlayingStylesContract(null)
  }
  const payload =
    source.players_payload && typeof source.players_payload === 'object'
      ? source.players_payload
      : null
  const meta = source.metadata && typeof source.metadata === 'object' ? source.metadata : null
  const extracted =
    source.extracted_data && typeof source.extracted_data === 'object'
      ? source.extracted_data
      : null
  const nested =
    source.playing_styles ||
    payload?.playing_styles ||
    meta?.playing_styles ||
    extracted?.playing_styles ||
    null
  if (nested && typeof nested === 'object') {
    return normalizePlayingStylesContract({
      ...nested,
      playing_style: nested.primary || nested.attack || source.playing_style || source.role
    })
  }
  return normalizePlayingStylesContract({
    playing_style: source.playing_style || source.role || payload?.playing_style || payload?.role || null
  })
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null} Nome canonico in `playing_styles`, o null se non riconosciuto / "No Style"
 */
export function resolvePlayingStyleDbName(raw) {
  const stripped = stripPlayingStylePhasePrefix(raw)
  const key = normalizePlayingStyleKey(stripped)
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
 * Stile del giocatore per fase v6 ('attack' | 'defense'), dal contratto duale
 * (getPlayingStylesContract). Senza contratto duale → fallback silenzioso allo
 * stile legacy singolo (retrocompatibilità: una card legacy vale per entrambe le fasi).
 * Guardrail: defense 'Basic' = NESSUNO stile difensivo speciale documentato → null;
 * non va interpretato come meccanica né risolto nella tassonomia legacy.
 *
 * @param {object} player
 * @param {'attack'|'defense'} phase
 * @param {Record<string, string>} [stylesLookup] id → name
 * @returns {string|null}
 */
export function getPlayerPhaseStyle(player, phase, stylesLookup = {}) {
  const legacy = getPlayerStyleDisplayName(player, stylesLookup)
  const contract = getPlayingStylesContract(player)
  if (phase === 'attack') {
    const attack = contract.attack
      ? resolvePlayingStyleDbName(contract.attack) || String(contract.attack).trim()
      : null
    return attack || legacy
  }
  if (phase === 'defense') {
    if (contract.format !== 'dual') return legacy
    const defense = contract.defense
    if (!defense || normalizePlayingStyleKey(defense) === 'basic') return null
    return resolvePlayingStyleDbName(defense) || String(defense).trim()
  }
  return legacy
}

/**
 * Display contract for the UI: ritorna { attack, defense } solo per card con
 * contratto duale v6, altrimenti null (il chiamante mantiene la visualizzazione
 * legacy a stile singolo, invariata). `defense` è null quando la fase difensiva
 * non ha uno stile speciale documentato (PESDB "Def: Basic"): il chiamante deve
 * mostrare una dicitura tipo "Nessuno stile speciale", mai "Basic" come meccanica.
 *
 * @param {object} player
 * @param {Record<string, string>} [stylesLookup] id → name
 * @returns {{ attack: string|null, defense: string|null }|null}
 */
export function getPlayerPhaseStyleDisplay(player, stylesLookup = {}) {
  const contract = getPlayingStylesContract(player)
  if (contract.format !== 'dual') return null
  return {
    attack: getPlayerPhaseStyle(player, 'attack', stylesLookup),
    defense: getPlayerPhaseStyle(player, 'defense', stylesLookup)
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
