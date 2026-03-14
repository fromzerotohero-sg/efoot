'use client'

import React from 'react'
import { 
  Users, 
  Gamepad2, 
  UserCircle, 
  BarChart3, 
  Trophy,
  Target,
  MessageSquare,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react'

export default function RoadmapVisualizer({ 
  currentStep,
  stats,
  recentMatches,
  userProfile,
  gameAnalysisLastCapture,
  lang,
  t
}) {
  // Definizione di tutti i passi della roadmap
  const steps = [
    {
      id: 'roster',
      icon: Users,
      title: t('roadmapRosterTitle') || 'Costruisci la tua Rosa',
      shortDesc: t('roadmapRosterShort') || '11 titolari + 5 riserve',
      fullDesc: t('roadmapRosterDesc') || 'Senza i tuoi giocatori, l\'AI non sa chi sei. Carica foto, statistiche e posizioni per ricevere consigli basati sui TUOI giocatori, non generici.',
      whyImportant: t('roadmapRosterWhy') || 'Più dati hai sulla rosa, più l\'AI può dirti "Con Ronaldo in attacco, prova questo stile" invece di "Prova un attaccante veloce".',
      unlocked: stats.totalPlayers > 0,
      completed: stats.titolari >= 11,
      progress: Math.min(100, (stats.titolari / 11) * 100),
      href: '/gestione-formazione'
    },
    {
      id: 'first_match',
      icon: Gamepad2,
      title: t('roadmapFirstMatchTitle') || 'Gioca e Carica',
      shortDesc: t('roadmapFirstMatchShort') || 'La tua prima partita',
      fullDesc: t('roadmapFirstMatchDesc') || 'Una partita caricata vale più di 1000 parole. L\'AI vede la tua formazione, il risultato, le statistiche.',
      whyImportant: t('roadmapFirstMatchWhy') || 'La prima partita attiva l\'analisi base. L\'AI inizia a capire se preferisci giocare in casa o fuori, se attacchi di più o difendi.',
      unlocked: stats.titolari >= 11,
      completed: recentMatches.length > 0,
      progress: recentMatches.length > 0 ? 100 : 0,
      href: '/match/new'
    },
    {
      id: 'profile',
      icon: UserCircle,
      title: t('roadmapProfileTitle') || 'Racconta chi sei',
      shortDesc: t('roadmapProfileShort') || 'Piattaforma, connessione, punto debole',
      fullDesc: t('roadmapProfileDesc') || 'Sei su console o PC? Hai lag? Il tuo punto debole è la difesa? Questi dati filtrano i consigli.',
      whyImportant: t('roadmapProfileWhy') || 'Se giochi con PA1 e dici "difesa", l\'AI suggerisce tattiche diverse che se giochi PA3 e dici "attacco". Personalizzazione reale.',
      unlocked: recentMatches.length > 0,
      completed: userProfile?.ai_weak_point && userProfile?.platform,
      progress: (userProfile?.ai_weak_point && userProfile?.platform) ? 100 : 
                (userProfile?.ai_weak_point || userProfile?.platform) ? 50 : 0,
      href: '/profilo'
    },
    {
      id: 'matches',
      icon: Target,
      title: t('roadmapMatchesTitle') || 'Costruisci la Storia',
      shortDesc: t('roadmapMatchesShort') || '3-5 partite per pattern',
      fullDesc: t('roadmapMatchesDesc') || 'Con 3 partite l\'AI vede pattern: "Usi sempre il 4-3-3 e perdi contro il 5-3-2". Con 5, i consigli diventano precisi.',
      whyImportant: t('roadmapMatchesWhy') || '3 partite = pattern base (formation usage). 5 partite = pattern avanzati (cosa funziona contro cosa). 10+ = consigli da pro.',
      unlocked: recentMatches.length > 0,
      completed: recentMatches.length >= 5,
      progress: Math.min(100, (recentMatches.length / 5) * 100),
      href: '/match'
    },
    {
      id: 'analysis',
      icon: BarChart3,
      title: t('roadmapAnalysisTitle') || 'Analisi eFootball',
      shortDesc: t('roadmapAnalysisShort') || 'Statistiche di gioco',
      fullDesc: t('roadmapAnalysisDesc') || 'Carica lo screenshot delle statistiche eFootball. Possesso palla, passaggi riusciti, tiri in porta.',
      whyImportant: t('roadmapAnalysisWhy') || 'Le statistiche oggettive confermano o smentiscono le tue percezioni. "Penso di passare bene" vs "Hai 65% passaggi riusciti".',
      unlocked: recentMatches.length >= 3,
      completed: gameAnalysisLastCapture,
      progress: gameAnalysisLastCapture ? 100 : 0,
      href: '/?openAnalysis=true'
    },
    {
      id: 'palestra',
      icon: MessageSquare,
      title: t('roadmapPalestraTitle') || 'Palestra Coach',
      shortDesc: t('roadmapPalestraShort') || 'Feedback e conversazione',
      fullDesc: t('roadmapPalestraDesc') || 'Racconta all\'AI come è andata. "Ho seguito il tuo consiglio ma ho perso". Questo adatta i consigli futuri.',
      whyImportant: t('roadmapPalestraWhy') || 'Ogni sessione Palestra aumenta del 10% la conoscenza AI. Dopo 4 sessioni, l\'AI ti conosce come un coach reale.',
      unlocked: recentMatches.length >= 1,
      completed: false, // Non completabile, processo continuo
      progress: 0,
      href: '/?openCoach=true'
    },
    {
      id: 'mastery',
      icon: Trophy,
      title: t('roadmapMasteryTitle') || 'Maestro',
      shortDesc: t('roadmapMasteryShort') || 'Da Zero a Hero',
      fullDesc: t('roadmapMasteryDesc') || 'Hai 10+ partite, profilo completo, usi la Palestra. L\'AI conosce i tuoi pattern, i tuoi punti deboli, i tuoi punti di forza.',
      whyImportant: t('roadmapMasteryWhy') || 'A questo livello, i consigli sono specifici al 90%. "Nel tuo 4-3-3 con quella connessione, contro il 5-3-2 usa questo approccio".',
      unlocked: recentMatches.length >= 5 && userProfile?.ai_weak_point,
      completed: false, // Meta continua
      progress: 0,
      href: '/classifica'
    }
  ]

  const getStepStatus = (step, index) => {
    if (step.completed) return 'completed'
    if (step.unlocked) return 'active'
    return 'locked'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#22c55e'
      case 'active': return '#00d4ff'
      case 'locked': return '#666'
      default: return '#666'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {t('roadmapTitle') || 'Il tuo percorso da Zero a Hero'}
        </h2>
        <p style={styles.subtitle}>
          {t('roadmapSubtitle') || 'Ogni passo aggiunge dati. Più dati hai, più i consigli sono tuoi.'}
        </p>
      </div>

      <div style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index)
          const Icon = step.icon
          const isCurrent = status === 'active' && !step.completed
          
          return (
            <div 
              key={step.id}
              style={{
                ...styles.step,
                opacity: status === 'locked' ? 0.5 : 1
              }}
            >
              {/* Connector line */}
              {index > 0 && (
                <div style={{
                  ...styles.connector,
                  backgroundColor: steps[index-1].completed ? '#22c55e' : '#333'
                }} />
              )}

              {/* Icon */}
              <div style={{
                ...styles.iconWrapper,
                backgroundColor: status === 'completed' ? 'rgba(34, 197, 94, 0.2)' :
                                status === 'active' ? 'rgba(0, 212, 255, 0.2)' :
                                'rgba(255, 255, 255, 0.05)',
                borderColor: getStatusColor(status)
              }}>
                {status === 'completed' ? (
                  <CheckCircle2 size={24} color="#22c55e" />
                ) : status === 'locked' ? (
                  <Lock size={20} color="#666" />
                ) : (
                  <Icon size={24} color={getStatusColor(status)} />
                )}
                
                {/* Progress ring for active */}
                {status === 'active' && step.progress > 0 && (
                  <svg style={styles.progressRing} viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#333"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#00d4ff"
                      strokeWidth="2"
                      strokeDasharray={`${step.progress}, 100`}
                    />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div style={styles.content}>
                <div style={styles.stepHeader}>
                  <h3 style={{
                    ...styles.stepTitle,
                    color: getStatusColor(status)
                  }}>
                    {step.title}
                  </h3>
                  {isCurrent && (
                    <span style={styles.currentBadge}>
                      {t('current') || 'Attuale'}
                    </span>
                  )}
                </div>
                
                <p style={styles.shortDesc}>{step.shortDesc}</p>
                
                {status !== 'locked' && (
                  <>
                    <p style={styles.fullDesc}>{step.fullDesc}</p>
                    <div style={styles.whyImportant}>
                      <strong>{t('whyImportant') || 'Perché è importante:'}</strong>
                      <p>{step.whyImportant}</p>
                    </div>
                  </>
                )}

                {isCurrent && (
                  <button 
                    onClick={() => window.location.href = step.href}
                    style={styles.actionButton}
                  >
                    {t('continue') || 'Continua'}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{...styles.legendDot, backgroundColor: '#22c55e'}} />
          <span>{t('completed') || 'Completato'}</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendDot, backgroundColor: '#00d4ff'}} />
          <span>{t('inProgress') || 'In corso'}</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendDot, backgroundColor: '#666'}} />
          <span>{t('locked') || 'Bloccato'}</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '28px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center'
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '24px',
    fontWeight: 700,
    color: '#fff'
  },
  subtitle: {
    margin: 0,
    fontSize: '15px',
    color: '#888'
  },
  stepsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  step: {
    display: 'flex',
    gap: '16px',
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    position: 'relative',
    transition: 'all 0.2s ease'
  },
  connector: {
    position: 'absolute',
    left: '43px',
    top: '-8px',
    width: '2px',
    height: '8px'
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative'
  },
  progressRing: {
    position: 'absolute',
    top: '-4px',
    left: '-4px',
    width: '64px',
    height: '64px',
    transform: 'rotate(-90deg)'
  },
  content: {
    flex: 1,
    minWidth: 0
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  stepTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600
  },
  currentBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    color: '#00d4ff',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase'
  },
  shortDesc: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#aaa'
  },
  fullDesc: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#888',
    lineHeight: 1.5
  },
  whyImportant: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderLeft: '3px solid #00d4ff',
    padding: '12px 16px',
    borderRadius: '0 8px 8px 0',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#ccc',
    lineHeight: 1.5
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: '#00d4ff',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#888'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  }
}
