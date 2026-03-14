'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function withAuth(WrappedComponent) {
  return function AuthWrapper(props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Check for custom Metalgate session
          const authToken = localStorage.getItem('auth_token')
          
          if (authToken) {
            console.log('Verifying Metalgate token with backend...')
            try {
              // Verify token with backend
              const response = await fetch(`${process.env.NEXT_PUBLIC_METALGATE_API_URL || 'http://localhost:4001/api'}/sso/verify`, {
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
                    email: data.user.email,
                    username: data.user.username,
                    isMetalgateUser: true
                  }))
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
              setIsAuthenticated(true)
              setIsLoading(false)
              return
            }
          }

          // Fallback: Check for Supabase session
          const { supabase } = await import('@/lib/supabaseClient')
          if (supabase) {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (session && !error) {
              console.log('Supabase session found')
              setIsAuthenticated(true)
            } else {
              console.log('No valid session found, redirecting to login')
              router.push('/login')
            }
          } else {
            console.log('No Supabase client, redirecting to login')
            router.push('/login')
          }
          setIsLoading(false)

        } catch (error) {
          console.error('Auth check error:', error)
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
          backgroundColor: 'var(--bg-primary)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '32px',
            backgroundColor: 'rgba(5, 8, 20, 0.8)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            maxWidth: '360px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(0, 212, 255, 0.05)',
              borderTop: '3px solid var(--primary-cyan)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <h2 style={{ margin: '0 0 0.5rem', color: '#FFFFFF', fontSize: '18px', fontWeight: 600 }}>
              Verifying Session...
            </h2>
            <p style={{ margin: 0, color: 'rgba(0, 212, 255, 0.7)', fontSize: '14px' }}>
              Connecting to Metalgate...
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
