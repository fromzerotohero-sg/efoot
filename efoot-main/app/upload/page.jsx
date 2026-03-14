'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'

export default function UploadPage() {
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    router.push('/gestione-formazione')
  }, [router])

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div className="neon-text" style={{ fontSize: '24px', marginBottom: '20px' }}>
        {t('redirectToFormation')}
      </div>
    </div>
  )
}
