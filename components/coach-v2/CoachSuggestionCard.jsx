'use client'

import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import styles from './CoachWorkspace.module.css'

const TONE_CLASS = {
  cyan: styles.toneCyan,
  green: styles.toneGreen,
  gold: styles.toneGold
}

export default function CoachSuggestionCard({
  title,
  copy,
  icon: Icon,
  tone = 'cyan',
  onClick
}) {
  return (
    <button
      type="button"
      className={`${styles.suggestion} ${TONE_CLASS[tone] || styles.toneCyan}`}
      onClick={onClick}
    >
      <span className={styles.suggestionIcon} aria-hidden="true">
        <Icon size={22} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 className={styles.suggestionTitle}>{title}</h3>
        <p className={styles.suggestionCopy}>{copy}</p>
      </span>
      <span className={styles.suggestionArrow} aria-hidden="true">
        <ArrowUpRight size={16} />
      </span>
    </button>
  )
}
