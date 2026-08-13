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
export default function AIKnowledgeBar({ variant = 'card', compact = false } = {}) {
  const { t, lang } = useTranslation()
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

  const requestAIKnowledge = async (signal, forceRefresh = false) => {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const sessionToken = sessionData?.session?.access_token || null
    const sessionUserId = sessionData?.session?.user?.id || null
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

    const candidates = []
    if (sessionToken) candidates.push({ source: 'supabase_session', token: sessionToken })
    if (localToken && localToken !== sessionToken) candidates.push({ source: 'local_storage', token: localToken })

    if (candidates.length === 0) {
      return { unauthenticated: true }
    }

    const url = forceRefresh ? '/api/ai-knowledge?refresh=1' : '/api/ai-knowledge'
    let hadUnauthorized = false
    let lastError = null

    for (const candidate of candidates) {
      const res = await fetch(url, {
        method: 'GET',
        ...(signal && { signal }),
        headers: {
          'Authorization': `Bearer ${candidate.token}`,
          'Content-Type': 'application/json'
        }
      })

      if (res.status === 401) {
        hadUnauthorized = true
        continue
      }

      if (!res.ok) {
        lastError = new Error(`AI knowledge request failed (${res.status})`)
        continue
      }

      const resolvedUserId = res.headers.get('x-resolved-user-id')
      // Se usiamo la sessione Supabase corrente e l'API risolve un user differente,
      // scartiamo la risposta per evitare mostrare score di un account sbagliato.
      if (candidate.source === 'supabase_session' && sessionUserId && resolvedUserId && resolvedUserId !== sessionUserId) {
        continue
      }

      const data = await safeJsonResponse(res, 'Failed to fetch AI knowledge')
      return { data }
    }

    if (hadUnauthorized) return { unauthorized: true }
    if (lastError) throw lastError
    return { unauthorized: true }
  }

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
          const result = await requestAIKnowledge(ac.signal, useRefreshParam)
          if (ac.signal.aborted) return
          if (!result?.data) return
          const data = result.data
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

    const onMatchSaved = () => doRefresh(true)
    const onKnowledgeRefresh = () => doRefresh(true)

    window.addEventListener('match-saved', onMatchSaved)
    window.addEventListener('knowledge-should-refresh', onKnowledgeRefresh)

    const interval = setInterval(() => { fetchAIKnowledge(ac.signal, true) }, 1 * 60 * 1000)

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

      const result = await requestAIKnowledge(signal, forceRefresh)
      if (signal?.aborted) return

      if (result?.unauthenticated) {
        setLoading(false)
        router.push('/login')
        return
      }

      if (result?.unauthorized || !result?.data) {
        setLoading(false)
        router.push('/login')
        return
      }

      const data = result.data
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

  // UX V2 — variante "gauge": STESSI fetch, score, livello e animazione della card.
  // Cambia solo la presentazione (indicatore circolare, reference visiva Home Coach).
  // Formula, pesi, endpoint e Knowledge calculation restano invariati.
  if (variant === 'gauge') {
    const gaugeSize = compact ? 72 : 132
    const gaugeRadius = compact ? 28 : 52
    const gaugeCircumference = 2 * Math.PI * gaugeRadius
    const gaugeProgress = Math.max(0, Math.min(100, Math.round(animatedScore)))
    const gaugeOffset = gaugeCircumference * (1 - gaugeProgress / 100)
    const center = gaugeSize / 2

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '6px' : '10px', padding: '4px 0' }}>
        <div style={{ position: 'relative', width: gaugeSize, height: gaugeSize }}>
          <svg
            width={gaugeSize}
            height={gaugeSize}
            viewBox={`0 0 ${gaugeSize} ${gaugeSize}`}
            role="img"
            aria-label={`${gaugeProgress}%`}
          >
            <defs>
              <linearGradient id="ai-knowledge-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#26d9ff" />
                <stop offset="100%" stopColor="#35e38a" />
              </linearGradient>
            </defs>
            <circle
              cx={center}
              cy={center}
              r={gaugeRadius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={compact ? 7 : 10}
            />
            <circle
              cx={center}
              cy={center}
              r={gaugeRadius}
              fill="none"
              stroke="url(#ai-knowledge-gauge-gradient)"
              strokeWidth={compact ? 7 : 10}
              strokeLinecap="round"
              strokeDasharray={gaugeCircumference}
              strokeDashoffset={gaugeOffset}
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px'
            }}
          >
            <span style={{ fontSize: compact ? '16px' : '26px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
              {gaugeProgress}%
            </span>
            {!compact ? (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: currentLevel.color
              }}
            >
              {currentLevel.label}
            </span>
            ) : null}
          </div>
        </div>
        {!compact ? (
        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
          {lang === 'en' ? 'Knowledge level' : 'Livello conoscenza'}
        </span>
        ) : null}
      </div>
    )
  }

  return (
    <div style={{...styles.card, padding: isMobile ? '16px' : '22px'}}>
      {/* Animated border glow effect */}
      <div style={{ ...styles.cardGlow, background: currentLevel.gradient }} />
      <div style={{ ...styles.brandAura, background: `radial-gradient(circle, ${currentLevel.glow} 0%, transparent 68%)` }} />
      
      <div style={{position: 'relative', zIndex: 1}}>
        {/* Header row: Title + brand mark */}
        <div style={{...styles.header, marginBottom: isMobile ? '14px' : '18px'}}>
          <div style={styles.titleSection}>
            <div style={{ ...styles.badgeRow, color: currentLevel.color, borderColor: `${currentLevel.color}55`, background: `${currentLevel.color}14` }}>
              <LevelIcon size={13} />
              <span style={styles.badgeText}>HERO INTELLIGENCE</span>
            </div>
            <h2 style={{...styles.title, fontSize: isMobile ? '18px' : '20px'}}>{t('aiKnowledge')}</h2>
            <p style={styles.subtitle}>
              {isMobile
                ? (lang === 'en' ? 'More data means sharper coaching.' : 'Più dati carichi, più il coach diventa preciso.')
                : (lang === 'en'
                    ? 'Measures how well Hero knows your profile, roster and matches for sharper advice.'
                    : 'Misura quanto Hero conosce profilo, rosa e partite per darti consigli più precisi.')}
            </p>
          </div>
          
          {/* Brand mark: sostituisce il vecchio omino con il logo Hero */}
          <div style={{
            ...styles.avatarContainer,
            width: isMobile ? '52px' : '64px',
            height: isMobile ? '52px' : '64px',
            boxShadow: `0 0 ${isMobile ? '18px' : '34px'} ${currentLevel.glow}`
          }}>
            <div style={{ ...styles.avatarRing, borderColor: currentLevel.color }}>
              <img src="/logo.png" alt="Hero" style={styles.avatar} />
            </div>
            <div style={{ ...styles.levelDot, background: currentLevel.gradient }} />
          </div>
        </div>

        {/* Score display */}
        <div style={styles.scoreRow}>
          <div style={styles.scoreSection}>
            <span style={{...styles.scoreValue, fontSize: isMobile ? '42px' : '50px'}}>{Math.round(animatedScore)}</span>
            <span style={{...styles.scorePercent, fontSize: isMobile ? '18px' : '22px'}}>%</span>
          </div>
          <span style={{ ...styles.scoreLabel, borderColor: `${currentLevel.color}42`, color: currentLevel.color }}>
            {score < 65
              ? (lang === 'en' ? 'Growing' : 'In crescita')
              : score < 85
                ? (lang === 'en' ? 'Almost complete' : 'Quasi completo')
                : (lang === 'en' ? 'Match ready' : 'Pronto partita')}
          </span>
        </div>

        {/* Premium Progress Bar */}
        <div style={{...styles.progressContainer, marginBottom: isMobile ? '14px' : '18px'}}>
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
        <div style={{...styles.levelSection, marginBottom: 0, gap: isMobile ? '8px' : '12px'}}>
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
    background: 'linear-gradient(145deg, rgba(6, 12, 30, 0.92), rgba(13, 18, 43, 0.86))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(0, 212, 255, 0.28)',
    overflow: 'hidden',
    marginBottom: '18px',
    boxShadow: '0 24px 70px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    opacity: 0.8,
  },
  brandAura: {
    position: 'absolute',
    width: '180px',
    height: '180px',
    right: '-70px',
    top: '-76px',
    opacity: 0.46,
    filter: 'blur(4px)',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'nowrap',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: '0',
  },
  badgeRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    width: 'fit-content',
    padding: '6px 10px',
    border: '1px solid',
    borderRadius: '999px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
  },
  badgeText: {
    fontSize: '10px',
    fontWeight: '900',
    letterSpacing: '1.2px',
    color: 'currentColor',
  },
  title: {
    margin: 0,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: 0,
    maxWidth: '420px',
    color: 'rgba(255,255,255,0.66)',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  avatarContainer: {
    position: 'relative',
    borderRadius: '22px',
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
    borderRadius: '22px',
    border: '2px solid',
    padding: '5px',
    background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.22), rgba(0, 212, 255, 0.08) 38%, rgba(5, 8, 20, 0.72) 100%)',
    transition: 'all 0.3s ease',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: '17px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.55))',
  },
  levelDot: {
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    border: '2px solid rgba(10, 14, 28, 0.8)',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '14px',
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
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
  scoreLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '30px',
    padding: '6px 10px',
    border: '1px solid',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.045)',
    fontSize: '12px',
    fontWeight: '800',
    whiteSpace: 'nowrap',
  },
  progressContainer: {
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: '9px',
    backgroundColor: 'rgba(2, 6, 18, 0.74)',
    borderRadius: '999px',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.45)',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
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
    padding: '7px 12px',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '800',
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
