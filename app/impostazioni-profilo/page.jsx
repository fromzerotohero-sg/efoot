'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Save, SkipForward, RefreshCw, User, Gamepad2, Brain, CheckCircle2, AlertCircle, BarChart3, X, Wallet, Trophy, Zap } from 'lucide-react'
import Link from 'next/link'
import CoachFeedbackChat from '@/components/CoachFeedbackChat'

export default function ImpostazioniProfiloPage() {
  const { t } = useTranslation()
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
    common_problems: [],
    leaderboard_consent: false,
    nickname: ''
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

  // Carica profilo esistente (richiamabile per ricarica manuale)
  const fetchProfile = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')

      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        if (session?.session) {
          token = session.session.access_token
        }
      }

      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        throw new Error(t('errorProfileLoad'))
      }

      const profileData = await res.json()

      if (profileData && typeof profileData === 'object') {
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
          common_problems: profileData.common_problems || [],
          leaderboard_consent: Boolean(profileData.leaderboard_consent),
          nickname: profileData.nickname || ''
        })
      }
    } catch (err) {
      console.error('[Impostazioni Profilo] Error loading profile:', err)
      setError(err?.message || t('errorProfileLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // Carica profilo solo al mount. Non rifare fetch a ogni cambio di fetchProfile (es. re-render con t diverso)
  // altrimenti si sovrascrivono le modifiche non salvate (es. nome cambiato in "attilio" → refetch → torna "Giovanni").
  React.useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      const saveProfileUrl = '/api/supabase/save-profile'
      const response = await fetch(saveProfileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile),
        redirect: 'manual'
      })

      if (response.type === 'opaqueredirect' || (response.status >= 301 && response.status <= 303)) {
        router.push('/login')
        return
      }
      if (!response.ok) {
        let errMsg = t('errorProfileSave')
        if (response.status === 405) {
          errMsg = 'Salvataggio non disponibile con questo tipo di richiesta. Usa il pulsante Salva.'
        } else {
          try {
            const errorData = await response.json()
            if (errorData?.error) errMsg = errorData.error
          } catch (_) { /* risposta non JSON */ }
        }
        throw new Error(errMsg)
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
          common_problems: p.common_problems ?? prev.common_problems,
          leaderboard_consent: p.leaderboard_consent ?? prev.leaderboard_consent,
          nickname: p.nickname ?? prev.nickname
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
          common_problems: p.common_problems ?? null,
          leaderboard_consent: p.leaderboard_consent ?? false,
          nickname: p.nickname ?? null
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
          common_problems: Array.isArray(p.common_problems) ? p.common_problems : prev.common_problems,
          leaderboard_consent: p.leaderboard_consent != null ? p.leaderboard_consent : prev.leaderboard_consent,
          nickname: p.nickname != null ? p.nickname : prev.nickname
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
        setTimeout(() => window.dispatchEvent(new CustomEvent('leaderboard-updated')), 1500)
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

  // Full-page loading solo al primo caricamento (senza dati profilo)
  if (loading && !profileData) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loadingProfile')}</div>
      </main>
    )
  }

  return (
    <main data-tour-id="tour-profile-intro" className="p-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold neon-text mb-8">
            <User size={24} color="var(--primary-cyan)" />
            {t('profileSettings')}
          </h1>
          <p className="text-sm text-[rgba(0, 212, 255, 0.7)]">
            {t('completeYourProfile')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => fetchProfile()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              borderRadius: '8px',
              color: 'var(--primary-cyan)',
              fontSize: '14px',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
            aria-label={t('refresh') || 'Ricarica profilo'}
          >
            <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
            {t('refresh') || 'Ricarica'}
          </button>
          <Link
            href="/gestione-profilo"
            className="neon-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'rgba(255, 149, 0, 0.1)',
              borderColor: 'var(--border-orange)',
              color: 'var(--primary-orange)',
              fontSize: '14px'
            }}
          >
            <Wallet size={16} />
            {t('goToHeroPoints')}
          </Link>
        </div>
      </div>

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

      {/* Barra Profilazione (stile allineato a Dashboard / AIKnowledgeBar) */}
      <div style={{
        backgroundColor: '#1a1d24',
        borderRadius: '16px',
        padding: 'clamp(16px, 4vw, 24px)',
        marginBottom: '24px',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '600' }}>{t('profiling')}</h2>
        </div>
        
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '8px',
          position: 'relative'
        }}>
          <div style={{
            width: `${completionScore}%`,
            height: '100%',
            backgroundColor: completionScore >= 87.5 ? '#00ff88' : completionScore >= 50 ? '#00d4ff' : '#ffaa00',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#000'
          }}>
            {completionScore > 10 && `${Math.round(completionScore)}%`}
          </div>
        </div>
        
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
          {completionScore >= 100
            ? getLevelText(completionLevel)
            : `${Math.round(completionScore)}% — ${t('completeFor100')}`}
        </div>
        
        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
          {t('moreYouAnswer')}
        </div>
      </div>

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
            background: 'rgba(0, 212, 255, 0.1)',
            borderColor: 'rgba(0, 212, 255, 0.3)',
            color: '#00d4ff',
            flexShrink: 0
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
            value={profile.first_name ?? ''}
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
            value={profile.last_name ?? ''}
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
            {t('currentDivision')}
          </label>
          <select
            value={profile.current_division ?? ''}
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
            value={profile.favorite_team ?? ''}
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
            value={profile.team_name ?? ''}
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

      {/* Sezione: Classifica mensile (From Zero to Hero) */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Trophy size={20} color="var(--neon-orange)" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('classificaMensile')}</h2>
        </div>
        {/* Consenso classifica rimosso: tutti gli eleggibili entrano in classifica */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('nickname')}
          </label>
          <input
            type="text"
            value={profile.nickname ?? ''}
            onChange={(e) => setProfile(prev => ({ ...prev, nickname: e.target.value.trim().slice(0, 255) }))}
            placeholder={t('nicknamePlaceholder')}
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
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#666' }}>{t('nicknameHint')}</p>
        </div>
        <button
          onClick={() => handleSave(t('classificaMensile'))}
          disabled={saving}
          style={{
            padding: '12px 20px',
            backgroundColor: saving ? '#2a2a2a' : 'var(--neon-orange)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Save size={18} />
          {saving ? t('saving') : t('save')}
        </button>
      </div>

      {/* Sezione: Preferenze IA */}
      <div data-tour-id="tour-profile-ai" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Brain size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('aiPreferences')}</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('aiName')}
          </label>
          <input
            type="text"
            value={profile.ai_name ?? ''}
            onChange={(e) => setProfile(prev => ({ ...prev, ai_name: e.target.value }))}
            placeholder={t('aiNamePlaceholder')}
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
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('howToRemember')}
          </label>
          <textarea
            value={profile.how_to_remember ?? ''}
            onChange={(e) => setProfile(prev => ({ ...prev, how_to_remember: e.target.value }))}
            placeholder={t('howToRememberPlaceholder')}
            maxLength={1000}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSave(t('aiPreferences'))}
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
            onClick={() => handleSkip(t('aiPreferences'))}
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

      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
        {t('aiInfoHintInProfile')}
      </p>

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
    </main>
  )
}

