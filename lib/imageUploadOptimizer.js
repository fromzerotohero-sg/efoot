import { MAX_IMAGE_LONG_SIDE, SAFE_IMAGE_UPLOAD_BYTES } from './uploadConstants'

const DEFAULT_MIME_TYPE = 'image/jpeg'
const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('FILE_READ_ERROR'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('IMAGE_LOAD_ERROR'))
    img.src = dataUrl
  })
}

function computeDimensions(width, height, maxLongSide = MAX_IMAGE_LONG_SIDE) {
  let targetWidth = width
  let targetHeight = height
  const longSide = Math.max(width, height)
  if (longSide > maxLongSide) {
    const scale = maxLongSide / longSide
    targetWidth = Math.max(1, Math.round(width * scale))
    targetHeight = Math.max(1, Math.round(height * scale))
  }
  return { width: targetWidth, height: targetHeight }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('BLOB_READ_ERROR'))
    reader.readAsDataURL(blob)
  })
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('CANVAS_BLOB_ERROR'))
        return
      }
      resolve(blob)
    }, mimeType, quality)
  })
}

export async function optimizeImageFile(file, options = {}) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('INVALID_IMAGE_FILE')
  }

  const maxBytes = options.maxBytes || SAFE_IMAGE_UPLOAD_BYTES
  const maxLongSide = options.maxLongSide || MAX_IMAGE_LONG_SIDE
  const mimeType = options.mimeType || DEFAULT_MIME_TYPE

  const originalDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(originalDataUrl)
  const { width, height } = computeDimensions(image.naturalWidth, image.naturalHeight, maxLongSide)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('CANVAS_CONTEXT_ERROR')
  ctx.drawImage(image, 0, 0, width, height)

  let bestBlob = null
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, mimeType, quality)
    bestBlob = blob
    if (blob.size <= maxBytes) {
      const dataUrl = await blobToDataUrl(blob)
      return {
        blob,
        dataUrl,
        width,
        height,
        size: blob.size,
        optimized: true
      }
    }
  }

  if (!bestBlob) throw new Error('IMAGE_OPTIMIZATION_FAILED')
  if (bestBlob.size > maxBytes) throw new Error('IMAGE_TOO_LARGE_AFTER_OPTIMIZATION')

  const dataUrl = await blobToDataUrl(bestBlob)
  return {
    blob: bestBlob,
    dataUrl,
    width,
    height,
    size: bestBlob.size,
    optimized: true
  }
}
