'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Componente ConfirmModal Enterprise-Grade
 * Sostituisce window.confirm() con modal custom coerente con pattern esistenti
 */
export default function ConfirmModal({
  show = false,
  title,
  message,
  details = null,
  confirmLabel,
  cancelLabel,
  variant = 'warning',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  disabled = false,
  /** 'center' = card centrata; 'sheet' = pannello in basso (no effetto “schermo intero”) */
  presentation = 'center'
}) {
  const { t } = useTranslation()

  if (!show) return null

  const variantConfig = {
    error: {
      icon: AlertCircle,
      iconColor: '#FF3B30',
      borderColor: 'rgba(255, 59, 48, 0.3)'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: '#FF9500',
      borderColor: 'rgba(255, 149, 0, 0.3)'
    },
    info: {
      icon: Info,
      iconColor: 'var(--primary-cyan)',
      borderColor: 'var(--border-cyan)'
    }
  }

  const config = variantConfig[variant] || variantConfig.warning
  const Icon = config.icon

  const isSheet = presentation === 'sheet'

  const confirmButtonStyle = confirmVariant === 'danger'
    ? {
        background: 'rgba(255, 59, 48, 0.1)',
        borderColor: '#FF3B30',
        color: '#FF3B30'
      }
    : {
        background: 'rgba(0, 217, 255, 0.1)',
        borderColor: 'var(--primary-cyan)',
        color: 'var(--primary-cyan)'
      }

  return (
    <>
      {/* Pulsanti colonna + altezza touch su mobile; sopra FAB AssistantChat (z-index ~10050) */}
      <style>{`
        .confirm-modal-backdrop {
          min-height: 100vh;
          min-height: 100dvh;
        }
        .confirm-modal-card--center {
          max-height: min(88vh, 560px);
          max-height: min(88dvh, 560px);
        }
        .confirm-modal-card--sheet {
          max-height: min(85vh, 520px);
          max-height: min(85dvh, 520px);
        }
        .confirm-modal-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .confirm-modal-actions button {
          min-height: 48px;
          box-sizing: border-box;
        }
        @media (max-width: 520px) {
          .confirm-modal-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }
          .confirm-modal-actions button {
            width: 100%;
            flex: none !important;
          }
        }
      `}</style>
    <div
      className="confirm-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        backgroundColor: isSheet ? 'rgba(10, 14, 26, 0.45)' : 'rgba(10, 14, 26, 0.85)',
        display: 'flex',
        alignItems: isSheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 100100,
        padding: isSheet ? 0 : 'max(8px, env(safe-area-inset-top, 0px)) max(10px, env(safe-area-inset-right, 0px)) max(8px, env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-left, 0px))',
        paddingBottom: isSheet ? 'env(safe-area-inset-bottom, 0)' : undefined,
        animation: 'fadeIn 0.2s ease-out',
        overscrollBehavior: 'contain',
        WebkitTapHighlightColor: 'transparent'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={isSheet ? 'confirm-modal-card confirm-modal-card--sheet' : 'confirm-modal-card confirm-modal-card--center'}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: isSheet ? '16px 16px 0 0' : '12px',
          padding: 0,
          maxWidth: isSheet ? 'min(560px, calc(100vw - 20px))' : 'min(480px, calc(100vw - 20px))',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          border: `1px solid ${variant === 'danger' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(0, 212, 255, 0.3)'}`,
          boxShadow: isSheet ? '0 -8px 32px rgba(0, 0, 0, 0.35)' : 'var(--shadow-lg)',
          animation: 'slideUp 0.3s ease-out',
          position: 'relative',
          margin: 'auto'
        }}
      >
        {/* Solo il testo scorre: i pulsanti restano sempre visibili (mobile / testi lunghi) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: isSheet ? 'clamp(14px, 3vw, 20px) clamp(14px, 4vw, 20px) 10px' : 'clamp(16px, 4vw, 24px) clamp(14px, 4vw, 24px) 10px'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: 0
          }}>
            <Icon style={{ 
              color: config.iconColor, 
              width: '24px', 
              height: '24px',
              flexShrink: 0,
              marginTop: '2px'
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                id="confirm-modal-title"
                style={{ 
                margin: 0,
                marginBottom: '8px',
                color: 'var(--text-primary, #fff)',
                fontSize: 'clamp(16px, 4.2vw, 20px)',
                fontWeight: '600',
                lineHeight: 1.25,
                wordBreak: 'break-word'
              }}>
              {title || t('confirmAction')}
              </h2>
              <p
                style={{
                  fontSize: 'clamp(13px, 3.6vw, 15px)',
                  color: 'rgba(0, 212, 255, 0.7)',
                  marginBottom: 0,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {message}
              </p>
              {details && (
                <p style={{
                  margin: '12px 0 0 0',
                  color: 'var(--text-secondary, #aaa)',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  opacity: 0.9
                }}>
                  {details}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          className="confirm-modal-actions"
          style={{
            padding: isSheet
              ? '12px clamp(14px, 4vw, 20px) max(14px, env(safe-area-inset-bottom, 0px))'
              : '12px clamp(14px, 4vw, 24px) max(16px, env(safe-area-inset-bottom, 0px))'
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="neon-button"
            style={{
              padding: '12px 14px',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              flex: '1 1 140px',
              minWidth: 0
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn primary"
            style={{
              padding: '12px 14px',
              border: `1px solid ${confirmButtonStyle.borderColor}`,
              background: confirmButtonStyle.background,
              color: confirmButtonStyle.color,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              fontWeight: '600',
              opacity: disabled ? 0.5 : 1,
              transition: 'opacity 0.2s',
              flex: '1 1 140px',
              minWidth: 0
            }}
          >
            {confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
