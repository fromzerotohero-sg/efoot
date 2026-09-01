/**
 * Konami Dream Team — chi può ricevere Player Progression (PT).
 * Tabella ufficiale: Epic / Legendary / Highlight / Featured / Standard = Yes;
 * Trending = No. POTW e OTW sono di classe Trending (fisse). Card Strike Arena = max lv 1.
 */

export const NON_PROGRESSION_CARD_TYPE_FRAGMENTS = [
  'trending',
  'potw',
  'player of the week',
  'players of the week',
  'otw',
  'one to watch',
  'card strike arena'
]

function normalizeCardType(value) {
  return String(value || '').toLowerCase().trim()
}

export function isNonProgressionCardType(value) {
  const normalized = normalizeCardType(value)
  if (!normalized) return false
  return NON_PROGRESSION_CARD_TYPE_FRAGMENTS.some((fragment) => normalized.includes(fragment))
}

/**
 * Etichette tipo carta: catalogo prima (fonte PESDB/Konami), poi riga giocatore.
 * Così una Trending in catalogo non viene mascherata da un card_type errato in rosa.
 */
export function collectCardTypeLabels(player, catalogCard = null) {
  const raw = [
    catalogCard?.card_type,
    catalogCard?.card_category,
    catalogCard?.players_payload?.card_type,
    player?.metadata?.catalog_card_type,
    player?.metadata?.card_category,
    player?.card_type
  ]
  const out = []
  const seen = new Set()
  for (const value of raw) {
    if (value == null) continue
    const label = String(value).trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

export function findNonProgressionCardTypeLabel(player, catalogCard = null) {
  return collectCardTypeLabels(player, catalogCard).find(isNonProgressionCardType) || null
}

export function hasNonProgressionCardType(player, catalogCard = null) {
  return Boolean(findNonProgressionCardTypeLabel(player, catalogCard))
}

/** Tipo effettivo: se compare un tipo senza PT, ha priorità; altrimenti il primo (catalogo). */
export function getEffectiveCardType(player, catalogCard = null) {
  const labels = collectCardTypeLabels(player, catalogCard)
  return findNonProgressionCardTypeLabel(player, catalogCard) || labels[0] || null
}
