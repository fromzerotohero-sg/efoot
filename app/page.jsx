'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import ConfirmModal from '@/components/ConfirmModal'
import Link from 'next/link'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import CoachFeedbackChat from '@/components/CoachFeedbackChat'
import AssistantChat from '@/components/AssistantChat'
import GameAnalysisModal from '@/components/GameAnalysisModal'
import { useGameAnalysisModalNav, OPEN_GAME_ANALYSIS_MODAL_EVENT, CLOSE_GAME_ANALYSIS_MODAL_EVENT } from '@/components/GameAnalysisModalNavContext'
import TaskWidget from '@/components/TaskWidget'
import MissionCenter from '@/components/MissionCenter'
import OnboardingFlow from '@/components/OnboardingFlow'
import CoachSuggestions from '@/components/CoachSuggestions'
import HeroCoachJourney from '@/components/HeroCoachJourney'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { withAuth } from '@/components/AuthWrapper'
import { 
  Users, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Trash2,
  BookOpen,
  Zap,
  User,
  Calendar,
  Radio,
  Dumbbell
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
        setUserProfile(data.profile)
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
      
      {/* Page Header */}
      <div className="mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="text-2xl font-bold neon-text mb-2">
              {t('dashboard')}
            </h1>
            <p className="text-sm text-[rgba(0, 212, 255, 0.7)]">
              {t('fromZeroToHero')}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              data-tour-id="tour-dashboard-live-coach"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-live-coach'))
                }
              }}
              aria-label={t('liveCoachOpen')}
              title={t('liveCoachTitle')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: '1px solid rgba(255,215,100,0.28)',
                background: 'rgba(255,215,100,0.10)',
                color: '#FFD76A',
                boxShadow: '0 0 16px rgba(255,196,0,0.10)',
                flexShrink: 0
              }}
            >
              <Radio size={18} />
            </button>
            <OnboardingFlow />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <AlertCircle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={handleRetry} className="neon-button" type="button" style={{ marginLeft: 'auto' }}>
            {t('retry')}
          </button>
        </div>
      )}

      {/* AI Knowledge Bar + Informazioni IA */}
      <div data-tour-id="tour-dashboard-ai" className="mb-6">
        <AIKnowledgeBar />
      </div>

      <HeroCoachJourney
        loading={loading}
        stats={stats}
        hasActiveCoach={hasActiveCoach}
        gameAnalysisLastCapture={gameAnalysisLastCapture}
        lang={lang}
        onOpenRoster={() => router.push('/gestione-formazione')}
        onOpenCoachSetup={() => router.push('/nuova-rosa-lab')}
        onOpenGameAnalysis={() => setShowGameAnalysisModal(true)}
        onOpenCardAdvisor={openCardAdvisor}
        onOpenCoachFeedback={() => setShowCoachFeedback(true)}
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

        {/* Dashboard Main Grid - Layout aggiornato: 2 colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Colonna Sinistra */}
          <div className="space-y-6">
            {/* Quick Links / Azioni Rapide */}
            <div data-tour-id="tour-dashboard-nav" className="neon-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
                    <Settings size={20} color="var(--neon-cyan)" />
                    {t('navigation')}
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.62)' }}>
                    {lang === 'en' ? 'Jump straight into the tools that improve your team.' : 'Vai subito negli strumenti che fanno crescere la squadra.'}
                  </p>
                </div>
              </div>

              <div className="dashboard-action-grid">
                {/* Rosa */}
                <button
                  onClick={() => router.push('/gestione-formazione')}
                  className="dashboard-action-card dashboard-action-card--roster"
                >
                  <span className="dashboard-action-icon">
                    <Users size={26} />
                  </span>
                  <span className="dashboard-action-copy">
                    <strong>{lang === 'en' ? 'Squad' : 'Rosa'}</strong>
                    <small>{lang === 'en' ? 'Players, roles and formation' : 'Giocatori, ruoli e formazione'}</small>
                  </span>
                  <ArrowRight size={18} className="dashboard-action-arrow" />
                </button>

                {/* Analisi Carte Nuove */}
                <button
                  onClick={openCardAdvisor}
                  className="dashboard-action-card dashboard-action-card--cards"
                >
                  <span className="dashboard-action-icon">
                    <Zap size={26} />
                  </span>
                  <span className="dashboard-action-copy">
                    <strong>{lang === 'en' ? 'New card analysis' : 'Analisi carte nuove'}</strong>
                    <small>{lang === 'en' ? 'Compare packs with your real roster' : 'Confronta i pack con la tua rosa reale'}</small>
                  </span>
                  <ArrowRight size={18} className="dashboard-action-arrow" />
                </button>

                {/* Palestra Coach */}
                <button
                  onClick={() => setShowCoachFeedback(true)}
                  className="dashboard-action-card dashboard-action-card--coach-gym dashboard-action-card--wide"
                >
                  <span className="dashboard-action-icon">
                    <Dumbbell size={28} />
                  </span>
                  <span className="dashboard-action-copy">
                    <strong>{t('palestraCoachTitle')}</strong>
                    <small>
                      {lang === 'en'
                        ? 'Tell the coach what happened in game and turn it into tactical feedback.'
                        : 'Racconta cosa succede in partita e trasformalo in feedback tattico.'}
                    </small>
                  </span>
                  <span className="dashboard-action-badge">
                    {lang === 'en' ? 'Coach check-in' : 'Check-in coach'}
                  </span>
                </button>

                {/* Analisi Partita Rapida */}
                <button
                  data-tour-id="tour-dashboard-game-analysis"
                  onClick={() => setShowGameAnalysisModal(true)}
                  className="dashboard-action-card dashboard-action-card--stats"
                >
                  <span className="dashboard-action-icon">
                    <BarChart3 size={24} />
                  </span>
                  <span className="dashboard-action-copy">
                    <strong>{t('gameAnalysisTitle')}</strong>
                    <small>{lang === 'en' ? 'Upload game stats' : 'Carica statistiche di gioco'}</small>
                  </span>
                </button>

              </div>
            </div>

            <div data-tour-id="tour-dashboard-task">
              <TaskWidget />
            </div>

            {/* Panoramica Squadra */}
            <div data-tour-id="tour-dashboard-squad" className="neon-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
                <Users size={20} color="var(--neon-cyan)" />
                {t('squadOverview')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(0, 212, 255, 0.7)' }}>{t('titolari')}</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                    {stats.titolari}/11
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(0, 212, 255, 0.7)' }}>{t('riserve')}</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--neon-cyan)' }}>
                    {stats.riserve}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(0, 212, 255, 0.7)' }}>{t('total')}</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF' }}>
                    {stats.totalPlayers}
                  </span>
                </div>
                {stats.formation && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    background: 'rgba(0, 161, 166, 0.08)', 
                    border: '1px solid rgba(0, 212, 255, 0.5)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '13px', color: 'rgba(0, 212, 255, 0.5)', marginBottom: '4px' }}>{t('formation')}</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neon-cyan)' }}>
                      {stats.formation}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonna Destra */}
          <div className="space-y-6">
            <div data-tour-id="tour-dashboard-mission-center">
            <MissionCenter
              recentMatches={recentMatches}
              stats={stats}
              hasActiveCoach={hasActiveCoach}
              gameAnalysisLastCapture={gameAnalysisLastCapture}
              userProfile={userProfile}
              lang={lang}
              t={t}
              onOpenChat={(message) => {
                if (message === '__OPEN_GAME_ANALYSIS__') {
                  setShowGameAnalysisModal(true)
                } else {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open-assistant-chat', { detail: { message } }))
                  }
                }
              }}
            />
            </div>

            {/* Link a Grafici (al posto di Roadmap/AI Insights) */}
            <div className="neon-card" style={{ padding: '24px' }}>
               <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
                <BarChart3 size={20} className="neon-text" />
                <span className="text-gradient">{t('chartsAndComparisonTitle')}</span>
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(0, 212, 255, 0.7)', marginBottom: '24px', lineHeight: '1.6' }}>
                {t('chartsAndComparisonDesc')}
              </p>
              
              <button
                onClick={() => router.push('/grafici-comparazione')}
                className="btn primary"
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px',
                  fontSize: '15px'
                }}
              >
                {t('chartsAndComparisonCtaButton')}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

      {/* Coach Suggestions - AI Proactive Alerts */}
      <CoachSuggestions 
        userProfile={userProfile}
        hasActiveCoach={hasActiveCoach}
        matches={recentMatches}
        gameAnalysisLastCapture={gameAnalysisLastCapture}
        onOpenGameAnalysis={() => setShowGameAnalysisModal(true)}
        onOpenCoachFeedback={() => setShowCoachFeedback(true)}
        onOpenCoaches={() => router.push('/nuova-rosa-lab')}
      />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dashboard-action-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboard-action-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 106px;
          padding: 18px;
          overflow: hidden;
          border: 1px solid rgba(0, 212, 255, 0.16);
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(10, 18, 38, 0.96), rgba(13, 25, 48, 0.86));
          color: #FFFFFF;
          text-align: left;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02), 0 10px 28px rgba(0,0,0,0.22);
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }

        .dashboard-action-card::before {
          content: '';
          position: absolute;
          inset: -40% -20% auto auto;
          width: 160px;
          height: 160px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.16), transparent 68%);
          pointer-events: none;
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .dashboard-action-card:hover {
          transform: translateY(-3px);
          border-color: rgba(0, 212, 255, 0.52);
          box-shadow: 0 0 24px rgba(0, 212, 255, 0.12), 0 16px 34px rgba(0,0,0,0.32);
        }

        .dashboard-action-card:hover::before {
          transform: scale(1.08);
        }

        .dashboard-action-card--wide {
          grid-column: 1 / -1;
          min-height: 118px;
        }

        .dashboard-action-icon {
          position: relative;
          z-index: 1;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: rgba(0, 212, 255, 0.10);
          color: var(--neon-cyan);
          box-shadow: 0 0 18px rgba(0, 212, 255, 0.16);
        }

        .dashboard-action-copy {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .dashboard-action-copy strong {
          font-size: 16px;
          font-weight: 800;
          line-height: 1.2;
        }

        .dashboard-action-copy small {
          font-size: 12px;
          line-height: 1.35;
          color: rgba(255,255,255,0.64);
        }

        .dashboard-action-arrow {
          position: relative;
          z-index: 1;
          margin-left: auto;
          color: rgba(255,255,255,0.66);
        }

        .dashboard-action-badge {
          position: relative;
          z-index: 1;
          margin-left: auto;
          padding: 7px 10px;
          border: 1px solid rgba(0, 212, 255, 0.30);
          border-radius: 999px;
          color: #8ff2ff;
          background: rgba(0, 212, 255, 0.08);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .dashboard-action-card--roster {
          border-color: rgba(0, 212, 255, 0.28);
          background: linear-gradient(135deg, rgba(0, 161, 166, 0.20), rgba(13, 25, 48, 0.92));
        }

        .dashboard-action-card--cards {
          border-color: rgba(255, 203, 5, 0.34);
          background: linear-gradient(135deg, rgba(255, 203, 5, 0.16), rgba(13, 25, 48, 0.92));
        }

        .dashboard-action-card--cards::before {
          background: radial-gradient(circle, rgba(255, 203, 5, 0.22), transparent 68%);
        }

        .dashboard-action-card--cards .dashboard-action-icon {
          color: #ffcb05;
          background: rgba(255, 203, 5, 0.12);
          box-shadow: 0 0 20px rgba(255, 203, 5, 0.18);
        }

        .dashboard-action-card--coach-gym {
          border-color: rgba(0, 212, 255, 0.38);
          background:
            linear-gradient(135deg, rgba(0, 212, 255, 0.16), rgba(79, 70, 229, 0.12)),
            rgba(13, 25, 48, 0.94);
        }

        .dashboard-action-card--coach-gym .dashboard-action-icon {
          color: #67e8f9;
          background: rgba(0, 212, 255, 0.14);
        }

        .dashboard-action-card--stats .dashboard-action-icon {
          color: #a855f7;
          background: rgba(168, 85, 247, 0.12);
          box-shadow: 0 0 18px rgba(168, 85, 247, 0.18);
        }

        @media (max-width: 640px) {
          .dashboard-action-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-action-card {
            min-height: 96px;
            padding: 16px;
          }

          .dashboard-action-card--wide {
            min-height: 112px;
          }

          .dashboard-action-badge {
            display: none;
          }

        }
      `}</style>
    </main>
  )
}

export default withAuth(HomePage)
