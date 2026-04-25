'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { withAuth } from '@/components/AuthWrapper'
import AssistantChat from '@/components/AssistantChat'
import { useTranslation } from '@/lib/i18n'
import { isEnabled } from '@/lib/featureFlags'
import { SMART_COACH_FLAG } from '@/lib/smartCoach'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'
import { getValidAccessToken, supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Shield,
  Target,
  Upload,
  X,
} from 'lucide-react'

function pickLang(val, lang) {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && (val.it !== undefined || val.en !== undefined)) return val[lang] || val.it || val.en || ''
  return String(val)
}

export default withAuth(function SmartPage() {
  const router = useRouter()
  const { lang, t } = useTranslation()
  const [enabled, setEnabled] = React.useState(false)
  const [loadingContext, setLoadingContext] = React.useState(true)
  const [contextData, setContextData] = React.useState(null)
  const [selectedImageName, setSelectedImageName] = React.useState('')
  const [uploadImage, setUploadImage] = React.useState(null)
  const [opponentUploadImage, setOpponentUploadImage] = React.useState(null)
  const [selectedOpponentImageName, setSelectedOpponentImageName] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [uploadingOpponent, setUploadingOpponent] = React.useState(false)
  const [error, setError] = React.useState('')
  const [counterLoading, setCounterLoading] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState({
    extracted: true,
    tactical: true,
    coach: true
  })

  const currentContext = contextData?.context || null
  const hasClientFormation = !!currentContext?.formation && Array.isArray(currentContext?.players) && currentContext.players.length > 0
  const hasOpponentFormation = !!currentContext?.opponent_formation && Array.isArray(currentContext?.opponent_players) && currentContext.opponent_players.length > 0
  const currentCountermeasure = Array.isArray(currentContext?.last_countermeasures) && currentContext.last_countermeasures.length > 0
    ? currentContext.last_countermeasures[currentContext.last_countermeasures.length - 1]
    : null

  const smartChatSuggestions = React.useMemo(() => (
    lang === 'en'
      ? [
          'What is my main structural weakness?',
          'How should I attack with this setup?',
          'What should I protect first in game?'
        ]
      : [
          'Qual è il mio punto debole strutturale?',
          'Come devo attaccare con questo assetto?',
          'Cosa devo proteggere per prima in partita?'
        ]
  ), [lang])

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
    if (active) loadContext()
    else setLoadingContext(false)
  }, [loadContext])

  const handleSelectImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
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
        setUploadImage(optimized.dataUrl)
      } catch (optErr) {
        throw new Error(getImageOptimizeUserMessage(optErr, t))
      }

      const extractRes = await fetch('/api/smart/extract-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrl: optimized.dataUrl })
      })
      const extracted = await safeJsonResponse(extractRes, lang === 'en' ? 'Unable to read Smart formation' : 'Impossibile leggere la formazione Smart')

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
      setUploadImage(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSelectOpponentImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingOpponent(true)
    setError('')
    setSelectedOpponentImageName(file.name)

    try {
      const token = await getToken()
      if (!token) throw new Error(lang === 'en' ? 'Session expired' : 'Sessione scaduta')

      let optimized
      try {
        optimized = await optimizeImageFile(file)
        setOpponentUploadImage(optimized.dataUrl)
      } catch (optErr) {
        throw new Error(getImageOptimizeUserMessage(optErr, t))
      }

      const extractRes = await fetch('/api/smart/extract-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrl: optimized.dataUrl })
      })
      const extracted = await safeJsonResponse(extractRes, lang === 'en' ? 'Unable to read opponent formation' : 'Impossibile leggere la formazione avversaria')

      const saveRes = await fetch('/api/smart/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...extracted, mode: 'opponent' })
      })
      const saved = await safeJsonResponse(saveRes, lang === 'en' ? 'Unable to save opponent context' : 'Impossibile salvare il contesto avversario')
      setContextData(saved)
      setCounterLoading(true)
      const generateRes = await fetch('/api/smart/countermeasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ variant: 'default' })
      })
      await safeJsonResponse(generateRes, lang === 'en' ? 'Unable to generate Smart countermeasure' : 'Impossibile generare contromisura Smart')
      await loadContext()
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Opponent upload failed' : 'Upload avversario fallito'))
      setSelectedOpponentImageName('')
      setOpponentUploadImage(null)
    } finally {
      setCounterLoading(false)
      setUploadingOpponent(false)
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
      setUploadImage(null)
      setSelectedOpponentImageName('')
      setOpponentUploadImage(null)
      setContextData(null)
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Unable to reset' : 'Impossibile resettare'))
    } finally {
      setUploading(false)
    }
  }

  const openSmartCoachChat = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-assistant-chat', {
        detail: {
          message: smartChatSuggestions[0] || ''
        }
      }))
    }
  }, [smartChatSuggestions])

  if (!enabled) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="neon-card" style={{ padding: '32px', textAlign: 'center' }}>
          <h1 className="neon-text" style={{ fontSize: '28px', marginBottom: '12px' }}>
            {lang === 'en' ? 'Smart Coach is not enabled' : 'La versione Smart non è attiva'}
          </h1>
          <button className="btn primary" onClick={() => router.push('/gestione-formazione')}>
            {lang === 'en' ? 'Open Pro' : 'Apri il Pro'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', padding: 'clamp(16px, 4vw, 24px)', paddingTop: '80px', color: '#fff' }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px clamp(16px, 4vw, 24px)',
          background: 'linear-gradient(180deg, rgba(10,10,10,0.98) 0%, rgba(10,10,10,0.95) 70%, transparent 100%)',
          backdropFilter: 'saturate(180%) blur(12px)',
          borderBottom: '1px solid rgba(255, 140, 0, 0.2)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button
            onClick={() => router.push('/')}
            className="neon-button"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
          >
            <ArrowLeft size={18} />
            {t('back')}
          </button>
          <h1 className="neon-text" style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, margin: 0 }}>
            Smart Coach
          </h1>
        </div>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {loadingContext ? (
        <div className="neon-card" style={{ padding: '32px', textAlign: 'center' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: 'var(--neon-cyan)' }} />
          <div>{lang === 'en' ? 'Loading...' : t('loading')}</div>
        </div>
      ) : (
        <>
          <div
            className="neon-card"
            style={{
              padding: '16px 18px',
              marginBottom: '20px',
              border: '1px solid rgba(0, 212, 255, 0.24)',
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.10), rgba(168, 85, 247, 0.08))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Brain size={20} style={{ color: 'var(--neon-cyan)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                  {lang === 'en' ? 'Smart version active' : 'Versione Smart attiva'}
                </div>
                <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.80)' }}>
                  {lang === 'en'
                    ? 'Smart gives you a fast structural read of your team, chat, and pre-match countermeasures from 2D screenshots. For deeper and more precise advice based on full roster, player, and coach data, switch to Pro.'
                    : 'La Smart ti offre lettura strutturale rapida della squadra, chat e contromisure pre-partita da schermate 2D. Per consigli piu dettagliati e precisi basati su rosa completa, giocatori e allenatore, passa alla versione Pro.'}
                </div>
              </div>
            </div>
          </div>

          <input id="smart-upload-input" type="file" accept="image/*" onChange={handleSelectImage} style={{ display: 'none' }} disabled={uploading} />
          <input id="smart-camera-input" type="file" accept="image/*" capture="environment" onChange={handleSelectImage} style={{ display: 'none' }} disabled={uploading} />
          <input id="smart-opponent-upload-input" type="file" accept="image/*" onChange={handleSelectOpponentImage} style={{ display: 'none' }} disabled={uploadingOpponent} />
          <input id="smart-opponent-camera-input" type="file" accept="image/*" capture="environment" onChange={handleSelectOpponentImage} style={{ display: 'none' }} disabled={uploadingOpponent} />

          <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
            <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={24} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' }} />
              {hasClientFormation
                ? (lang === 'en' ? 'Your current formation' : 'La tua formazione attuale')
                : (lang === 'en' ? 'Upload your formation' : 'Carica la tua formazione')}
            </h2>

            {!uploadImage ? (
              <>
                <div
                  className="upload-area"
                  style={{
                    padding: 'clamp(24px, 6vw, 48px)',
                    background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 70%)',
                    border: '2px dashed rgba(251, 191, 36, 0.5)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'default',
                    opacity: uploading ? 0.5 : 1,
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                >
                  <Camera size={48} style={{ marginBottom: '16px', color: '#fbbf24', filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.9))' }} />
                  <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 600, marginBottom: '8px' }}>
                      {hasClientFormation
                        ? (lang === 'en' ? 'Update your 2D formation' : 'Aggiorna la tua formazione 2D')
                        : t('uploadPhoto')}
                  </div>
                  <div style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', opacity: 0.8 }}>
                      {hasClientFormation
                        ? (lang === 'en'
                            ? 'Load a new 2D screenshot to replace the formation currently used by Smart Coach.'
                            : 'Carica una nuova schermata 2D per sostituire la formazione attualmente usata da Smart Coach.')
                        : (lang === 'en'
                            ? 'Load your 2D squad screenshot to unlock Smart Coach and contromisure.'
                            : 'Carica la schermata 2D della tua squadra per sbloccare Smart Coach e contromisure.')}
                  </div>
                    {hasClientFormation && (
                      <div style={{ fontSize: '12px', opacity: 0.62, marginTop: '8px' }}>
                        {lang === 'en'
                          ? `Current module: ${currentContext?.formation || 'N/A'}`
                          : `Modulo attuale: ${currentContext?.formation || 'N/A'}`}
                      </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('smart-upload-input')?.click()}
                    className="neon-button"
                    disabled={uploading}
                    style={{ flex: '1 1 180px', minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Upload size={16} />
                    {t('upload')}
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('smart-camera-input')?.click()}
                    className="neon-button"
                    disabled={uploading}
                    style={{ flex: '1 1 180px', minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Camera size={16} />
                    {t('cameraCaptureTitle')}
                  </button>
                  {hasClientFormation && (
                    <button
                      type="button"
                      onClick={handleResetSmart}
                      className="neon-button"
                      disabled={uploading}
                      style={{ flex: '1 1 180px', minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <X size={16} />
                      {lang === 'en' ? 'Reset Smart context' : 'Resetta Smart'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <img src={uploadImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {uploading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}>
                      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--neon-orange)' }} />
                      <span>
                        {lang === 'en'
                          ? 'Extracting your formation and updating Smart context...'
                          : 'Sto estraendo la tua formazione e aggiornando il contesto Smart...'}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => document.getElementById('smart-upload-input')?.click()}
                      className="btn primary"
                      style={{ flex: 1, minWidth: '200px' }}
                    >
                      <RefreshCw size={16} />
                      {lang === 'en' ? 'Load another image' : 'Carica un\'altra immagine'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setUploadImage(null)
                      setSelectedImageName('')
                    }}
                    className="neon-button"
                    disabled={uploading}
                  >
                    <X size={16} />
                    {t('cancel')}
                  </button>
                </div>
                {uploading && (
                  <div style={{
                    padding: '12px 14px',
                    marginTop: '12px',
                    background: 'rgba(0, 212, 255, 0.08)',
                    border: '1px solid rgba(0, 212, 255, 0.18)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.88)'
                  }}>
                    {lang === 'en'
                      ? 'Smart is updating your saved formation. Wait until extraction completes before loading the opponent.'
                      : 'Smart sta aggiornando la tua formazione salvata. Attendi la fine dell’estrazione prima di caricare l’avversario.'}
                  </div>
                )}
              </>
            )}
          </div>

          {hasClientFormation && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}
                onClick={() => setExpandedSections(prev => ({ ...prev, extracted: !prev.extracted }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={24} color="#22C55E" />
                  {t('formationExtracted')}
                </h2>
                {expandedSections.extracted ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.extracted && (
                <>
                  <SmartSummaryBlock data={currentContext} lang={lang} />
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('smart-upload-input')?.click()}
                      className="btn primary"
                      disabled={uploading}
                      style={{ flex: '1 1 220px' }}
                    >
                      <RefreshCw size={16} />
                      {lang === 'en' ? 'Update my formation' : 'Aggiorna la mia formazione'}
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('smart-camera-input')?.click()}
                      className="neon-button"
                      disabled={uploading}
                      style={{ flex: '1 1 220px' }}
                    >
                      <Camera size={16} />
                      {lang === 'en' ? 'Take a new photo' : 'Scatta una nuova foto'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {hasClientFormation && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={24} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' }} />
                {lang === 'en' ? 'Upload opponent formation' : 'Carica la formazione avversaria'}
              </h2>

              {!opponentUploadImage && !hasOpponentFormation ? (
                <>
                  <div
                    className="upload-area"
                    style={{
                      padding: 'clamp(24px, 6vw, 48px)',
                      background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 70%)',
                      border: '2px dashed rgba(251, 191, 36, 0.5)',
                      borderRadius: '12px',
                      textAlign: 'center',
                      cursor: 'default',
                      opacity: uploadingOpponent ? 0.5 : 1,
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                  >
                    <Camera size={48} style={{ marginBottom: '16px', color: '#fbbf24', filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.9))' }} />
                    <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 600, marginBottom: '8px' }}>
                      {lang === 'en' ? 'Upload opponent photo' : 'Carica la foto avversaria'}
                    </div>
                    <div style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', opacity: 0.8 }}>
                      {lang === 'en'
                        ? 'Load the opponent 2D formation to unlock true pre-match countermeasures.'
                        : 'Carica la formazione 2D avversaria per sbloccare contromisure pre-partita reali.'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('smart-opponent-upload-input')?.click()}
                      className="neon-button"
                      disabled={uploadingOpponent}
                      style={{ flex: '1 1 180px', minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Upload size={16} />
                      {t('upload')}
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('smart-opponent-camera-input')?.click()}
                      className="neon-button"
                      disabled={uploadingOpponent}
                      style={{ flex: '1 1 180px', minHeight: '48px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Camera size={16} />
                      {t('cameraCaptureTitle')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {opponentUploadImage && (
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                      <img src={opponentUploadImage} alt="Opponent preview" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} />
                    </div>
                  )}
                  {uploadingOpponent && (
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', justifyContent: 'center' }}>
                      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--neon-orange)' }} />
                      <span>{lang === 'en' ? 'Extracting opponent formation and generating countermeasures...' : 'Sto estraendo la formazione avversaria e generando le contromisure...'}</span>
                    </div>
                  )}
                  {hasOpponentFormation && (
                    <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', marginBottom: '16px' }}>
                      <strong>{lang === 'en' ? 'Opponent formation extracted' : 'Formazione avversaria estratta'}:</strong> {currentContext.opponent_formation || 'N/A'}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      onClick={() => document.getElementById('smart-opponent-upload-input')?.click()}
                      className="btn primary"
                      style={{ flex: 1, minWidth: '200px' }}
                      disabled={uploadingOpponent}
                    >
                      <RefreshCw size={16} />
                      {lang === 'en' ? 'Load another opponent image' : 'Carica un\'altra immagine avversaria'}
                    </button>
                    <button
                      onClick={() => {
                        setOpponentUploadImage(null)
                        setSelectedOpponentImageName('')
                      }}
                      className="neon-button"
                      disabled={uploadingOpponent}
                    >
                      <X size={16} />
                      {t('cancel')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}
                onClick={() => setExpandedSections(prev => ({ ...prev, tactical: !prev.tactical }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Shield size={24} color="var(--neon-orange)" />
                  Contromisure
                </h2>
                {expandedSections.tactical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.tactical && (
                <>
                  <p style={{ fontSize: 'clamp(13px, 2.5vw, 14px)', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', marginTop: 0 }}>
                    {lang === 'en'
                      ? 'Contromisure based on the uploaded formation and the Smart context available.'
                      : 'Contromisure basate sulla formazione caricata e sul contesto Smart disponibile.'}
                  </p>

                  {counterLoading && (
                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}>
                      <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--neon-orange)' }} />
                      <span>{lang === 'en' ? 'Generating pre-match countermeasures...' : 'Sto generando le contromisure pre-partita...'}</span>
                    </div>
                  )}

                  {hasOpponentFormation && currentCountermeasure ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Target size={24} color="var(--neon-blue)" />
                            {lang === 'en' ? 'Opponent formation analysis' : t('opponentFormationAnalysis')}
                          </h3>
                        </div>

                        {currentCountermeasure.analysis?.is_meta_formation && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(255, 165, 0, 0.1)',
                            border: '1px solid rgba(255, 165, 0, 0.3)',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <AlertCircle size={18} color="var(--neon-orange)" />
                            <strong>{t('metaFormation')}:</strong> {pickLang(currentCountermeasure.analysis.meta_type, lang)}
                          </div>
                        )}

                        <div style={{ marginBottom: '16px', lineHeight: '1.7' }}>
                          {pickLang(currentCountermeasure.analysis?.opponent_formation_analysis, lang)}
                        </div>

                        {currentCountermeasure.analysis?.strengths?.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <strong style={{ color: 'var(--neon-orange)' }}>{t('formationStrengths')}:</strong>
                            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                              {currentCountermeasure.analysis.strengths.map((strength, idx) => (
                                <li key={idx} style={{ marginBottom: '4px' }}>{pickLang(strength, lang)}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentCountermeasure.analysis?.weaknesses?.length > 0 && (
                          <div>
                            <strong style={{ color: 'var(--neon-blue)' }}>{t('formationWeaknesses')}:</strong>
                            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                              {currentCountermeasure.analysis.weaknesses.map((weakness, idx) => (
                                <li key={idx} style={{ marginBottom: '4px' }}>{pickLang(weakness, lang)}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentCountermeasure.analysis?.why_weaknesses && (
                          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px', fontSize: 'clamp(13px, 3vw, 14px)' }}>
                            <strong>{t('reason')}:</strong> {pickLang(currentCountermeasure.analysis.why_weaknesses, lang)}
                          </div>
                        )}
                      </div>

                      {((currentCountermeasure.countermeasures?.formation_adjustments?.length || 0) > 0 ||
                        (currentCountermeasure.countermeasures?.tactical_adjustments?.length || 0) > 0) && (
                        <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
                          <h3 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                            <Shield size={24} color="var(--neon-orange)" />
                            {t('tacticalCountermeasures')}
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(currentCountermeasure.countermeasures?.formation_adjustments || []).map((adj, idx) => (
                              <div key={`formation-${idx}`} style={{
                                padding: 'clamp(12px, 3vw, 16px)',
                                background: 'rgba(255, 165, 0, 0.1)',
                                border: '1px solid var(--neon-orange)',
                                borderRadius: '8px'
                              }}>
                                <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                                  {adj.type === 'formation_change' ? t('changeFormation') : t('changePlayingStyle')}: {pickLang(adj.suggestion, lang)}
                                </div>
                                <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                                  {pickLang(adj.reason, lang)}
                                </div>
                              </div>
                            ))}

                            {(currentCountermeasure.countermeasures?.tactical_adjustments || []).map((adj, idx) => (
                              <div key={`tactical-${idx}`} style={{
                                padding: 'clamp(12px, 3vw, 16px)',
                                background: 'rgba(0, 212, 255, 0.1)',
                                border: '1px solid var(--neon-blue)',
                                borderRadius: '8px'
                              }}>
                                <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                                  {adj.type === 'defensive_line' ? t('adjustDefensiveLine') :
                                   adj.type === 'pressing' ? t('adjustPressing') :
                                   adj.type === 'possession_strategy' ? t('adjustPossession') :
                                   t('changePlayingStyle')}: {pickLang(adj.suggestion, lang)}
                                </div>
                                <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                                  {pickLang(adj.reason, lang)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentCountermeasure.warnings?.length > 0 && (
                        <div style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(255, 165, 0, 0.1)',
                          border: '1px solid rgba(255, 165, 0, 0.3)',
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
                            <AlertCircle size={18} color="var(--neon-orange)" />
                            {t('warnings')}
                          </div>
                          <ul style={{ marginLeft: '24px' }}>
                            {currentCountermeasure.warnings.map((warning, idx) => (
                              <li key={idx} style={{ marginBottom: '4px', fontSize: 'clamp(13px, 3vw, 14px)' }}>{pickLang(warning, lang)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{
                        padding: 'clamp(10px, 2.5vw, 12px)',
                        background: 'rgba(0, 212, 255, 0.1)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        borderRadius: '8px',
                        fontSize: 'clamp(12px, 2.5vw, 13px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        <span><strong>{t('confidence')}:</strong> {currentCountermeasure.confidence ?? 'N/A'}%</span>
                        <span><strong>{t('dataQuality')}:</strong> {currentCountermeasure.data_quality || 'N/A'}</span>
                      </div>

                      <div
                        style={{
                          padding: '14px',
                          background: 'rgba(251, 191, 36, 0.08)',
                          border: '1px solid rgba(251, 191, 36, 0.22)',
                          borderRadius: '10px',
                          fontSize: 'clamp(13px, 3vw, 14px)',
                          lineHeight: 1.65,
                          color: 'rgba(255,255,255,0.9)'
                        }}
                      >
                        {lang === 'en'
                          ? 'Smart version: for detailed and more precise advice, use the Pro version.'
                          : 'Versione Smart: per consigli dettagliati e più precisi usa la versione Pro.'}
                      </div>
                    </div>
                  ) : hasOpponentFormation ? (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => handleGenerateCountermeasure('default')}
                      disabled={!currentContext || counterLoading}
                      style={{ width: '100%' }}
                    >
                      {counterLoading ? (
                        <>
                          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          {lang === 'en' ? 'Generating countermeasures' : 'Genero contromisure'}
                        </>
                      ) : (
                        <>
                          <Brain size={18} />
                          {lang === 'en' ? 'Generate countermeasures' : 'Genera contromisure'}
                        </>
                      )}
                    </button>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.66)', lineHeight: 1.6 }}>
                      {lang === 'en'
                        ? 'Upload the opponent formation to unlock true pre-match countermeasures.'
                        : 'Carica la formazione avversaria per sbloccare le vere contromisure pre-partita.'}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="neon-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}
                onClick={() => setExpandedSections(prev => ({ ...prev, coach: !prev.coach }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Brain size={24} color="var(--neon-blue)" />
                  Coach IA
                </h2>
                {expandedSections.coach ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.coach && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ fontSize: 'clamp(13px, 2.5vw, 14px)', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
                    {lang === 'en'
                      ? 'Open the Smart Coach chat to reason on your current setup and the uploaded match context.'
                      : 'Apri la chat Smart Coach per ragionare sul tuo assetto attuale e sul contesto partita caricato.'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {smartChatSuggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="neon-button"
                        style={{ fontSize: '12px', padding: '8px 12px' }}
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('open-assistant-chat', { detail: { message: item } }))
                          }
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={openSmartCoachChat}
                    style={{ width: '100%' }}
                  >
                    <Brain size={18} />
                    {lang === 'en' ? 'Open Coach IA' : 'Apri Coach IA'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <style jsx>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
          <AssistantChat
            mode="popup"
            apiEndpoint="/api/smart/chat"
            currentPageOverride="/smart"
            initialSuggestionsOverride={smartChatSuggestions}
                    titleOverride={lang === 'en' ? 'AI Assistant - Smart Version' : 'AI Assistant - Versione Smart'}
                    subtitleOverride={lang === 'en' ? 'Pre-match Smart coaching' : 'Coaching Smart pre-partita'}
          />
        </>
      )}
    </main>
  )
})

function SmartSummaryBlock({ data, lang }) {
  const coach = data?.coach && typeof data.coach === 'object' ? data.coach : null

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div>
          <strong>{lang === 'en' ? 'Formation' : 'Modulo'}:</strong> {data?.formation || 'N/A'}
        </div>
      </div>
      {coach?.coach_name && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            fontSize: 'clamp(12px, 2.5vw, 14px)'
          }}
        >
          <strong style={{ color: 'var(--neon-blue)' }}>✓ {lang === 'en' ? 'Coach detected' : 'Allenatore estratto'}:</strong> {coach.coach_name}
          {coach.age ? ` (${coach.age} ${lang === 'en' ? 'years' : 'anni'})` : ''}
        </div>
      )}
      <div
        style={{
          padding: '14px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 'clamp(13px, 3vw, 14px)',
          lineHeight: 1.65,
          color: 'rgba(255,255,255,0.84)'
        }}
      >
        {lang === 'en'
          ? 'Your current formation is ready to be used by Smart Coach for pre-match analysis and opponent countermeasures.'
          : 'La tua formazione attuale è pronta per essere usata da Smart Coach nell’analisi pre-partita e nelle contromisure contro l’avversario.'}
      </div>
    </div>
  )
}
