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
import { safeJsonResponse } from '@/lib/fetchHelper'
import { withAuth } from '@/components/AuthWrapper'
import { 
  Users, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Settings,
  BarChart3,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Shield,
  FileImage,
  BookOpen,
  Zap,
  User,
  Brain,
  Calendar,
  Radio,
  Dumbbell
} from 'lucide-react'

/** Legge query URL: openCoach=1 → Palestra Coach; openAssistantChat=1 → chat principale (Assistant) con messaggio grafici; openGameAnalysis=1 → GameAnalysisModal. */
function OpenCoachListener({ onOpenCoach, onOpenAssistantChat, onOpenGameAnalysis }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  // useLayoutEffect: apre modal prima del paint così non si vede la dashboard “vuota” un frame
  React.useLayoutEffect(() => {
    if (searchParams?.get('openGameAnalysis') === '1') {
      onOpenGameAnalysis?.()
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
  }, [searchParams, onOpenCoach, onOpenAssistantChat, onOpenGameAnalysis, router])
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
  const [reminderRotationIndex, setReminderRotationIndex] = React.useState(0)
  const [hideSetupBanner, setHideSetupBanner] = React.useState(false)
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

  // Banner setup: sempre visibile quando non in loading. Se manca qualcosa: link a rotazione; altrimenti "Setup completo"
  const hasMissingSetup = hasActiveCoach === false || !gameAnalysisLastCapture || stats.titolari < 11
  const showSetupBanner = !loading && !hideSetupBanner
  const setupBannerStorageKey = 'dashboard_setup_banner_hidden_v1'
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const hidden = localStorage.getItem(setupBannerStorageKey) === '1'
      setHideSetupBanner(hidden)
    } catch {
      setHideSetupBanner(false)
    }
  }, [])

  const dismissSetupBanner = React.useCallback(() => {
    setHideSetupBanner(true)
    try {
      localStorage.setItem(setupBannerStorageKey, '1')
    } catch {}
  }, [])

  const bannerTips = React.useMemo(() => {
    const tips = [
      {
        key: 'stats_refresh',
        label: gameAnalysisLastCapture ? t('setupTipStatsRefresh') : t('setupReminderMissingStats'),
        onClick: () => setShowGameAnalysisModal(true),
        isMissing: !gameAnalysisLastCapture
      },
      {
        key: 'coach_gym',
        label: t('setupTipCoachGymCheckin'),
        onClick: () => setShowCoachFeedback(true),
        isMissing: false
      },
      {
        key: 'coach_status',
        label: hasActiveCoach ? t('setupTipCoachReview') : t('setupReminderMissingCoach'),
        onClick: () => router.push('/allenatori'),
        isMissing: !hasActiveCoach
      },
      {
        key: 'roster_review',
        label: stats.titolari < 11 ? t('setupReminderMissingRoster') : t('setupTipRosterReview'),
        onClick: () => router.push('/gestione-formazione'),
        isMissing: stats.titolari < 11
      }
    ]
    return tips
  }, [gameAnalysisLastCapture, hasActiveCoach, stats.titolari, t, router])

  React.useEffect(() => {
    if (!showSetupBanner) return
    const interval = setInterval(() => {
      setReminderRotationIndex((i) => i + 1)
    }, 10000)
    return () => clearInterval(interval)
  }, [showSetupBanner])

  // Reset indice quando cambiano gli elementi mancanti
  const reminderItems = bannerTips.filter(item => item.isMissing)
  const missingCount = reminderItems.length
  // Notifica setup: priorità (rosso = alta, giallo = media, verde = completo). Non invasiva, icona responsive, messaggio = importanza di completare.
  const setupStatus = missingCount >= 2 ? 'critical' : missingCount === 1 ? 'partial' : 'complete'
  const setupStatusConfig = {
    critical: { color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)', border: 'rgba(255, 59, 48, 0.3)', icon: AlertCircle, labelKey: 'setupStatusCritical', iconOpacity: 1 },
    partial: { color: '#FF9500', bg: 'rgba(255, 149, 0, 0.1)', border: 'rgba(255, 149, 0, 0.3)', icon: AlertCircle, labelKey: 'setupStatusPartial', iconOpacity: 1 },
    complete: { color: '#34C759', bg: 'rgba(52, 199, 89, 0.1)', border: 'rgba(52, 199, 89, 0.3)', icon: CheckCircle2, labelKey: 'setupStatusComplete', iconOpacity: 1 }
  }
  const statusCfg = setupStatusConfig[setupStatus]
  React.useEffect(() => {
    setReminderRotationIndex(0)
  }, [missingCount])

  const currentBannerTip = bannerTips.length > 0
    ? bannerTips[((reminderRotationIndex * 7) + 3) % bannerTips.length]
    : null

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

      {/* Banner setup: visibile in UX, icona priorità (rosso/giallo/verde), comunica importanza di completare. */}
      {showSetupBanner && (
        <div
          data-tour-id="tour-dashboard-setup-banner"
          id="setup-status-banner"
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            background: statusCfg.bg,
            border: `1px solid ${statusCfg.border}`,
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            lineHeight: 1.5,
            color: '#FFFFFF',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {(() => {
            const Icon = statusCfg.icon
            return (
              <span
                role="img"
                aria-label={t(statusCfg.labelKey)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: 'clamp(20px, 5vw, 24px)',
                  height: 'clamp(20px, 5vw, 24px)',
                  minWidth: 20,
                  minHeight: 20
                }}
                title={t(statusCfg.labelKey)}
              >
                <Icon size={18} color={statusCfg.color} strokeWidth={setupStatus === 'complete' ? 2 : 2.5} style={{ opacity: statusCfg.iconOpacity }} />
              </span>
            )
          })()}
          <span key={reminderRotationIndex} style={{ flex: '1 1 auto', minWidth: 0 }}>
            {t('setupReminderIntro')}
            {currentBannerTip ? (
              <>
                {' '}
                {currentBannerTip.isMissing ? (lang === 'en' ? 'Missing:' : 'Manca:') : (lang === 'en' ? 'Tip:' : 'Consiglio:')}{' '}
                <button
                  key={`${reminderRotationIndex}-${currentBannerTip.key}`}
                  type="button"
                  onClick={currentBannerTip.onClick}
                  style={{ background: 'none', border: 'none', color: 'var(--neon-blue)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                >
                  {currentBannerTip.label}
                </button>
              </>
            ) : (
              <> · {t('setupReminderComplete')}</>
            )}
          </span>
          <button
            type="button"
            onClick={dismissSetupBanner}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.82)',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              flexShrink: 0
            }}
          >
            {t('setupReminderDismiss')}
          </button>
        </div>
      )}

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
          confirmLabel={t('delete')}
          cancelLabel={t('cancel')}
          variant="danger"
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

      {/* Credits Bar: montata in layout per aggiornamento immediato dopo ogni API (credits-consumed) */}

      {/* Task Widget (Obiettivi Settimanali) */}
      <div data-tour-id="tour-dashboard-task">
        <TaskWidget />
      </div>

        {/* Dashboard Main Grid - Layout aggiornato: 2 colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Colonna Sinistra */}
          <div className="space-y-6">
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

            {/* Quick Links / Azioni Rapide */}
            <div data-tour-id="tour-dashboard-nav" className="neon-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
                <Settings size={20} color="var(--neon-cyan)" />
                {t('navigation')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nuova Partita */}
                <button
                  data-tour-id="tour-dashboard-add-match"
                  onClick={() => router.push('/match/new')}
                  className="neon-button"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    background: 'rgba(13, 25, 48, 0.9)',
                    borderColor: 'rgba(0, 212, 255, 0.15)',
                    color: '#FFFFFF',
                    height: '100%',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(221, 166, 47, 0.1)'
                    e.currentTarget.style.borderColor = 'var(--border-gold)'
                    e.currentTarget.style.color = 'var(--primary-gold)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                    e.currentTarget.style.color = '#FFFFFF'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <FileImage size={24} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))' }} />
                  <span style={{ fontWeight: 500 }}>{t('addMatch')}</span>
                </button>

                {/* Gestione Rosa */}
                <button
                  onClick={() => router.push('/gestione-formazione')}
                  className="neon-button"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    background: 'rgba(13, 25, 48, 0.9)',
                    borderColor: 'rgba(0, 212, 255, 0.15)',
                    color: '#FFFFFF',
                    height: '100%',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 161, 166, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                    e.currentTarget.style.color = 'var(--neon-cyan)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                    e.currentTarget.style.color = '#FFFFFF'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Users size={24} style={{ color: '#22c55e', filter: 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' }} />
                  <span style={{ fontWeight: 500 }}>{t('manageFormation')}</span>
                </button>

                {/* Analisi Partita Rapida */}
                <button
                  data-tour-id="tour-dashboard-game-analysis"
                onClick={() => setShowGameAnalysisModal(true)}
                  className="neon-button"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    background: 'rgba(13, 25, 48, 0.9)',
                    borderColor: 'rgba(0, 212, 255, 0.15)',
                    color: '#FFFFFF',
                    height: '100%',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 161, 166, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                    e.currentTarget.style.color = 'var(--neon-cyan)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                    e.currentTarget.style.color = '#FFFFFF'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <BarChart3 size={24} style={{ color: '#a855f7', filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))' }} />
                  <span style={{ fontWeight: 500, textAlign: 'center' }}>{t('gameAnalysisTitle')}</span>
                </button>

                {/* Coach AI */}
                <button
                  onClick={() => router.push('/allenatori')}
                  className="neon-button"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    background: 'rgba(13, 25, 48, 0.9)',
                    borderColor: 'rgba(0, 212, 255, 0.15)',
                    color: '#FFFFFF',
                    height: '100%',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(221, 166, 47, 0.1)'
                    e.currentTarget.style.borderColor = 'var(--border-gold)'
                    e.currentTarget.style.color = 'var(--primary-gold)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                    e.currentTarget.style.color = '#FFFFFF'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <UserCheck size={24} style={{ color: '#f97316', filter: 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.6))' }} />
                  <span style={{ fontWeight: 500 }}>{t('coachesLink')}</span>
                </button>

                {/* Palestra Coach */}
                <button
                  onClick={() => setShowCoachFeedback(true)}
                  className="neon-button"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    background: 'rgba(13, 25, 48, 0.9)',
                    borderColor: 'rgba(0, 212, 255, 0.15)',
                    color: '#FFFFFF',
                    height: '100%',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 161, 166, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                    e.currentTarget.style.color = 'var(--neon-cyan)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.15)'
                    e.currentTarget.style.color = '#FFFFFF'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Dumbbell size={24} style={{ color: '#00d4ff', filter: 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.6))' }} />
                  <span style={{ fontWeight: 500 }}>{t('palestraCoachTitle')}</span>
                </button>
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
        onOpenCoaches={() => router.push('/allenatori')}
      />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

export default withAuth(HomePage)
