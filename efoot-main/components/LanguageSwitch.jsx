'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { Globe } from 'lucide-react'

export default function LanguageSwitch() {
  const { lang, changeLanguage } = useTranslation()
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <button
      onClick={() => changeLanguage(lang === 'it' ? 'en' : 'it')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: isHovered ? 'rgba(0, 212, 255, 0.05)' : 'rgba(5, 8, 20, 0.8)',
        border: `1px solid ${isHovered ? 'var(--border-cyan)' : 'rgba(0, 212, 255, 0.3)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)'
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
        {lang === 'it' ? 'IT' : 'EN'}
      </span>
    </button>
  )
}
