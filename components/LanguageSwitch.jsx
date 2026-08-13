'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'

const LANGS = [
  { id: 'it', label: 'IT' },
  { id: 'en', label: 'EN' },
  { id: 'es', label: 'ES' }
]

export default function LanguageSwitch() {
  const { lang, changeLanguage } = useTranslation()

  return (
    <div
      role="group"
      aria-label={lang === 'en' ? 'Language' : lang === 'es' ? 'Idioma' : 'Lingua'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 36,
        padding: 3,
        borderRadius: 10,
        background: '#EFECE6',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        flexShrink: 0
      }}
    >
      {LANGS.map((item) => {
        const active = lang === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => changeLanguage(item.id)}
            aria-pressed={active}
            aria-label={item.label}
            style={{
              minWidth: 28,
              height: 28,
              padding: '0 7px',
              border: 0,
              borderRadius: 7,
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? '#1D1D1F' : '#6B6B6B',
              boxShadow: active ? '0 1px 3px rgba(29, 29, 31, 0.12)' : 'none',
              font: 'inherit',
              fontSize: 11,
              fontWeight: active ? 800 : 650,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
