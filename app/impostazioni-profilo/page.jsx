'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import {
  CheckCircle2, AlertCircle, X,
  Coins, Zap, LogOut, Pencil, ChevronRight, ChevronDown, ExternalLink,
  User, Shield, Heart, Award, Gamepad2, Star, Bot, NotebookPen, Target, Gauge,
  CalendarCheck, Medal, Sparkles, Receipt, Sun, Moon, Languages, Trophy
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

/** Sezione impostazioni: titolo piccolo uppercase + una card con righe separate da hairline. */
function Section({ title, children }) {
  return (
    <section>
      <h2 style={{
        margin: '20px 0 6px 4px',
        fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-dim)'
      }}>
        {title}
      </h2>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        overflow: 'hidden'
      }}>
        {children}
      </div>
    </section>
  )
}

/** Chip icona 32x32 allineata alla griglia delle righe. */
function IconChip({ icon: Icon, gold }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: gold ? 'var(--gold-bg)' : 'var(--surface-3)',
        color: gold ? 'var(--gold-text)' : 'var(--text-secondary)'
      }}
    >
      <Icon size={16} />
    </span>
  )
}

/** Riga lista impostazioni: icona, label (+ sub), controllo/valore/chevron a destra. */
function Row({ icon, iconNode, gold, label, sub, value, control, onClick, href, external, danger, first }) {
  const interactive = Boolean(onClick || href)
  const style = {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', minHeight: 50, padding: '10px 14px',
    border: 'none', borderTop: first ? 'none' : '1px solid var(--border-soft)',
    fontFamily: 'inherit', textAlign: 'left',
    textDecoration: 'none', boxSizing: 'border-box',
    cursor: interactive ? 'pointer' : 'default',
    color: 'inherit',
    ...(interactive ? {} : { background: 'transparent' })
  }
  const content = (
    <>
      {iconNode || (icon ? <IconChip icon={icon} gold={gold} /> : null)}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <span style={{
          fontSize: 14, fontWeight: 500,
          color: danger ? 'var(--danger-text)' : 'var(--text-main)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {label}
        </span>
        {sub ? (
          <span style={{
            fontSize: 12, color: 'var(--text-dim)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {sub}
          </span>
        ) : null}
      </span>
      {value != null && value !== '' ? (
        <span style={{
          marginLeft: 'auto', flexShrink: 0, maxWidth: '45%',
          fontSize: 13, color: 'var(--text-dim)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {value}
        </span>
      ) : null}
      {control ? <span style={{ marginLeft: value ? 8 : 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>{control}</span> : null}
      {interactive && !control && !danger ? (
        external ? (
          <ExternalLink size={14} color="var(--text-dim)" aria-hidden="true" style={{ flexShrink: 0, marginLeft: value ? 8 : 'auto' }} />
        ) : (
          <ChevronRight size={16} color="var(--text-dim)" aria-hidden="true" style={{ flexShrink: 0, marginLeft: value ? 8 : 'auto' }} />
        )
      ) : null}
    </>
  )
  if (href && external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className="srow" style={style}>{content}</a>
  }
  if (href) {
    return <a href={href} className="srow" style={style}>{content}</a>
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="srow" style={style}>{content}</button>
  }
  return <div style={style}>{content}</div>
}

/** Riga identita: avatar con iniziale, nome, email e chip completamento profilo. */
function IdentityRow({ account, score, levelText }) {
  const initial = (account.name || account.email || 'H').charAt(0).toUpperCase()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 50, padding: '10px 14px' }}>
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)', color: 'var(--accent-ink)',
          fontSize: 16, fontWeight: 600
        }}
      >
        {initial}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <span style={{
          fontSize: 15, fontWeight: 600, color: 'var(--text-main)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {account.name || account.email || 'Hero'}
        </span>
        {account.email ? (
          <span style={{
            fontSize: 12.5, color: 'var(--text-dim)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {account.email}
          </span>
        ) : null}
      </span>
      <span
        aria-label={`${Math.round(score)}%`}
        style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 5,
          padding: '4px 10px', borderRadius: 999, flexShrink: 0,
          background: 'var(--accent-bg)', color: 'var(--accent)',
          fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap'
        }}
      >
        {Math.round(score)}% · {levelText}
      </span>
    </div>
  )
}

/** Sezione Hero Points: saldo reale, link acquisto esterno, tabella costi espandibile. */
function HeroPointsCard({ lang }) {
  const [hpBalance, setHpBalance] = React.useState(null)
  const [costsOpen, setCostsOpen] = React.useState(false)

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
        /* saldo non disponibile: niente valore */
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
      {/* Saldo + acquisto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 50, padding: '10px 14px' }}>
        <IconChip icon={Coins} gold />
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-main)' }}>
          Hero Points
        </span>
        {typeof hpBalance === 'number' && (
          <span style={{ flexShrink: 0, fontSize: 15, fontWeight: 700, color: 'var(--gold-text)', whiteSpace: 'nowrap' }}>
            {hpBalance} HP
          </span>
        )}
        <a
          href="https://home.fromzerotohero.io/dashboard?usage"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', flexShrink: 0,
            padding: '6px 12px', borderRadius: 8,
            background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
            color: 'var(--gold-text)', textDecoration: 'none',
            fontSize: 12.5, fontWeight: 600
          }}
        >
          {lang === 'en' ? 'Buy' : 'Compra'}
        </a>
      </div>

      {/* Expander tabella costi */}
      <button
        type="button"
        onClick={() => setCostsOpen((v) => !v)}
        aria-expanded={costsOpen}
        className="srow"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', minHeight: 50, padding: '10px 14px',
          border: 'none', borderTop: '1px solid var(--border-soft)',
          fontFamily: 'inherit', textAlign: 'left', boxSizing: 'border-box',
          cursor: 'pointer', color: 'inherit'
        }}
      >
        <IconChip icon={Receipt} gold />
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-main)' }}>
          {lang === 'en' ? 'Service costs' : 'Costi dei servizi'}
        </span>
        <ChevronDown
          size={16}
          color="var(--text-dim)"
          aria-hidden="true"
          className={`chev${costsOpen ? ' open' : ''}`}
          style={{ flexShrink: 0 }}
        />
      </button>

      {costsOpen && (
        <div style={{ borderTop: '1px solid var(--border-soft)' }}>
          {rows.map((row, idx) => (
            <div
              key={`${row.service}-${idx}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 14px',
                borderTop: idx === 0 ? 'none' : '1px solid var(--border-softer)'
              }}
            >
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--text-main)' }}>{row.service}</span>
              <strong style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--gold-text)', whiteSpace: 'nowrap' }}>{row.cost}</strong>
            </div>
          ))}
          <p style={{
            margin: 0, padding: '8px 14px 10px',
            borderTop: '1px solid var(--border-softer)',
            fontSize: 12, lineHeight: 1.45, color: 'var(--text-dim)'
          }}>
            {lang === 'en'
              ? 'If a platform error prevents an analysis from completing, the HP are automatically returned.'
              : 'Se un errore della piattaforma blocca un’analisi, gli HP vengono riaccreditati automaticamente.'}
          </p>
        </div>
      )}
    </div>
  )
}

const NOTIFICATION_PREF_KEYS = ['weekly_goals', 'credits', 'leaderboard', 'coach']
const NOTIFICATION_PREF_LABEL_KEYS = {
  weekly_goals: 'profileNotifWeeklyGoals',
  credits: 'profileNotifCredits',
  leaderboard: 'profileNotifLeaderboard',
  coach: 'profileNotifCoach'
}
const NOTIFICATION_PREF_ICONS = {
  weekly_goals: CalendarCheck,
  credits: Zap,
  leaderboard: Medal,
  coach: Sparkles
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

  if (loadError) {
    return (
      <p style={{ margin: 0, padding: '12px 14px', fontSize: 13, color: 'var(--danger-text)' }}>
        {(lang === 'en' || lang === 'es')
          ? 'Notification preferences unavailable right now.'
          : 'Preferenze notifiche non disponibili al momento.'}
      </p>
    )
  }

  if (prefs === null) {
    return (
      <p style={{ margin: 0, padding: '12px 14px', fontSize: 13, color: 'var(--text-dim)' }}>{t('loading')}</p>
    )
  }

  return (
    <div>
      {NOTIFICATION_PREF_KEYS.map((key, idx) => (
        <Row
          key={key}
          first={idx === 0}
          icon={NOTIFICATION_PREF_ICONS[key]}
          label={t(NOTIFICATION_PREF_LABEL_KEYS[key])}
          control={renderSwitch(key)}
        />
      ))}
    </div>
  )
}

/** Icona tema nella riga Preferenze: segue data-theme sul documentElement. */
function ThemeIcon() {
  const [theme, setTheme] = React.useState('dark')
  React.useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return <IconChip icon={theme === 'dark' ? Moon : Sun} />
}

export default function ImpostazioniProfiloPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()

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

  const [profileData, setProfileData] = React.useState(null)
  const [account, setAccount] = React.useState({ name: '', email: '' })
  const [editingField, setEditingField] = React.useState(null) // { key, type, label }
  const [editValue, setEditValue] = React.useState('')
  const [editSaving, setEditSaving] = React.useState(false)
  const [editError, setEditError] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
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

      try {
        let token = localStorage.getItem('auth_token')

        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          if (session?.session) {
            token = session.session.access_token
          }
        }

        if (!token) {
          // AuthWrapper gestirà redirect
          setLoading(false)
          return
        }

        const res = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        })

        if (!res.ok) {
          throw new Error(t('errorProfileLoad'))
        }

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
      } catch (err) {
        console.error('[Impostazioni Profilo] Error loading profile:', err)
        setToast({ type: 'error', message: err.message || t('errorProfileLoad') })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router, t])

  // Blocca lo scroll del body quando il bottom-sheet di editing è aperto
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
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const completionScore = profileData?.profile_completion_score ?? 0
  const completionLevel = profileData?.profile_completion_level || 'beginner'

  const getLevelText = (level) => {
    switch (level) {
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
        { field: 'first_name', icon: User, label: (lang === 'en' || lang === 'es') ? 'Name' : 'Nome', value: cleanValue(profile.first_name) },
        { field: 'last_name', icon: User, label: (lang === 'en' || lang === 'es') ? 'Last name' : 'Cognome', value: cleanValue(profile.last_name) }
      ]
    },
    {
      label: t('profileGroupGameIdentity'),
      cards: [
        { field: 'team_name', icon: Shield, label: (lang === 'en' || lang === 'es') ? 'In-game team' : 'Team in game', value: cleanValue(profile.team_name || profile.favorite_team) },
        { field: 'favorite_team', icon: Heart, label: (lang === 'en' || lang === 'es') ? 'Favourite club' : 'Squadra del cuore', value: cleanValue(profile.favorite_team) },
        { field: 'current_division', icon: Award, label: (lang === 'en' || lang === 'es') ? 'Division' : 'Divisione', value: cleanValue(profile.current_division) },
        { field: 'platform', icon: Gamepad2, label: (lang === 'en' || lang === 'es') ? 'Platform' : 'Piattaforma', value: fieldValue('platform', profileData?.platform) },
        { field: 'favourite_player_name', icon: Star, label: (lang === 'en' || lang === 'es') ? 'Favourite player' : 'Giocatore preferito', value: cleanValue(profileData?.favourite_player_name) }
      ]
    },
    {
      label: t('profileGroupCoachAi'),
      cards: [
        { field: 'ai_name', icon: Bot, label: (lang === 'en' || lang === 'es') ? 'Coach name' : 'Nome del tuo coach', value: cleanValue(profile.ai_name) },
        { field: 'how_to_remember', icon: NotebookPen, label: (lang === 'en' || lang === 'es') ? 'Coach memory note' : 'Nota memoria per il coach', value: cleanValue(profile.how_to_remember) },
        { field: 'ai_weak_point', icon: Target, label: (lang === 'en' || lang === 'es') ? 'Weak point' : 'Punto debole', value: fieldValue('ai_weak_point', profileData?.ai_weak_point || profile.common_problems) },
        { field: 'pass_level', icon: Gauge, label: (lang === 'en' || lang === 'es') ? 'Pass level' : 'Livello passaggi', value: fieldValue('pass_level', profileData?.pass_level) }
      ]
    }
  ]

  if (loading) {
    return <PageLoading label={t('loadingProfile')} />
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 20px 48px' }}>
      <h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
        {t('profileSettings')}
      </h1>

      {/* 1. Profilo: identita account */}
      <Section title={t('profile')}>
        <IdentityRow
          account={account}
          score={safeCompletionScore}
          levelText={getLevelText(completionLevel)}
        />
      </Section>

      {/* 2. Hero Points */}
      <Section title="Hero Points">
        <HeroPointsCard lang={lang} />
      </Section>

      {/* 3. Profilo di gioco */}
      <Section title={t('profileSectionGame')}>
        <div>
          {gameProfileGroups.map((group, groupIdx) => (
            <div key={group.label}>
              <h3 style={{
                margin: 0,
                padding: '10px 14px 4px',
                borderTop: groupIdx === 0 ? 'none' : '1px solid var(--border-soft)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-dim)'
              }}>
                {group.label}
              </h3>
              {group.cards.map((card) => (
                <Row
                  key={card.field}
                  icon={card.icon}
                  label={card.label}
                  value={card.value || '—'}
                  control={<Pencil size={14} color="var(--text-dim)" aria-hidden="true" />}
                  onClick={() => openFieldEditor(card)}
                />
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Notifiche */}
      <Section title={t('profileSectionNotifications')}>
        <NotificationsSection t={t} lang={lang} onToast={setToast} />
      </Section>

      {/* 5. Preferenze app */}
      <Section title={t('profileSectionPreferences')}>
        <div>
          <Row
            first
            iconNode={<ThemeIcon />}
            label={(lang === 'en' || lang === 'es') ? 'Theme' : 'Tema'}
            control={<ThemeToggle />}
          />
          <Row
            icon={Languages}
            label={(lang === 'en' || lang === 'es') ? 'Language' : 'Lingua'}
            control={<LanguageSwitch />}
          />
          <Row
            icon={Trophy}
            label="Tornei"
            href="https://tornei.fromzerotohero.io/"
            external
          />
        </div>
      </Section>

      {/* 6. Account */}
      <Section title={t('profileSectionAccount')}>
        <Row
          first
          icon={LogOut}
          label={t('logout')}
          onClick={handleLogout}
          danger
        />
      </Section>

      {/* Toast: feedback vicino all'azione */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '14px 18px',
          background: 'var(--surface)',
          border: `1px solid ${toast.type === 'success' ? 'var(--accent-border)' : 'var(--danger-text)'}`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '260px',
          maxWidth: '420px',
          animation: 'slideInRight 0.3s ease-out'
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

      {/* Bottom-sheet modifica campo: si apre dalla riga cliccata */}
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
        .srow {
          background: transparent;
          transition: background 0.15s ease;
        }
        .srow:hover {
          background: var(--surface-2);
        }
        .srow:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }
        .chev {
          transition: transform 0.18s ease;
        }
        .chev.open {
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  )
}
