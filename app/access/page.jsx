'use client'

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { BarChart3, Brain, Shield, Sparkles, Unlock, Users } from 'lucide-react'
import LanguageSwitch from '@/components/LanguageSwitch'
import { useTranslation } from '@/lib/i18n'

export default function AccessPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const featureCards = [
    {
      icon: BarChart3,
      title: t('prelaunchFeatureMatchesTitle'),
      text: t('prelaunchFeatureMatchesText'),
    },
    {
      icon: Users,
      title: t('prelaunchFeatureSquadTitle'),
      text: t('prelaunchFeatureSquadText'),
    },
    {
      icon: Brain,
      title: t('prelaunchFeatureCoachTitle'),
      text: t('prelaunchFeatureCoachText'),
    },
    {
      icon: Shield,
      title: t('prelaunchFeatureCounterTitle'),
      text: t('prelaunchFeatureCounterText'),
    },
  ]

  const [code, setCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState(null)

  const handleUnlock = async (event) => {
    event.preventDefault()
    setMessage(null)

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setMessage({
        type: 'error',
        text: t('prelaunchCodeEnterError'),
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/prelaunch/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ code: trimmedCode }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || t('prelaunchCodeUnlockError'))
      }

      setMessage({
        type: 'success',
        text: t('prelaunchCodeUnlocked'),
      })

      setTimeout(() => {
        router.replace('/')
      }, 500)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || t('prelaunchCodeInvalid'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(0, 212, 255, 0.12), transparent 35%), #03050c',
      padding: 'clamp(20px, 4vw, 40px)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 20px',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <LanguageSwitch />
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: '28px',
        alignItems: 'start'
      }}>
        <section style={{
          background: 'linear-gradient(180deg, rgba(9, 13, 28, 0.94) 0%, rgba(5, 8, 20, 0.98) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.18)',
          borderRadius: '24px',
          padding: 'clamp(24px, 4vw, 40px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <Image
              src="/logo.png"
              alt="From Zero to Hero"
              width={280}
              height={120}
              style={{ width: 'min(100%, 280px)', height: 'auto', objectFit: 'contain' }}
              priority
            />
          </div>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '999px',
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.24)',
            color: 'var(--primary-cyan)',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '18px'
          }}>
            <Sparkles size={15} />
            {t('prelaunchAccessBadge')}
          </span>

          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 52px)',
            lineHeight: 1.02,
            fontWeight: 800,
            margin: '0 0 14px',
            color: '#FFFFFF'
          }}>
            {t('prelaunchThanksTitle')}
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2.3vw, 18px)',
            lineHeight: 1.65,
            color: 'rgba(255, 255, 255, 0.78)',
            margin: '0 0 14px'
          }}>
            {t('prelaunchAccountCreated')}
          </p>

          <p style={{
            fontSize: '15px',
            lineHeight: 1.7,
            color: 'rgba(0, 212, 255, 0.78)',
            margin: 0
          }}>
            {t('prelaunchReservedAccessText')}
          </p>

          <div style={{
            marginTop: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px'
          }}>
            {featureCards.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                style={{
                  padding: '18px',
                  borderRadius: '18px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <Icon size={20} color="var(--primary-cyan)" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>{title}</div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.68)' }}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(9, 13, 28, 0.96) 0%, rgba(5, 8, 20, 0.98) 100%)',
            border: '1px solid rgba(255, 203, 5, 0.22)',
            borderRadius: '24px',
            padding: 'clamp(24px, 4vw, 32px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '999px',
              background: 'rgba(255, 203, 5, 0.08)',
              border: '1px solid rgba(255, 203, 5, 0.2)',
              color: '#ffcb05',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '18px'
            }}>
              <Unlock size={15} />
              {t('prelaunchCodeBadge')}
            </div>

            <h2 style={{ fontSize: '28px', lineHeight: 1.1, fontWeight: 800, margin: '0 0 12px', color: '#FFFFFF' }}>
              {t('prelaunchCodeTitle')}
            </h2>

            <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, fontSize: '15px' }}>
              {t('prelaunchCodeText')}
            </p>

            <form onSubmit={handleUnlock} style={{ display: 'grid', gap: '14px' }}>
              <input
                type="password"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('prelaunchCodePlaceholder')}
                autoComplete="off"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '16px 18px',
                  borderRadius: '14px',
                  border: '1px solid rgba(0, 212, 255, 0.22)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  outline: 'none'
                }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '15px 18px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffcb05 0%, #ff9900 100%)',
                  color: '#050814',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1
                }}
              >
                {loading
                  ? t('prelaunchCodeButtonLoading')
                  : t('prelaunchCodeButton')}
              </button>
            </form>

            {message && (
              <div style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '14px',
                background: message.type === 'success' ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                border: message.type === 'success' ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 59, 48, 0.3)',
                color: message.type === 'success' ? '#8BFFB0' : '#FF9D9D',
                fontSize: '14px',
                lineHeight: 1.5
              }}>
                {message.text}
              </div>
            )}

            <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,0.56)', fontSize: '13px', lineHeight: 1.55 }}>
              {t('prelaunchCodeHint')}
            </p>
          </div>

          <div style={{
            overflow: 'hidden',
            borderRadius: '24px',
            border: '1px solid rgba(0, 212, 255, 0.16)',
            background: 'rgba(5, 8, 20, 0.9)'
          }}>
            <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
              <Image
                src="/coach.jpg"
                alt={t('prelaunchVisionAlt')}
                fill
                style={{ objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(5,8,20,0.08) 0%, rgba(5,8,20,0.82) 100%)'
              }} />
              <div style={{
                position: 'absolute',
                left: '20px',
                right: '20px',
                bottom: '20px',
                padding: '18px',
                borderRadius: '18px',
                background: 'rgba(5, 8, 20, 0.78)',
                border: '1px solid rgba(0, 212, 255, 0.16)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
                  {t('prelaunchInsideTitle')}
                </div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, fontSize: '14px' }}>
                  {t('prelaunchInsideText')}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            padding: '24px',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: 800, color: '#FFFFFF' }}>
              {t('prelaunchNoCodeTitle')}
            </h3>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.72)' }}>
              {t('prelaunchNoCodeText')}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
