'use client'

import React from 'react'

const SidebarContext = React.createContext(null)

const DESKTOP_MEDIA = '(min-width: 1024px)'
const STORAGE_KEY = 'efoot_sidebar_open_v1'

function readInitialSidebarOpen() {
  if (typeof window === 'undefined') return false
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === '0' || stored === '1') return stored === '1'
  } catch {
    /* ignore */
  }
  return window.matchMedia(DESKTOP_MEDIA).matches
}

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(readInitialSidebarOpen)

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [isOpen])

  const toggleSidebar = React.useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const value = React.useMemo(
    () => ({ isOpen, setIsOpen, toggleSidebar }),
    [isOpen, toggleSidebar]
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return ctx
}
