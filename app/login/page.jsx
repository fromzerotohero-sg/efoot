'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { Shield } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)

  // Check for Metalgate success on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const metalgateSuccess = urlParams.get('metalgate_success')
    const storedSuccess = sessionStorage.getItem('metalgate_login_success')
    const storedEmail = sessionStorage.getItem('metalgate_user_email')
    
    if (metalgateSuccess === 'true' || storedSuccess === 'true') {
      setSuccess(`Account Metalgate sincronizzato! ${storedEmail ? `Email: ${storedEmail}` : ''}`)
      // Clear the stored values
      sessionStorage.removeItem('metalgate_login_success')
      sessionStorage.removeItem('metalgate_user_email')
      // Clear URL params
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  const handleMetalgateLogin = () => {
    const METALGATE_LOGIN_URL = process.env.NEXT_PUBLIC_METALGATE_LOGIN_URL || 'http://localhost:3000/login.html'
    const redirectUrl = encodeURIComponent(`${window.location.origin}/auth/callback`)
    
    // Instead of going directly to login.html, go to a page that shows both options
    window.location.href = `${METALGATE_LOGIN_URL}?redirect=${redirectUrl}&source=frowningcupcake`
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--shell-bg)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        background: 'var(--surface)',
        border: '1px solid var(--info-border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '8px'
          }}>
            Login
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--info)',
            margin: 0
          }}>
            From Zero to Hero
          </p>
        </div>

        {/* Metalgate SSO Button */}
        <button
          onClick={handleMetalgateLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--accent-ink)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.15s ease',
            opacity: loading ? 0.6 : 1,
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
        >
          <Shield size={18} />
          <span>Login with MetalGate</span>
          {loading && (
            <div style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(0, 0, 0, 0.2)',
              borderTopColor: '#000',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite'
            }} />
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            background: 'rgba(255, 59, 48, 0.1)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
            borderRadius: '8px',
            color: '#FF3B30',
            fontSize: '14px'
          }}>
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            background: 'rgba(52, 199, 89, 0.1)',
            border: '1px solid rgba(52, 199, 89, 0.3)',
            borderRadius: '8px',
            color: '#34C759',
            fontSize: '14px'
          }}>
            <span>{success}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ marginTop: '20px' }}>
            <p style={{
              color: 'var(--info)',
              fontSize: '14px',
              margin: 0
            }}>
              Accesso in corso...
            </p>
          </div>
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
