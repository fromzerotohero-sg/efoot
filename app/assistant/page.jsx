'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

/** La chat Hero vive nella Home: /assistant resta solo come alias di compatibilita. */
export default function AssistantRedirect() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace('/')
  }, [router])
  return null
}
