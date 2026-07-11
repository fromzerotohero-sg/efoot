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
import DailySpinWidget from '@/components/DailySpinWidget'
import { isPrelaunchPublicPath } from '@/lib/prelaunchRoutes'
import { useSidebar } from '@/components/SidebarContext'

export default function AppLayoutShell({ children }) {
  const pathname = usePathname()
  const { isOpen: sidebarOpen } = useSidebar()
  const isPublicPath = isPrelaunchPublicPath(pathname || '/')

  if (isPublicPath) {
    return <PrelaunchGate>{children}</PrelaunchGate>
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <SidebarNew />

        <div
          className={`flex-1 flex flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}
          style={{
            paddingBottom: 'var(--bottom-nav-height, 0px)'
          }}
        >
          <TopBar />

          <main
            className="flex-1 overflow-y-auto"
            style={{
              paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
            }}
          >
            <PrelaunchGate>{children}</PrelaunchGate>
            <div className="lg:hidden" style={{ height: '20px' }} />
          </main>
        </div>
      </div>

      <BottomNavigation />
      <DailySpinWidget />
      <InstallAppPrompt />
      <LiveCoachLauncher showLauncherButton={false} />
      <AssistantChat mode="popup" />
    </>
  )
}
