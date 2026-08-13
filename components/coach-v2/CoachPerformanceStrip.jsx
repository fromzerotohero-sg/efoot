'use client'

import React from 'react'
import { ArrowRight, Upload, TrendingUp } from 'lucide-react'
import styles from './CoachWorkspace.module.css'

function PerformanceVisual({ ready }) {
  const accent = ready ? '#2AD8EF' : '#8B949A'
  const positive = ready ? '#62E5AE' : '#A2A7AB'
  return (
    <div className={styles.performanceVisual} aria-hidden="true">
      <svg viewBox="0 0 134 112" fill="none">
        <defs>
          <linearGradient id="perf-line" x1="15" y1="85" x2="119" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor={accent} />
            <stop offset="1" stopColor={ready ? '#2F7BE5' : '#A2A7AB'} />
          </linearGradient>
          <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={accent} stopOpacity=".22" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M16 25H118M16 47H118M16 69H118M16 91H118" stroke="white" strokeOpacity=".055" />
        <path d="M33 17V96M58 17V96M83 17V96M108 17V96" stroke="white" strokeOpacity=".035" />
        <path d="M16 84C29 82 35 72 46 75C59 79 64 59 76 61C89 63 94 42 106 44C112 45 116 35 120 28V94H16V84Z" fill="url(#perf-fill)" />
        <path d="M16 84C29 82 35 72 46 75C59 79 64 59 76 61C89 63 94 42 106 44C112 45 116 35 120 28" stroke="url(#perf-line)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="84" r="3.2" fill="#0A141B" stroke={accent} strokeWidth="2" />
        <circle cx="46" cy="75" r="3.2" fill="#0A141B" stroke={accent} strokeWidth="2" />
        <circle cx="76" cy="61" r="3.2" fill="#0A141B" stroke={accent} strokeWidth="2" />
        <circle cx="106" cy="44" r="3.2" fill="#0A141B" stroke={ready ? '#2F7BE5' : accent} strokeWidth="2" />
        <circle cx="120" cy="28" r="5" fill="#0A141B" stroke={positive} strokeWidth="2.2" />
        <circle cx="120" cy="28" r="1.8" fill={positive} />
        <rect x="16" y="13" width="31" height="5" rx="2.5" fill="white" fillOpacity=".12" />
        <rect x="51" y="13" width="17" height="5" rx="2.5" fill={accent} fillOpacity=".5" />
      </svg>
    </div>
  )
}

export default function CoachPerformanceStrip({ lang, gameAnalysisLastCapture, onOpenGameAnalysis, onOpenProgress }) {
  const isEnglish = lang === 'en'
  const ready = Boolean(gameAnalysisLastCapture)
  const title = ready
    ? (isEnglish ? 'Your game data is ready for Hero' : 'I tuoi dati di gioco sono pronti per Hero')
    : (isEnglish ? 'Give Hero the data it cannot see yet' : 'Dai a Hero i dati che non può ancora vedere')
  const body = ready
    ? (isEnglish ? `Last eFootball analysis: ${gameAnalysisLastCapture}. Refresh it when your game changes.` : `Ultima analisi eFootball: ${gameAnalysisLastCapture}. Aggiornala quando cambia il tuo gioco.`)
    : (isEnglish ? 'Upload the eFootball Analysis screens. Hero combines them with squad, matches and feedback.' : 'Carica le schermate Analisi di eFootball. Hero le incrocia con rosa, partite e feedback.')

  return (
    <section className={styles.performanceStrip} data-tour-id="tour-dashboard-game-analysis" aria-label={isEnglish ? 'Performance and game stats' : 'Performance e statistiche di gioco'}>
      <PerformanceVisual ready={ready} />
      <div className={styles.performanceContent}>
        <span className={styles.performanceOverline}>Performance</span>
        <h2 className={styles.performanceTitle}>{title}</h2>
        <p className={styles.performanceBody}>{body}</p>
      </div>
      <div className={styles.performanceActions}>
        <button type="button" className={styles.performancePrimary} onClick={onOpenGameAnalysis}><Upload size={15} aria-hidden="true" />{ready ? (isEnglish ? 'Update stats' : 'Aggiorna statistiche') : (isEnglish ? 'Upload stats' : 'Carica statistiche')}</button>
        <button type="button" className={styles.performanceSecondary} onClick={onOpenProgress}><TrendingUp size={15} aria-hidden="true" />{isEnglish ? 'View progress' : 'Vedi progressi'}<ArrowRight size={13} aria-hidden="true" /></button>
      </div>
    </section>
  )
}
