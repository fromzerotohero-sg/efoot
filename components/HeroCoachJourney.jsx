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
  Target,
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
      secondary: { label: isEn ? 'Check new cards' : 'Controlla nuovi giocatori', action: actions.openCardAdvisor },
      checkpoints: [
        { label: isEn ? 'Squad' : 'Rosa', done: true },
        { label: isEn ? 'Coach' : 'Coach', done: true },
        { label: isEn ? 'Game stats' : 'Statistiche', done: false }
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

  if (loading) return null

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
        <span className="hero-journey__lane hero-journey__lane--one" />
        <span className="hero-journey__lane hero-journey__lane--two" />
      </div>

      <div className="hero-journey__visual" aria-hidden="true">
        <div className="hero-journey__orb">
          <Target size={36} />
          <span className="hero-journey__orb-ring" />
        </div>
        <div className="hero-journey__hp">
          <Sparkles size={14} />
          {giftLabel}
        </div>
      </div>

      <div className="hero-journey__content">
        <div className="hero-journey__kicker">
          <Icon size={15} />
          <span>{journey.kicker}</span>
        </div>
        <h2>{journey.title}</h2>
        <p>{journey.body}</p>

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
          {journey.checkpoints.map((item) => (
            <span key={item.label} className={item.done ? 'is-done' : ''}>
              <CheckCircle2 size={14} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-journey__actions">
        <button type="button" className="hero-journey__primary" onClick={journey.primary.action}>
          {journey.primary.label}
          <ArrowRight size={17} />
        </button>
        <button type="button" className="hero-journey__secondary" onClick={journey.secondary.action}>
          {journey.secondary.label}
        </button>
        <button type="button" className="hero-journey__defer" onClick={setDeferred}>
          <Minimize2 size={14} />
          {isEn ? 'Later' : 'Lo faccio dopo'}
        </button>
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
    margin-bottom: 22px;
    border: 1px solid rgba(0, 212, 255, 0.30);
    background:
      radial-gradient(circle at 15% 20%, rgba(0, 212, 255, 0.20), transparent 28%),
      radial-gradient(circle at 88% 18%, rgba(255, 203, 5, 0.16), transparent 30%),
      linear-gradient(145deg, rgba(4, 10, 26, 0.98), rgba(9, 17, 38, 0.94));
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.08);
    color: #fff;
  }

  .hero-journey {
    display: grid;
    grid-template-columns: minmax(120px, 180px) minmax(0, 1fr) minmax(180px, 240px);
    gap: 22px;
    align-items: center;
    padding: clamp(20px, 3vw, 30px);
    border-radius: 26px;
  }

  .hero-journey::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid transparent;
    background: linear-gradient(120deg, rgba(0, 212, 255, 0.72), rgba(255, 203, 5, 0.42), rgba(168, 85, 247, 0.48), rgba(0, 212, 255, 0.72)) border-box;
    mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
    -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    opacity: 0.54;
    pointer-events: none;
  }

  .hero-journey__field {
    position: absolute;
    inset: 0;
    opacity: 0.42;
    pointer-events: none;
    background:
      linear-gradient(90deg, transparent 49.5%, rgba(0, 212, 255, 0.15) 50%, transparent 50.5%),
      linear-gradient(0deg, transparent 49.5%, rgba(255, 255, 255, 0.08) 50%, transparent 50.5%);
  }

  .hero-journey__radar {
    position: absolute;
    width: 360px;
    height: 360px;
    right: -120px;
    top: -150px;
    border-radius: 999px;
    background: conic-gradient(from 180deg, transparent, rgba(0, 212, 255, 0.26), transparent 42%);
    animation: heroRadar 9s linear infinite;
  }

  .hero-journey__lane {
    position: absolute;
    left: 8%;
    right: 8%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.20), transparent);
  }

  .hero-journey__lane--one { top: 32%; }
  .hero-journey__lane--two { bottom: 28%; }

  .hero-journey__visual,
  .hero-journey__content,
  .hero-journey__actions {
    position: relative;
    z-index: 1;
  }

  .hero-journey__visual {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .hero-journey__orb {
    position: relative;
    width: clamp(96px, 12vw, 132px);
    height: clamp(96px, 12vw, 132px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 34px;
    color: #9ff7ff;
    background:
      radial-gradient(circle at 35% 25%, rgba(255,255,255,0.24), transparent 20%),
      linear-gradient(145deg, rgba(0, 212, 255, 0.20), rgba(5, 10, 25, 0.86));
    border: 1px solid rgba(0, 212, 255, 0.46);
    box-shadow: 0 0 42px rgba(0, 212, 255, 0.22), inset 0 1px 0 rgba(255,255,255,0.12);
  }

  .hero-journey__orb-ring {
    position: absolute;
    inset: -9px;
    border: 1px solid rgba(0, 212, 255, 0.24);
    border-radius: 40px;
    animation: heroPulse 2.8s ease-in-out infinite;
  }

  .hero-journey__hp {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 11px;
    border: 1px solid rgba(255, 203, 5, 0.42);
    border-radius: 999px;
    color: #ffdf66;
    background: rgba(255, 203, 5, 0.10);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.2px;
    box-shadow: 0 0 20px rgba(255, 203, 5, 0.12);
  }

  .hero-journey__kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 7px 11px;
    margin-bottom: 12px;
    border: 1px solid rgba(0, 212, 255, 0.30);
    border-radius: 999px;
    color: #8ff2ff;
    background: rgba(0, 212, 255, 0.08);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .hero-journey h2 {
    margin: 0 0 9px;
    font-size: clamp(25px, 4vw, 38px);
    line-height: 1.02;
    font-weight: 950;
    letter-spacing: -0.8px;
  }

  .hero-journey p {
    max-width: 720px;
    margin: 0;
    color: rgba(255,255,255,0.72);
    font-size: 15px;
    line-height: 1.58;
  }

  .hero-journey__progress {
    margin-top: 18px;
  }

  .hero-journey__progress > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    color: rgba(255,255,255,0.62);
    font-size: 12px;
    font-weight: 800;
  }

  .hero-journey__progress strong {
    color: #fff;
  }

  .hero-journey__progress-track {
    height: 9px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    box-shadow: inset 0 1px 4px rgba(0,0,0,0.42);
  }

  .hero-journey__progress-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #00d4ff, #ffcb05);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.34);
    transition: width 700ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hero-journey__checks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }

  .hero-journey__checks span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 999px;
    color: rgba(255,255,255,0.56);
    background: rgba(255,255,255,0.045);
    font-size: 12px;
    font-weight: 800;
  }

  .hero-journey__checks span.is-done {
    border-color: rgba(52, 199, 89, 0.32);
    color: #8be9a8;
    background: rgba(52, 199, 89, 0.09);
  }

  .hero-journey__actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .hero-journey__actions button {
    min-height: 44px;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 900;
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  }

  .hero-journey__actions button:hover {
    transform: translateY(-2px);
  }

  .hero-journey__primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 18px;
    background: linear-gradient(135deg, #ffcb05, #f97316);
    color: #06101f;
    box-shadow: 0 12px 30px rgba(255, 203, 5, 0.20);
  }

  .hero-journey__secondary,
  .hero-journey__defer {
    padding: 0 16px;
    color: rgba(255,255,255,0.82);
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.13) !important;
  }

  .hero-journey__defer {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 38px !important;
    color: rgba(255,255,255,0.58);
    font-size: 12px !important;
  }

  .hero-journey-mini {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
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

  @keyframes heroPulse {
    0%, 100% { transform: scale(1); opacity: 0.38; }
    50% { transform: scale(1.06); opacity: 0.78; }
  }

  @keyframes heroMiniPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 203, 5, 0.38); }
    50% { box-shadow: 0 0 0 9px rgba(255, 203, 5, 0); }
  }

  @media (max-width: 900px) {
    .hero-journey {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .hero-journey__visual {
      align-items: flex-start;
      flex-direction: row;
      justify-content: space-between;
    }

    .hero-journey__orb {
      width: 78px;
      height: 78px;
      border-radius: 24px;
    }

    .hero-journey__orb-ring {
      border-radius: 30px;
    }

    .hero-journey__actions {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .hero-journey__primary,
    .hero-journey__secondary {
      flex: 1 1 190px;
    }

    .hero-journey__defer {
      flex: 1 1 100%;
    }
  }

  @media (max-width: 560px) {
    .hero-journey {
      padding: 18px;
      border-radius: 22px;
    }

    .hero-journey__visual {
      align-items: center;
    }

    .hero-journey__hp {
      font-size: 11px;
      padding: 7px 9px;
    }

    .hero-journey h2 {
      font-size: 25px;
    }

    .hero-journey p {
      font-size: 14px;
    }

    .hero-journey__primary,
    .hero-journey__secondary,
    .hero-journey__defer {
      flex-basis: 100%;
      width: 100%;
    }

    .hero-journey-mini {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .hero-journey-mini button {
      width: 100%;
      justify-content: center;
    }
  }
`
