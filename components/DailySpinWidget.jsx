'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Gift, Sparkles, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'

const DISMISS_PREFIX = 'daily_spin_remind_later_'

function todayRomeDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

export default function DailySpinWidget({ lang: langProp } = {}) {
  const { lang: currentLang } = useTranslation()
  const lang = langProp || currentLang || 'it'
  const pathname = usePathname()
  const [loading, setLoading] = React.useState(true)
  const [status, setStatus] = React.useState(null)
  const [open, setOpen] = React.useState(false)
  const isEn = lang === 'en'

  React.useEffect(() => {
    if ((pathname || '').startsWith('/spin-lab')) {
      setLoading(false)
      return
    }

    const loadStatus = async () => {
      try {
        let token = localStorage.getItem('auth_token')
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token) return

        const res = await fetch('/api/daily-spin', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return

        setStatus(data)
        const dayKey = data?.spin_date || todayRomeDateKey()
        const dismissed = localStorage.getItem(`${DISMISS_PREFIX}${dayKey}`) === '1'
        if (data?.available && !dismissed) setOpen(true)
      } finally {
        setLoading(false)
      }
    }

    loadStatus()
  }, [pathname])

  const remindLater = () => {
    const dayKey = status?.spin_date || todayRomeDateKey()
    localStorage.setItem(`${DISMISS_PREFIX}${dayKey}`, '1')
    setOpen(false)
  }

  if (loading || !open) return null

  return (
    <div className="daily-login-overlay" role="dialog" aria-modal="true" aria-label={isEn ? 'Daily wheel reward' : 'Premio ruota giornaliera'}>
      <div className="daily-login-card">
        <button className="daily-login-close" type="button" onClick={() => setOpen(false)} aria-label={isEn ? 'Close' : 'Chiudi'}>
          <X size={18} />
        </button>

        <div className="daily-login-orb" aria-hidden="true">
          <Gift size={34} />
        </div>

        <div className="daily-login-pill">
          <Sparkles size={14} />
          {isEn ? 'Daily reward ready' : 'Premio giornaliero pronto'}
        </div>

        <h2>{isEn ? 'Your daily wheel is waiting' : 'La tua ruota giornaliera ti aspetta'}</h2>
        <p>
          {isEn
            ? 'Spin once a day, win Hero Points and use them for AI chat, card advice and advanced analysis.'
            : 'Gira una volta al giorno, vinci Hero Points e usali per chat IA, consigli carte e analisi avanzate.'}
        </p>

        <div className="daily-login-actions">
          <a className="daily-login-primary" href="/spin-lab">
            {isEn ? 'Go to the wheel' : 'Vai alla ruota'}
          </a>
          <button className="daily-login-secondary" type="button" onClick={remindLater}>
            {isEn ? 'Remind me later' : 'Ricordamelo piu tardi'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .daily-login-overlay {
          position: fixed;
          inset: 0;
          z-index: 10060;
          display: grid;
          place-items: center;
          padding: 18px;
          background:
            radial-gradient(circle at 50% 12%, rgba(0, 212, 255, 0.26), transparent 34%),
            rgba(0, 0, 0, 0.74);
          overflow-y: auto;
        }

        .daily-login-card {
          position: relative;
          width: min(440px, 94vw);
          padding: clamp(20px, 5vw, 30px);
          border: 1px solid rgba(255, 203, 5, 0.45);
          border-radius: 28px;
          background:
            radial-gradient(circle at 50% 0%, rgba(255, 203, 5, 0.16), transparent 42%),
            linear-gradient(145deg, rgba(8, 16, 34, 0.98), rgba(2, 6, 23, 0.98));
          box-shadow: 0 24px 90px rgba(0,0,0,0.58), 0 0 54px rgba(0, 212, 255, 0.20);
          color: #fff;
          text-align: center;
          overflow: hidden;
        }

        .daily-login-card::before {
          content: '';
          position: absolute;
          inset: -40%;
          background: conic-gradient(from 0deg, transparent, rgba(255,203,5,0.18), transparent, rgba(0,212,255,0.16), transparent);
          animation: dailyLoginSweep 7s linear infinite;
          pointer-events: none;
        }

        .daily-login-close,
        .daily-login-orb,
        .daily-login-pill,
        .daily-login-card h2,
        .daily-login-card p,
        .daily-login-actions {
          position: relative;
          z-index: 1;
        }

        .daily-login-close {
          position: absolute;
          top: 12px;
          right: 12px;
          border: 0;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.72);
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          cursor: pointer;
        }

        .daily-login-orb {
          width: 82px;
          height: 82px;
          margin: 0 auto 14px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: #06101f;
          background: linear-gradient(135deg, #fef3c7, #facc15 48%, #22d3ee);
          box-shadow: 0 0 30px rgba(250,204,21,0.42), 0 0 58px rgba(0,212,255,0.28);
          animation: dailyLoginPulse 1.9s ease-in-out infinite;
        }

        .daily-login-pill {
          width: fit-content;
          margin: 0 auto 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 11px;
          border: 1px solid rgba(255,203,5,0.34);
          border-radius: 999px;
          color: #ffdf66;
          background: rgba(255,203,5,0.10);
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .daily-login-card h2 {
          margin: 0 0 8px;
          font-size: clamp(26px, 7vw, 38px);
          line-height: 1.02;
          letter-spacing: -0.05em;
        }

        .daily-login-card p {
          margin: 0;
          color: rgba(255,255,255,0.74);
          line-height: 1.48;
          font-size: 14px;
        }

        .daily-login-actions {
          display: grid;
          gap: 10px;
          margin-top: 20px;
        }

        .daily-login-primary,
        .daily-login-secondary {
          min-height: 46px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
        }

        .daily-login-primary {
          color: #03101d;
          background: linear-gradient(135deg, #fef3c7, #facc15 42%, #22d3ee);
          box-shadow: 0 0 20px rgba(250,204,21,0.38);
        }

        .daily-login-secondary {
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.82);
        }

        @keyframes dailyLoginPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes dailyLoginSweep {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
