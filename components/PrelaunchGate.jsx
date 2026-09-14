'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { isPrelaunchPublicPath } from '@/lib/prelaunchRoutes'

// Stato verificato UNA VOLTA per sessione JS: al cambio pagina si riusa il
// risultato senza rifare la fetch (niente spinner a tutto schermo a ogni
// navigazione). Si ri-verifica solo sulla pagina /access (dove lo stato puo
// cambiare tramite codice di accesso) e sulla prima navigazione dopo averla lasciata.
let prelaunchStatusCache = null

export default function PrelaunchGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const [state, setState] = React.useState({ checking: true, allowRender: false })
  const prevPathnameRef = React.useRef(null)

  React.useEffect(() => {
    let mounted = true
    const isPublic = isPrelaunchPublicPath(pathname || '/')
    const isAccessPage = pathname === '/access'

    const applyDecision = (payload) => {
      const gateEnabled = Boolean(payload?.gateEnabled)
      const hasAccess = Boolean(payload?.hasAccess)

      if (!gateEnabled) {
        if (isAccessPage) {
          setState({ checking: true, allowRender: false })
          router.replace('/')
          return
        }

        setState({ checking: false, allowRender: true })
        return
      }

      if (isAccessPage) {
        if (hasAccess) {
          setState({ checking: true, allowRender: false })
          router.replace('/')
          return
        }

        setState({ checking: false, allowRender: true })
        return
      }

      if (!isPublic && !hasAccess) {
        setState({ checking: true, allowRender: false })
        router.replace('/access')
        return
      }

      setState({ checking: false, allowRender: true })
    }

    const needsFreshCheck =
      !prelaunchStatusCache || isAccessPage || prevPathnameRef.current === '/access'
    prevPathnameRef.current = pathname || '/'

    if (!needsFreshCheck) {
      applyDecision(prelaunchStatusCache)
      return
    }

    const run = async () => {
      try {
        const response = await fetch('/api/prelaunch/status', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const payload = await response.json().catch(() => ({}))
        prelaunchStatusCache = payload

        if (!mounted) return

        applyDecision(payload)
      } catch (error) {
        console.error('[PrelaunchGate] Failed to check gate status:', error)
        if (!mounted) return

        setState({ checking: false, allowRender: true })
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [pathname, router])

  if (state.checking || !state.allowRender) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#03050c',
        color: '#FFFFFF',
        padding: '24px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '32px',
          background: 'rgba(5, 8, 20, 0.8)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '16px',
          maxWidth: '360px',
          width: '100%'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0, 212, 255, 0.12)',
            borderTopColor: 'var(--primary-cyan)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>{t('prelaunchGateCheckingTitle')}</h2>
          <p style={{ margin: 0, color: 'rgba(0, 212, 255, 0.7)', fontSize: '14px' }}>
            {t('prelaunchGateCheckingText')}
          </p>
        </div>

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return children
}
