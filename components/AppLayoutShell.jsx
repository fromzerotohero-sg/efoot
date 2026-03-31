'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import SidebarNew from '@/components/SidebarNew'
import TopBar from '@/components/TopBar'
import BottomNavigation from '@/components/BottomNavigation'
import AssistantChat from '@/components/AssistantChat'
import PrelaunchGate from '@/components/PrelaunchGate'
import { isPrelaunchPublicPath } from '@/lib/prelaunchRoutes'

export default function AppLayoutShell({ children }) {
  const pathname = usePathname()
  const isPublicPath = isPrelaunchPublicPath(pathname || '/')

  if (isPublicPath) {
    return <PrelaunchGate>{children}</PrelaunchGate>
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <SidebarNew />

        <div
          className="flex-1 flex flex-col lg:ml-64 overflow-hidden"
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
      <AssistantChat mode="popup" />
    </>
  )
}
