'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Save, SkipForward, RefreshCw, User, Gamepad2, Brain, CheckCircle2, AlertCircle, X, Wallet, Zap } from 'lucide-react'
import CoachFeedbackChat from '@/components/CoachFeedbackChat'

export default function ImpostazioniProfiloPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  
  // Stato profilo
  const [profile, setProfile] = React.useState({
    first_name: '',
    last_name: '',
    current_division: '',
    favorite_team: '',
    team_name: '',
    ai_name: '',
    how_to_remember: '',
    hours_per_week: null,
    common_problems: []
  })
  
  const [profileData, setProfileData] = React.useState(null) // Dati completi dal server
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)
  const [toast, setToast] = React.useState(null) // { message, type: 'success' | 'error' }
  const [showCoachGym, setShowCoachGym] = React.useState(false) // Stato per CoachFeedbackChat
  
  // Divisioni disponibili
  const divisions = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Division 6', 'Division 7', 'Division 8', 'Division 9', 'Division 10']

  // Carica profilo esistente
  React.useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        let token = localStorage.getItem('auth_token')
        let userId = null
        
        if (token) {
           const userData = localStorage.getItem('metalgate_user')
           if (userData) {
             userId = JSON.parse(userData).id
           }
        } else if (supabase) {
           const { data: session } = await supabase.auth.getSession()
           if (session?.session) {
             token = session.session.access_token
             userId = session.session.user.id
           }
        }
        
        if (!token) {
          // AuthWrapper gestirà redirect
          setLoading(false)
          return
        }

        // Carica profilo - usa sempre API server-side per sicurezza e consistenza
        const res = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        })
        
        if (!res.ok) {
          throw new Error(t('errorProfileLoad'))
        }
        
        const profileData = await res.json()
        console.log('[Impostazioni Profilo] Loaded profile data:', profileData)
        
        if (profileData) {
           setProfileData(profileData)
           setProfile({
             first_name: profileData.first_name || '',
             last_name: profileData.last_name || '',
             current_division: profileData.current_division || '',
             favorite_team: profileData.favorite_team || '',
             team_name: profileData.team_name || '',
             ai_name: profileData.ai_name || '',
             how_to_remember: profileData.how_to_remember || '',
             hours_per_week: profileData.hours_per_week || null,
             common_problems: profileData.common_problems || []
           })
        }
      } catch (err) {
        console.error('[Impostazioni Profilo] Error loading profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  // Salva profilo (incrementale)
  const handleSave = async (sectionName) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/supabase/save-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('errorProfileSave'))
      }

      const data = await response.json()
      if (data.profile) {
        const p = data.profile
        setProfileData(prev => prev ? {
          ...prev,
          profile_completion_score: p.profile_completion_score,
          profile_completion_level: p.profile_completion_level,
          first_name: p.first_name ?? prev.first_name,
          last_name: p.last_name ?? prev.last_name,
          current_division: p.current_division ?? prev.current_division,
          favorite_team: p.favorite_team ?? prev.favorite_team,
          team_name: p.team_name ?? prev.team_name,
          ai_name: p.ai_name ?? prev.ai_name,
          how_to_remember: p.how_to_remember ?? prev.how_to_remember,
          hours_per_week: p.hours_per_week ?? prev.hours_per_week,
          common_problems: p.common_problems ?? prev.common_problems
        } : {
          profile_completion_score: p.profile_completion_score,
          profile_completion_level: p.profile_completion_level,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          current_division: p.current_division ?? null,
          favorite_team: p.favorite_team ?? null,
          team_name: p.team_name ?? null,
          ai_name: p.ai_name ?? null,
          how_to_remember: p.how_to_remember ?? null,
          hours_per_week: p.hours_per_week ?? null,
          common_problems: p.common_problems ?? null
        })
        setProfile(prev => ({
          ...prev,
          first_name: p.first_name != null ? p.first_name : prev.first_name,
          last_name: p.last_name != null ? p.last_name : prev.last_name,
          current_division: p.current_division != null ? p.current_division : prev.current_division,
          favorite_team: p.favorite_team != null ? p.favorite_team : prev.favorite_team,
          team_name: p.team_name != null ? p.team_name : prev.team_name,
          ai_name: p.ai_name != null ? p.ai_name : prev.ai_name,
          how_to_remember: p.how_to_remember != null ? p.how_to_remember : prev.how_to_remember,
          hours_per_week: p.hours_per_week != null ? p.hours_per_week : prev.hours_per_week,
          common_problems: Array.isArray(p.common_problems) ? p.common_problems : prev.common_problems
        }))
      }
      const successMsg = data.profile
        ? `${sectionName} ${t('profileSectionSaved')}`
        : t('profileSectionSaved')
      setSuccess(successMsg)
      setToast({ message: successMsg, type: 'success' })
      setTimeout(() => setSuccess(null), 3000)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
      }

      // Aggiorna riassunto analisi (diagnostic) per la chat
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare UI */ }
    } catch (err) {
      console.error('[Impostazioni Profilo] Error saving profile:', err)
      const errMsg = err.message || t('errorProfileSave')
      setError(errMsg)
      setToast({ message: errMsg, type: 'error' })
      setTimeout(() => setError(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Skip sezione
  const handleSkip = (sectionName) => {
    setSuccess(`${t('skipped')} ${sectionName}`)
    setTimeout(() => setSuccess(null), 2000)
  }

  // Calcola percentuale completamento (se disponibile)
  const completionScore = profileData?.profile_completion_score ?? 0
  const completionLevel = profileData?.profile_completion_level || 'beginner'
  
  const getLevelText = (level) => {
    switch(level) {
      case 'complete': return t('profileLevelComplete') || 'Completo'
      case 'intermediate': return t('profileLevelIntermediate') || 'Intermedio'
      default: return t('profileLevelBeginner') || 'Principiante'
    }
  }

  const safeCompletionScore = Math.max(0, Math.min(100, Number(completionScore) || 0))
  const profileGradient = safeCompletionScore >= 87.5
    ? 'conic-gradient(#00ff88 0deg, #00ff88 var(--score-angle), rgba(255,255,255,0.08) var(--score-angle), rgba(255,255,255,0.08) 360deg)'
    : safeCompletionScore >= 50
      ? 'conic-gradient(#00d4ff 0deg, #00d4ff var(--score-angle), rgba(255,255,255,0.08) var(--score-angle), rgba(255,255,255,0.08) 360deg)'
      : 'conic-gradient(#ffcb05 0deg, #ffcb05 var(--score-angle), rgba(255,255,255,0.08) var(--score-angle), rgba(255,255,255,0.08) 360deg)'
  const cleanValue = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ')
    if (value === null || value === undefined || value === '') return null
    return String(value)
  }
  const profileOverviewCards = [
    {
      label: lang === 'en' ? 'Division' : 'Divisione',
      value: cleanValue(profile.current_division),
      hint: lang === 'en' ? 'Competitive level' : 'Livello competitivo'
    },
    {
      label: lang === 'en' ? 'In-game team' : 'Team in game',
      value: cleanValue(profile.team_name || profile.favorite_team),
      hint: lang === 'en' ? 'Identity used in analyses' : 'Identita usata nelle analisi'
    },
    {
      label: lang === 'en' ? 'Platform' : 'Piattaforma',
      value: cleanValue(profileData?.platform),
      hint: lang === 'en' ? 'From Coach Gym' : 'Da Palestra Coach'
    },
    {
      label: lang === 'en' ? 'Pass level' : 'Livello passaggi',
      value: cleanValue(profileData?.pass_level),
      hint: lang === 'en' ? 'Control profile' : 'Profilo comandi'
    },
    {
      label: lang === 'en' ? 'Weak point' : 'Punto debole',
      value: cleanValue(profileData?.ai_weak_point || profile.common_problems),
      hint: lang === 'en' ? 'What the coach should watch' : 'Cosa deve osservare il coach'
    },
    {
      label: lang === 'en' ? 'Favourite player' : 'Giocatore preferito',
      value: cleanValue(profileData?.favourite_player_name),
      hint: lang === 'en' ? 'Useful for examples' : 'Utile per esempi e consigli'
    }
  ]

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loadingProfile')}</div>
      </main>
    )
  }

  return (
    <main data-tour-id="tour-profile-intro" className="profile-page">
      {/* Page Header */}
      <section className="profile-hero">
        <div className="profile-hero-copy">
          <span className="profile-kicker">
            <User size={16} />
            {lang === 'en' ? 'Player identity' : 'Identita giocatore'}
          </span>
          <h1>
            {t('profileSettings')}
          </h1>
          <p>
            {lang === 'en'
              ? 'Your profile is the memory layer of the coach: the more complete it is, the more personal every suggestion becomes.'
              : 'Il profilo e la memoria del coach: piu e completo, piu ogni consiglio diventa personale.'}
          </p>
          <div className="profile-hero-actions">
            <a href="/gestione-profilo" className="profile-hero-link profile-hero-link--primary">
              <Wallet size={17} />
              {t('goToHeroPoints')}
            </a>
          </div>
        </div>

        <div className="profile-score-panel">
          <div
            className="profile-score-orb"
            style={{
              '--score-angle': `${safeCompletionScore * 3.6}deg`,
              background: profileGradient
            }}
          >
            <div>
              <strong>{Math.round(safeCompletionScore)}%</strong>
              <span>{t('profiling')}</span>
            </div>
          </div>
          <div className="profile-score-caption">
            <strong>{getLevelText(completionLevel)}</strong>
            <span>{safeCompletionScore >= 100 ? t('guideProfileComplete') : t('completeFor100')}</span>
          </div>
        </div>
      </section>

      <section className="profile-metric-grid" aria-label={lang === 'en' ? 'Profile overview' : 'Panoramica profilo'}>
        {profileOverviewCards.map((card) => (
          <div className={`profile-metric-card ${card.value ? '' : 'profile-metric-card--empty'}`} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value || (lang === 'en' ? 'Missing' : 'Da completare')}</strong>
            <small>{card.hint}</small>
          </div>
        ))}
      </section>

      {/* Toast: feedback vicino all'azione (visibile anche se la sezione è in basso) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          background: toast.type === 'success'
            ? 'rgba(34, 197, 94, 0.95)'
            : 'rgba(239, 68, 68, 0.95)',
          border: `2px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '280px',
          maxWidth: '420px',
          animation: 'slideInRight 0.3s ease-out',
          backdropFilter: 'blur(8px)'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} color="#ffffff" />
          ) : (
            <AlertCircle size={20} color="#ffffff" />
          )}
          <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, flex: 1 }}>
            {typeof toast.message === 'string' ? toast.message : (toast.message?.message ?? String(toast.message ?? ''))}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label={t('close')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Banner Palestra Coach - Dati Tecnici (responsive: stack su mobile) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 140, 0, 0.05))',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '16px',
        padding: 'clamp(16px, 4vw, 24px)',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'rgba(0, 212, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Brain size={24} color="#00d4ff" />
        </div>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <h3 style={{ fontWeight: 600, margin: '0 0 6px', fontSize: 'clamp(15px, 3.5vw, 17px)', lineHeight: 1.3 }}>
            {t('coachDataSettingsTitle') || 'Dati tecnici di gioco'}
          </h3>
          <p style={{ fontSize: 'clamp(13px, 2.5vw, 14px)', color: '#888', lineHeight: 1.45, margin: 0 }}>
            {t('coachDataSettingsDesc') || 'Per modificare piattaforma, connessione, livello passaggio e punto debole, usa la Palestra Coach.'}
          </p>
        </div>
        <button 
          onClick={() => setShowCoachGym(true)}
          className="neon-button"
          style={{ 
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 180, 216, 0.3))',
            border: '2px solid #00d4ff',
            color: '#fff',
            fontWeight: 600,
            flexShrink: 0,
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.4), inset 0 0 10px rgba(0, 212, 255, 0.1)',
            textShadow: '0 0 8px rgba(0, 212, 255, 0.8)'
          }}
        >
          <Zap size={16} />
          {t('openCoachGym') || 'Apri Palestra Coach'}
        </button>
      </div>

      {/* Messaggi Success/Error */}
      {success && (
        <div style={{
          backgroundColor: '#00ff8820',
          border: '1px solid #00ff88',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#00ff88'
        }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#ff444420',
          border: '1px solid #ff4444',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ff4444'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Sezione: Dati Personali (stile allineato a Dashboard) */}
      <div data-tour-id="tour-profile-personal" style={{
        backgroundColor: '#1a1d24',
        borderRadius: '16px',
        padding: 'clamp(16px, 4vw, 24px)',
        marginBottom: '24px',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <User size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '600' }}>{t('personalData')}</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('firstName')}
          </label>
          <input
            type="text"
            value={profile.first_name}
            onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
            placeholder={t('placeholderYourName')}
            maxLength={255}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: 'clamp(16px, 4vw, 16px)'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('lastName')}
          </label>
          <input
            type="text"
            value={profile.last_name}
            onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
            placeholder={t('yourLastName')}
            maxLength={255}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: 'clamp(16px, 4vw, 16px)'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSave(t('personalData'))}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: saving ? '#2a2a2a' : '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            {saving ? t('saving') : t('save')}
          </button>
          <button
            onClick={() => handleSkip(t('personalData'))}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#888',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <SkipForward size={18} />
            {t('skip')}
          </button>
        </div>
      </div>

      {/* Sezione: Dati Gioco */}
      <div data-tour-id="tour-profile-game" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Gamepad2 size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('gameData')}</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            Divisione attuale
          </label>
          <select
            value={profile.current_division}
            onChange={(e) => setProfile(prev => ({ ...prev, current_division: e.target.value }))}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            <option value="">{t('selectDivision')}</option>
            {divisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('favoriteTeam')}
          </label>
          <input
            type="text"
            value={profile.favorite_team}
            onChange={(e) => setProfile(prev => ({ ...prev, favorite_team: e.target.value }))}
            placeholder={t('favoriteTeamPlaceholder')}
            maxLength={255}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', color: '#888', flex: 1 }}>
              {t('teamNameInGame')}
            </label>
            <span style={{
              fontSize: '11px',
              padding: '4px 8px',
              background: 'rgba(0, 212, 255, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              borderRadius: '4px',
              color: 'var(--neon-blue)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {t('important')}
            </span>
          </div>
          <input
            type="text"
            value={profile.team_name}
            onChange={(e) => setProfile(prev => ({ ...prev, team_name: e.target.value }))}
            placeholder={t('placeholderTeamExample')}
            maxLength={255}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: profile.team_name ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '6px',
            fontStyle: 'italic',
            lineHeight: '1.4'
          }}>
            {t('teamNameDescription')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSave(t('gameData'))}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: saving ? '#2a2a2a' : '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            {saving ? t('saving') : t('save')}
          </button>
          <button
            onClick={() => handleSkip(t('gameData'))}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#888',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <SkipForward size={18} />
            {t('skip')}
          </button>
        </div>
      </div>

      {/* Sezione: Personalizzazione Coach */}
      <div data-tour-id="tour-profile-coach-personalization" className="profile-coach-personalization">
        <div className="profile-section-heading">
          <Brain size={20} color="#00d4ff" />
          <div>
            <h2>{lang === 'en' ? 'Coach personalization' : 'Personalizzazione Coach'}</h2>
            <p>
              {lang === 'en'
                ? 'Choose how the coach talks to you. These details change the tone and memory of chat and live coach.'
                : 'Scegli come il coach parla con te. Questi dettagli cambiano tono e memoria di chat e live coach.'}
            </p>
          </div>
        </div>

        <div className="profile-personalization-grid">
          <div>
            <label>
              {lang === 'en' ? 'What should the coach call you?' : 'Come vuoi che ti chiami?'}
            </label>
            <input
              type="text"
              value={profile.first_name}
              onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder={t('placeholderYourName')}
              maxLength={255}
            />
          </div>

          <div>
            <label>
              {lang === 'en' ? 'Coach name' : 'Nome del tuo coach'}
            </label>
            <input
              type="text"
              value={profile.ai_name}
              onChange={(e) => setProfile(prev => ({ ...prev, ai_name: e.target.value }))}
              placeholder={t('aiNamePlaceholder')}
              maxLength={255}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label>
            {lang === 'en' ? 'Coach memory note' : 'Nota memoria per il coach'}
          </label>
          <textarea
            value={profile.how_to_remember}
            onChange={(e) => setProfile(prev => ({ ...prev, how_to_remember: e.target.value }))}
            placeholder={t('howToRememberPlaceholder')}
            maxLength={1000}
            rows={4}
          />
        </div>

        <div className="profile-personalization-actions">
          <button
            onClick={() => handleSave(lang === 'en' ? 'Coach personalization' : 'Personalizzazione Coach')}
            disabled={saving}
            className="profile-save-button"
          >
            <Save size={18} />
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      {/* Bottone Completa Profilo */}
      <button
        data-tour-id="tour-profile-complete"
        onClick={() => {
          handleSave(t('completeProfile'))
          setTimeout(() => router.push('/'), 2000)
        }}
        disabled={saving}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: saving ? '#2a2a2a' : '#00ff88',
          color: '#000',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '600',
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '32px'
        }}
      >
        <CheckCircle2 size={20} />
        {saving ? t('saving') : t('completeProfile')}
      </button>
      <CoachFeedbackChat 
        show={showCoachGym}
        onClose={() => setShowCoachGym(false)}
        userProfile={profileData}
        lastMatch={null}
      />
      <style jsx>{`
        .profile-page {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: clamp(14px, 3vw, 28px);
          min-height: 100vh;
        }

        .profile-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
          gap: 22px;
          margin-bottom: 18px;
          padding: clamp(20px, 4vw, 32px);
          overflow: hidden;
          border: 1px solid rgba(0, 212, 255, 0.26);
          border-radius: 26px;
          background:
            radial-gradient(circle at 12% 0%, rgba(0, 212, 255, 0.20), transparent 34%),
            radial-gradient(circle at 90% 10%, rgba(255, 203, 5, 0.14), transparent 30%),
            linear-gradient(135deg, rgba(8, 14, 31, 0.98), rgba(9, 24, 43, 0.92));
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32), 0 0 34px rgba(0, 212, 255, 0.10);
        }

        .profile-hero::after {
          content: '';
          position: absolute;
          inset: auto -20% -45% 35%;
          height: 190px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.16), transparent 70%);
          pointer-events: none;
        }

        .profile-hero-copy,
        .profile-score-panel {
          position: relative;
          z-index: 1;
        }

        .profile-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding: 7px 10px;
          border: 1px solid rgba(0, 212, 255, 0.28);
          border-radius: 999px;
          background: rgba(0, 212, 255, 0.08);
          color: #8ff2ff;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .profile-hero h1 {
          margin: 0 0 10px;
          color: #fff;
          font-size: clamp(30px, 5vw, 48px);
          font-weight: 900;
          line-height: 0.98;
          letter-spacing: -0.04em;
        }

        .profile-hero p {
          max-width: 640px;
          margin: 0;
          color: rgba(255, 255, 255, 0.74);
          font-size: clamp(14px, 2.2vw, 16px);
          line-height: 1.65;
        }

        .profile-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .profile-hero-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.86);
          background: rgba(255, 255, 255, 0.05);
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .profile-hero-link:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 212, 255, 0.45);
          background: rgba(0, 212, 255, 0.10);
        }

        .profile-hero-link--primary {
          color: #001018;
          border-color: rgba(0, 212, 255, 0.82);
          background: linear-gradient(135deg, #00d4ff, #67e8f9);
          box-shadow: 0 0 22px rgba(0, 212, 255, 0.24);
        }

        .profile-score-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          min-height: 230px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.045);
          backdrop-filter: blur(10px);
        }

        .profile-score-orb {
          width: 152px;
          height: 152px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          box-shadow: 0 0 32px rgba(0, 212, 255, 0.16);
        }

        .profile-score-orb > div {
          width: 116px;
          height: 116px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(5, 8, 20, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .profile-score-orb strong {
          color: #fff;
          font-size: 34px;
          font-weight: 900;
          line-height: 1;
        }

        .profile-score-orb span,
        .profile-score-caption span {
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          font-weight: 700;
        }

        .profile-score-caption {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
        }

        .profile-score-caption strong {
          color: #fff;
          font-size: 16px;
        }

        .profile-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .profile-metric-card {
          min-height: 116px;
          padding: 18px;
          border: 1px solid rgba(0, 212, 255, 0.16);
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(10, 18, 38, 0.94), rgba(13, 25, 48, 0.78));
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.20);
        }

        .profile-metric-card span,
        .profile-metric-card small {
          display: block;
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          line-height: 1.35;
        }

        .profile-metric-card strong {
          display: block;
          margin: 8px 0 4px;
          color: #fff;
          font-size: clamp(22px, 4vw, 30px);
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .profile-metric-card--empty {
          border-style: dashed;
          opacity: 0.78;
        }

        .profile-metric-card--empty strong {
          color: rgba(255, 255, 255, 0.72);
          font-size: clamp(18px, 3.3vw, 24px);
        }

        .profile-page :global([data-tour-id='tour-profile-personal']),
        .profile-page :global([data-tour-id='tour-profile-game']),
        .profile-coach-personalization {
          border: 1px solid rgba(0, 212, 255, 0.14) !important;
          border-radius: 22px !important;
          background:
            linear-gradient(135deg, rgba(10, 18, 38, 0.96), rgba(13, 25, 48, 0.82)) !important;
          box-shadow: 0 14px 42px rgba(0, 0, 0, 0.24) !important;
        }

        .profile-coach-personalization {
          padding: 20px;
          margin-bottom: 24px;
        }

        .profile-section-heading {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 18px;
        }

        .profile-section-heading h2 {
          margin: 0 0 5px;
          color: #fff;
          font-size: 18px;
          font-weight: 800;
        }

        .profile-section-heading p {
          margin: 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 13px;
          line-height: 1.5;
        }

        .profile-personalization-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .profile-personalization-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .profile-save-button {
          min-height: 46px;
          padding: 12px 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          border-radius: 14px;
          color: #001018;
          background: linear-gradient(135deg, #00d4ff, #67e8f9);
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 0 22px rgba(0, 212, 255, 0.20);
        }

        .profile-save-button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .profile-page :global(input),
        .profile-page :global(select),
        .profile-page :global(textarea) {
          min-height: 48px !important;
          padding: 14px 15px !important;
          border: 1px solid rgba(0, 212, 255, 0.18) !important;
          border-radius: 14px !important;
          background: rgba(4, 10, 24, 0.86) !important;
          color: #fff !important;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02) !important;
          outline: none !important;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease !important;
        }

        .profile-page :global(textarea) {
          min-height: 130px !important;
          line-height: 1.5 !important;
        }

        .profile-page :global(input:focus),
        .profile-page :global(select:focus),
        .profile-page :global(textarea:focus) {
          border-color: rgba(0, 212, 255, 0.72) !important;
          background: rgba(5, 13, 30, 0.96) !important;
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.12), 0 0 22px rgba(0, 212, 255, 0.12) !important;
        }

        .profile-page :global(label) {
          color: rgba(255, 255, 255, 0.70) !important;
          font-weight: 700 !important;
        }

        @media (max-width: 900px) {
          .profile-hero {
            grid-template-columns: 1fr;
          }

          .profile-score-panel {
            min-height: auto;
            padding: 18px;
            flex-direction: row;
            justify-content: flex-start;
          }

          .profile-score-orb {
            width: 118px;
            height: 118px;
            flex: 0 0 118px;
          }

          .profile-score-orb > div {
            width: 88px;
            height: 88px;
          }

          .profile-score-orb strong {
            font-size: 26px;
          }

          .profile-score-caption {
            align-items: flex-start;
            text-align: left;
          }

          .profile-metric-grid {
            grid-template-columns: 1fr;
          }

          .profile-personalization-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .profile-page {
            padding: 12px;
          }

          .profile-hero {
            border-radius: 20px;
          }

          .profile-hero-actions {
            flex-direction: column;
          }

          .profile-hero-link {
            width: 100%;
          }

          .profile-page :global(button) {
            min-height: 46px;
          }

          .profile-personalization-actions,
          .profile-save-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}

