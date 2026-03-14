'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

export default function NotFound() {
  const router = useRouter()
  const { t } = useTranslation()
  return (
    <main style={{ padding: 24, textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1>{t('notFoundTitle')}</h1>
      <p>{t('notFoundMessage')}</p>
      <button
        type="button"
        onClick={() => router.push('/')}
        style={{
          marginTop: 24,
          padding: '12px 24px',
          background: 'var(--neon-blue)',
          color: '#000',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 16
        }}
      >
        {t('backToDashboardBtn')}
      </button>
    </main>
  )
}
