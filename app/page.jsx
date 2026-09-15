'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import HeroChat from '@/components/hero-chat/HeroChat'
import { fetchCoachProfileFromApi, resolveAuthToken, buildAuthHeaders } from '@/lib/profileUxHelpers'
import { withAuth } from '@/components/AuthWrapper'
import {
  AlertCircle
} from 'lucide-react'
import PageLoading from '@/components/PageLoading'

/** Tutti i deep link Coach aprono un workflow dentro Hero; openGameAnalysis resta solo come alias legacy. */
function OpenCoachListener({ onOpenCoach, onOpenAssistantChat, onOpenStatsUpload, onOpenCardAdvisor, onOpenCountermeasures }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  React.useLayoutEffect(() => {
    if (searchParams?.get('openStatsUpload') === '1' || searchParams?.get('openGameAnalysis') === '1') {
      onOpenStatsUpload?.()
      router.replace('/', { scroll: false })
      return
    }
    if (searchParams?.get('openCardAdvisor') === '1') {
      onOpenCardAdvisor?.()
      return
    }
    if (searchParams?.get('openCountermeasures') === '1') {
      onOpenCountermeasures?.()
      router.replace('/', { scroll: false })
      return
    }
    if (searchParams?.get('openAssistantChat') === '1') {
      onOpenAssistantChat?.()
      router.replace('/', { scroll: false })
      return
    }
    if (searchParams?.get('openCoach') === '1') {
      onOpenCoach()
      router.replace('/', { scroll: false })
    }
  }, [searchParams, onOpenCoach, onOpenAssistantChat, onOpenStatsUpload, onOpenCardAdvisor, onOpenCountermeasures, router])
  return null
}

function HomePage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const mountedRef = React.useRef(true)
  const [retryTrigger, setRetryTrigger] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [stats, setStats] = React.useState({
    totalPlayers: 0,
    titolari: 0,
    riserve: 0,
    formation: null
  })
  const [starters, setStarters] = React.useState([])
  const [slotPositions, setSlotPositions] = React.useState(null)
  const [formationVariants, setFormationVariants] = React.useState([])
  const [recentMatches, setRecentMatches] = React.useState([])
  const [gameAnalysisLastCapture, setGameAnalysisLastCapture] = React.useState(null)
  const [statsUploadRequest, setStatsUploadRequest] = React.useState(0)
  const [hasActiveCoach, setHasActiveCoach] = React.useState(false)
  const [userProfile, setUserProfile] = React.useState(null)

  const openCardAdvisor = React.useCallback(() => {
    router.push('/card-advisor-lab')
  }, [router])


  React.useEffect(() => {
    const onOpen = () => {
      openCardAdvisor()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('open-card-advisor-entry', onOpen)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-card-advisor-entry', onOpen)
      }
    }
  }, [openCardAdvisor])

  React.useEffect(() => {
    mountedRef.current = true
    
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)
      try {
        let token = localStorage.getItem('auth_token')
        
        // If no custom token, try Supabase session
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }

        if (!token) {
          setLoading(false)
          router.push('/login')
          return
        }

        const res = await fetch(`/api/dashboard?t=${new Date().getTime()}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        })
        
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('metalgate_user')
            router.push('/login')
            return
          }
          throw new Error('Failed to fetch dashboard data')
        }
        
        const data = await res.json()
        
        const playersArray = (data.players || []).filter(p => p && p.id && p.player_name)
        const titolari = playersArray.filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
        const riserve = playersArray.filter(p => p.slot_index === null)

        setStats({
          totalPlayers: playersArray.length,
          titolari: titolari.length,
          riserve: riserve.length,
          formation: data.layout?.formation || null
        })
        setStarters(
          titolari.map((p) => ({
            id: p.id,
            player_name: p.player_name,
            position: p.position,
            slot_index: Number(p.slot_index)
          }))
        )
        setSlotPositions(data.layout?.slot_positions || null)
        setFormationVariants(Array.isArray(data.formationVariants) ? data.formationVariants : [])
        
        setRecentMatches(data.matches || [])
        setHasActiveCoach(data.hasActiveCoach)
        const coachProfile = await fetchCoachProfileFromApi(token)
        setUserProfile(coachProfile ? { ...(data.profile || {}), ...coachProfile } : data.profile)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
        setError(t('coachDataLoadError'))
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setLoading((prev) => {
          if (prev) setError(t('coachDataLoadError'))
          return false
        })
      }
    }, 30000)
    
    fetchDashboardData().finally(() => clearTimeout(timeoutId))

    // Subscription for Supabase auth changes
    const { data: { subscription } } = supabase ? supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only redirect if no custom auth is present
        const metalgateUser = localStorage.getItem('metalgate_user')
        const authToken = localStorage.getItem('auth_token')
        
        if (metalgateUser && authToken) {
          // Ignore Supabase auth events if using custom auth
          return
        }

        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          router.push('/login')
        }
      }
    ) : { data: { subscription: null } }

    return () => {
      mountedRef.current = false
      clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [retryTrigger])

  const handleRetry = React.useCallback(() => {
    setError(null)
    setLoading(true)
    setRetryTrigger((n) => n + 1)
  }, [])

  const fetchGameAnalysisCapture = React.useCallback(async () => {
    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) return

      const res = await fetch(`/api/extract-game-analysis?t=${new Date().getTime()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) return

      const data = await res.json().catch(() => ({}))
      setGameAnalysisLastCapture(data.captured_at || null)
    } catch (_) {
      setGameAnalysisLastCapture(null)
    }
  }, [lang])

  React.useEffect(() => {
    if (!loading && supabase) fetchGameAnalysisCapture()
  }, [loading, supabase, fetchGameAnalysisCapture])

  React.useEffect(() => {
    const onCoachProfileUpdated = (event) => {
      const detail = event?.detail
      if (!detail || typeof detail !== 'object') return
      setUserProfile((prev) => ({ ...(prev || {}), ...detail }))
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('coach-profile-updated', onCoachProfileUpdated)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('coach-profile-updated', onCoachProfileUpdated)
      }
    }
  }, [])

  // UX V2 — LOW HP: lettura saldo reale tramite contratto esistente (/api/credits/usage,
  // stesso endpoint usato da CreditsBar). Se il saldo non e disponibile NON si presume LOW HP.
  // Nessuna modifica a creditService, costi, wallet o MetalGate.
  const [hpBalance, setHpBalance] = React.useState(null)

  React.useEffect(() => {
    if (loading) return undefined
    let cancelled = false

    const fetchHpBalance = async () => {
      try {
        const token = await resolveAuthToken()
        if (!token || cancelled) return
        const res = await fetch('/api/credits/usage', {
          method: 'POST',
          headers: buildAuthHeaders(token, { json: true }),
          body: JSON.stringify({}),
          cache: 'no-store'
        })
        if (!res.ok || cancelled) return
        const data = await res.json().catch(() => null)
        if (!data || cancelled) return
        const balance = Number(data.balance_remaining)
        setHpBalance(Number.isFinite(balance) ? balance : null)
      } catch {
        /* saldo non disponibile: niente stato LOW HP */
      }
    }

    fetchHpBalance()
    window.addEventListener('credits-consumed', fetchHpBalance)
    window.addEventListener('credits-accredited', fetchHpBalance)
    return () => {
      cancelled = true
      window.removeEventListener('credits-consumed', fetchHpBalance)
      window.removeEventListener('credits-accredited', fetchHpBalance)
    }
  }, [loading])

  if (loading) {
    return <PageLoading />
  }

  if (error) {
    return (
      <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="neon-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '32px' }}>
          <AlertCircle size={40} color="var(--primary-orange)" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 600, color: 'var(--text-main)' }}>{t('error')}</h2>
          <p style={{ marginBottom: '24px', color: 'var(--text-dim)' }}>{error}</p>
          <button onClick={() => setRetryTrigger(t => t + 1)} className="btn primary">
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={null}>
        <OpenCoachListener
          onOpenCoach={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-coach-feedback'))
            }
          }}
          onOpenAssistantChat={() => {
            if (typeof window !== 'undefined') {
              const msg = t('chartsAndComparisonAskCoachContext')
              window.dispatchEvent(new CustomEvent('open-assistant-chat', { detail: { message: msg } }))
            }
          }}
          onOpenStatsUpload={() => setStatsUploadRequest((value) => value + 1)}
          onOpenCardAdvisor={openCardAdvisor}
          onOpenCountermeasures={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-countermeasures'))
            }
          }}
        />
      </Suspense>
      
      {/* Errori azioni secondarie (delete/update match ecc.): stato parziale, non blocca la Home */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <AlertCircle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={handleRetry} className="neon-button" type="button" style={{ marginLeft: 'auto' }}>
            {t('retry')}
          </button>
        </div>
      )}

      {/* Hero è la superficie principale; motori e card usano soltanto dati reali. */}
      <HeroChat
        lang={lang}
        userProfile={userProfile}
        stats={stats}
        starters={starters}
        slotPositions={slotPositions}
        formationVariants={formationVariants}
        formation={stats.formation}
        hasActiveCoach={hasActiveCoach}
        recentMatches={recentMatches}
        gameAnalysisLastCapture={gameAnalysisLastCapture}
        statsUploadRequest={statsUploadRequest}
        hpBalance={hpBalance}
        onStatsSuccess={fetchGameAnalysisCapture}
      />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default withAuth(HomePage)
