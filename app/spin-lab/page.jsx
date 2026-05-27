'use client'

import React from 'react'
import { Coins, Gift, RotateCw, Sparkles, Trophy, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

const REWARDS = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100]
const SEGMENT_COLORS = [
  ['#06b6d4', '#0ea5e9'],
  ['#2563eb', '#7c3aed'],
  ['#9333ea', '#db2777'],
  ['#f97316', '#f59e0b'],
  ['#16a34a', '#22c55e'],
  ['#0891b2', '#14b8a6'],
  ['#4f46e5', '#38bdf8'],
  ['#be123c', '#fb7185'],
  ['#a16207', '#facc15'],
  ['#f59e0b', '#fde68a']
]

const SUGGESTIONS = [
  'Usali per parlare con il Coach AI e ricevere un piano partita personalizzato.',
  'Controlla la sinergia della squadra dopo aver inserito nuove card.',
  'Usali nel Card Advisor Pro per capire se una nuova carta migliora davvero la rosa.',
  'Genera contromisure pre-partita e prepara il piano tattico prima di giocare.'
]

const CONFETTI = Array.from({ length: 34 }, (_, i) => ({
  id: i,
  left: 6 + ((i * 29) % 88),
  delay: (i % 9) * 0.08,
  duration: 1.8 + (i % 5) * 0.18,
  color: ['#00d4ff', '#facc15', '#fb7185', '#34d399', '#a78bfa'][i % 5]
}))

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  }
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z'
  ].join(' ')
}

function pickRandomSuggestion() {
  return SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]
}

function normalizeDeg(value) {
  const mod = value % 360
  return mod < 0 ? mod + 360 : mod
}

function getRotationForReward(currentRotation, reward) {
  const segmentAngle = 360 / REWARDS.length
  const rewardIndex = Math.max(0, REWARDS.indexOf(Number(reward)))
  const pointerAngle = rewardIndex * segmentAngle + segmentAngle / 2
  const targetModulo = (360 - pointerAngle) % 360
  const currentModulo = normalizeDeg(currentRotation)
  const delta = (targetModulo - currentModulo + 360) % 360
  return currentRotation + (7 + Math.floor(Math.random() * 3)) * 360 + delta
}

export default function SpinLabPage() {
  const [loadingStatus, setLoadingStatus] = React.useState(true)
  const [status, setStatus] = React.useState(null)
  const [isSpinning, setIsSpinning] = React.useState(false)
  const [rotation, setRotation] = React.useState(0)
  const [lastReward, setLastReward] = React.useState(null)
  const [message, setMessage] = React.useState('')
  const [celebrating, setCelebrating] = React.useState(false)
  const [error, setError] = React.useState('')
  const wheelRef = React.useRef(null)

  const segmentAngle = 360 / REWARDS.length

  const segments = React.useMemo(() => {
    return REWARDS.map((reward, index) => {
      const start = index * segmentAngle
      const end = start + segmentAngle
      const mid = start + segmentAngle / 2
      const labelPoint = polarToCartesian(250, 250, 152, mid)

      return {
        reward,
        index,
        start,
        end,
        mid,
        labelPoint,
        path: describeArc(250, 250, 236, start, end),
        colors: SEGMENT_COLORS[index]
      }
    })
  }, [segmentAngle])

  React.useEffect(() => {
    const loadStatus = async () => {
      try {
        setError('')
        let token = localStorage.getItem('auth_token')
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token) {
          setLoadingStatus(false)
          return
        }
        const res = await fetch('/api/daily-spin', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Impossibile caricare la ruota giornaliera')
        setStatus(data)
        if (data?.claimed_today && data?.reward_amount) {
          setLastReward(Number(data.reward_amount))
          setMessage('Hai già ritirato il premio di oggi. Torna domani per una nuova ruota.')
        }
      } catch (err) {
        setError(err?.message || 'Impossibile caricare la ruota giornaliera')
      } finally {
        setLoadingStatus(false)
      }
    }

    loadStatus()
  }, [])

  const spinWheel = async () => {
    if (isSpinning) return
    if (status?.claimed_today) return

    setIsSpinning(true)
    setLastReward(null)
    setMessage('')
    setCelebrating(false)
    setError('')

    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error('Sessione scaduta. Accedi di nuovo.')

      const res = await fetch('/api/daily-spin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Impossibile accreditare il premio')

      const reward = Number(data?.reward_amount || 0)
      const finalRotation = getRotationForReward(rotation, reward)
      setRotation(finalRotation)

      window.setTimeout(() => {
        setLastReward(reward)
        setMessage(pickRandomSuggestion())
        setStatus((prev) => ({
          ...(prev || {}),
          available: false,
          claimed_today: true,
          reward_amount: reward,
          gifted_month_total: Number(prev?.gifted_month_total || 0) + reward
        }))
        const sourceRect = wheelRef.current?.getBoundingClientRect()
        window.dispatchEvent(new CustomEvent('credits-accredited', {
          detail: {
            amount: reward,
            source: 'daily-spin',
            sourceRect: sourceRect
              ? {
                  left: sourceRect.left,
                  top: sourceRect.top,
                  width: sourceRect.width,
                  height: sourceRect.height
                }
              : null
          }
        }))
        window.dispatchEvent(new CustomEvent('credits-consumed'))
        setIsSpinning(false)
        setCelebrating(true)
        window.setTimeout(() => setCelebrating(false), 3300)
      }, 5200)
    } catch (err) {
      setError(err?.message || 'Impossibile accreditare il premio')
      setIsSpinning(false)
    }
  }

  return (
    <div className="spin-lab-page">
      <div className="aurora one" />
      <div className="aurora two" />
      <div className="stadium-lights" />

      {celebrating && (
        <div className="confetti-layer" aria-hidden="true">
          {CONFETTI.map((piece) => (
            <span
              key={piece.id}
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                background: piece.color
              }}
            />
          ))}
        </div>
      )}

      <main className="spin-shell">
        <section className="hero-card">
          <div className="lab-pill">
            <Sparkles size={16} />
            Premio login giornaliero
          </div>
          <h1>Gira la ruota e conquista Hero Points</h1>
          <p>
            Ogni giorno puoi ritirare un bonus HP. Il premio appare nel saldo in alto e puoi usarlo subito
            per Hero Chat, Card Advisor e analisi avanzate.
          </p>
        </section>

        <section className="game-card">
          <div className="wheel-stage" ref={wheelRef}>
            <div className="jackpot-ribbon">
              <Zap size={15} />
              Jackpot 100 HP
            </div>

            <div className="pointer-orb">
              <div className="pointer-light" />
              <div className="pointer-triangle" />
            </div>

            <div className="wheel-aura" />
            <div className="led-ring">
              {Array.from({ length: 36 }, (_, i) => (
                <i key={i} style={{ transform: `rotate(${i * 10}deg) translateY(-50%)` }} />
              ))}
            </div>

            <div className={`wheel-rotor ${isSpinning ? 'is-spinning' : ''}`} style={{ transform: `rotate(${rotation}deg)` }}>
              <svg viewBox="0 0 500 500" className="wheel-svg" role="img" aria-label="Ruota premi Hero Points">
                <defs>
                  {segments.map((segment) => (
                    <linearGradient
                      key={`gradient-${segment.index}`}
                      id={`segmentGradient${segment.index}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor={segment.colors[0]} />
                      <stop offset="100%" stopColor={segment.colors[1]} />
                    </linearGradient>
                  ))}
                  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <circle cx="250" cy="250" r="245" fill="rgba(255,255,255,0.12)" />
                {segments.map((segment) => (
                  <g key={segment.reward}>
                    <path
                      d={segment.path}
                      fill={`url(#segmentGradient${segment.index})`}
                      stroke="rgba(255,255,255,0.42)"
                      strokeWidth="3"
                    />
                    <text
                      x={segment.labelPoint.x}
                      y={segment.labelPoint.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${segment.mid}, ${segment.labelPoint.x}, ${segment.labelPoint.y})`}
                      className="reward-text"
                    >
                      <tspan x={segment.labelPoint.x} dy="-8">{segment.reward}</tspan>
                      <tspan x={segment.labelPoint.x} dy="25">HP</tspan>
                    </text>
                  </g>
                ))}

                <circle cx="250" cy="250" r="96" fill="rgba(3,7,18,0.76)" stroke="rgba(255,255,255,0.72)" strokeWidth="5" />
              </svg>
            </div>
            <div className="brand-center" aria-hidden="true">
              <img src="/logo.png" alt="" />
            </div>
          </div>

          <div className="controls">
            <button className="spin-button" onClick={spinWheel} disabled={isSpinning || loadingStatus || status?.claimed_today}>
              {loadingStatus ? (
                <>
                  <RotateCw size={20} className="rotating-icon" />
                  Controllo premio...
                </>
              ) : isSpinning ? (
                <>
                  <RotateCw size={20} className="rotating-icon" />
                  Sta girando...
                </>
              ) : status?.claimed_today ? (
                <>
                  <Trophy size={20} />
                  Ritorna domani
                </>
              ) : (
                <>
                  <Gift size={20} />
                  Gira la ruota
                </>
              )}
            </button>
            <p>
              {status?.claimed_today
                ? 'Hai già usato la ruota di oggi.'
                : 'Premio reale: una sola ruota al giorno, 100 HP massimo una volta al mese.'}
            </p>
            {error && <p style={{ color: '#fb7185' }}>{error}</p>}
          </div>
        </section>

        <section className={`result-card ${lastReward ? 'has-result' : ''}`}>
          <div className="result-heading">
            <Trophy size={20} />
            <span>Premio giornaliero</span>
          </div>

          {!lastReward && (
            <p className="empty-result">
              Premi possibili: 10, 15, 20, 25, 30, 40, 50, 60, 75 e 100 HP.
            </p>
          )}

          {lastReward && (
            <div className="win-content">
              <div className="win-badge">
                <Coins size={30} />
                <span>+{lastReward} HP</span>
              </div>
              <h2>Grande colpo!</h2>
              <p>{message}</p>
              <a href="/gestione-profilo" className="bank-link">
                Scopri dove usare gli HP
              </a>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        .spin-lab-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding: clamp(16px, 3vw, 34px);
          background:
            radial-gradient(circle at 50% -10%, rgba(0, 212, 255, 0.25), transparent 32%),
            linear-gradient(145deg, #020617 0%, #061426 48%, #020617 100%);
        }

        .spin-lab-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: linear-gradient(to bottom, black, transparent 92%);
          animation: grid-slide 16s linear infinite;
          pointer-events: none;
        }

        .aurora {
          position: absolute;
          width: 48vw;
          height: 48vw;
          border-radius: 999px;
          filter: blur(48px);
          opacity: 0.35;
          pointer-events: none;
        }

        .aurora.one {
          top: -20%;
          left: -12%;
          background: #00d4ff;
          animation: float-one 7s ease-in-out infinite alternate;
        }

        .aurora.two {
          right: -16%;
          bottom: -18%;
          background: #f59e0b;
          animation: float-two 8s ease-in-out infinite alternate;
        }

        .stadium-lights {
          position: absolute;
          inset: 0;
          background:
            conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(255,255,255,0.12) 16deg, transparent 32deg, transparent 64deg, rgba(0,212,255,0.12) 82deg, transparent 102deg);
          mix-blend-mode: screen;
          opacity: 0.65;
          animation: light-sweep 5s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .spin-shell {
          position: relative;
          z-index: 2;
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 18px;
        }

        .hero-card,
        .game-card,
        .result-card {
          border: 1px solid rgba(148, 163, 184, 0.22);
          background:
            linear-gradient(145deg, rgba(8, 16, 34, 0.82), rgba(2, 6, 23, 0.92)),
            radial-gradient(circle at 20% 0%, rgba(0, 212, 255, 0.16), transparent 36%);
          box-shadow:
            0 20px 80px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          border-radius: 28px;
        }

        .hero-card {
          padding: clamp(18px, 3vw, 28px);
          overflow: hidden;
        }

        .lab-pill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          color: #a7f3d0;
          background: rgba(20, 184, 166, 0.16);
          border: 1px solid rgba(45, 212, 191, 0.28);
          box-shadow: 0 0 18px rgba(20, 184, 166, 0.18);
          font-weight: 800;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 14px 0 8px;
          font-size: clamp(2rem, 7vw, 4.8rem);
          line-height: 0.94;
          letter-spacing: -0.07em;
          background: linear-gradient(90deg, #ffffff, #99f6e4, #fde68a);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 38px rgba(0, 212, 255, 0.2);
        }

        .hero-card p {
          max-width: 760px;
          margin: 0;
          color: rgba(226, 232, 240, 0.84);
          font-size: clamp(0.96rem, 2vw, 1.12rem);
        }

        .hero-card strong {
          color: #facc15;
        }

        .game-card {
          padding: clamp(18px, 4vw, 30px);
          display: grid;
          justify-items: center;
          gap: 18px;
          position: relative;
          overflow: hidden;
        }

        .wheel-stage {
          width: min(100%, 560px);
          max-width: 100%;
          aspect-ratio: 1 / 1;
          position: relative;
          display: grid;
          place-items: center;
          justify-self: center;
          margin-inline: auto;
        }

        .jackpot-ribbon {
          position: absolute;
          top: -7px;
          z-index: 10;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 13px;
          border-radius: 999px;
          color: #1f1300;
          font-weight: 900;
          background: linear-gradient(135deg, #fff7ad, #f59e0b 62%, #fb7185);
          box-shadow: 0 0 30px rgba(250, 204, 21, 0.5);
          transform: translateY(-50%);
        }

        .pointer-orb {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 12;
          width: 54px;
          height: 78px;
          display: grid;
          justify-items: center;
          filter: drop-shadow(0 0 18px rgba(250, 204, 21, 0.8));
        }

        .pointer-light {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: radial-gradient(circle at 36% 28%, white, #facc15 42%, #b45309);
          border: 3px solid rgba(255,255,255,0.9);
          box-shadow: 0 0 18px rgba(250, 204, 21, 0.85);
        }

        .pointer-triangle {
          width: 0;
          height: 0;
          border-left: 17px solid transparent;
          border-right: 17px solid transparent;
          border-top: 31px solid #facc15;
          margin-top: -2px;
        }

        .wheel-aura {
          position: absolute;
          inset: 3%;
          border-radius: 999px;
          background:
            conic-gradient(from 0deg, #00d4ff, #a78bfa, #facc15, #34d399, #00d4ff);
          filter: blur(18px);
          opacity: 0.55;
          animation: aura-spin 8s linear infinite;
        }

        .led-ring {
          position: absolute;
          inset: 3.8%;
          border-radius: 999px;
          animation: led-pulse 1.4s ease-in-out infinite alternate;
          z-index: 3;
        }

        .led-ring i {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 7px;
          height: 18px;
          margin-left: -3.5px;
          transform-origin: 50% 0;
          border-radius: 999px;
          background: rgba(255,255,255,0.8);
          box-shadow: 0 0 12px rgba(255,255,255,0.7);
        }

        .wheel-rotor {
          width: 88%;
          height: 88%;
          position: relative;
          z-index: 4;
          border-radius: 50%;
          transition: transform 5.2s cubic-bezier(0.08, 0.78, 0.08, 1);
          box-shadow:
            0 0 0 8px rgba(255,255,255,0.12),
            0 0 0 15px rgba(0,212,255,0.12),
            0 0 70px rgba(0,212,255,0.36);
        }

        .wheel-rotor.is-spinning {
          filter: saturate(1.25) brightness(1.08);
        }

        .wheel-svg {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: 50%;
        }

        .reward-text {
          fill: #ffffff;
          font-weight: 950;
          font-size: 27px;
          letter-spacing: 0.02em;
          paint-order: stroke;
          stroke: rgba(2, 6, 23, 0.75);
          stroke-width: 6px;
          stroke-linejoin: round;
        }

        .brand-center {
          position: absolute;
          z-index: 8;
          width: 31%;
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 40% 28%, rgba(255,255,255,0.92), rgba(250,204,21,0.55) 42%, rgba(8,13,31,0.92) 72%),
            linear-gradient(135deg, rgba(255,255,255,0.18), rgba(0,212,255,0.05));
          border: 5px solid rgba(255,255,255,0.78);
          box-shadow:
            0 0 22px rgba(250,204,21,0.65),
            0 0 38px rgba(0,212,255,0.34),
            inset 0 0 18px rgba(255,255,255,0.18);
          overflow: hidden;
        }

        .brand-center::before {
          content: '';
          position: absolute;
          inset: 8%;
          border-radius: inherit;
          border: 1px solid rgba(255,255,255,0.35);
          box-shadow: inset 0 0 18px rgba(0,0,0,0.2);
        }

        .brand-center img {
          width: 86%;
          height: 86%;
          object-fit: contain;
          position: relative;
          z-index: 1;
          filter:
            drop-shadow(0 6px 8px rgba(0,0,0,0.42))
            drop-shadow(0 0 8px rgba(0,212,255,0.24));
        }

        .controls {
          display: grid;
          justify-items: center;
          gap: 9px;
          text-align: center;
        }

        .spin-button {
          border: 0;
          min-width: min(320px, 88vw);
          padding: 15px 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #03101d;
          font-size: 1rem;
          font-weight: 950;
          cursor: pointer;
          background:
            linear-gradient(135deg, #fef3c7, #facc15 30%, #22d3ee 72%, #34d399);
          box-shadow:
            0 0 20px rgba(250,204,21,0.48),
            0 0 42px rgba(0,212,255,0.34);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .spin-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.025);
          filter: brightness(1.08);
          box-shadow:
            0 0 28px rgba(250,204,21,0.68),
            0 0 62px rgba(0,212,255,0.5);
        }

        .spin-button:disabled {
          cursor: not-allowed;
          opacity: 0.76;
        }

        .rotating-icon {
          animation: rotate-icon 0.9s linear infinite;
        }

        .controls p {
          margin: 0;
          color: rgba(226, 232, 240, 0.62);
          font-size: 0.88rem;
        }

        .result-card {
          padding: clamp(18px, 3vw, 26px);
          min-height: 142px;
          position: relative;
          overflow: hidden;
        }

        .result-card.has-result {
          border-color: rgba(250, 204, 21, 0.55);
          box-shadow:
            0 20px 90px rgba(0,0,0,0.4),
            0 0 70px rgba(250, 204, 21, 0.2);
          animation: result-pop 0.7s ease both;
        }

        .result-card.has-result::after {
          content: '';
          position: absolute;
          inset: -40%;
          background: conic-gradient(from 0deg, transparent, rgba(250,204,21,0.28), transparent, rgba(0,212,255,0.24), transparent);
          animation: aura-spin 2.4s linear infinite;
          pointer-events: none;
        }

        .result-heading,
        .win-content {
          position: relative;
          z-index: 1;
        }

        .result-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #fef3c7;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.82rem;
        }

        .empty-result {
          margin: 14px 0 0;
          color: rgba(226, 232, 240, 0.72);
        }

        .win-content {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        .win-badge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 18px;
          color: #111827;
          background: linear-gradient(135deg, #fff7ad, #facc15, #fb923c);
          box-shadow: 0 0 28px rgba(250,204,21,0.46);
          animation: badge-bounce 0.8s ease both;
        }

        .win-badge span {
          font-weight: 1000;
          font-size: clamp(1.8rem, 6vw, 3.4rem);
          letter-spacing: -0.06em;
          line-height: 1;
        }

        .win-content h2 {
          margin: 4px 0 0;
          font-size: clamp(1.35rem, 4vw, 2.2rem);
          letter-spacing: -0.04em;
          color: #ffffff;
        }

        .win-content p {
          margin: 0;
          color: rgba(255,255,255,0.86);
          max-width: 700px;
        }

        .bank-link {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 6px;
          padding: 11px 15px;
          border-radius: 999px;
          color: #03101d;
          background: linear-gradient(135deg, #fef3c7, #facc15 40%, #22d3ee);
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 0 22px rgba(250,204,21,0.38);
        }

        .confetti-layer {
          position: fixed;
          inset: 0;
          z-index: 20;
          pointer-events: none;
          overflow: hidden;
        }

        .confetti-layer span {
          position: absolute;
          top: -20px;
          width: 9px;
          height: 16px;
          border-radius: 3px;
          animation-name: confetti-drop;
          animation-timing-function: cubic-bezier(0.18, 0.78, 0.28, 1);
          animation-fill-mode: both;
        }

        @media (min-width: 920px) {
          .spin-shell {
            grid-template-columns: 1fr 0.72fr;
            align-items: stretch;
          }

          .hero-card {
            grid-column: 1 / -1;
          }

          .result-card {
            align-self: stretch;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }

        @media (max-width: 520px) {
          .wheel-stage {
            width: min(100%, 430px);
          }

          .reward-text {
            font-size: 24px;
            stroke-width: 5px;
          }

          .brand-center {
            width: 34%;
            border-width: 4px;
          }

          .jackpot-ribbon {
            font-size: 0.82rem;
          }
        }

        @keyframes rotate-icon {
          to { transform: rotate(360deg); }
        }

        @keyframes aura-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes led-pulse {
          from { opacity: 0.58; filter: brightness(0.9); }
          to { opacity: 1; filter: brightness(1.28); }
        }

        @keyframes grid-slide {
          to { transform: translate3d(-52px, -52px, 0); }
        }

        @keyframes light-sweep {
          from { transform: translateX(-2%) rotate(-1deg); opacity: 0.42; }
          to { transform: translateX(2%) rotate(1deg); opacity: 0.78; }
        }

        @keyframes float-one {
          to { transform: translate(8%, 10%) scale(1.08); }
        }

        @keyframes float-two {
          to { transform: translate(-8%, -9%) scale(1.1); }
        }

        @keyframes result-pop {
          0% { transform: scale(0.96); }
          55% { transform: scale(1.018); }
          100% { transform: scale(1); }
        }

        @keyframes badge-bounce {
          0% { transform: translateY(16px) scale(0.8); opacity: 0; }
          58% { transform: translateY(-5px) scale(1.06); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }

        @keyframes confetti-drop {
          0% {
            transform: translate3d(0, -20px, 0) rotate(0deg);
            opacity: 0;
          }
          12% { opacity: 1; }
          100% {
            transform: translate3d(-32px, 110vh, 0) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
