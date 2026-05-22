'use client'

import React from 'react'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Minimize2,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Zap
} from 'lucide-react'

const STORAGE_KEY = 'hero_coach_journey_minimized_v1'

function getNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

async function getAuthToken() {
  if (typeof window === 'undefined') return null
  const localToken = window.localStorage.getItem('auth_token')
  if (localToken) return localToken
  if (!supabase) return null
  return getValidAccessToken()
}

function getTransactionFlags(transactions = []) {
  return transactions.reduce((acc, tx) => {
    const description = String(tx?.description || '').toLowerCase()
    const amount = getNumber(tx?.amount)
    if (amount < 0) acc.hasSpentHp = true
    if (amount < 0 && description.includes('card-advisor')) acc.hasUsedCardAdvisor = true
    if (amount < 0 && description.includes('extract-game-analysis')) acc.hasUploadedStatsWithHp = true
    if (
      amount < 0 &&
      (description.includes('assistant-chat') ||
        description.includes('coach-feedback-chat') ||
        description.includes('smart-chat'))
    ) {
      acc.hasAskedCoach = true
    }
    return acc
  }, {
    hasSpentHp: false,
    hasUsedCardAdvisor: false,
    hasUploadedStatsWithHp: false,
    hasAskedCoach: false
  })
}

function buildJourneyState({
  stats,
  hasActiveCoach,
  gameAnalysisLastCapture,
  transactionFlags,
  lang,
  actions
}) {
  const starters = getNumber(stats?.titolari)
  const totalPlayers = getNumber(stats?.totalPlayers)
  const hasGameStats = Boolean(gameAnalysisLastCapture)
  const isEn = lang === 'en'

  if (totalPlayers === 0) {
    return {
      key: 'no_roster',
      progress: 18,
      tone: 'cyan',
      Icon: Users,
      kicker: isEn ? 'Start here' : 'Parti da qui',
      title: isEn ? 'Build the base your Coach needs' : 'Costruisci la base che serve al Coach',
      body: isEn
        ? 'Save your real squad first. Once the Coach knows your players, every analysis becomes more useful.'
        : 'Salva prima la tua rosa reale. Quando il Coach conosce i tuoi giocatori, ogni consiglio diventa piu utile.',
      primary: { label: isEn ? 'Create squad' : 'Crea la rosa', action: actions.openRoster },
      secondary: { label: isEn ? 'Check new cards' : 'Controlla nuovi giocatori', action: actions.openCardAdvisor },
      checkpoints: [
        { label: isEn ? 'Squad' : 'Rosa', done: false },
        { label: isEn ? 'Game stats' : 'Statistiche', done: hasGameStats },
        { label: isEn ? 'First smart action' : 'Prima azione utile', done: transactionFlags.hasSpentHp }
      ]
    }
  }

  if (starters < 11) {
    return {
      key: 'roster_incomplete',
      progress: Math.max(24, Math.round((starters / 11) * 42)),
      tone: 'cyan',
      Icon: Users,
      kicker: isEn ? 'Coach setup' : 'Setup Coach',
      title: isEn ? 'Complete your 11 starters' : 'Completa gli 11 titolari',
      body: isEn
        ? `You have ${starters}/11 starters. Finish the team so the Coach can judge roles, formation and card fit.`
        : `Hai ${starters}/11 titolari. Completa la squadra per far leggere al Coach ruoli, modulo e fit delle carte.`,
      primary: { label: isEn ? 'Complete squad' : 'Completa rosa', action: actions.openRoster },
      secondary: { label: isEn ? 'Analyze new cards' : 'Analizza nuovi giocatori', action: actions.openCardAdvisor },
      checkpoints: [
        { label: isEn ? '11 starters' : '11 titolari', done: false },
        { label: isEn ? 'Active coach' : 'Coach attivo', done: hasActiveCoach },
        { label: isEn ? 'Game stats' : 'Statistiche', done: hasGameStats }
      ]
    }
  }

  if (!hasActiveCoach) {
    return {
      key: 'no_coach',
      progress: 48,
      tone: 'blue',
      Icon: ShieldCheck,
      kicker: isEn ? 'Missing context' : 'Contesto mancante',
      title: isEn ? 'Activate your coach' : 'Attiva il tuo allenatore',
      body: isEn
        ? 'Your squad is ready. Add the active coach so advice considers style, bonuses and team identity.'
        : 'La rosa e pronta. Aggiungi il coach attivo per far considerare stile, bonus e identita della squadra.',
      primary: { label: isEn ? 'Open coach setup' : 'Apri setup coach', action: actions.openCoachSetup },
      secondary: { label: isEn ? 'Upload game stats' : 'Carica statistiche', action: actions.openGameAnalysis },
      checkpoints: [
        { label: isEn ? 'Squad' : 'Rosa', done: true },
        { label: isEn ? 'Active coach' : 'Coach attivo', done: false },
        { label: isEn ? 'Game stats' : 'Statistiche', done: hasGameStats }
      ]
    }
  }

  if (!hasGameStats) {
    return {
      key: 'needs_stats',
      progress: 62,
      tone: 'gold',
      Icon: BarChart3,
      kicker: isEn ? 'Best next move' : 'Prossima mossa migliore',
      title: isEn ? 'Upload your game stats' : 'Carica le statistiche di gioco',
      body: isEn
        ? 'This is the fastest way to make the Coach understand how you really play: shooting, passing, defending and dribbling.'
        : 'E il modo piu veloce per far capire al Coach come giochi davvero: tiro, passaggi, difesa e dribbling.',
      primary: { label: isEn ? 'Upload stats' : 'Carica statistiche', action: actions.openGameAnalysis },
      secondary: { label: isEn ? 'Ask the Coach' : 'Chiedi al Coach', action: actions.openCoachFeedback },
      checkpoints: [
        { label: isEn ? 'Squad' : 'Rosa', done: true },
        {
          label: isEn ? 'Coach & game stats' : 'Coach e statistiche',
          done: hasGameStats,
          partial: hasActiveCoach && !hasGameStats
        }
      ]
    }
  }

  if (!transactionFlags.hasUsedCardAdvisor) {
    return {
      key: 'card_advisor',
      progress: 76,
      tone: 'gold',
      Icon: Zap,
      kicker: isEn ? 'Use your roster' : 'Usa la tua rosa',
      title: isEn ? 'Check if new players fit your team' : 'Controlla se i nuovi giocatori vanno bene',
      body: isEn
        ? 'Card Advisor reads your real squad and tells you if a new card is useful, redundant or risky.'
        : 'Card Advisor legge la tua rosa reale e ti dice se una nuova carta e utile, doppione o rischiosa.',
      primary: { label: isEn ? 'Analyze new cards' : 'Analizza nuovi giocatori', action: actions.openCardAdvisor },
      secondary: { label: isEn ? 'Refresh stats' : 'Aggiorna statistiche', action: actions.openGameAnalysis },
      checkpoints: [
        { label: isEn ? 'Squad' : 'Rosa', done: true },
        { label: isEn ? 'Coach' : 'Coach', done: hasActiveCoach },
        { label: isEn ? 'Game stats' : 'Statistiche', done: true },
        { label: isEn ? 'Card fit' : 'Fit carte', done: false }
      ]
    }
  }

  if (!transactionFlags.hasAskedCoach) {
    return {
      key: 'coach_chat',
      progress: 88,
      tone: 'blue',
      Icon: MessageCircle,
      kicker: isEn ? 'First coaching result' : 'Primo risultato Coach',
      title: isEn ? 'Ask your first precise question' : 'Fai la prima domanda precisa',
      body: isEn
        ? 'Now the Coach has context. Ask something concrete about your squad, stats or the way you concede goals.'
        : 'Ora il Coach ha contesto. Chiedi qualcosa di concreto su rosa, statistiche o gol subiti.',
      primary: { label: isEn ? 'Ask the Coach' : 'Chiedi al Coach', action: actions.openCoachFeedback },
      secondary: { label: isEn ? 'Analyze cards' : 'Analizza carte', action: actions.openCardAdvisor },
      checkpoints: [
        { label: isEn ? 'Context' : 'Contesto', done: true },
        { label: isEn ? 'Card fit' : 'Fit carte', done: true },
        { label: isEn ? 'Coach question' : 'Domanda Coach', done: false }
      ]
    }
  }

  return {
    key: 'engaged',
    progress: 100,
    tone: 'green',
    Icon: CheckCircle2,
    kicker: isEn ? 'Coach online' : 'Coach operativo',
    title: isEn ? 'Your Coach has the right context' : 'Il tuo Coach ha il contesto giusto',
    body: isEn
      ? 'Keep it sharp: update game stats after sessions and check new cards before spending resources.'
      : 'Tienilo aggiornato: carica nuove statistiche dopo le sessioni e controlla le carte prima di investire.',
    primary: { label: isEn ? 'Check new cards' : 'Controlla nuove carte', action: actions.openCardAdvisor },
    secondary: { label: isEn ? 'Update stats' : 'Aggiorna statistiche', action: actions.openGameAnalysis },
    checkpoints: [
      { label: isEn ? 'Squad' : 'Rosa', done: true },
      { label: isEn ? 'Stats' : 'Statistiche', done: true },
      { label: isEn ? 'Coach used' : 'Coach usato', done: true }
    ]
  }
}

export default function HeroCoachJourney({
  loading = false,
  stats,
  hasActiveCoach,
  gameAnalysisLastCapture,
  lang = 'it',
  onOpenRoster,
  onOpenCoachSetup,
  onOpenGameAnalysis,
  onOpenCardAdvisor,
  onOpenCoachFeedback
}) {
  const [minimized, setMinimized] = React.useState(false)
  const [credits, setCredits] = React.useState(null)
  const [transactions, setTransactions] = React.useState([])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      setMinimized(window.localStorage.getItem(STORAGE_KEY) === '1')
    } catch {}
  }, [])

  React.useEffect(() => {
    if (loading) return
    let cancelled = false

    const fetchCreditContext = async () => {
      try {
        const token = await getAuthToken()
        if (!token || cancelled) return

        const [usageRes, txRes] = await Promise.all([
          fetch('/api/credits/usage', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({}),
            cache: 'no-store'
          }),
          fetch('/api/credits/transactions?limit=30', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
          })
        ])

        if (!cancelled && usageRes.ok) {
          const payload = await usageRes.json().catch(() => null)
          setCredits(payload)
        }
        if (!cancelled && txRes.ok) {
          const payload = await txRes.json().catch(() => null)
          setTransactions(Array.isArray(payload?.transactions) ? payload.transactions : [])
        }
      } catch {
        // La guida resta utile anche senza contesto crediti.
      }
    }

    fetchCreditContext()
    return () => {
      cancelled = true
    }
  }, [loading])

  const actions = React.useMemo(() => ({
    openRoster: onOpenRoster,
    openCoachSetup: onOpenCoachSetup || onOpenRoster,
    openGameAnalysis: onOpenGameAnalysis,
    openCardAdvisor: onOpenCardAdvisor,
    openCoachFeedback: onOpenCoachFeedback
  }), [onOpenRoster, onOpenCoachSetup, onOpenGameAnalysis, onOpenCardAdvisor, onOpenCoachFeedback])

  const transactionFlags = React.useMemo(() => getTransactionFlags(transactions), [transactions])
  const journey = React.useMemo(() => buildJourneyState({
    stats,
    hasActiveCoach,
    gameAnalysisLastCapture,
    transactionFlags,
    lang,
    actions
  }), [stats, hasActiveCoach, gameAnalysisLastCapture, transactionFlags, lang, actions])

  const isEn = lang === 'en'
  const balance = credits ? getNumber(credits.balance_remaining, Math.max(0, getNumber(credits.credits_included) - getNumber(credits.credits_used))) : null
  const giftLabel = balance != null && balance > 0
    ? (isEn ? `${balance} HP ready` : `${balance} HP pronti`)
    : (isEn ? 'HP gift ready' : 'HP omaggio pronti')
  const Icon = journey.Icon
  const starters = getNumber(stats?.titolari)
  const showXiCounter = journey.key === 'no_roster' || journey.key === 'roster_incomplete'
  const xiFilled = journey.key === 'no_roster' ? 0 : Math.min(11, starters)

  const setDeferred = () => {
    setMinimized(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {}
  }

  const restore = () => {
    setMinimized(false)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  React.useEffect(() => {
    if (journey.key !== 'engaged' || typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [journey.key])

  if (loading) return null
  if (journey.key === 'engaged') return null

  if (minimized) {
    return (
      <div className="hero-journey-mini" role="status" aria-live="polite">
        <div className="hero-journey-mini__pulse" />
        <div>
          <strong>{isEn ? 'Coach journey' : 'Percorso Coach'}</strong>
          <span>{journey.title}</span>
        </div>
        <button type="button" onClick={restore}>
          <RotateCcw size={15} />
          {isEn ? 'Resume' : 'Riprendi'}
        </button>
        <style jsx>{styles}</style>
      </div>
    )
  }

  return (
    <section className={`hero-journey hero-journey--${journey.tone}`} aria-label={isEn ? 'Coach journey' : 'Percorso Coach'}>
      <div className="hero-journey__field" aria-hidden="true">
        <span className="hero-journey__radar" />
      </div>

      <div className="hero-journey__main">
        <div className="hero-journey__head">
          <div className="hero-journey__kicker">
            <Icon size={13} />
            <span>{journey.kicker}</span>
          </div>
          <div className="hero-journey__hp">
            <Sparkles size={12} />
            {giftLabel}
          </div>
        </div>

        <div className="hero-journey__lead">
          {showXiCounter ? (
            <div className="hero-journey__xi" aria-hidden="true">
              <strong>{xiFilled}/11</strong>
              <div className="hero-journey__xi-dots">
                {Array.from({ length: 11 }, (_, index) => (
                  <span key={index} className={index < xiFilled ? 'is-on' : ''} />
                ))}
              </div>
            </div>
          ) : (
            <div className="hero-journey__badge" aria-hidden="true">
              <Icon size={20} />
            </div>
          )}
          <div className="hero-journey__copy">
            <h2>{journey.title}</h2>
            <p>{journey.body}</p>
          </div>
        </div>

        <div className="hero-journey__progress" aria-label={isEn ? 'Coach readiness progress' : 'Avanzamento preparazione Coach'}>
          <div>
            <span>{isEn ? 'Coach readiness' : 'Coach pronto'}</span>
            <strong>{journey.progress}%</strong>
          </div>
          <div className="hero-journey__progress-track">
            <span style={{ width: `${journey.progress}%` }} />
          </div>
        </div>

        <div className="hero-journey__checks">
          {journey.checkpoints.map((item, index) => {
            const firstOpen = journey.checkpoints.findIndex((cp) => !cp.done && !cp.partial)
            const isCurrent = !item.done && !item.partial && index === firstOpen
            return (
            <span
              key={item.label}
              className={[
                item.done ? 'is-done' : '',
                item.partial ? 'is-partial' : '',
                isCurrent ? 'is-current' : ''
              ].filter(Boolean).join(' ')}
            >
              <CheckCircle2 size={12} />
              {item.label}
            </span>
            )
          })}
        </div>

        <div className="hero-journey__actions">
          <button type="button" className="hero-journey__primary" onClick={journey.primary.action}>
            {journey.primary.label}
            <ArrowRight size={15} />
          </button>
          <button type="button" className="hero-journey__secondary" onClick={journey.secondary.action}>
            {journey.secondary.label}
          </button>
          <button type="button" className="hero-journey__defer" onClick={setDeferred}>
            <Minimize2 size={12} />
            {isEn ? 'Later' : 'Lo faccio dopo'}
          </button>
        </div>
      </div>

      <style jsx>{styles}</style>
    </section>
  )
}

const styles = `
  .hero-journey,
  .hero-journey-mini {
    position: relative;
    overflow: hidden;
    margin-bottom: 14px;
    border: 1px solid rgba(0, 212, 255, 0.24);
    background:
      radial-gradient(circle at 12% 0%, rgba(0, 212, 255, 0.12), transparent 32%),
      linear-gradient(145deg, rgba(4, 10, 26, 0.98), rgba(9, 17, 38, 0.94));
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.06);
    color: #fff;
  }

  .hero-journey {
    padding: 14px 16px;
    border-radius: 18px;
  }

  .hero-journey::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid transparent;
    background: linear-gradient(120deg, rgba(0, 212, 255, 0.45), rgba(255, 203, 5, 0.22), rgba(0, 212, 255, 0.45)) border-box;
    mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
    -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    opacity: 0.38;
    pointer-events: none;
  }

  .hero-journey__field {
    position: absolute;
    inset: 0;
    opacity: 0.28;
    pointer-events: none;
  }

  .hero-journey__radar {
    position: absolute;
    width: 220px;
    height: 220px;
    right: -70px;
    top: -90px;
    border-radius: 999px;
    background: conic-gradient(from 180deg, transparent, rgba(0, 212, 255, 0.18), transparent 42%);
    animation: heroRadar 12s linear infinite;
  }

  .hero-journey__main {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .hero-journey__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .hero-journey__kicker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 9px;
    border: 1px solid rgba(0, 212, 255, 0.26);
    border-radius: 999px;
    color: #8ff2ff;
    background: rgba(0, 212, 255, 0.07);
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .hero-journey__hp {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border: 1px solid rgba(255, 203, 5, 0.34);
    border-radius: 999px;
    color: #ffdf66;
    background: rgba(255, 203, 5, 0.08);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1px;
    flex-shrink: 0;
  }

  .hero-journey__lead {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .hero-journey__xi {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    min-width: 52px;
    padding: 8px 7px 6px;
    border: 1px solid rgba(0, 212, 255, 0.28);
    border-radius: 14px;
    background: rgba(0, 212, 255, 0.06);
  }

  .hero-journey__xi strong {
    font-size: 18px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -0.4px;
    color: #e8fdff;
  }

  .hero-journey__xi-dots {
    display: grid;
    grid-template-columns: repeat(4, 5px);
    gap: 3px;
  }

  .hero-journey__xi-dots span {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: rgba(255,255,255,0.14);
  }

  .hero-journey__xi-dots span.is-on {
    background: #00d4ff;
    box-shadow: 0 0 6px rgba(0, 212, 255, 0.45);
  }

  .hero-journey__badge {
    flex: 0 0 auto;
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: #9ff7ff;
    border: 1px solid rgba(0, 212, 255, 0.28);
    background: rgba(0, 212, 255, 0.08);
  }

  .hero-journey__copy {
    min-width: 0;
    flex: 1;
  }

  .hero-journey h2 {
    margin: 0 0 4px;
    font-size: clamp(17px, 4.2vw, 22px);
    line-height: 1.12;
    font-weight: 900;
    letter-spacing: -0.35px;
  }

  .hero-journey p {
    margin: 0;
    color: rgba(255,255,255,0.68);
    font-size: 13px;
    line-height: 1.45;
  }

  .hero-journey__progress {
    margin-top: 2px;
  }

  .hero-journey__progress > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 5px;
    color: rgba(255,255,255,0.58);
    font-size: 11px;
    font-weight: 800;
  }

  .hero-journey__progress strong {
    color: #fff;
    font-size: 11px;
  }

  .hero-journey__progress-track {
    height: 6px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
  }

  .hero-journey__progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #00d4ff, #ffcb05);
    box-shadow: 0 0 12px rgba(0, 212, 255, 0.28);
    transition: width 700ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hero-journey__checks {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 0;
  }

  .hero-journey__checks span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 999px;
    color: rgba(255,255,255,0.48);
    background: rgba(255,255,255,0.04);
    font-size: 11px;
    font-weight: 800;
  }

  .hero-journey__checks span.is-current {
    border-color: rgba(0, 212, 255, 0.36);
    color: #b8f6ff;
    background: rgba(0, 212, 255, 0.10);
  }

  .hero-journey__checks span.is-current svg {
    color: #00d4ff;
    opacity: 0.55;
  }

  .hero-journey__checks span.is-done {
    border-color: rgba(52, 199, 89, 0.24);
    color: rgba(139, 233, 168, 0.78);
    background: rgba(52, 199, 89, 0.07);
  }

  .hero-journey__checks span.is-partial {
    border-color: rgba(255, 203, 5, 0.32);
    color: #ffe08a;
    background: rgba(255, 203, 5, 0.08);
  }

  .hero-journey__checks span.is-partial svg {
    color: #8be9a8;
  }

  .hero-journey__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }

  .hero-journey__actions button {
    border-radius: 999px;
    cursor: pointer;
    font-weight: 900;
    transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease;
  }

  .hero-journey__actions button:hover {
    transform: translateY(-1px);
  }

  .hero-journey__primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 34px;
    padding: 0 14px;
    border: 1px solid rgba(0, 212, 255, 0.55);
    background: linear-gradient(180deg, rgba(0, 212, 255, 0.22), rgba(0, 212, 255, 0.08));
    color: #e8fdff;
    font-size: 12px;
    box-shadow: 0 0 18px rgba(0, 212, 255, 0.14);
  }

  .hero-journey__primary:hover {
    border-color: rgba(0, 212, 255, 0.78);
    box-shadow: 0 0 22px rgba(0, 212, 255, 0.22);
  }

  .hero-journey__secondary {
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid rgba(255,255,255,0.14) !important;
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.78);
    font-size: 11px;
  }

  .hero-journey__defer {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 30px;
    padding: 0 8px;
    margin-left: auto;
    border: none !important;
    background: transparent !important;
    color: rgba(255,255,255,0.46);
    font-size: 11px;
  }

  .hero-journey__defer:hover {
    color: rgba(255,255,255,0.68);
    transform: none;
  }

  .hero-journey-mini {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
  }

  .hero-journey-mini__pulse {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: #ffcb05;
    box-shadow: 0 0 0 0 rgba(255, 203, 5, 0.45);
    animation: heroMiniPulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
  }

  .hero-journey-mini div:nth-child(2) {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hero-journey-mini strong {
    font-size: 14px;
  }

  .hero-journey-mini span {
    color: rgba(255,255,255,0.62);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hero-journey-mini button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 36px;
    padding: 0 13px;
    border: 1px solid rgba(0, 212, 255, 0.28);
    border-radius: 999px;
    background: rgba(0, 212, 255, 0.09);
    color: #8ff2ff;
    cursor: pointer;
    font-size: 12px;
    font-weight: 900;
    flex-shrink: 0;
  }

  .hero-journey--green .hero-journey__progress-track span {
    background: linear-gradient(90deg, #34c759, #8be9a8);
  }

  .hero-journey--blue .hero-journey__progress-track span {
    background: linear-gradient(90deg, #00d4ff, #a855f7);
  }

  @keyframes heroRadar {
    to { transform: rotate(360deg); }
  }

  @keyframes heroMiniPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 203, 5, 0.38); }
    50% { box-shadow: 0 0 0 9px rgba(255, 203, 5, 0); }
  }

  @media (max-width: 560px) {
    .hero-journey {
      padding: 12px 14px;
      border-radius: 16px;
    }

    .hero-journey__head {
      flex-wrap: wrap;
    }

    .hero-journey__actions {
      gap: 6px;
    }

    .hero-journey__primary,
    .hero-journey__secondary {
      flex: 1 1 calc(50% - 4px);
      min-width: 0;
    }

    .hero-journey__defer {
      flex: 1 1 100%;
      margin-left: 0;
      justify-content: center;
    }

    .hero-journey-mini {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .hero-journey-mini button {
      width: 100%;
      justify-content: center;
      min-height: 32px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-journey__radar,
    .hero-journey-mini__pulse {
      animation: none;
    }
  }
`
