'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { Share, Smartphone, Plus, MoreVertical, X, CheckCircle2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import {
  getInstallPlatform,
  getAutoShowDelayMs,
  isMobileInstallCandidate,
  isStandalonePwa,
  OPEN_INSTALL_APP_PROMPT_EVENT,
  setPromptDismiss,
  shouldAutoShowInstallPrompt,
} from '@/lib/pwaInstall'

/**
 * Popup enterprise: guida installazione PWA (iOS Share / Android prompt nativo).
 * Montato in AppLayoutShell → visibile su tutte le pagine app autenticate.
 */
export default function InstallAppPrompt() {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const [platform, setPlatform] = React.useState('other')
  const [canNativeInstall, setCanNativeInstall] = React.useState(false)
  const [installing, setInstalling] = React.useState(false)
  const deferredPromptRef = React.useRef(null)

  const close = React.useCallback(() => setOpen(false), [])

  const openPrompt = React.useCallback(() => {
    if (isStandalonePwa() || !isMobileInstallCandidate()) return
    setPlatform(getInstallPlatform())
    setOpen(true)
  }, [])

  React.useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setCanNativeInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  React.useEffect(() => {
    const onManualOpen = () => openPrompt()
    window.addEventListener(OPEN_INSTALL_APP_PROMPT_EVENT, onManualOpen)
    return () => window.removeEventListener(OPEN_INSTALL_APP_PROMPT_EVENT, onManualOpen)
  }, [openPrompt])

  React.useEffect(() => {
    if (!shouldAutoShowInstallPrompt()) return undefined
    const timer = window.setTimeout(() => openPrompt(), getAutoShowDelayMs())
    return () => window.clearTimeout(timer)
  }, [openPrompt])

  const handleNativeInstall = React.useCallback(async () => {
    const prompt = deferredPromptRef.current
    if (!prompt) return
    setInstalling(true)
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        setPromptDismiss('never')
        close()
      }
    } catch {
      /* annullato o non supportato */
    } finally {
      deferredPromptRef.current = null
      setCanNativeInstall(false)
      setInstalling(false)
    }
  }, [close])

  const handleRemindLater = React.useCallback(() => {
    setPromptDismiss('later')
    close()
  }, [close])

  const handleDismiss = React.useCallback(() => {
    setPromptDismiss('dismiss')
    close()
  }, [close])

  if (!open || typeof document === 'undefined') return null

  const isIos = platform === 'ios'
  const showAndroidInstall = platform === 'android' && canNativeInstall

  const steps = isIos
    ? [
        { icon: Share, text: t('pwaInstallStepIos1') },
        { icon: Plus, text: t('pwaInstallStepIos2') },
        { icon: CheckCircle2, text: t('pwaInstallStepIos3') },
      ]
    : [
        { icon: MoreVertical, text: t('pwaInstallStepAndroid1') },
        { icon: Plus, text: t('pwaInstallStepAndroid2') },
        { icon: CheckCircle2, text: t('pwaInstallStepAndroid3') },
      ]

  const modal = (
    <>
      <style>{`
        @keyframes pwaInstallFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pwaInstallSlideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
        .pwa-install-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(0, 212, 255, 0.06);
          border: 1px solid rgba(0, 212, 255, 0.15);
        }
        .pwa-install-step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #03050c;
          background: linear-gradient(135deg, var(--primary-gold), var(--primary-teal));
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleRemindLater()
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100880,
          background: 'rgba(10, 14, 26, 0.55)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'pwaInstallFadeIn 0.22s ease-out',
          overscrollBehavior: 'contain',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 520,
            maxHeight: 'min(92dvh, 640px)',
            background: 'var(--bg-elevated)',
            borderRadius: '20px 20px 0 0',
            border: '1px solid rgba(0, 212, 255, 0.28)',
            boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.45), 0 0 24px rgba(0, 212, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            animation: 'pwaInstallSlideUp 0.32s ease-out',
          }}
        >
          <button
            type="button"
            onClick={handleRemindLater}
            aria-label={t('close')}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            <X size={18} />
          </button>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '20px 20px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingRight: 40 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
              >
                <img
                  src="/logo.png"
                  alt=""
                  width={56}
                  height={56}
                  style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 14 }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  id="pwa-install-title"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(17px, 4.5vw, 20px)',
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.25,
                  }}
                >
                  {t('pwaInstallTitle')}
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(0, 212, 255, 0.75)', lineHeight: 1.45 }}>
                  {t('pwaInstallSubtitle')}
                </p>
              </div>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              {t('pwaInstallBenefit')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
              {steps.map((step, index) => {
                const StepIcon = step.icon
                return (
                  <div key={index} className="pwa-install-step">
                    <span className="pwa-install-step-num">{index + 1}</span>
                    <StepIcon size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--neon-cyan)' }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>{step.text}</span>
                  </div>
                )
              })}
            </div>

            {isIos && (
              <p style={{ margin: '12px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>
                {t('pwaInstallIosHint')}
              </p>
            )}
          </div>

          <div
            style={{
              flexShrink: 0,
              padding: '12px 20px max(16px, env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {showAndroidInstall ? (
              <button
                type="button"
                className="btn primary"
                disabled={installing}
                onClick={handleNativeInstall}
                style={{
                  width: '100%',
                  minHeight: 48,
                  marginBottom: 10,
                  border: '1px solid var(--primary-cyan)',
                  background: 'rgba(0, 217, 255, 0.12)',
                  color: 'var(--primary-cyan)',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 12,
                  cursor: installing ? 'wait' : 'pointer',
                  opacity: installing ? 0.7 : 1,
                }}
              >
                {installing ? t('pwaInstallInstalling') : t('pwaInstallCtaInstall')}
              </button>
            ) : null}

            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              {!showAndroidInstall && (
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleRemindLater}
                  style={{
                    width: '100%',
                    minHeight: 48,
                    border: '1px solid var(--primary-cyan)',
                    background: 'rgba(0, 217, 255, 0.12)',
                    color: 'var(--primary-cyan)',
                    fontWeight: 600,
                    fontSize: 15,
                    borderRadius: 12,
                  }}
                >
                  {t('pwaInstallCtaGotIt')}
                </button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="neon-button"
                style={{ width: '100%', minHeight: 44, fontSize: 14 }}
              >
                {t('pwaInstallDismiss')}
              </button>
              {showAndroidInstall && (
                <button
                  type="button"
                  onClick={handleRemindLater}
                  className="neon-button"
                  style={{ width: '100%', minHeight: 44, fontSize: 14 }}
                >
                  {t('pwaInstallRemindLater')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}

/** Pulsante TopBar: riapre il popup manualmente (solo mobile, non già installata). */
export function InstallAppPromptButton() {
  const { t } = useTranslation()
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    setVisible(isMobileInstallCandidate() && !isStandalonePwa())
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(OPEN_INSTALL_APP_PROMPT_EVENT))
      }}
      aria-label={t('pwaInstallOpenManual')}
      title={t('pwaInstallOpenManual')}
      className="lg:hidden"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        background: 'rgba(221, 166, 47, 0.12)',
        border: '1px solid rgba(221, 166, 47, 0.45)',
        color: 'var(--primary-gold)',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <Smartphone size={18} />
    </button>
  )
}
