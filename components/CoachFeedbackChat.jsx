'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { 
  Dumbbell, 
  X, 
  Send, 
  Save, 
  ChevronDown, 
  CheckCircle2,
  MessageCircle,
  User,
  Gamepad2,
  Wifi,
  Target,
  Zap
} from 'lucide-react'
import { mapErrorToUserMessage } from '@/lib/errorHelper'

/**
 * CoachFeedbackChat — Chat dedicata Palestra Coach.
 * UX MIGLIORATA: Design coerente con piattaforma, più spazioso e moderno.
 * LOGICA INVARIATA: Salvataggi e API funzionano esattamente come prima.
 */

// Stili coerenti con piattaforma
const styles = {
  formField: {
    width: '100%',
    padding: 'clamp(10px, 1.5vw, 12px) clamp(12px, 2vw, 14px)',
    background: 'rgba(0, 212, 255, 0.05)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '10px',
    color: 'white',
    fontSize: 'clamp(13px, 1.8vw, 14px)',
    outline: 'none',
    transition: 'all 0.2s'
  },
  formSelect: {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2300d4ff' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px'
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '6px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  sectionCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden'
  }
}

export default function CoachFeedbackChat({ show, onClose, userProfile: externalProfile, lastMatch }) {
  const { t, lang } = useTranslation()
  const dialogId = useId()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loadedProfile, setLoadedProfile] = useState(null)
  const [formExpanded, setFormExpanded] = useState(true)
  const [formData, setFormData] = useState({})
  const [formSaving, setFormSaving] = useState(false)
  const [formSaved, setFormSaved] = useState(false)
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const sendAbortRef = useRef(null)
  const introTimeoutRef = useRef(null)
  const focusTimeoutRef = useRef(null)
  const lastFocusedElementRef = useRef(null)
  const [viewportWidth, setViewportWidth] = useState(1024)
  const isMobile = viewportWidth <= 640
  const isNarrowMobile = viewportWidth <= 420
  const isVerySmallMobile = viewportWidth <= 360
  const dialogTitleId = `${dialogId}-title`
  const dialogDescriptionId = `${dialogId}-description`
  const profileSectionId = `${dialogId}-profile-section`
  const platformFieldId = `${dialogId}-platform`
  const connectionFieldId = `${dialogId}-connection`
  const passLevelFieldId = `${dialogId}-pass-level`
  const smartAssistFieldId = `${dialogId}-smart-assist`
  const weakPointFieldId = `${dialogId}-weak-point`
  const divisionFieldId = `${dialogId}-division`
  const notesFieldId = `${dialogId}-notes`
  const chatInputId = `${dialogId}-chat-input`

  // LOGICA INVARIATA: Carica profilo
  useEffect(() => {
    if (!show) return
    const load = async () => {
      try {
        let token = localStorage.getItem('auth_token')
        let userId = null
        
        if (token) {
           const userData = localStorage.getItem('metalgate_user')
           if (userData) {
             userId = JSON.parse(userData).id
           }
        } else {
           const { data: session } = await supabase.auth.getSession()
           if (session?.session) {
             token = session.session.access_token
             userId = session.session.user.id
           }
        }

        if (!token || !userId) {
          if (externalProfile) setLoadedProfile(externalProfile)
          return
        }
        
        try {
          const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
          })
          if (res.ok) {
            const data = await res.json()
            setLoadedProfile(data)
          } else if (externalProfile) {
            setLoadedProfile(externalProfile)
          }
        } catch (e) {
          console.error('[CoachFeedbackChat] Error fetching profile:', e)
          if (externalProfile) setLoadedProfile(externalProfile)
        }
      } catch (e) { 
        console.error('[CoachFeedbackChat] Profile load error:', e)
        if (externalProfile) setLoadedProfile(externalProfile)
      }
    }
    load()
  }, [show])

  const userProfile = loadedProfile || externalProfile

  // LOGICA INVARIATA: Determina modalità sessione
  const sessionMode = useMemo(() => {
    const profileFields = [
      userProfile?.platform, userProfile?.connection_quality, userProfile?.pass_level,
      userProfile?.smart_assist, userProfile?.input_delay, userProfile?.ai_weak_point
    ].filter(v => v != null && String(v).trim() !== '').length
    if (profileFields < 3) return 'profile_setup'
    if (lastMatch) return 'feedback'
    return 'update'
  }, [userProfile, lastMatch])

  // LOGICA INVARIATA: Inizializza form
  useEffect(() => {
    if (!show) return
    setFormSaved(false)
    const profileFields = [
      userProfile?.platform, userProfile?.connection_quality, userProfile?.pass_level,
      userProfile?.smart_assist, userProfile?.input_delay, userProfile?.ai_weak_point
    ].filter(v => v != null && String(v).trim() !== '').length
    setFormExpanded(profileFields < 3)
    setFormData({
      connection_quality: userProfile?.connection_quality || '',
      slow_opponent_connection_issues: userProfile?.slow_opponent_connection_issues || '',
      input_delay: userProfile?.input_delay || '',
      pass_level: userProfile?.pass_level || '',
      smart_assist: userProfile?.smart_assist || '',
      platform: userProfile?.platform || '',
      current_division: userProfile?.current_division || '',
      ai_weak_point: userProfile?.ai_weak_point || '',
      hours_per_week: userProfile?.hours_per_week ?? '',
      ai_learn_goals: userProfile?.ai_learn_goals || '',
      ai_notes: userProfile?.ai_notes || ''
    })
  }, [show, userProfile])

  // LOGICA INVARIATA: Whitelist validazione
  const WHITELISTS = {
    platform: ['console', 'pc', 'mobile', 'other'],
    connection_quality: ['good', 'unstable', 'lag'],
    slow_opponent_connection_issues: ['yes', 'no', 'sometimes'],
    input_delay: ['yes', 'no', 'sometimes'],
    pass_level: ['pa1', 'pa2', 'pa3'],
    smart_assist: ['yes', 'no'],
    ai_weak_point: ['defence', 'attack', 'set_pieces', 'transitions', 'final_minutes']
  }

  const getAccessToken = useCallback(async () => {
    let token = localStorage.getItem('auth_token')
    if (!token && supabase) {
      const { data: session } = await supabase.auth.getSession()
      token = session?.session?.access_token
    }
    return token || null
  }, [])

  // LOGICA INVARIATA: Salva form
  const handleFormSave = useCallback(async (options = {}) => {
    const { silent = false, tokenOverride = null } = options
    setSaveError('')
    setSaved(false)
    setFormSaving(true)
    try {
      const token = tokenOverride || await getAccessToken()
      if (!token) {
        if (!silent) {
          setSaveError(lang === 'en' ? 'Session expired. Please log in again.' : 'Sessione scaduta. Accedi di nuovo.')
        }
        return false
      }

      const body = {}
      for (const [k, v] of Object.entries(formData)) {
        if (k === 'hours_per_week') {
          const n = v !== '' ? parseInt(String(v), 10) : null
          body[k] = Number.isFinite(n) ? n : null
        } else if (WHITELISTS[k]) {
          const val = v !== '' ? String(v).trim() : null
          if (val && WHITELISTS[k].includes(val.toLowerCase())) {
             body[k] = val.toLowerCase()
          } else if (k === 'ai_weak_point') {
             body[k] = val
          } else {
             body[k] = null
          }
        } else {
          body[k] = v !== '' ? String(v).trim() : null
        }
      }

      const res = await fetch('/api/supabase/save-ai-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setLoadedProfile(prev => ({ ...prev, ...body }))
        setFormSaved(true)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        return true
      }

      const errorText = await res.text()
      console.error('[CoachFeedbackChat] Form save error:', errorText)
      if (!silent) {
        setSaveError(lang === 'en' ? 'Unable to save profile data.' : 'Impossibile salvare i dati profilo.')
      }
      return false
    } catch (err) {
      console.error('[CoachFeedbackChat] Form save error:', err)
      if (!silent) {
        setSaveError(lang === 'en' ? 'Unable to save profile data.' : 'Impossibile salvare i dati profilo.')
      }
      return false
    } finally {
      setFormSaving(false)
    }
  }, [formData, getAccessToken, lang])

  // LOGICA INVARIATA: Suggerimenti iniziali
  const initialSuggestions = useMemo(() => {
    if (lang === 'en') {
      if (sessionMode === 'feedback') return ['It went well', "It didn't work", 'I followed your advice']
      return ["I changed something in my game", "I'm struggling with something", 'Any other feedback']
    }
    if (sessionMode === 'feedback') return ['E\' andata bene', 'Non ha funzionato', 'Ho seguito il tuo consiglio']
    return ['Ho cambiato qualcosa nel mio gioco', 'Ho difficolta con qualcosa', 'Altro feedback']
  }, [sessionMode, lang])

  // LOGICA INVARIATA: Messaggio iniziale
  useEffect(() => {
    if (!show) return
    setMessages([])
    setSaved(false)
    setSaveError('')

    const firstName = userProfile?.first_name || (lang === 'en' ? 'friend' : 'amico')

    let greeting = ''
    if (sessionMode === 'feedback' && lastMatch) {
      const opp = lastMatch.opponent_name || (lang === 'en' ? 'your opponent' : 'il tuo avversario')
      const form = lastMatch.formation_played || '?'
      const result = lastMatch.result || '?'
      greeting = lang === 'en'
        ? `Hi ${firstName}! I see you played ${form} vs ${opp} — ${result}. Tell me how it went!`
        : `Ciao ${firstName}! Vedo che hai giocato ${form} contro ${opp} — ${result}. Raccontami com'è andata!`
    } else if (sessionMode === 'profile_setup') {
      greeting = lang === 'en'
        ? `Hi ${firstName}! Fill in your details above, then we can chat.`
        : `Ciao ${firstName}! Compila i tuoi dati qui sopra, poi possiamo parlare.`
    } else {
      greeting = lang === 'en'
        ? `Hi ${firstName}! Is there anything new you want to tell me?`
        : `Ciao ${firstName}! C'è qualcosa di nuovo che vuoi dirmi?`
    }

    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current)
    introTimeoutRef.current = setTimeout(() => {
      setMessages([{ role: 'assistant', content: greeting }])
    }, 300)
  }, [show, sessionMode, userProfile, lastMatch, lang])

  // LOGICA INVARIATA: Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return []
    const selectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(modalRef.current.querySelectorAll(selectors)).filter((element) => {
      if (!(element instanceof HTMLElement)) return false
      if (element.getAttribute('aria-hidden') === 'true') return false
      return true
    })
  }, [])

  // Dialog focus management: focus the dialog shell first to avoid
  // opening the virtual keyboard immediately on mobile.
  useEffect(() => {
    if (!show || typeof document === 'undefined') return undefined

    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
    focusTimeoutRef.current = setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 60)

    return () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
      const previousElement = lastFocusedElementRef.current
      if (previousElement?.focus) {
        setTimeout(() => previousElement.focus(), 0)
      }
    }
  }, [show])

  useEffect(() => {
    if (!show || typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [show])

  useEffect(() => {
    if (!show || typeof window === 'undefined' || typeof document === 'undefined') return undefined

    const updateViewportVars = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--coach-vh', `${vh}px`)
      setViewportWidth(window.innerWidth || 1024)
    }

    updateViewportVars()
    window.addEventListener('resize', updateViewportVars)
    window.addEventListener('orientationchange', updateViewportVars)

    return () => {
      window.removeEventListener('resize', updateViewportVars)
      window.removeEventListener('orientationchange', updateViewportVars)
    }
  }, [show])

  useEffect(() => {
    if (!show || typeof document === 'undefined') return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!saving && !formSaving) {
          event.preventDefault()
          onClose?.()
        }
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        modalRef.current?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (!modalRef.current?.contains(activeElement)) {
        event.preventDefault()
        firstElement.focus()
        return
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [show, saving, formSaving, onClose, getFocusableElements])

  // LOGICA INVARIATA: Cleanup
  useEffect(() => {
    return () => {
      sendAbortRef.current?.abort()
      if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current)
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
    }
  }, [])

  // LOGICA INVARIATA: Invia messaggio
  const handleSend = useCallback(async (messageText = input) => {
    if (!messageText.trim() || loading || saving) return

    const userMessage = messageText.trim()
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      sendAbortRef.current?.abort()
      sendAbortRef.current = new AbortController()
      const signal = sendAbortRef.current.signal

      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) throw new Error('Session expired')
      
      if (signal.aborted) return

      const history = messages
        .slice(-10)
        .map(({ role, content }) => ({ role, content: typeof content === 'string' ? content : String(content) }))

      const res = await fetch('/api/coach-feedback-chat', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage, history, language: lang })
      })
      if (signal.aborted) return

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || t('error'))
      }

      const data = await res.json()
      if (signal.aborted) return

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || (lang === 'en' ? "I didn't understand, can you repeat?" : 'Non ho capito, puoi ripetere?')
      }])

      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

    } catch (error) {
      if (error?.name === 'AbortError') return
      console.error('[CoachFeedbackChat] Error:', error)
      const { message: friendlyMsg } = mapErrorToUserMessage(error, lang === 'en' ? 'Please try again.' : 'Riprova tra poco.', lang)
      setMessages(prev => [...prev, { role: 'assistant', content: friendlyMsg }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, saving, messages, lang])

  const handleQuickAction = useCallback((text) => {
    setInput(text)
    setTimeout(() => handleSend(text), 100)
  }, [handleSend])

  // LOGICA INVARIATA: Salva e chiudi
  const handleSaveAndClose = useCallback(async () => {
    if (saving || formSaving) return
    setSaveError('')
    setSaved(false)

    setSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setSaveError(lang === 'en' ? 'Session expired. Please log in again.' : 'Sessione scaduta. Accedi di nuovo.')
        return
      }

      const profileSaved = await handleFormSave({ silent: true, tokenOverride: token })
      if (!profileSaved) {
        setSaveError(lang === 'en' ? 'Unable to save profile data.' : 'Impossibile salvare i dati profilo.')
        return
      }

      const userMessages = messages.filter(m => m.role === 'user')
      if (userMessages.length === 0) {
        setSaved(true)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        setTimeout(() => onClose?.(), 900)
        return
      }

      const conversation = messages.map(({ role, content }) => ({ role, content }))
      const res = await fetch('/api/save-coach-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          conversation,
          session_type: sessionMode,
          match_id: lastMatch?.id || null
        })
      })

      if (res.ok) {
        setSaved(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('credits-consumed'))
          window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        }
        try {
          await fetch('/api/refresh-diagnostic', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          })
        } catch (_) {}
        setTimeout(() => onClose?.(), 1500)
      } else {
        const errorText = await res.text()
        console.error('[CoachFeedbackChat] Save error:', errorText)
        setSaveError(lang === 'en' ? 'Unable to save chat feedback.' : 'Impossibile salvare il feedback chat.')
      }
    } catch (err) {
      console.error('[CoachFeedbackChat] Save error:', err)
      setSaveError(lang === 'en' ? 'Unable to save changes. Please try again.' : 'Impossibile salvare le modifiche. Riprova.')
    } finally {
      setSaving(false)
    }
  }, [saving, formSaving, getAccessToken, handleFormSave, messages, sessionMode, lastMatch, onClose, lang])

  if (!show) return null

  return (
    <div
      className="coach-feedback-overlay"
      onClick={() => {
        if (!saving && !formSaving) onClose?.()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30000,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        background: isMobile ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.75)',
        backdropFilter: isMobile ? 'blur(2px)' : 'blur(8px)',
        padding: isMobile ? '8px' : 'clamp(10px, 2vw, 24px)'
      }}
    >
      <div
        className="coach-feedback-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? 'calc(100vw - 16px)' : 'min(680px, calc(100vw - clamp(24px, 5vw, 64px)))',
          height: isMobile
            ? 'auto'
            : 'min(860px, calc(100dvh - clamp(24px, 5vw, 64px)))',
          maxHeight: isMobile
            ? 'calc((var(--coach-vh, 1vh) * 100) - var(--bottom-nav-height, 64px) - env(safe-area-inset-bottom, 0px) - 16px)'
            : 'calc(100dvh - clamp(24px, 5vw, 64px))',
          background: 'linear-gradient(180deg, rgba(5,8,20,0.98) 0%, rgba(3,5,12,0.98) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: isMobile ? '18px' : '24px',
          boxShadow: '0 0 60px rgba(0, 212, 255, 0.15), 0 25px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          marginBottom: isMobile ? 'calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px))' : 0,
          overflow: 'hidden'
        }}
      >
        {/* Header Migliorato */}
        <div
          style={{
            padding: isMobile ? '10px 12px' : 'clamp(14px, 2.2vw, 18px) clamp(16px, 2.8vw, 22px)',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,128,255,0.1))',
            borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '8px' : '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: isMobile ? '36px' : '44px',
              height: isMobile ? '36px' : '44px',
              borderRadius: isMobile ? '10px' : '12px',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)'
            }}>
              <Dumbbell size={isMobile ? 18 : 22} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                id={dialogTitleId}
                style={{
                  fontWeight: 700,
                  color: 'white',
                  fontSize: isMobile ? '15px' : '17px',
                  marginBottom: isMobile ? '0' : '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {lang === 'en' ? 'Coach Gym' : 'Palestra Coach'}
              </h2>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: isMobile ? 'none' : 'block' }}>
                {lang === 'en'
                  ? 'Profile + chat feedback'
                  : 'Profilo + feedback chat'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={handleSaveAndClose}
              disabled={saving}
              style={{
                background: saving ? 'rgba(255,255,255,0.1)' : 'rgba(0,212,255,0.2)',
                border: '1px solid rgba(0,212,255,0.4)',
                borderRadius: '10px',
                cursor: saving ? 'wait' : 'pointer',
                color: 'white',
                padding: isNarrowMobile ? '7px 9px' : (isMobile ? '8px 12px' : '10px 16px'),
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px',
                fontSize: isNarrowMobile ? '11px' : '13px',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(0,212,255,0.3)' }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(0,212,255,0.2)' }}
            >
              {saved ? (
                <><CheckCircle2 size={16} /> {isNarrowMobile ? (lang === 'en' ? 'Saved' : 'Salvato') : (lang === 'en' ? 'Saved!' : 'Salvato!')}</>
              ) : saving ? (
                <>{isNarrowMobile ? (lang === 'en' ? 'Saving' : 'Salvo') : (lang === 'en' ? 'Saving...' : 'Salvo...')}</>
              ) : (
                <><Save size={16} /> {isNarrowMobile ? (lang === 'en' ? 'Save' : 'Salva') : (lang === 'en' ? 'Save All' : 'Salva tutto')}</>
              )}
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={lang === 'en' ? 'Close coach gym' : 'Chiudi palestra coach'}
              onClick={() => {
                if (!saving && !formSaving) onClose?.()
              }}
              disabled={saving || formSaving}
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                borderRadius: isMobile ? '8px' : '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.92)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving || formSaving ? 'not-allowed' : 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {saveError && (
          <div
            style={{
              margin: '10px 20px 0',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 99, 99, 0.4)',
              background: 'rgba(255, 99, 99, 0.12)',
              color: 'rgba(255, 210, 210, 0.95)',
              fontSize: '12px',
              lineHeight: '1.4'
            }}
          >
            {saveError}
          </div>
        )}
        <p
          id={dialogDescriptionId}
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
        >
          {lang === 'en'
            ? 'Coach Gym dialog. Update your gaming profile and leave chat feedback without leaving the current page.'
            : 'Finestra Palestra Coach. Aggiorna il tuo profilo di gioco e lascia feedback in chat senza uscire dalla pagina corrente.'}
        </p>

        {/* Content Scrollable */}
        <div
          className="coach-feedback-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '10px' : '14px',
            padding: isMobile ? '10px 10px 12px' : '20px',
            paddingBottom: isMobile
              ? 'calc(12px + env(safe-area-inset-bottom, 0px))'
              : 'calc(20px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          
          {/* Sezione Profilo Migliorata */}
          <div style={{ ...styles.sectionCard, marginBottom: isMobile ? '10px' : '20px' }}>
            <button
              type="button"
              onClick={() => setFormExpanded(e => !e)}
              aria-expanded={formExpanded}
              aria-controls={profileSectionId}
              aria-label={lang === 'en' ? 'Toggle gaming profile form' : 'Mostra o nascondi il profilo di gioco'}
              style={{
                width: '100%',
                padding: isMobile ? '12px 14px' : '16px 20px',
                minHeight: isMobile ? '44px' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: formExpanded ? 'rgba(0,212,255,0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={20} color="var(--neon-cyan)" />
                <span style={{ fontWeight: 600, fontSize: 'clamp(13px, 2vw, 15px)' }}>
                  {lang === 'en' ? 'Your Gaming Profile' : 'Il tuo Profilo di Gioco'}
                </span>
                {formSaved && (
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#22c55e', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    marginLeft: '8px'
                  }}>
                    <CheckCircle2 size={12} /> {lang === 'en' ? 'Saved' : 'Salvato'}
                  </span>
                )}
              </div>
              <div style={{ 
                transform: formExpanded ? 'rotate(180deg)' : 'rotate(0)', 
                transition: 'transform 0.3s',
                color: 'rgba(255,255,255,0.5)'
              }}>
                <ChevronDown size={20} />
              </div>
            </button>

            {formExpanded && (
              <div id={profileSectionId} style={{ padding: isMobile ? '0 14px 14px' : '0 20px 20px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '130px' : '150px'}, 1fr))`,
                  gap: isMobile ? '12px' : '16px',
                  marginBottom: isMobile ? '12px' : '16px'
                }}>
                  {/* Platform */}
                  <div>
                    <label htmlFor={platformFieldId} style={styles.formLabel}>
                      <Gamepad2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {lang === 'en' ? 'Platform' : 'Piattaforma'}
                    </label>
                    <select 
                      id={platformFieldId}
                      className="coach-form-select"
                      style={{ ...styles.formField, ...styles.formSelect }}
                      value={formData.platform || ''} 
                      onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))}
                    >
                      <option value="">{lang === 'en' ? 'Select' : 'Seleziona'}</option>
                      <option value="console">Console</option>
                      <option value="pc">PC</option>
                      <option value="mobile">Mobile</option>
                    </select>
                  </div>

                  {/* Connection */}
                  <div>
                    <label htmlFor={connectionFieldId} style={styles.formLabel}>
                      <Wifi size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {lang === 'en' ? 'Connection' : 'Connessione'}
                    </label>
                    <select 
                      id={connectionFieldId}
                      className="coach-form-select"
                      style={{ ...styles.formField, ...styles.formSelect }}
                      value={formData.connection_quality || ''} 
                      onChange={e => setFormData(p => ({ ...p, connection_quality: e.target.value }))}
                    >
                      <option value="">{lang === 'en' ? 'Select' : 'Seleziona'}</option>
                      <option value="good">{lang === 'en' ? 'Good' : 'Buona'}</option>
                      <option value="unstable">{lang === 'en' ? 'Unstable' : 'Instabile'}</option>
                      <option value="lag">Lag</option>
                    </select>
                  </div>

                  {/* Pass Level */}
                  <div>
                    <label htmlFor={passLevelFieldId} style={styles.formLabel}>
                      <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {lang === 'en' ? 'Pass Level' : 'Passaggi'}
                    </label>
                    <select 
                      id={passLevelFieldId}
                      className="coach-form-select"
                      style={{ ...styles.formField, ...styles.formSelect }}
                      value={formData.pass_level || ''} 
                      onChange={e => setFormData(p => ({ ...p, pass_level: e.target.value }))}
                    >
                      <option value="">{lang === 'en' ? 'Select' : 'Seleziona'}</option>
                      <option value="pa1">PA1</option>
                      <option value="pa2">PA2</option>
                      <option value="pa3">PA3</option>
                    </select>
                  </div>

                  {/* Smart Assist */}
                  <div>
                    <label htmlFor={smartAssistFieldId} style={styles.formLabel}>
                      <Target size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Smart Assist
                    </label>
                    <select 
                      id={smartAssistFieldId}
                      className="coach-form-select"
                      style={{ ...styles.formField, ...styles.formSelect }}
                      value={formData.smart_assist || ''} 
                      onChange={e => setFormData(p => ({ ...p, smart_assist: e.target.value }))}
                    >
                      <option value="">{lang === 'en' ? 'Select' : 'Seleziona'}</option>
                      <option value="yes">{lang === 'en' ? 'Yes' : 'Sì'}</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                {/* Weak Point */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor={weakPointFieldId} style={styles.formLabel}>
                    {lang === 'en' ? 'Main Weakness' : 'Punto Debole Principale'}
                  </label>
                  <select 
                    id={weakPointFieldId}
                    className="coach-form-select"
                    style={{ ...styles.formField, ...styles.formSelect }}
                    value={formData.ai_weak_point || ''} 
                    onChange={e => setFormData(p => ({ ...p, ai_weak_point: e.target.value }))}
                  >
                    <option value="">{lang === 'en' ? 'Select' : 'Seleziona'}</option>
                    <option value="defence">{lang === 'en' ? 'Defence' : 'Difesa'}</option>
                    <option value="attack">{lang === 'en' ? 'Attack' : 'Attacco'}</option>
                    <option value="set_pieces">{lang === 'en' ? 'Set Pieces' : 'Piazzati'}</option>
                    <option value="transitions">{lang === 'en' ? 'Transitions' : 'Transizioni'}</option>
                    <option value="final_minutes">{lang === 'en' ? 'Final Minutes' : 'Minuti Finali'}</option>
                  </select>
                </div>

                {/* Division */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor={divisionFieldId} style={styles.formLabel}>
                    {lang === 'en' ? 'Current Division' : 'Divisione Attuale'}
                  </label>
                  <input 
                    id={divisionFieldId}
                    type="text"
                    style={styles.formField}
                    placeholder={lang === 'en' ? 'e.g. Division 3' : 'es. Divisione 3'}
                    value={formData.current_division || ''} 
                    onChange={e => setFormData(p => ({ ...p, current_division: e.target.value }))}
                  />
                </div>

                {/* Notes */}
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor={notesFieldId} style={styles.formLabel}>
                    {lang === 'en' ? 'Notes for Coach' : 'Note per il Coach'}
                  </label>
                  <input 
                    id={notesFieldId}
                    type="text"
                    style={styles.formField}
                    placeholder={lang === 'en' ? 'Anything else...' : 'Qualsiasi altra cosa...'}
                    value={formData.ai_notes || ''} 
                    onChange={e => setFormData(p => ({ ...p, ai_notes: e.target.value }))}
                  />
                </div>

                <button
                  onClick={handleFormSave}
                  disabled={formSaving}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: formSaving ? 'rgba(0,212,255,0.1)' : 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: formSaving ? 'wait' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {formSaving ? (
                    <>{lang === 'en' ? 'Saving...' : 'Salvataggio...'}</>
                  ) : (
                    <><Save size={16} /> {lang === 'en' ? 'Save Profile' : 'Salva Profilo'}</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sezione Chat Migliorata */}
          <div style={{ ...styles.sectionCard, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: isMobile ? '10px 12px' : '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MessageCircle size={18} color="var(--neon-cyan)" />
              <span style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>
                {lang === 'en' ? 'Chat with Coach' : 'Chat con Coach'}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: 'auto', display: isNarrowMobile ? 'none' : 'inline' }}>
                {lang === 'en' ? 'Be specific → better tips' : 'Sii preciso → consigli utili'}
              </span>
            </div>

            <div style={{ 
              flex: 1, 
              padding: isMobile ? '12px' : '16px', 
              minHeight: 0,
              maxHeight: 'none',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: isVerySmallMobile ? '92%' : '85%',
                      padding: isMobile ? '10px 13px' : '12px 16px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user' 
                        ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))'
                        : 'rgba(255,255,255,0.08)',
                      color: msg.role === 'user' ? 'white' : 'rgba(255,255,255,0.9)',
                      fontSize: 'clamp(13px, 2vw, 14px)',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      border: msg.role === 'assistant' ? '1px solid rgba(0,212,255,0.2)' : 'none'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div style={{ display: 'flex', gap: '6px', padding: '12px' }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--neon-cyan)',
                    animation: 'bounce 1s infinite'
                  }} />
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--neon-cyan)',
                    animation: 'bounce 1s infinite 0.2s'
                  }} />
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: 'var(--neon-cyan)',
                    animation: 'bounce 1s infinite 0.4s'
                  }} />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggerimenti rapidi */}
            {messages.filter(m => m.role === 'user').length < 2 && !loading && (
              <div style={{ 
                padding: isMobile ? '0 12px 8px' : '0 16px 12px', 
                display: 'flex', 
                flexWrap: 'wrap',
                overflowX: 'visible',
                scrollbarWidth: 'thin',
                gap: '8px' 
              }}>
                {initialSuggestions.map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(text)}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(0,212,255,0.1)',
                      border: '1px solid rgba(0,212,255,0.3)',
                      borderRadius: '20px',
                      color: 'var(--neon-cyan)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      minHeight: isMobile ? '44px' : undefined,
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,212,255,0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0,212,255,0.1)'
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ 
              padding: isMobile ? '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))' : '16px', 
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              gap: '10px',
              background: 'rgba(5,8,20,0.98)'
            }}>
              <label
                htmlFor={chatInputId}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0
                }}
              >
                {lang === 'en' ? 'Chat input for Coach Gym' : 'Campo chat della Palestra Coach'}
              </label>
              <input
                id={chatInputId}
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={lang === 'en' ? 'Ask me specific things about your game...' : 'Chiedimi cose specifiche sul tuo gioco...'}
                disabled={loading || saving}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: 'clamp(13px, 2vw, 14px)',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || saving || !input.trim()}
                style={{
                  padding: '12px 16px',
                  background: !input.trim() ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '44px',
                  minHeight: '44px',
                  transition: 'all 0.2s'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @media (max-width: 640px) {
          .coach-feedback-overlay {
            padding: 8px !important;
            align-items: flex-end !important;
          }
          .coach-feedback-modal {
            overscroll-behavior: contain !important;
          }
          .coach-feedback-scroll {
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y !important;
          }
        }
        @media (max-width: 420px) {
          .coach-feedback-modal :global(input),
          .coach-feedback-modal :global(select),
          .coach-feedback-modal :global(button) {
            min-height: 44px;
          }
        }
        .coach-form-select option {
          background: #0a0e1a;
          color: #fff;
          padding: 10px;
        }
        .coach-form-select option:checked {
          background: var(--neon-cyan);
          color: #000;
        }
        .coach-feedback-modal :global(button:focus-visible),
        .coach-feedback-modal :global(input:focus-visible),
        .coach-feedback-modal :global(select:focus-visible) {
          outline: 2px solid rgba(0, 212, 255, 0.9);
          outline-offset: 2px;
          box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
