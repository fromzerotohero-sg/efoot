'use client'

import React from 'react'
import { ArrowRight, Calendar, Users, UserCheck, BarChart3, ChevronDown } from 'lucide-react'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import styles from './CoachWorkspace.module.css'

export default function CoachContextRail({
  copy,
  lastMatchLabel,
  latestInsight,
  contextRows,
  onOpenProgress,
  onOpenMatches
}) {
  return (
    <aside className={styles.rail} aria-label={copy.context}>
      {lastMatchLabel ? (
        <section className={`${styles.contextCard} ${styles.matchCard}`}>
          <p className={styles.cardOverline}>{copy.lastMatch}</p>
          <p className={styles.cardTitle}>{lastMatchLabel}</p>
          <button type="button" className={styles.textLink} onClick={onOpenMatches}>
            {copy.seeMatches}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {latestInsight ? (
        <section className={`${styles.contextCard} ${styles.insightCard}`}>
          <p className={styles.cardOverline}>{copy.insight}</p>
          <p className={styles.cardBody}>{latestInsight}</p>
          <button type="button" className={styles.textLink} onClick={onOpenProgress}>
            {copy.insightDetails}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </section>
      ) : null}

      <section className={`${styles.contextCard} ${styles.knowledgeCard}`}>
        <p className={styles.cardOverline}>{copy.knowledge}</p>
        <AIKnowledgeBar variant="gauge" compact />
        <p className={styles.knowledgeCopy}>{copy.knowledgeSub}</p>
      </section>

      <section className={styles.contextCard}>
        <p className={styles.cardOverline}>{copy.context}</p>
        {contextRows.map((row) => {
          const Icon = row.icon
          return (
            <div key={row.key} className={styles.contextRow} {...(row.tourId ? { 'data-tour-id': row.tourId } : {})}>
              <Icon size={15} aria-hidden="true" />
              <span className={styles.contextLabel}>{row.label}</span>
              <span className={styles.contextValue}>{row.value}</span>
            </div>
          )
        })}
      </section>
    </aside>
  )
}

export function CoachMobileContext({
  copy,
  lastMatchLabel,
  latestInsight,
  contextRows,
  onOpenProgress,
  onOpenMatches
}) {
  return (
    <details className={`${styles.tools} ${styles.mobileContext}`}>
      <summary className={styles.toolsSummary}>
        <span className={styles.toolsLead}>
          <span className={styles.toolsIcon} aria-hidden="true">
            <Users size={16} />
          </span>
          <span className={styles.toolsCopy}>
            <span className={styles.toolsTitle}>{copy.context}</span>
          </span>
        </span>
        <ChevronDown className={styles.toolsChevron} size={16} aria-hidden="true" />
      </summary>
      <div className={styles.toolsPanel}>
        {lastMatchLabel ? (
          <div className={styles.contextRow}>
            <Calendar size={15} aria-hidden="true" />
            <span className={styles.contextLabel}>{copy.lastMatch}</span>
            <span className={styles.contextValue}>{lastMatchLabel}</span>
          </div>
        ) : null}
        {contextRows.map((row) => {
          const Icon = row.icon
          return (
            <div key={row.key} className={styles.contextRow}>
              <Icon size={15} aria-hidden="true" />
              <span className={styles.contextLabel}>{row.label}</span>
              <span className={styles.contextValue}>{row.value}</span>
            </div>
          )
        })}
        {latestInsight ? (
          <button type="button" className={styles.textLink} onClick={onOpenProgress}>
            {copy.insightDetails}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        ) : null}
        {lastMatchLabel ? (
          <button type="button" className={styles.textLink} onClick={onOpenMatches}>
            {copy.seeMatches}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </details>
  )
}

export const CONTEXT_ICONS = { Users, UserCheck, BarChart3 }
