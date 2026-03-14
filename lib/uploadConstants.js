/**
 * Limiti upload immagini, allineati alle validazioni API (extract-player, extract-coach, extract-game-analysis).
 * Usare per controlli lato client prima di inviare imageDataUrl.
 */
export const MAX_IMAGE_UPLOAD_MB = 10
export const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024
