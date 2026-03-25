'use client'

import React, { useCallback, useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { Compass, Sparkles } from 'lucide-react'
import { isEnabled } from '@/lib/featureFlags'
import { getTourSteps, TOUR_IDS } from '@/lib/guideTours'

const PAGES_WITH_TOUR = ['/', '/gestione-formazione', '/match/new', '/guida', '/impostazioni-profilo', '/contromisure-pre-partita', '/allenatori', '/classifica', '/gestione-profilo']

function hasTourForPath(pathname) {
  const base = (pathname || '/').replace(/\/$/, '') || '/'
  if (base === '/') return true
  return PAGES_WITH_TOUR.some((p) => p !== '/' && base.startsWith(p))
}

/**
 * Filtra gli step che puntano a elementi effettivamente presenti nel DOM
 * @param {Array} steps 
 * @returns {Array}
 */
function filterExistingSteps(steps) {
  if (typeof document === 'undefined') return steps
  
  return steps.filter((s) => {
    try {
      const element = document.querySelector(s.element)
      // Se lo step è opzionale e l'elemento non esiste, lo escludiamo
      if (s.optional && !element) return false
      // Se non è opzionale, lo includiamo comunque (driver.js gestirà l'errore)
      return true
    } catch {
      return false
    }
  })
}

/**
 * Attende che un elemento appaia nel DOM (per elementi renderizzati asincronamente)
 * @param {string} selector 
 * @param {number} timeout 
 * @returns {Promise<boolean>}
 */
async function waitForElement(selector, timeout = 2000) {
  if (typeof document === 'undefined') return false
  
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    if (document.querySelector(selector)) return true
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}

export default function GuideTour() {
  const pathname = usePathname()
  const { t, lang } = useTranslation()
  const [noTourMsg, setNoTourMsg] = useState(null)
  const [running, setRunning] = useState(false)
  const [hasNewGuide, setHasNewGuide] = useState(false)
  const driverRef = useRef(null)

  // Controlla feature flag al mount
  useEffect(() => {
    setHasNewGuide(isEnabled('NEW_GUIDE_SYSTEM'))
  }, [])

  const startTour = useCallback(async () => {
    if (running) return
    
    console.log('[GuideTour] Starting tour... NEW_GUIDE_SYSTEM:', hasNewGuide)
    
    // Ottieni gli step per la pagina corrente
    const steps = getTourSteps(pathname || '/', t, { includeOptional: false })
    console.log('[GuideTour] Steps found:', steps.length)
    
    // Attendi che gli elementi siano nel DOM (utile per componenti asincroni)
    await Promise.all(
      steps.map(s => waitForElement(s.element, 1000))
    )
    
    // Filtra solo gli step che esistono davvero
    const filtered = filterExistingSteps(steps)
    console.log('[GuideTour] Steps after filtering:', filtered.length)

    if (filtered.length === 0) {
      setNoTourMsg(t('tourNoTour'))
      return
    }

    setRunning(true)
    try {
      const { driver } = await import('driver.js')
      
      // Configurazione base
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
        // Callback per ogni step - animazioni disabilitate temporaneamente
        onHighlighted: (element, step, options) => {
          // Primo step: cambia testo bottone in "Inizia"
          if (options.state.activeIndex === 0) {
            const nextBtn = document.querySelector('.driver-popover-next-btn')
            if (nextBtn) nextBtn.textContent = t('tourStart') || 'Inizia'
          }
        }
      }
      
      // Se NEW_GUIDE_SYSTEM è abilitato, usa configurazione avanzata
      if (hasNewGuide) {
        driverConfig.animate = true
        driverConfig.smoothScroll = true
      }
      
      const driverObj = driver(driverConfig)
      driverRef.current = driverObj
      driverObj.drive()
      
    } catch (e) {
      console.error('[GuideTour]', e)
      setRunning(false)
    }
  }, [pathname, t, running, hasNewGuide])

  // Cleanup quando il componente si smonta
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
      }
    }
  }, [])

  useEffect(() => {
    if (!noTourMsg) return
    const tid = setTimeout(() => setNoTourMsg(null), 3000)
    return () => clearTimeout(tid)
  }, [noTourMsg])

  const showLauncher = pathname && pathname !== '/login' && hasTourForPath(pathname)
  if (!showLauncher) return null

  return (
    <>
      <button
        type="button"
        onClick={startTour}
        disabled={running}
        aria-label={t('tourShowMeHow')}
        className="guide-tour-launcher"
        title={t('tourShowMeHow')}
      >
        {hasNewGuide ? (
          <Sparkles size={20} strokeWidth={2} aria-hidden className={running ? 'animate-spin' : ''} />
        ) : (
          <Compass size={20} strokeWidth={2} aria-hidden className={running ? 'animate-spin' : ''} />
        )}
        <span 
          className="guide-tour-launcher-label hidden lg:inline"
          style={{ 
            display: 'inline',
            marginLeft: '6px'
          }}
        >
          {running ? (lang === 'en' ? 'Loading...' : 'Caricamento...') : t('tourShowMeHow')}
        </span>
        <style jsx>{`
          @media (max-width: 1023px) {
            span {
              display: none !important;
            }
          }
        `}</style>
        {/* Badge NEW rimosso temporaneamente per evitare conflitti UI */}
      </button>
      
      {noTourMsg && (
        <div role="status" className="guide-tour-notice">
          {noTourMsg}
        </div>
      )}
      
      {/* Stili CSS per effetti aggiuntivi */}
      <style jsx global>{`
        .tour-highlight-pulse {
          animation: tourPulse 2s ease-in-out;
        }
        
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4); }
          50% { box-shadow: 0 0 20px 10px rgba(0, 212, 255, 0.2); }
        }
        
        .driver-popover-neon {
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%) !important;
          border: 1px solid rgba(0, 212, 255, 0.3) !important;
          box-shadow: 0 0 30px rgba(0, 212, 255, 0.2), 0 10px 40px rgba(0, 0, 0, 0.4) !important;
          border-radius: 12px !important;
        }
        
        .driver-popover-neon .driver-popover-title {
          color: #fff !important;
          font-weight: 600 !important;
        }
        
        .driver-popover-neon .driver-popover-description {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        
        .driver-popover-neon .driver-popover-progress-text {
          color: rgba(0, 212, 255, 0.8) !important;
        }
        
        .driver-popover-neon .driver-popover-navigation-btns button {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)) !important;
          border: none !important;
          border-radius: 6px !important;
          color: white !important;
          padding: 8px 16px !important;
          transition: all 0.2s !important;
        }
        
        .driver-popover-neon .driver-popover-navigation-btns button:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3) !important;
        }
        
        .driver-popover-neon .driver-popover-close-btn {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .driver-popover-neon .driver-popover-close-btn:hover {
          color: white !important;
        }
        
        .driver-overlay {
          backdrop-filter: blur(2px) !important;
        }
      `}</style>
    </>
  )
}

// Esporta anche i TOUR_IDS per uso esterno
export { TOUR_IDS }
