'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Trophy, CheckCircle2, Circle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function TaskWidget() {
  const { t, lang } = useTranslation()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false) // Chiuso di default come Classifica, meno scroll
  const [completedFeedbackToast, setCompletedFeedbackToast] = useState(null)
  const previousCompletedIdsRef = useRef([])
  const hasFetchedBeforeRef = useRef(false)

  useEffect(() => {
    const ac = new AbortController()
    // Chiama al mount con signal per cleanup
    fetchTasks(ac.signal)

    // FIX: Ascolta eventi di salvataggio partita per ricaricare task (nessun signal: widget ancora montato)
    const refreshTasksWithDelay = () => {
      setTimeout(() => fetchTasks(), 1500)
    }
    const handleMatchSaved = () => refreshTasksWithDelay()
    const handleDiagnosticUpdated = () => refreshTasksWithDelay()

    if (typeof window !== 'undefined') {
      window.addEventListener('match-saved', handleMatchSaved)
      window.addEventListener('diagnostic-updated', handleDiagnosticUpdated)
    }
    return () => {
      ac.abort()
      if (typeof window !== 'undefined') {
        window.removeEventListener('match-saved', handleMatchSaved)
        window.removeEventListener('diagnostic-updated', handleDiagnosticUpdated)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Array vuoto = solo al mount

  // Auto-dismiss toast completamento obiettivo
  useEffect(() => {
    if (!completedFeedbackToast) return
    const timer = setTimeout(() => setCompletedFeedbackToast(null), 4000)
    return () => clearTimeout(timer)
  }, [completedFeedbackToast])

  const fetchTasks = async (signal) => {
    try {
      setLoading(true)
      setError(null)

      // Recupera token (Custom auth o Supabase)
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token
      }

      if (!token) {
        setError(t('notAuthenticated') || 'Not authenticated')
        return
      }
      
      if (signal?.aborted) return

      // Chiama API (signal solo se fornito, per evitare problemi su alcuni ambienti di deploy)
      const response = await fetch(`/api/tasks/list?lang=${lang === 'en' ? 'en' : 'it'}&t=${new Date().getTime()}`, {
        ...(signal && { signal }),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      })
      if (signal?.aborted) return

      if (!response.ok) {
        // Se 401 e abbiamo usato token custom, forse è scaduto, ma gestiamo gracefully
        if (response.status === 401) {
             setError(t('sessionExpired') || 'Session expired')
             return
        }
        const data = await response.json()
        throw new Error(data.error || t('failedToFetchTasks') || 'Failed to fetch tasks')
      }

      const data = await response.json()
      if (signal?.aborted) return

      // Validazione risposta
      if (!data.success) {
        throw new Error(data.error || t('failedToFetchTasks') || 'Failed to fetch tasks')
      }

      // Validazione e normalizzazione task
      const validTasks = (data.tasks || []).filter(task => {
        // Filtra task con dati validi
        return task && 
               task.id && 
               task.goal_description && 
               task.target_value > 0 &&
               (task.current_value === null || task.current_value >= 0)
      })

      // Feedback al completamento: toast solo dopo un refetch (non al primo caricamento)
      const completedIds = validTasks.filter(tk => tk.status === 'completed').map(tk => tk.id)
      const prev = previousCompletedIdsRef.current
      const newlyCompleted = completedIds.filter(id => !prev.includes(id))
      if (hasFetchedBeforeRef.current && newlyCompleted.length > 0) {
        setCompletedFeedbackToast(t('goalCompletedFeedback') || 'Obiettivo completato! Contribuisce alla barra Conoscenza IA.')
      }
      hasFetchedBeforeRef.current = true
      previousCompletedIdsRef.current = completedIds

      if (signal?.aborted) return
      setTasks(validTasks)
    } catch (err) {
      if (err?.name === 'AbortError' || signal?.aborted) return
      console.error('[TaskWidget] Error fetching tasks:', err)
      setError(err.message || t('errorLoadingTasks') || 'Error loading tasks')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px'
      }}>
        <Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #FF3B30',
        color: '#FF3B30',
        fontSize: '14px'
      }}>
        {t('error') || 'Error'}: {error}
      </div>
    )
  }

  const activeTasksCount = tasks.filter(task => task.status === 'active').length
  const completedCount = tasks.filter(task => task.status === 'completed').length
  const summaryText = tasks.length === 0
    ? (t('noGoalsThisWeek') || 'Nessun obiettivo')
    : activeTasksCount > 0
      ? `${activeTasksCount} ${t('active') || 'attivi'}`
      : `${completedCount} ${t('goalCompleted') || 'completati'}`

  return (
    <div
      style={{
        marginBottom: '24px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        background: 'var(--surface)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header come Classifica: icon + title + subtitle + chevron */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? t('collapseSectionGoals') : t('expandSectionGoals')}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded) } }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: 'clamp(16px, 4vw, 20px)',
          cursor: 'pointer',
          userSelect: 'none',
          color: 'var(--text-main)',
          minHeight: '44px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,165,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trophy size={26} color="var(--neon-orange)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: 'clamp(16px, 4vw, 18px)' }}>
            {t('weeklyGoals') || 'Obiettivi Settimanali'}
          </div>
          <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', color: 'var(--text-main)' }}>
            {summaryText}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={22} color="var(--neon-orange)" style={{ flexShrink: 0 }} aria-hidden />
        ) : (
          <ChevronDown size={22} color="var(--neon-orange)" style={{ flexShrink: 0 }} aria-hidden />
        )}
      </div>

      {/* Sottotitolo solo quando espanso */}
      {isExpanded && (
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          margin: '0 20px 12px',
          lineHeight: '1.4'
        }}>
          {t('goalsIncreaseKnowledge') || 'Completare gli obiettivi aumenta la conoscenza che l\'IA ha di te.'}
        </p>
      )}

      {/* Toast completamento obiettivo */}
      {completedFeedbackToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 'clamp(16px, 4vw, 24px)',
            right: 'clamp(16px, 4vw, 24px)',
            padding: 'clamp(10px, 2.5vw, 14px) clamp(14px, 3vw, 18px)',
            backgroundColor: 'rgba(34, 197, 94, 0.95)',
            color: '#fff',
            borderRadius: '8px',
            fontSize: 'clamp(12px, 2.8vw, 14px)',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            maxWidth: 'min(320px, 90vw)'
          }}
        >
          {completedFeedbackToast}
        </div>
      )}

      {/* Lista task compatta (stile Formazioni più usate) - solo quando espanso */}
      {isExpanded && (
        <div style={{ padding: '0 20px 20px' }}>
          {tasks.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px', lineHeight: '1.5' }}>
              {t('noGoalsThisWeek') || 'Nessun obiettivo questa settimana'}
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                {t('goalsWillBeGenerated') || 'Gli obiettivi verranno generati automaticamente ogni domenica'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.map(task => {
                const isCompleted = task.status === 'completed'
                const isFailed = task.status === 'failed'
                const isActive = task.status === 'active'
                const progressPct = isActive && task.target_value > 0
                  ? Math.min(100, Math.max(0, ((typeof task.current_value === 'number' ? task.current_value : 0) / task.target_value) * 100))
                  : 0
                const difficultyStyles = {
                  easy: { bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', label: t('goalDifficultyEasy') },
                  medium: { bg: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', label: t('goalDifficultyMedium') },
                  hard: { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', label: t('goalDifficultyHard') }
                }
                const diffStyle = task.difficulty ? difficultyStyles[task.difficulty] : difficultyStyles.medium
                
                return (
                  <div
                    key={task.id}
                    style={{
                      padding: '12px',
                      background: isCompleted ? 'rgba(0, 212, 255, 0.08)' : 'var(--surface)',
                      borderColor: isCompleted ? 'rgba(0, 212, 255, 0.4)' : 'rgba(0, 212, 255, 0.15)',
                      border: '1px solid',
                      borderRadius: '12px',
                      fontSize: '13px',
                      opacity: isFailed ? 0.6 : 1,
                      boxShadow: isCompleted ? '0 0 15px rgba(0, 212, 255, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                      <div style={{ marginTop: '2px', flexShrink: 0 }}>
                        {isCompleted && <CheckCircle2 size={16} color="#22c55e" />}
                        {isFailed && <XCircle size={16} color="#ef4444" />}
                        {isActive && <Circle size={16} color="var(--text-dim)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                          {task.goal_description}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                          {task.difficulty && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: diffStyle.bg,
                              color: diffStyle.color,
                              fontWeight: 500
                            }}>
                              {diffStyle.label}
                            </span>
                          )}
                          {isActive && task.target_value > 0 && (
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {typeof task.current_value === 'number' ? task.current_value.toFixed(1) : 0}/{task.target_value}
                            </span>
                          )}
                          {isCompleted && task.completed_at && (
                            <span style={{ color: '#22c55e', fontSize: '12px' }}>
                              {new Date(task.completed_at).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US')}
                            </span>
                          )}
                          {isFailed && <span style={{ color: '#ef4444', fontSize: '12px' }}>{t('goalFailed')}</span>}
                        </div>
                        {isActive && task.target_value > 0 && (
                          <div style={{ width: '100%', height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--neon-cyan)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
