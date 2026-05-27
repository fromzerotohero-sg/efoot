'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { BarChart3, MessageCircle, Shield, Sparkles, Wallet } from 'lucide-react'

export default function GestioneProfiloPage() {
  const { lang } = useTranslation()

  const pageTitle = lang === 'en' ? 'Use your Hero Points' : 'Usa i tuoi Hero Points'
  const buyLabel = lang === 'en' ? 'Buy Hero Points' : 'Acquista Hero Points'
  const tableHeaderService = lang === 'en' ? 'Tool' : 'Strumento'
  const tableHeaderCost = lang === 'en' ? 'HP' : 'HP'
  const refundDisclaimerLine1 = lang === 'en'
    ? 'If a platform error prevents an analysis from completing, the HP are automatically returned.'
    : 'Se un errore della piattaforma blocca un’analisi, gli HP vengono riaccreditati automaticamente.'
  const refundDisclaimerLine2 = lang === 'en'
    ? 'Use them when you want a clear answer, a card decision or a tactical plan.'
    : 'Usali quando vuoi una risposta chiara, una scelta sulle carte o un piano tattico.'

  const highlights = lang === 'en'
    ? [
        { icon: MessageCircle, title: 'Hero Chat', text: 'Ask the AI coach what to improve and how to prepare the next match.' },
        { icon: Sparkles, title: 'Card Advisor', text: 'Check if a new card really improves your team before spending in-game resources.' },
        { icon: BarChart3, title: 'Game Analysis', text: 'Turn match stats into clear priorities for attack, defence and passing.' },
        { icon: Shield, title: 'Pre-match Plan', text: 'Generate countermeasures and enter the match with a tactical idea.' }
      ]
    : [
        { icon: MessageCircle, title: 'Hero Chat', text: 'Chiedi al Coach AI cosa migliorare e come preparare la prossima partita.' },
        { icon: Sparkles, title: 'Card Advisor', text: 'Controlla se una nuova carta migliora davvero la rosa prima di spendere risorse nel gioco.' },
        { icon: BarChart3, title: 'Analisi partita', text: 'Trasforma le statistiche in priorita chiare su attacco, difesa e passaggi.' },
        { icon: Shield, title: 'Piano pre-partita', text: 'Genera contromisure ed entra in partita con un’idea tattica precisa.' }
      ]

  const rows = lang === 'en'
    ? [
        { service: 'Hero Chat: ask the AI coach', cost: '2 HP' },
        { service: 'Card Advisor: evaluate a new card', cost: '2 HP' },
        { service: 'Match analysis', cost: '2 HP' },
        { service: 'Game stats extraction', cost: '2-4 HP' },
        { service: 'Pre-match countermeasures', cost: '2 HP' },
        { service: 'Player or coach extraction', cost: '2 HP' },
        { service: 'Live Coach start', cost: '2 HP' },
        { service: 'Live Coach extra minute', cost: '5 HP/min' }
      ]
    : [
        { service: 'Hero Chat: chiedi al Coach AI', cost: '2 HP' },
        { service: 'Card Advisor: valuta una nuova carta', cost: '2 HP' },
        { service: 'Analisi partita', cost: '2 HP' },
        { service: 'Estrazione statistiche di gioco', cost: '2-4 HP' },
        { service: 'Contromisure pre-partita', cost: '2 HP' },
        { service: 'Estrazione giocatore o allenatore', cost: '2 HP' },
        { service: 'Live Coach avvio', cost: '2 HP' },
        { service: 'Live Coach minuto extra', cost: '5 HP/min' }
      ]

  return (
    <main style={{ padding: 'clamp(12px, 4vw, 24px)', minHeight: '100vh', maxWidth: '980px', margin: '0 auto' }}>
      <section className="card" style={{ padding: 'clamp(16px, 3vw, 24px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', minWidth: 0 }}>
          <Wallet size={20} color="var(--neon-blue)" />
          <h1 className="neon-text" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800 }}>
            {pageTitle}
          </h1>
        </div>

        <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.74)', lineHeight: 1.5 }}>
          {lang === 'en'
            ? 'Hero Points are for the moments where you want help from the coach: a better card choice, a match plan, or a clear next step.'
            : 'Gli Hero Points servono quando vuoi un aiuto concreto dal Coach: scegliere meglio una carta, preparare un match o capire la prossima cosa da migliorare.'}
        </p>

        <div className="hp-use-grid">
          {highlights.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="hp-use-card">
                <Icon size={22} color="#ffcb05" />
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            )
          })}
        </div>

        <div className="hp-cost-table">
          <div className="hp-cost-head">
            <span>{tableHeaderService}</span>
            <span>{tableHeaderCost}</span>
          </div>

          {rows.map((row, idx) => (
            <div key={`${row.service}-${idx}`} className="hp-cost-row">
              <span>{row.service}</span>
              <strong>{row.cost}</strong>
            </div>
          ))}
        </div>

        <p className="hp-note">
          {refundDisclaimerLine1}
          <br />
          {refundDisclaimerLine2}
        </p>

        <a href="https://home.fromzerotohero.io/dashboard?usage" target="_blank" rel="noopener noreferrer" className="hp-buy-link">
          {buyLabel}
        </a>
      </section>

      <style jsx>{`
        .hp-use-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .hp-use-card {
          padding: 16px;
          border: 1px solid rgba(0,212,255,0.18);
          border-radius: 16px;
          background:
            radial-gradient(circle at 0% 0%, rgba(255,203,5,0.10), transparent 42%),
            linear-gradient(145deg, rgba(0,212,255,0.08), rgba(255,255,255,0.03));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .hp-use-card strong {
          display: block;
          margin-top: 10px;
          color: #fff;
          font-size: 15px;
        }

        .hp-use-card p {
          margin: 6px 0 0;
          color: rgba(255,255,255,0.68);
          font-size: 13px;
          line-height: 1.45;
        }

        .hp-cost-table {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          overflow: hidden;
        }

        .hp-cost-head,
        .hp-cost-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
        }

        .hp-cost-head {
          background: rgba(0,212,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-weight: 800;
          font-size: 13px;
          color: rgba(255,255,255,0.88);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .hp-cost-row {
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .hp-cost-row:last-child {
          border-bottom: none;
        }

        .hp-cost-row span {
          color: rgba(255,255,255,0.92);
          font-size: clamp(13px, 2.7vw, 15px);
          overflow-wrap: anywhere;
        }

        .hp-cost-row strong {
          color: #ffcb05;
          white-space: nowrap;
          font-size: clamp(13px, 2.7vw, 15px);
        }

        .hp-note {
          margin: 12px 0 0;
          color: rgba(255,255,255,0.72);
          font-size: clamp(12px, 2.4vw, 13px);
          line-height: 1.45;
        }

        .hp-buy-link {
          margin-top: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 10px 16px;
          background: var(--neon-orange);
          color: #000;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 900;
        }
      `}</style>
    </main>
  )
}
