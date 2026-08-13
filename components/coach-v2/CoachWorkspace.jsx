'use client'

import React from 'react'
import { Users, UserCheck, BarChart3, Radio, TrendingUp, Calendar, AlertCircle, Wrench, ChevronDown } from 'lucide-react'
import CoachComposer from './CoachComposer'
import CoachSuggestionCard from './CoachSuggestionCard'
import CoachPerformanceStrip from './CoachPerformanceStrip'
import CoachContextRail, { CoachMobileContext } from './CoachContextRail'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import { resolveHomeState, formatMatchDate, resolveGreetingName } from './homeState'
import styles from './CoachWorkspace.module.css'

const COPY = {
  it: {
    overline: 'Hero Coach',
    greeting: (name) => `Ciao ${name}`,
    subtitle: 'Parla, analizza e prepara la prossima partita.',
    composerPlaceholder: 'Chiedi qualsiasi cosa sulla tua squadra…',
    composerAria: 'Apri la conversazione con Hero',
    composerHint: 'Hero usa rosa, partite e feedback reali.',
    suggestionsTitle: 'Suggerimenti per te',
    statsUploadTitle: 'Carica le nuove statistiche',
    statsUploadCopy: 'Importa le schermate Analisi di eFootball e Hero le collega alla tua rosa.',
    statsMicro: 'Data Lab',
    playedTitle: 'Ho appena giocato',
    playedCopy: 'Racconta com’è andata. Il match diventa apprendimento per la prossima volta.',
    playedMicro: 'Match Review',
    prepareTitle: 'Prepara la prossima partita',
    prepareCopy: 'Studia avversario e piano gara sul tuo modo reale di giocare.',
    prepareMicro: 'Game Plan',
    nextAction: 'Prossima azione',
    postMatchTitle: 'Raccontami com’è andata',
    postMatchBody: 'La partita è fresca: due minuti di feedback rendono subito più utile il prossimo consiglio.',
    context: 'Il tuo contesto',
    lastMatch: 'Ultimo match',
    insight: 'Ultimo insight',
    insightDetails: 'Vedi dettagli',
    knowledge: 'Quanto Hero ti conosce',
    knowledgeSub: 'Hero diventa più preciso quando aggiorni rosa, partite e feedback.',
    contextRoster: 'Rosa',
    contextCoach: 'Allenatore',
    contextStats: 'Statistiche',
    rosterEmpty: 'Da creare',
    coachActive: 'Attivo',
    coachMissing: 'Da configurare',
    statsReady: 'Disponibili',
    statsMissing: 'Da aggiungere',
    seeMatches: 'Vedi partite',
    tools: 'Strumenti Coach',
    toolsMicro: 'Progressi, partite e Live Coach',
    toolsProgress: 'Progressi',
    toolsMatches: 'Partite',
    toolsLive: 'Live Coach',
    lowHp: 'Saldo HP insufficiente per questa azione AI (costo standard: 2 HP).',
    lowHpCta: 'Ottieni HP',
    setupAria: 'Configurazione iniziale',
    setupEyebrow: 'Il tuo percorso',
    setupTitleRoster: 'Costruiamo la tua squadra reale',
    setupTitleCoach: 'Ora scegli chi guida la squadra',
    setupBodyRoster: 'Aggiungi i tuoi titolari reali. Hero userà giocatori, ruoli e modulo come base di ogni consiglio.',
    setupBodyCoach: 'L’allenatore completa il contesto tattico e rende i consigli più precisi.',
    setupStepRoster: 'Rosa reale',
    setupStepCoach: 'Allenatore',
    setupReady: 'Pronto',
    setupChoose: 'Da scegliere',
    setupAfter: 'Pronto dopo il setup',
    setupCtaRoster: 'Crea la tua rosa',
    setupCtaCoach: 'Scegli allenatore',
    setupStatusTactical: 'CONTESTO TATTICO',
    setupStarters: 'TITOLARI'
  },
  en: {
    overline: 'Hero Coach',
    greeting: (name) => `Hello ${name}`,
    subtitle: 'Talk, analyse and prepare the next match.',
    composerPlaceholder: 'Ask anything about your squad…',
    composerAria: 'Open the conversation with Hero',
    composerHint: 'Hero uses your real squad, matches and feedback.',
    suggestionsTitle: 'Suggested for you',
    statsUploadTitle: 'Upload the new stats',
    statsUploadCopy: 'Import eFootball Analysis screens and Hero will connect them to your squad.',
    statsMicro: 'Data Lab',
    playedTitle: 'I just played',
    playedCopy: 'Tell Hero what happened. The match becomes learning for the next one.',
    playedMicro: 'Match Review',
    prepareTitle: 'Prepare the next match',
    prepareCopy: 'Study the opponent and build a game plan around how you actually play.',
    prepareMicro: 'Game Plan',
    nextAction: 'Next action',
    postMatchTitle: 'Tell me how it went',
    postMatchBody: 'The match is fresh: two minutes of feedback make the next recommendation more useful.',
    context: 'Your context',
    lastMatch: 'Last match',
    insight: 'Latest insight',
    insightDetails: 'See details',
    knowledge: 'How well Hero knows you',
    knowledgeSub: 'Hero gets sharper when you update squad, matches and feedback.',
    contextRoster: 'Squad',
    contextCoach: 'Coach',
    contextStats: 'Stats',
    rosterEmpty: 'To create',
    coachActive: 'Active',
    coachMissing: 'To set up',
    statsReady: 'Available',
    statsMissing: 'To add',
    seeMatches: 'See matches',
    tools: 'Coach tools',
    toolsMicro: 'Progress, matches and Live Coach',
    toolsProgress: 'Progress',
    toolsMatches: 'Matches',
    toolsLive: 'Live Coach',
    lowHp: 'Not enough HP for this AI action (standard cost: 2 HP).',
    lowHpCta: 'Get HP',
    setupAria: 'Initial setup',
    setupEyebrow: 'Your journey',
    setupTitleRoster: 'Build your real squad',
    setupTitleCoach: 'Choose who leads the squad',
    setupBodyRoster: 'Add your real starters. Hero will use players, roles and formation as the basis of every recommendation.',
    setupBodyCoach: 'Your coach completes the tactical context and makes recommendations sharper.',
    setupStepRoster: 'Real squad',
    setupStepCoach: 'Coach',
    setupReady: 'Ready',
    setupChoose: 'Choose',
    setupAfter: 'Ready after setup',
    setupCtaRoster: 'Build your squad',
    setupCtaCoach: 'Choose coach',
    setupStatusTactical: 'TACTICAL CONTEXT',
    setupStarters: 'STARTERS'
  },
  es: {
    overline: 'Hero Coach',
    greeting: (name) => `Hola ${name}`,
    subtitle: 'Habla, analiza y prepara el próximo partido.',
    composerPlaceholder: 'Pregunta lo que quieras sobre tu plantilla…',
    composerAria: 'Abrir la conversación con Hero',
    composerHint: 'Hero usa plantilla, partidos y feedback reales.',
    suggestionsTitle: 'Sugerencias para ti',
    statsUploadTitle: 'Carga las nuevas estadísticas',
    statsUploadCopy: 'Importa las pantallas Análisis de eFootball y Hero las conecta a tu plantilla.',
    statsMicro: 'Data Lab',
    playedTitle: 'Acabo de jugar',
    playedCopy: 'Cuéntale cómo fue. El partido se convierte en aprendizaje para la próxima vez.',
    playedMicro: 'Match Review',
    prepareTitle: 'Prepara el próximo partido',
    prepareCopy: 'Estudia al rival y el plan de partido según tu forma real de jugar.',
    prepareMicro: 'Game Plan',
    nextAction: 'Próxima acción',
    postMatchTitle: 'Cuéntame cómo fue',
    postMatchBody: 'El partido está fresco: dos minutos de feedback hacen más útil el próximo consejo.',
    context: 'Tu contexto',
    lastMatch: 'Último partido',
    insight: 'Último insight',
    insightDetails: 'Ver detalles',
    knowledge: 'Cuánto te conoce Hero',
    knowledgeSub: 'Hero se vuelve más preciso cuando actualizas plantilla, partidos y feedback.',
    contextRoster: 'Plantilla',
    contextCoach: 'Entrenador',
    contextStats: 'Estadísticas',
    rosterEmpty: 'Por crear',
    coachActive: 'Activo',
    coachMissing: 'Por configurar',
    statsReady: 'Disponibles',
    statsMissing: 'Por añadir',
    seeMatches: 'Ver partidos',
    tools: 'Herramientas Coach',
    toolsMicro: 'Progreso, partidos y Live Coach',
    toolsProgress: 'Progreso',
    toolsMatches: 'Partidos',
    toolsLive: 'Live Coach',
    lowHp: 'Saldo de HP insuficiente para esta acción de IA (coste estándar: 2 HP).',
    lowHpCta: 'Obtener HP',
    setupAria: 'Configuración inicial',
    setupEyebrow: 'Tu recorrido',
    setupTitleRoster: 'Construyamos tu plantilla real',
    setupTitleCoach: 'Ahora elige quién dirige el equipo',
    setupBodyRoster: 'Añade tus titulares reales. Hero usará jugadores, roles y módulo como base de cada consejo.',
    setupBodyCoach: 'El entrenador completa el contexto táctico y hace los consejos más precisos.',
    setupStepRoster: 'Plantilla real',
    setupStepCoach: 'Entrenador',
    setupReady: 'Listo',
    setupChoose: 'Elegir',
    setupAfter: 'Listo tras el setup',
    setupCtaRoster: 'Crea tu plantilla',
    setupCtaCoach: 'Elige entrenador',
    setupStatusTactical: 'CONTEXTO TÁCTICO',
    setupStarters: 'TITULARES'
  }
}

function SetupJourney({ copy, stats, hasActiveCoach, onOpenRoster, onOpenCoachSetup }) {
  const starters = Math.min(11, Number(stats?.titolari || 0))
  const rosterDone = starters >= 11
  const step = !rosterDone ? 1 : !hasActiveCoach ? 2 : 3
  const title = step === 1 ? copy.setupTitleRoster : copy.setupTitleCoach
  const body = step === 1 ? copy.setupBodyRoster : copy.setupBodyCoach

  return (
    <section className={styles.onboardingJourney} aria-label={copy.setupAria}>
      <div className={styles.onboardingCopy}>
        <span className={styles.onboardingEyebrow}>{copy.setupEyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className={styles.onboardingSteps}>
          <div className={`${styles.onboardingStep} ${step === 1 ? styles.onboardingStepCurrent : ''} ${rosterDone ? styles.onboardingStepDone : ''}`}>
            <span>01</span>
            <div>
              <strong>{copy.setupStepRoster}</strong>
              <small>{starters}/11</small>
            </div>
          </div>
          <div className={`${styles.onboardingStep} ${step === 2 ? styles.onboardingStepCurrent : ''} ${hasActiveCoach ? styles.onboardingStepDone : ''}`}>
            <span>02</span>
            <div>
              <strong>{copy.setupStepCoach}</strong>
              <small>{hasActiveCoach ? copy.setupReady : copy.setupChoose}</small>
            </div>
          </div>
          <div className={styles.onboardingStep}>
            <span>03</span>
            <div>
              <strong>Hero</strong>
              <small>{copy.setupAfter}</small>
            </div>
          </div>
        </div>
        <button type="button" className={styles.onboardingCta} onClick={step === 1 ? onOpenRoster : onOpenCoachSetup}>
          {step === 1 ? copy.setupCtaRoster : copy.setupCtaCoach}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className={styles.onboardingVisual} aria-hidden="true">
        <div className={styles.onboardingPitch}>
          <div className={styles.pitchHalfway} />
          <div className={styles.pitchCircle} />
          {Array.from({ length: 11 }).map((_, i) => (
            <span key={i} className={`${styles.pitchPlayer} ${i < starters ? styles.pitchPlayerActive : ''}`} />
          ))}
        </div>
        <div className={styles.onboardingStatus}>
          <span className={styles.onboardingStatusDot} />
          {step === 1 ? `${starters}/11 ${copy.setupStarters}` : copy.setupStatusTactical}
        </div>
      </div>
    </section>
  )
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
  const copy = COPY[lang] || COPY.it
  const greetingName = resolveGreetingName(userProfile)
  const lastMatch = Array.isArray(recentMatches) && recentMatches.length > 0 ? recentMatches[0] : null
  const lastMatchRaw = lastMatch?.created_at || lastMatch?.match_date || null
  const lastMatchDate = lastMatchRaw ? new Date(lastMatchRaw) : null
  const lastMatchMinutesAgo = lastMatchDate && !Number.isNaN(lastMatchDate.getTime())
    ? (Date.now() - lastMatchDate.getTime()) / 60000
    : null
  const homeState = resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo })
  const onboardingState = homeState === 'NEW' || homeState === 'ROSTER_INCOMPLETE' || homeState === 'NO_COACH'
  const postMatchState = homeState === 'POST_MATCH'
  const readyNoStats = homeState === 'READY_NO_STATS'
  const operational = homeState === 'OPERATIONAL'
  const showActions = readyNoStats || operational
  const statsReady = Boolean(gameAnalysisLastCapture)
  const lowHp = (postMatchState || showActions) && typeof hpBalance === 'number' && Number.isFinite(hpBalance) && hpBalance < 2
  const recurringIssues = Array.isArray(tacticalPatterns?.recurring_issues) ? tacticalPatterns.recurring_issues : []
  const latestInsight = recurringIssues.length > 0
    ? String(recurringIssues[0]?.issue || recurringIssues[0] || '').trim()
    : ''
  const contextRows = [
    { key: 'roster', icon: Users, label: copy.contextRoster, value: !stats || stats.totalPlayers === 0 ? copy.rosterEmpty : `${stats.titolari}/11` },
    { key: 'coach', icon: UserCheck, label: copy.contextCoach, value: hasActiveCoach ? copy.coachActive : copy.coachMissing },
    { key: 'stats', icon: BarChart3, label: copy.contextStats, value: statsReady ? `${copy.statsReady} · ${gameAnalysisLastCapture}` : copy.statsMissing, tourId: 'tour-dashboard-game-analysis' }
  ]
  const lastMatchLabel = lastMatch
    ? `${lastMatch.opponent_name || '—'}${formatMatchDate(lastMatchRaw, lang) ? ` · ${formatMatchDate(lastMatchRaw, lang)}` : ''}`
    : null

  return (
    <div className={styles.root} data-home-state={homeState}>
      <header className={styles.header}>
        <p className={styles.overline}>{copy.overline}</p>
        <h1 className={styles.greeting}>{copy.greeting(greetingName)}</h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          {onboardingState ? (
            <SetupJourney
              copy={copy}
              stats={stats}
              hasActiveCoach={hasActiveCoach}
              onOpenRoster={onOpenRoster}
              onOpenCoachSetup={onOpenCoachSetup}
            />
          ) : null}

          {postMatchState ? (
            <section className={styles.setupCard} data-tour-id="tour-dashboard-task">
              <p className={styles.cardOverline}>{copy.nextAction}</p>
              <h2>{copy.postMatchTitle}</h2>
              <p>{copy.postMatchBody}</p>
              {lowHp ? (
                <div className={styles.lowHp}>
                  <AlertCircle size={16} />
                  <span>{copy.lowHp}</span>
                  <button type="button" className={styles.lowHpCta} onClick={onGetHp}>{copy.lowHpCta}</button>
                </div>
              ) : null}
              <div className={styles.setupActions}>
                <button type="button" className={styles.primaryCta} onClick={onOpenFeedback}>
                  {copy.postMatchTitle}
                </button>
                <button type="button" className={styles.secondaryCta} onClick={onOpenMatches}>{copy.seeMatches}</button>
              </div>
            </section>
          ) : null}

          {!onboardingState ? (
            <CoachComposer
              placeholder={copy.composerPlaceholder}
              ariaLabel={copy.composerAria}
              hint={operational ? copy.composerHint : null}
              onClick={onAskHero}
              secondary={!operational}
            />
          ) : null}

          {lowHp && showActions ? (
            <div className={styles.lowHp}>
              <AlertCircle size={16} />
              <span>{copy.lowHp}</span>
              <button type="button" className={styles.lowHpCta} onClick={onGetHp}>{copy.lowHpCta}</button>
            </div>
          ) : null}

          {showActions ? (
            <section className={styles.actionSection} aria-label={copy.suggestionsTitle}>
              <p className={styles.suggestionsTitle}>{copy.suggestionsTitle}</p>
              <div className={styles.suggestions} data-dominant="stats">
                <CoachSuggestionCard
                  title={copy.statsUploadTitle}
                  copy={copy.statsUploadCopy}
                  micro={copy.statsMicro}
                  intent="stats"
                  onClick={onOpenGameAnalysis}
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

          {operational ? (
            <CoachPerformanceStrip
              lang={lang}
              gameAnalysisLastCapture={gameAnalysisLastCapture}
              onOpenProgress={onOpenProgress}
            />
          ) : null}

          {!onboardingState ? (
            <div className={`${styles.tools} ${styles.mobileKnowledge}`}>
              <AIKnowledgeBar variant="row" />
            </div>
          ) : null}

          {!onboardingState ? (
            <CoachMobileContext
              copy={copy}
              lastMatchLabel={lastMatchLabel}
              latestInsight={latestInsight}
              contextRows={contextRows}
              contextMicro={`${copy.contextRoster} ${contextRows[0]?.value || ''} · ${contextRows[1]?.value || ''}`}
              onOpenProgress={onOpenProgress}
              onOpenMatches={onOpenMatches}
            />
          ) : null}

          {!onboardingState ? (
            <details className={styles.tools} data-tour-id="tour-dashboard-nav">
              <summary className={styles.toolsSummary}>
                <span className={styles.toolsLead}>
                  <span className={styles.toolsIcon}><Wrench size={16} /></span>
                  <span className={styles.toolsCopy}>
                    <span className={styles.toolsTitle}>{copy.tools}</span>
                    <span className={styles.toolsMicro}>{copy.toolsMicro}</span>
                  </span>
                </span>
                <ChevronDown className={styles.toolsChevron} size={16} />
              </summary>
              <div className={styles.toolsPanel}>
                <button type="button" className={styles.tool} onClick={onOpenProgress}>
                  <TrendingUp size={16} />{copy.toolsProgress}
                </button>
                <button type="button" className={styles.tool} onClick={onOpenMatches}>
                  <Calendar size={16} />{copy.toolsMatches}
                </button>
                <button type="button" className={styles.tool} onClick={onOpenLiveCoach}>
                  <Radio size={16} />{copy.toolsLive}
                </button>
                {toolsExtra}
              </div>
            </details>
          ) : null}
        </div>

        {!onboardingState ? (
          <CoachContextRail
            copy={copy}
            lastMatchLabel={lastMatchLabel}
            latestInsight={latestInsight}
            contextRows={contextRows}
            onOpenProgress={onOpenProgress}
            onOpenMatches={onOpenMatches}
          />
        ) : null}
      </div>
    </div>
  )
}
