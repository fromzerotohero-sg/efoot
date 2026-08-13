'use client'

import React from 'react'
import { ArrowRight, Upload, TrendingUp } from 'lucide-react'
import styles from './CoachWorkspace.module.css'

function PerformanceVisual({ ready }) {
  return (
    <div className={styles.performanceVisual} aria-hidden="true">
      <svg viewBox="0 0 112 96">
        <rect x="7" y="10" width="98" height="76" rx="18" fill="#FFFFFF" stroke="rgba(0,0,0,.07)" />
        <path d="M20 69C34 66 39 57 49 59C61 61 65 44 76 46C87 47 90 34 98 30" fill="none" stroke={ready ? '#00A8C8' : '#9B9B9B'} strokeWidth="3" strokeLinecap="round" />
        <path d="M20 72H98" stroke="rgba(0,0,0,.07)" />
        <path d="M28 72V51M42 72V60M56 72V48M70 72V55M84 72V39" stroke={ready ? 'rgba(0,168,200,.26)' : 'rgba(0,0,0,.09)'} strokeWidth="5" strokeLinecap="round" />
        <circle cx="98" cy="30" r="6" fill="#FFFFFF" stroke={ready ? '#27A76A' : '#9B9B9B'} strokeWidth="2.5" />
        <circle cx="98" cy="30" r="2.2" fill={ready ? '#27A76A' : '#9B9B9B'} />
      </svg>
    </div>
  )
}

export default function CoachPerformanceStrip({ lang, gameAnalysisLastCapture, onOpenGameAnalysis, onOpenProgress }) {
  const isEnglish = lang === 'en'
  const ready = Boolean(gameAnalysisLastCapture)
  const title = ready
    ? (isEnglish ? 'Your game data is ready for Hero' : 'I tuoi dati di gioco sono pronti per Hero')
    : (isEnglish ? 'Add the data Hero cannot see yet' : 'Aggiungi i dati che Hero non può ancora vedere')
  const body = ready
    ? (isEnglish
      ? `Last eFootball analysis: ${gameAnalysisLastCapture}. Update it when your recent games change.`
      : `Ultima analisi eFootball: ${gameAnalysisLastCapture}. Aggiornala quando cambiano le tue partite recenti.`)
    : (isEnglish
      ? 'Upload the Analysis screens from eFootball. Hero combines them with squad, matches and feedback.'
      : 'Carica le schermate Analisi di eFootball. Hero le incrocia con rosa, partite e feedback.')

  return (
    <section className={styles.performanceStrip} data-tour-id="tour-dashboard-game-analysis" aria-label={isEnglish ? 'Performance and game stats' : 'Performance e statistiche di gioco'}>
      <PerformanceVisual ready={ready} />
      <div className={styles.performanceContent}>
        <span className={styles.performanceOverline}>Performance</span>
        <h2 className={styles.performanceTitle}>{title}</h2>
        <p className={styles.performanceBody}>{body}</p>
      </div>
      <div className={styles.performanceActions}>
        <button type="button" className={styles.performancePrimary} onClick={onOpenGameAnalysis}>
          <Upload size={16} aria-hidden="true" />
          {ready ? (isEnglish ? 'Update stats' : 'Aggiorna statistiche') : (isEnglish ? 'Upload stats' : 'Carica statistiche')}
        </button>
        <button type="button" className={styles.performanceSecondary} onClick={onOpenProgress}>
          <TrendingUp size={16} aria-hidden="true" />
          {isEnglish ? 'View progress' : 'Vedi progressi'}
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
