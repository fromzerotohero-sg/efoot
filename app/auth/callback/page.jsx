'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import ConfirmModal from '@/components/ConfirmModal'
import { Shield, CheckCircle, AlertCircle, Mail } from 'lucide-react'

function AuthCallbackContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [status, setStatus] = React.useState('processing') // 'processing' | 'success' | 'error'
  const [confirmModal, setConfirmModal] = React.useState(null)

  React.useEffect(() => {
    const error = searchParams.get('error')
    const email = searchParams.get('email')
    
    if (error === 'Email verification required') {
      setError('Please verify your email before logging in')
      setStatus('error')
      setLoading(false)
      
      // Show option to resend verification email
      if (email) {
        setTimeout(() => {
          setConfirmModal({
            show: true,
            title: 'Email Verification Required',
            message: `Email verification required for ${email}. Would you like to resend the verification email?`,
            confirmLabel: 'Resend Email',
            cancelLabel: 'Cancel',
            onConfirm: () => {
              setConfirmModal(null)
              window.location.href = `${process.env.NEXT_PUBLIC_METALGATE_LOGIN_URL}/login.html?email=${encodeURIComponent(email)}`
            },
            onCancel: () => {
              setConfirmModal(null)
              router.push('/login')
            }
          })
        }, 1000)
      } else {
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
      return
    }
    
    handleMetalgateCallback()
  }, [])

  const handleMetalgateCallback = async () => {
    try {
      setLoading(true)
      setStatus('processing')
      setError(null)

      // Get token from URL
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      const action = urlParams.get('action') || 'login' // Default to login

      if (!token) {
        throw new Error('No token received')
      }

      let response = await fetch('/api/auth/metalgate-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action })
      })

      let data
      try {
        data = await response.json()
      } catch (_) {
        throw new Error(response.status === 404 ? 'Login endpoint not available. Please try again later.' : 'Invalid response from server.')
      }

      if (!response.ok) {
        if (response.status === 404 && data?.details === 'user_not_found' && action !== 'register') {
          response = await fetch('/api/auth/metalgate-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'register' })
          })
          try {
            data = await response.json()
          } catch (_) {
            throw new Error('User not found. Please register first.')
          }
          if (!response.ok) {
            throw new Error(data?.error || 'Registration failed. Please try again.')
          }
        } else if (response.status === 404 && data?.details === 'user_not_found') {
          throw new Error('User not found. Please register first.')
        } else if (response.status === 404) {
          throw new Error('Login endpoint not available. Check deployment.')
        } else if (data?.details === 'auth_setup_failed') {
          throw new Error('Account setup in progress. Please try again in a moment.')
        } else {
          throw new Error(data?.error || `Callback failed (${response.status})`)
        }
      }

      // Store canonical Metalgate identity in localStorage and redirect.
      // data.user.id is the user_profiles row id, not the external Metalgate id.
      const resolvedMetalgateUserId = data?.user?.metalgate_user_id || null
      localStorage.setItem('metalgate_user', JSON.stringify({
        id: resolvedMetalgateUserId || data.user.id,
        metalgate_user_id: resolvedMetalgateUserId,
        profile_id: data.user.id,
        supabase_user_id: data.user.user_id || null,
        email: data.email,
        username: data.user.first_name,
        isMetalgateUser: data.user.is_metalgate_user
      }))

      // Set a custom session flag
      localStorage.setItem('auth_token', token)

      // Redirect to login success page
      window.location.href = '/login-success'

    } catch (err) {
      console.error('[Metalgate Callback] Error:', err)
      setError(err?.message || 'An unexpected error occurred')
      setStatus('error')
      setLoading(false)
    }
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
      <div className="neon-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px',
        background: 'var(--surface)',
        border: '1px solid var(--info-border)',
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
              border: '3px solid var(--info-border)',
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
              Processing Login
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Verifying your Metalgate account...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={60} color="#22c55e" style={{ margin: '0 auto 24px' }} />
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#22c55e',
              marginBottom: '16px'
            }}>
              Login Successful!
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle size={60} color="#ef4444" style={{ margin: '0 auto 24px' }} />
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#ef4444',
              marginBottom: '16px'
            }}>
              Login Failed
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              margin: '0 0 24px 0'
            }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
                Back to Login
              </button>
              {error?.includes('verify your email') && (
                <button
                  onClick={() => {
                    const metalgateBase = (process.env.NEXT_PUBLIC_METALGATE_LOGIN_URL || '')
                      .replace(/\/login\.html$/, '')
                      .replace(/\/+$/, '')
                    window.open(metalgateBase ? `${metalgateBase}/verify-email` : '/verify-email', '_blank')
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #ff6b35 0%, #f72b1c 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Mail size={16} />
                  Verify Email
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {confirmModal && (
        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--shell-bg)',
        color: 'var(--text-main)'
      }}>
        Loading...
      </div>
    }>
      <AuthCallbackContent />
    </React.Suspense>
  )
}
