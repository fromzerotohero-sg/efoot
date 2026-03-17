'use client'

import React from 'react'

const SidebarContext = React.createContext(null)

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false)

  const value = React.useMemo(() => ({ isOpen, setIsOpen }), [isOpen])

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return ctx
}

