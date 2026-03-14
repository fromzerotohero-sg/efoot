/**
 * Utility per catturare una foto dalla fotocamera (getUserMedia).
 * Usabile solo in contesto sicuro (HTTPS o localhost).
 * Il chiamante deve passare un elemento <video> dove mostrare lo stream
 * e un elemento <canvas> (opzionale, può essere creato al volo) per il frame.
 *
 * Uso tipico: apri modal con <video>, chiama startCamera(videoEl),
 * su "Cattura" chiama captureFrame(videoEl) → Blob, poi stopCamera(videoEl).
 */

const JPEG_QUALITY = 0.92
/** Limite lato lungo (px) per evitare payload eccessivi e rispettare i limiti API (es. 10MB). */
const MAX_CANVAS_DIMENSION = 1920

/**
 * Verifica se il contesto è sicuro per getUserMedia (HTTPS o localhost).
 * @returns {boolean}
 */
export function isCameraSupported() {
  if (typeof window === 'undefined') return false
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

/**
 * Verifica contesto sicuro (getUserMedia richiede secure context).
 * @returns {boolean}
 */
export function isSecureContext() {
  if (typeof window === 'undefined') return false
  return window.isSecureContext === true
}

/**
 * Avvia lo stream della fotocamera e lo mostra nel <video>.
 * @param {HTMLVideoElement} videoEl - elemento video dove mostrare lo stream
 * @param {{ facingMode?: string }} options - facingMode: 'environment' (posteriore) o 'user' (frontale)
 * @returns {Promise<void>} - risolve quando il video è pronto a essere riprodotto
 */
export function startCamera(videoEl, options = {}) {
  if (!videoEl || !isCameraSupported() || !isSecureContext()) {
    return Promise.reject(new Error('CAMERA_NOT_AVAILABLE'))
  }
  const { facingMode = 'environment' } = options
  return navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    })
    .then((stream) => {
      videoEl.srcObject = stream
      videoEl._cameraStream = stream
      return new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(resolve).catch(reject)
        }
        videoEl.onerror = () => reject(new Error('VIDEO_PLAY_ERROR'))
      })
    })
}

/**
 * Cattura il frame corrente del video come Blob (JPEG).
 * La dimensione è limitata a MAX_CANVAS_DIMENSION sul lato lungo per coerenza con limiti API (10MB) e performance.
 * @param {HTMLVideoElement} videoEl - elemento video con stream attivo
 * @returns {Promise<Blob>}
 */
export function captureFrame(videoEl) {
  if (!videoEl || videoEl.readyState < 2) {
    return Promise.reject(new Error('VIDEO_NOT_READY'))
  }
  let w = videoEl.videoWidth
  let h = videoEl.videoHeight
  if (!w || !h) return Promise.reject(new Error('VIDEO_DIMENSIONS'))

  const maxDim = Math.max(w, h)
  if (maxDim > MAX_CANVAS_DIMENSION) {
    const scale = MAX_CANVAS_DIMENSION / maxDim
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('CANVAS_ERROR'))
  ctx.drawImage(videoEl, 0, 0, w, h)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('TO_BLOB_FAILED'))
      },
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

/**
 * Ferma lo stream della fotocamera e pulisce il video.
 * @param {HTMLVideoElement} videoEl - elemento video che aveva lo stream
 */
export function stopCamera(videoEl) {
  if (!videoEl) return
  const stream = videoEl._cameraStream || videoEl.srcObject
  if (stream && typeof stream.getTracks === 'function') {
    stream.getTracks().forEach((t) => t.stop())
  }
  videoEl.srcObject = null
  videoEl._cameraStream = null
}
