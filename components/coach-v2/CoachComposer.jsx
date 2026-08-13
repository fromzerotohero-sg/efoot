'use client'

import React from 'react'
import { SendHorizonal } from 'lucide-react'
import styles from './CoachWorkspace.module.css'

export default function CoachComposer({
  placeholder,
  ariaLabel,
  hint,
  onClick,
  secondary = false
}) {
  return (
    <div className={styles.composerWrap}>
      <button
        type="button"
        className={`${styles.composer} ${secondary ? styles.composerSecondary : ''}`}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <span className={styles.composerPlaceholder}>{placeholder}</span>
        <span className={styles.composerSend} aria-hidden="true">
          <SendHorizonal size={18} />
        </span>
      </button>
      {hint ? <p className={styles.composerHint}>{hint}</p> : null}
    </div>
  )
}
