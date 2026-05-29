'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import BrandLoadingOverlay from '@/components/BrandLoadingOverlay'

export default function LoginSuccessPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [phase, setPhase] = useState('checking')
  const [errorDetail, setErrorDetail] = useState(null)

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userData = localStorage.getItem('metalgate_user')
        const authToken = localStorage.getItem('auth_token')

        if (!userData || !authToken) {
          console.error('No user data found in localStorage')
          setErrorDetail(t('loginSuccessFailed'))
          setPhase('error')
          setTimeout(() => {
            router.push('/login')
          }, 2500)
          return
        }

        const user = JSON.parse(userData)
        if (process.env.NODE_ENV !== 'production') console.log('User logged in successfully:', user.email)
        setPhase('success')

        setTimeout(() => {
          router.push('/')
        }, 2200)
      } catch (err) {
        console.error('Login check error:', err)
        setErrorDetail(t('loginSuccessGenericError'))
        setPhase('error')
        setTimeout(() => {
          router.push('/login')
        }, 2500)
      }
    }

    const timer = setTimeout(() => {
      checkLogin()
    }, 800)
    return () => clearTimeout(timer)
  }, [router, t])

  if (phase === 'error') {
    return (
      <BrandLoadingOverlay
        variant="error"
        kicker={t('loginSuccessErrorKicker')}
        title={t('loginSuccessFailedTitle')}
        status={errorDetail || t('loginSuccessFailedStatus')}
      />
    )
  }

  const isSuccess = phase === 'success'

  return (
    <BrandLoadingOverlay
      kicker={t('loginSuccessKicker')}
      title={t(isSuccess ? 'loginSuccessDoneTitle' : 'loginSuccessCompletingTitle')}
      status={t(isSuccess ? 'loginSuccessDoneStatus' : 'loginSuccessCompletingStatus')}
      tips={t('loginSuccessTips')}
      tipLabel={t('loginSuccessTipLabel')}
    />
  )
}
