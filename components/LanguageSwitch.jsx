'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { Globe, ChevronDown } from 'lucide-react'

const languages = [
  { code: 'it', flag: '🇮🇹', label: 'Italiano', short: 'IT' },
  { code: 'en', flag: '🇬🇧', label: 'English', short: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'Español', short: 'ES' },
]

export default function LanguageSwitch() {
  const { lang, changeLanguage } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const containerRef = React.useRef(null)

  const currentLang = languages.find(l => l.code === lang) || languages[0]

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBlur = (e) => {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setIsOpen(false)
    }
  }

  const handleSelect = (code) => {
    changeLanguage(code)
    setIsOpen(false)
  }

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      style={{ position: 'relative' }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: isHovered || isOpen
            ? 'rgba(0, 212, 255, 0.05)'
            : 'rgba(5, 8, 20, 0.8)',
          border: `1px solid ${isHovered || isOpen ? 'var(--border-cyan)' : 'rgba(0, 212, 255, 0.3)'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isHovered || isOpen ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          transform: isHovered || isOpen ? 'translateY(-1px)' : 'translateY(0)'
        }}
      >
        <Globe size={16} style={{ color: 'var(--primary-cyan)' }} />
        <span style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '0.3px'
        }}>
          {currentLang.short}
        </span>
        <ChevronDown
          size={12}
          style={{
            color: 'var(--primary-cyan)',
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '6px',
          minWidth: '180px',
          background: 'rgba(5, 8, 20, 0.95)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.4))',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'fadeIn 0.12s ease'
        }}>
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                background: l.code === lang
                  ? 'rgba(0, 212, 255, 0.08)'
                  : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: l.code === lang ? 'var(--primary-cyan)' : '#E0E0E0',
                fontSize: '14px',
                fontWeight: l.code === lang ? 600 : 400,
                textAlign: 'left',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (l.code !== lang) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.04)'
                }
              }}
              onMouseLeave={(e) => {
                if (l.code !== lang) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{l.flag}</span>
              <span style={{ flex: 1 }}>{l.label}</span>
              {l.code === lang && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--primary-cyan)',
                  boxShadow: '0 0 6px var(--primary-cyan)'
                }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
