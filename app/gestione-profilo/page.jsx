'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { Wallet } from 'lucide-react'

export default function GestioneProfiloPage() {
  const { lang } = useTranslation()

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

  return (
    <main style={{ padding: 'clamp(12px, 4vw, 24px)', minHeight: '100vh', maxWidth: '980px', margin: '0 auto' }}>
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
