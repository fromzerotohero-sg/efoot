'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import { pickLang } from '@/lib/i18n'
import styles from './CoachWorkspace.module.css'

export default function CoachPerformanceStrip({ lang, gameAnalysisLastCapture, onOpenProgress }) {
  if (!gameAnalysisLastCapture) return null

  return (
    <section
      className={styles.performanceStrip}
      data-tour-id="tour-dashboard-game-analysis"
      aria-label={pickLang(lang, { it: 'Ultima analisi di gioco', en: 'Latest game analysis', es: 'Último análisis de juego' })}
    >
      <div className={styles.performanceContent}>
        <span className={styles.performanceOverline}>Performance</span>
        <p className={styles.performanceTitle}>
          {pickLang(lang, {
            it: `Ultima analisi eFootball: ${gameAnalysisLastCapture}`,
            en: `Last eFootball analysis: ${gameAnalysisLastCapture}`,
            es: `Último análisis eFootball: ${gameAnalysisLastCapture}`
          })}
        </p>
      </div>
      <button type="button" className={styles.performanceLink} onClick={onOpenProgress}>
        {pickLang(lang, { it: 'Vedi progressi', en: 'View progress', es: 'Ver progreso' })}
        <ArrowRight size={14} aria-hidden="true" />
      </button>
    </section>
  )
}
