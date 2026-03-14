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
  disabled = false
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
        backgroundColor: 'rgba(10, 14, 26, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
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
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '12px',
          padding: '28px',
          maxWidth: '480px',
          width: '100%',
          border: `1px solid ${variant === 'danger' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(0, 212, 255, 0.3)'}`,
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <Icon style={{ 
            color: config.iconColor, 
            width: '24px', 
            height: '24px',
            flexShrink: 0,
            marginTop: '2px'
          }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              margin: 0,
              marginBottom: '8px',
              color: 'var(--text-primary, #fff)',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              {title || t('confirmAction')}
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: 'rgba(0, 212, 255, 0.7)',
                marginBottom: '24px',
                lineHeight: 1.5
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

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={onCancel}
            className="neon-button"
            style={{
              padding: '10px 20px',
              fontSize: '14px'
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn primary"
            style={{
              padding: '10px 20px',
              border: `1px solid ${confirmButtonStyle.borderColor}`,
              background: confirmButtonStyle.background,
              color: confirmButtonStyle.color,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: disabled ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
