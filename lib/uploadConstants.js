/**
 * Limiti upload immagini, allineati alle validazioni API (extract-player, extract-coach, extract-game-analysis).
 * Usare per controlli lato client prima di inviare imageDataUrl.
 */
export const MAX_IMAGE_UPLOAD_MB = 10
export const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024

/**
 * Target lato client per restare sotto i limiti pratici di request body su Vercel
 * quando l'immagine viene inviata come data URL/base64 nel JSON.
 */
export const SAFE_IMAGE_UPLOAD_MB = 2.5
export const SAFE_IMAGE_UPLOAD_BYTES = Math.round(SAFE_IMAGE_UPLOAD_MB * 1024 * 1024)

/** Lato lungo massimo per screenshot/immagini inviati alle API di estrazione. */
export const MAX_IMAGE_LONG_SIDE = 1920
