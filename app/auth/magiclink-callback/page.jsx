'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { CheckCircle, AlertCircle } from 'lucide-react'

function MagiclinkCallbackContent() {
  const router = useRouter()
  const { t } = useTranslation()
  
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    handleMagicLinkCallback()
  }, [])

  const handleMagicLinkCallback = async () => {
    try {
      // Get the session from the URL
      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError(t('loginSuccessGenericError'))
        setLoading(false)
        return
      }

      if (!data.session) {
        // Try to get session from URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (setSessionError) {
            setError(t('loginSuccessGenericError'))
            setLoading(false)
            return
          }
        } else {
          setError(t('loginSuccessFailed'))
          setLoading(false)
          return
        }
      }

      // Check if this was a Metalgate login
      const metalgateMagicLink = sessionStorage.getItem('metalgate_magic_link')
      if (metalgateMagicLink) {
        sessionStorage.removeItem('metalgate_magic_link')
        if (process.env.NODE_ENV !== 'production') console.log('[MagicLink Callback] Metalgate login completed successfully')
      }

      setLoading(false)
      
      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 1000)

    } catch (err) {
      console.error('[MagicLink Callback] Error:', err)
      setError(err?.message || t('loginSuccessGenericError'))
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      padding: '24px'
    }}>
      <div className="neon-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px',
        background: 'rgba(10, 14, 39, 0.95)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        textAlign: 'center'
      }}>
        {loading && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 24px',
              border: '3px solid rgba(0, 212, 255, 0.2)',
              borderTopColor: 'var(--neon-blue)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--neon-blue)',
              marginBottom: '16px'
            }}>
              {t('magiclinkCompleting')}
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0
            }}>
              {t('magiclinkPreparing')}
            </p>
          </>
        )}

        {!loading && !error && (
          <>
            <CheckCircle size={60} color="#22c55e" style={{ margin: '0 auto 24px' }} />
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#22c55e',
              marginBottom: '16px'
            }}>
              {t('magiclinkDone')}
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0
            }}>
              {t('magiclinkRedirecting')}
            </p>
          </>
        )}

        {error && (
          <>
            <AlertCircle size={60} color="#ef4444" style={{ margin: '0 auto 24px' }} />
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#ef4444',
              marginBottom: '16px'
            }}>
              {t('magiclinkFailed')}
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: '0 0 24px 0'
            }}>
              {error}
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '12px 24px',
                background: 'var(--neon-blue)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {t('magiclinkBackToLogin')}
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function MagiclinkCallbackPage() {
  return (
    <React.Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050814',
        color: 'white'
      }}>
        <MagiclinkFallback />
      </div>
    }>
      <MagiclinkCallbackContent />
    </React.Suspense>
  )
}

function MagiclinkFallback() {
  const { t } = useTranslation()
  return t('loadingSimple')
}
