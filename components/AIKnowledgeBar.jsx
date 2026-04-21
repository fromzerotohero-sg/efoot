'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { RefreshCw, AlertCircle, Trophy, Target, Zap, Crown } from 'lucide-react'

/**
 * Hook per rilevare mobile
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return isMobile
}

/**
 * AI Knowledge Bar - Enterprise Premium Edition
 * 
 * Design: Glassmorphism card with animated gradient borders,
 * level badges with icons, shimmer progress bar
 */
export default function AIKnowledgeBar() {
  const { t } = useTranslation()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState('beginner')
  const [breakdown, setBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [animatedScore, setAnimatedScore] = useState(0)

  const scoreRef = React.useRef(score)
  const previousScoreRef = React.useRef(score)
  const retryTimeoutRef = React.useRef(null)
  scoreRef.current = score

  // Animate score on load
  useEffect(() => {
    if (!loading && score > 0) {
      const duration = 1200
      const steps = 60
      const increment = score / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= score) {
          setAnimatedScore(score)
          clearInterval(timer)
        } else {
          setAnimatedScore(Math.round(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [loading, score])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ac = new AbortController()
    fetchAIKnowledge(ac.signal, true)

    const doRefresh = (useRefreshParam = false) => {
      previousScoreRef.current = scoreRef.current
      const retryDelays = [1000, 2000, 3000, 5000, 8000]
      let attempt = 0

      const attemptRefresh = async () => {
        if (attempt >= retryDelays.length) return
        if (ac.signal.aborted) return
        attempt++
        try {
          if (!supabase) return
          const { data: session } = await supabase.auth.getSession()
          const token = session?.session?.access_token
          
          if (!token) return
          if (ac.signal.aborted) return
          const url = useRefreshParam ? '/api/ai-knowledge?refresh=1' : '/api/ai-knowledge'
          const res = await fetch(url, {
            method: 'GET',
            signal: ac.signal,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (ac.signal.aborted) return
          
          if (!res.ok) throw new Error('Fetch failed')
          
          const data = await res.json()
          const newScore = data.score || 0
          
          if (ac.signal.aborted) return
          if (Math.abs(newScore - previousScoreRef.current) > 0.01) {
            if (process.env.NODE_ENV !== 'production') console.log(`[AIKnowledgeBar] Score updated: ${previousScoreRef.current} → ${newScore}`)
            setScore(newScore)
            setLevel(data.level || 'beginner')
            setBreakdown(data.breakdown || {})
            return
          }
          
          if (process.env.NODE_ENV !== 'production') console.log(`[AIKnowledgeBar] Score unchanged (${newScore}), scheduling next retry...`)
          if (attempt < retryDelays.length) {
            retryTimeoutRef.current = setTimeout(attemptRefresh, retryDelays[attempt])
          }
        } catch (err) {
          if (err?.name === 'AbortError' || ac.signal.aborted) return
          console.error('[AIKnowledgeBar] Retry attempt failed:', err)
          if (attempt < retryDelays.length) {
            retryTimeoutRef.current = setTimeout(attemptRefresh, retryDelays[attempt])
          }
        }
      }
      
      retryTimeoutRef.current = setTimeout(attemptRefresh, retryDelays[0])
    }

    const onMatchSaved = () => doRefresh(false)
    const onKnowledgeRefresh = () => doRefresh(true)

    window.addEventListener('match-saved', onMatchSaved)
    window.addEventListener('knowledge-should-refresh', onKnowledgeRefresh)

    const interval = setInterval(() => { fetchAIKnowledge(ac.signal) }, 1 * 60 * 1000)

    return () => {
      ac.abort()
      clearInterval(interval)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      window.removeEventListener('match-saved', onMatchSaved)
      window.removeEventListener('knowledge-should-refresh', onKnowledgeRefresh)
    }
  }, [])

  const fetchAIKnowledge = async (signal, forceRefresh = false) => {
    try {
      setError(null)

      if (!supabase) {
        setError('Supabase not configured')
        return
      }
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token

      if (!token) {
        setLoading(false)
        router.push('/login')
        return
      }
      
      if (signal?.aborted) return
      
      const res = await fetch(forceRefresh ? '/api/ai-knowledge?refresh=1' : '/api/ai-knowledge', {
        method: 'GET',
        ...(signal && { signal }),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (signal?.aborted) return
      if (res.status === 401) {
        setLoading(false)
        router.push('/login')
        return
      }
      const data = await safeJsonResponse(res, 'Failed to fetch AI knowledge')
      if (signal?.aborted) return
      setScore(data.score || 0)
      setLevel(data.level || 'beginner')
      setBreakdown(data.breakdown || {})
    } catch (err) {
      if (err?.name === 'AbortError' || signal?.aborted) return
      const msg = err?.message || ''
      const isSessionExpired = /sessione scaduta|session expired|invalid or expired|authentication required/i.test(msg)
      if (isSessionExpired) {
        setLoading(false)
        router.push('/login')
        return
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AIKnowledgeBar] Error fetching:', err)
      }
      setError(msg || t('sessionExpired'))
    } finally {
      setLoading(false)
    }
  }

  // Level configuration with colors and icons - using translations
  const getLevelConfig = (levelKey) => {
    const configs = {
      beginner: {
        color: '#FF9500',
        gradient: 'linear-gradient(135deg, #FF9500 0%, #FFB347 100%)',
        glow: 'rgba(255, 149, 0, 0.5)',
        icon: Target,
        label: t('aiKnowledgeBeginner') || 'Principiante',
        description: t('aiKnowledgeBeginnerShort') || 'Inizia il tuo percorso'
      },
      intermediate: {
        color: '#00D4FF',
        gradient: 'linear-gradient(135deg, #00A3CC 0%, #00D4FF 100%)',
        glow: 'rgba(0, 212, 255, 0.5)',
        icon: Zap,
        label: t('aiKnowledgeIntermediate') || 'Intermedio',
        description: t('aiKnowledgeIntermediateShort') || 'Stai migliorando'
      },
      advanced: {
        color: '#9D4EDD',
        gradient: 'linear-gradient(135deg, #7B2CBF 0%, #C77DFF 100%)',
        glow: 'rgba(157, 78, 221, 0.5)',
        icon: Trophy,
        label: t('aiKnowledgeAdvanced') || 'Avanzato',
        description: t('aiKnowledgeAdvancedShort') || 'Competenza elevata'
      },
      expert: {
        color: '#FFD700',
        gradient: 'linear-gradient(135deg, #B8860B 0%, #FFD700 100%)',
        glow: 'rgba(255, 215, 0, 0.6)',
        icon: Crown,
        label: t('aiKnowledgeExpert') || 'Esperto',
        description: t('aiKnowledgeExpertShort') || 'Maestro del gioco'
      }
    }
    return configs[levelKey] || configs.beginner
  }

  const currentLevel = getLevelConfig(level)
  const LevelIcon = currentLevel.icon

  if (loading) {
    return (
      <div style={{...styles.card, padding: isMobile ? '16px' : '24px'}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.avatarPulse}>
            <RefreshCw size={24} color="var(--neon-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
              {t('loading')}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: 'rgba(255,255,255,0.8)' }}>
              {t('loadingShort') || 'Loading...'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...styles.card, padding: isMobile ? '16px' : '24px', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#EF4444' }}>
          <AlertCircle size={24} />
          <span style={{ fontSize: '15px' }}>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{...styles.card, padding: isMobile ? '16px' : '24px'}}>
      {/* Animated border glow effect */}
      <div style={{ ...styles.cardGlow, background: currentLevel.gradient }} />
      
      <div style={{position: 'relative', zIndex: 1}}>
        {/* Header row: Title + Avatar */}
        <div style={{...styles.header, marginBottom: isMobile ? '12px' : '16px'}}>
          <div style={styles.titleSection}>
            <h2 style={{...styles.title, fontSize: isMobile ? '18px' : '20px'}}>{t('aiKnowledge')}</h2>
          </div>
          
          {/* Avatar - sempre visibile ma più piccolo su mobile */}
          <div style={{
            ...styles.avatarContainer, 
            width: isMobile ? '40px' : '56px',
            height: isMobile ? '40px' : '56px',
            boxShadow: `0 0 ${isMobile ? '15px' : '30px'} ${currentLevel.glow}`
          }}>
            <div style={{ ...styles.avatarRing, borderColor: currentLevel.color }}>
              <img src="/coach.jpg" alt="AI Coach" style={styles.avatar} />
            </div>
            <div style={{ ...styles.levelDot, background: currentLevel.gradient }} />
          </div>
        </div>

        {/* Score display */}
        <div style={styles.scoreSection}>
          <span style={{...styles.scoreValue, fontSize: isMobile ? '40px' : '48px'}}>{Math.round(animatedScore)}</span>
          <span style={{...styles.scorePercent, fontSize: isMobile ? '20px' : '24px'}}>%</span>
        </div>

        {/* Premium Progress Bar */}
        <div style={{...styles.progressContainer, marginBottom: isMobile ? '12px' : '16px'}}>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${score}%`,
                background: currentLevel.gradient,
                boxShadow: `0 0 20px ${currentLevel.glow}`
              }}
            >
              {/* Shimmer effect */}
              <div style={styles.shimmer} />
            </div>
          </div>
          
          {/* Level markers */}
          <div style={styles.markers}>
            {[25, 50, 75].map((mark) => (
              <div
                key={mark}
                style={{
                  ...styles.marker,
                  left: `${mark}%`,
                  background: score >= mark ? currentLevel.color : 'rgba(255,255,255,0.2)',
                  boxShadow: score >= mark ? `0 0 10px ${currentLevel.glow}` : 'none'
                }}
              />
            ))}
          </div>
        </div>

        {/* Level badge */}
        <div style={{...styles.levelSection, marginBottom: isMobile ? '0' : '16px', gap: isMobile ? '8px' : '12px'}}>
          <div style={{ ...styles.levelBadge, background: `${currentLevel.color}20`, borderColor: currentLevel.color }}>
            <LevelIcon size={isMobile ? 14 : 16} color={currentLevel.color} />
            <span style={{ ...styles.levelText, color: currentLevel.color }}>
              {currentLevel.label}
            </span>
          </div>
          <span style={{...styles.levelDescription, fontSize: isMobile ? '12px' : '13px'}}>{currentLevel.description}</span>
        </div>


      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  card: {
    position: 'relative',
    background: 'rgba(10, 14, 28, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    opacity: 0.8,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: '0',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgeText: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '1.5px',
    color: 'var(--neon-cyan)',
    opacity: 0.8,
  },
  title: {
    margin: 0,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: '-0.5px',
  },
  avatarContainer: {
    position: 'relative',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  },
  avatarPulse: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid',
    padding: '2px',
    transition: 'all 0.3s ease',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  levelDot: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid rgba(10, 14, 28, 0.8)',
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
    marginBottom: '16px',
  },
  scoreValue: {
    fontWeight: '800',
    background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.7) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1,
    letterSpacing: '-2px',
  },
  scorePercent: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  progressContainer: {
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
    animation: 'shimmer 2s infinite',
  },
  markers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  marker: {
    position: 'absolute',
    top: '-2px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    border: '2px solid rgba(10, 14, 28, 0.8)',
    transition: 'all 0.3s ease',
  },
  levelSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  levelBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  levelText: {
    fontWeight: '700',
  },
  levelDescription: {
    color: 'rgba(255,255,255,0.5)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  footerText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.5px',
  },
}
