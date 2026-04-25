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

export default withAuth(function SmartPage() {
  const router = useRouter()
  const { lang, t } = useTranslation()
  const [enabled, setEnabled] = React.useState(false)
  const [loadingContext, setLoadingContext] = React.useState(true)
  const [contextData, setContextData] = React.useState(null)
  const [selectedImageName, setSelectedImageName] = React.useState('')
  const [uploadImage, setUploadImage] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [counterLoading, setCounterLoading] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState({
    extracted: true,
    tactical: true,
    coach: true
  })

  const currentContext = contextData?.context || null
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
      setContextData(null)
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Unable to reset' : 'Impossibile resettare'))
    } finally {
      setUploading(false)
    }
  }

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
          <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
            <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={24} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' }} />
              {lang === 'en' ? 'Upload your formation' : 'Carica la tua formazione'}
            </h2>

            <input id="smart-upload-input" type="file" accept="image/*" onChange={handleSelectImage} style={{ display: 'none' }} disabled={uploading} />
            <input id="smart-camera-input" type="file" accept="image/*" capture="environment" onChange={handleSelectImage} style={{ display: 'none' }} disabled={uploading} />

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
                    {t('uploadPhoto')}
                  </div>
                  <div style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', opacity: 0.8 }}>
                    {lang === 'en'
                      ? 'Load your 2D squad screenshot to unlock Smart Coach and contromisure.'
                      : 'Carica la schermata 2D della tua squadra per sbloccare Smart Coach e contromisure.'}
                  </div>
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
                      <span>{t('extracting')}</span>
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
              </>
            )}
          </div>

          {currentContext && (
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

              {expandedSections.extracted && <SmartSummaryBlock data={currentContext} lang={lang} />}
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

                  {currentCountermeasure ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(255, 165, 0, 0.1)',
                          border: '1px solid var(--neon-orange)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {currentCountermeasure.headline || (lang === 'en' ? 'Current structural read' : 'Lettura strutturale attuale')}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {currentCountermeasure.protect}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid var(--neon-blue)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {lang === 'en' ? 'Attacking route' : 'Via offensiva'}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {currentCountermeasure.attack}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid #22c55e',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {lang === 'en' ? 'Main mistake to avoid' : 'Errore da evitare'}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {currentCountermeasure.avoid}
                        </div>
                      </div>
                    </div>
                  ) : (
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
                <div style={{ height: '720px', minHeight: '520px' }}>
                  <AssistantChat
                    mode="page"
                    apiEndpoint="/api/smart/chat"
                    currentPageOverride="/smart"
                    initialSuggestionsOverride={smartChatSuggestions}
                  />
                </div>
              )}
            </div>
          </div>

          <style jsx>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </>
      )}
    </main>
  )
})

function SmartSummaryBlock({ data, lang }) {
  const players = Array.isArray(data?.players) ? data.players : []
  const coach = data?.coach && typeof data.coach === 'object' ? data.coach : null

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div>
          <strong>{lang === 'en' ? 'Formation' : 'Modulo'}:</strong> {data?.formation || 'N/A'}
        </div>
        <div>
          <strong>{lang === 'en' ? 'Detected starters' : 'Titolari rilevati'}:</strong> {players.length}
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
      {players.length > 0 && (
        <div style={{ display: 'grid', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
          {players.map((player, index) => (
            <div
              key={`${player.player_name || 'player'}-${index}`}
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                alignItems: 'center'
              }}
            >
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
