'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import SidebarNew from '@/components/SidebarNew'
import TopBar from '@/components/TopBar'
import BottomNavigation from '@/components/BottomNavigation'
import LiveCoachLauncher from '@/components/LiveCoachLauncher'
import InstallAppPrompt from '@/components/InstallAppPrompt'
import PrelaunchGate from '@/components/PrelaunchGate'
import MaintenanceGate from '@/components/MaintenanceGate'
import { isPrelaunchPublicPath } from '@/lib/prelaunchRoutes'
import { isMaintenancePublicPath } from '@/lib/maintenanceRoutes'
import { useSidebar } from '@/components/SidebarContext'

export default function AppLayoutShell({ children, showInstallPrompt = true, showStagingBadge = false }) {
  const pathname = usePathname()
  const { isOpen: sidebarOpen } = useSidebar()
  const isPublicPath =
    isPrelaunchPublicPath(pathname || '/') || isMaintenancePublicPath(pathname || '/')

  if (isPublicPath) {
    return (
      <MaintenanceGate>
        <PrelaunchGate>{children}</PrelaunchGate>
      </MaintenanceGate>
    )
  }

  return (
    <MaintenanceGate>
    <>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--shell-bg)' }}>
        <SidebarNew />

        <div
          className={`shell-content flex-1 flex flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${sidebarOpen ? 'sidebar-open' : ''}`}
          style={{ paddingBottom: '0px' }}
        >
          <TopBar showInstallPrompt={showInstallPrompt} />

          <main
            className="flex-1 overflow-y-auto shell-main"
            style={{ background: 'var(--shell-bg)' }}
          >
            <PrelaunchGate>{children}</PrelaunchGate>
          </main>
        </div>
      </div>

      <BottomNavigation />
      {showInstallPrompt && <InstallAppPrompt />}
      <LiveCoachLauncher showLauncherButton={false} />
      {showStagingBadge && (
        <div
          aria-hidden="true"
          className="staging-badge"
          style={{
            position: 'fixed',
            left: 12,
            zIndex: 90,
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color: 'rgba(61, 220, 151, 0.75)',
            background: 'rgba(10, 17, 23, 0.72)',
            border: '1px solid rgba(61, 220, 151, 0.25)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          STAGING · UX V2
        </div>
      )}

      <style jsx>{`
        .shell-main {
          padding-bottom: 28px;
          overscroll-behavior-y: contain;
        }

        @media (min-width: 1024px) {
          .shell-content.sidebar-open {
            margin-left: 196px;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .shell-content {
            margin-left: 64px;
          }
        }

        .staging-badge {
          bottom: calc(10px + env(safe-area-inset-bottom, 0px));
        }

        @media (max-width: 767px) {
          .shell-main {
            padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
            scroll-padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
          }
          .staging-badge {
            bottom: calc(82px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>
    </>
    </MaintenanceGate>
  )
}
