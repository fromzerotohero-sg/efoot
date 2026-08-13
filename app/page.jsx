'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import ConfirmModal from '@/components/ConfirmModal'
import CoachFeedbackChat from '@/components/CoachFeedbackChat'
import GameAnalysisModal from '@/components/GameAnalysisModal'
import { useGameAnalysisModalNav, OPEN_GAME_ANALYSIS_MODAL_EVENT, CLOSE_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
import TaskWidget from '@/components/TaskWidget'
import OnboardingFlow from '@/components/OnboardingFlow'
import CoachHomeV2 from '@/components/CoachHomeV2'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { fetchCoachProfileFromApi, resolveAuthToken, buildAuthHeaders } from '@/lib/profileUxHelpers'
import { withAuth } from '@/components/AuthWrapper'
import {
  RefreshCw,
  AlertCircle
} from 'lucide-react'

/** Legge query URL: openCoach=1 → Palestra Coach; openAssistantChat=1 → chat principale; openGameAnalysis=1 → GameAnalysisModal; openCardAdvisor=1 → Card Advisor Lab. */
function OpenCoachListener({ onOpenCoach, onOpenAssistantChat, onOpenGameAnalysis, onOpenCardAdvisor }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  // useLayoutEffect: apre modal prima del paint così non si vede la dashboard “vuota” un frame
  React.useLayoutEffect(() => {
    if (searchParams?.get('openGameAnalysis') === '1') {
      onOpenGameAnalysis?.()
      router.replace('/', { scroll: false })
      return
    }
    if (searchParams?.get('openCardAdvisor') === '1') {
      onOpenCardAdvisor?.()
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
  }, [searchParams, onOpenCoach, onOpenAssistantChat, onOpenGameAnalysis, onOpenCardAdvisor, router])
  return null
}

function HomePage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const { setIsOpen: setGameAnalysisNavOpen } = useGameAnalysisModalNav()
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
  const [recentMatches, setRecentMatches] = React.useState([])
  const [matchesExpanded, setMatchesExpanded] = React.useState(false)
  const [deletingMatchId, setDeletingMatchId] = React.useState(null)
  const [editingOpponentId, setEditingOpponentId] = React.useState(null)
  const [editingOpponentName, setEditingOpponentName] = React.useState('')
  const [savingOpponentName, setSavingOpponentName] = React.useState(false)
  const [tacticalPatterns, setTacticalPatterns] = React.useState(null) // Pattern tattici per AI Insights
  const [showCoachFeedback, setShowCoachFeedback] = React.useState(false)
  const [showGameAnalysisModal, setShowGameAnalysisModal] = React.useState(false)
  const [gameAnalysisLastCapture, setGameAnalysisLastCapture] = React.useState(null)
  const [hasActiveCoach, setHasActiveCoach] = React.useState(false)
  const [userProfile, setUserProfile] = React.useState(null)
  const [confirmModal, setConfirmModal] = React.useState(null) // { show, title, message, onConfirm, onCancel }
  const [coachChatInitialMessage, setCoachChatInitialMessage] = React.useState(null)

  React.useEffect(() => {
    setGameAnalysisNavOpen(showGameAnalysisModal)
  }, [showGameAnalysisModal, setGameAnalysisNavOpen])

  React.useEffect(() => {
    return () => setGameAnalysisNavOpen(false)
  }, [setGameAnalysisNavOpen])

  // Bottom nav su /: apre analisi senza Link → ?openGameAnalysis (niente doppia navigazione)
  React.useEffect(() => {
    const onOpen = () => setShowGameAnalysisModal(true)
    if (typeof window !== 'undefined') {
      window.addEventListener(OPEN_GAME_ANALYSIS_MODAL_EVENT, onOpen)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(OPEN_GAME_ANALYSIS_MODAL_EVENT, onOpen)
      }
    }
  }, [])

  // Bottom nav: tap Dashboard con modal analisi aperto (stesso `/` → Link non chiude il modal da solo)
  React.useEffect(() => {
    const onClose = () => {
      setShowGameAnalysisModal(false)
      router.replace('/', { scroll: false })
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(CLOSE_GAME_ANALYSIS_MODAL_EVENT, onClose)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(CLOSE_GAME_ANALYSIS_MODAL_EVENT, onClose)
      }
    }
  }, [router])

  const openCardAdvisor = React.useCallback(() => {
    router.push('/card-advisor-lab')
  }, [router])

  // UX V2: "Chiedi a Hero" apre sempre il motore assistant reale (mai la Palestra).
  // Una domanda normale → open-assistant-chat. Il feedback post-match resta su CoachFeedbackChat.
  const handleAskHero = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-assistant-chat'))
    }
  }, [])

  // Live Coach resta modalita speciale: solo evento esistente, nessuna modifica a session/billing.
  const handleOpenLiveCoach = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-live-coach'))
    }
  }, [])

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
        
        setRecentMatches(data.matches || [])
        setTacticalPatterns(data.patterns || null)
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
      if (data.captured_at) {
        const d = new Date(data.captured_at)
        setGameAnalysisLastCapture(isNaN(d.getTime()) ? data.captured_at : d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short', year: 'numeric' }))
      } else {
        setGameAnalysisLastCapture(null)
      }
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

  const handleDeleteMatch = async (matchId, e) => {
    e.stopPropagation() // Previeni click sul card
    
    setConfirmModal({
      show: true,
      title: t('confirm'),
      message: t('confirmDeleteMatch'),
      onConfirm: async () => {
        setConfirmModal(null)
        setDeletingMatchId(matchId)
        setError(null)
    
        try {
          let token = localStorage.getItem('auth_token')
          
          if (!token && supabase) {
            const { data: session } = await supabase.auth.getSession()
            token = session?.session?.access_token
          }
    
          if (!token) {
            throw new Error(t('sessionExpired'))
          }
    
          const res = await fetch(`/api/supabase/delete-match?match_id=${matchId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
    
          const data = await safeJsonResponse(res, t('deleteMatchError'))
    
          // Rimuovi match dalla lista
          setRecentMatches(prev => prev.filter(m => m.id !== matchId))
    
          // Aggiorna riassunto analisi (diagnostic) per la chat
          try {
            await fetch('/api/refresh-diagnostic', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            })
          } catch (_) { /* non bloccare UI */ }
        } catch (err) {
          console.error('[Dashboard] Delete match error:', err)
          setError(err.message || t('deleteMatchError'))
        } finally {
          setDeletingMatchId(null)
        }
      },
      onCancel: () => setConfirmModal(null)
    })
  }

  const handleSaveOpponentName = async (matchId, e) => {
    e.stopPropagation() // Evita click sulla card

    if (!editingOpponentName.trim()) {
      setEditingOpponentId(null)
      return
    }

    setSavingOpponentName(true)
    setError(null)
    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('sessionExpired'))
      }

      const updateRes = await fetch(`/api/supabase/update-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: matchId,
          opponent_name: editingOpponentName.trim()
        })
      })

      const errorData = await updateRes.json().catch(() => ({}))
      if (!updateRes.ok) {
        throw new Error(errorData.error || t('updateMatchError'))
      }

      setRecentMatches(prev => prev.map(m =>
        m.id === matchId
          ? { ...m, opponent_name: editingOpponentName.trim() }
          : m
      ))
      setEditingOpponentId(null)
      setEditingOpponentName('')

      // Aggiorna riassunto analisi (diagnostic) per la chat
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare UI */ }
    } catch (err) {
      console.error('[Dashboard] Error saving opponent name:', err)
      setError(err.message || t('updateMatchError'))
    } finally {
      setSavingOpponentName(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={40} color="var(--primary-cyan)" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: 'rgba(0, 212, 255, 0.7)' }}>{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="neon-card" style={{ maxWidth: '480px', textAlign: 'center', padding: '32px' }}>
          <AlertCircle size={40} color="var(--primary-orange)" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>{t('error')}</h2>
          <p style={{ marginBottom: '24px', color: 'rgba(0, 212, 255, 0.7)' }}>{error}</p>
          <button onClick={() => setRetryTrigger(t => t + 1)} className="btn primary">
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <main data-tour-id="tour-dashboard-intro" className="p-6 max-w-7xl mx-auto">
      <Suspense fallback={null}>
        <OpenCoachListener
          onOpenCoach={() => setShowCoachFeedback(true)}
          onOpenAssistantChat={() => {
            if (typeof window !== 'undefined') {
              const msg = t('chartsAndComparisonAskCoachContext')
              window.dispatchEvent(new CustomEvent('open-assistant-chat', { detail: { message: msg } }))
            }
          }}
          onOpenGameAnalysis={() => setShowGameAnalysisModal(true)}
          onOpenCardAdvisor={openCardAdvisor}
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

      {/* UX V2 — Hero Coach Home: facade presentazionale sopra dati/handler reali esistenti.
          BYPASS UX: HeroCoachJourney, MissionCenter e CoachSuggestions non sono piu renderizzati
          (i file restano intatti); un solo concetto visibile: Prossima azione. */}
      <CoachHomeV2
        lang={lang}
        stats={stats}
        hasActiveCoach={hasActiveCoach}
        recentMatches={recentMatches}
        gameAnalysisLastCapture={gameAnalysisLastCapture}
        hpBalance={hpBalance}
        onAskHero={handleAskHero}
        onOpenFeedback={() => setShowCoachFeedback(true)}
        onOpenGameAnalysis={() => setShowGameAnalysisModal(true)}
        onOpenCardAdvisor={openCardAdvisor}
        onOpenLiveCoach={handleOpenLiveCoach}
        onOpenRoster={() => router.push('/gestione-formazione')}
        onOpenCoachSetup={() => router.push('/nuova-rosa-lab')}
        onOpenCountermeasures={() => router.push('/contromisure-pre-partita')}
        onOpenProgress={() => router.push('/grafici-comparazione')}
        onOpenMatches={() => router.push('/match')}
        onGetHp={() => router.push('/gestione-profilo')}
        toolsExtra={<OnboardingFlow />}
      />

      <CoachFeedbackChat 
        show={showCoachFeedback} 
        onClose={() => {
          setShowCoachFeedback(false)
          setCoachChatInitialMessage(null)
        }} 
        userProfile={userProfile} 
        lastMatch={recentMatches?.[0] || null}
        initialMessage={coachChatInitialMessage}
      />

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel || t('delete')}
          cancelLabel={confirmModal.cancelLabel || t('cancel')}
          variant={confirmModal.variant || 'danger'}
          confirmVariant={confirmModal.confirmVariant || 'danger'}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
      <GameAnalysisModal 
        show={showGameAnalysisModal} 
        onClose={() => {
          setShowGameAnalysisModal(false)
          router.replace('/', { scroll: false })
        }} 
        onSuccess={fetchGameAnalysisCapture} 
        lastCaptureDate={gameAnalysisLastCapture} 
      />

      {/* UX V2 transitional side-effect bridge.
          Do not remove until /api/tasks/list generation/progress side effects
          are moved intentionally to the new Coach orchestration.
          TaskWidget resta montato (fetch /api/tasks/list + listener match-saved /
          diagnostic-updated) ma non e piu una card concorrente visibile. */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <TaskWidget />
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

export default withAuth(HomePage)
