'use client'

import React from 'react'
import {
  MessageCircle,
  Users,
  UserCheck,
  BarChart3,
  Sparkles,
  Radio,
  Trophy,
  Zap,
  TrendingUp,
  Calendar,
  ArrowRight,
  AlertCircle
} from 'lucide-react'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'

/**
 * UX V2 — Coach Home (facade presentazionale).
 * Nessun dato proprio: tutto arriva via props da app/page.jsx, che possiede
 * fetch dashboard, stats, match, modali, deep link ed eventi.
 * Un solo concetto visibile: PROSSIMA AZIONE. Niente Journey/Mission/Task/Suggestions concorrenti.
 */

const STR = {
  it: {
    overline: 'HERO COACH',
    tagline: 'Conosce la tua rosa e usa lo strumento giusto quando serve.',
    nextAction: 'Prossima azione',
    askHero: 'Chiedi a Hero',
    askHeroSub: 'Apri la chat con il tuo coach',
    quickActions: 'Azioni rapide',
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
    knowledge: 'Quanto Hero ti conosce',
    knowledgeSub: 'Dati disponibili per personalizzare i consigli',
    tools: 'Progressi e strumenti',
    toolsProgress: 'Progressi',
    toolsMatches: 'Partite',
    lowHp: 'Saldo HP insufficiente per le azioni AI (costo standard: 2 HP).',
    lowHpCta: 'Ottieni HP',
    states: {
      NEW: {
        title: 'Crea la tua rosa',
        desc: 'Hero ha bisogno dei tuoi giocatori reali per darti consigli utili.',
        cta: 'Crea la tua rosa'
      },
      ROSTER_INCOMPLETE: {
        title: 'Completa la rosa',
        desc: 'Ti mancano titolari per una formazione completa.',
        cta: 'Completa rosa'
      },
      NO_COACH: {
        title: 'Scegli il tuo allenatore',
        desc: 'L’allenatore attivo cambia modulo, tattica e consigli di Hero.',
        cta: 'Configura allenatore'
      },
      POST_MATCH: {
        title: 'Raccontami com’è andata',
        desc: 'Partita appena finita: due minuti di feedback rendono i prossimi consigli più tuoi.',
        cta: 'Raccontami com’è andata'
      },
      READY_NO_STATS: {
        title: 'Chiedi a Hero',
        desc: 'Hero è pronto. Le statistiche rendono i consigli più precisi, ma non servono per iniziare.',
        cta: 'Chiedi a Hero'
      },
      OPERATIONAL: {
        title: 'Chiedi a Hero',
        desc: 'Hero usa rosa, allenatore e statistiche reali della tua squadra.',
        cta: 'Chiedi a Hero'
      }
    },
    secondary: {
      addStats: 'Aggiungi statistiche',
      seeMatches: 'Vedi partite'
    },
    suggestions: {
      prepare: 'Prepara la prossima partita',
      checkCard: 'Controlla una carta',
      live: 'Live Coach'
    }
  },
  en: {
    overline: 'HERO COACH',
    tagline: 'Knows your squad and picks the right tool when needed.',
    nextAction: 'Next action',
    askHero: 'Ask Hero',
    askHeroSub: 'Open the chat with your coach',
    quickActions: 'Quick actions',
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
    knowledge: 'How well Hero knows you',
    knowledgeSub: 'Data available to personalize advice',
    tools: 'Progress & tools',
    toolsProgress: 'Progress',
    toolsMatches: 'Matches',
    lowHp: 'Not enough HP for AI actions (standard cost: 2 HP).',
    lowHpCta: 'Get HP',
    states: {
      NEW: {
        title: 'Create your squad',
        desc: 'Hero needs your real players to give you useful advice.',
        cta: 'Create your squad'
      },
      ROSTER_INCOMPLETE: {
        title: 'Complete your squad',
        desc: 'You are missing starters for a complete formation.',
        cta: 'Complete squad'
      },
      NO_COACH: {
        title: 'Choose your coach',
        desc: 'The active coach changes formation, tactics and Hero’s advice.',
        cta: 'Set up coach'
      },
      POST_MATCH: {
        title: 'Tell me how it went',
        desc: 'Match just finished: two minutes of feedback make the next advice more yours.',
        cta: 'Tell me how it went'
      },
      READY_NO_STATS: {
        title: 'Ask Hero',
        desc: 'Hero is ready. Game stats make advice sharper, but you don’t need them to start.',
        cta: 'Ask Hero'
      },
      OPERATIONAL: {
        title: 'Ask Hero',
        desc: 'Hero uses your squad’s real roster, coach and stats.',
        cta: 'Ask Hero'
      }
    },
    secondary: {
      addStats: 'Add game stats',
      seeMatches: 'See matches'
    },
    suggestions: {
      prepare: 'Prepare the next match',
      checkCard: 'Check a card',
      live: 'Live Coach'
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
  hpBalance,
  onAskHero,
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

  const isHeroPrimary = homeState === 'READY_NO_STATS' || homeState === 'OPERATIONAL'

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

  // Suggerimenti contestuali: solo nello stato OPERATIONAL, massimo 3, solo funzioni reali.
  const suggestions =
    homeState === 'OPERATIONAL'
      ? [
          { key: 'prepare', icon: Trophy, label: s.suggestions.prepare, onClick: onOpenCountermeasures, accent: 'cyan' },
          { key: 'card', icon: Sparkles, label: s.suggestions.checkCard, onClick: onOpenCardAdvisor, accent: 'gold' },
          { key: 'live', icon: Radio, label: s.suggestions.live, onClick: onOpenLiveCoach, accent: 'amber', tourId: 'tour-dashboard-live-coach' }
        ]
      : []

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
      {/* Header: stato / breve contesto */}
      <header className="chv2-header">
        <p className="chv2-overline">{s.overline}</p>
        <p className="chv2-tagline">{s.tagline}</p>
      </header>

      {/* PROSSIMA AZIONE: una sola CTA dominante */}
      <div data-tour-id="tour-dashboard-mission-center">
        <section className="chv2-card chv2-next-action" data-tour-id="tour-dashboard-task" aria-label={s.nextAction}>
          <p className="chv2-overline">{s.nextAction}</p>
          <h1 className="chv2-title">{stateCopy.title}</h1>
          {homeState === 'ROSTER_INCOMPLETE' && stats && (
            <p className="chv2-progress-real">
              {s.contextRoster}: {stats.titolari}/11
            </p>
          )}
          <p className="chv2-desc">{stateCopy.desc}</p>

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
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          {secondaryAction && (
            <button type="button" className="chv2-secondary-cta" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
        </section>

        {/* Ingresso Hero evidente (secondario quando la Prossima azione non e Hero) */}
        {!isHeroPrimary && (
          <button type="button" className="chv2-hero-entry" onClick={onAskHero}>
            <MessageCircle size={20} aria-hidden="true" />
            <span className="chv2-hero-entry-copy">
              <strong>{s.askHero}</strong>
              <small>{s.askHeroSub}</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Suggerimenti contestuali: max 3, solo stato OPERATIONAL */}
      {suggestions.length > 0 && (
        <section className="chv2-section" aria-label={s.quickActions}>
          <p className="chv2-overline">{s.quickActions}</p>
          <div className="chv2-suggestions">
            {suggestions.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`chv2-suggestion chv2-suggestion--${item.accent}`}
                  onClick={item.onClick}
                  {...(item.tourId ? { 'data-tour-id': item.tourId } : {})}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Contesto compatto: dati reali, niente KPI inventati */}
      <section className="chv2-card chv2-context" data-tour-id="tour-dashboard-squad" aria-label={s.context}>
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

      {/* Quanto Hero ti conosce: componente esistente, nessun claim sulla memoria */}
      <section className="chv2-section" data-tour-id="tour-dashboard-ai" aria-label={s.knowledge}>
        <p className="chv2-overline">{s.knowledge}</p>
        <p className="chv2-knowledge-sub">{s.knowledgeSub}</p>
        <AIKnowledgeBar />
      </section>

      {/* Progressi / strumenti secondari */}
      <section className="chv2-section" data-tour-id="tour-dashboard-nav" aria-label={s.tools}>
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
          {toolsExtra}
        </div>
      </section>

      <style jsx>{`
        .coach-home-v2 {
          display: flex;
          flex-direction: column;
          gap: 28px;
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
        }

        .chv2-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chv2-overline {
          margin: 0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(0, 212, 255, 0.55);
        }

        .chv2-tagline {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.62);
        }

        .chv2-card {
          background: linear-gradient(160deg, rgba(10, 18, 38, 0.72), rgba(5, 10, 24, 0.78));
          border: 1px solid rgba(0, 212, 255, 0.14);
          border-radius: 18px;
          padding: clamp(20px, 4vw, 28px);
        }

        .chv2-next-action {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .chv2-title {
          margin: 0;
          font-size: clamp(24px, 5.5vw, 32px);
          font-weight: 800;
          line-height: 1.15;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .chv2-progress-real {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--neon-cyan);
        }

        .chv2-desc {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.66);
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
          gap: 10px;
          width: 100%;
          min-height: 54px;
          margin-top: 6px;
          padding: 14px 22px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #00d4ff, #0080ff);
          color: #03101d;
          font-size: 16px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .chv2-primary-cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(0, 212, 255, 0.25);
        }

        .chv2-primary-cta:focus-visible,
        .chv2-secondary-cta:focus-visible,
        .chv2-hero-entry:focus-visible,
        .chv2-suggestion:focus-visible,
        .chv2-tool:focus-visible,
        .chv2-lowhp-cta:focus-visible {
          outline: 2px solid rgba(0, 212, 255, 0.85);
          outline-offset: 2px;
        }

        .chv2-secondary-cta {
          align-self: center;
          min-height: 44px;
          padding: 10px 18px;
          border: none;
          background: transparent;
          color: rgba(0, 212, 255, 0.85);
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .chv2-hero-entry {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          min-height: 60px;
          margin-top: 12px;
          padding: 14px 18px;
          border-radius: 14px;
          border: 1px solid rgba(0, 212, 255, 0.3);
          background: rgba(0, 212, 255, 0.07);
          color: #ffffff;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .chv2-hero-entry:hover {
          border-color: rgba(0, 212, 255, 0.55);
          background: rgba(0, 212, 255, 0.12);
        }

        .chv2-hero-entry-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .chv2-hero-entry-copy strong {
          font-size: 15px;
          font-weight: 700;
        }

        .chv2-hero-entry-copy small {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
        }

        .chv2-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chv2-suggestions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .chv2-suggestion {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 48px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .chv2-suggestion--cyan {
          border: 1px solid rgba(0, 212, 255, 0.22);
          background: rgba(0, 212, 255, 0.05);
          color: rgba(0, 212, 255, 0.9);
        }

        .chv2-suggestion--gold {
          border: 1px solid rgba(255, 203, 5, 0.3);
          background: rgba(255, 203, 5, 0.06);
          color: #ffcb05;
        }

        .chv2-suggestion--amber {
          border: 1px solid rgba(255, 215, 100, 0.28);
          background: rgba(255, 215, 100, 0.06);
          color: #ffd76a;
        }

        .chv2-suggestion:hover {
          filter: brightness(1.15);
        }

        .chv2-context {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .chv2-context-rows {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chv2-context-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 36px;
          padding: 6px 2px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
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

        .chv2-knowledge-sub {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.55);
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
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.7);
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
      `}</style>
    </div>
  )
}
