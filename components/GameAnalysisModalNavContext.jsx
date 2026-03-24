'use client'

import React from 'react'

/** Bottom nav su dashboard: apri modal analisi senza navigare (stesso nome evento in page.jsx). */
export const OPEN_GAME_ANALYSIS_MODAL_EVENT = 'open-game-analysis-modal'
/** Tap su Dashboard mentre il modal analisi è aperto: stesso pathname `/` → Link non naviga; chiudi modal. */
export const CLOSE_GAME_ANALYSIS_MODAL_EVENT = 'close-game-analysis-modal'

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
