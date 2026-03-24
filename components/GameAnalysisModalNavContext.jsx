'use client'

import React from 'react'

/**
 * Sincronizza la bottom nav con il modal "Statistiche di gioco" sulla dashboard:
 * quando il modal è aperto, evidenziare Stat e non Dashboard (stesso pathname `/`).
 */
const GameAnalysisModalNavContext = React.createContext({
  isOpen: false,
  setIsOpen: () => {}
})

export function GameAnalysisModalNavProvider({ children }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const value = React.useMemo(() => ({ isOpen, setIsOpen }), [isOpen])
  return (
    <GameAnalysisModalNavContext.Provider value={value}>
      {children}
    </GameAnalysisModalNavContext.Provider>
  )
}

export function useGameAnalysisModalNav() {
  return React.useContext(GameAnalysisModalNavContext)
}
