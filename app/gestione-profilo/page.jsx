'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

/** La gestione profilo/HP vive in /impostazioni-profilo: questa rotta resta solo come alias di compatibilita. */
export default function GestioneProfiloRedirect() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace('/impostazioni-profilo')
  }, [router])
  return null
}
