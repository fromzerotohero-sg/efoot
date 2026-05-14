/**
 * Risolve URL immagine carta per giocatori in rosa (catalogo, estrazione, legacy).
 * Usato da Nuova Rosa e da save-player per popolare metadata quando manca.
 */

export function pickHttpUrlString(v) {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t.startsWith('http://') && !t.startsWith('https://')) return null
  return t
}

function pickFromPhotoSlots(photoSlots) {
  if (!photoSlots || typeof photoSlots !== 'object') return null
  return (
    pickHttpUrlString(photoSlots.main_url) ||
    pickHttpUrlString(photoSlots.catalog_card) ||
    pickHttpUrlString(photoSlots.card_url) ||
    null
  )
}

/**
 * Inferenza solo per righe catalogo PesDB con id numerico (evita URL sbagliati per altre fonti).
 */
export function inferPesdbCardFrontUrl(metadata = {}, extracted = {}) {
  const meta = metadata && typeof metadata === 'object' ? metadata : {}
  const ex = extracted && typeof extracted === 'object' ? extracted : {}
  const exMeta = ex.metadata && typeof ex.metadata === 'object' ? ex.metadata : {}
  const src = String(
    meta.catalog_source ||
      meta.source ||
      ex.catalog_source ||
      exMeta.catalog_source ||
      ''
  ).toLowerCase()
  if (src !== 'pesdb') return null
  const raw =
    meta.catalog_source_player_id ||
    meta.source_player_id ||
    ex.source_player_id ||
    ex.catalog_source_player_id
  const sid = raw != null ? String(raw).trim() : ''
  if (!/^\d+$/.test(sid)) return null
  return `https://pesdb.net/assets/img/card/f${sid}.png`
}

/**
 * URL anteprima carta per UI (rosa, riserve, modali).
 */
export function resolvePlayerCardImageUrl(player) {
  if (!player || typeof player !== 'object') return null
  const meta = player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const ex = player.extracted_data && typeof player.extracted_data === 'object' ? player.extracted_data : {}
  const exMeta = ex.metadata && typeof ex.metadata === 'object' ? ex.metadata : {}

  const direct =
    pickHttpUrlString(player.photo_url) ||
    pickHttpUrlString(meta.catalog_card_front_url) ||
    pickHttpUrlString(meta.source_card_front_url) ||
    pickHttpUrlString(exMeta.catalog_card_front_url) ||
    pickHttpUrlString(exMeta.source_card_front_url) ||
    pickHttpUrlString(ex.source_card_front_url) ||
    pickHttpUrlString(ex.catalog_card_front_url) ||
    pickFromPhotoSlots(player.photo_slots)

  if (direct) return direct

  return inferPesdbCardFrontUrl(meta, ex)
}

/**
 * Completa metadata.catalog_card_front_url dal payload salvataggio (retrocompatibilità gestione rosa / client vecchi).
 */
export function enrichPlayerMetadataWithCardImage(payload, metadata) {
  const next = metadata && typeof metadata === 'object' ? { ...metadata } : {}
  if (pickHttpUrlString(next.catalog_card_front_url)) return next

  const synthetic = {
    photo_url: payload?.photo_url,
    metadata: next,
    extracted_data: payload?.extracted_data,
    photo_slots: payload?.photo_slots
  }

  let url =
    pickHttpUrlString(payload?.source_card_front_url) ||
    pickHttpUrlString(payload?.catalog_card_front_url) ||
    resolvePlayerCardImageUrl(synthetic)

  if (url) next.catalog_card_front_url = url
  return next
}
