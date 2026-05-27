'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { ArrowRight, BarChart3, MessageCircle, Shield, Sparkles, Wallet, X } from 'lucide-react'

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
        { href: '/?openAssistantChat=1', icon: MessageCircle, title: 'Hero Chat', text: 'Ask the AI coach what to improve and how to prepare the next match.' },
        { href: '/card-advisor-lab', icon: Sparkles, title: 'Card Advisor', text: 'Check if a new card really improves your team before spending in-game resources.' },
        { href: '/?openGameAnalysis=1', icon: BarChart3, title: 'Game Analysis', text: 'Turn match stats into clear priorities for attack, defence and passing.' },
        { href: '/contromisure-pre-partita', icon: Shield, title: 'Pre-match Plan', text: 'Generate countermeasures and enter the match with a tactical idea.' }
      ]
    : [
        { href: '/?openAssistantChat=1', icon: MessageCircle, title: 'Hero Chat', text: 'Chiedi al Coach AI cosa migliorare e come preparare la prossima partita.' },
        { href: '/card-advisor-lab', icon: Sparkles, title: 'Card Advisor', text: 'Controlla se una nuova carta migliora davvero la rosa prima di spendere risorse nel gioco.' },
        { href: '/?openGameAnalysis=1', icon: BarChart3, title: 'Analisi partita', text: 'Trasforma le statistiche in priorita chiare su attacco, difesa e passaggi.' },
        { href: '/contromisure-pre-partita', icon: Shield, title: 'Piano pre-partita', text: 'Genera contromisure ed entra in partita con un’idea tattica precisa.' }
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
      <section className="card hp-page-card">
        <a href="/" className="hp-close-button" aria-label={lang === 'en' ? 'Back to dashboard' : 'Torna alla dashboard'}>
          <X size={18} />
        </a>

        <div className="hp-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Wallet size={20} color="var(--neon-blue)" />
            <h1 className="neon-text" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800 }}>
              {pageTitle}
            </h1>
          </div>
          <a href="/" className="hp-dashboard-link">
            {lang === 'en' ? 'Back to dashboard' : 'Torna alla dashboard'}
          </a>
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
              <a key={item.title} href={item.href} className="hp-use-card">
                <Icon size={22} color="#ffcb05" />
                <strong>{item.title}</strong>
                <p>{item.text}</p>
                <span className="hp-card-link">
                  {lang === 'en' ? 'Open' : 'Apri'}
                  <ArrowRight size={13} />
                </span>
              </a>
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

        <div className="hp-actions">
          <a href="/" className="hp-back-link">
            {lang === 'en' ? 'Back to dashboard' : 'Torna alla dashboard'}
          </a>
          <a href="https://home.fromzerotohero.io/dashboard?usage" target="_blank" rel="noopener noreferrer" className="hp-buy-link">
            {buyLabel}
          </a>
        </div>
      </section>

      <style jsx>{`
        .hp-page-card {
          position: relative;
          padding: clamp(16px, 3vw, 24px);
        }

        .hp-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
          min-width: 0;
          padding-right: 44px;
        }

        .hp-close-button {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,0.78);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          text-decoration: none;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .hp-close-button:hover {
          transform: scale(1.04);
          color: #fff;
          background: rgba(0,212,255,0.12);
          border-color: rgba(0,212,255,0.35);
        }

        .hp-dashboard-link,
        .hp-back-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 8px 13px;
          border-radius: 999px;
          border: 1px solid rgba(0,212,255,0.24);
          color: var(--neon-blue);
          background: rgba(0,212,255,0.07);
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
        }

        .hp-use-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .hp-use-card {
          display: block;
          padding: 16px;
          border: 1px solid rgba(0,212,255,0.18);
          border-radius: 16px;
          background:
            radial-gradient(circle at 0% 0%, rgba(255,203,5,0.10), transparent 42%),
            linear-gradient(145deg, rgba(0,212,255,0.08), rgba(255,255,255,0.03));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
          text-decoration: none;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .hp-use-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,203,5,0.42);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 28px rgba(0,212,255,0.10);
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

        .hp-card-link {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #ffcb05;
          font-size: 12px;
          font-weight: 900;
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

        .hp-actions {
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hp-buy-link {
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

        @media (max-width: 640px) {
          .hp-title-row {
            display: block;
            padding-right: 42px;
          }

          .hp-dashboard-link {
            display: none;
          }

          .hp-actions {
            display: grid;
          }

          .hp-back-link,
          .hp-buy-link {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}
