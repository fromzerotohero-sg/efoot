'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { withAuth } from '@/components/AuthWrapper'
import { useTranslation } from '@/lib/i18n'
import { isEnabled } from '@/lib/featureFlags'
import { SMART_COACH_FLAG } from '@/lib/smartCoach'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'
import { getValidAccessToken, supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  Upload,
  Zap,
} from 'lucide-react'

function SmartPage() {
  const router = useRouter()
  const { lang, t } = useTranslation()
  const [enabled, setEnabled] = React.useState(false)
  const [loadingContext, setLoadingContext] = React.useState(true)
  const [contextData, setContextData] = React.useState(null)
  const [selectedImageName, setSelectedImageName] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [counterLoading, setCounterLoading] = React.useState(false)
  const [chatLoading, setChatLoading] = React.useState(false)
  const [chatInput, setChatInput] = React.useState('')

  const currentContext = contextData?.context || null
  const readiness = contextData?.readiness?.level || 'weak'

  const getToken = React.useCallback(async () => {
    const customToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (customToken) return customToken
    const valid = await getValidAccessToken()
    if (valid) return valid
    if (supabase) {
      const { data: session } = await supabase.auth.getSession()
      return session?.session?.access_token || null
    }
    return null
  }, [])

  const loadContext = React.useCallback(async () => {
    setLoadingContext(true)
    setError('')

    try {
      const token = await getToken()
      if (!token) throw new Error(lang === 'en' ? 'Session expired' : 'Sessione scaduta')

      const res = await fetch('/api/smart/context', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      const data = await safeJsonResponse(res, lang === 'en' ? 'Unable to load Smart context' : 'Impossibile caricare Smart')
      setContextData(data)
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Unable to load Smart' : 'Impossibile caricare Smart'))
    } finally {
      setLoadingContext(false)
    }
  }, [getToken, lang])

  React.useEffect(() => {
    const active = isEnabled(SMART_COACH_FLAG)
    setEnabled(active)
    if (active) {
      loadContext()
    } else {
      setLoadingContext(false)
    }
  }, [loadContext])

  const handleSelectImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setError('')
    setSelectedImageName(file.name)

    try {
      const token = await getToken()
      if (!token) throw new Error(lang === 'en' ? 'Session expired' : 'Sessione scaduta')

      let optimized
      try {
        optimized = await optimizeImageFile(file)
      } catch (optErr) {
        throw new Error(getImageOptimizeUserMessage(optErr, t))
      }

      const res = await fetch('/api/smart/extract-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrl: optimized.dataUrl })
      })

      const extracted = await safeJsonResponse(res, lang === 'en' ? 'Unable to read Smart formation' : 'Impossibile leggere la formazione Smart')
      const saveRes = await fetch('/api/smart/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(extracted)
      })
      const saved = await safeJsonResponse(saveRes, lang === 'en' ? 'Unable to save Smart context' : 'Impossibile salvare Smart')
      setContextData(saved)
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Upload failed' : 'Upload fallito'))
      setSelectedImageName('')
    } finally {
      setUploading(false)
    }
  }

  const handleResetSmart = async () => {
    setUploading(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new Error(lang === 'en' ? 'Session expired' : 'Sessione scaduta')

      const res = await fetch('/api/smart/context', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      await safeJsonResponse(res, lang === 'en' ? 'Unable to reset Smart context' : 'Impossibile resettare Smart')
      setSelectedImageName('')
      await loadContext()
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Unable to reset' : 'Impossibile resettare'))
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateCountermeasure = async (variant = 'default') => {
    setCounterLoading(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new Error(lang === 'en' ? 'Session expired' : 'Sessione scaduta')

      const res = await fetch('/api/smart/countermeasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ variant })
      })
      await safeJsonResponse(res, lang === 'en' ? 'Unable to generate Smart countermeasure' : 'Impossibile generare contromisura Smart')
      await loadContext()
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Unable to generate countermeasure' : 'Impossibile generare contromisura'))
    } finally {
      setCounterLoading(false)
    }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    setChatLoading(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new Error(lang === 'en' ? 'Session expired' : 'Sessione scaduta')

      const res = await fetch('/api/smart/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: chatInput.trim() })
      })
      await safeJsonResponse(res, lang === 'en' ? 'Unable to use Smart chat' : 'Impossibile usare la chat Smart')
      setChatInput('')
      await loadContext()
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Unable to use Smart chat' : 'Impossibile usare la chat Smart'))
    } finally {
      setChatLoading(false)
    }
  }

  if (!enabled) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="neon-card" style={{ padding: '32px', textAlign: 'center' }}>
          <h1 className="neon-text" style={{ fontSize: '28px', marginBottom: '12px' }}>
            {lang === 'en' ? 'Smart trial is not enabled' : 'La versione Smart non è attiva'}
          </h1>
          <p style={{ opacity: 0.8, marginBottom: '20px' }}>
            {lang === 'en'
              ? 'Open the full Pro experience instead.'
              : 'Apri direttamente la versione Pro completa.'}
          </p>
          <button className="btn primary" onClick={() => router.push('/gestione-formazione')}>
            {lang === 'en' ? 'Open Pro' : 'Apri il Pro'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/')}
          className="neon-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>
        <h1 className="neon-text" style={{ fontSize: 'clamp(28px, 5vw, 38px)', margin: 0 }}>
          {lang === 'en' ? 'Smart Coach' : 'Smart Coach'}
        </h1>
      </div>

      <div className="neon-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#FFD76A' }}>
              <Sparkles size={18} />
              <span style={{ fontWeight: 700 }}>{lang === 'en' ? 'Quick premium trial' : 'Prova premium rapida'}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', lineHeight: 1.2, margin: '0 0 12px 0', color: '#fff' }}>
              {lang === 'en'
                ? 'Try the coach in under a minute'
                : 'Prova il coach in meno di un minuto'}
            </h2>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,0.78)' }}>
              {lang === 'en'
                ? 'Upload one 2D squad screenshot and start immediately with 2 tactical suggestions and 1 Smart coach chat. Your Pro experience stays untouched.'
                : 'Carica una schermata 2D della tua squadra e parti subito con 2 suggerimenti tattici e 1 chat Smart. La tua versione Pro resta intatta.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/gestione-formazione')}
            className="btn primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            {lang === 'en' ? 'Open Pro' : 'Apri il Pro'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} />
          {error}
        </div>
      )}

      {loadingContext ? (
        <div className="neon-card" style={{ padding: '36px', textAlign: 'center' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: 'var(--neon-cyan)' }} />
          <div>{lang === 'en' ? 'Loading Smart experience...' : 'Carico l\'esperienza Smart...'}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="neon-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Camera size={20} color="var(--neon-cyan)" />
                <h3 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>
                  {lang === 'en' ? 'Your 2D formation' : 'La tua formazione 2D'}
                </h3>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.74)', lineHeight: 1.6, marginBottom: '18px' }}>
                {lang === 'en'
                  ? 'Best result: 11 starters visible, clear module, coach visible if possible.'
                  : 'Risultato migliore: 11 titolari visibili, modulo chiaro, allenatore visibile se possibile.'}
              </p>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  minHeight: '220px',
                  border: '1px dashed rgba(0,212,255,0.35)',
                  borderRadius: '16px',
                  cursor: uploading ? 'wait' : 'pointer',
                  background: 'rgba(0, 161, 166, 0.05)',
                  textAlign: 'center',
                  padding: '24px'
                }}
              >
                <Upload size={32} color="var(--neon-cyan)" />
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  {uploading
                    ? (lang === 'en' ? 'Reading your squad...' : 'Sto leggendo la tua squadra...')
                    : (lang === 'en' ? 'Choose screenshot' : 'Scegli screenshot')}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.68)', maxWidth: '360px' }}>
                  {lang === 'en'
                    ? 'Smart does not modify your Pro roster. It only creates a separate trial context.'
                    : 'La Smart non modifica la tua rosa Pro. Crea solo un contesto di prova separato.'}
                </div>
                {selectedImageName && (
                  <div style={{ fontSize: '12px', color: '#FFD76A' }}>{selectedImageName}</div>
                )}
                <input type="file" accept="image/*" onChange={handleSelectImage} disabled={uploading} style={{ display: 'none' }} />
              </label>

              {currentContext && (
                <button
                  type="button"
                  onClick={handleResetSmart}
                  className="neon-button"
                  style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  disabled={uploading}
                >
                  <RefreshCw size={16} />
                  {lang === 'en' ? 'Reset Smart context' : 'Resetta contesto Smart'}
                </button>
              )}
            </div>

            <div className="neon-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <CheckCircle2 size={20} color={readiness === 'good' ? '#22c55e' : readiness === 'partial' ? '#f59e0b' : 'var(--neon-cyan)'} />
                <h3 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>
                  {lang === 'en' ? 'Detected squad' : 'Squadra rilevata'}
                </h3>
              </div>

              {currentContext ? (
                <SmartSummaryBlock data={currentContext} lang={lang} />
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.66)', lineHeight: 1.6 }}>
                  {lang === 'en'
                    ? 'Upload a screenshot to populate this area, then use tactical suggestions and chat immediately.'
                    : 'Carica uno screenshot per popolare quest\'area, poi usa subito suggerimenti tattici e chat.'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="neon-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Target size={20} color="#FFD76A" />
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>
                    {lang === 'en' ? 'Tactical suggestions' : 'Suggerimenti tattici'}
                  </h3>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: '18px' }}>
                {lang === 'en'
                  ? 'Two fast tactical suggestions based on your 2D formation and your shared account context.'
                  : 'Due suggerimenti tattici rapidi basati sulla tua formazione 2D e sul contesto condiviso del profilo.'}
              </p>

              {Array.isArray(currentContext?.last_countermeasures) && currentContext.last_countermeasures.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
                  {currentContext.last_countermeasures.map((item, index) => (
                    <div key={`${item.generated_at || index}`} style={{ padding: '16px', border: '1px solid rgba(255,215,106,0.2)', borderRadius: '14px', background: 'rgba(255,215,106,0.05)' }}>
                      <div style={{ fontWeight: 700, color: '#FFD76A', marginBottom: '12px' }}>
                        {item.headline || `${lang === 'en' ? 'Suggestion' : 'Suggerimento'} ${index + 1}`}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '8px', color: 'rgba(255,255,255,0.82)' }}>
                        <li><strong>{lang === 'en' ? 'Protect:' : 'Proteggi:'}</strong> {item.protect}</li>
                        <li><strong>{lang === 'en' ? 'Attack:' : 'Attacca:'}</strong> {item.attack}</li>
                        <li><strong>{lang === 'en' ? 'Avoid:' : 'Evita:'}</strong> {item.avoid}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => handleGenerateCountermeasure(currentContext?.last_countermeasures?.length ? 'alternative' : 'default')}
                  disabled={!currentContext || counterLoading}
                >
                  {counterLoading
                    ? (lang === 'en' ? 'Generating...' : 'Genero...')
                    : currentContext?.last_countermeasures?.length
                      ? (lang === 'en' ? 'Generate alternative read' : 'Genera lettura alternativa')
                      : (lang === 'en' ? 'Generate suggestions' : 'Genera suggerimenti')}
                </button>
              </div>
            </div>

            <div className="neon-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MessageSquare size={20} color="var(--neon-cyan)" />
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>
                    {lang === 'en' ? 'Coach IA' : 'Coach IA'}
                  </h3>
                </div>
              </div>

              {currentContext?.last_chat_answer ? (
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'rgba(255,255,255,0.84)', lineHeight: 1.65 }}>
                    {currentContext.last_chat_answer}
                  </div>
                  {Array.isArray(currentContext.last_chat_suggestions) && currentContext.last_chat_suggestions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {currentContext.last_chat_suggestions.map((item) => (
                        <span key={item} style={{ padding: '8px 12px', borderRadius: '999px', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--neon-cyan)', fontSize: '13px' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  <button type="button" className="btn primary" onClick={() => router.push('/gestione-formazione')}>
                    {lang === 'en' ? 'Open Pro for deeper coaching' : 'Apri il Pro per coaching più profondo'}
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: '18px' }}>
                    {lang === 'en'
                      ? 'Ask one focused question about your current formation. Smart answers from team structure, not from a full Pro roster.'
                      : 'Fai una domanda mirata sulla tua formazione attuale. Smart risponde dalla struttura squadra, non da una rosa Pro completa.'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                    {[
                      lang === 'en' ? 'What is my main structural weakness?' : 'Qual è il mio punto debole strutturale?',
                      lang === 'en' ? 'How should I defend the center?' : 'Come devo proteggere il centro?',
                      lang === 'en' ? 'What is my first attacking priority?' : 'Qual è la mia prima priorità offensiva?'
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="neon-button"
                        style={{ fontSize: '12px', padding: '8px 12px' }}
                        onClick={() => setChatInput(suggestion)}
                        disabled={chatLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    rows={5}
                    disabled={!currentContext || chatLoading}
                    placeholder={lang === 'en'
                      ? 'Example: what is my main structural weakness against a 4-3-3?'
                      : 'Esempio: qual è il mio punto debole strutturale contro un 4-3-3?'}
                    style={{
                      width: '100%',
                      borderRadius: '14px',
                      border: '1px solid rgba(0,212,255,0.2)',
                      padding: '14px 16px',
                      background: 'rgba(0,0,0,0.22)',
                      color: '#fff',
                      resize: 'vertical',
                      minHeight: '140px',
                      marginBottom: '16px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={handleSendChat}
                      disabled={!currentContext || chatLoading || !chatInput.trim()}
                    >
                      {chatLoading ? (lang === 'en' ? 'Sending...' : 'Invio...') : (lang === 'en' ? 'Use Smart chat' : 'Usa la chat Smart')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="neon-card" style={{ padding: '22px', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {lang === 'en' ? 'Ready for the full product?' : 'Pronto per il prodotto completo?'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
                {lang === 'en'
                  ? 'Use Pro for full roster management, reserves, player detail, and deeper coaching.'
                  : 'Usa il Pro per rosa completa, riserve, dettagli giocatori e coaching più profondo.'}
              </div>
            </div>
            <button type="button" className="btn primary" onClick={() => router.push('/gestione-formazione')}>
              <Zap size={16} style={{ marginRight: '8px' }} />
              {lang === 'en' ? 'Open Pro' : 'Apri il Pro'}
            </button>
          </div>

          <style jsx>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </>
      )}
    </main>
  )
}

function SmartSummaryBlock({ data, lang }) {
  const players = Array.isArray(data?.players) ? data.players : []
  const coach = data?.coach && typeof data.coach === 'object' ? data.coach : null

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <InfoPill label={lang === 'en' ? 'Formation' : 'Modulo'} value={data?.formation || (lang === 'en' ? 'Not detected' : 'Non rilevato')} />
        <InfoPill label={lang === 'en' ? 'Starters' : 'Titolari'} value={String(players.length)} />
        <InfoPill label={lang === 'en' ? 'Coach' : 'Allenatore'} value={coach?.coach_name || (lang === 'en' ? 'Not detected' : 'Non rilevato')} />
      </div>
      {players.length > 0 && (
        <div style={{ display: 'grid', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
          {players.map((player, index) => (
            <div key={`${player.player_name || 'player'}-${index}`} style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 600 }}>{player.player_name || (lang === 'en' ? 'Unknown player' : 'Giocatore sconosciuto')}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{player.position || '?'}</div>
              </div>
              <div style={{ color: '#FFD76A', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {player.overall_rating != null ? player.overall_rating : (lang === 'en' ? 'n/a' : 'n/d')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoPill({ label, value }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: '999px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.18)' }}>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.62)', marginRight: '8px' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 700 }}>{value}</span>
    </div>
  )
}

export default withAuth(SmartPage)
