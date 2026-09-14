'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { Compass, Sparkles } from 'lucide-react'
import { isEnabled } from '@/lib/featureFlags'
import { getTourSteps } from '@/lib/guideTours'

const PAGES_WITH_TOUR = ['/', '/gestione-formazione', '/match/new', '/guida', '/impostazioni-profilo', '/allenatori', '/gestione-profilo']

function hasTourForPath(pathname) {
  const base = (pathname || '/').replace(/\/$/, '') || '/'
  if (base === '/') return true
  return PAGES_WITH_TOUR.some((p) => p !== '/' && base.startsWith(p))
}

function filterExistingSteps(steps) {
  if (typeof document === 'undefined') return steps
  return steps.filter((s) => {
    try {
      const element = document.querySelector(s.element)
      if (s.optional && !element) return false
      return true
    } catch {
      return false
    }
  })
}

async function waitForElement(selector, timeout = 2000) {
  if (typeof document === 'undefined') return false
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    if (document.querySelector(selector)) return true
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}

export default function SidebarGuideTour({ onClick }) {
  const pathname = usePathname()
  const { t, lang } = useTranslation()
  const [running, setRunning] = useState(false)
  const [hasNewGuide, setHasNewGuide] = useState(false)
  const driverRef = useRef(null)

  useEffect(() => {
    setHasNewGuide(isEnabled('NEW_GUIDE_SYSTEM'))
  }, [])

  const startTour = useCallback(async () => {
    if (running) return
    
    // Chiudi la sidebar prima di avviare il tour
    if (onClick) onClick()
    
    // Piccolo delay per permettere alla sidebar di chiudersi
    await new Promise(r => setTimeout(r, 300))
    
    const steps = getTourSteps(pathname || '/', t, { includeOptional: false })
    await Promise.all(steps.map(s => waitForElement(s.element, 1000)))
    const filtered = filterExistingSteps(steps)

    if (filtered.length === 0) {
      return
    }

    setRunning(true)
    try {
      const { driver } = await import('driver.js')
      
      const driverConfig = {
        showProgress: true,
        steps: filtered,
        nextBtnText: t('tourNext'),
        prevBtnText: t('tourPrev'),
        doneBtnText: t('tourFinish'),
        progressText: t('tourProgress'),
        overlayColor: 'rgba(5, 8, 21, 0.85)',
        popoverClass: 'driver-popover-neon',
        allowClose: true,
        overlayClickBehavior: 'close',
        onDestroyed: () => {
          setRunning(false)
          driverRef.current = null
        },
        onHighlighted: (element, step, options) => {
          if (options.state.activeIndex === 0) {
            const nextBtn = document.querySelector('.driver-popover-next-btn')
            if (nextBtn) nextBtn.textContent = t('tourStart') || 'Inizia'
          }
        }
      }
      
      if (hasNewGuide) {
        driverConfig.animate = true
        driverConfig.smoothScroll = true
      }
      
      const driverObj = driver(driverConfig)
      driverRef.current = driverObj
      driverObj.drive()
      
    } catch (e) {
      console.error('[SidebarGuideTour]', e)
      setRunning(false)
    }
  }, [pathname, t, running, hasNewGuide, onClick])

  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
      }
    }
  }, [])

  const showLauncher = pathname && pathname !== '/login' && hasTourForPath(pathname)
  if (!showLauncher) return null

  return (
    <button
      type="button"
      onClick={startTour}
      disabled={running}
      aria-label={t('tourShowMeHow')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 600,
        background: 'transparent',
        color: 'rgba(255, 255, 255, 0.6)',
        border: '1px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        textAlign: 'left'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
        e.currentTarget.style.color = '#00d4ff'
        e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      {hasNewGuide ? (
        <Sparkles size={18} style={{ color: '#00d4ff' }} />
      ) : (
        <Compass size={18} style={{ color: '#00d4ff' }} />
      )}
      <span>{running ? (lang === 'en' ? 'Loading...' : 'Caricamento...') : t('tourShowMeHow')}</span>
    </button>
  )
}
