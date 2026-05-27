'use client'

import React from 'react'
import { Coins, Gift, Sparkles, Trophy, X, RotateCw, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

const MODAL_DISMISS_PREFIX = 'daily_spin_remind_later_'
const HP_BANK_URL = '/gestione-profilo#movimenti-hp'
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
  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, 'Z'].join(' ')
}

function getRotationForReward(currentRotation, reward) {
  const segmentAngle = 360 / REWARDS.length
  const rewardIndex = Math.max(0, REWARDS.indexOf(Number(reward)))
  const pointerAngle = rewardIndex * segmentAngle + segmentAngle / 2
  const targetModulo = (360 - pointerAngle) % 360
  const currentModulo = ((currentRotation % 360) + 360) % 360
  const delta = (targetModulo - currentModulo + 360) % 360
  return currentRotation + (7 * 360) + delta
}

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
  const [spinning, setSpinning] = React.useState(false)
  const [rotation, setRotation] = React.useState(0)
  const [reward, setReward] = React.useState(null)
  const [celebrating, setCelebrating] = React.useState(false)
  const [error, setError] = React.useState('')

  const isEn = lang === 'en'
  const segmentAngle = 360 / REWARDS.length
  const segments = React.useMemo(() => {
    return REWARDS.map((rewardAmount, index) => {
      const start = index * segmentAngle
      const end = start + segmentAngle
      const mid = start + segmentAngle / 2
      const labelPoint = polarToCartesian(250, 250, 152, mid)
      return {
        reward: rewardAmount,
        index,
        mid,
        labelPoint,
        path: describeArc(250, 250, 236, start, end),
        colors: SEGMENT_COLORS[index]
      }
    })
  }, [segmentAngle])

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
    if (claiming || spinning) return
    setClaiming(true)
    setSpinning(true)
    setReward(null)
    setCelebrating(false)
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
      const finalRotation = getRotationForReward(rotation, amount)
      setRotation(finalRotation)
      localStorage.removeItem(`${MODAL_DISMISS_PREFIX}${data?.spin_date || todayRomeDateKey()}`)
      window.setTimeout(() => {
        setReward(amount)
        setStatus((prev) => ({
          ...(prev || {}),
          available: false,
          claimed_today: true,
          spin_date: data?.spin_date || todayRomeDateKey(),
          reward_amount: amount,
          gifted_month_total: Number(prev?.gifted_month_total || 0) + amount
        }))
        setSpinning(false)
        setCelebrating(true)
        window.dispatchEvent(new CustomEvent('credits-accredited', { detail: { amount, source: 'daily-spin' } }))
        window.dispatchEvent(new CustomEvent('credits-consumed'))
        window.setTimeout(() => setCelebrating(false), 3300)
      }, 5200)
    } catch (err) {
      setError(err?.message || 'Unable to claim reward')
      setSpinning(false)
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
      <style jsx>{spinStyles}</style>
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
            <a href={HP_BANK_URL} className="btn secondary">
              {isEn ? 'Open HP bank' : 'Apri banca HP'}
            </a>
          )}
        </div>
      </div>

      {open && (
        <div className="daily-spin-modal">
          {celebrating && (
            <div className="daily-spin-confetti" aria-hidden="true">
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
          <div className="daily-spin-card">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="daily-spin-close"
              aria-label={isEn ? 'Close' : 'Chiudi'}
            >
              <X size={18} />
            </button>

            <div className="daily-spin-pill">
              <Sparkles size={14} />
              {isEn ? 'Daily login reward' : 'Premio login giornaliero'}
            </div>

            <h3 className="daily-spin-title">
              {reward
                ? (isEn ? `Great! +${reward} HP credited` : `Grande! +${reward} HP accreditati`)
                : (isEn ? 'Spin and win your HP now' : 'Gira e vinci i tuoi HP ora')}
            </h3>
            <p className="daily-spin-subtitle">
              {reward
                ? (isEn ? 'Your HP balance is updated in the top bar. Open the HP bank to see the credit movement.' : 'Il saldo HP e stato aggiornato nella barra in alto. Apri la banca HP per vedere il movimento accreditato.')
                : (isEn ? 'Use your reward for Hero Chat, Card Advisor and advanced analysis.' : 'Usa il premio per Hero Chat, Card Advisor e analisi avanzate.')}
            </p>

            <div className="daily-spin-wheel-stage">
              <div className="daily-spin-jackpot">
                <Zap size={14} />
                Jackpot 100 HP
              </div>
              <div className="daily-spin-pointer">
                <div className="daily-spin-pointer-light" />
                <div className="daily-spin-pointer-triangle" />
              </div>
              <div className="daily-spin-aura" />
              <div className="daily-spin-led-ring">
                {Array.from({ length: 36 }, (_, i) => (
                  <i key={i} style={{ transform: `rotate(${i * 10}deg) translateY(-50%)` }} />
                ))}
              </div>
              <div className={`daily-spin-rotor ${spinning ? 'is-spinning' : ''}`} style={{ transform: `rotate(${rotation}deg)` }}>
                <svg viewBox="0 0 500 500" className="daily-spin-svg" role="img" aria-label={isEn ? 'Hero Points reward wheel' : 'Ruota premi Hero Points'}>
                  <defs>
                    {segments.map((segment) => (
                      <linearGradient
                        key={`dailySpinGradient-${segment.index}`}
                        id={`dailySpinGradient${segment.index}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor={segment.colors[0]} />
                        <stop offset="100%" stopColor={segment.colors[1]} />
                      </linearGradient>
                    ))}
                  </defs>
                  <circle cx="250" cy="250" r="245" fill="rgba(255,255,255,0.12)" />
                  {segments.map((segment) => (
                    <g key={segment.reward}>
                      <path
                        d={segment.path}
                        fill={`url(#dailySpinGradient${segment.index})`}
                        stroke="rgba(255,255,255,0.42)"
                        strokeWidth="3"
                      />
                      <text
                        x={segment.labelPoint.x}
                        y={segment.labelPoint.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${segment.mid}, ${segment.labelPoint.x}, ${segment.labelPoint.y})`}
                        className="daily-spin-reward-text"
                      >
                        <tspan x={segment.labelPoint.x} dy="-8">{segment.reward}</tspan>
                        <tspan x={segment.labelPoint.x} dy="25">HP</tspan>
                      </text>
                    </g>
                  ))}
                  <circle cx="250" cy="250" r="96" fill="rgba(3,7,18,0.76)" stroke="rgba(255,255,255,0.72)" strokeWidth="5" />
                </svg>
              </div>
              <div className="daily-spin-brand" aria-hidden="true">
                <img src="/logo.png" alt="" />
              </div>
            </div>

            {reward && (
              <div className="daily-spin-result">
                <div className="daily-spin-win-badge">
                  <Coins size={26} />
                  <span>+{reward} HP</span>
                </div>
                <div>
                  <strong>{isEn ? 'Credited to your HP bank' : 'Accreditati nella tua banca HP'}</strong>
                  <p>{isEn ? 'You can review it in your credit movements.' : 'Puoi verificarlo nei movimenti dei crediti.'}</p>
                </div>
              </div>
            )}

            {error && <p className="daily-spin-error">{error}</p>}

            <div className="daily-spin-actions">
              {!reward ? (
                <>
                  <button type="button" className="daily-spin-button" onClick={claimReward} disabled={claiming || spinning}>
                    {spinning ? <RotateCw size={18} className="daily-spin-rotate-icon" /> : <Gift size={18} />}
                    <span style={{ marginLeft: '6px' }}>{isEn ? 'Spin' : 'Gira'}</span>
                  </button>
                  <button type="button" className="btn secondary" onClick={remindLater} disabled={claiming}>
                    {isEn ? 'Remind me later' : 'Ricordamelo piu tardi'}
                  </button>
                </>
              ) : (
                <>
                  <a href={HP_BANK_URL} className="daily-spin-button" onClick={() => setOpen(false)}>
                    <Trophy size={18} />
                    <span style={{ marginLeft: '6px' }}>{isEn ? 'Open HP bank' : 'Apri banca HP'}</span>
                  </a>
                  <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
                    {isEn ? 'Got it' : 'Ho capito'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const spinStyles = `
  .daily-spin-modal {
    position: fixed;
    inset: 0;
    z-index: 10060;
    display: grid;
    place-items: center;
    padding: 18px;
    overflow: auto;
    background:
      radial-gradient(circle at 50% 0%, rgba(0, 212, 255, 0.28), transparent 34%),
      rgba(0, 0, 0, 0.78);
  }

  .daily-spin-card {
    position: relative;
    width: min(620px, 96vw);
    max-height: calc(100vh - 36px);
    overflow: auto;
    padding: clamp(18px, 3vw, 24px);
    border: 1px solid rgba(255, 203, 5, 0.46);
    border-radius: 28px;
    background:
      radial-gradient(circle at 50% -10%, rgba(0, 212, 255, 0.18), transparent 36%),
      linear-gradient(145deg, rgba(8, 16, 34, 0.96), rgba(2, 6, 23, 0.98));
    box-shadow: 0 24px 100px rgba(0,0,0,0.62), 0 0 54px rgba(0, 212, 255, 0.20);
    color: #fff;
  }

  .daily-spin-close {
    position: absolute;
    right: 12px;
    top: 12px;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.65);
    cursor: pointer;
    z-index: 5;
  }

  .daily-spin-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255,203,5,0.12);
    border: 1px solid rgba(255,203,5,0.34);
    color: #ffcb05;
    font-weight: 900;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .daily-spin-title {
    margin: 12px 30px 6px 0;
    color: #fff;
    font-size: clamp(26px, 5vw, 42px);
    line-height: 1.02;
    letter-spacing: -0.04em;
  }

  .daily-spin-subtitle {
    margin: 0;
    color: rgba(255,255,255,0.72);
    line-height: 1.45;
  }

  .daily-spin-wheel-stage {
    width: min(82vw, 430px);
    aspect-ratio: 1 / 1;
    position: relative;
    display: grid;
    place-items: center;
    margin: 22px auto 10px;
  }

  .daily-spin-jackpot {
    position: absolute;
    top: -3px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 12px;
    border-radius: 999px;
    color: #1f1300;
    font-weight: 950;
    font-size: 12px;
    background: linear-gradient(135deg, #fff7ad, #f59e0b 62%, #fb7185);
    box-shadow: 0 0 30px rgba(250, 204, 21, 0.5);
    transform: translateY(-50%);
  }

  .daily-spin-pointer {
    position: absolute;
    top: 19px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 12;
    width: 48px;
    height: 70px;
    display: grid;
    justify-items: center;
    filter: drop-shadow(0 0 18px rgba(250, 204, 21, 0.8));
  }

  .daily-spin-pointer-light {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: radial-gradient(circle at 36% 28%, white, #facc15 42%, #b45309);
    border: 3px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 18px rgba(250, 204, 21, 0.85);
  }

  .daily-spin-pointer-triangle {
    width: 0;
    height: 0;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    border-top: 28px solid #facc15;
    margin-top: -2px;
  }

  .daily-spin-aura {
    position: absolute;
    inset: 3%;
    border-radius: 999px;
    background: conic-gradient(from 0deg, #00d4ff, #a78bfa, #facc15, #34d399, #00d4ff);
    filter: blur(18px);
    opacity: 0.55;
    animation: dailySpinAura 8s linear infinite;
  }

  .daily-spin-led-ring {
    position: absolute;
    inset: 3.8%;
    border-radius: 999px;
    animation: dailySpinLed 1.4s ease-in-out infinite alternate;
    z-index: 3;
  }

  .daily-spin-led-ring i {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 15px;
    margin-left: -3px;
    transform-origin: 50% 0;
    border-radius: 999px;
    background: rgba(255,255,255,0.82);
    box-shadow: 0 0 12px rgba(255,255,255,0.7);
  }

  .daily-spin-rotor {
    width: 88%;
    height: 88%;
    position: relative;
    z-index: 4;
    border-radius: 50%;
    transition: transform 5.2s cubic-bezier(0.08, 0.78, 0.08, 1);
    box-shadow: 0 0 0 8px rgba(255,255,255,0.12), 0 0 0 15px rgba(0,212,255,0.12), 0 0 70px rgba(0,212,255,0.36);
  }

  .daily-spin-rotor.is-spinning {
    filter: saturate(1.25) brightness(1.08);
  }

  .daily-spin-svg {
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 50%;
  }

  .daily-spin-reward-text {
    fill: #fff;
    font-weight: 950;
    font-size: 27px;
    letter-spacing: 0.02em;
    paint-order: stroke;
    stroke: rgba(2, 6, 23, 0.75);
    stroke-width: 6px;
    stroke-linejoin: round;
  }

  .daily-spin-brand {
    position: absolute;
    z-index: 8;
    width: 31%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 40% 28%, rgba(255,255,255,0.92), rgba(250,204,21,0.55) 42%, rgba(8,13,31,0.92) 72%);
    border: 5px solid rgba(255,255,255,0.78);
    box-shadow: 0 0 22px rgba(250,204,21,0.65), 0 0 38px rgba(0,212,255,0.34), inset 0 0 18px rgba(255,255,255,0.18);
    overflow: hidden;
  }

  .daily-spin-brand img {
    width: 86%;
    height: 86%;
    object-fit: contain;
    filter: drop-shadow(0 6px 8px rgba(0,0,0,0.42)) drop-shadow(0 0 8px rgba(0,212,255,0.24));
  }

  .daily-spin-result {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border: 1px solid rgba(250, 204, 21, 0.42);
    border-radius: 18px;
    background: rgba(250, 204, 21, 0.08);
    animation: dailySpinResultPop 0.7s ease both;
  }

  .daily-spin-result p {
    margin: 3px 0 0;
    color: rgba(255,255,255,0.68);
    font-size: 13px;
  }

  .daily-spin-win-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 16px;
    color: #111827;
    background: linear-gradient(135deg, #fff7ad, #facc15, #fb923c);
    box-shadow: 0 0 28px rgba(250,204,21,0.46);
    flex-shrink: 0;
  }

  .daily-spin-win-badge span {
    font-weight: 1000;
    font-size: clamp(22px, 5vw, 34px);
    letter-spacing: -0.06em;
    line-height: 1;
  }

  .daily-spin-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    flex-wrap: wrap;
  }

  .daily-spin-button {
    border: 0;
    min-height: 44px;
    padding: 0 18px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #03101d;
    font-weight: 950;
    cursor: pointer;
    text-decoration: none;
    background: linear-gradient(135deg, #fef3c7, #facc15 30%, #22d3ee 72%, #34d399);
    box-shadow: 0 0 20px rgba(250,204,21,0.48), 0 0 42px rgba(0,212,255,0.34);
  }

  .daily-spin-button:disabled {
    cursor: not-allowed;
    opacity: 0.76;
  }

  .daily-spin-error {
    color: #ff8b8b;
    margin: 12px 0 0;
  }

  .daily-spin-rotate-icon {
    animation: dailySpinRotateIcon 0.9s linear infinite;
  }

  .daily-spin-confetti {
    position: fixed;
    inset: 0;
    z-index: 10061;
    pointer-events: none;
    overflow: hidden;
  }

  .daily-spin-confetti span {
    position: absolute;
    top: -20px;
    width: 9px;
    height: 16px;
    border-radius: 3px;
    animation-name: dailySpinConfettiDrop;
    animation-timing-function: cubic-bezier(0.18, 0.78, 0.28, 1);
    animation-fill-mode: both;
  }

  @media (max-width: 520px) {
    .daily-spin-card {
      padding: 16px;
      border-radius: 22px;
    }

    .daily-spin-wheel-stage {
      width: min(88vw, 390px);
    }

    .daily-spin-reward-text {
      font-size: 24px;
      stroke-width: 5px;
    }

    .daily-spin-brand {
      width: 34%;
      border-width: 4px;
    }

    .daily-spin-result {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @keyframes dailySpinRotateIcon {
    to { transform: rotate(360deg); }
  }

  @keyframes dailySpinAura {
    to { transform: rotate(360deg); }
  }

  @keyframes dailySpinLed {
    from { opacity: 0.58; filter: brightness(0.9); }
    to { opacity: 1; filter: brightness(1.28); }
  }

  @keyframes dailySpinResultPop {
    0% { transform: scale(0.96); opacity: 0; }
    55% { transform: scale(1.018); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes dailySpinConfettiDrop {
    0% { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 0; }
    12% { opacity: 1; }
    100% { transform: translate3d(-32px, 110vh, 0) rotate(720deg); opacity: 0; }
  }
`
