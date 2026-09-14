'use client'

import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTranslation, pickLang } from '@/lib/i18n'

const STORAGE_KEY = 'fzth_theme'

/** Toggle tema dark/light UX V2. Persistenza: localStorage 'fzth_theme'.
 *  Il tema viene applicato pre-paint da uno script inline in app/layout.jsx. */
export default function ThemeToggle() {
  const { lang } = useTranslation()
  const [theme, setTheme] = React.useState('dark')

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.theme = next
  }

  const label = theme === 'dark'
    ? pickLang(lang, { it: 'Passa al tema chiaro', en: 'Switch to light theme', es: 'Cambiar a tema claro' })
    : pickLang(lang, { it: 'Passa al tema scuro', en: 'Switch to dark theme', es: 'Cambiar a tema oscuro' })

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border-soft)',
        color: 'var(--text-main)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0
      }}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
