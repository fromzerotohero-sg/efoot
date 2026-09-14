'use client'

import { RefreshCw } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

/**
 * Stato di caricamento pagina condiviso: un solo spinner centrato a tutto
 * schermo, sullo sfondo della shell, coerente con la dissolvenza uxPageFade.
 */
export default function PageLoading({ label, inline = false }) {
  const { t } = useTranslation()

  const content = (
    <div style={{ textAlign: 'center' }}>
      <RefreshCw
        size={32}
        style={{
          animation: 'spin 1s linear infinite',
          marginBottom: '16px',
          color: 'var(--accent)',
        }}
      />
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-dim)' }}>
        {label || t('loading')}
      </p>
    </div>
  )

  if (inline) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
        {content}
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--shell-bg)',
      }}
    >
      {content}
    </div>
  )
}
