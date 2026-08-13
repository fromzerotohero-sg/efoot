'use client'

import React from 'react'
import {
  Users,
  UserCheck,
  BarChart3,
  Radio,
  TrendingUp,
  Calendar,
  AlertCircle,
  Wrench,
  ChevronDown
} from 'lucide-react'
import CoachComposer from './CoachComposer'
import CoachSuggestionCard from './CoachSuggestionCard'
import CoachContextRail, { CoachMobileContext } from './CoachContextRail'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import { resolveHomeState, formatMatchDate, resolveGreetingName } from './homeState'
import styles from './CoachWorkspace.module.css'

const COPY = {
  it: {
    overline: 'Hero Coach',
    greeting: (name) => `Ciao ${name}`,
    subtitle: 'Sono qui per aiutarti a far diventare la tua squadra una leggenda.',
    composerPlaceholder: 'Chiedi qualsiasi cosa sulla tua squadra...',
    composerAria: 'Apri la conversazione con Hero',
    composerHint: 'Esempi: tattiche, formazione, giocatori, carte, prossima partita...',
    suggestionsTitle: 'Suggerimenti per te',
    analyzeTitle: 'Analizza la mia rosa',
    analyzeCopy: 'Valuta giocatori, ruoli, chimica e priorità della tua formazione.',
    analyzeMicro: 'Analisi',
    playedTitle: 'Ho appena giocato',
    playedCopy: 'Racconta a Hero com’è andata e trasformala in esperienza utile.',
    playedMicro: 'Feedback',
    prepareTitle: 'Prepara la prossima partita',
    prepareCopy: 'Studia avversario, tattiche e piano gara.',
    prepareMicro: 'Tattiche',
    nextAction: 'Prossima azione',
    context: 'Il tuo contesto',
    lastMatch: 'Ultimo match',
    insight: 'Ultimo insight',
    insightDetails: 'Vedi dettagli',
    knowledge: 'Quanto Hero ti conosce',
    knowledgeSub: 'Hero conosce meglio la tua squadra quando aggiorni rosa, partite e feedback.',
    contextRoster: 'Rosa',
    contextCoach: 'Allenatore',
    contextStats: 'Statistiche',
    rosterEmpty: 'Da creare',
    coachActive: 'Attivo',
    coachMissing: 'Da configurare',
    statsReady: 'Disponibili',
    statsMissing: 'Da aggiungere',
    seeMatches: 'Vedi partite',
    addStats: 'Aggiungi statistiche',
    tools: 'Strumenti Coach',
    toolsMicro: 'Progressi, partite e Live Coach',
    toolsProgress: 'Progressi',
    toolsMatches: 'Partite',
    toolsLive: 'Live Coach',
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
      }
    }
  },
  en: {
    overline: 'Hero Coach',
    greeting: (name) => `Hello ${name}`,
    subtitle: 'I’m here to help you turn your squad into a legend.',
    composerPlaceholder: 'Ask anything about your squad...',
    composerAria: 'Open the conversation with Hero',
    composerHint: 'Examples: tactics, formation, players, cards, next match...',
    suggestionsTitle: 'Suggestions for you',
    analyzeTitle: 'Analyze my squad',
    analyzeCopy: 'Evaluate players, roles, chemistry and your formation priorities.',
    analyzeMicro: 'Analysis',
    playedTitle: 'I just played',
    playedCopy: 'Tell Hero how it went and turn it into useful experience.',
    playedMicro: 'Feedback',
    prepareTitle: 'Prepare for the next match',
    prepareCopy: 'Study the opponent, tactics and match plan.',
    prepareMicro: 'Tactics',
    nextAction: 'Next action',
    context: 'Your context',
    lastMatch: 'Last match',
    insight: 'Latest insight',
    insightDetails: 'See details',
    knowledge: 'How well Hero knows you',
    knowledgeSub: 'Hero knows your squad better when you update roster, matches and feedback.',
    contextRoster: 'Squad',
    contextCoach: 'Coach',
    contextStats: 'Game stats',
    rosterEmpty: 'To create',
    coachActive: 'Active',
    coachMissing: 'To set up',
    statsReady: 'Available',
    statsMissing: 'To add',
    seeMatches: 'See matches',
    addStats: 'Add game stats',
    tools: 'Coach tools',
    toolsMicro: 'Progress, matches and Live Coach',
    toolsProgress: 'Progress',
    toolsMatches: 'Matches',
    toolsLive: 'Live Coach',
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
      }
    }
  }
}

export default function CoachWorkspace({
  lang,
  stats,
  hasActiveCoach,
  recentMatches,
  gameAnalysisLastCapture,
  tacticalPatterns,
  hpBalance,
  userProfile,
  onAskHero,
  onAskHeroMessage,
  onOpenFeedback,
  onOpenGameAnalysis,
  onOpenLiveCoach,
  onOpenRoster,
  onOpenCoachSetup,
  onOpenCountermeasures,
  onOpenProgress,
  onOpenMatches,
  onGetHp,
  toolsExtra = null
}) {
  const copy = COPY[lang === 'en' ? 'en' : 'it']
  const greetingName = resolveGreetingName(userProfile)

  const lastMatch = Array.isArray(recentMatches) && recentMatches.length > 0 ? recentMatches[0] : null
  const lastMatchRaw = lastMatch?.created_at || lastMatch?.match_date || null
  const lastMatchDate = lastMatchRaw ? new Date(lastMatchRaw) : null
  const lastMatchMinutesAgo =
    lastMatchDate && !isNaN(lastMatchDate.getTime())
      ? (Date.now() - lastMatchDate.getTime()) / (1000 * 60)
      : null

  const homeState = resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo })
  const setupCopy = copy.states[homeState] || null

  const primaryCostsHp = homeState === 'POST_MATCH' || homeState === 'READY_NO_STATS' || homeState === 'OPERATIONAL'
  const lowHp =
    primaryCostsHp && typeof hpBalance === 'number' && Number.isFinite(hpBalance) && hpBalance < 2

  const rosterProgress =
    stats && stats.totalPlayers > 0 ? Math.min(100, Math.round((stats.titolari / 11) * 100)) : null

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
      label: copy.contextRoster,
      value: !stats || stats.totalPlayers === 0 ? copy.rosterEmpty : `${stats.titolari}/11`
    },
    {
      key: 'coach',
      icon: UserCheck,
      label: copy.contextCoach,
      value: hasActiveCoach ? copy.coachActive : copy.coachMissing
    },
    {
      key: 'stats',
      icon: BarChart3,
      label: copy.contextStats,
      value: gameAnalysisLastCapture ? `${copy.statsReady} · ${gameAnalysisLastCapture}` : copy.statsMissing,
      tourId: 'tour-dashboard-game-analysis'
    }
  ]

  const lastMatchLabel = lastMatch
    ? `${lastMatch.opponent_name || '—'}${formatMatchDate(lastMatchRaw, lang) ? ` · ${formatMatchDate(lastMatchRaw, lang)}` : ''}`
    : null

  const composerIsPrimary = homeState === 'OPERATIONAL' || homeState === 'READY_NO_STATS'
  const showSuggestions = homeState === 'OPERATIONAL'
  const showSetupCard = homeState === 'NEW' || homeState === 'ROSTER_INCOMPLETE' || homeState === 'NO_COACH' || homeState === 'POST_MATCH'

  const setupAction = (() => {
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

  const analyzeRoster = () => {
    if (typeof onAskHeroMessage === 'function') {
      onAskHeroMessage(
        lang === 'en'
          ? 'Analyze my current squad: roles, chemistry and the first concrete priority.'
          : 'Analizza la mia rosa attuale: ruoli, chimica e la prima priorità concreta.'
      )
      return
    }
    onAskHero?.()
  }

  return (
    <div className={styles.root} data-home-state={homeState}>
      <header className={styles.header}>
        <p className={styles.overline}>{copy.overline}</p>
        <h1 className={styles.greeting}>{copy.greeting(greetingName)}</h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          {showSetupCard && setupCopy ? (
            <section className={styles.setupCard} data-tour-id="tour-dashboard-task" aria-label={copy.nextAction}>
              <p className={styles.cardOverline}>{copy.nextAction}</p>
              <h2>{setupCopy.title}</h2>
              <p>{setupCopy.desc}</p>
              {homeState === 'ROSTER_INCOMPLETE' && rosterProgress !== null ? (
                <div className={styles.progress} role="progressbar" aria-valuenow={rosterProgress} aria-valuemin={0} aria-valuemax={100}>
                  <div className={styles.progressBar} style={{ width: `${rosterProgress}%` }} />
                </div>
              ) : null}
              {lowHp && homeState === 'POST_MATCH' ? (
                <div className={styles.lowHp} role="status">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{copy.lowHp}</span>
                  <button type="button" className={styles.lowHpCta} onClick={onGetHp}>{copy.lowHpCta}</button>
                </div>
              ) : null}
              <button type="button" className={styles.primaryCta} onClick={setupAction}>
                {setupCopy.cta}
              </button>
              {homeState === 'POST_MATCH' ? (
                <button type="button" className={styles.secondaryCta} onClick={onOpenMatches}>
                  {copy.seeMatches}
                </button>
              ) : null}
            </section>
          ) : null}

          <CoachComposer
            placeholder={copy.composerPlaceholder}
            ariaLabel={copy.composerAria}
            hint={composerIsPrimary ? copy.composerHint : null}
            onClick={onAskHero}
            secondary={!composerIsPrimary}
          />

          {lowHp && composerIsPrimary ? (
            <div className={styles.lowHp} role="status">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{copy.lowHp}</span>
              <button type="button" className={styles.lowHpCta} onClick={onGetHp}>{copy.lowHpCta}</button>
            </div>
          ) : null}

          {homeState === 'READY_NO_STATS' ? (
            <button type="button" className={styles.secondaryCta} onClick={onOpenGameAnalysis}>
              {copy.addStats}
            </button>
          ) : null}

          {showSuggestions ? (
            <section aria-label={copy.suggestionsTitle}>
              <p className={styles.suggestionsTitle}>{copy.suggestionsTitle}</p>
              <div className={styles.suggestions}>
                <CoachSuggestionCard
                  title={copy.analyzeTitle}
                  copy={copy.analyzeCopy}
                  micro={copy.analyzeMicro}
                  intent="rosa"
                  onClick={analyzeRoster}
                />
                <CoachSuggestionCard
                  title={copy.playedTitle}
                  copy={copy.playedCopy}
                  micro={copy.playedMicro}
                  intent="match"
                  onClick={onOpenFeedback}
                />
                <CoachSuggestionCard
                  title={copy.prepareTitle}
                  copy={copy.prepareCopy}
                  micro={copy.prepareMicro}
                  intent="tactics"
                  onClick={onOpenCountermeasures}
                />
              </div>
            </section>
          ) : null}

          <div className={`${styles.tools} ${styles.mobileKnowledge}`}>
            <AIKnowledgeBar variant="row" />
          </div>

          <CoachMobileContext
            copy={copy}
            lastMatchLabel={lastMatchLabel}
            latestInsight={latestInsight}
            contextRows={contextRows}
            contextMicro={`${copy.contextRoster} ${contextRows[0]?.value || ''} · ${contextRows[1]?.value || ''}`}
            onOpenProgress={onOpenProgress}
            onOpenMatches={onOpenMatches}
          />

          <details className={styles.tools} data-tour-id="tour-dashboard-nav">
            <summary className={styles.toolsSummary}>
              <span className={styles.toolsLead}>
                <span className={styles.toolsIcon} aria-hidden="true">
                  <Wrench size={16} />
                </span>
                <span className={styles.toolsCopy}>
                  <span className={styles.toolsTitle}>{copy.tools}</span>
                  <span className={styles.toolsMicro}>{copy.toolsMicro}</span>
                </span>
              </span>
              <ChevronDown className={styles.toolsChevron} size={16} aria-hidden="true" />
            </summary>
            <div className={styles.toolsPanel}>
              <button type="button" className={styles.tool} onClick={onOpenProgress}>
                <TrendingUp size={16} aria-hidden="true" />
                {copy.toolsProgress}
              </button>
              <button type="button" className={styles.tool} onClick={onOpenMatches}>
                <Calendar size={16} aria-hidden="true" />
                {copy.toolsMatches}
              </button>
              <button
                type="button"
                className={styles.tool}
                onClick={onOpenLiveCoach}
                data-tour-id="tour-dashboard-live-coach"
              >
                <Radio size={16} aria-hidden="true" />
                {copy.toolsLive}
              </button>
              {toolsExtra}
            </div>
          </details>
        </div>

        <CoachContextRail
          copy={copy}
          lastMatchLabel={lastMatchLabel}
          latestInsight={latestInsight}
          contextRows={contextRows}
          onOpenProgress={onOpenProgress}
          onOpenMatches={onOpenMatches}
        />
      </div>
    </div>
  )
}
