'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { Upload, AlertCircle, CheckCircle2, RefreshCw, X, Camera, Calendar, Trophy, ChevronDown, ChevronUp, Users, Target, TrendingUp, TrendingDown, Shield, ArrowLeft } from 'lucide-react'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'

// STEPS sarà definito dentro il componente per avere accesso a t()

export default function MatchDetailPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const matchId = params?.id
  
  const STEPS = React.useMemo(() => [
    { id: 'player_ratings', label: t('stepPlayerRatings'), icon: '⭐' },
    { id: 'team_stats', label: t('stepTeamStats'), icon: '📊' },
    { id: 'attack_areas', label: t('stepAttackAreas'), icon: '⚽' },
    { id: 'ball_recovery_zones', label: t('stepBallRecoveryZones'), icon: '🔄' },
    { id: 'formation_style', label: t('stepFormationStyle'), icon: '🎯' }
  ], [t])

  const [match, setMatch] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [uploadSection, setUploadSection] = React.useState(null)
  const [uploadImage, setUploadImage] = React.useState(null)
  const [extracting, setExtracting] = React.useState(false)

  const compactPreviewFrameStyle = {
    marginBottom: '12px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    background: 'rgba(0, 0, 0, 0.24)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
  const compactPreviewImageStyle = {
    maxWidth: '100%',
    maxHeight: '260px',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block'
  }

  // Carica match
  React.useEffect(() => {
    if (!matchId) {
      router.push('/')
      return
    }

    const fetchMatch = async () => {
      setLoading(true)
      setError(null)

      try {
        let token = localStorage.getItem('auth_token')
        
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }

        if (!token) {
           // AuthWrapper gestirà redirect
           setLoading(false)
           return
        }

        // Use new API endpoint that supports custom token
        const res = await fetch(`/api/matches?id=${matchId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!res.ok) {
           if (res.status === 401) {
             localStorage.removeItem('auth_token')
             router.push('/login')
             return
           }
           const data = await res.json().catch(() => ({}))
           throw new Error(data.error || t('matchNotFound'))
        }

        const data = await res.json()
        setMatch(data)
      } catch (err) {
        console.error('[MatchDetail] Error:', err)
        setError(err.message || t('loadMatchError'))
      } finally {
        setLoading(false)
      }
    }

    fetchMatch()
  }, [matchId, router])

  const handleImageSelect = (section) => async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setError(t('selectValidImage'))
      return
    }

    try {
      const optimized = await optimizeImageFile(file)
      setUploadImage(optimized.dataUrl)
      setUploadSection(section)
      setError(null)
    } catch (err) {
      console.error('[match/[id]] image optimization error:', err)
      setError(getImageOptimizeUserMessage(err, t))
    }
    e.target.value = ''
  }

  const handleExtractAndUpdate = async () => {
    if (!uploadImage || !uploadSection || !match) return

    setExtracting(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('tokenNotAvailable'))
      }

      // 1. Estrai dati
      const extractRes = await fetch('/api/extract-match-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({
          imageDataUrl: uploadImage,
          section: uploadSection,
          is_home: match.is_home
        })
      })

      if (!extractRes.ok) {
        let errorMessage = t('extractDataError')
        try {
          const errorData = await extractRes.json()
          const { message } = mapErrorToUserMessage(errorData?.error || '', t('extractDataError'), lang)
          errorMessage = message
        } catch (_) {
          // Risposta 500 può essere HTML o corpo non-JSON
          const { message } = mapErrorToUserMessage('500', t('extractDataError'), lang)
          errorMessage = message
        }
        throw new Error(errorMessage)
      }

      let extractData
      try {
        extractData = await extractRes.json()
      } catch (_) {
        throw new Error(mapErrorToUserMessage('invalid json', t('extractDataError'), lang).message)
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

      // 2. Aggiorna match
      const updateRes = await fetch('/api/supabase/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: match.id,
          section: uploadSection,
          data: extractData.data,
          result: extractData.result || null
        })
      })

      if (!updateRes.ok) {
        const errorData = await updateRes.json()
        throw new Error(errorData.error || t('updateMatchError'))
      }

      const updateData = await updateRes.json()

      // 3. Ricarica match tramite API
      const refreshRes = await fetch(`/api/matches?id=${match.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (refreshRes.ok) {
        const updatedMatch = await refreshRes.json()
        setMatch(updatedMatch)
      }

      setUploadImage(null)
      setUploadSection(null)

      // Aggiorna riassunto analisi (diagnostic) per la chat
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare UI */ }
    } catch (err) {
      console.error('[MatchDetail] Upload error:', err)
      const { message } = mapErrorToUserMessage(err, t('loadPhotoError'), lang)
      setError(message)
    } finally {
      setExtracting(false)
    }
  }

  const hasSection = (section) => {
    if (!match) return false
    
    if (section === 'player_ratings') {
      return match.player_ratings && (
        (match.player_ratings.cliente && Object.keys(match.player_ratings.cliente).length > 0) ||
        (match.player_ratings.avversario && Object.keys(match.player_ratings.avversario).length > 0) ||
        (typeof match.player_ratings === 'object' && !match.player_ratings.cliente && !match.player_ratings.avversario && Object.keys(match.player_ratings).length > 0)
      )
    }
    
    if (section === 'team_stats') {
      return match.team_stats && Object.keys(match.team_stats).length > 0
    }
    
    if (section === 'attack_areas') {
      return match.attack_areas && Object.keys(match.attack_areas).length > 0
    }
    
    if (section === 'ball_recovery_zones') {
      return match.ball_recovery_zones && Array.isArray(match.ball_recovery_zones) && match.ball_recovery_zones.length > 0
    }
    
    if (section === 'formation_style') {
      return match.formation_played || match.playing_style_played || match.team_strength
    }
    
    return false
  }

  const photosUploadedCount = match ? STEPS.filter((s) => hasSection(s.id)).length : 0
  const allSectionsComplete = match && photosUploadedCount === 5

  const formatDate = (dateStr) => {
    if (!dateStr) return t('dateNotAvailable')
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loading')}</div>
      </main>
    )
  }

  // Se c'è errore ma non abbiamo match, mostra errore
  // Ma se abbiamo match (anche incompleto), permette l'accesso per completarlo
  if (error && !match && !loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
        <button onClick={() => router.push('/')} className="neon-button">
          {t('backToDashboard')}
        </button>
      </main>
    )
  }

  // Se ancora in caricamento, mostra loading
  if (loading || !match) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={20} className="spin" />
          <span>{t('loadingShort')}</span>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '24px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/')}
            className="neon-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} />
            {t('dashboard')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Match Info */}
      <div className="neon-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Calendar size={24} color="var(--neon-orange)" />
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {t('match')}
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('dateAndTime')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>{formatDate(match.match_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('opponent')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neon-orange)' }}>
              {match.opponent_name || t('notSpecified')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('result')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neon-blue)' }}>
              {match.result || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('homeAwayLabel')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neon-blue)' }}>
              {match.is_home === true ? t('home') : match.is_home === false ? t('away') : t('notSpecified')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('completion')}</div>
            <span className={`completeness-badge ${allSectionsComplete ? 'complete' : 'incomplete'}`}>
              {allSectionsComplete ? t('matchComplete') : `${photosUploadedCount}/5`}
            </span>
          </div>
        </div>
      </div>

      {/* Sezioni */}
      <div className="neon-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
          {t('completeWithMissingPhotos')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {STEPS.map((step) => {
            const hasData = hasSection(step.id)
            const isUploading = uploading && uploadSection === step.id

            return (
              <div
                key={step.id}
                style={{
                  padding: '16px',
                  background: hasData ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 165, 0, 0.05)',
                  border: `1px solid ${hasData ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 165, 0, 0.2)'}`,
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{step.icon}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{step.label}</span>
                  </div>
                  {hasData ? (
                    <CheckCircle2 size={20} color="#22C55E" />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--neon-orange)' }}>{t('missing')}</span>
                  )}
                </div>
                
                {!hasData && (
                  <div>
                    {!uploadImage || uploadSection !== step.id ? (
                      <label style={{ display: 'block' }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect(step.id)}
                          style={{ display: 'none' }}
                          disabled={extracting}
                        />
                        <div
                          style={{
                            padding: '12px',
                            background: 'rgba(255, 165, 0, 0.1)',
                            border: '1px dashed rgba(255, 165, 0, 0.3)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: extracting ? 'not-allowed' : 'pointer',
                            opacity: extracting ? 0.5 : 1
                          }}
                        >
                          <Camera size={20} style={{ marginBottom: '8px', color: 'var(--neon-orange)' }} />
                          <div style={{ fontSize: '14px' }}>{t('uploadPhoto')}</div>
                        </div>
                      </label>
                    ) : (
                      <div>
                        <div style={compactPreviewFrameStyle}>
                          <img 
                            src={uploadImage} 
                            alt="Preview" 
                            style={compactPreviewImageStyle}
                          />
                        </div>
                        {error && uploadSection === step.id && (
                          <div
                            role="alert"
                            style={{
                              marginBottom: '12px',
                              padding: '12px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '8px',
                              color: '#fca5a5',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <AlertCircle size={18} />
                            {error}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleExtractAndUpdate}
                            className="btn primary"
                            disabled={extracting}
                            style={{ flex: 1 }}
                          >
                            {extracting ? (
                              <>
                                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                {t('extracting')}
                              </>
                            ) : (
                              <>
                                <Upload size={16} />
                                {t('extractAndSave')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setUploadImage(null)
                              setUploadSection(null)
                              setError(null)
                            }}
                            className="neon-button"
                            disabled={extracting}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
