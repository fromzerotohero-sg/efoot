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

  const lastMatch = Array.isArray(recentMatches) && recentMatches.length > 0 ? recentMatches[0] : null
  const lastMatchRaw = lastMatch?.created_at || lastMatch?.match_date || null
  const lastMatchDate = lastMatchRaw ? new Date(lastMatchRaw) : null
  const lastMatchMinutesAgo =
    lastMatchDate && !isNaN(lastMatchDate.getTime())
      ? (Date.now() - lastMatchDate.getTime()) / (1000 * 60)
      : null

  const homeState = resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo })
  const stateCopy = s.states[homeState]

  // LOW HP: solo se il saldo reale e noto (balance_remaining dal contratto /api/credits/usage).
  // Mai presumere LOW HP se il dato manca; mai bloccare la CTA.
  const lowHp = typeof hpBalance === 'number' && Number.isFinite(hpBalance) && hpBalance < 2

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

  return (
    <div className="coach-home-v2">
      {/* Saluto iniziale (reference: "Ciao Hero! 👋") */}
      <header className="chv2-header">
        <h1 className="chv2-greeting">{s.greeting}</h1>
        <p className="chv2-greeting-sub">{s.greetingSub}</p>
      </header>

      <div className="chv2-grid">
        {/* Colonna centrale: area Hero Coach (pill + conversazione entry + composer) */}
        <div className="chv2-main">
          {/* CTA/pill contestuali: aprono il motore assistant reale con messaggio precompilato */}
          <div className="chv2-pills" role="group" aria-label={s.composerAria}>
            {s.pills.map((pill) => (
              <button
                key={pill.label}
                type="button"
                className="chv2-pill"
                onClick={() => onAskHeroMessage?.(pill.message)}
              >
                <Play size={11} aria-hidden="true" style={{ fill: 'currentColor', flexShrink: 0 }} />
                {pill.label}
              </button>
            ))}
          </div>

          {/* Area conversazione: bolla Hero reale (testo guidato dallo stato), click = azione primaria */}
          <button type="button" className="chv2-hero-bubble" onClick={primaryAction}>
            <span className="chv2-hero-identity">
              <img src="/coach.jpg" alt="" className="chv2-hero-avatar" />
              <span className="chv2-hero-name">Hero Coach</span>
              <span className="chv2-hero-badge">{s.heroBadge}</span>
            </span>
            <span className="chv2-hero-text">{stateCopy.bubble}</span>
          </button>

          {/* Composer: entry composer-like verso la chat reale (la chat unificata e S3) */}
          <button
            type="button"
            className="chv2-composer"
            onClick={onAskHero}
            aria-label={s.composerAria}
          >
            <span className="chv2-composer-placeholder">{s.composerPlaceholder}</span>
            <span className="chv2-composer-send" aria-hidden="true">
              <SendHorizonal size={16} />
            </span>
          </button>
        </div>

        {/* Colonna destra: card secondarie (reference: Prossima azione / Quanto Hero ti conosce / insight) */}
        <div className="chv2-side" data-tour-id="tour-dashboard-mission-center">
          <section className="chv2-card chv2-next-action" data-tour-id="tour-dashboard-task" aria-label={s.nextAction}>
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

          {/* Quanto Hero ti conosce: componente esistente, calcolo invariato, nessun claim sulla memoria */}
          <section className="chv2-card" data-tour-id="tour-dashboard-ai" aria-label={s.knowledge}>
            <p className="chv2-overline">{s.knowledge}</p>
            <AIKnowledgeBar variant="gauge" />
            <p className="chv2-knowledge-sub">{s.knowledgeSub}</p>
          </section>

          {/* Ultimo insight: solo se recurring_issues reali; altrimenti card assente */}
          {latestInsight && (
            <section className="chv2-card" aria-label={s.insight}>
              <p className="chv2-overline">{s.insight}</p>
              <p className="chv2-insight-text">{latestInsight}</p>
              <button type="button" className="chv2-text-link" onClick={onOpenProgress}>
                {s.insightDetails}
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </section>
          )}

          {/* Contesto compatto: dati reali, niente KPI inventati */}
          <section className="chv2-card" data-tour-id="tour-dashboard-squad" aria-label={s.context}>
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
                    <Icon size={16} aria-hidden="true" />
                    <span className="chv2-context-label">{row.label}</span>
                    <span className="chv2-context-value">{row.value}</span>
                  </div>
                )
              })}
              {lastMatchLabel && (
                <div className="chv2-context-row">
                  <Calendar size={16} aria-hidden="true" />
                  <span className="chv2-context-label">{s.contextLastMatch}</span>
                  <span className="chv2-context-value">{lastMatchLabel}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Progressi / strumenti secondari: accesso discreto */}
      <section className="chv2-tools-section" data-tour-id="tour-dashboard-nav" aria-label={s.tools}>
        <p className="chv2-overline">{s.tools}</p>
        <div className="chv2-tools">
          <button type="button" className="chv2-tool" onClick={onOpenProgress}>
            <TrendingUp size={16} aria-hidden="true" />
            {s.toolsProgress}
          </button>
          <button type="button" className="chv2-tool" onClick={onOpenMatches}>
            <Calendar size={16} aria-hidden="true" />
            {s.toolsMatches}
          </button>
          <button type="button" className="chv2-tool" onClick={onOpenCountermeasures}>
            <Trophy size={16} aria-hidden="true" />
            {s.toolsPrepare}
          </button>
          <button
            type="button"
            className="chv2-tool"
            onClick={onOpenLiveCoach}
            data-tour-id="tour-dashboard-live-coach"
          >
            <Radio size={16} aria-hidden="true" />
            {s.toolsLive}
          </button>
          {toolsExtra}
        </div>
      </section>

      <style jsx>{`
        .coach-home-v2 {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1080px;
          margin: 0 auto;
          width: 100%;
        }

        .chv2-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chv2-greeting {
          margin: 0;
          font-size: clamp(26px, 5vw, 34px);
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #ffffff;
          line-height: 1.15;
        }

        .chv2-greeting-sub {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.6);
        }

        .chv2-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (min-width: 1024px) {
          .chv2-grid {
            grid-template-columns: minmax(0, 1fr) 320px;
          }
        }

        .chv2-main {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }

        .chv2-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chv2-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 40px;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid rgba(0, 212, 255, 0.22);
          background: rgba(0, 212, 255, 0.05);
          color: rgba(0, 212, 255, 0.9);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .chv2-pill:hover {
          border-color: rgba(0, 212, 255, 0.5);
          background: rgba(0, 212, 255, 0.1);
        }

        .chv2-hero-bubble {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          padding: 18px 20px;
          border-radius: 18px;
          border: 1px solid rgba(0, 212, 255, 0.16);
          background: linear-gradient(160deg, rgba(10, 18, 38, 0.72), rgba(5, 10, 24, 0.78));
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .chv2-hero-bubble:hover {
          border-color: rgba(0, 212, 255, 0.4);
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
          border: 1px solid rgba(0, 212, 255, 0.3);
          flex-shrink: 0;
        }

        .chv2-hero-name {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }

        .chv2-hero-badge {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #ffffff;
          background: linear-gradient(135deg, #9d4edd, #c77dff);
        }

        .chv2-hero-text {
          font-size: 15px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.85);
        }

        .chv2-composer {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 56px;
          padding: 12px 14px 12px 18px;
          border-radius: 999px;
          border: 1px solid rgba(0, 212, 255, 0.25);
          background: rgba(5, 10, 24, 0.85);
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .chv2-composer:hover {
          border-color: rgba(0, 212, 255, 0.55);
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.08);
        }

        .chv2-composer-placeholder {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.45);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chv2-composer-send {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #34d399, #22c55e);
          color: #03101d;
          flex-shrink: 0;
        }

        .chv2-side {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .chv2-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: linear-gradient(160deg, rgba(10, 18, 38, 0.72), rgba(5, 10, 24, 0.78));
          border: 1px solid rgba(0, 212, 255, 0.12);
          border-radius: 18px;
          padding: clamp(18px, 3vw, 22px);
        }

        .chv2-overline {
          margin: 0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(0, 212, 255, 0.55);
        }

        .chv2-plan-label {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
        }

        .chv2-next-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          line-height: 1.2;
          color: #ffffff;
        }

        .chv2-next-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.62);
        }

        .chv2-progress {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .chv2-progress-bar {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #00d4ff, #34d399);
          transition: width 0.3s ease;
        }

        .chv2-progress-label {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: rgba(0, 212, 255, 0.8);
        }

        .chv2-lowhp {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 191, 0, 0.35);
          background: rgba(255, 191, 0, 0.08);
          color: #ffd76a;
          font-size: 13px;
          line-height: 1.4;
        }

        .chv2-lowhp-cta {
          margin-left: auto;
          min-height: 36px;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255, 203, 5, 0.55);
          background: rgba(255, 203, 5, 0.14);
          color: #ffcb05;
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .chv2-primary-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 50px;
          margin-top: 4px;
          padding: 13px 20px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #34d399, #22c55e);
          color: #03101d;
          font-size: 15px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .chv2-primary-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(52, 211, 153, 0.25);
        }

        .chv2-secondary-cta {
          align-self: center;
          min-height: 44px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          color: rgba(0, 212, 255, 0.85);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .chv2-knowledge-sub {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.5);
        }

        .chv2-insight-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.82);
        }

        .chv2-text-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          min-height: 36px;
          padding: 4px 0;
          border: none;
          background: transparent;
          color: rgba(0, 212, 255, 0.85);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }

        .chv2-context-rows {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .chv2-context-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 34px;
          padding: 4px 0;
          color: rgba(255, 255, 255, 0.55);
          font-size: 13px;
        }

        .chv2-context-label {
          flex: 1;
          min-width: 0;
        }

        .chv2-context-value {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.88);
          text-align: right;
        }

        .chv2-tools-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .chv2-tools {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chv2-tool {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: rgba(255, 255, 255, 0.65);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .chv2-tool:hover {
          border-color: rgba(0, 212, 255, 0.4);
          color: rgba(0, 212, 255, 0.9);
        }

        .chv2-pill:focus-visible,
        .chv2-hero-bubble:focus-visible,
        .chv2-composer:focus-visible,
        .chv2-primary-cta:focus-visible,
        .chv2-secondary-cta:focus-visible,
        .chv2-lowhp-cta:focus-visible,
        .chv2-text-link:focus-visible,
        .chv2-tool:focus-visible {
          outline: 2px solid rgba(0, 212, 255, 0.85);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}
