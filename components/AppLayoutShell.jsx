'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import SidebarNew from '@/components/SidebarNew'
import TopBar from '@/components/TopBar'
import BottomNavigation from '@/components/BottomNavigation'
import AssistantChat from '@/components/AssistantChat'
import LiveCoachLauncher from '@/components/LiveCoachLauncher'
import InstallAppPrompt from '@/components/InstallAppPrompt'
import PrelaunchGate from '@/components/PrelaunchGate'
import MaintenanceGate from '@/components/MaintenanceGate'
import DailySpinWidget from '@/components/DailySpinWidget'
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
      <div className="flex h-screen overflow-hidden" style={{ background: '#F9F6F1' }}>
        <SidebarNew />

        <div
          className={`shell-content flex-1 flex flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${sidebarOpen ? 'sidebar-open' : ''}`}
          style={{
            paddingBottom: 'var(--bottom-nav-height, 0px)'
          }}
        >
          <TopBar showInstallPrompt={showInstallPrompt} />

          <main
            className="flex-1 overflow-y-auto"
            style={{
              paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
              background: '#F9F6F1'
            }}
          >
            <PrelaunchGate>{children}</PrelaunchGate>
            <div className="lg:hidden" style={{ height: '20px' }} />
          </main>
        </div>
      </div>

      <BottomNavigation />
      <DailySpinWidget />
      {showInstallPrompt && <InstallAppPrompt />}
      <LiveCoachLauncher showLauncherButton={false} />
      <AssistantChat mode="popup" />
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
            color: '#6B6B6B',
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(0,0,0,0.08)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          STAGING · UX V2
        </div>
      )}

      <style jsx>{`
        @media (min-width: 1024px) {
          .shell-content.sidebar-open {
            margin-left: 196px;
          }
        }

        /* Rail tablet (768-1023px): spazio per la rail compatta, niente sidebar larga permanente */
        @media (min-width: 768px) and (max-width: 1023px) {
          .shell-content {
            margin-left: 64px;
          }
        }

        /* Badge staging: sopra la bottom nav su mobile, senza coprirla */
        .staging-badge {
          bottom: calc(10px + env(safe-area-inset-bottom, 0px));
        }
        @media (max-width: 767px) {
          .staging-badge {
            bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 10px);
          }
        }
      `}</style>
    </>
    </MaintenanceGate>
  )
}
