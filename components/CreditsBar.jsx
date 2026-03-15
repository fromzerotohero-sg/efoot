'use client'

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/lib/i18n'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { Zap, RefreshCw, AlertCircle, Info, ChevronDown, ExternalLink, Settings } from 'lucide-react'

const POPOVER_WIDTH = 360
const POPOVER_Z_INDEX = 10001

/**
 * Crediti AI – versione compatta: icona in barra utility, clic apre popover con dettaglio.
 * Popover renderizzato in portal (document.body) con z-index alto così resta sempre sopra
 * barra Conoscenza IA, Mostrami come e ogni altro contenuto. Posizionamento sotto il bottone.
 * Legge POST /api/credits/usage (Bearer). Doc: docs/SISTEMA_CREDITI_AI.md
 */
export default function CreditsBar() {
  const { t, lang } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [noSession, setNoSession] = useState(false)
  const [open, setOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState(null)
  const containerRef = useRef(null)
  const popoverRef = useRef(null)

  const fetchUsage = useCallback(async (signal) => {
    try {
      setError(null)
      setNoSession(false)
      
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        token = await getValidAccessToken()
      }
      
      if (signal?.aborted) return
      
      if (!token) {
        setNoSession(true)
        setLoading(false)
        return
      }
      
      const res = await fetch('/api/credits/usage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        cache: 'no-store',
        ...(signal && { signal })
      })
      if (signal?.aborted) return
      const payload = await safeJsonResponse(res, t('creditsError') || 'Error loading usage')
      if (signal?.aborted) return
      setData(payload)
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.error('[CreditsBar] Error:', err)
      if (!signal?.aborted) setError(err.message || t('creditsError'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ac = new AbortController()
    fetchUsage(ac.signal)
    const interval = setInterval(() => fetchUsage(ac.signal), 45 * 1000)
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchUsage(ac.signal) }
    const onCreditsConsumed = () => fetchUsage(ac.signal)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('credits-consumed', onCreditsConsumed)
    let authUnsub = null
    if (supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setNoSession(false)
          fetchUsage(ac.signal)
        }
      })
      authUnsub = data?.subscription
    }
    return () => {
      ac.abort()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('credits-consumed', onCreditsConsumed)
      authUnsub?.unsubscribe?.()
    }
  }, [fetchUsage])

  // Posizione popover: sotto il bottone, sempre in viewport; aggiornata su scroll/resize
  const updatePopoverPosition = useCallback(() => {
    if (!containerRef.current || typeof window === 'undefined') return
    const rect = containerRef.current.getBoundingClientRect()
    const gap = 8
    const maxLeft = Math.max(12, window.innerWidth - POPOVER_WIDTH - 12)
    const left = Math.max(12, Math.min(rect.right - POPOVER_WIDTH, maxLeft))
    const top = rect.bottom + gap
    setPopoverPosition({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPosition(null)
      return
    }
    updatePopoverPosition()
    window.addEventListener('scroll', updatePopoverPosition, true)
    window.addEventListener('resize', updatePopoverPosition)
    return () => {
      window.removeEventListener('scroll', updatePopoverPosition, true)
      window.removeEventListener('resize', updatePopoverPosition)
    }
  }, [open, updatePopoverPosition])

  // Chiudi popover su click fuori (bottone o popover) o Escape
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      const inTrigger = containerRef.current?.contains(e.target)
      const inPopover = popoverRef.current?.contains(e.target)
      if (!inTrigger && !inPopover) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const formatPeriod = (periodKey) => {
    if (!periodKey || periodKey.length < 7) return periodKey
    const [y, m] = periodKey.split('-')
    const monthIndex = parseInt(m, 10) - 1
    const date = new Date(parseInt(y, 10), monthIndex, 1)
    const locale = lang === 'en' ? 'en-GB' : 'it-IT'
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }

  const getBarColor = (percentUsed, overage) => {
    if (overage > 0) return '#FF9500'
    if (percentUsed >= 95) return '#FF3B30'
    if (percentUsed >= 75) return '#FF9500'
    return '#34C759'
  }

  if (noSession) return null

  const used = Number.isFinite(Number(data?.credits_used)) ? Number(data.credits_used) : 0
  const included = Number.isFinite(Number(data?.credits_included)) ? Number(data.credits_included) : 200
  const overage = Math.max(0, Number(data?.overage) || 0)
  const percentIncluded = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0
  const periodLabel = formatPeriod(data?.period_key)
  const barColor = data ? getBarColor(percentIncluded, overage) : '#00d4ff'

  const compactLabel = loading
    ? null
    : error
      ? t('creditsError') || 'Error'
      : `${included}`

  const triggerAriaLabel = open ? (t('creditsCloseAria') || (lang === 'en' ? 'Close credits' : 'Chiudi crediti')) : (t('creditsViewAria') || (lang === 'en' ? 'View AI credits' : 'Vedi crediti AI'))

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="neon-button"
        data-tour-id="tour-dashboard-credits"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={triggerAriaLabel}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
          padding: '8px 14px',
          fontSize: '14px'
        }}
      >
        {loading ? (
          <RefreshCw size={16} color="var(--primary-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
        ) : error ? (
          <AlertCircle size={16} color="var(--primary-orange)" />
        ) : (
          <Zap size={16} color={barColor} />
        )}
        {compactLabel != null && (
          <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{compactLabel}</span>
        )}
        <ChevronDown
          size={14}
          color="rgba(0, 212, 255, 0.5)"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease'
          }}
        />
      </button>

      {open && popoverPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t('creditsTitle')}
          style={{
            position: 'fixed',
            top: popoverPosition.top,
            left: popoverPosition.left,
            zIndex: POPOVER_Z_INDEX,
            width: `${Math.min(POPOVER_WIDTH, window.innerWidth - 24)}px`,
            maxHeight: 'min(85vh, 420px)',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            boxShadow: 'var(--shadow-lg)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {loading && !data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(0, 212, 255, 0.7)' }}>
              <RefreshCw size={18} color="var(--primary-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '14px' }}>{t('creditsLoading')}</span>
            </div>
          )}

          {error && !data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-orange)' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '14px' }}>{error}</span>
            </div>
          )}

          {data && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Zap size={18} color={getBarColor(percentIncluded, overage)} />
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--neon-cyan)' }}>{t('creditsTitle')}</h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(0, 212, 255, 0.7)', maxWidth: '320px' }}>
                    {t('creditsSubtitle')}
                  </p>
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(0, 212, 255, 0.5)', whiteSpace: 'nowrap' }}>
                  {t('creditsPeriod')}: {periodLabel}
                </div>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'rgba(0, 212, 255, 0.05)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative',
                  marginTop: '10px'
                }}
                role="progressbar"
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={included}
                aria-label={`${used} ${t('creditsUsed')} ${included} ${t('creditsIncluded')}`}
              >
                <div
                  style={{
                    width: `${percentIncluded}%`,
                    height: '100%',
                    backgroundColor: getBarColor(percentIncluded, overage),
                    transition: 'width 0.3s ease, background-color 0.15s ease',
                    borderRadius: '4px 0 0 4px'
                  }}
                />
              </div>

              {overage > 0 && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: 'rgba(0, 161, 166, 0.05)',
                    border: '1px solid rgba(0, 161, 166, 0.2)',
                    fontSize: '13px',
                    color: 'var(--primary-orange)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{t('creditsOverageHint')}</span>
                </div>
              )}

              {/* Link a gestione crediti */}
              <a
                href="https://home.fromzerotohero.io/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--neon-cyan)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'
                }}
              >
                <Settings size={16} />
                {lang === 'en' ? 'Manage Credits' : 'Gestisci Crediti'}
                <ExternalLink size={14} style={{ opacity: 0.7 }} />
              </a>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
