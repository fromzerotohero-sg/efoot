'use client'

import React from 'react'
import {
  Users,
  UserCheck,
  BarChart3,
  Radio,
  Trophy,
  TrendingUp,
  Calendar,
  ArrowRight,
  AlertCircle,
  SendHorizonal,
  Play
} from 'lucide-react'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'

/**
 * UX V2 — Coach Home (facade presentazionale).
 * Reference visiva vincolante: tavola UX V2 "DESKTOP - HOME COACH".
 * Nessun dato proprio: tutto arriva via props da app/page.jsx, che possiede
 * fetch dashboard, stats, match, modali, deep link ed eventi.
 *
 * S2: l'area conversazione e una ENTRY composer-like verso il motore reale
 * (open-assistant-chat / CoachFeedbackChat). La chat unificata e S3;
 * la card "Vuoi che lo ricordi?" e S5. Niente dati fake dalla tavola:
 * forma uguale, contenuti solo da dati/route/azioni reali.
 */

const STR = {
  it: {
    greeting: 'Ciao Hero! 👋',
    greetingSub: 'Sono qui per aiutarti a diventare imbattibile.',
    heroBadge: 'AI',
    composerPlaceholder: 'Scrivi un messaggio a Hero…',
    composerAria: 'Chiedi a Hero',
    pills: [
      {
        label: 'Analizza la mia ultima partita',
        message: 'Analizza la mia ultima partita: cosa è andato bene, cosa no, e la priorità per la prossima.'
      },
      {
        label: 'Come sto giocando?',
        message: 'Come sto giocando? Dammi un quadro onesto del mio livello attuale.'
      },
      {
        label: 'Cosa posso migliorare?',
        message: 'Cosa posso migliorare? Dammi le priorità concrete per le prossime partite.'
      },
      {
        label: 'Che formazione mi consigli?',
        message: 'Che formazione mi consigli per la mia rosa attuale? Spiegami perché.'
      }
    ],
    nextAction: 'Prossima azione',
    nextActionPlan: 'Piano Coach',
    knowledge: 'Quanto Hero ti conosce',
    knowledgeSub: 'Rispondi e gioca per migliorare la conoscenza di Hero su di te.',
    insight: 'Ultimo insight',
    insightDetails: 'Vedi dettagli',
    context: 'Il tuo contesto',
    contextRoster: 'Rosa',
    contextCoach: 'Allenatore',
    contextStats: 'Statistiche',
    contextLastMatch: 'Ultimo match',
    rosterEmpty: 'Da creare',
    coachActive: 'Attivo',
    coachMissing: 'Da configurare',
    statsReady: 'Disponibili',
    statsMissing: 'Da aggiungere',
    tools: 'Progressi e strumenti',
    toolsProgress: 'Progressi',
    toolsMatches: 'Partite',
    toolsPrepare: 'Prepara partita',
    toolsLive: 'Live Coach',
    moreAboutYou: 'Altro su di te',
    lowHp: 'Saldo HP insufficiente per le azioni AI (costo standard: 2 HP).',
    lowHpCta: 'Ottieni HP',
    states: {
      NEW: {
        title: 'Crea la tua rosa',
        desc: 'Hero ha bisogno dei tuoi giocatori reali per darti consigli utili.',
        cta: 'Crea la tua rosa',
        bubble: 'Benvenuto! Crea la tua rosa con i giocatori reali: da lì posso aiutarti davvero.'
      },
      ROSTER_INCOMPLETE: {
        title: 'Completa la rosa',
        desc: 'Ti mancano titolari per una formazione completa.',
        cta: 'Completa rosa',
        bubble: 'La tua rosa non è ancora completa: sistema i titolari e poi parliamo di tattica.'
      },
      NO_COACH: {
        title: 'Scegli il tuo allenatore',
        desc: 'L’allenatore attivo cambia modulo, tattica e consigli di Hero.',
        cta: 'Configura allenatore',
        bubble: 'Scegli il tuo allenatore: modulo e consigli cambiano davvero.'
      },
      POST_MATCH: {
        title: 'Raccontami com’è andata',
        desc: 'Partita appena finita: due minuti di feedback rendono i prossimi consigli più tuoi.',
        cta: 'Raccontami com’è andata',
        bubble: 'Raccontami com’è andata la tua ultima partita. Cosa è andato bene? Cosa possiamo migliorare?'
      },
      READY_NO_STATS: {
        title: 'Chiedi a Hero',
        desc: 'Hero è pronto. Le statistiche rendono i consigli più precisi, ma non servono per iniziare.',
        cta: 'Chiedi a Hero',
        bubble: 'Sono pronto: chiedimi analisi, formazioni o priorità. Se vuoi consigli più precisi, aggiungi le statistiche di gioco.'
      },
      OPERATIONAL: {
        title: 'Chiedi a Hero',
        desc: 'Hero usa rosa, allenatore e statistiche reali della tua squadra.',
        cta: 'Chiedi a Hero',
        bubble: 'Sono qui per aiutarti: analisi, formazioni, carte o preparazione della prossima partita.'
      }
    },
    secondary: {
      addStats: 'Aggiungi statistiche',
      seeMatches: 'Vedi partite'
    }
  },
  en: {
    greeting: 'Hello Hero! 👋',
    greetingSub: 'I’m here to help you become unbeatable.',
    heroBadge: 'AI',
    composerPlaceholder: 'Write a message to Hero…',
    composerAria: 'Ask Hero',
    pills: [
      {
        label: 'Analyze my last match',
        message: 'Analyze my last match: what went well, what didn’t, and the priority for the next one.'
      },
      {
        label: 'How am I playing?',
        message: 'How am I playing? Give me an honest picture of my current level.'
      },
      {
        label: 'What can I improve?',
        message: 'What can I improve? Give me concrete priorities for the next matches.'
      },
      {
        label: 'What formation do you suggest?',
        message: 'What formation do you suggest for my current squad? Explain why.'
      }
    ],
    nextAction: 'Next action',
    nextActionPlan: 'Coach Plan',
    knowledge: 'How well Hero knows you',
    knowledgeSub: 'Answer and play to improve what Hero knows about you.',
    insight: 'Latest insight',
    insightDetails: 'See details',
    context: 'Your context',
    contextRoster: 'Squad',
    contextCoach: 'Coach',
    contextStats: 'Game stats',
    contextLastMatch: 'Last match',
    rosterEmpty: 'To create',
    coachActive: 'Active',
    coachMissing: 'To set up',
    statsReady: 'Available',
    statsMissing: 'To add',
    tools: 'Progress & tools',
    toolsProgress: 'Progress',
    toolsMatches: 'Matches',
    toolsPrepare: 'Prepare match',
    toolsLive: 'Live Coach',
    moreAboutYou: 'More about you',
    lowHp: 'Not enough HP for AI actions (standard cost: 2 HP).',
    lowHpCta: 'Get HP',
    states: {
      NEW: {
        title: 'Create your squad',
        desc: 'Hero needs your real players to give you useful advice.',
        cta: 'Create your squad',
        bubble: 'Welcome! Create your squad with your real players: that’s where I can really help.'
      },
      ROSTER_INCOMPLETE: {
        title: 'Complete your squad',
        desc: 'You are missing starters for a complete formation.',
        cta: 'Complete squad',
        bubble: 'Your squad is not complete yet: fix the starters and then let’s talk tactics.'
      },
      NO_COACH: {
        title: 'Choose your coach',
        desc: 'The active coach changes formation, tactics and Hero’s advice.',
        cta: 'Set up coach',
        bubble: 'Choose your coach: formation and advice really change.'
      },
      POST_MATCH: {
        title: 'Tell me how it went',
        desc: 'Match just finished: two minutes of feedback make the next advice more yours.',
        cta: 'Tell me how it went',
        bubble: 'Tell me how your last match went. What went well? What can we improve?'
      },
      READY_NO_STATS: {
        title: 'Ask Hero',
        desc: 'Hero is ready. Game stats make advice sharper, but you don’t need them to start.',
        cta: 'Ask Hero',
        bubble: 'I’m ready: ask me analysis, formations or priorities. Add game stats for sharper advice.'
      },
      OPERATIONAL: {
        title: 'Ask Hero',
        desc: 'Hero uses your squad’s real roster, coach and stats.',
        cta: 'Ask Hero',
        bubble: 'I’m here to help: analysis, formations, cards or next match preparation.'
      }
    },
    secondary: {
      addStats: 'Add game stats',
      seeMatches: 'See matches'
    }
  }
}

/**
 * Priorità stati (Master §5.2 + prompt S2 §7):
 * A NEW → B ROSTER_INCOMPLETE → C NO_COACH → D POST_MATCH → E READY_NO_STATS → F OPERATIONAL.
 * POST_MATCH usa la stessa semantica temporale già esistente in CoachSuggestions (ultimo match < 30 min).
 */
function resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo }) {
  if (!stats || stats.totalPlayers === 0) return 'NEW'
  if (stats.titolari < 11) return 'ROSTER_INCOMPLETE'
  if (!hasActiveCoach) return 'NO_COACH'
  if (lastMatchMinutesAgo !== null && lastMatchMinutesAgo < 30) return 'POST_MATCH'
  if (!gameAnalysisLastCapture) return 'READY_NO_STATS'
  return 'OPERATIONAL'
}

function formatMatchDate(rawDate, lang) {
  if (!rawDate) return null
  const d = new Date(rawDate)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function CoachHomeV2({
  lang,
  stats,
  hasActiveCoach,
  recentMatches,
  gameAnalysisLastCapture,
  tacticalPatterns,
  hpBalance,
  onAskHero,
  onAskHeroMessage,
  onOpenFeedback,
  onOpenGameAnalysis,
  onOpenCardAdvisor,
  onOpenLiveCoach,
  onOpenRoster,
  onOpenCoachSetup,
  onOpenCountermeasures,
  onOpenProgress,
  onOpenMatches,
  onGetHp,
  toolsExtra = null
}) {
  const s = STR[lang === 'en' ? 'en' : 'it']
  const [isMobileLayout, setIsMobileLayout] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobileLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const lastMatch = Array.isArray(recentMatches) && recentMatches.length > 0 ? recentMatches[0] : null
  const lastMatchRaw = lastMatch?.created_at || lastMatch?.match_date || null
  const lastMatchDate = lastMatchRaw ? new Date(lastMatchRaw) : null
  const lastMatchMinutesAgo =
    lastMatchDate && !isNaN(lastMatchDate.getTime())
      ? (Date.now() - lastMatchDate.getTime()) / (1000 * 60)
      : null

  const homeState = resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo })
  const stateCopy = s.states[homeState]

  // LOW HP: solo se il saldo reale è noto E l'azione proposta costa HP.
  // Crea/completa rosa e configura allenatore sono navigazione gratuita.
  const primaryCostsHp = homeState === 'POST_MATCH' || homeState === 'READY_NO_STATS' || homeState === 'OPERATIONAL'
  const lowHp =
    primaryCostsHp && typeof hpBalance === 'number' && Number.isFinite(hpBalance) && hpBalance < 2

  const primaryAction = (() => {
    switch (homeState) {
      case 'NEW':
      case 'ROSTER_INCOMPLETE':
        return onOpenRoster
      case 'NO_COACH':
        return onOpenCoachSetup
      case 'POST_MATCH':
        return onOpenFeedback
      default:
        return onAskHero
    }
  })()

  const secondaryAction = (() => {
    if (homeState === 'POST_MATCH') return { label: s.secondary.seeMatches, onClick: onOpenMatches }
    if (homeState === 'READY_NO_STATS') return { label: s.secondary.addStats, onClick: onOpenGameAnalysis }
    return null
  })()

  // Progresso reale disponibile solo per la rosa (X/11 titolari): niente barre inventate.
  const rosterProgress =
    stats && stats.totalPlayers > 0 ? Math.min(100, Math.round((stats.titolari / 11) * 100)) : null

  // Ultimo insight: solo da recurring_issues reali (team_tactical_patterns via /api/dashboard).
  // Se non ci sono issue reali la card non viene mostrata (niente insight inventati).
  const recurringIssues = Array.isArray(tacticalPatterns?.recurring_issues)
    ? tacticalPatterns.recurring_issues
    : []
  const latestInsight = recurringIssues.length > 0
    ? String(recurringIssues[0]?.issue || recurringIssues[0] || '').trim()
    : ''

  const contextRows = [
    {
      key: 'roster',
      icon: Users,
      label: s.contextRoster,
      value: !stats || stats.totalPlayers === 0 ? s.rosterEmpty : `${stats.titolari}/11`
    },
    {
      key: 'coach',
      icon: UserCheck,
      label: s.contextCoach,
      value: hasActiveCoach ? s.coachActive : s.coachMissing
    },
    {
      key: 'stats',
      icon: BarChart3,
      label: s.contextStats,
      value: gameAnalysisLastCapture ? `${s.statsReady} · ${gameAnalysisLastCapture}` : s.statsMissing,
      tourId: 'tour-dashboard-game-analysis'
    }
  ]

  const lastMatchLabel = lastMatch
    ? `${lastMatch.opponent_name || '—'}${formatMatchDate(lastMatchRaw, lang) ? ` · ${formatMatchDate(lastMatchRaw, lang)}` : ''}`
    : null

  const nextActionCard = (
    <section className="chv2-card chv2-card-action" data-tour-id="tour-dashboard-task" aria-label={s.nextAction}>
      <p className="chv2-overline">{s.nextAction}</p>
      <p className="chv2-plan-label">{s.nextActionPlan}</p>
      <h2 className="chv2-next-title">{stateCopy.title}</h2>
      <p className="chv2-next-desc">{stateCopy.desc}</p>

      {homeState === 'ROSTER_INCOMPLETE' && rosterProgress !== null && (
        <div className="chv2-progress" role="progressbar" aria-valuenow={rosterProgress} aria-valuemin={0} aria-valuemax={100}>
          <div className="chv2-progress-bar" style={{ width: `${rosterProgress}%` }} />
        </div>
      )}
      {homeState === 'ROSTER_INCOMPLETE' && stats && (
        <p className="chv2-progress-label">{s.contextRoster}: {stats.titolari}/11</p>
      )}

      {lowHp && (
        <div className="chv2-lowhp" role="status">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{s.lowHp}</span>
          <button type="button" className="chv2-lowhp-cta" onClick={onGetHp}>
            {s.lowHpCta}
          </button>
        </div>
      )}

      <button type="button" className="chv2-primary-cta" onClick={primaryAction}>
        {stateCopy.cta}
      </button>

      {secondaryAction && (
        <button type="button" className="chv2-secondary-cta" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </button>
      )}
    </section>
  )

  const secondaryCards = (
    <>
      <section className="chv2-card chv2-card-knowledge" data-tour-id="tour-dashboard-ai" aria-label={s.knowledge}>
        <p className="chv2-overline">{s.knowledge}</p>
        <AIKnowledgeBar variant="gauge" />
        <p className="chv2-knowledge-sub">{s.knowledgeSub}</p>
      </section>

      {latestInsight && (
        <section className="chv2-card chv2-card-insight" aria-label={s.insight}>
          <p className="chv2-overline">{s.insight}</p>
          <p className="chv2-insight-text">{latestInsight}</p>
          <button type="button" className="chv2-text-link" onClick={onOpenProgress}>
            {s.insightDetails}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </section>
      )}

      <section className="chv2-card chv2-card-context" data-tour-id="tour-dashboard-squad" aria-label={s.context}>
        <p className="chv2-overline">{s.context}</p>
        <div className="chv2-context-rows">
          {contextRows.map((row) => {
            const Icon = row.icon
            return (
              <div
                key={row.key}
                className="chv2-context-row"
                {...(row.tourId ? { 'data-tour-id': row.tourId } : {})}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="chv2-context-label">{row.label}</span>
                <span className="chv2-context-value">{row.value}</span>
              </div>
            )
          })}
          {lastMatchLabel && (
            <div className="chv2-context-row">
              <Calendar size={15} aria-hidden="true" />
              <span className="chv2-context-label">{s.contextLastMatch}</span>
              <span className="chv2-context-value">{lastMatchLabel}</span>
            </div>
          )}
        </div>
      </section>
    </>
  )

  const toolsSection = (
    <section className="chv2-tools-section" data-tour-id="tour-dashboard-nav" aria-label={s.tools}>
      <p className="chv2-overline">{s.tools}</p>
      <div className="chv2-tools">
        <button type="button" className="chv2-tool" onClick={onOpenProgress}>
          <TrendingUp size={15} aria-hidden="true" />
          {s.toolsProgress}
        </button>
        <button type="button" className="chv2-tool" onClick={onOpenMatches}>
          <Calendar size={15} aria-hidden="true" />
          {s.toolsMatches}
        </button>
        <button type="button" className="chv2-tool" onClick={onOpenCountermeasures}>
          <Trophy size={15} aria-hidden="true" />
          {s.toolsPrepare}
        </button>
        <button
          type="button"
          className="chv2-tool"
          onClick={onOpenLiveCoach}
          data-tour-id="tour-dashboard-live-coach"
        >
          <Radio size={15} aria-hidden="true" />
          {s.toolsLive}
        </button>
        {toolsExtra}
      </div>
    </section>
  )

  return (
    <div className="coach-home-v2">
      <div className="chv2-grid">
        <div className="chv2-main">
          <header className="chv2-header">
            <h1 className="chv2-greeting">{s.greeting}</h1>
            <p className="chv2-greeting-sub">{s.greetingSub}</p>
          </header>

          <div className="chv2-hero-surface">
          <div className="chv2-pills" role="group" aria-label={s.composerAria}>
            {s.pills.map((pill) => (
              <button
                key={pill.label}
                type="button"
                className="chv2-pill"
                onClick={() => onAskHeroMessage?.(pill.message)}
              >
                <span className="chv2-pill-icon" aria-hidden="true">
                  <Play size={9} />
                </span>
                {pill.label}
              </button>
            ))}
          </div>

          <button type="button" className="chv2-hero-bubble" onClick={primaryAction}>
            <span className="chv2-hero-identity">
              <img src="/coach.jpg" alt="" className="chv2-hero-avatar" />
              <span className="chv2-hero-name">Hero Coach</span>
              <span className="chv2-hero-badge">{s.heroBadge}</span>
            </span>
            <span className="chv2-hero-text">{stateCopy.bubble}</span>
          </button>

          <button
            type="button"
            className="chv2-composer"
            onClick={onAskHero}
            aria-label={s.composerAria}
          >
            <span className="chv2-composer-placeholder">{s.composerPlaceholder}</span>
            <span className="chv2-composer-send" aria-hidden="true">
              <SendHorizonal size={15} />
            </span>
          </button>
          </div>
        </div>

        <div className="chv2-side" data-tour-id="tour-dashboard-mission-center">
          {nextActionCard}
          {isMobileLayout ? (
            <details className="chv2-more">
              <summary className="chv2-more-summary">{s.moreAboutYou}</summary>
              <div className="chv2-more-body">
                {secondaryCards}
                {toolsSection}
              </div>
            </details>
          ) : (
            <div className="chv2-side-rest">
              {secondaryCards}
              {toolsSection}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Tokens campionati dalla tavola UX V2 (JPEG 1536x1024):
           bg #091016/#0d141c, surface #14181f, coach #30b060, cta #2fbf6a */
        .coach-home-v2 {
          --ch-bg: #0a1117;
          --ch-surface: #131d26;
          --ch-surface-2: #101820;
          --ch-border: rgba(255, 255, 255, 0.055);
          --ch-text: #f4f6f7;
          --ch-muted: rgba(244, 246, 247, 0.52);
          --ch-coach: #30ba6d;
          --ch-cta: #30ba6d;
          --ch-gold: #c9a227;
          --ch-ai: #7c6cf0;
          --ch-radius: 14px;
          --ch-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1180px;
          margin: 0 auto;
          width: 100%;
          color: var(--ch-text);
        }

        :global(.coach-home-page) {
          padding: 20px 24px 28px;
        }

        .chv2-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chv2-greeting {
          margin: 0;
          font-size: clamp(24px, 3.2vw, 32px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--ch-text);
          line-height: 1.12;
        }

        .chv2-greeting-sub {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--ch-muted);
        }

        .chv2-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: start;
        }

        @media (min-width: 1024px) {
          .chv2-grid {
            grid-template-columns: minmax(0, 1.72fr) 292px;
            gap: 22px;
          }
        }

        .chv2-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .chv2-hero-surface {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 420px;
          padding: 22px 22px 18px;
          border-radius: 20px;
          border: 1px solid var(--ch-border);
          background: linear-gradient(180deg, #151c24 0%, #101820 100%);
          box-shadow: var(--ch-shadow);
        }

        .chv2-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chv2-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 32px;
          padding: 6px 12px 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: rgba(8, 12, 16, 0.55);
          color: rgba(244, 246, 247, 0.72);
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .chv2-pill-icon {
          display: inline-flex;
          color: var(--ch-coach);
          opacity: 0.9;
        }

        .chv2-pill:hover {
          border-color: rgba(48, 176, 96, 0.28);
          color: var(--ch-text);
        }

        .chv2-hero-bubble {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 88%;
          padding: 14px 16px;
          border-radius: 4px 16px 16px 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: #1a212a;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
        }

        .chv2-hero-bubble:hover {
          border-color: rgba(48, 176, 96, 0.22);
        }

        .chv2-hero-identity {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chv2-hero-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.12);
          flex-shrink: 0;
        }

        .chv2-hero-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--ch-text);
        }

        .chv2-hero-badge {
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #f8f6ff;
          background: var(--ch-ai);
        }

        .chv2-hero-text {
          font-size: 14px;
          line-height: 1.55;
          color: rgba(244, 246, 247, 0.86);
        }

        .chv2-composer {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          margin-top: auto;
          min-height: 48px;
          padding: 8px 8px 8px 18px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #0c1117;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
        }

        .chv2-composer:hover {
          border-color: rgba(48, 176, 96, 0.3);
        }

        .chv2-composer-placeholder {
          flex: 1;
          min-width: 0;
          font-size: 13px;
          color: rgba(244, 246, 247, 0.38);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chv2-composer-send {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--ch-cta);
          color: #06140c;
          flex-shrink: 0;
        }

        .chv2-side {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .chv2-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--ch-surface);
          border: 1px solid var(--ch-border);
          border-radius: var(--ch-radius);
          padding: 16px 16px 14px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .chv2-card-action {
          gap: 10px;
          padding: 18px 16px 16px;
        }

        .chv2-card-knowledge {
          align-items: center;
          text-align: center;
          padding: 16px 14px 14px;
        }

        .chv2-card-insight {
          background: var(--ch-surface-2);
          box-shadow: none;
        }

        .chv2-card-context {
          background: transparent;
          box-shadow: none;
          padding: 8px 4px 0;
          border-color: transparent;
        }

        .chv2-overline {
          margin: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(244, 246, 247, 0.38);
        }

        .chv2-plan-label {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          color: rgba(244, 246, 247, 0.42);
        }

        .chv2-next-title {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          line-height: 1.25;
          color: var(--ch-text);
        }

        .chv2-next-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: var(--ch-muted);
        }

        .chv2-progress {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .chv2-progress-bar {
          height: 100%;
          border-radius: 999px;
          background: var(--ch-coach);
          transition: width 0.3s ease;
        }

        .chv2-progress-label {
          margin: 0;
          font-size: 11px;
          font-weight: 600;
          color: rgba(244, 246, 247, 0.5);
        }

        .chv2-lowhp {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(201, 162, 39, 0.28);
          background: rgba(201, 162, 39, 0.08);
          color: #e8d48a;
          font-size: 12px;
          line-height: 1.4;
        }

        .chv2-lowhp-cta {
          margin-left: auto;
          min-height: 32px;
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid rgba(201, 162, 39, 0.4);
          background: rgba(201, 162, 39, 0.12);
          color: var(--ch-gold);
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .chv2-primary-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 44px;
          margin-top: 2px;
          padding: 11px 18px;
          border: none;
          border-radius: 10px;
          background: var(--ch-cta);
          color: #06140c;
          font-size: 14px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .chv2-primary-cta:hover {
          filter: brightness(1.06);
        }

        .chv2-secondary-cta {
          align-self: center;
          min-height: 36px;
          padding: 6px 8px;
          border: none;
          background: transparent;
          color: rgba(244, 246, 247, 0.55);
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .chv2-knowledge-sub {
          margin: 0;
          font-size: 12px;
          line-height: 1.45;
          color: var(--ch-muted);
        }

        .chv2-insight-text {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(244, 246, 247, 0.78);
        }

        .chv2-text-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          min-height: 32px;
          padding: 2px 0;
          border: none;
          background: transparent;
          color: var(--ch-coach);
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }

        .chv2-context-rows {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .chv2-context-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 30px;
          padding: 3px 0;
          color: var(--ch-muted);
          font-size: 12px;
        }

        .chv2-context-label {
          flex: 1;
          min-width: 0;
        }

        .chv2-context-value {
          font-weight: 600;
          color: rgba(244, 246, 247, 0.86);
          text-align: right;
        }

        .chv2-tools-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chv2-tools {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chv2-tool {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 36px;
          padding: 7px 12px;
          border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: transparent;
          color: var(--ch-muted);
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }

        .chv2-tool:hover {
          border-color: rgba(48, 176, 96, 0.28);
          color: var(--ch-text);
        }

        .chv2-more {
          border: 1px solid var(--ch-border);
          border-radius: 12px;
          background: var(--ch-surface-2);
          padding: 0 12px 8px;
        }

        .chv2-more-summary {
          list-style: none;
          cursor: pointer;
          min-height: 40px;
          display: flex;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ch-muted);
        }

        .chv2-more-summary::-webkit-details-marker {
          display: none;
        }

        .chv2-more[open] .chv2-more-summary {
          color: var(--ch-text);
        }

        .chv2-more .chv2-side {
          padding-bottom: 8px;
        }

        .chv2-pill:focus-visible,
        .chv2-hero-bubble:focus-visible,
        .chv2-composer:focus-visible,
        .chv2-primary-cta:focus-visible,
        .chv2-secondary-cta:focus-visible,
        .chv2-lowhp-cta:focus-visible,
        .chv2-text-link:focus-visible,
        .chv2-tool:focus-visible,
        .chv2-more-summary:focus-visible {
          outline: 2px solid var(--ch-coach);
          outline-offset: 2px;
        }

        @media (max-width: 767px) {
          .coach-home-v2 {
            gap: 14px;
          }

          :global(.coach-home-page) {
            padding: 12px 14px 10px;
          }

          .chv2-greeting {
            font-size: 22px;
          }

          .chv2-header {
            gap: 2px;
            padding: 0 2px;
          }

          .chv2-grid {
            gap: 12px;
          }

          .chv2-hero-surface {
            min-height: min(58vh, 520px);
            padding: 16px 14px 12px;
            border-radius: 16px;
            gap: 12px;
          }

          .chv2-hero-bubble {
            max-width: 92%;
          }

          .chv2-pills {
            gap: 6px;
          }

          .chv2-pill {
            min-height: 30px;
            padding: 5px 10px 5px 8px;
            font-size: 11px;
          }

          .chv2-side {
            gap: 10px;
          }

          .chv2-card-action {
            padding: 12px 14px;
            gap: 6px;
          }

          .chv2-next-title {
            font-size: 15px;
          }

          .chv2-primary-cta {
            min-height: 40px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}
