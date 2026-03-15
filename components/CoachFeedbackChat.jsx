'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Dumbbell, X, Send, Save } from 'lucide-react'
import { mapErrorToUserMessage } from '@/lib/errorHelper'

/**
 * CoachFeedbackChat — Chat dedicata Palestra Coach.
 * Sostituisce AiInfoModal: raccoglie info profilo + feedback post-partita.
 * BLINDATA: solo ascolto, zero consigli tattici.
 *
 * Props:
 * - show {boolean} — se mostrare la chat
 * - onClose {function} — callback alla chiusura
 * - userProfile {object|null} — profilo utente (pre-caricato dalla dashboard)
 * - lastMatch {object|null} — ultima partita (pre-caricata dalla dashboard)
 */
/** Stile comune per select/input nel form — dark theme coerente */
const formFieldStyle = {
  width: '100%', padding: '8px 10px',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,140,0,0.25)',
  borderRadius: '6px', color: 'white', fontSize: '12px', outline: 'none'
}
const formSelectStyle = {
  ...formFieldStyle,
  background: 'rgba(255,255,255,0.06)',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ff8c00\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  paddingRight: '28px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  cursor: 'pointer'
}
const formLabelStyle = { fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px', display: 'block' }

export default function CoachFeedbackChat({ show, onClose, userProfile: externalProfile, lastMatch }) {
  const { t, lang } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadedProfile, setLoadedProfile] = useState(null)
  const [formExpanded, setFormExpanded] = useState(false)
  const [formData, setFormData] = useState({})
  const [formSaving, setFormSaving] = useState(false)
  const [formSaved, setFormSaved] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const sendAbortRef = useRef(null)

  // Carica profilo sempre ad ogni apertura per avere dati freschi
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
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            setLoadedProfile(data)
          } else if (externalProfile) {
            setLoadedProfile(externalProfile)
          }
        } catch (e) {
          console.error('[CoachFeedbackChat] Error fetching profile via API:', e)
          if (externalProfile) setLoadedProfile(externalProfile)
        }
      } catch (e) { 
        console.error('[CoachFeedbackChat] Profile load error:', e)
        if (externalProfile) setLoadedProfile(externalProfile)
      }
    }
    load()
  }, [show]) // Rimosso externalProfile dalle deps per evitare overwrite involontari

  const userProfile = loadedProfile || externalProfile

  // Determina modalita sessione
  const sessionMode = useMemo(() => {
    const profileFields = [
      userProfile?.platform, userProfile?.connection_quality, userProfile?.pass_level,
      userProfile?.smart_assist, userProfile?.input_delay, userProfile?.ai_weak_point
    ].filter(v => v != null && String(v).trim() !== '').length
    if (profileFields < 3) return 'profile_setup'
    if (lastMatch) return 'feedback'
    return 'update'
  }, [userProfile, lastMatch])

  // Inizializza form e stato quando si apre
  useEffect(() => {
    if (!show) return
    setFormSaved(false)
    // Apri form automaticamente se profilo incompleto
    const profileFields = [
      userProfile?.platform, userProfile?.connection_quality, userProfile?.pass_level,
      userProfile?.smart_assist, userProfile?.input_delay, userProfile?.ai_weak_point
    ].filter(v => v != null && String(v).trim() !== '').length
    setFormExpanded(profileFields < 3)
    // Pre-popola form con dati esistenti
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

  // Salva form dati tecnici via save-ai-info (0 HP, nessuna chiamata OpenAI)
  const handleFormSave = useCallback(async () => {
    setFormSaving(true)
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      
      if (!token) return

      const body = {}
      for (const [k, v] of Object.entries(formData)) {
        if (k === 'hours_per_week') {
          const n = v !== '' ? parseInt(String(v), 10) : null
          body[k] = Number.isFinite(n) ? n : null
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
        setFormExpanded(false)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
      }
    } catch (err) {
      console.error('[CoachFeedbackChat] Form save error:', err)
    } finally {
      setFormSaving(false)
    }
  }, [formData])

  // Suggerimenti iniziali adattivi (solo per chat step)
  const initialSuggestions = useMemo(() => {
    if (lang === 'en') {
      if (sessionMode === 'feedback') return ['It went well', "It didn't work", 'I followed your advice']
      return ["I changed something in my game", "I'm struggling with something", 'Any other feedback']
    }
    if (sessionMode === 'feedback') return ['E\' andata bene', 'Non ha funzionato', 'Ho seguito il tuo consiglio']
    return ['Ho cambiato qualcosa nel mio gioco', 'Ho difficolta con qualcosa', 'Altro feedback']
  }, [sessionMode, lang])

  // Messaggio iniziale automatico
  useEffect(() => {
    if (!show) return
    setMessages([])
    setSaved(false)

    const firstName = userProfile?.first_name || (lang === 'en' ? 'friend' : 'amico')

    let greeting = ''
    if (sessionMode === 'feedback' && lastMatch) {
      const opp = lastMatch.opponent_name || (lang === 'en' ? 'your opponent' : 'il tuo avversario')
      const form = lastMatch.formation_played || '?'
      const result = lastMatch.result || '?'
      greeting = lang === 'en'
        ? `Hi ${firstName}! I see you played ${form} vs ${opp} \u2014 ${result}. Tell me how it went!`
        : `Ciao ${firstName}! Vedo che hai giocato ${form} contro ${opp} \u2014 ${result}. Raccontami com'\u00e8 andata!`
    } else if (sessionMode === 'profile_setup') {
      greeting = lang === 'en'
        ? `Hi ${firstName}! Fill in your details above, then we can chat.`
        : `Ciao ${firstName}! Compila i tuoi dati qui sopra, poi possiamo parlare.`
    } else {
      greeting = lang === 'en'
        ? `Hi ${firstName}! Is there anything new you want to tell me?`
        : `Ciao ${firstName}! C'\u00e8 qualcosa di nuovo che vuoi dirmi?`
    }

    setTimeout(() => {
      setMessages([{ role: 'assistant', content: greeting }])
    }, 300)
  }, [show, sessionMode, userProfile, lastMatch, lang])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input quando appare
  useEffect(() => {
    if (show && !loading) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [show, loading])

  // Cleanup abort controller
  useEffect(() => {
    return () => { sendAbortRef.current?.abort() }
  }, [])

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

  // Salva e chiudi: invia conversazione a /api/save-coach-feedback
  const handleSaveAndClose = useCallback(async () => {
    if (saving) return
    // Se solo messaggio iniziale, chiudi senza salvare
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) {
      onClose?.()
      return
    }

    setSaving(true)
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        onClose?.()
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
        // Aggiorna il riassunto diagnostico (come fa match/new dopo salvataggio)
        try {
          await fetch('/api/refresh-diagnostic', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          })
        } catch (_) { /* non bloccare chiusura */ }
        setTimeout(() => onClose?.(), 1500)
      } else {
        console.error('[CoachFeedbackChat] Save error:', await res.text())
        onClose?.()
      }
    } catch (err) {
      console.error('[CoachFeedbackChat] Save error:', err)
      onClose?.()
    } finally {
      setSaving(false)
    }
  }, [saving, messages, sessionMode, lastMatch, onClose])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)'
      }}
    >
      {/* Dark theme per select option (browser nativo) */}
      <style>{`
        .coach-form-select option {
          background: #1a1a1a;
          color: #fff;
          padding: 6px;
        }
        .coach-form-select option:checked {
          background: #e65100;
          color: #fff;
        }
      `}</style>
      <div
        style={{
          width: 'clamp(340px, 92vw, 440px)',
          height: 'clamp(520px, 80vh, 680px)',
          background: 'rgba(0, 0, 0, 0.97)',
          border: '2px solid var(--neon-orange)',
          borderRadius: '16px',
          boxShadow: '0 0 30px rgba(255, 140, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            background: 'linear-gradient(135deg, var(--neon-orange), #e65100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Dumbbell size={20} color="white" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '16px' }}>
                {lang === 'en' ? 'Coach Gym' : 'Palestra Coach'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                {lang === 'en'
                  ? 'Profile & match feedback only. For tactical advice use the main chat.'
                  : 'Solo profilo e feedback partite. Per consigli tattici usa la chat principale.'}
              </div>
            </div>
          </div>
          <button
            onClick={handleSaveAndClose}
            disabled={saving}
            style={{
              background: saving ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '8px',
              cursor: saving ? 'wait' : 'pointer',
              color: 'white',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            {saved ? (
              <>{lang === 'en' ? 'Saved!' : 'Salvato!'}</>
            ) : saving ? (
              <>{lang === 'en' ? 'Saving...' : 'Salvo...'}</>
            ) : (
              <><Save size={14} /> {lang === 'en' ? 'Save & Close' : 'Salva e chiudi'}</>
            )}
          </button>
        </div>

        {/* Pannello dati tecnici espandibile (0 HP) — sempre accessibile */}
        <div style={{ borderBottom: '1px solid rgba(255,140,0,0.2)' }}>
          <button
            type="button"
            onClick={() => setFormExpanded(e => !e)}
            style={{
              width: '100%', padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: formExpanded ? 'rgba(255,140,0,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--neon-orange)', fontSize: '13px',
              transition: 'background 0.2s'
            }}
          >
            <span>{lang === 'en' ? 'My gaming profile' : 'Il mio profilo di gioco'}
              {formSaved && <span style={{ color: '#4caf50', marginLeft: '8px' }}>{lang === 'en' ? 'Saved!' : 'Salvato!'}</span>}
            </span>
            <span style={{ fontSize: '16px' }}>{formExpanded ? '\u25B2' : '\u25BC'}</span>
          </button>

          {formExpanded && (
            <div style={{ padding: '10px 14px 14px', maxHeight: '45vh', overflowY: 'auto', background: 'rgba(0,0,0,0.25)' }}>
              {/* Riga 1: 3 colonne */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={formLabelStyle}>{lang === 'en' ? 'Platform' : 'Piattaforma'}</label>
                  <select className="coach-form-select" style={formSelectStyle} value={formData.platform || ''} onChange={e => setFormData(p => ({ ...p, platform: e.target.value }))}>
                    <option value="">--</option><option value="console">Console</option><option value="pc">PC</option><option value="mobile">Mobile</option>
                  </select>
                </div>
                <div>
                  <label style={formLabelStyle}>{lang === 'en' ? 'Connection' : 'Connessione'}</label>
                  <select className="coach-form-select" style={formSelectStyle} value={formData.connection_quality || ''} onChange={e => setFormData(p => ({ ...p, connection_quality: e.target.value }))}>
                    <option value="">--</option><option value="good">{lang === 'en' ? 'Good' : 'Buona'}</option><option value="unstable">{lang === 'en' ? 'Unstable' : 'Instabile'}</option><option value="lag">Lag</option>
                  </select>
                </div>
                <div>
                  <label style={formLabelStyle}>{lang === 'en' ? 'Pass level' : 'Passaggi'}</label>
                  <select className="coach-form-select" style={formSelectStyle} value={formData.pass_level || ''} onChange={e => setFormData(p => ({ ...p, pass_level: e.target.value }))}>
                    <option value="">--</option><option value="pa1">PA1</option><option value="pa2">PA2</option><option value="pa3">PA3</option>
                  </select>
                </div>
              </div>
              {/* Riga 2: 3 colonne */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div>
                  <label style={formLabelStyle}>Smart Assist</label>
                  <select className="coach-form-select" style={formSelectStyle} value={formData.smart_assist || ''} onChange={e => setFormData(p => ({ ...p, smart_assist: e.target.value }))}>
                    <option value="">--</option><option value="yes">{lang === 'en' ? 'Yes' : 'Si'}</option><option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label style={formLabelStyle}>{lang === 'en' ? 'Input delay' : 'Input delay'}</label>
                  <select className="coach-form-select" style={formSelectStyle} value={formData.input_delay || ''} onChange={e => setFormData(p => ({ ...p, input_delay: e.target.value }))}>
                    <option value="">--</option><option value="yes">{lang === 'en' ? 'Yes' : 'Si'}</option><option value="no">No</option><option value="sometimes">{lang === 'en' ? 'Sometimes' : 'A volte'}</option>
                  </select>
                </div>
                <div>
                  <label style={formLabelStyle}>{lang === 'en' ? 'Weak point' : 'Punto debole'}</label>
                  <select className="coach-form-select" style={formSelectStyle} value={formData.ai_weak_point || ''} onChange={e => setFormData(p => ({ ...p, ai_weak_point: e.target.value }))}>
                    <option value="">--</option><option value="defence">{lang === 'en' ? 'Defence' : 'Difesa'}</option><option value="attack">{lang === 'en' ? 'Attack' : 'Attacco'}</option><option value="set_pieces">{lang === 'en' ? 'Set pieces' : 'Piazzati'}</option><option value="transitions">{lang === 'en' ? 'Transitions' : 'Transizioni'}</option><option value="final_minutes">{lang === 'en' ? 'Final min.' : 'Finale'}</option>
                  </select>
                </div>
              </div>
              {/* Riga 3: Divisione + Ore */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div>
                  <label style={formLabelStyle}>{lang === 'en' ? 'Division' : 'Divisione'}</label>
                  <input type="text" style={formFieldStyle} placeholder={lang === 'en' ? 'e.g. Div 3' : 'es. Div 3'}
                    value={formData.current_division || ''} onChange={e => setFormData(p => ({ ...p, current_division: e.target.value }))} maxLength={50} />
                </div>
                <div>
                  <label style={formLabelStyle}>{lang === 'en' ? 'Hrs/wk' : 'Ore/sett'}</label>
                  <input type="number" style={formFieldStyle} min="0" max="168" placeholder="0"
                    value={formData.hours_per_week ?? ''} onChange={e => setFormData(p => ({ ...p, hours_per_week: e.target.value }))} />
                </div>
              </div>
              {/* Riga 4: Testo */}
              <div style={{ marginTop: '8px' }}>
                <label style={formLabelStyle}>{lang === 'en' ? 'What to learn?' : 'Cosa vuoi imparare?'}</label>
                <input type="text" style={formFieldStyle} maxLength={255}
                  value={formData.ai_learn_goals || ''} onChange={e => setFormData(p => ({ ...p, ai_learn_goals: e.target.value }))}
                  placeholder={lang === 'en' ? 'e.g. defense vs pressing' : 'es. difesa vs pressing'} />
              </div>
              <div style={{ marginTop: '6px' }}>
                <label style={formLabelStyle}>{lang === 'en' ? 'Notes for AI' : 'Note per l\'IA'}</label>
                <input type="text" style={formFieldStyle} maxLength={500}
                  value={formData.ai_notes || ''} onChange={e => setFormData(p => ({ ...p, ai_notes: e.target.value }))}
                  placeholder={lang === 'en' ? 'Anything else...' : 'Qualsiasi altra cosa...'} />
              </div>
              <button
                onClick={handleFormSave} disabled={formSaving}
                style={{
                  width: '100%', marginTop: '10px', padding: '9px',
                  background: 'var(--neon-orange)', border: 'none', borderRadius: '6px',
                  color: 'white', fontSize: '12px', fontWeight: 600,
                  cursor: formSaving ? 'wait' : 'pointer', transition: 'opacity 0.2s',
                  opacity: formSaving ? 0.7 : 1
                }}
              >
                {formSaving ? (lang === 'en' ? 'Saving...' : 'Salvo...') : (lang === 'en' ? 'Save data' : 'Salva dati')}
              </button>
            </div>
          )}
        </div>

        {/* Chat */}
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.role === 'user'
                  ? 'var(--neon-orange)'
                  : 'rgba(255, 255, 255, 0.1)',
                fontSize: '14px',
                lineHeight: '1.6',
                wordWrap: 'break-word',
                border: msg.role === 'assistant' ? '1px solid rgba(255, 140, 0, 0.3)' : 'none'
              }}
            >
              {msg.content}
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', opacity: 0.7 }}>
              <div style={{ display: 'flex', gap: '4px', padding: '12px' }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--neon-orange)', animation: `bounce 1s infinite ${delay}s`
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (solo se pochi messaggi utente) */}
        {messages.filter(m => m.role === 'user').length < 2 && !loading && (
          <div style={{
            padding: '8px 12px 12px',
            borderTop: '1px solid rgba(255, 140, 0, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.3)'
          }}>
            {initialSuggestions.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAction(text)}
                disabled={loading || saving}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 140, 0, 0.1)',
                  border: '1px solid var(--neon-orange)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 140, 0, 0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 140, 0, 0.1)' }}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 140, 0, 0.2)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.5)'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder={lang === 'en' ? 'Profile or match feedback...' : 'Profilo o feedback partita...'}
            disabled={loading || saving}
            style={{
              flex: 1, padding: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || saving || !input.trim()}
            style={{
              padding: '12px 16px',
              background: loading || saving || !input.trim() ? 'rgba(255,255,255,0.1)' : 'var(--neon-orange)',
              border: 'none', borderRadius: '8px',
              cursor: loading || saving || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            aria-label={lang === 'en' ? 'Send' : 'Invia'}
          >
            <Send size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  )
}
