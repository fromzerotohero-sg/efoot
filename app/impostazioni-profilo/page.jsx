'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import {
  RefreshCw, CheckCircle2, AlertCircle, X,
  Zap, LogOut, BookOpen, Gift, Pencil
} from 'lucide-react'
import LanguageSwitch from '@/components/LanguageSwitch'
import ThemeToggle from '@/components/ThemeToggle'


/** Hub Account & Utility stile app: identita reale, HP reali, utility di sistema, logout reale.
 *  Stili inline: la pagina ha gia un blocco styled-jsx e il componente deve restare indipendente. */
function AccountUtilitySection({ t, lang, router }) {
  const [account, setAccount] = React.useState({ name: '', email: '' })
  const [hpBalance, setHpBalance] = React.useState(null)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('metalgate_user')
      if (raw) {
        const parsed = JSON.parse(raw)
        const name = String(parsed?.username || '').trim()
        const email = String(parsed?.email || '').trim()
        setAccount({ name: name || (email ? email.split('@')[0] : ''), email })
      }
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    const fetchBalance = async () => {
      try {
        let token = localStorage.getItem('auth_token')
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token || cancelled) return
        const res = await fetch('/api/credits/usage', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          cache: 'no-store'
        })
        if (!res.ok || cancelled) return
        const data = await res.json().catch(() => null)
        const balance = Number(data?.balance_remaining)
        if (!cancelled && Number.isFinite(balance)) setHpBalance(balance)
      } catch {
        /* saldo non disponibile: niente pill */
      }
    }
    fetchBalance()
    window.addEventListener('credits-consumed', fetchBalance)
    window.addEventListener('credits-accredited', fetchBalance)
    return () => {
      cancelled = true
      window.removeEventListener('credits-consumed', fetchBalance)
      window.removeEventListener('credits-accredited', fetchBalance)
    }
  }, [])

  const handleLogout = () => {
    fetch('/api/prelaunch/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('auth_token')
    localStorage.removeItem('metalgate_user')
    try {
      sessionStorage.removeItem('dashboard_coach_mode_modal_seen_session_v1')
    } catch {
      /* ignore */
    }
    router.push('/login')
  }

  const initial = (account.name || account.email || 'H').charAt(0).toUpperCase()

  const st = {
    section: {
      display: 'flex', flexDirection: 'column', gap: 16,
      marginBottom: 16, padding: '16px 18px',
      borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border-soft)'
    },
    head: { display: 'flex', alignItems: 'center', gap: 12 },
    avatar: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
      background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
      color: 'var(--accent)', fontSize: 19, fontWeight: 900
    },
    idBlock: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 },
    idName: { fontSize: 16, fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    idMail: { fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    hp: {
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '6px 12px', borderRadius: 999, flexShrink: 0,
      background: 'rgba(255, 203, 5, 0.16)', border: '1px solid rgba(255, 203, 5, 0.45)',
      color: 'var(--text-main)', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap'
    },
    grid: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
    item: { display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40 },
    label: { fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' },
    link: {
      display: 'inline-flex', alignItems: 'center', gap: 8,
      minHeight: 40, padding: '9px 14px', borderRadius: 10,
      border: '1px solid var(--border-soft)', background: 'var(--surface-2)',
      color: 'var(--text-main)', fontSize: 13, fontWeight: 600,
      fontFamily: 'inherit', textDecoration: 'none', cursor: 'pointer'
    },
    logout: {
      color: '#d93025', borderColor: 'rgba(217, 48, 37, 0.32)', background: 'rgba(217, 48, 37, 0.10)'
    }
  }

  return (
    <section style={st.section} aria-label="Account">
      <div style={st.head}>
        <span style={st.avatar} aria-hidden="true">{initial}</span>
        <div style={st.idBlock}>
          <span style={st.idName}>{account.name || t('profile')}</span>
          {account.email ? <span style={st.idMail}>{account.email}</span> : null}
        </div>
        {typeof hpBalance === 'number' && (
          <a href="/gestione-profilo" style={{ ...st.hp, textDecoration: 'none' }} title="Hero Points">
            <Zap size={13} />
            {hpBalance} HP
          </a>
        )}
      </div>

      <div style={st.grid}>
        <div style={st.item}>
          <span style={st.label}>{(lang === 'en' || lang === 'es') ? 'Language' : 'Lingua'}</span>
          <LanguageSwitch />
        </div>
        <div style={st.item}>
          <span style={st.label}>{(lang === 'en' || lang === 'es') ? 'Theme' : 'Tema'}</span>
          <ThemeToggle />
        </div>
        <a style={st.link} href="/guida">
          <BookOpen size={16} />
          <span>{t('guide')}</span>
        </a>
        <a style={st.link} href="https://tornei.fromzerotohero.io/" target="_blank" rel="noopener noreferrer">
          <Gift size={16} />
          <span>Tornei</span>
        </a>
        <button type="button" style={{ ...st.link, ...st.logout }} onClick={handleLogout}>
          <LogOut size={16} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </section>
  )
}

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
  const [editingField, setEditingField] = React.useState(null) // { key, type, label }
  const [editValue, setEditValue] = React.useState('')
  const [editSaving, setEditSaving] = React.useState(false)
  const [editError, setEditError] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [toast, setToast] = React.useState(null) // { message, type: 'success' | 'error' }
  
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
        setToast({ type: 'error', message: err.message || t('errorProfileLoad') })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router, t])

  // Blocca lo scroll del body quando la modale di editing è aperta
  // (evita il salto a fondo pagina su mobile quando l'input riceve il focus)
  React.useEffect(() => {
    if (!editingField) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editingField])

  // Ricarica i dati profilo dal server (dopo una modifica singola)
  const reloadProfileData = React.useCallback(async () => {
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) return
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      if (!res.ok) return
      const fresh = await res.json()
      if (fresh) {
        setProfileData(fresh)
        setProfile({
          first_name: fresh.first_name || '',
          last_name: fresh.last_name || '',
          current_division: fresh.current_division || '',
          favorite_team: fresh.favorite_team || '',
          team_name: fresh.team_name || '',
          ai_name: fresh.ai_name || '',
          how_to_remember: fresh.how_to_remember || '',
          hours_per_week: fresh.hours_per_week || null,
          common_problems: fresh.common_problems || []
        })
      }
    } catch {
      /* ricarica non critica */
    }
  }, [])

  // Editor singolo campo: le card metriche sono cliccabili e modificabili.
  // Contratti reali: campi AI -> /api/supabase/save-ai-info (whitelist); anagrafica -> /api/supabase/save-profile.
  const FIELD_EDITOR_TYPES = {
    first_name: { type: 'text', target: 'profile' },
    last_name: { type: 'text', target: 'profile' },
    favorite_team: { type: 'text', target: 'profile' },
    ai_name: { type: 'text', target: 'ai-info' },
    how_to_remember: { type: 'textarea', target: 'profile' },
    current_division: { type: 'text', target: 'profile' },
    team_name: { type: 'text', target: 'profile' },
    platform: { type: 'select', options: ['console', 'pc', 'mobile', 'other'], target: 'ai-info' },
    pass_level: { type: 'select', options: ['pa1', 'pa2', 'pa3'], target: 'ai-info' },
    ai_weak_point: { type: 'select', options: ['defence', 'attack', 'set_pieces', 'transitions', 'final_minutes'], target: 'ai-info' },
    favourite_player_name: { type: 'text', target: 'ai-info' }
  }

  const openFieldEditor = (card) => {
    const config = FIELD_EDITOR_TYPES[card.field]
    if (!config) return
    const raw = card.field === 'current_division'
      ? profileData?.current_division
      : card.field === 'team_name'
        ? (profileData?.team_name || profileData?.favorite_team)
        : profileData?.[card.field]
    setEditingField({ key: card.field, label: card.label, ...config })
    setEditValue(raw == null ? '' : String(raw))
    setEditError(null)
  }

  const saveFieldEdit = async () => {
    if (!editingField) return
    setEditSaving(true)
    setEditError(null)
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

      if (editingField.target === 'ai-info') {
        const res = await fetch('/api/supabase/save-ai-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ [editingField.key]: editValue })
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || t('errorProfileSave'))
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        }
      } else {
        const nextProfile = { ...profile, [editingField.key]: editValue }
        const res = await fetch('/api/supabase/save-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(nextProfile)
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || t('errorProfileSave'))
        }
      }

      await reloadProfileData()
      setEditingField(null)
      setToast({
        type: 'success',
        message: (lang === 'en' || lang === 'es') ? 'Saved correctly' : 'Salvato correttamente'
      })
    } catch (err) {
      setEditError(err.message || t('errorProfileSave'))
      setToast({
        type: 'error',
        message: err.message || t('errorProfileSave')
      })
    } finally {
      setEditSaving(false)
    }
  }

  // Salva profilo (incrementale)

  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Skip sezione

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
  const cleanValue = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ')
    if (value === null || value === undefined || value === '') return null
    return String(value)
  }
  const FIELD_LABELS = {
    platform: { console: 'Console', pc: 'PC', mobile: 'Mobile', other: (lang === 'en' || lang === 'es') ? 'Other' : 'Altro' },
    pass_level: { pa1: 'PA1', pa2: 'PA2', pa3: 'PA3' },
    ai_weak_point: {
      defence: (lang === 'en' || lang === 'es') ? 'Defence' : 'Difesa',
      attack: (lang === 'en' || lang === 'es') ? 'Attack' : 'Attacco',
      set_pieces: (lang === 'en' || lang === 'es') ? 'Set pieces' : 'Palle inattive',
      transitions: (lang === 'en' || lang === 'es') ? 'Transitions' : 'Transizioni',
      final_minutes: (lang === 'en' || lang === 'es') ? 'Final minutes' : 'Minuti finali'
    }
  }
  const fieldValue = (field, value) => {
    const raw = cleanValue(value)
    if (!raw) return raw
    const map = FIELD_LABELS[field]
    if (!map) return raw
    return map[raw] || raw
  }
  const profileOverviewCards = [
    {
      field: 'first_name',
      label: (lang === 'en' || lang === 'es') ? 'Name' : 'Nome',
      value: cleanValue(profile.first_name),
      hint: (lang === 'en' || lang === 'es') ? 'How Hero calls you' : 'Come ti chiama Hero'
    },
    {
      field: 'last_name',
      label: (lang === 'en' || lang === 'es') ? 'Last name' : 'Cognome',
      value: cleanValue(profile.last_name),
      hint: (lang === 'en' || lang === 'es') ? 'Personal data' : 'Dati anagrafici'
    },
    {
      field: 'favorite_team',
      label: (lang === 'en' || lang === 'es') ? 'Favourite club' : 'Squadra del cuore',
      value: cleanValue(profile.favorite_team),
      hint: (lang === 'en' || lang === 'es') ? 'The club you support' : 'La squadra che tifi'
    },
    {
      field: 'ai_name',
      label: (lang === 'en' || lang === 'es') ? 'Coach name' : 'Nome del tuo coach',
      value: cleanValue(profile.ai_name),
      hint: (lang === 'en' || lang === 'es') ? 'How you call your coach' : 'Come chiami il tuo coach'
    },
    {
      field: 'how_to_remember',
      label: (lang === 'en' || lang === 'es') ? 'Coach memory note' : 'Nota memoria per il coach',
      value: cleanValue(profile.how_to_remember),
      hint: (lang === 'en' || lang === 'es') ? 'What Hero should remember' : 'Cosa deve ricordare Hero'
    },

    {
      label: (lang === 'en' || lang === 'es') ? 'Division' : 'Divisione',
      field: 'current_division',

      value: cleanValue(profile.current_division),
      hint: (lang === 'en' || lang === 'es') ? 'Competitive level' : 'Livello competitivo'
    },
    {
      label: (lang === 'en' || lang === 'es') ? 'In-game team' : 'Team in game',
      field: 'team_name',

      value: cleanValue(profile.team_name || profile.favorite_team),
      hint: (lang === 'en' || lang === 'es') ? 'Identity used in analyses' : 'Identita usata nelle analisi'
    },
    {
      label: (lang === 'en' || lang === 'es') ? 'Platform' : 'Piattaforma',
      field: 'platform',

      value: fieldValue('platform', profileData?.platform),
      hint: (lang === 'en' || lang === 'es') ? 'From Coach Gym' : 'Da Palestra Coach'
    },
    {
      label: (lang === 'en' || lang === 'es') ? 'Pass level' : 'Livello passaggi',
      field: 'pass_level',

      value: fieldValue('pass_level', profileData?.pass_level),
      hint: (lang === 'en' || lang === 'es') ? 'Control profile' : 'Profilo comandi'
    },
    {
      label: (lang === 'en' || lang === 'es') ? 'Weak point' : 'Punto debole',
      field: 'ai_weak_point',

      value: fieldValue('ai_weak_point', profileData?.ai_weak_point || profile.common_problems),
      hint: (lang === 'en' || lang === 'es') ? 'What the coach should watch' : 'Cosa deve osservare il coach'
    },
    {
      label: (lang === 'en' || lang === 'es') ? 'Favourite player' : 'Giocatore preferito',
      field: 'favourite_player_name',

      value: cleanValue(profileData?.favourite_player_name),
      hint: (lang === 'en' || lang === 'es') ? 'Useful for examples' : 'Utile per esempi e consigli'
    }
  ]

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--accent)' }} />
        <div>{t('loadingProfile')}</div>
      </main>
    )
  }

  return (
    <main data-tour-id="tour-profile-intro" className="profile-page">
      {/* Page Header */}
      {/* Header compatto: titolo + chip completamento (niente hero glow) */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            {(lang === 'en' || lang === 'es') ? 'Player identity' : 'Identita giocatore'}
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
            {t('profileSettings')}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-dim)', maxWidth: 560 }}>
            {lang === 'en'
              ? 'Your profile is the memory layer of the coach: the more complete it is, the more personal every suggestion becomes.'
              : 'Il profilo e la memoria del coach: piu e completo, piu ogni consiglio diventa personale.'}
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
            padding: '6px 12px', borderRadius: 999, flexShrink: 0,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', color: 'var(--accent)'
          }}
          aria-label={`${Math.round(safeCompletionScore)}%`}
        >
          <strong style={{ fontSize: 15, fontWeight: 900 }}>{Math.round(safeCompletionScore)}%</strong>
          <small style={{ fontSize: 11, fontWeight: 700 }}>{getLevelText(completionLevel)}</small>
        </span>
      </header>

      {/* Account & Utility: hub stile app — identita, HP reali, utility di sistema, logout reale */}
      <AccountUtilitySection t={t} lang={lang} router={router} />

      <section className="profile-metric-grid" aria-label={(lang === 'en' || lang === 'es') ? 'Profile overview' : 'Panoramica profilo'}>
        {profileOverviewCards.map((card) => (
          <button
            type="button"
            className={`profile-metric-card profile-metric-card--editable ${card.value ? '' : 'profile-metric-card--empty'}`}
            key={card.label}
            onClick={() => openFieldEditor(card)}
            aria-label={`${card.label}: ${card.value || 'modifica'}`}
            style={{ color: 'var(--text-main)' }}
          >
            <span className="profile-metric-card-head">
              <span>{card.label}</span>
              <Pencil size={13} aria-hidden="true" />
            </span>
            <strong>{card.value || ((lang === 'en' || lang === 'es') ? 'Missing' : 'Da completare')}</strong>
            <small>{card.hint}</small>
          </button>
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


      {/* Foglio modifica campo (stile app): si apre dalla card cliccata */}
      {editingField && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingField.label}
          onClick={() => !editSaving && setEditingField(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(3, 7, 18, 0.72)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(480px, 100%)',
              maxHeight: '100dvh',
              overflowY: 'auto',
              borderRadius: '20px 20px 0 0',
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderBottom: 'none',
              padding: '18px 18px calc(20px + env(safe-area-inset-bottom, 0px))',
              display: 'flex', flexDirection: 'column', gap: 14,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border-soft)', margin: '0 auto' }} aria-hidden="true" />
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-main)' }}>
              {editingField.label}
            </h3>

            {editingField.type === 'select' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {editingField.options.map((opt) => {
                  const active = editValue === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setEditValue(opt)}
                      style={{
                        minHeight: 42, padding: '9px 16px', borderRadius: 999,
                        border: active ? '1px solid var(--accent-border)' : '1px solid var(--border-soft)',
                        background: active ? 'var(--accent-bg)' : 'var(--surface-2)',
                        color: active ? 'var(--accent)' : 'var(--text-main)',
                        fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer'
                      }}
                    >
                      {fieldValue(editingField.key, opt)}
                    </button>
                  )
                })}
              </div>
            ) : editingField.type === 'textarea' ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                maxLength={1000}
                rows={5}
                style={{
                  width: '100%', padding: '12px 14px', resize: 'vertical',
                  borderRadius: 12, border: '1px solid var(--border-soft)',
                  background: 'var(--surface-2)', color: 'var(--text-main)',
                  fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5
                }}
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                maxLength={255}
                style={{
                  width: '100%', minHeight: 48, padding: '12px 14px',
                  borderRadius: 12, border: '1px solid var(--border-soft)',
                  background: 'var(--surface-2)', color: 'var(--text-main)',
                  fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
                }}
              />
            )}

            {editError && (
              <p style={{ margin: 0, fontSize: 13, color: '#d93025' }}>{editError}</p>
            )}

            <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--surface)', paddingTop: 10, marginTop: 'auto' }}>
              <button
                type="button"
                onClick={saveFieldEdit}
                disabled={editSaving}
                style={{
                  flex: 1, minHeight: 48, border: 'none', borderRadius: 12,
                  background: editSaving ? 'var(--surface-2)' : 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                  color: editSaving ? 'var(--text-dim)' : 'var(--accent-ink)',
                  fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: editSaving ? 'wait' : 'pointer'
                }}
              >
                {editSaving ? t('saving') : t('save')}
              </button>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                disabled={editSaving}
                style={{
                  minHeight: 48, padding: '0 18px', borderRadius: 12,
                  border: '1px solid var(--border-soft)', background: 'transparent',
                  color: 'var(--text-dim)', fontSize: 14, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer'
                }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`


        .profile-page {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: clamp(14px, 3vw, 28px);
          min-height: 100vh;
        }


        .profile-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        
        .profile-metric-card--editable {
          font: inherit;
          text-align: left;
          cursor: pointer;
          width: 100%;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }

        .profile-metric-card--editable:hover {
          border-color: var(--accent-border);
          transform: translateY(-2px);
        }

        .profile-metric-card--editable:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .profile-metric-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: var(--text-dim);
        }

.profile-metric-card {
          min-height: 116px;
          padding: 18px;
          border: 1px solid var(--border-soft);
          border-radius: 18px;
          background: var(--surface);
          color: var(--text-main);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.08);
        }

        .profile-metric-card span,
        .profile-metric-card small {
          display: block;
          color: var(--text-dim);
          font-size: 12px;
          line-height: 1.35;
        }

        .profile-metric-card strong {
          display: block;
          margin: 8px 0 4px;
          color: var(--text-main);
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
          color: var(--text-dim);
          font-size: clamp(16px, 3vw, 22px);
          font-weight: 700;
        }

        .profile-page :global(input),
        .profile-page :global(select),
        .profile-page :global(textarea) {
          min-height: 48px !important;
          padding: 14px 15px !important;
          border: 1px solid var(--border-soft) !important;
          border-radius: 14px !important;
          background: var(--surface) !important;
          color: var(--text-main) !important;
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
          border-color: var(--accent-border) !important;
          background: var(--surface-2) !important;
          box-shadow: 0 0 0 3px var(--accent-bg) !important;
        }

        .profile-page :global(label) {
          color: var(--text-dim) !important;
          font-weight: 700 !important;
        }

        @media (max-width: 640px) {
          .profile-page {
            padding: 12px;
          }

          .profile-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .profile-page :global(button) {
            min-height: 46px;
          }
        }
      `}</style>
    </main>
  )
}

