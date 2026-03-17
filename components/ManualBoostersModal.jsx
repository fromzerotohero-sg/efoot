'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { X } from 'lucide-react'

/**
 * Modal enterprise per inserimento/modifica manuale dei booster giocatore.
 * Booster eFootball: sempre attivi (nome, effetto).
 * Usato in: pagina giocatore, gestione formazione (AssignModal), MissingDataModal (inline).
 * UX e i18n allineati al resto dell'app.
 */
export default function ManualBoostersModal({ boosters, setBoosters, onCancel, onSave, saving }) {
  const { t } = useTranslation()
  const list = Array.isArray(boosters) ? boosters : []

  const add = () => setBoosters([...list, { name: '', effect: '' }])
  const remove = (idx) => setBoosters(list.filter((_, i) => i !== idx))
  const change = (idx, key, value) =>
    setBoosters(list.map((b, i) => (i === idx ? { ...(b || {}), [key]: value } : b)))

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.25)',
    color: 'white'
  }
  const labelStyle = { fontSize: '12px', opacity: 0.75, marginBottom: '4px' }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2100,
        padding: '24px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))'
      }}
      onClick={onCancel}
    >
      <div
        className="neon-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: '24px',
          paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-purple)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{t('boostersSection')}</h2>
          <button
            onClick={onCancel}
            type="button"
            aria-label={t('cancel')}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ opacity: 0.75, fontSize: '13px' }}>{t('boostersList')}</div>
          <button
            type="button"
            onClick={add}
            className="btn secondary"
            style={{ padding: '10px 12px', fontSize: '13px', borderRadius: '10px' }}
            disabled={saving}
          >
            {t('addBooster')}
          </button>
        </div>

        {list.length === 0 ? (
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              opacity: 0.75
            }}
          >
            {t('boostersNotAvailable')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {list.map((b, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '14px',
                  background: 'rgba(255,255,255,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--neon-purple)' }}>
                    {t('boosters')} #{idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="btn secondary"
                    style={{
                      padding: '8px 10px',
                      fontSize: '12px',
                      borderRadius: '10px',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      color: '#fecaca'
                    }}
                    disabled={saving}
                  >
                    {t('remove')}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div>
                    <div style={labelStyle}>{t('boosterName')}</div>
                    <input
                      type="text"
                      value={String(b?.name ?? '')}
                      onChange={(e) => change(idx, 'name', e.target.value)}
                      placeholder={t('boosterName')}
                      style={inputStyle}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>{t('boosterEffect')}</div>
                    <input
                      type="text"
                      value={String(b?.effect ?? '')}
                      onChange={(e) => change(idx, 'effect', e.target.value)}
                      placeholder={t('boosterEffect')}
                      style={inputStyle}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn secondary"
            style={{ padding: '12px 16px', borderRadius: '10px' }}
            disabled={saving}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="btn primary"
            style={{ padding: '12px 16px', borderRadius: '10px' }}
            disabled={saving}
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
