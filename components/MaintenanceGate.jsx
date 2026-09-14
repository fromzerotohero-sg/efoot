'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isMaintenancePublicPath } from '@/lib/maintenanceRoutes'

// Stato verificato UNA VOLTA per sessione JS: al cambio pagina si riusa il
// risultato senza rifare la fetch (niente spinner a tutto schermo a ogni
// navigazione). Si ri-verifica solo sulla pagina /maintenance (dove lo stato
// puo cambiare tramite bypass) e sulla prima navigazione dopo averla lasciata.
let maintenanceStatusCache = null

export default function MaintenanceGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [state, setState] = React.useState({ checking: true, allowRender: false })
  const prevPathnameRef = React.useRef(null)

  React.useEffect(() => {
    let mounted = true
    const isPublic = isMaintenancePublicPath(pathname || '/')
    const isMaintenancePage = pathname === '/maintenance'

    const applyDecision = (payload) => {
      const maintenanceEnabled = Boolean(payload?.maintenanceEnabled)
      const hasBypass = Boolean(payload?.hasBypass)

      if (!maintenanceEnabled) {
        if (isMaintenancePage) {
          setState({ checking: true, allowRender: false })
          router.replace('/')
          return
        }

        setState({ checking: false, allowRender: true })
        return
      }

      if (isMaintenancePage) {
        if (hasBypass) {
          setState({ checking: true, allowRender: false })
          router.replace('/')
          return
        }

        setState({ checking: false, allowRender: true })
        return
      }

      if (!isPublic && !hasBypass) {
        setState({ checking: true, allowRender: false })
        router.replace('/maintenance')
        return
      }

      setState({ checking: false, allowRender: true })
    }

    const needsFreshCheck =
      !maintenanceStatusCache || isMaintenancePage || prevPathnameRef.current === '/maintenance'
    prevPathnameRef.current = pathname || '/'

    if (!needsFreshCheck) {
      applyDecision(maintenanceStatusCache)
      return
    }

    const run = async () => {
      try {
        const response = await fetch('/api/maintenance/status', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const payload = await response.json().catch(() => ({}))
        maintenanceStatusCache = payload

        if (!mounted) return

        applyDecision(payload)
      } catch (error) {
        console.error('[MaintenanceGate] Failed to check maintenance status:', error)
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
        padding: '24px',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '32px',
          background: 'rgba(5, 8, 20, 0.8)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '16px',
          maxWidth: '360px',
          width: '100%',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0, 212, 255, 0.12)',
            borderTopColor: 'var(--primary-cyan)',
            borderRadius: '50%',
            animation: 'maintenanceGateSpin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>Verifica accesso...</h2>
          <p style={{ margin: 0, color: 'rgba(0, 212, 255, 0.7)', fontSize: '14px' }}>
            Controllo stato piattaforma.
          </p>
        </div>

        <style jsx>{`
          @keyframes maintenanceGateSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return children
}
