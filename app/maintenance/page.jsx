'use client'

import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Brain, Cpu, KeyRound, Sparkles, Zap } from 'lucide-react'

const LEARNING_STEPS = [
  'Lettura patch notes eFootball 2027…',
  'Mappatura nuove meccaniche di movimento…',
  'Ricalibrazione build, stili e sinergie rosa…',
  'Addestramento contromisure su nuovi moduli…',
  'Validazione consigli Coach su meta aggiornata…',
]

export default function MaintenancePage() {
  const router = useRouter()
  const [key, setKey] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState(null)
  const [showKeyForm, setShowKeyForm] = React.useState(false)
  const [stepIndex, setStepIndex] = React.useState(0)
  const [progress, setProgress] = React.useState(12)

  React.useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((current) => (current + 1) % LEARNING_STEPS.length)
    }, 3200)

    const progressTimer = setInterval(() => {
      setProgress((current) => {
        if (current >= 94) return 12
        return current + Math.random() * 4 + 1
      })
    }, 1800)

    return () => {
      clearInterval(stepTimer)
      clearInterval(progressTimer)
    }
  }, [])

  const handleUnlock = async (event) => {
    event.preventDefault()
    setMessage(null)

    const trimmedKey = key.trim()
    if (!trimmedKey) {
      setMessage({ type: 'error', text: 'Inserisci la chiave di accesso.' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/maintenance/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ key: trimmedKey }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          payload?.error === 'Invalid access key'
            ? 'Chiave non valida.'
            : payload?.error || "Impossibile sbloccare l'accesso.",
        )
      }

      setMessage({ type: 'success', text: 'Accesso sbloccato.' })
      setTimeout(() => router.replace('/'), 400)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Chiave non valida.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="maintenance-page">
      <div className="maintenance-bg" aria-hidden="true">
        <div className="maintenance-bg-glow maintenance-bg-glow--gold" />
        <div className="maintenance-bg-glow maintenance-bg-glow--cyan" />
        <div className="maintenance-grid" />
        <div className="maintenance-scanline" />
      </div>

      <div className="maintenance-hero-wrap" aria-hidden="true">
        <Image
          src="/maintenance-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="maintenance-hero-image"
        />
        <div className="maintenance-hero-vignette" />
        <div className="maintenance-hero-shimmer" />
      </div>

      <div className="maintenance-shell">
        <header className="maintenance-top">
          <div className="maintenance-live-pill">
            <span className="maintenance-live-dot" />
            Addestramento IA in corso
          </div>
          <p className="maintenance-window">12 – 17 agosto · eFootball 2027</p>
        </header>

        <section className="maintenance-panel">
          <div className="maintenance-panel-head">
            <div className="maintenance-icon-ring">
              <Brain size={28} />
              <span className="maintenance-icon-orbit" />
            </div>
            <div>
              <p className="maintenance-kicker">Coach AI · upgrade gameplay</p>
              <h1 className="maintenance-title">
                La nostra IA sta imparando il{' '}
                <span className="maintenance-title-accent">nuovo gameplay</span>
              </h1>
            </div>
          </div>

          <p className="maintenance-lead">
            Stiamo aggiornando motori, regole tattiche e logica Coach sulle nuove
            meccaniche di gioco. Quando torniamo online, i consigli saranno allineati
            al meta reale — non a quello vecchio.
          </p>

          <div className="maintenance-signal-row">
            <div className="maintenance-signal">
              <Cpu size={16} />
              <span>Nuove meccaniche</span>
            </div>
            <div className="maintenance-signal">
              <Zap size={16} />
              <span>Nuove strategie</span>
            </div>
            <div className="maintenance-signal">
              <Sparkles size={16} />
              <span>Coach più forte</span>
            </div>
          </div>

          <div className="maintenance-learning-card">
            <div className="maintenance-learning-top">
              <span>Pipeline di apprendimento</span>
              <strong>{Math.min(Math.round(progress), 94)}%</strong>
            </div>
            <div className="maintenance-progress-track">
              <div
                className="maintenance-progress-fill"
                style={{ width: `${Math.min(progress, 94)}%` }}
              />
              <div className="maintenance-progress-glow" />
            </div>
            <p className="maintenance-learning-step" key={stepIndex}>
              {LEARNING_STEPS[stepIndex]}
            </p>
          </div>

          <p className="maintenance-closer">
            Torneremo online con un Coach ancora più preciso sul campo.
          </p>
        </section>

        <footer className="maintenance-footer">
          {!showKeyForm ? (
            <button
              type="button"
              className="maintenance-team-toggle"
              onClick={() => setShowKeyForm(true)}
            >
              <KeyRound size={14} />
              Accesso team
            </button>
          ) : (
            <form className="maintenance-team-form" onSubmit={handleUnlock}>
              <label htmlFor="maintenance-key" className="maintenance-team-label">
                Chiave team
              </label>
              <div className="maintenance-team-row">
                <input
                  id="maintenance-key"
                  type="password"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="Inserisci chiave"
                  autoComplete="off"
                  disabled={loading}
                />
                <button type="submit" disabled={loading}>
                  {loading ? '...' : 'Entra'}
                </button>
              </div>
              {message ? (
                <p className={`maintenance-team-message maintenance-team-message--${message.type}`}>
                  {message.text}
                </p>
              ) : null}
            </form>
          )}
        </footer>
      </div>

      <style jsx>{`
        .maintenance-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: #03050c;
          color: #fff;
        }

        .maintenance-bg,
        .maintenance-hero-wrap {
          position: absolute;
          inset: 0;
        }

        .maintenance-bg-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.45;
          animation: maintenanceFloat 8s ease-in-out infinite;
        }

        .maintenance-bg-glow--gold {
          width: 420px;
          height: 420px;
          top: -80px;
          left: -60px;
          background: rgba(221, 166, 47, 0.22);
        }

        .maintenance-bg-glow--cyan {
          width: 520px;
          height: 520px;
          right: -120px;
          bottom: -120px;
          background: rgba(0, 212, 255, 0.16);
          animation-delay: -3s;
        }

        .maintenance-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 212, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(circle at center, black 20%, transparent 78%);
          opacity: 0.35;
        }

        .maintenance-scanline {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(0, 212, 255, 0.03) 48%,
            transparent 100%
          );
          background-size: 100% 6px;
          animation: maintenanceScan 6s linear infinite;
          pointer-events: none;
          opacity: 0.35;
        }

        :global(.maintenance-hero-image) {
          object-fit: cover;
          object-position: center 18%;
          animation: maintenanceHeroZoom 18s ease-in-out infinite alternate;
          transform: scale(1.02);
        }

        .maintenance-hero-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 20%, rgba(0, 212, 255, 0.08), transparent 34%),
            linear-gradient(180deg, rgba(3, 5, 12, 0.08) 0%, rgba(3, 5, 12, 0.42) 42%, rgba(3, 5, 12, 0.96) 100%);
        }

        .maintenance-hero-shimmer {
          position: absolute;
          inset: -20% 0;
          background: linear-gradient(
            115deg,
            transparent 35%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 65%
          );
          animation: maintenanceShimmer 7s ease-in-out infinite;
          pointer-events: none;
        }

        .maintenance-shell {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
          padding: clamp(20px, 4vw, 36px);
          max-width: 980px;
          margin: 0 auto;
        }

        .maintenance-top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .maintenance-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(221, 166, 47, 0.12);
          border: 1px solid rgba(221, 166, 47, 0.42);
          color: #ffd76a;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow: 0 0 24px rgba(221, 166, 47, 0.12);
        }

        .maintenance-live-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #ffd76a;
          box-shadow: 0 0 12px rgba(255, 215, 106, 0.9);
          animation: maintenancePulse 1.4s ease-in-out infinite;
        }

        .maintenance-window {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.62);
        }

        .maintenance-panel {
          margin-top: auto;
          padding: clamp(22px, 4vw, 34px);
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(8, 12, 28, 0.82) 0%, rgba(5, 8, 20, 0.92) 100%);
          border: 1px solid rgba(0, 212, 255, 0.22);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          animation: maintenancePanelIn 0.8s ease-out both;
        }

        .maintenance-panel-head {
          display: flex;
          gap: 18px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .maintenance-icon-ring {
          position: relative;
          flex: 0 0 auto;
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(0, 161, 166, 0.24), rgba(0, 212, 255, 0.12));
          border: 1px solid rgba(0, 212, 255, 0.35);
          color: #00d4ff;
          box-shadow: 0 0 30px rgba(0, 212, 255, 0.18);
        }

        .maintenance-icon-orbit {
          position: absolute;
          inset: -6px;
          border-radius: 24px;
          border: 1px solid rgba(0, 212, 255, 0.18);
          animation: maintenanceOrbit 3s linear infinite;
        }

        .maintenance-kicker {
          margin: 0 0 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(0, 212, 255, 0.82);
        }

        .maintenance-title {
          margin: 0;
          font-size: clamp(30px, 5vw, 52px);
          line-height: 1.02;
          font-weight: 900;
          text-wrap: balance;
        }

        .maintenance-title-accent {
          background: linear-gradient(135deg, #ffd76a 0%, #00d4ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .maintenance-lead {
          margin: 0 0 20px;
          max-width: 760px;
          font-size: clamp(15px, 2.2vw, 18px);
          line-height: 1.65;
          color: rgba(255, 255, 255, 0.78);
        }

        .maintenance-signal-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 22px;
        }

        .maintenance-signal {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          font-weight: 700;
        }

        .maintenance-learning-card {
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(0, 212, 255, 0.16);
          margin-bottom: 18px;
        }

        .maintenance-learning-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.58);
        }

        .maintenance-learning-top strong {
          color: #00d4ff;
          font-size: 14px;
        }

        .maintenance-progress-track {
          position: relative;
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 12px;
        }

        .maintenance-progress-fill {
          position: relative;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #00a1a6 0%, #00d4ff 55%, #ffd76a 100%);
          transition: width 1.2s ease;
          box-shadow: 0 0 18px rgba(0, 212, 255, 0.45);
        }

        .maintenance-progress-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
          animation: maintenanceProgressGlow 2.4s ease-in-out infinite;
        }

        .maintenance-learning-step {
          margin: 0;
          min-height: 1.4em;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.86);
          animation: maintenanceStepIn 0.45s ease both;
        }

        .maintenance-closer {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.72);
        }

        .maintenance-footer {
          display: flex;
          justify-content: center;
          padding-bottom: 4px;
        }

        .maintenance-team-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.55);
          font-size: 12px;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }

        .maintenance-team-toggle:hover {
          color: rgba(255, 255, 255, 0.82);
          border-color: rgba(0, 212, 255, 0.35);
          background: rgba(0, 212, 255, 0.06);
        }

        .maintenance-team-form {
          width: min(100%, 360px);
          padding: 14px;
          border-radius: 14px;
          background: rgba(5, 8, 20, 0.82);
          border: 1px solid rgba(0, 212, 255, 0.18);
          backdrop-filter: blur(8px);
        }

        .maintenance-team-label {
          display: block;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
          text-align: left;
        }

        .maintenance-team-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
        }

        .maintenance-team-row input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          font-size: 14px;
        }

        .maintenance-team-row input:focus {
          outline: none;
          border-color: rgba(0, 212, 255, 0.45);
        }

        .maintenance-team-row button {
          padding: 10px 14px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #00a1a6, #00d4ff);
          color: #031018;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .maintenance-team-row button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .maintenance-team-message {
          margin: 10px 0 0;
          font-size: 12px;
          text-align: left;
        }

        .maintenance-team-message--error {
          color: #ff8f8f;
        }

        .maintenance-team-message--success {
          color: #7dffb0;
        }

        @media (max-width: 720px) {
          .maintenance-panel-head {
            flex-direction: column;
          }

          :global(.maintenance-hero-image) {
            object-position: center 10%;
          }

          .maintenance-shell {
            justify-content: flex-end;
          }
        }

        @keyframes maintenanceFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(18px); }
        }

        @keyframes maintenanceScan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes maintenanceHeroZoom {
          0% { transform: scale(1.02); }
          100% { transform: scale(1.08); }
        }

        @keyframes maintenanceShimmer {
          0%, 100% { transform: translateX(-30%); opacity: 0; }
          45% { opacity: 0.7; }
          100% { transform: translateX(30%); opacity: 0; }
        }

        @keyframes maintenancePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.65; }
        }

        @keyframes maintenanceOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes maintenancePanelIn {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes maintenanceStepIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes maintenanceProgressGlow {
          0%, 100% { transform: translateX(-120%); }
          50% { transform: translateX(120%); }
        }
      `}</style>
    </main>
  )
}
