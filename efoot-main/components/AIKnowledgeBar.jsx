'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { Brain, RefreshCw, AlertCircle } from 'lucide-react'

/**
 * Componente Barra Conoscenza IA
 * 
 * Mostra quanto l'IA conosce l'utente basandosi su:
 * - Profilo, Rosa, Partite, Pattern, Allenatore, Utilizzo, Successi
 * 
 * Stile: Identico a barra profilazione in impostazioni-profilo
 */
export default function AIKnowledgeBar() {
  const { t } = useTranslation()
  const router = useRouter()
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState('beginner')
  const [breakdown, setBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const scoreRef = React.useRef(score)
  const previousScoreRef = React.useRef(score)
  const retryTimeoutRef = React.useRef(null)
  scoreRef.current = score

  useEffect(() => {
    // Solo lato client per evitare hydration mismatch
    if (typeof window === 'undefined') return

    const ac = new AbortController()
    fetchAIKnowledge(ac.signal)

    const doRefresh = (useRefreshParam = false) => {
      previousScoreRef.current = scoreRef.current
      const retryDelays = [1000, 2000, 3000, 5000, 8000]
      let attempt = 0

      const attemptRefresh = async () => {
        if (attempt >= retryDelays.length) return
        if (ac.signal.aborted) return
        attempt++
        try {
          let token = localStorage.getItem('auth_token')
          if (!token && supabase) {
            const { data: session } = await supabase.auth.getSession()
            token = session?.session?.access_token
          }
          
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
          
          // Se lo score è cambiato, aggiorna e ferma retry
          if (ac.signal.aborted) return
          if (Math.abs(newScore - previousScoreRef.current) > 0.01) {
            if (process.env.NODE_ENV !== 'production') console.log(`[AIKnowledgeBar] Score updated: ${previousScoreRef.current} → ${newScore}`)
            setScore(newScore)
            setLevel(data.level || 'beginner')
            setBreakdown(data.breakdown || {})
            return // Successo, ferma retry
          }
          
          // Se score non cambiato, programma prossimo tentativo
          if (process.env.NODE_ENV !== 'production') console.log(`[AIKnowledgeBar] Score unchanged (${newScore}), scheduling next retry...`)
          if (attempt < retryDelays.length) {
            retryTimeoutRef.current = setTimeout(attemptRefresh, retryDelays[attempt])
          }
        } catch (err) {
          if (err?.name === 'AbortError' || ac.signal.aborted) return
          console.error('[AIKnowledgeBar] Retry attempt failed:', err)
          // Continua con prossimo tentativo anche in caso di errore
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

  const fetchAIKnowledge = async (signal) => {
    try {
      setError(null)
      
      let token = localStorage.getItem('auth_token')
      
      if (!token) {
        if (!supabase) {
          setError('Supabase not configured')
          return
        }
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        setLoading(false)
        router.push('/login')
        return
      }
      
      if (signal?.aborted) return
      
      const res = await fetch('/api/ai-knowledge', {
        method: 'GET',
        ...(signal && { signal }),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (signal?.aborted) return
      if (res.status === 401) {
        // Only redirect if NOT using custom auth. If custom auth is present, it might be a temp API issue.
        if (!localStorage.getItem('auth_token')) {
          setLoading(false)
          router.push('/login')
        } else {
          setError(t('sessionExpired') || 'Session check failed')
          setLoading(false)
        }
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

  /** Zero → Hero: gradienti Stripe-style (ciano/arancio) */
  const getBarGradient = (score) => {
    if (score >= 81) return 'linear-gradient(90deg, #00A3CC 0%, #00D9FF 100%)'
    if (score >= 61) return 'linear-gradient(90deg, #0088AA 0%, #00D9FF 100%)'
    if (score >= 31) return 'linear-gradient(90deg, #CC7A00 0%, #FF9500 100%)'
    return 'linear-gradient(90deg, #AA5500 0%, #FF9500 100%)'
  }

  const getLevelText = (level) => {
    switch (level) {
      case 'expert':
        return t('aiKnowledgeExpert') || 'Esperto'
      case 'advanced':
        return t('aiKnowledgeAdvanced') || 'Avanzato'
      case 'intermediate':
        return t('aiKnowledgeIntermediate') || 'Intermedio'
      default:
        return t('aiKnowledgeBeginner') || 'Principiante'
    }
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'rgba(5, 8, 20, 0.8)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={18} color="var(--primary-cyan)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '15px', color: 'rgba(0, 212, 255, 0.7)' }}>
            {t('loadingShort')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: 'rgba(5, 8, 20, 0.8)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-orange)' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '14px' }}>
            {error}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="neon-card" style={{
      marginBottom: '24px',
      padding: '24px'
    }}>
      {/* Header: Immagine Coach e Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Sinistra: Info AI e Testi */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--neon-cyan)', textShadow: '0 0 10px rgba(0,212,255,0.4)', letterSpacing: '0.5px' }}>
              {t('aiKnowledge')}
            </h2>
          </div>
          <span style={{
            display: 'block',
            fontSize: '36px',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #00d4ff, #00a1a6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.5))',
            marginBottom: '4px'
          }}>
            {Math.round(score)}%
          </span>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Powered by Coach AI
          </p>
        </div>

        {/* Destra: Avatar grande Coach */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(0, 212, 255, 0.8)',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.4), inset 0 0 10px rgba(0, 212, 255, 0.3)',
          flexShrink: 0
        }}>
          <img 
            src="/coach.jpg" 
            alt="AI Coach" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      </div>

      {/* Barra Zero → Hero: gradiente Stripe-style */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${t('aiKnowledge')}: ${Math.round(score)}%`}
        style={{
          width: '100%',
          height: '10px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: '5px',
          overflow: 'hidden',
          marginBottom: '14px',
          position: 'relative',
          border: '1px solid rgba(0,212,255,0.2)',
          boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)'
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,161,166,0.8) 0%, rgba(0,212,255,1) 100%)',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '4px',
            position: 'relative',
            animation: 'heroBarFill 1s ease-out',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)'
          }}
        />
      </div>

      <p style={{
        fontSize: '14px',
        color: 'rgba(0, 212, 255, 0.7)',
        margin: 0,
        lineHeight: 1.4
      }}>
        {getLevelText(level)}
      </p>
    </div>
  )
}
