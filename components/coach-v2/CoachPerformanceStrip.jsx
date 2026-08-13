'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import styles from './CoachWorkspace.module.css'

export default function CoachPerformanceStrip({ lang, gameAnalysisLastCapture, onOpenProgress }) {
  if (!gameAnalysisLastCapture) return null

  const isEnglish = lang === 'en'

  return (
    <section
      className={styles.performanceStrip}
      data-tour-id="tour-dashboard-game-analysis"
      aria-label={isEnglish ? 'Latest game analysis' : 'Ultima analisi di gioco'}
    >
      <div className={styles.performanceContent}>
        <span className={styles.performanceOverline}>Performance</span>
        <p className={styles.performanceTitle}>
          {isEnglish
            ? `Last eFootball analysis: ${gameAnalysisLastCapture}`
            : `Ultima analisi eFootball: ${gameAnalysisLastCapture}`}
        </p>
      </div>
      <button type="button" className={styles.performanceLink} onClick={onOpenProgress}>
        {isEnglish ? 'View progress' : 'Vedi progressi'}
        <ArrowRight size={14} aria-hidden="true" />
      </button>
    </section>
  )
}
