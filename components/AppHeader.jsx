'use client'

import { useTranslation } from '@/lib/i18n'
import CreditsBar from '@/components/CreditsBar'
import GuideTour from '@/components/GuideTour'

/**
 * Header con aria-label tradotto (doppia lingua).
 * Usato nel root layout per Crediti e guida.
 */
export default function AppHeader() {
  const { t } = useTranslation()
  return (
    <header className="top-utility-bar" aria-label={t('creditsAndGuideAria')}>
      <CreditsBar />
      <GuideTour />
    </header>
  )
}
