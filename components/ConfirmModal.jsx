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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isSheet ? 'rgba(10, 14, 26, 0.45)' : 'rgba(10, 14, 26, 0.8)',
        display: 'flex',
        alignItems: isSheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: isSheet ? 0 : 'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
        paddingBottom: isSheet ? 'env(safe-area-inset-bottom, 0)' : undefined,
        animation: 'fadeIn 0.2s ease-out'
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
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: isSheet ? '16px 16px 0 0' : '12px',
          padding: 0,
          maxWidth: isSheet ? '560px' : '480px',
          width: '100%',
          maxHeight: isSheet ? 'min(85vh, 520px)' : 'min(90vh, 560px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          border: `1px solid ${variant === 'danger' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(0, 212, 255, 0.3)'}`,
          boxShadow: isSheet ? '0 -8px 32px rgba(0, 0, 0, 0.35)' : 'var(--shadow-lg)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Solo il testo scorre: i pulsanti restano sempre visibili (mobile / testi lunghi) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: isSheet ? '20px 20px 12px' : '24px 24px 12px'
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
              <h2 style={{ 
                margin: 0,
                marginBottom: '8px',
                color: 'var(--text-primary, #fff)',
                fontSize: 'clamp(17px, 4vw, 20px)',
                fontWeight: '600'
              }}>
              {title || t('confirmAction')}
              </h2>
              <p
                style={{
                  fontSize: 'clamp(14px, 3.5vw, 15px)',
                  color: 'rgba(0, 212, 255, 0.7)',
                  marginBottom: 0,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line'
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

        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'stretch',
          flexWrap: 'wrap',
          flexShrink: 0,
          padding: isSheet ? '12px 20px 20px' : '16px 24px 24px',
          paddingBottom: isSheet ? 'max(20px, env(safe-area-inset-bottom))' : 'max(24px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            type="button"
            onClick={onCancel}
            className="neon-button"
            style={{
              padding: '12px 16px',
              fontSize: '14px',
              flex: '1 1 120px',
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
              padding: '12px 16px',
              border: `1px solid ${confirmButtonStyle.borderColor}`,
              background: confirmButtonStyle.background,
              color: confirmButtonStyle.color,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: disabled ? 0.5 : 1,
              transition: 'opacity 0.2s',
              flex: '1 1 120px',
              minWidth: 0
            }}
          >
            {confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
