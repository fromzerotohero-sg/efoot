'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { Wallet, RefreshCw, Coins } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function GestioneProfiloPage() {
  const { lang } = useTranslation()
  const [bankLoading, setBankLoading] = React.useState(true)
  const [bankError, setBankError] = React.useState('')
  const [usage, setUsage] = React.useState(null)
  const [transactions, setTransactions] = React.useState([])

  const pageTitle = lang === 'en' ? 'Analysis Cost' : 'Costo analisi'
  const buyLabel = lang === 'en' ? 'Buy Hero Points' : 'Acquista Hero Points'
  const tableHeaderService = lang === 'en' ? 'Service' : 'Servizio'
  const tableHeaderCost = lang === 'en' ? 'Cost' : 'Costo'
  const refundDisclaimerLine1 = lang === 'en'
    ? 'Credits refund: if consumption fails due to a platform or AI provider technical error, credits are automatically refunded.'
    : 'Rimborso crediti: se il consumo fallisce per errore tecnico della piattaforma o del provider AI, i crediti vengono riaccreditati automaticamente.'
  const refundDisclaimerLine2 = lang === 'en'
    ? 'No refund for invalid input or user-side interruptions.'
    : 'Nessun rimborso per errori dovuti a input non validi o interruzioni lato utente.'
  const bankTitle = lang === 'en' ? 'HP Bank' : 'Banca HP'
  const bankSubtitle = lang === 'en'
    ? 'Here you can see where Hero Points were credited and spent.'
    : 'Qui vedi dove sono stati accreditati e spesi gli Hero Points.'

  const rows = lang === 'en'
    ? [
        { service: 'AI assistant chat', cost: '2 HP' },
        { service: 'Match analysis', cost: '2 HP' },
        { service: 'Player extraction', cost: '2 HP' },
        { service: 'Coach extraction', cost: '2 HP' },
        { service: 'Match data extraction', cost: '2 HP' },
        { service: 'Formation extraction', cost: '2 HP' },
        { service: 'Countermeasures generation', cost: '2 HP' },
        { service: 'Game stats extraction', cost: '2-4 HP' },
        { service: 'Live Coach (start)', cost: '2 HP' },
        { service: 'Live Coach (extra minute)', cost: '5 HP/min' }
      ]
    : [
        { service: 'Chat assistente AI', cost: '2 HP' },
        { service: 'Analisi partita', cost: '2 HP' },
        { service: 'Estrazione giocatore', cost: '2 HP' },
        { service: 'Estrazione allenatore', cost: '2 HP' },
        { service: 'Estrazione dati partita', cost: '2 HP' },
        { service: 'Estrazione formazione', cost: '2 HP' },
        { service: 'Generazione contromisure', cost: '2 HP' },
        { service: 'Estrazione statistiche di gioco', cost: '2-4 HP' },
        { service: 'Live Coach (avvio)', cost: '2 HP' },
        { service: 'Live Coach (minuto extra)', cost: '5 HP/min' }
      ]

  React.useEffect(() => {
    const loadBank = async () => {
      try {
        setBankError('')
        let token = localStorage.getItem('auth_token')
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token) {
          setBankLoading(false)
          return
        }

        const headers = { Authorization: `Bearer ${token}` }
        const [usageRes, txRes] = await Promise.all([
          fetch('/api/credits/usage', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            cache: 'no-store'
          }),
          fetch('/api/credits/transactions?limit=12', { headers, cache: 'no-store' })
        ])
        const usagePayload = await usageRes.json().catch(() => null)
        const txPayload = await txRes.json().catch(() => null)
        if (usageRes.ok) setUsage(usagePayload)
        if (txRes.ok) setTransactions(Array.isArray(txPayload?.transactions) ? txPayload.transactions : [])
      } catch (err) {
        setBankError(err?.message || (lang === 'en' ? 'Unable to load HP bank.' : 'Impossibile caricare la banca HP.'))
      } finally {
        setBankLoading(false)
      }
    }

    loadBank()
  }, [lang])

  const formatTxDescription = (tx) => {
    const text = String(tx?.description || '')
    if (text === 'Daily spin reward') return lang === 'en' ? 'Daily wheel reward' : 'Premio ruota giornaliera'
    if (text.toLowerCase().includes('refund')) return lang === 'en' ? 'Credit refund' : 'Rimborso crediti'
    if (!text) return lang === 'en' ? 'HP movement' : 'Movimento HP'
    return text
  }

  const formatDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <main style={{ padding: 'clamp(12px, 4vw, 24px)', minHeight: '100vh', maxWidth: '980px', margin: '0 auto' }}>
      <section id="movimenti-hp" className="card" style={{ padding: 'clamp(16px, 3vw, 24px)', marginBottom: '18px', scrollMarginTop: '90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', minWidth: 0 }}>
          <Coins size={21} color="#ffcb05" />
          <h1 className="neon-text" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700 }}>
            {bankTitle}
          </h1>
        </div>
        <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>
          {bankSubtitle}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '14px', border: '1px solid rgba(255,203,5,0.28)', borderRadius: '14px', background: 'rgba(255,203,5,0.08)' }}>
            <span style={{ display: 'block', color: 'rgba(255,255,255,0.62)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
              {lang === 'en' ? 'Available HP' : 'HP disponibili'}
            </span>
            <strong style={{ display: 'block', marginTop: '4px', color: '#ffcb05', fontSize: '30px', lineHeight: 1 }}>
              {bankLoading ? '...' : Number(usage?.balance_remaining || 0)}
            </strong>
          </div>
          <div style={{ padding: '14px', border: '1px solid rgba(0,212,255,0.22)', borderRadius: '14px', background: 'rgba(0,212,255,0.06)' }}>
            <span style={{ display: 'block', color: 'rgba(255,255,255,0.62)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>
              {lang === 'en' ? 'Used this period' : 'Usati nel periodo'}
            </span>
            <strong style={{ display: 'block', marginTop: '4px', color: 'var(--neon-blue)', fontSize: '30px', lineHeight: 1 }}>
              {bankLoading ? '...' : Number(usage?.credits_used || 0)}
            </strong>
          </div>
        </div>

        <h2 style={{ margin: '0 0 10px', color: '#fff', fontSize: '18px' }}>
          {lang === 'en' ? 'Recent movements' : 'Movimenti recenti'}
        </h2>
        {bankLoading && (
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'rgba(255,255,255,0.68)' }}>
            <RefreshCw size={15} className="spin" />
            {lang === 'en' ? 'Loading HP bank...' : 'Caricamento banca HP...'}
          </p>
        )}
        {!bankLoading && bankError && <p style={{ color: '#ff8b8b', margin: 0 }}>{bankError}</p>}
        {!bankLoading && !bankError && transactions.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.62)', margin: 0 }}>
            {lang === 'en' ? 'No HP movement yet.' : 'Ancora nessun movimento HP.'}
          </p>
        )}
        {!bankLoading && !bankError && transactions.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {transactions.map((tx) => {
              const amount = Number(tx?.amount || 0)
              const positive = amount >= 0
              return (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)' }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', color: '#fff', fontSize: '14px' }}>{formatTxDescription(tx)}</strong>
                    <small style={{ display: 'block', color: 'rgba(255,255,255,0.54)', marginTop: '2px' }}>{formatDate(tx.created_at)}</small>
                  </div>
                  <strong style={{ color: positive ? '#86efac' : '#ffb4b4', whiteSpace: 'nowrap' }}>
                    {positive ? '+' : ''}{amount} HP
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', minWidth: 0 }}>
          <Wallet size={20} color="var(--neon-blue)" />
          <h1 className="neon-text" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700 }}>
            {pageTitle}
          </h1>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: '12px',
            padding: '12px 14px',
            background: 'rgba(0,212,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            fontWeight: 700,
            fontSize: '14px'
          }}>
            <span>{tableHeaderService}</span>
            <span>{tableHeaderCost}</span>
          </div>

          {rows.map((row, idx) => (
            <div
              key={`${row.service}-${idx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '12px',
                padding: '12px 14px',
                borderBottom: idx < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                alignItems: 'center'
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: 'clamp(13px, 2.7vw, 15px)', overflowWrap: 'anywhere' }}>
                {row.service}
              </span>
              <span style={{ color: 'var(--neon-blue)', fontWeight: 700, fontSize: 'clamp(13px, 2.7vw, 15px)', whiteSpace: 'nowrap' }}>
                {row.cost}
              </span>
            </div>
          ))}
        </div>
        <p
          style={{
            marginTop: '12px',
            marginBottom: 0,
            color: 'rgba(255,255,255,0.72)',
            fontSize: 'clamp(12px, 2.4vw, 13px)',
            lineHeight: 1.45
          }}
        >
          {refundDisclaimerLine1}
          <br />
          {refundDisclaimerLine2}
        </p>

        <a
          href="https://home.fromzerotohero.io/dashboard?usage"
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            marginTop: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            padding: '10px 16px',
            background: 'var(--neon-orange)',
            color: '#000',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 700
          }}
        >
          {buyLabel}
        </a>
      </section>
    </main>
  )
}
