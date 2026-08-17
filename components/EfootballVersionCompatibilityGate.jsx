'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { EFOOTBALL_RULESET } from '@/lib/efootballV6Rules'

const GENERAL_NOTICE_KEY = `efootball_ruleset_notice_${EFOOTBALL_RULESET}`
const SESSION_LATER_KEY = `efootball_compat_later_${EFOOTBALL_RULESET}`

async function getAccessToken() {
  let token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (!token && supabase) {
    const { data } = await supabase.auth.getSession()
    token = data?.session?.access_token || null
  }
  return token
}

export default function EfootballVersionCompatibilityGate() {
  const pathname = usePathname()
  const { lang } = useTranslation()
  const isEn = lang === 'en'
  const [mode, setMode] = React.useState(null)
  const [issues, setIssues] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        const token = await getAccessToken()
        if (!token || cancelled) return

        const response = await fetch('/api/efootball/compatibility', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || cancelled) return

        const nextIssues = Array.isArray(data?.issues) ? data.issues : []
        setIssues(nextIssues)

        if (nextIssues.length > 0) {
          const postponed = sessionStorage.getItem(SESSION_LATER_KEY) === '1'
          if (!postponed) setMode('compatibility')
          return
        }

        const seenGeneral = localStorage.getItem(GENERAL_NOTICE_KEY) === '1'
        if (!seenGeneral) setMode('general')
      } catch (error) {
        console.warn('[EfootballVersionCompatibilityGate] compatibility check failed:', error?.message || error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [pathname])

  const closeGeneral = () => {
    localStorage.setItem(GENERAL_NOTICE_KEY, '1')
    setMode(null)
  }

  const remindLater = () => {
    sessionStorage.setItem(SESSION_LATER_KEY, '1')
    localStorage.setItem(GENERAL_NOTICE_KEY, '1')
    setMode(null)
  }

  const updateTactics = () => {
    sessionStorage.setItem(SESSION_LATER_KEY, '1')
    localStorage.setItem(GENERAL_NOTICE_KEY, '1')
    setMode(null)
    window.location.assign('/nuova-rosa-lab#tactical-settings')
  }

  if (loading || !mode) return null

  const hasCompatibilityIssues = mode === 'compatibility'

  return (
    <div className="ef-v6-overlay" role="dialog" aria-modal="true" aria-labelledby="ef-v6-title">
      <div className="ef-v6-card">
        {!hasCompatibilityIssues && (
          <button className="ef-v6-close" type="button" onClick={closeGeneral} aria-label={isEn ? 'Close' : 'Chiudi'}>
            <X size={18} />
          </button>
        )}

        <div className={`ef-v6-icon ${hasCompatibilityIssues ? 'warning' : ''}`} aria-hidden="true">
          {hasCompatibilityIssues ? <AlertTriangle size={30} /> : <RefreshCw size={30} />}
        </div>

        <div className="ef-v6-kicker">eFootball {EFOOTBALL_RULESET}</div>
        <h2 id="ef-v6-title">
          {hasCompatibilityIssues
            ? (isEn ? 'Your saved tactics need an update' : 'La tua tattica salvata richiede un aggiornamento')
            : (isEn ? 'Hero is updated for the new eFootball ruleset' : 'Hero è aggiornato alle nuove regole eFootball')}
        </h2>

        {hasCompatibilityIssues ? (
          <>
            <p>
              {isEn
                ? 'Some Individual Instructions saved with an earlier eFootball version are no longer current options. We did not change or delete your configuration automatically.'
                : 'Alcune Istruzioni Individuali salvate con una versione precedente di eFootball non sono più opzioni correnti. Non abbiamo modificato né cancellato automaticamente la tua configurazione.'}
            </p>
            <div className="ef-v6-issues">
              {issues.map((issue, index) => {
                const label = isEn ? issue.label_en : issue.label_it
                const playerName = issue?.player?.name || (isEn ? 'Saved player' : 'Giocatore salvato')
                const position = issue?.player?.position ? ` (${issue.player.position})` : ''
                return (
                  <div key={`${issue.slot}-${issue.instruction}-${index}`} className="ef-v6-issue">
                    <strong>{label}</strong>
                    <span>{playerName}{position}</span>
                  </div>
                )
              })}
            </div>
            <p className="ef-v6-note">
              {isEn
                ? 'Hero will treat these entries as legacy data and will not recommend them as current instructions.'
                : 'Hero tratterà queste voci come dati legacy e non le consiglierà come istruzioni correnti.'}
            </p>
          </>
        ) : (
          <p>
            {isEn
              ? 'Team playstyles, tactical knowledge and coaching rules have been aligned to eFootball v6.0.0. Existing saved data is preserved.'
              : 'Stili squadra, conoscenza tattica e regole del Coach sono stati allineati a eFootball v6.0.0. I dati già salvati vengono preservati.'}
          </p>
        )}

        <div className="ef-v6-actions">
          {hasCompatibilityIssues ? (
            <>
              <button type="button" className="ef-v6-primary" onClick={updateTactics}>
                {isEn ? 'Update tactics' : 'Aggiorna tattiche'}
              </button>
              <button type="button" className="ef-v6-secondary" onClick={remindLater}>
                {isEn ? 'Later' : 'Più tardi'}
              </button>
            </>
          ) : (
            <button type="button" className="ef-v6-primary" onClick={closeGeneral}>
              {isEn ? 'Got it' : 'Ho capito'}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .ef-v6-overlay {
          position: fixed;
          inset: 0;
          z-index: 10150;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(6px);
          overflow-y: auto;
        }
        .ef-v6-card {
          position: relative;
          width: min(520px, 94vw);
          border: 1px solid rgba(0, 212, 255, 0.36);
          border-radius: 16px;
          padding: 24px;
          background: linear-gradient(180deg, rgba(10, 14, 39, 0.99), rgba(4, 8, 24, 0.99));
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
          color: #fff;
        }
        .ef-v6-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          cursor: pointer;
        }
        .ef-v6-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #7ee9ff;
          background: rgba(0, 212, 255, 0.12);
          border: 1px solid rgba(0, 212, 255, 0.3);
          margin-bottom: 14px;
        }
        .ef-v6-icon.warning {
          color: #ffe08a;
          background: rgba(255, 193, 7, 0.1);
          border-color: rgba(255, 193, 7, 0.38);
        }
        .ef-v6-kicker {
          color: #7ee9ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        h2 {
          margin: 0 0 12px;
          font-size: clamp(21px, 4vw, 28px);
          line-height: 1.12;
        }
        p {
          margin: 0 0 16px;
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.55;
          font-size: 14px;
        }
        .ef-v6-note {
          margin-top: 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }
        .ef-v6-issues {
          display: grid;
          gap: 8px;
          margin: 14px 0;
        }
        .ef-v6-issue {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 12px;
          border-radius: 9px;
          background: rgba(255, 193, 7, 0.07);
          border: 1px solid rgba(255, 193, 7, 0.22);
          font-size: 13px;
        }
        .ef-v6-issue span {
          color: rgba(255, 255, 255, 0.68);
          text-align: right;
        }
        .ef-v6-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .ef-v6-actions button {
          min-height: 42px;
          padding: 10px 16px;
          border-radius: 9px;
          font-weight: 800;
          cursor: pointer;
        }
        .ef-v6-primary {
          flex: 1;
          border: 1px solid rgba(0, 212, 255, 0.55);
          background: rgba(0, 212, 255, 0.18);
          color: #fff;
        }
        .ef-v6-secondary {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.82);
        }
        @media (max-width: 560px) {
          .ef-v6-card { padding: 20px; }
          .ef-v6-actions { flex-direction: column; }
          .ef-v6-issue { flex-direction: column; gap: 4px; }
          .ef-v6-issue span { text-align: left; }
        }
      `}</style>
    </div>
  )
}
