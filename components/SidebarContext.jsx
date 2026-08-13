'use client'

import React from 'react'

const SidebarContext = React.createContext(null)

const DESKTOP_MEDIA = '(min-width: 1024px)'
const STORAGE_KEY = 'efoot_sidebar_open_v1'

function readStoredDesktopOpen() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === '0' || stored === '1') return stored === '1'
  } catch {
    /* ignore */
  }
  return null
}

function readInitialSidebarOpen() {
  if (typeof window === 'undefined') return false
  // UX V2: la persistenza e valida solo su desktop. Sotto i 1024px il drawer
  // resta chiuso di default (tablet = rail compatta, mobile = drawer via avatar).
  if (!window.matchMedia(DESKTOP_MEDIA).matches) return false
  const stored = readStoredDesktopOpen()
  return stored === null ? true : stored
}

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(readInitialSidebarOpen)

  // Cambio breakpoint: scendendo sotto desktop il drawer si chiude sempre;
  // tornando su desktop si ripristina la preferenza desktop persistita (default: aperta).
  React.useEffect(() => {
    const mql = window.matchMedia(DESKTOP_MEDIA)
    const onBreakpointChange = (e) => {
      if (e.matches) {
        const stored = readStoredDesktopOpen()
        setIsOpen(stored === null ? true : stored)
      } else {
        setIsOpen(false)
      }
    }
    mql.addEventListener('change', onBreakpointChange)
    return () => mql.removeEventListener('change', onBreakpointChange)
  }, [])

  // Persiste la preferenza solo su desktop: aprire/chiudere il drawer su
  // tablet/mobile non deve sovrascrivere la preferenza desktop salvata.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia(DESKTOP_MEDIA).matches) return
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
