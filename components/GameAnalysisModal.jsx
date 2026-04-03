'use client'

import React, { useState, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, X, Upload, Camera, Image as ImageIcon, RefreshCw, CheckCircle2 } from 'lucide-react'
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/uploadConstants'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'

const SLOTS = [
  { key: 'slot1', labelKey: 'gameAnalysisSlot1', descKey: 'gameAnalysisSlot1Desc' },
  { key: 'slot2', labelKey: 'gameAnalysisSlot2', descKey: 'gameAnalysisSlot2Desc' }
]

const MAX_DATAURL_BYTES = 1.8 * 1024 * 1024 // ~1.8MB per immagine per stare sotto limite body con 2 foto
const RESIZE_MAX_WIDTH = 1200

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1001,
  padding: 'clamp(16px, 4vw, 24px)',
  boxSizing: 'border-box'
}

const boxStyle = {
  maxWidth: 'min(520px, calc(100vw - 32px))',
  width: '100%',
  minWidth: 0,
  maxHeight: 'calc(100vh - 100px)',
  overflowY: 'auto',
  padding: 'clamp(20px, 4vw, 32px)',
  paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
  background: '#050814',
  border: '2px solid #00d4ff',
  borderRadius: '20px',
  boxShadow: '0 0 10px #00d4ff, 0 0 30px rgba(0, 212, 255, 0.4)',
  boxSizing: 'border-box',
  position: 'relative'
}

export default function GameAnalysisModal({ show, onClose, onSuccess, lastCaptureDate = null }) {
  const { t, lang } = useTranslation()
  const [slot1, setSlot1] = useState(null) // { file, dataUrl, name }
  const [slot2, setSlot2] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const inputRef1 = useRef(null)
  const inputRef2 = useRef(null)

  const getSlot = (key) => (key === 'slot1' ? slot1 : slot2)
  const setSlot = (key, value) => (key === 'slot1' ? setSlot1(value) : setSlot2(value))

  const processImageFile = async (file, key) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      // Continua: proviamo ad ottimizzare lato client prima di bloccare l'utente
    }
    setError(null)
    try {
      const optimized = await optimizeImageFile(file, {
        maxBytes: MAX_DATAURL_BYTES,
        maxLongSide: RESIZE_MAX_WIDTH
      })
      const dataUrl = optimized.dataUrl
      setSlot(key, { file, dataUrl, name: file.name || 'camera.jpg' })
    } catch (err) {
      console.error('[GameAnalysisModal] image optimization error:', err)
      setError(t('imageTooLarge'))
    }
  }

  const handleFileSelect = async (e, key) => {
    const file = e.target.files?.[0]
    if (file) await processImageFile(file, key)
    e.target.value = ''
  }

  const removeSlot = (key) => {
    setSlot(key, null)
    setError(null)
    if (key === 'slot1' && inputRef1.current) inputRef1.current.value = ''
    if (key === 'slot2' && inputRef2.current) inputRef2.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const urls = [slot1?.dataUrl, slot2?.dataUrl].filter(Boolean)
    if (urls.length === 0) {
      setError(t('gameAnalysisNoImage'))
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        setError(t('gameAnalysisError'))
        setLoading(false)
        return
      }

      const res = await fetch('/api/extract-game-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrls: urls })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setSuccess(true)
        try {
          if (typeof onSuccess === 'function') await Promise.resolve(onSuccess())
        } catch (_) { /* non bloccare */ }
        try {
          await fetch('/api/refresh-diagnostic', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept-Language': lang === 'en' ? 'en' : 'it'
            }
          })
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
            window.dispatchEvent(new CustomEvent('diagnostic-updated'))
          }
        } catch (_) { /* non bloccare */ }
        setTimeout(() => {
          setSuccess(false)
          setSlot1(null)
          setSlot2(null)
          onClose?.()
        }, 1500)
      } else {
        setError(data.error || t('gameAnalysisError'))
      }
    } catch (err) {
      setError(t('gameAnalysisError'))
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  const hasAny = !!slot1 || !!slot2
  const hasBoth = !!slot1 && !!slot2

  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose?.()}
    >
      <div className="neon-card" style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={22} style={{ color: 'var(--neon-blue)', flexShrink: 0 }} />
            {t('gameAnalysisTitle')}
          </h2>
          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: loading ? 'not-allowed' : 'pointer', padding: '8px', opacity: loading ? 0.5 : 1, minWidth: 44, minHeight: 44 }}
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '20px', textAlign: 'center', lineHeight: 1.5 }}>
          {t('gameAnalysisUploadHint')}
        </div>
        {lastCaptureDate && (
          <div style={{ fontSize: '13px', color: 'var(--neon-green)', marginBottom: '16px', textAlign: 'center' }}>
            {t('gameAnalysisLastCapture')}: {lastCaptureDate}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Due slot distinti come gestione rosa: il cliente vede sempre quale ha caricato e quale manca */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {SLOTS.map(({ key, labelKey, descKey }) => {
              const value = getSlot(key)
              const ref = key === 'slot1' ? inputRef1 : inputRef2
              const color = 'var(--neon-blue)'
              return (
                <div
                  key={key}
                  style={{
                    padding: '16px',
                    background: value ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0, 212, 255, 0.05)',
                    border: `1px solid ${value ? 'rgba(34, 197, 94, 0.35)' : 'rgba(0, 212, 255, 0.2)'}`,
                    borderRadius: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {value ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <BarChart3 size={20} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--neon-cyan)', textShadow: '0 0 10px rgba(0,212,255,0.5)' }}>{t(labelKey)}</span>
                          <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--neon-cyan)', color: '#000', borderRadius: '4px', fontWeight: 700, boxShadow: '0 0 10px rgba(0,212,255,0.5)' }}>✓</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeSlot(key) }}
                          disabled={loading}
                          style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ff6b6b', padding: '6px 12px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 0 10px rgba(239,68,68,0.2)' }}
                        >
                          ✕ Rimuovi
                        </button>
                      </div>
                      <img src={value.dataUrl} alt={t(labelKey)} style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px', border: '1px solid rgba(0,212,255,0.3)' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{t('uploadedPhotoLabel')}</span>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', flexWrap: 'wrap' }}>
                        <label style={{ 
                          display: 'inline-flex', 
                          flex: '1 1 180px',
                          cursor: loading ? 'not-allowed' : 'pointer', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '10px', 
                          padding: '12px 20px', 
                          border: `1px solid ${color}`, 
                          borderRadius: '12px', 
                          background: 'linear-gradient(145deg, rgba(0,212,255,0.1) 0%, rgba(0,161,166,0.05) 100%)',
                          boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
                          transition: 'all 0.3s ease'
                        }}>
                          <input type="file" accept="image/*" ref={ref} style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, key)} disabled={loading} />
                          <Upload size={20} style={{ color, flexShrink: 0, filter: 'drop-shadow(0 0 5px rgba(0,212,255,0.5))' }} />
                          <span style={{ fontSize: '15px', fontWeight: 600, color, textShadow: '0 0 10px rgba(0,212,255,0.3)' }}>{t('gameAnalysisChooseFile')}</span>
                        </label>
                        <label style={{ 
                          display: 'inline-flex',
                          flex: '1 1 180px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          padding: '12px 20px',
                          border: `1px solid ${color}`,
                          borderRadius: '12px',
                          background: 'transparent',
                          transition: 'all 0.3s ease'
                        }}>
                          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, key)} disabled={loading} />
                          <Camera size={20} style={{ color, flexShrink: 0, filter: 'drop-shadow(0 0 5px rgba(0,212,255,0.35))' }} />
                          <span style={{ fontSize: '15px', fontWeight: 600, color }}>{t('cameraCaptureTitle')}</span>
                        </label>
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, width: '100%' }}>Non caricata</span>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color, marginBottom: '4px', textShadow: '0 0 10px rgba(0,212,255,0.2)' }}>{t(labelKey)}</div>
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{t(descKey)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
              {error}
              {hasBoth && t('gameAnalysisRetryOne') && (
                <span style={{ display: 'block', marginTop: '8px', opacity: 0.95 }}>{t('gameAnalysisRetryOne')}</span>
              )}
            </p>
          )}
          {success && (
            <p style={{ color: 'var(--neon-green)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {t('gameAnalysisSuccess')}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
            <div style={{ marginRight: 'auto', fontSize: '13px', opacity: 0.7 }}>
              {!hasAny
                ? t('gameAnalysisNoImage')
                : <span style={{ color: 'var(--neon-green)' }}>{[slot1, slot2].filter(Boolean).length} / 2 {t('gameAnalysisScreensLabel')}</span>}
            </div>
            <button type="button" className="neon-button" onClick={onClose} disabled={loading} style={{ padding: '12px 24px', minHeight: 44 }}>
              {t('close')}
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={loading || !hasAny}
              style={{ padding: '12px 24px', minHeight: 44, opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  {t('gameAnalysisAnalyzing')}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {t('gameAnalysisUpload')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
