'use client'

import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import CoachSuggestionArt from './CoachSuggestionArt'
import styles from './CoachWorkspace.module.css'

const INTENT_CLASS = {
  analyze: styles.intentAnalyze,
  stats: styles.intentStats,
  match: styles.intentMatch,
  tactics: styles.intentTactics
}

export default function CoachSuggestionCard({ title, copy, micro, intent = 'analyze', onClick }) {
  return (
    <button
      type="button"
      className={`${styles.suggestion} ${INTENT_CLASS[intent] || styles.intentAnalyze}`}
      onClick={onClick}
      data-intent={intent}
    >
      <span className={styles.suggestionArt} aria-hidden="true">
        <CoachSuggestionArt intent={intent} />
      </span>
      <span className={styles.suggestionBody}>
        {micro ? <span className={styles.suggestionMicro}>{micro}</span> : null}
        <h3 className={styles.suggestionTitle}>{title}</h3>
        <p className={styles.suggestionCopy}>{copy}</p>
      </span>
      <span className={styles.suggestionArrow} aria-hidden="true">
        <ArrowUpRight size={16} />
      </span>
    </button>
  )
}
