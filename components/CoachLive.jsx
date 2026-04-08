'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { X, ChevronRight, BarChart3, Dumbbell, AlertCircle, CheckCircle } from 'lucide-react'

/**
 * CoachLive - AI Coach Proattivo
 * 
 * Sistema di alert conversazionali che guida l'utente verso:
 * 1. Caricamento statistiche di gioco
 * 2. Utilizzo Palestra Coach
 * 
 * Non sostituisce la Chat IA, è un canale monodirezionale (IA -> Utente)
 * 
 * Stati:
 * - idle: Invisibile o micro-icona
 * - alert: Bottom sheet (mobile) / Toast (desktop) attivo
 * - dismissed: Chiuso dall'utente (cooldown 24h)
 */

const COACH_STATE_KEY = 'coach_live_state'
const COACH_COOLDOWN_HOURS = 24

export default function CoachLive({ 
  userProfile, 
  matches = [], 
  gameAnalysisLastCapture,
  onOpenGameAnalysis, 
  onOpenCoachFeedback 
}) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [currentMessage, setCurrentMessage] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Legge stato da localStorage
  const getCoachState = useCallback(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = localStorage.getItem(COACH_STATE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }, [])

  // Salva stato in localStorage
  const saveCoachState = useCallback((updates) => {
    if (typeof window === 'undefined') return
    try {
      const current = getCoachState()
      const next = { ...current, ...updates, lastUpdated: new Date().toISOString() }
      localStorage.setItem(COACH_STATE_KEY, JSON.stringify(next))
    } catch (e) {
      console.error('[CoachLive] Failed to save state:', e)
    }
  }, [getCoachState])

  // Controlla se un messaggio è in cooldown
  const isInCooldown = useCallback((messageId) => {
    const state = getCoachState()
    if (!state.cooldowns) return false
    
    const cooldown = state.cooldowns[messageId]
    if (!cooldown) return false
    
    const now = new Date()
    const cooldownEnd = new Date(cooldown)
    return now < cooldownEnd
  }, [getCoachState])

  // Calcola trigger e sceglie messaggio
  useEffect(() => {
    if (!userProfile || isVisible || currentMessage) return

    const checkTriggers = () => {
      const now = new Date()
      
      // Dati necessari
      const hasStats = !!gameAnalysisLastCapture || userProfile?.game_analysis_data != null
      const hasCoach = userProfile.has_active_coach === true
      const matchesCount = matches.length
      const lastMatch = matches[0]
      const lastMatchDate = lastMatch?.created_at ? new Date(lastMatch.created_at) : null
      
      // Controllo Palestra (ultimi 7 giorni)
      const lastPalestra = userProfile.last_coach_feedback_at 
        ? new Date(userProfile.last_coach_feedback_at)
        : null
      const daysSincePalestra = lastPalestra 
        ? (now - lastPalestra) / (1000 * 60 * 60 * 24)
        : 999
      const needsPalestra = daysSincePalestra > 7 && matchesCount >= 3

      // 1. ALLARME ROSSO: Molte partite, zero dati
      if (!hasStats && matchesCount >= 5 && !isInCooldown('critical_no_data')) {
        return {
          id: 'critical_no_data',
          priority: 3,
          icon: AlertCircle,
          iconColor: '#FF3B30',
          bgGradient: 'linear-gradient(135deg, rgba(255, 59, 48, 0.15) 0%, rgba(255, 59, 48, 0.05) 100%)',
          title: t('coachLiveCriticalTitle'),
          message: t('coachLiveCriticalMessage'),
          primaryAction: {
            label: t('coachLiveActionSetup'),
            onClick: () => {
              saveCoachState({ 
                cooldowns: { 
                  ...getCoachState().cooldowns, 
                  critical_no_data: new Date(now.getTime() + COACH_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
                }
              })
              if (onOpenGameAnalysis) onOpenGameAnalysis()
              dismiss()
            }
          },
          secondaryAction: {
            label: t('coachLiveLater'),
            onClick: () => dismissWithCooldown('critical_no_data')
          }
        }
      }

      // 2. POST-PARTITA: Ha appena giocato ma non usa Palestra
      // Controlla se ultima partita è nelle ultime 30 min e non ha usato Palestra recentemente
      const lastMatchMinutesAgo = lastMatchDate 
        ? (now - lastMatchDate) / (1000 * 60)
        : 999
      
      if (lastMatchMinutesAgo < 30 && needsPalestra && !isInCooldown('post_match_palestra')) {
        return {
          id: 'post_match_palestra',
          priority: 2,
          icon: Dumbbell,
          iconColor: '#00d4ff',
          bgGradient: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.05) 100%)',
          title: t('coachLivePostMatchTitle'),
          message: t('coachLivePostMatchMessage'),
          primaryAction: {
            label: t('coachLiveActionPalestra'),
            onClick: () => {
              saveCoachState({ 
                cooldowns: { 
                  ...getCoachState().cooldowns, 
                  post_match_palestra: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
                }
              })
              if (onOpenCoachFeedback) onOpenCoachFeedback()
              dismiss()
            }
          },
          secondaryAction: {
            label: t('coachLiveLater'),
            onClick: () => dismissWithCooldown('post_match_palestra')
          }
        }
      }

      // 3. PRIMO ACCESSO: Mancano statistiche (score basso)
      const aiScore = userProfile.ai_knowledge_score || 0
      if (!hasStats && aiScore < 30 && matchesCount >= 2 && !isInCooldown('first_time_stats')) {
        return {
          id: 'first_time_stats',
          priority: 1,
          icon: BarChart3,
          iconColor: '#FFD76A',
          bgGradient: 'linear-gradient(135deg, rgba(255, 215, 106, 0.15) 0%, rgba(255, 215, 106, 0.05) 100%)',
          title: t('coachLiveFirstTimeTitle'),
          message: t('coachLiveFirstTimeMessage'),
          primaryAction: {
            label: t('coachLiveActionStats'),
            onClick: () => {
              saveCoachState({ 
                cooldowns: { 
                  ...getCoachState().cooldowns, 
                  first_time_stats: new Date(now.getTime() + COACH_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
                }
              })
              if (onOpenGameAnalysis) onOpenGameAnalysis()
              dismiss()
            }
          },
          secondaryAction: {
            label: t('coachLiveLater'),
            onClick: () => dismissWithCooldown('first_time_stats')
          }
        }
      }

      // 4. PROMEMORIA PALESTRA: Non usa da settimane ma ha statistiche
      if (hasStats && needsPalestra && !isInCooldown('palestra_reminder')) {
        return {
          id: 'palestra_reminder',
          priority: 1,
          icon: Dumbbell,
          iconColor: '#a855f7',
          bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
          title: t('coachLivePalestraTitle'),
          message: t('coachLivePalestraMessage'),
          primaryAction: {
            label: t('coachLiveActionPalestra'),
            onClick: () => {
              saveCoachState({ 
                cooldowns: { 
                  ...getCoachState().cooldowns, 
                  palestra_reminder: new Date(now.getTime() + COACH_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
                }
              })
              if (onOpenCoachFeedback) onOpenCoachFeedback()
              dismiss()
            }
          },
          secondaryAction: {
            label: t('coachLiveLater'),
            onClick: () => dismissWithCooldown('palestra_reminder')
          }
        }
      }

      return null
    }

    // Delay iniziale per non disturbare subito
    const timer = setTimeout(() => {
      const message = checkTriggers()
      if (message) {
        setCurrentMessage(message)
        setIsVisible(true)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [userProfile, matches, isVisible, currentMessage, t, isInCooldown, onOpenGameAnalysis, onOpenCoachFeedback, getCoachState, saveCoachState])

  const dismiss = useCallback(() => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsVisible(false)
      setCurrentMessage(null)
      setIsAnimating(false)
    }, 300)
  }, [])

  const dismissWithCooldown = useCallback((messageId) => {
    const now = new Date()
    saveCoachState({ 
      cooldowns: { 
        ...getCoachState().cooldowns, 
        [messageId]: new Date(now.getTime() + COACH_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
      },
      dismissCount: (getCoachState().dismissCount || 0) + 1
    })
    dismiss()
  }, [dismiss, saveCoachState, getCoachState])

  if (!isVisible || !currentMessage) return null

  const IconComponent = currentMessage.icon
  const isCritical = currentMessage.priority === 3

  return (
    <div className={`coach-live-overlay ${isAnimating ? 'closing' : ''}`}>
      {/* Backdrop scuro su mobile */}
      <div 
        className="coach-live-backdrop"
        onClick={() => dismissWithCooldown(currentMessage.id)}
      />
      
      <div 
        className={`coach-live-container ${isExpanded ? 'expanded' : ''}`}
        style={{
          background: 'linear-gradient(145deg, rgba(5, 8, 21, 0.98) 0%, rgba(10, 14, 39, 0.98) 100%)',
          borderTop: `2px solid ${currentMessage.iconColor}`,
          boxShadow: `0 -8px 32px ${currentMessage.iconColor}30`
        }}
      >
        {/* Handle per swipe su mobile */}
        <div 
          className="coach-live-handle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="coach-live-handle-bar" />
        </div>

        <div className="coach-live-content">
          {/* Header con Avatar e Titolo */}
          <div className="coach-live-header">
            <div 
              className="coach-avatar"
              style={{
                background: currentMessage.bgGradient,
                borderColor: currentMessage.iconColor,
                boxShadow: `0 0 20px ${currentMessage.iconColor}40`
              }}
            >
              <IconComponent 
                size={28} 
                color={currentMessage.iconColor}
                strokeWidth={2}
              />
              {/* Animazione pulsing per critico */}
              {isCritical && <div className="coach-avatar-pulse" style={{ borderColor: currentMessage.iconColor }} />}
            </div>
            
            <div className="coach-live-title-section">
              <span className="coach-live-label">{t('coachLiveLabel')}</span>
              <h3 className="coach-live-title" style={{ color: currentMessage.iconColor }}>
                {currentMessage.title}
              </h3>
            </div>

            <button 
              className="coach-live-close"
              onClick={() => dismissWithCooldown(currentMessage.id)}
              aria-label={t('close')}
            >
              <X size={20} color="rgba(255,255,255,0.6)" />
            </button>
          </div>

          {/* Messaggio */}
          <div className="coach-live-message">
            <p>{currentMessage.message}</p>
          </div>

          {/* Azioni */}
          <div className="coach-live-actions">
            <button
              className="coach-live-btn coach-live-btn-primary"
              onClick={currentMessage.primaryAction.onClick}
              style={{
                background: `linear-gradient(135deg, ${currentMessage.iconColor} 0%, ${currentMessage.iconColor}dd 100%)`,
                boxShadow: `0 4px 15px ${currentMessage.iconColor}40`
              }}
            >
              {currentMessage.primaryAction.label}
              <ChevronRight size={16} />
            </button>
            
            {currentMessage.secondaryAction && (
              <button
                className="coach-live-btn coach-live-btn-secondary"
                onClick={currentMessage.secondaryAction.onClick}
              >
                {currentMessage.secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .coach-live-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          pointer-events: none;
        }

        .coach-live-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: auto;
        }

        .coach-live-overlay:not(.closing) .coach-live-backdrop {
          opacity: 1;
        }

        .coach-live-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          border-radius: 24px 24px 0 0;
          padding: 16px 20px calc(20px + env(safe-area-inset-bottom, 0px));
          transform: translateY(0);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: auto;
          max-height: 50vh;
          overflow-y: auto;
        }

        .coach-live-overlay.closing .coach-live-container {
          transform: translateY(100%);
        }

        .coach-live-handle {
          display: flex;
          justify-content: center;
          padding: 8px 0 12px;
          cursor: pointer;
        }

        .coach-live-handle-bar {
          width: 40px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .coach-live-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .coach-live-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .coach-avatar {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          animation: coachBreathe 3s ease-in-out infinite;
        }

        @keyframes coachBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .coach-avatar-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid;
          opacity: 0;
          animation: coachPulse 2s ease-out infinite;
        }

        @keyframes coachPulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        .coach-live-title-section {
          flex: 1;
          min-width: 0;
        }

        .coach-live-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
          display: block;
          margin-bottom: 2px;
        }

        .coach-live-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }

        .coach-live-close {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .coach-live-close:hover {
          background: rgba(255, 59, 48, 0.2);
          border-color: rgba(255, 59, 48, 0.4);
        }

        .coach-live-message {
          font-size: 15px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.9);
          padding: 0 4px;
        }

        .coach-live-message p {
          margin: 0;
        }

        .coach-live-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }

        .coach-live-btn {
          width: 100%;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
        }

        .coach-live-btn-primary {
          color: #000;
        }

        .coach-live-btn-primary:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .coach-live-btn-primary:active {
          transform: translateY(0);
        }

        .coach-live-btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: rgba(255, 255, 255, 0.7);
        }

        .coach-live-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          color: #fff;
        }

        /* Desktop: Toast laterale */
        @media (min-width: 768px) {
          .coach-live-overlay {
            justify-content: flex-end;
            align-items: flex-end;
            padding: 24px;
          }

          .coach-live-backdrop {
            display: none;
          }

          .coach-live-container {
            width: 400px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 212, 255, 0.1);
            transform: translateX(0);
            max-height: none;
            margin: 0;
          }

          .coach-live-overlay.closing .coach-live-container {
            transform: translateX(450px);
          }

          .coach-live-handle {
            display: none;
          }

          .coach-live-actions {
            flex-direction: row;
          }

          .coach-live-btn {
            flex: 1;
          }
        }

        /* Animazione entrance */
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (min-width: 768px) {
          @keyframes slideUp {
            from {
              transform: translateX(100px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        }

        .coach-live-container {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  )
}
