/**
 * Messaggi utente bilingue (via t()) per errori di optimizeImageFile:
 * foto ad alta risoluzione, file troppo pesanti anche dopo compressione, ecc.
 *
 * @param {unknown} err
 * @param {(key: string) => string} t - useTranslation().t
 * @returns {string}
 */
export function getImageOptimizeUserMessage(err, t) {
  const code =
    err && typeof err === 'object' && err.message != null ? String(err.message) : String(err || '')

  if (code === 'IMAGE_TOO_LARGE_AFTER_OPTIMIZATION') {
    return t('imageOptimizeHighQualityHint')
  }
  if (code === 'INVALID_IMAGE_FILE') {
    return t('errorInvalidImage')
  }
  if (code === 'IMAGE_LOAD_ERROR') {
    return t('imageOptimizeFailedLoad')
  }
  if (code === 'CANVAS_CONTEXT_ERROR') {
    return t('imageOptimizeFailedCanvas')
  }
  if (
    code === 'IMAGE_OPTIMIZATION_FAILED' ||
    code === 'CANVAS_BLOB_ERROR' ||
    code === 'BLOB_READ_ERROR' ||
    code === 'FILE_READ_ERROR'
  ) {
    return t('imageOptimizeFailedGeneric')
  }
  return t('imageOptimizeFailedGeneric')
}
