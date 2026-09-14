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
        background: 'var(--surface-2)',
        border: '1px solid var(--border-soft)',
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
              background: active ? 'var(--accent-bg)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-dim)',
              border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
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
