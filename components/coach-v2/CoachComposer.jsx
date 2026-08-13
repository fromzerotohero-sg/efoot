'use client'

import React from 'react'
import { SendHorizonal } from 'lucide-react'
import styles from './CoachWorkspace.module.css'

function HeroMark() {
  return (
    <span className={styles.composerMark} aria-hidden="true">
      <svg viewBox="0 0 28 28">
        <path d="M14 3.5L16.7 10.7L24 13.5L16.7 16.3L14 23.5L11.3 16.3L4 13.5L11.3 10.7L14 3.5Z" fill="currentColor" opacity=".94" />
        <circle cx="21.4" cy="6.8" r="2.1" fill="currentColor" opacity=".38" />
      </svg>
    </span>
  )
}

export default function CoachComposer({ placeholder, ariaLabel, hint, onClick, secondary = false }) {
  return (
    <div className={styles.composerWrap}>
      <button
        type="button"
        className={`${styles.composer} ${secondary ? styles.composerSecondary : ''}`}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <HeroMark />
        <span className={styles.composerText}>
          <span className={styles.composerEyebrow}>Hero</span>
          <span className={styles.composerPlaceholder}>{placeholder}</span>
        </span>
        <span className={styles.composerSend} aria-hidden="true">
          <SendHorizonal size={18} />
        </span>
      </button>
      {hint ? <p className={styles.composerHint}>{hint}</p> : null}
    </div>
  )
}
