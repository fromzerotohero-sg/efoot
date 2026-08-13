'use client'

import React from 'react'
import { ArrowRight, RefreshCw, TrendingUp } from 'lucide-react'
import styles from './CoachWorkspace.module.css'

function PerformanceVisual({ ready }) {
  const accent = ready ? '#00A7C4' : '#778186'
  const positive = ready ? '#269966' : '#778186'
  return (
    <div
      className={styles.performanceVisual}
      aria-hidden="true"
      style={{ background: 'linear-gradient(145deg,#EAF8FB,#F9FDFE)', border: '1px solid rgba(16,48,58,.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9)' }}
    >
      <svg viewBox="0 0 134 112" fill="none">
        <defs>
          <linearGradient id="perf-line" x1="15" y1="85" x2="119" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor={accent} />
            <stop offset="1" stopColor={ready ? '#2F7BE5' : '#778186'} />
          </linearGradient>
          <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={accent} stopOpacity=".18" />
            <stop offset="1" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M16 25H118M16 47H118M16 69H118M16 91H118" stroke="#10303A" strokeOpacity=".08" />
        <path d="M33 17V96M58 17V96M83 17V96M108 17V96" stroke="#10303A" strokeOpacity=".055" />
        <path d="M16 84C29 82 35 72 46 75C59 79 64 59 76 61C89 63 94 42 106 44C112 45 116 35 120 28V94H16V84Z" fill="url(#perf-fill)" />
        <path d="M16 84C29 82 35 72 46 75C59 79 64 59 76 61C89 63 94 42 106 44C112 45 116 35 120 28" stroke="url(#perf-line)" strokeWidth="3.3" strokeLinecap="round" />
        <circle cx="16" cy="84" r="3.2" fill="#FFFFFF" stroke={accent} strokeWidth="2" />
        <circle cx="46" cy="75" r="3.2" fill="#FFFFFF" stroke={accent} strokeWidth="2" />
        <circle cx="76" cy="61" r="3.2" fill="#FFFFFF" stroke={accent} strokeWidth="2" />
        <circle cx="106" cy="44" r="3.2" fill="#FFFFFF" stroke={ready ? '#2F7BE5' : accent} strokeWidth="2" />
        <circle cx="120" cy="28" r="5" fill="#FFFFFF" stroke={positive} strokeWidth="2.2" />
        <circle cx="120" cy="28" r="1.8" fill={positive} />
        <rect x="16" y="13" width="31" height="5" rx="2.5" fill="#10303A" fillOpacity=".14" />
        <rect x="51" y="13" width="17" height="5" rx="2.5" fill={accent} fillOpacity=".58" />
      </svg>
    </div>
  )
}

export default function CoachPerformanceStrip({ lang, gameAnalysisLastCapture, onOpenGameAnalysis, onOpenProgress }) {
  const isEnglish = lang === 'en'
  const ready = Boolean(gameAnalysisLastCapture)
  const title = ready
    ? (isEnglish ? 'Hero has your latest game data' : 'Hero ha i tuoi ultimi dati di gioco')
    : (isEnglish ? 'Hero needs your game data' : 'A Hero mancano i tuoi dati di gioco')
  const body = ready
    ? (isEnglish ? `Last eFootball analysis: ${gameAnalysisLastCapture}. Open progress to see what is changing.` : `Ultima analisi eFootball: ${gameAnalysisLastCapture}. Apri i progressi per vedere cosa sta cambiando.`)
    : (isEnglish ? 'Upload the eFootball Analysis screens from Data Lab, then Hero can connect them with squad and matches.' : 'Carica le schermate Analisi dal Data Lab: Hero le collegherà a rosa, partite e feedback.')

  return (
    <section className={styles.performanceStrip} data-tour-id="tour-dashboard-game-analysis" aria-label={isEnglish ? 'Performance and game stats' : 'Performance e statistiche di gioco'}>
      <PerformanceVisual ready={ready} />
      <div className={styles.performanceContent}>
        <span className={styles.performanceOverline}>Performance</span>
        <h2 className={styles.performanceTitle}>{title}</h2>
        <p className={styles.performanceBody}>{body}</p>
      </div>
      <div className={styles.performanceActions}>
        <button type="button" className={styles.performancePrimary} onClick={onOpenProgress}>
          <TrendingUp size={15} aria-hidden="true" />
          {isEnglish ? 'View progress' : 'Vedi progressi'}
          <ArrowRight size={13} aria-hidden="true" />
        </button>
        <button type="button" className={styles.performanceSecondary} onClick={onOpenGameAnalysis}>
          <RefreshCw size={14} aria-hidden="true" />
          {ready ? (isEnglish ? 'Refresh data' : 'Aggiorna dati') : (isEnglish ? 'Add data' : 'Aggiungi dati')}
        </button>
      </div>
    </section>
  )
}
