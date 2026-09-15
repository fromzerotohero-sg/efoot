'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(false)
  const [sessionReady, setSessionReady] = React.useState(false)
  const [invalidLink, setInvalidLink] = React.useState(false)

  React.useEffect(() => {
    if (!supabase) {
      setInvalidLink(true)
      return
    }
    let timeoutId
    let subscription
    const hasHash = typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('type=recovery')
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
        return
      }
      if (hasHash) {
        // detectSessionInUrl: true nel client processa l'hash in modo asincrono; aspettiamo onAuthStateChange
        const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, s) => {
          if (s && (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION')) setSessionReady(true)
        })
        subscription = sub
        timeoutId = setTimeout(() => {
          subscription?.unsubscribe?.()
          setInvalidLink(true)
        }, 8000)
      } else {
        setInvalidLink(true)
      }
    }
    checkSession()
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription?.unsubscribe?.()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!password || password.length < 6) {
      setError(t('passwordPlaceholder'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'))
      return
    }
    if (!supabase) return
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || t('resetPasswordError'))
        setLoading(false)
        return
      }
      setSuccess(true)
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
    } catch (err) {
      console.error('[ResetPassword]', err)
      setError(err?.message || t('resetPasswordError'))
    } finally {
      setLoading(false)
    }
  }

  if (invalidLink) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--shell-bg)', padding: '24px' }}>
        <div className="neon-panel" style={{ maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h1 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>{t('resetPasswordError')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {t('resetLinkExpired')}
          </p>
          <Link href="/forgot-password" style={{ display: 'inline-block', padding: '12px 24px', background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', color: 'var(--accent-ink)', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            {t('forgotPasswordTitle')}
          </Link>
          <div style={{ marginTop: '24px' }}>
            <Link href="/login" style={{ color: 'var(--neon-blue)', fontSize: '14px' }}>{t('backToLogin')}</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--shell-bg)' }}>
        <div style={{ color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', border: '2px solid var(--info-border)', borderTopColor: 'var(--neon-blue)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          <span>{t('creditsLoading')}</span>
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
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
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neon-blue)', marginBottom: '8px' }}>
            {t('resetPasswordTitle')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            {t('resetPasswordDescription')}
          </p>
        </div>

        {success && (
          <div style={{
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#22c55e',
            fontSize: '14px'
          }}>
            <CheckCircle size={16} />
            <span>{t('passwordUpdated')}</span>
          </div>
        )}

        {error && !success && (
          <div style={{
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ef4444',
            fontSize: '14px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('newPasswordPlaceholder')}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'var(--inset-bg)',
                    border: '1px solid var(--info-border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>{t('confirmPassword')}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('newPasswordPlaceholder')}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    background: 'var(--inset-bg)',
                    border: '1px solid var(--info-border)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--accent-ink)',
                fontSize: '16px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '...' : t('setNewPassword')}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--info-border)', textAlign: 'center' }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--neon-blue)', fontSize: '14px', textDecoration: 'none' }}>
            <ArrowLeft size={16} />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
