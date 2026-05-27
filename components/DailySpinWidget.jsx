'use client'

import React from 'react'
import { Gift, Sparkles, Zap, X, RotateCw } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

const MODAL_DISMISS_PREFIX = 'daily_spin_remind_later_'
const RECHARGE_URL = 'https://home.fromzerotohero.io/dashboard?usage'

function todayRomeDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

export default function DailySpinWidget({ lang = 'it' }) {
  const [loading, setLoading] = React.useState(true)
  const [status, setStatus] = React.useState(null)
  const [open, setOpen] = React.useState(false)
  const [claiming, setClaiming] = React.useState(false)
  const [reward, setReward] = React.useState(null)
  const [error, setError] = React.useState('')

  const isEn = lang === 'en'

  const loadStatus = React.useCallback(async () => {
    try {
      setError('')
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) {
        setLoading(false)
        return
      }
      const res = await fetch('/api/daily-spin', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Unable to load daily spin')
      setStatus(data)
    } catch (err) {
      setError(err?.message || 'Unable to load daily spin')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadStatus()
  }, [loadStatus])

  React.useEffect(() => {
    if (loading || !status?.available) return
    const dayKey = status.spin_date || todayRomeDateKey()
    const dismissed = localStorage.getItem(`${MODAL_DISMISS_PREFIX}${dayKey}`) === '1'
    if (!dismissed) setOpen(true)
  }, [loading, status])

  const claimReward = async () => {
    if (claiming) return
    setClaiming(true)
    setError('')
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(isEn ? 'Session expired' : 'Sessione scaduta')

      const res = await fetch('/api/daily-spin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Unable to claim reward')

      const amount = Number(data?.reward_amount || 0)
      setReward(amount)
      setStatus((prev) => ({
        ...(prev || {}),
        available: false,
        claimed_today: true,
        spin_date: data?.spin_date || todayRomeDateKey(),
        reward_amount: amount,
        gifted_month_total: Number(prev?.gifted_month_total || 0) + amount
      }))
      localStorage.removeItem(`${MODAL_DISMISS_PREFIX}${data?.spin_date || todayRomeDateKey()}`)
      window.dispatchEvent(new CustomEvent('credits-accredited', { detail: { amount, source: 'daily-spin' } }))
      window.dispatchEvent(new CustomEvent('credits-consumed'))
    } catch (err) {
      setError(err?.message || 'Unable to claim reward')
    } finally {
      setClaiming(false)
    }
  }

  const remindLater = () => {
    const dayKey = status?.spin_date || todayRomeDateKey()
    localStorage.setItem(`${MODAL_DISMISS_PREFIX}${dayKey}`, '1')
    setOpen(false)
  }

  return (
    <>
      <div className="neon-card" style={{ padding: '16px', marginBottom: '14px', border: '1px solid rgba(255,203,5,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffcb05', fontWeight: 800 }}>
              <Gift size={16} />
              {isEn ? 'Daily Spin' : 'Ruota Giornaliera'}
            </div>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.72)', fontSize: '13px' }}>
              {loading
                ? (isEn ? 'Checking reward status...' : 'Controllo stato premio...')
                : status?.available
                  ? (isEn ? 'Spin now and get today\'s HP bonus.' : 'Gira ora e ottieni il bonus HP di oggi.')
                  : (isEn ? 'Already used today. Come back tomorrow.' : 'Gia usata oggi. Torna domani.')}
            </p>
            {Number.isFinite(Number(status?.gifted_month_total)) && (
              <p style={{ margin: '6px 0 0', color: 'rgba(255,203,5,0.82)', fontSize: '12px', fontWeight: 700 }}>
                {isEn
                  ? `Gifted this month: ${Number(status.gifted_month_total)} HP`
                  : `HP omaggio questo mese: ${Number(status.gifted_month_total)} HP`}
              </p>
            )}
          </div>
          {status?.available ? (
            <button className="btn primary" type="button" onClick={() => setOpen(true)}>
              {isEn ? 'Spin now' : 'Gira ora'}
            </button>
          ) : (
            <a href={RECHARGE_URL} target="_blank" rel="noopener noreferrer" className="btn secondary">
              {isEn ? 'Where to spend HP' : 'Dove spendere HP'}
            </a>
          )}
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10060, background: 'rgba(0,0,0,0.72)', display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div className="neon-card" style={{ width: 'min(560px, 96vw)', padding: '22px', position: 'relative', border: '1px solid rgba(255,203,5,0.46)' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer' }}
              aria-label={isEn ? 'Close' : 'Chiudi'}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(255,203,5,0.12)', border: '1px solid rgba(255,203,5,0.34)', color: '#ffcb05', fontWeight: 800, fontSize: '12px' }}>
              <Sparkles size={14} />
              {isEn ? 'Daily login reward' : 'Premio login giornaliero'}
            </div>

            <h3 style={{ margin: '12px 0 6px', color: '#fff', fontSize: '28px', lineHeight: 1.1 }}>
              {reward
                ? (isEn ? `Great! +${reward} HP credited` : `Grande! +${reward} HP accreditati`)
                : (isEn ? 'Spin and win your HP now' : 'Gira e vinci i tuoi HP ora')}
            </h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)' }}>
              {reward
                ? (isEn ? 'Your HP balance is updated in the top bar.' : 'Il saldo HP e stato aggiornato nella barra in alto.')
                : (isEn ? 'Use your reward for Hero Chat, Card Advisor and advanced analysis.' : 'Usa il premio per Hero Chat, Card Advisor e analisi avanzate.')}
            </p>

            {error && <p style={{ color: '#ff8b8b', marginTop: '12px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
              {!reward ? (
                <>
                  <button type="button" className="btn primary" onClick={claimReward} disabled={claiming}>
                    {claiming ? <RotateCw size={16} className="spin" /> : <Zap size={16} />}
                    <span style={{ marginLeft: '6px' }}>{isEn ? 'Spin' : 'Gira'}</span>
                  </button>
                  <button type="button" className="btn secondary" onClick={remindLater} disabled={claiming}>
                    {isEn ? 'Remind me later' : 'Ricordamelo piu tardi'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn primary" onClick={() => setOpen(false)}>
                  {isEn ? 'Got it' : 'Ho capito'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
