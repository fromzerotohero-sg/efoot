'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageLoading from '@/components/PageLoading'

/**
 * Legacy surface retired: contromisure live only inside Hero Chat.
 * Keep this route as a soft redirect so old links/bookmarks still work.
 */
export default function CountermeasuresPreMatchRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/?openCountermeasures=1')
  }, [router])

  return <PageLoading />
}
