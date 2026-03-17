'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Info, X } from 'lucide-react'

const EMPTY_FORM = {
  first_name: '',
  ai_name: '',
  current_division: '',
  hours_per_week: '',
  connection_quality: '',
  slow_opponent_connection_issues: '',
  input_delay: '',
  pass_level: '',
  smart_assist: '',
  platform: '',
  favourite_player_name: '',
  ai_weak_point: '',
  ai_learn_goals: '',
  ai_notes: ''
}

const YES_NO = [
  { value: 'yes', labelKey: 'aiInfoYes' },
  { value: 'no', labelKey: 'aiInfoNo' }
]
const YES_NO_SOMETIMES = [
  { value: 'yes', labelKey: 'aiInfoYes' },
  { value: 'no', labelKey: 'aiInfoNo' },
  { value: 'sometimes', labelKey: 'aiInfoSometimes' }
]
const CONNECTION_QUALITY = [
  { value: 'good', labelKey: 'aiInfoConnectionGood' },
  { value: 'unstable', labelKey: 'aiInfoConnectionUnstable' },
  { value: 'lag', labelKey: 'aiInfoConnectionLag' }
]
const PASS_LEVEL = [
  { value: 'pa1', labelKey: 'aiInfoPA1' },
  { value: 'pa2', labelKey: 'aiInfoPA2' },
  { value: 'pa3', labelKey: 'aiInfoPA3' }
]
const PLATFORM = [
  { value: 'console', labelKey: 'aiInfoPlatformConsole' },
  { value: 'pc', labelKey: 'aiInfoPlatformPC' },
  { value: 'mobile', labelKey: 'aiInfoPlatformMobile' },
  { value: 'other', labelKey: 'aiInfoPlatformOther' }
]
const WEAK_POINT = [
  { value: 'defence', labelKey: 'aiInfoWeakPointDefence' },
  { value: 'attack', labelKey: 'aiInfoWeakPointAttack' },
  { value: 'set_pieces', labelKey: 'aiInfoWeakPointSetPieces' },
  { value: 'transitions', labelKey: 'aiInfoWeakPointTransitions' },
  { value: 'final_minutes', labelKey: 'aiInfoWeakPointFinalMinutes' }
]

export default function AiInfoModal({ show, onClose }) {
  const { t, lang } = useTranslation()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!show) return
    setLoading(true)
    setError(null)
    try {
      const { data: session } = await supabase?.auth.getSession() ?? {}
      if (!session?.session?.access_token) {
        setForm(EMPTY_FORM)
        setLoading(false)
        return
      }
      const res = await fetch('/api/supabase/save-ai-info', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        }
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.profile) {
        const p = data.profile
        setForm({
          first_name: p.first_name ?? '',
          ai_name: p.ai_name ?? '',
          current_division: p.current_division ?? '',
          hours_per_week: p.hours_per_week != null ? String(p.hours_per_week) : '',
          connection_quality: p.connection_quality ?? '',
          slow_opponent_connection_issues: p.slow_opponent_connection_issues ?? '',
          input_delay: p.input_delay ?? '',
          pass_level: p.pass_level ?? '',
          smart_assist: p.smart_assist ?? '',
          platform: p.platform ?? '',
          favourite_player_name: p.favourite_player_name ?? '',
          ai_weak_point: p.ai_weak_point ?? '',
          ai_learn_goals: p.ai_learn_goals ?? '',
          ai_notes: p.ai_notes ?? ''
        })
      } else {
        setForm(EMPTY_FORM)
      }
    } catch (e) {
      setError(t('aiInfoError') || 'Error')
      setForm(EMPTY_FORM)
    } finally {
      setLoading(false)
    }
  }, [show, lang, t])

  useEffect(() => {
    if (show) {
      setSuccess(false)
      fetchProfile()
    }
  }, [show, fetchProfile])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: session } = await supabase?.auth.getSession() ?? {}
      if (!session?.session?.access_token) {
        setError(t('aiInfoError') || 'Error')
        setSaving(false)
        return
      }
      const body = {}
      Object.keys(form).forEach(k => {
        const v = form[k]
        if (k === 'hours_per_week') {
          const n = v !== undefined && v !== '' ? parseInt(String(v), 10) : null
          body[k] = Number.isFinite(n) ? n : null
        } else if (v !== undefined && String(v).trim() !== '') {
          body[k] = k === 'ai_notes' ? String(v).trim() : String(v).trim()
        } else {
          body[k] = null
        }
      })
      const res = await fetch('/api/supabase/save-ai-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify(body)
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setSuccess(true)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        setTimeout(() => {
          setSuccess(false)
          onClose?.()
        }, 1500)
      } else {
        setError(data.error || t('aiInfoError') || 'Error')
      }
    } catch (e) {
      setError(t('aiInfoError') || 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (!show) return null

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '16px'
  }
  const boxStyle = {
    background: 'var(--card-bg, #1a1a2e)',
    border: '2px solid #00d4ff',
    borderRadius: '12px',
    maxWidth: '560px',
    width: '100%',
    maxHeight: 'calc(100vh - 100px)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  }
  const headerStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  }
  const scrollStyle = {
    overflowY: 'auto',
    padding: '20px',
    flex: 1
  }
  const sectionStyle = { marginBottom: '24px' }
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.85)' }
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.2)',
    color: '#fff',
    fontSize: '14px',
    boxSizing: 'border-box'
  }
  const radioGroupStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }
  const radioLabelStyle = { display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }

  return (
    <div
      style={modalStyle}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} style={{ color: 'var(--neon-blue)' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('aiInfoTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '4px' }}
            aria-label={t('close')}
          >
            <X size={22} />
          </button>
        </div>
        <div style={scrollStyle}>
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>{t('loading')}...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                {t('aiInfoDescription')}
              </p>

              {/* Sezione: Gioco e connessione */}
              <div style={sectionStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--neon-blue)' }}>{t('aiInfoSectionConnection')}</h3>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoConnectionQuality')}</label>
                  <div style={radioGroupStyle}>
                    {CONNECTION_QUALITY.map(opt => (
                      <label key={opt.value} style={radioLabelStyle}>
                        <input
                          type="radio"
                          name="connection_quality"
                          value={opt.value}
                          checked={form.connection_quality === opt.value}
                          onChange={() => handleChange('connection_quality', opt.value)}
                        />
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoSlowOpponent')}</label>
                  <div style={radioGroupStyle}>
                    {YES_NO_SOMETIMES.map(opt => (
                      <label key={opt.value} style={radioLabelStyle}>
                        <input type="radio" name="slow_opponent" value={opt.value} checked={form.slow_opponent_connection_issues === opt.value} onChange={() => handleChange('slow_opponent_connection_issues', opt.value)} />
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoInputDelay')}</label>
                  <div style={radioGroupStyle}>
                    {YES_NO_SOMETIMES.map(opt => (
                      <label key={opt.value} style={radioLabelStyle}>
                        <input type="radio" name="input_delay" value={opt.value} checked={form.input_delay === opt.value} onChange={() => handleChange('input_delay', opt.value)} />
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoPassLevel')}</label>
                  <div style={radioGroupStyle}>
                    {PASS_LEVEL.map(opt => (
                      <label key={opt.value} style={radioLabelStyle}>
                        <input type="radio" name="pass_level" value={opt.value} checked={form.pass_level === opt.value} onChange={() => handleChange('pass_level', opt.value)} />
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoSmartAssist')}</label>
                  <div style={radioGroupStyle}>
                    {YES_NO.map(opt => (
                      <label key={opt.value} style={radioLabelStyle}>
                        <input type="radio" name="smart_assist" value={opt.value} checked={form.smart_assist === opt.value} onChange={() => handleChange('smart_assist', opt.value)} />
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoPlatform')}</label>
                  <div style={radioGroupStyle}>
                    {PLATFORM.map(opt => (
                      <label key={opt.value} style={radioLabelStyle}>
                        <input type="radio" name="platform" value={opt.value} checked={form.platform === opt.value} onChange={() => handleChange('platform', opt.value)} />
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contesto e preferenze */}
              <div style={sectionStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--neon-blue)' }}>{t('aiInfoSectionContext')}</h3>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoDivision')}</label>
                  <input type="text" style={inputStyle} value={form.current_division} onChange={e => handleChange('current_division', e.target.value)} placeholder="Div 1–10" maxLength={255} />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoHoursPerWeek')}</label>
                  <input type="number" style={inputStyle} value={form.hours_per_week} onChange={e => handleChange('hours_per_week', e.target.value)} min={0} max={168} placeholder="0–168" />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoFavouritePlayer')}</label>
                  <input type="text" style={inputStyle} value={form.favourite_player_name} onChange={e => handleChange('favourite_player_name', e.target.value)} maxLength={255} />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoWeakPoint')}</label>
                  <div style={radioGroupStyle}>
                    {WEAK_POINT.map(opt => (
                      <label key={opt.value} style={radioLabelStyle}>
                        <input type="radio" name="ai_weak_point" value={opt.value} checked={form.ai_weak_point === opt.value} onChange={() => handleChange('ai_weak_point', opt.value)} />
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                  <input type="text" style={{ ...inputStyle, marginTop: '8px' }} value={form.ai_weak_point && !WEAK_POINT.find(o => o.value === form.ai_weak_point) ? form.ai_weak_point : ''} onChange={e => handleChange('ai_weak_point', e.target.value)} placeholder={lang === 'en' ? 'Or other (free text)' : 'Oppure altro (testo libero)'} maxLength={255} />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoLearnGoals')}</label>
                  <input type="text" style={inputStyle} value={form.ai_learn_goals} onChange={e => handleChange('ai_learn_goals', e.target.value)} maxLength={255} />
                </div>
              </div>

              {/* Nomi */}
              <div style={sectionStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--neon-blue)' }}>{t('aiInfoSectionNames')}</h3>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoFirstName')}</label>
                  <input type="text" style={inputStyle} value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} maxLength={255} />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>{t('aiInfoAiName')}</label>
                  <input type="text" style={inputStyle} value={form.ai_name} onChange={e => handleChange('ai_name', e.target.value)} maxLength={255} />
                </div>
              </div>

              {/* Note */}
              <div style={sectionStyle}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--neon-blue)' }}>{t('aiInfoSectionNotes')}</h3>
                <label style={labelStyle}>{t('aiInfoNotes')}</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.ai_notes} onChange={e => handleChange('ai_notes', e.target.value)} maxLength={500} />
              </div>

              {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
              {success && <p style={{ color: 'var(--neon-blue)', fontSize: '13px', marginBottom: '12px' }}>{t('aiInfoSaved')}</p>}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '16px' }}>
                <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>
                  {t('close')}
                </button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? (t('saving') || '...') : t('aiInfoSave')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
