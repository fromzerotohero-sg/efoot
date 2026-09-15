'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError(t('emailPasswordRequired'))
      return
    }
    if (!supabase) {
      setError(t('supabaseNotAvailable'))
      return
    }
    setLoading(true)
    try {
      const baseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL)
        ? String(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '')
        : (typeof window !== 'undefined' ? window.location.origin : '')
      const redirectTo = baseUrl ? `${baseUrl}/reset-password` : undefined
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      })
      if (resetError) {
        setError(resetError.message || t('resetPasswordError'))
        setLoading(false)
        return
      }
      setSuccess(true)
    } catch (err) {
      console.error('[ForgotPassword]', err)
      setError(err?.message || t('resetPasswordError'))
    } finally {
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
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neon-blue)', marginBottom: '8px' }}>
            {t('forgotPasswordTitle')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            {t('forgotPasswordDescription')}
          </p>
        </div>

        {error && (
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
            <span>{t('resetLinkSent')}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                {t('email')}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  autoComplete="email"
                  required
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
              {loading ? '...' : t('sendResetLink')}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--info-border)', textAlign: 'center' }}>
          <Link
            href="/login"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--neon-blue)', fontSize: '14px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
