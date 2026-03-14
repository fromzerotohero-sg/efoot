'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { startCamera, stopCamera, captureFrame, isCameraSupported, isSecureContext } from '@/lib/cameraCapture'

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: 16,
  boxSizing: 'border-box'
}

const boxStyle = {
  maxWidth: 480,
  width: '100%',
  padding: 20,
  background: 'rgba(10, 14, 39, 0.98)',
  border: '2px solid var(--neon-blue)',
  borderRadius: 12,
  boxSizing: 'border-box'
}

const videoStyle = {
  width: '100%',
  aspectRatio: '4/3',
  background: '#000',
  borderRadius: 8,
  objectFit: 'cover',
  marginBottom: 16
}

/**
 * Modal per scattare una foto dalla fotocamera.
 * - show: boolean
 * - onClose: () => void
 * - onCapture: (blob: Blob) => void
 * - title / captureLabel / closeLabel / startingLabel / errorMessage / captureFailedMessage: opzionali (passati dal parent con t())
 * Sicurezza: messaggi di errore generici (no codici tecnici esposti all'utente).
 */
export default function CameraCaptureModal({
  show,
  onClose,
  onCapture,
  title = 'Scatta foto',
  captureLabel = 'Cattura',
  closeLabel = 'Annulla',
  startingLabel = 'Avvio fotocamera…',
  errorMessage = 'Fotocamera non disponibile o permesso negato.',
  captureFailedMessage = 'Cattura non riuscita. Riprova.'
}) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'starting' | 'ready' | 'capturing' | 'error'
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!show) return
    setStatus('starting')
    setError(null)
    const video = videoRef.current
    if (!video) {
      setStatus('error')
      setError(errorMessage)
      return
    }
    if (!isCameraSupported() || !isSecureContext()) {
      setStatus('error')
      setError(errorMessage)
      return
    }
    startCamera(video, { facingMode: 'environment' })
      .then(() => setStatus('ready'))
      .catch(() => {
        setStatus('error')
        setError(errorMessage)
      })
    return () => {
      stopCamera(video)
      setStatus('idle')
    }
  }, [show, errorMessage])

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || status !== 'ready') return
    setStatus('capturing')
    try {
      const blob = await captureFrame(video)
      stopCamera(video)
      onCapture(blob)
      onClose()
    } catch {
      setError(captureFailedMessage)
      setStatus('ready')
    }
  }

  const handleClose = () => {
    if (videoRef.current) stopCamera(videoRef.current)
    setStatus('idle')
    setError(null)
    onClose()
  }

  if (!show) return null

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--neon-blue)' }}>{title}</h3>
          <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        <video ref={videoRef} style={videoStyle} playsInline muted />

        {status === 'starting' && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Loader2 size={18} className="spin" />
            {startingLabel}
          </p>
        )}
        {status === 'error' && (
          <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {closeLabel}
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={status !== 'ready'}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: status === 'ready' ? 'var(--neon-blue)' : 'rgba(0, 212, 255, 0.4)',
              color: '#000',
              cursor: status === 'ready' ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            {status === 'capturing' ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
            {status === 'capturing' ? '…' : captureLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
