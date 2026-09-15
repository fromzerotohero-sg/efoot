'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { OPEN_INSTALL_APP_PROMPT_EVENT } from '@/lib/pwaInstall'
import {
  CheckCircle2, AlertCircle, X,
  Zap, LogOut, BookOpen, Gift, Pencil, Wallet,
  Download, LifeBuoy, UserCog, ChevronRight
} from 'lucide-react'
import LanguageSwitch from '@/components/LanguageSwitch'
import ThemeToggle from '@/components/ThemeToggle'
import PageLoading from '@/components/PageLoading'

/** Token auth condiviso: localStorage prima, sessione Supabase come fallback. */
async function getAuthToken() {
  let token = localStorage.getItem('auth_token')
  if (!token && supabase) {
    const { data: session } = await supabase.auth.getSession()
    token = session?.session?.access_token
  }
  return token
}

/** Scocca sezione stile impostazioni app: titolo piccolo + card contenuto. */
function SettingsSection({ title, children, style }) {
  return (
    <section style={{ marginBottom: 22, ...style }}>
      <h2 style={{
        margin: '0 0 8px', padding: '0 4px',
        fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-dim)'
      }}>
        {title}
      </h2>
      <div style={{
        borderRadius: 18, background: 'var(--surface)',
        border: '1px solid var(--border-soft)', overflow: 'hidden'
      }}>
        {children}
      </div>
    </section>
  )
}

/** Riga stile lista impostazioni: icona, testo, controllo a destra. */
function SettingsRow({ icon: Icon, label, sub, control, onClick, href, external, danger, disabled, last }) {
  const base = {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', minHeight: 52, padding: '12px 16px',
    border: 'none', borderBottom: last ? 'none' : '1px solid var(--border-softer)',
    background: 'transparent', fontFamily: 'inherit', textAlign: 'left',
    textDecoration: 'none', cursor: onClick || href ? 'pointer' : 'default',
    opacity: disabled ? 0.55 : 1, boxSizing: 'border-box'
  }
  const content = (
    <>
      {Icon && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: danger ? 'var(--surface-2)' : 'var(--accent-bg)',
          border: `1px solid ${danger ? 'var(--border-soft)' : 'var(--accent-border)'}`,
          color: danger ? 'var(--danger-text)' : 'var(--accent)'
        }} aria-hidden="true">
          <Icon size={16} />
        </span>
      )}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{
          fontSize: 14, fontWeight: 700,
          color: danger ? 'var(--danger-text)' : 'var(--text-main)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {label}
        </span>
        {sub ? <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{sub}</span> : null}
      </span>
      {control}
      {(href || onClick) && !control && (
        <ChevronRight size={16} color="var(--text-dim)" aria-hidden="true" style={{ flexShrink: 0 }} />
      )}
    </>
  )
  if (href && external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={base}>{content}</a>
  }
  if (href) {
    return <Link href={href} style={base}>{content}</Link>
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={base}>{content}</button>
  )
}

/** Header identita: avatar con iniziale, username, email e chip completamento profilo. */
function IdentitySection({ t, account, safeCompletionScore, completionText }) {
  const initial = (account.name || account.email || 'H').charAt(0).toUpperCase()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
        color: 'var(--accent)', fontSize: 19, fontWeight: 900
      }} aria-hidden="true">
        {initial}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {account.name || t('profile')}
        </span>
        {account.email ? (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {account.email}
          </span>
        ) : null}
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
        <small style={{ fontSize: 11, fontWeight: 700 }}>{completionText}</small>
      </span>
    </div>
  )
}

/** Sezione Hero Points: saldo reale, tabella costi, disclaimer rimborso, link acquisto. */
function HeroPointsSection({ t, lang }) {
  const [hpBalance, setHpBalance] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    const fetchBalance = async () => {
      try {
        const token = await getAuthToken()
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

  const rows = lang === 'en'
    ? [
        { service: 'Hero Chat: ask the AI coach', cost: '2 HP' },
        { service: 'Card Advisor: evaluate a new card', cost: '2 HP' },
        { service: 'Match analysis', cost: '2 HP' },
        { service: 'Game stats extraction', cost: '2-4 HP' },
        { service: 'Pre-match countermeasures', cost: '2 HP' },
        { service: 'Player or coach extraction', cost: '2 HP' },
        { service: 'Live Coach start', cost: '2 HP' },
        { service: 'Live Coach extra minute', cost: '5 HP/min' }
      ]
    : [
        { service: 'Hero Chat: chiedi al Coach AI', cost: '2 HP' },
        { service: 'Card Advisor: valuta una nuova carta', cost: '2 HP' },
        { service: 'Analisi partita', cost: '2 HP' },
        { service: 'Estrazione statistiche di gioco', cost: '2-4 HP' },
        { service: 'Contromisure pre-partita', cost: '2 HP' },
        { service: 'Estrazione giocatore o allenatore', cost: '2 HP' },
        { service: 'Live Coach avvio', cost: '2 HP' },
        { service: 'Live Coach minuto extra', cost: '5 HP/min' }
      ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--border-softer)', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', flex: 1, minWidth: 200 }}>
          {lang === 'en'
            ? 'Hero Points are for the moments where you want help from the coach: a better card choice, a match plan, or a clear next step.'
            : 'Gli Hero Points servono quando vuoi un aiuto concreto dal Coach: scegliere meglio una carta, preparare un match o capire la prossima cosa da migliorare.'}
        </p>
        {typeof hpBalance === 'number' && (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 999, flexShrink: 0,
              background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
              color: 'var(--gold-text)', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap'
            }}
            title="Hero Points"
          >
            <Zap size={13} />
            {hpBalance} HP
          </span>
        )}
      </div>

      <div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12,
          padding: '10px 16px', background: 'var(--gold-bg)',
          borderBottom: '1px solid var(--border-soft)',
          fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
          color: 'var(--text-main)'
        }}>
          <span>{t('profileHpService')}</span>
          <span>HP</span>
        </div>
        {rows.map((row, idx) => (
          <div
            key={`${row.service}-${idx}`}
            style={{
              display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12,
              alignItems: 'center', padding: '11px 16px',
              borderBottom: idx === rows.length - 1 ? 'none' : '1px solid var(--border-softer)'
            }}
          >
            <span style={{ color: 'var(--text-main)', fontSize: 13, overflowWrap: 'anywhere' }}>{row.service}</span>
            <strong style={{ color: 'var(--gold-text)', whiteSpace: 'nowrap', fontSize: 13 }}>{row.cost}</strong>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, padding: '12px 16px', fontSize: 12, lineHeight: 1.45, color: 'var(--text-dim)', borderTop: '1px solid var(--border-softer)' }}>
        {lang === 'en'
          ? 'If a platform error prevents an analysis from completing, the HP are automatically returned.'
          : 'Se un errore della piattaforma blocca un’analisi, gli HP vengono riaccreditati automaticamente.'}
        <br />
        {lang === 'en'
          ? 'Use them when you want a clear answer, a card decision or a tactical plan.'
          : 'Usali quando vuoi una risposta chiara, una scelta sulle carte o un piano tattico.'}
      </p>

      <div style={{ padding: '0 16px 16px' }}>
        <a
          href="https://home.fromzerotohero.io/dashboard?usage"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            minHeight: 44, padding: '10px 18px', borderRadius: 999, width: '100%', boxSizing: 'border-box',
            background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
            color: 'var(--gold-text)', textDecoration: 'none', fontSize: 14, fontWeight: 900
          }}
        >
          <Wallet size={16} />
          {t('profileBuyHp')}
        </a>
      </div>
    </div>
  )
}

const NOTIFICATION_PREF_KEYS = ['daily_spin', 'weekly_goals', 'credits', 'leaderboard', 'coach']
const NOTIFICATION_PREF_LABEL_KEYS = {
  daily_spin: 'profileNotifDailySpin',
  weekly_goals: 'profileNotifWeeklyGoals',
  credits: 'profileNotifCredits',
  leaderboard: 'profileNotifLeaderboard',
  coach: 'profileNotifCoach'
}

/** Sezione Notifiche: toggle per categoria su /api/notifications/prefs (default ON). */
function NotificationsSection({ t, lang, onToast }) {
  const [prefs, setPrefs] = React.useState(null)
  const [loadError, setLoadError] = React.useState(false)
  const [savingKey, setSavingKey] = React.useState(null)

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const token = await getAuthToken()
        if (!token || cancelled) return
        const res = await fetch('/api/notifications/prefs', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })
        if (!res.ok) throw new Error('prefs load failed')
        const data = await res.json().catch(() => null)
        if (cancelled) return
        const serverPrefs = data?.prefs && typeof data.prefs === 'object' ? data.prefs : {}
        const next = {}
        for (const key of NOTIFICATION_PREF_KEYS) {
          next[key] = typeof serverPrefs[key] === 'boolean' ? serverPrefs[key] : true
        }
        setPrefs(next)
      } catch {
        if (!cancelled) setLoadError(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const togglePref = async (key) => {
    if (!prefs || savingKey) return
    const prev = prefs
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSavingKey(key)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('missing token')
      const res = await fetch('/api/notifications/prefs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] })
      })
      if (!res.ok) throw new Error('prefs save failed')
    } catch {
      setPrefs(prev)
      onToast({
        type: 'error',
        message: (lang === 'en' || lang === 'es')
          ? 'Error saving notification preference'
          : 'Errore nel salvataggio della preferenza'
      })
    } finally {
      setSavingKey(null)
    }
  }

  const renderSwitch = (key) => {
    const on = prefs ? prefs[key] : true
    const disabled = !prefs || savingKey === key
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t(NOTIFICATION_PREF_LABEL_KEYS[key])}
        disabled={disabled}
        onClick={() => togglePref(key)}
        style={{
          position: 'relative', flexShrink: 0,
          width: 46, height: 28, borderRadius: 999,
          border: `1px solid ${on ? 'var(--accent-border)' : 'var(--border-soft)'}`,
          background: on ? 'var(--accent-bg)' : 'var(--surface-3)',
          cursor: disabled ? 'wait' : 'pointer',
          transition: 'background 0.15s ease, border-color 0.15s ease'
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 3, left: on ? 21 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: on ? 'var(--accent)' : 'var(--text-dim)',
            transition: 'left 0.15s ease'
          }}
        />
      </button>
    )
  }

  return (
    <div>
      {prefs === null && !loadError && (
        <p style={{ margin: 0, padding: '14px 16px', fontSize: 13, color: 'var(--text-dim)' }}>{t('loading')}</p>
      )}
      {loadError && (
        <p style={{ margin: 0, padding: '14px 16px', fontSize: 13, color: 'var(--danger-text)' }}>
          {(lang === 'en' || lang === 'es')
            ? 'Notification preferences unavailable right now.'
            : 'Preferenze notifiche non disponibili al momento.'}
        </p>
      )}
      {NOTIFICATION_PREF_KEYS.map((key, idx) => (
        <div
          key={key}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            minHeight: 52, padding: '12px 16px',
            borderBottom: '1px solid var(--border-softer)'
          }}
        >
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
            {t(NOTIFICATION_PREF_LABEL_KEYS[key])}
          </span>
          {renderSwitch(key)}
        </div>
      ))}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          minHeight: 52, padding: '12px 16px', opacity: 0.55
        }}
        aria-disabled="true"
      >
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
          {t('profileNotifPushPhone')}
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 999, flexShrink: 0,
          background: 'var(--info-bg)', border: '1px solid var(--info-border)',
          color: 'var(--info-text)', fontSize: 11, fontWeight: 800
        }}>
          {t('profileComingSoon')}
        </span>
      </div>
    </div>
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
  const [account, setAccount] = React.useState({ name: '', email: '' })
  const [editingField, setEditingField] = React.useState(null) // { key, type, label }
  const [editValue, setEditValue] = React.useState('')
  const [editSaving, setEditSaving] = React.useState(false)
  const [editError, setEditError] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [toast, setToast] = React.useState(null) // { message, type: 'success' | 'error' }

  // Identita account da MetalGate (localStorage)
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
      const token = await getAuthToken()
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
      const token = await getAuthToken()
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

  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

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

  // Profilo di gioco: 11 campi in 3 gruppi, stessi editor bottom-sheet ed endpoint di salvataggio.
  const gameProfileGroups = [
    {
      label: t('profileGroupAnagrafica'),
      cards: [
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
        }
      ]
    },
    {
      label: t('profileGroupGameIdentity'),
      cards: [
        {
          field: 'team_name',
          label: (lang === 'en' || lang === 'es') ? 'In-game team' : 'Team in game',
          value: cleanValue(profile.team_name || profile.favorite_team),
          hint: (lang === 'en' || lang === 'es') ? 'Identity used in analyses' : 'Identita usata nelle analisi'
        },
        {
          field: 'favorite_team',
          label: (lang === 'en' || lang === 'es') ? 'Favourite club' : 'Squadra del cuore',
          value: cleanValue(profile.favorite_team),
          hint: (lang === 'en' || lang === 'es') ? 'The club you support' : 'La squadra che tifi'
        },
        {
          field: 'current_division',
          label: (lang === 'en' || lang === 'es') ? 'Division' : 'Divisione',
          value: cleanValue(profile.current_division),
          hint: (lang === 'en' || lang === 'es') ? 'Competitive level' : 'Livello competitivo'
        },
        {
          field: 'platform',
          label: (lang === 'en' || lang === 'es') ? 'Platform' : 'Piattaforma',
          value: fieldValue('platform', profileData?.platform),
          hint: (lang === 'en' || lang === 'es') ? 'From Coach Gym' : 'Da Palestra Coach'
        },
        {
          field: 'favourite_player_name',
          label: (lang === 'en' || lang === 'es') ? 'Favourite player' : 'Giocatore preferito',
          value: cleanValue(profileData?.favourite_player_name),
          hint: (lang === 'en' || lang === 'es') ? 'Useful for examples' : 'Utile per esempi e consigli'
        }
      ]
    },
    {
      label: t('profileGroupCoachAi'),
      cards: [
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
          field: 'ai_weak_point',
          label: (lang === 'en' || lang === 'es') ? 'Weak point' : 'Punto debole',
          value: fieldValue('ai_weak_point', profileData?.ai_weak_point || profile.common_problems),
          hint: (lang === 'en' || lang === 'es') ? 'What the coach should watch' : 'Cosa deve osservare il coach'
        },
        {
          field: 'pass_level',
          label: (lang === 'en' || lang === 'es') ? 'Pass level' : 'Livello passaggi',
          value: fieldValue('pass_level', profileData?.pass_level),
          hint: (lang === 'en' || lang === 'es') ? 'Control profile' : 'Profilo comandi'
        }
      ]
    }
  ]

  if (loading) {
    return <PageLoading label={t('loadingProfile')} />
  }

  return (
    <div data-tour-id="tour-profile-intro" className="profile-page">
      {/* Header compatto: titolo pagina */}
      <header style={{ marginBottom: 18 }}>
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
      </header>

      {/* 1. Identita */}
      <SettingsSection title={t('profile')}>
        <IdentitySection
          t={t}
          account={account}
          safeCompletionScore={safeCompletionScore}
          completionText={getLevelText(completionLevel)}
        />
      </SettingsSection>

      {/* 2. Hero Points */}
      <SettingsSection title="Hero Points">
        <HeroPointsSection t={t} lang={lang} />
      </SettingsSection>

      {/* 3. Profilo di gioco */}
      <SettingsSection title={t('profileSectionGame')}>
        <div style={{ padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {gameProfileGroups.map((group) => (
            <div key={group.label}>
              <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {group.label}
              </h3>
              <div className="profile-metric-grid" style={{ marginBottom: 0 }}>
                {group.cards.map((card) => (
                  <button
                    type="button"
                    className={`profile-metric-card profile-metric-card--editable ${card.value ? '' : 'profile-metric-card--empty'}`}
                    key={card.field}
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
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* 4. Notifiche */}
      <SettingsSection title={t('profileSectionNotifications')}>
        <NotificationsSection t={t} lang={lang} onToast={setToast} />
      </SettingsSection>

      {/* 5. Preferenze app */}
      <SettingsSection title={t('profileSectionPreferences')}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '12px 16px', borderBottom: '1px solid var(--border-softer)' }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
              {(lang === 'en' || lang === 'es') ? 'Language' : 'Lingua'}
            </span>
            <LanguageSwitch />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '12px 16px', borderBottom: '1px solid var(--border-softer)' }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
              {(lang === 'en' || lang === 'es') ? 'Theme' : 'Tema'}
            </span>
            <ThemeToggle />
          </div>
          <SettingsRow icon={BookOpen} label={t('guide')} href="/guida" />
          <SettingsRow icon={Gift} label="Tornei" href="https://tornei.fromzerotohero.io/" external />
          <SettingsRow
            icon={Download}
            label={t('pwaInstallOpenManual')}
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_INSTALL_APP_PROMPT_EVENT))}
            last
          />
        </div>
      </SettingsSection>

      {/* 6. Account */}
      <SettingsSection title={t('profileSectionAccount')}>
        <div>
          <SettingsRow
            icon={UserCog}
            label={t('profileManageAccount')}
            href="https://home.fromzerotohero.io/dashboard"
            external
          />
          <SettingsRow
            icon={LifeBuoy}
            label={t('profileSupport')}
            sub="support@fromzerotohero.io"
            href="mailto:support@fromzerotohero.io"
            external
          />
          <SettingsRow
            icon={LogOut}
            label={t('logout')}
            onClick={handleLogout}
            danger
            last
          />
        </div>
      </SettingsSection>

      {/* Toast: feedback vicino all'azione (visibile anche se la sezione è in basso) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          background: 'var(--surface)',
          border: `1px solid ${toast.type === 'success' ? 'var(--accent-border)' : 'var(--danger-text)'}`,
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
            <CheckCircle2 size={20} color="var(--accent)" />
          ) : (
            <AlertCircle size={20} color="var(--danger-text)" />
          )}
          <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, flex: 1 }}>
            {typeof toast.message === 'string' ? toast.message : (toast.message?.message ?? String(toast.message ?? ''))}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
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
              <p style={{ margin: 0, fontSize: 13, color: 'var(--danger-text)' }}>{editError}</p>
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
          width: min(880px, 100%);
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
          background: var(--surface-2);
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
    </div>
  )
}
