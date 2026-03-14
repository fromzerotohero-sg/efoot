'use client'

import React from 'react'
import { LanguageProvider } from '@/lib/i18n'

export default function LanguageProviderWrapper({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
