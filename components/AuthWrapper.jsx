'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation, pickLang } from '@/lib/i18n'

/**
 * Verifica sessione UNA VOLTA per sessione JS: le API validano comunque il token
 * a ogni richiesta (401 -> login), quindi al cambio pagina non serve ri-verificare.
 * Il flag si invalida se il token sparisce (logout).
 */
let authVerifiedOnce = false

export function withAuth(WrappedComponent) {
  return function AuthWrapper(props) {
    const router = useRouter()
    const { lang } = useTranslation()
    const [isLoading, setIsLoading] = useState(() => {
      if (typeof window === 'undefined') return true
      return !(authVerifiedOnce && localStorage.getItem('auth_token'))
    })
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
      if (typeof window === 'undefined') return false
      return authVerifiedOnce && !!localStorage.getItem('auth_token')
    })

    useEffect(() => {
      // Gia verificata in questa sessione: niente schermata di attesa al cambio pagina
      if (authVerifiedOnce && localStorage.getItem('auth_token')) {
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }

      const checkAuth = async () => {
        try {
          // Check for custom Metalgate session
          const authToken = localStorage.getItem('auth_token')
          const metalgateUser = localStorage.getItem('metalgate_user')

          // Strict Metalgate mode: never fallback to a random Supabase session
          // when a Metalgate identity is present but its token is missing.
          if (metalgateUser && !authToken) {
            localStorage.removeItem('metalgate_user')
            try {
              sessionStorage.removeItem('dashboard_coach_mode_modal_seen_session_v1')
            } catch {}
            router.push('/login')
            return
          }

          if (authToken) {
            console.log('Verifying Metalgate token with backend...')
            try {
              // Same-origin proxy: evita CORS su preview Vercel vs api.fromzerotohero.io
              const response = await fetch('/api/auth/metalgate-verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: authToken })
              })

              if (response.ok) {
                const data = await response.json()
                if (data.valid) {
                  console.log('Metalgate token verified successfully')
                  // Update user data in localStorage to keep it fresh
                  localStorage.setItem('metalgate_user', JSON.stringify({
                    id: data.user.id,
                    metalgate_user_id: data.user.id,
                    email: data.user.email,
                    username: data.user.username,
                    isMetalgateUser: true
                  }))
                  authVerifiedOnce = true
                  setIsAuthenticated(true)
                  setIsLoading(false)
                  return
                }
              } else {
                console.error('Token verification failed:', response.status)
                // Only clear if explicitly invalid (401/403)
                if (response.status === 401 || response.status === 403) {
                  console.log('Token rejected by server, clearing')
                  localStorage.removeItem('auth_token')
                  localStorage.removeItem('metalgate_user')
                  try {
                    sessionStorage.removeItem('dashboard_coach_mode_modal_seen_session_v1')
                  } catch {}
                }
              }
            } catch (verifyError) {
              console.error('Error verifying token:', verifyError)
              // Network error: Do nothing, keep token
            }

            // If token still exists (verification succeeded, or network error/optimistic),
            // consider authenticated and STOP here.
            // Do NOT fall through to Supabase check which would fail and redirect.
            if (localStorage.getItem('auth_token')) {
              console.log('Proceeding with custom token (optimistic or verified)')
              authVerifiedOnce = true
              setIsAuthenticated(true)
              setIsLoading(false)
              return
            }
          }

          // Fallback: Check for Supabase session (only for non-Metalgate flows)
          const { supabase } = await import('@/lib/supabaseClient')
          if (supabase) {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (session && !error) {
              console.log('Supabase session found')
              authVerifiedOnce = true
              setIsAuthenticated(true)
            } else {
              console.log('No valid session found, redirecting to login')
              try {
                sessionStorage.removeItem('dashboard_coach_mode_modal_seen_session_v1')
              } catch {}
              router.push('/login')
            }
          } else {
            console.log('No Supabase client, redirecting to login')
            try {
              sessionStorage.removeItem('dashboard_coach_mode_modal_seen_session_v1')
            } catch {}
            router.push('/login')
          }
          setIsLoading(false)

        } catch (error) {
          console.error('Auth check error:', error)
          try {
            sessionStorage.removeItem('dashboard_coach_mode_modal_seen_session_v1')
          } catch {}
          router.push('/login')
          setIsLoading(false)
        }
      }

      checkAuth()
    }, [router])

    if (isLoading) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--shell-bg)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '28px 32px',
            backgroundColor: 'var(--surface)',
            borderRadius: '16px',
            boxShadow: '0 18px 48px rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-soft)',
            maxWidth: '360px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid var(--border-soft)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)', fontSize: '17px', fontWeight: 700 }}>
              {pickLang(lang, { it: 'Verifica sessione…', en: 'Verifying session…', es: 'Verificando sesión…' })}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '13px' }}>
              {pickLang(lang, { it: 'Un momento, sto preparando tutto.', en: 'One moment, getting everything ready.', es: 'Un momento, estoy preparándolo todo.' })}
            </p>
          </div>

          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null // Will redirect
    }

    return <WrappedComponent {...props} />
  }
}
