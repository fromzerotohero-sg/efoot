'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { Compass } from 'lucide-react'
import { getTourSteps } from '@/lib/guideTours'

const PAGES_WITH_TOUR = ['/', '/gestione-formazione', '/match/new', '/guida', '/impostazioni-profilo', '/contromisure-pre-partita', '/allenatori', '/classifica', '/gestione-profilo']

function hasTourForPath(pathname) {
  const base = (pathname || '/').replace(/\/$/, '') || '/'
  if (base === '/') return true
  return PAGES_WITH_TOUR.some((p) => p !== '/' && base.startsWith(p))
}

function filterExistingSteps(steps) {
  if (typeof document === 'undefined') return steps
  return steps.filter((s) => {
    try {
      return document.querySelector(s.element)
    } catch {
      return false
    }
  })
}

export default function GuideTour() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [noTourMsg, setNoTourMsg] = useState(null)
  const [running, setRunning] = useState(false)

  const startTour = useCallback(async () => {
    if (running) return
    const steps = getTourSteps(pathname || '/', t)
    const filtered = filterExistingSteps(steps)

    if (filtered.length === 0) {
      setNoTourMsg(t('tourNoTour'))
      return
    }

    setRunning(true)
    try {
      const { driver } = await import('driver.js')
      const driverObj = driver({
        showProgress: true,
        steps: filtered,
        nextBtnText: t('tourNext'),
        prevBtnText: t('tourPrev'),
        doneBtnText: t('tourFinish'),
        progressText: t('tourProgress'),
        overlayColor: 'rgba(5, 8, 21, 0.88)',
        popoverClass: 'driver-popover-neon',
        onDestroyed: () => setRunning(false),
      })
      driverObj.drive()
    } catch (e) {
      console.error('[GuideTour]', e)
      setRunning(false)
    }
  }, [pathname, t, running])

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
      >
        <Compass size={20} strokeWidth={2} aria-hidden />
        <span className="guide-tour-launcher-label">{t('tourShowMeHow')}</span>
      </button>
      {noTourMsg && (
        <div role="status" className="guide-tour-notice">
          {noTourMsg}
        </div>
      )}
    </>
  )
}
