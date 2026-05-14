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
  UserCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Shield,
  BookOpen,
  Zap,
  User,
  Calendar,
  Radio,
  Dumbbell
} from 'lucide-react'

/** Legge query URL: openCoach=1 → Palestra Coach; openAssistantChat=1 → chat principale; openGameAnalysis=1 → GameAnalysisModal; openCardAdvisor=1 → popup carte. */
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
  const [reminderRotationIndex, setReminderRotationIndex] = React.useState(0)
  const [hideSetupBanner, setHideSetupBanner] = React.useState(false)
  const [showEntryChoiceModal, setShowEntryChoiceModal] = React.useState(false)
  const [showCardAdvisorLogoBurst, setShowCardAdvisorLogoBurst] = React.useState(false)
  const [showCardAdvisorModal, setShowCardAdvisorModal] = React.useState(false)
  const [userProfile, setUserProfile] = React.useState(null)
  const [confirmModal, setConfirmModal] = React.useState(null) // { show, title, message, onConfirm, onCancel }
  const [coachChatInitialMessage, setCoachChatInitialMessage] = React.useState(null)
  const [importingStarterPack, setImportingStarterPack] = React.useState(false)
  const cardAdvisorLogoTimerRef = React.useRef(null)
  const cardAdvisorModalSessionKey = 'dashboard_card_advisor_choice_seen_session_v2'

  React.useEffect(() => {
    setGameAnalysisNavOpen(showGameAnalysisModal)
  }, [showGameAnalysisModal, setGameAnalysisNavOpen])

  React.useEffect(() => {
    return () => setGameAnalysisNavOpen(false)
  }, [setGameAnalysisNavOpen])

  React.useEffect(() => {
    return () => {
      if (cardAdvisorLogoTimerRef.current) {
        clearTimeout(cardAdvisorLogoTimerRef.current)
      }
    }
  }, [])

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
  const rosterSetupState = stats.titolari <= 0 ? 'empty' : stats.titolari < 11 ? 'partial' : 'complete'
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

  const openCardAdvisor = React.useCallback(() => {
    try {
      sessionStorage.setItem(cardAdvisorModalSessionKey, '1')
    } catch {}
    setShowEntryChoiceModal(false)
    setShowCardAdvisorModal(false)
    router.push('/card-advisor-lab')
  }, [router])

  const continueProDashboard = React.useCallback(() => {
    try {
      sessionStorage.setItem(cardAdvisorModalSessionKey, '1')
    } catch {}
    setShowEntryChoiceModal(false)
    setShowCardAdvisorModal(false)
  }, [])

  const playCardAdvisorLogoIntro = React.useCallback(() => {
    setShowEntryChoiceModal(false)
    setShowCardAdvisorModal(false)
    setShowCardAdvisorLogoBurst(true)
    if (cardAdvisorLogoTimerRef.current) {
      clearTimeout(cardAdvisorLogoTimerRef.current)
    }
    cardAdvisorLogoTimerRef.current = setTimeout(() => {
      setShowCardAdvisorLogoBurst(false)
      setShowCardAdvisorModal(true)
    }, 1200)
  }, [])

  const chooseCardAdvisorEntry = React.useCallback(() => {
    playCardAdvisorLogoIntro()
  }, [playCardAdvisorLogoIntro])

  const backToEntryChoice = React.useCallback(() => {
    if (cardAdvisorLogoTimerRef.current) {
      clearTimeout(cardAdvisorLogoTimerRef.current)
      cardAdvisorLogoTimerRef.current = null
    }
    setShowCardAdvisorLogoBurst(false)
    setShowCardAdvisorModal(false)
    setShowEntryChoiceModal(true)
  }, [])

  React.useEffect(() => {
    const onOpen = () => {
      playCardAdvisorLogoIntro()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('open-card-advisor-entry', onOpen)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-card-advisor-entry', onOpen)
      }
    }
  }, [playCardAdvisorLogoIntro])

  React.useEffect(() => {
    if (loading) return
    if (typeof window === 'undefined') return
    try {
      const alreadySeenThisSession = sessionStorage.getItem(cardAdvisorModalSessionKey) === '1'
      if (!alreadySeenThisSession) setShowEntryChoiceModal(true)
    } catch {
      setShowEntryChoiceModal(true)
    }
  }, [loading])

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
        label:
          rosterSetupState === 'empty'
            ? t('setupReminderMissingRosterEmpty')
            : rosterSetupState === 'partial'
              ? t('setupReminderMissingRosterPartial')
              : t('setupTipRosterReview'),
        onClick: () => router.push('/gestione-formazione'),
        isMissing: stats.titolari < 11
      }
    ]
    return tips
  }, [gameAnalysisLastCapture, hasActiveCoach, rosterSetupState, stats.titolari, t, router])

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
  // Notifica setup: differenzia chiaramente "nessuna rosa" da "rosa da completare"
  const setupStatus = rosterSetupState === 'empty'
    ? 'roster_missing'
    : rosterSetupState === 'partial'
      ? 'roster_partial'
      : missingCount >= 2
        ? 'critical'
        : missingCount === 1
          ? 'partial'
          : 'complete'
  const setupStatusConfig = {
    roster_missing: { color: '#FFD76A', bg: 'rgba(255, 215, 106, 0.10)', border: 'rgba(255, 215, 106, 0.24)', icon: AlertCircle, labelKey: 'setupStatusRosterMissing', iconOpacity: 1 },
    roster_partial: { color: '#67E8F9', bg: 'rgba(0, 212, 255, 0.08)', border: 'rgba(0, 212, 255, 0.20)', icon: AlertCircle, labelKey: 'setupStatusRosterPartial', iconOpacity: 1 },
    critical: { color: '#FFB84D', bg: 'rgba(255, 184, 77, 0.10)', border: 'rgba(255, 184, 77, 0.24)', icon: AlertCircle, labelKey: 'setupStatusCritical', iconOpacity: 1 },
    partial: { color: '#8BE9A8', bg: 'rgba(139, 233, 168, 0.08)', border: 'rgba(139, 233, 168, 0.18)', icon: AlertCircle, labelKey: 'setupStatusPartial', iconOpacity: 1 },
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

  const showDashboardStarterPackCta = !loading && stats.totalPlayers <= 5

  const handleImportStarterPack = React.useCallback(() => {
    setConfirmModal({
      show: true,
      title: lang === 'en' ? 'Temporary formation' : 'Formazione provvisoria',
      message: lang === 'en'
        ? 'This is a formation that lets you test the platform without uploading your own players.\n\nRECOMMENDATION: take the time you need and upload or replace the pre-loaded players with your real squad when you are ready.'
        : 'Questa è una formazione per permetterti di testare la piattaforma senza caricare i tuoi giocatori.\n\nCONSIGLIO: prenditi il tempo necessario e carica o sostituisci i giocatori pre-caricati con quelli della tua rosa reale quando sei pronto.',
      confirmLabel: lang === 'en' ? 'I understand' : 'Ho capito',
      cancelLabel: t('cancel'),
      variant: 'info',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setConfirmModal(null)
        setImportingStarterPack(true)
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

          const res = await fetch('/api/starter-pack/import', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Accept-Language': lang === 'en' ? 'en' : 'it'
            }
          })

          const data = await safeJsonResponse(res, t('starterPackImportError'))
          setRetryTrigger((n) => n + 1)
          const insertedPlayers = Number(data?.insertedPlayers || 0)
          const isPartialStarterPack = insertedPlayers > 0 && insertedPlayers < 11
          setConfirmModal({
            show: true,
            title: lang === 'en' ? 'Players loaded' : 'Giocatori caricati',
            message: isPartialStarterPack
              ? (lang === 'en'
                  ? `We loaded ${insertedPlayers} temporary players. Some formation slots may still be empty: open your squad, take your time, and complete or replace the pre-loaded players with your real ones.`
                  : `Abbiamo caricato ${insertedPlayers} giocatori provvisori. Alcuni slot della formazione potrebbero essere ancora vuoti: apri la rosa, prenditi il tempo necessario e completa o sostituisci i giocatori pre-caricati con quelli reali.`)
              : (lang === 'en'
                  ? `We loaded ${insertedPlayers} temporary players. Open your squad to review them and replace them whenever you are ready.`
                  : `Abbiamo caricato ${insertedPlayers} giocatori provvisori. Apri la rosa per controllarli e sostituirli quando sei pronto.`),
            confirmLabel: lang === 'en' ? 'Open squad' : 'Apri rosa',
            cancelLabel: lang === 'en' ? 'Stay here' : 'Resta qui',
            variant: isPartialStarterPack ? 'warning' : 'info',
            confirmVariant: 'primary',
            onConfirm: () => {
              setConfirmModal(null)
              router.push('/gestione-formazione')
            },
            onCancel: () => setConfirmModal(null)
          })
        } catch (err) {
          console.error('[Dashboard] starter pack import error:', err)
          const { message } = mapErrorToUserMessage(err, t('starterPackImportError'), lang)
          setError(message)
        } finally {
          setImportingStarterPack(false)
        }
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [lang, router, supabase, t])

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
          onOpenCardAdvisor={() => {
            setShowEntryChoiceModal(false)
            setShowCardAdvisorModal(true)
          }}
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

      {showDashboardStarterPackCta && (
        <div
          className="neon-card"
          style={{
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid rgba(0, 212, 255, 0.28)',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.10), rgba(168, 85, 247, 0.08))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: '1 1 260px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                {lang === 'en' ? 'Start with a temporary formation' : 'Inizia con una formazione provvisoria'}
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.76)' }}>
                {lang === 'en'
                  ? 'Click here if you want to test the platform before uploading your real players.'
                  : 'Clicca qui per iniziare con una formazione provvisoria e provare la piattaforma prima di caricare i tuoi giocatori.'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleImportStarterPack}
              disabled={importingStarterPack}
              className="neon-button"
              style={{
                minHeight: '48px',
                padding: '12px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--neon-cyan)',
                cursor: importingStarterPack ? 'wait' : 'pointer',
                opacity: importingStarterPack ? 0.75 : 1,
                flexShrink: 0
              }}
            >
              {importingStarterPack ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  {t('starterPackImportLoading')}
                </>
              ) : (
                <>
                  <Zap size={16} />
                  {lang === 'en' ? 'Click here to start' : 'Clicca qui per iniziare'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showCardAdvisorLogoBurst && (
        <div
          className="card-advisor-logo-burst-overlay"
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1210,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.20), rgba(3, 7, 18, 0.74) 52%, rgba(3, 7, 18, 0.88))',
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none'
          }}
        >
          <div className="card-advisor-logo-burst">
            <img src="/logo.png" alt="" />
          </div>
        </div>
      )}

      {showEntryChoiceModal && (
        <div
          className="card-advisor-entry-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at top left, rgba(0, 212, 255, 0.16), transparent 32%), radial-gradient(circle at bottom right, rgba(255, 203, 5, 0.16), transparent 34%), rgba(3, 7, 18, 0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="neon-card card-advisor-entry-modal"
            style={{
              width: 'min(680px, 100%)',
              padding: 'clamp(22px, 4vw, 32px)',
              border: '1px solid rgba(0, 212, 255, 0.26)',
              background: 'linear-gradient(145deg, rgba(5, 12, 28, 0.98), rgba(10, 15, 34, 0.98))',
              boxShadow: '0 0 44px rgba(0, 212, 255, 0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '22px', position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '999px', background: 'rgba(0, 212, 255, 0.10)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--neon-cyan)', fontWeight: 800, fontSize: '13px', marginBottom: '14px' }}>
                <Shield size={15} />
                {lang === 'en' ? 'Choose your mode' : 'Scegli come entrare'}
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 5.4vw, 40px)', lineHeight: 1.04, fontWeight: 900, color: '#FFFFFF', margin: '0 0 10px 0' }}>
                {lang === 'en' ? 'Continue in Pro or try card analysis?' : 'Continui nel Pro o provi Analisi Carte?'}
              </h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.76)', lineHeight: 1.6, fontSize: '15px' }}>
                {lang === 'en'
                  ? 'Pro remains your full dashboard. Card analysis opens the preview for new releases.'
                  : 'Il Pro resta la tua dashboard completa. Analisi Carte apre la preview delle nuove uscite.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', position: 'relative' }}>
              <button
                type="button"
                onClick={continueProDashboard}
                className="neon-button"
                style={{
                  minHeight: '142px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  background: 'rgba(0, 212, 255, 0.08)',
                  borderColor: 'rgba(0, 212, 255, 0.28)',
                  color: '#FFFFFF'
                }}
              >
                <Shield size={26} style={{ color: 'var(--neon-cyan)' }} />
                <strong style={{ fontSize: '18px' }}>{lang === 'en' ? 'Continue in Pro' : 'Continua nel Pro'}</strong>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.45 }}>
                  {lang === 'en' ? 'Open dashboard, roster, matches and all Pro tools.' : 'Apri dashboard, rosa, partite e tutti gli strumenti Pro.'}
                </span>
              </button>

              <button
                type="button"
                onClick={chooseCardAdvisorEntry}
                className="neon-button"
                style={{
                  minHeight: '142px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  background: 'linear-gradient(135deg, rgba(255, 203, 5, 0.20), rgba(168, 85, 247, 0.16), rgba(0, 212, 255, 0.12))',
                  borderColor: 'rgba(255, 203, 5, 0.42)',
                  color: '#FFFFFF',
                  boxShadow: '0 0 26px rgba(255, 203, 5, 0.16)'
                }}
              >
                <Zap size={26} style={{ color: '#ffcb05' }} />
                <strong style={{ fontSize: '18px' }}>{lang === 'en' ? 'Card analysis' : 'Analisi Carte'}</strong>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>
                  {lang === 'en' ? 'Evaluate new cards against your real roster.' : 'Valuta le nuove carte in base alla tua rosa reale.'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showCardAdvisorModal && (
        <div
          className="card-advisor-entry-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at top left, rgba(255, 203, 5, 0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.22), transparent 35%), rgba(3, 7, 18, 0.86)',
            backdropFilter: 'blur(10px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="neon-card card-advisor-entry-modal card-advisor-preview-modal"
            style={{
              width: 'min(760px, 100%)',
              padding: 'clamp(24px, 4vw, 34px)',
              border: '1px solid rgba(255, 203, 5, 0.34)',
              background: 'linear-gradient(145deg, rgba(5, 12, 28, 0.98), rgba(14, 10, 38, 0.98))',
              boxShadow: '0 0 50px rgba(168, 85, 247, 0.24), 0 0 36px rgba(0, 212, 255, 0.16), inset 0 1px 0 rgba(255,255,255,0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', inset: '-40% -20% auto auto', width: '280px', height: '280px', borderRadius: '999px', background: 'rgba(255, 203, 5, 0.16)', filter: 'blur(18px)' }} />
            <div style={{ position: 'absolute', inset: 'auto auto -35% -15%', width: '260px', height: '260px', borderRadius: '999px', background: 'rgba(0, 212, 255, 0.14)', filter: 'blur(18px)' }} />
            <div className="card-advisor-preview-copy" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 13px', borderRadius: '999px', background: 'rgba(255, 203, 5, 0.12)', border: '1px solid rgba(255, 203, 5, 0.28)', color: '#ffcb05', fontWeight: 800, fontSize: '13px', marginBottom: '14px', position: 'relative' }}>
                <Zap size={15} />
                {lang === 'en' ? 'New card releases' : 'Nuove carte uscite'}
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', lineHeight: 1.02, fontWeight: 900, color: '#FFFFFF', margin: '0 0 12px 0', position: 'relative' }}>
                {lang === 'en' ? 'Find out if a new card is really worth it' : 'Scopri se una nuova carta vale davvero'}
              </h2>
              <p style={{ margin: 0, fontSize: 'clamp(15px, 2.8vw, 17px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, position: 'relative' }}>
                {lang === 'en'
                  ? 'We do not judge cards only by overall. We compare the new releases with your real roster, your team needs, and your performance data to tell you whether to sign, skip, or keep as rotation.'
                  : 'Non giudichiamo le carte solo dall’overall. Le confrontiamo con la tua rosa reale, le tue esigenze e le tue performance per dirti se prenderle, saltarle o usarle solo come rotazione.'}
              </p>
            </div>
            <div className="card-advisor-access-status" style={{ position: 'relative', maxWidth: '440px', margin: '0 auto 12px', display: 'grid', gap: '10px' }}>
              <div style={{ textAlign: 'center', color: '#ffcb05', fontSize: '13px', fontWeight: 800 }}>
                {lang === 'en' ? 'Available now' : 'Disponibile ora'}
              </div>
            </div>
            <div className="card-advisor-access-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={openCardAdvisor}
                className="neon-button"
                style={{
                  minHeight: '52px',
                  padding: '13px 20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '9px',
                  background: 'linear-gradient(135deg, rgba(255, 203, 5, 0.22), rgba(168, 85, 247, 0.20), rgba(0, 212, 255, 0.18))',
                  borderColor: 'rgba(255, 203, 5, 0.42)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  boxShadow: '0 0 24px rgba(255, 203, 5, 0.18)',
                  cursor: 'pointer'
                }}
              >
                <BarChart3 size={18} />
                {lang === 'en' ? 'Enter card analysis' : 'Entra nell’analisi carte'}
              </button>
              <button
                type="button"
                onClick={backToEntryChoice}
                className="neon-button"
                style={{
                  minHeight: '46px',
                  padding: '11px 16px',
                  background: 'rgba(255,255,255,0.035)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.72)'
                }}
              >
                {lang === 'en' ? 'Back' : 'Indietro'}
              </button>
            </div>
            <div className="card-advisor-benefit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '0', position: 'relative' }}>
              {[
                lang === 'en' ? 'Fit with starters and bench' : 'Fit con titolari e panchina',
                lang === 'en' ? 'Reads your weaknesses and priorities' : 'Legge debolezze e priorità',
                lang === 'en' ? 'Clear verdict: sign, skip, rotation' : 'Verdetto chiaro: prendi, salta, rotazione'
              ].map((item) => (
                <div key={item} style={{ padding: '13px', borderRadius: '16px', background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.86)', fontSize: '13px', lineHeight: 1.45 }}>
                  <CheckCircle2 size={15} style={{ color: '#34C759', marginBottom: '8px' }} />
                  <div>{item}</div>
                </div>
              ))}
            </div>
          </div>
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

                {/* Analisi Carte Nuove */}
                <button
                  onClick={() => setShowCardAdvisorModal(true)}
                  className="neon-button"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '20px',
                    background: 'rgba(13, 25, 48, 0.9)',
                    borderColor: 'rgba(255, 203, 5, 0.22)',
                    color: '#FFFFFF',
                    height: '100%',
                    borderRadius: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 203, 5, 0.10)'
                    e.currentTarget.style.borderColor = 'rgba(255, 203, 5, 0.55)'
                    e.currentTarget.style.color = '#ffcb05'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                    e.currentTarget.style.borderColor = 'rgba(255, 203, 5, 0.22)'
                    e.currentTarget.style.color = '#FFFFFF'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Zap size={24} style={{ color: '#ffcb05', filter: 'drop-shadow(0 0 7px rgba(255, 203, 5, 0.7))' }} />
                  <span style={{ fontWeight: 500, textAlign: 'center' }}>{lang === 'en' ? 'New card analysis' : 'Analisi carte nuove'}</span>
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

        @keyframes cardAdvisorLogoVibe {
          0% { transform: scale(0.78) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 0 rgba(0, 212, 255, 0)); }
          12% { transform: scale(1.05) rotate(-3deg); opacity: 1; }
          24% { transform: scale(1.12) rotate(3deg); }
          36% { transform: scale(1.08) rotate(-2deg); }
          52% { transform: scale(1.15) rotate(2deg); }
          72% { transform: scale(1.06) rotate(0deg); opacity: 1; }
          100% { transform: scale(0.92) rotate(0deg); opacity: 0; filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.65)); }
        }

        @keyframes cardAdvisorLogoRing {
          0% { transform: scale(0.65); opacity: 0; }
          35% { opacity: 0.85; }
          100% { transform: scale(1.85); opacity: 0; }
        }

        .card-advisor-logo-burst {
          width: 132px;
          height: 132px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.18), rgba(255, 203, 5, 0.12), transparent 70%);
        }

        .card-advisor-logo-burst::before,
        .card-advisor-logo-burst::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 1px solid rgba(0, 212, 255, 0.55);
          animation: cardAdvisorLogoRing 1.2s ease-out both;
        }

        .card-advisor-logo-burst::after {
          border-color: rgba(255, 203, 5, 0.50);
          animation-delay: 0.18s;
        }

        .card-advisor-logo-burst img {
          width: 86px;
          height: 86px;
          object-fit: contain;
          border-radius: 22px;
          animation: cardAdvisorLogoVibe 1.2s ease-in-out both;
          filter: drop-shadow(0 0 18px rgba(0, 212, 255, 0.70)) drop-shadow(0 0 14px rgba(255, 203, 5, 0.38));
        }

        @media (max-width: 640px) {
          .card-advisor-entry-overlay {
            align-items: flex-start !important;
            justify-content: center !important;
            padding: 10px 10px calc(92px + env(safe-area-inset-bottom, 0px)) !important;
            overflow-y: auto !important;
          }

          .card-advisor-entry-modal {
            width: min(100%, 390px) !important;
            max-height: calc(100dvh - 112px - env(safe-area-inset-bottom, 0px)) !important;
            overflow-y: auto !important;
            padding: 18px !important;
            border-radius: 18px !important;
          }

          .card-advisor-entry-modal h2 {
            font-size: 26px !important;
          }

          .card-advisor-preview-modal {
            max-height: calc(100dvh - 104px - env(safe-area-inset-bottom, 0px)) !important;
            padding: 15px !important;
          }

          .card-advisor-preview-copy {
            margin-bottom: 12px !important;
          }

          .card-advisor-preview-copy h2 {
            font-size: 25px !important;
            line-height: 1.04 !important;
            margin-bottom: 8px !important;
          }

          .card-advisor-preview-copy p {
            font-size: 14px !important;
            line-height: 1.42 !important;
          }

          .card-advisor-access-status {
            margin-bottom: 8px !important;
          }

          .card-advisor-access-actions {
            gap: 8px !important;
            margin-bottom: 12px !important;
          }

          .card-advisor-access-actions .neon-button {
            min-height: 46px !important;
            padding: 11px 14px !important;
          }

          .card-advisor-access-actions .neon-button:first-child {
            width: 100% !important;
          }

          .card-advisor-benefit-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .card-advisor-benefit-grid > div {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 9px 11px !important;
            border-radius: 12px !important;
          }

          .card-advisor-benefit-grid svg {
            margin-bottom: 0 !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>
    </main>
  )
}

export default withAuth(HomePage)
