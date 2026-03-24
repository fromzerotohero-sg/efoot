'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import CoachFeedbackChat from '@/components/CoachFeedbackChat'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, Camera, Shield, Target, Users, Settings, ChevronDown, ChevronUp, Brain, MessageCircle, Trophy } from 'lucide-react'

/** Estrae testo in lingua da valore stringa o oggetto bilingue { it, en } (coerente con analyze-match) */
function pickLang(val, lang) {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && (val.it !== undefined || val.en !== undefined)) return val[lang] || val.it || val.en || ''
  return String(val)
}

export default function CountermeasuresPreMatchPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  
  const [uploadImage, setUploadImage] = React.useState(null)
  const [extracting, setExtracting] = React.useState(false)
  const [extractedFormation, setExtractedFormation] = React.useState(null)
  const [generating, setGenerating] = React.useState(false)
  const [countermeasures, setCountermeasures] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [expandedSections, setExpandedSections] = React.useState({
    analysis: true,
    tactical: false,
    players: false,
    instructions: false
  })
  const [showPalestraCoach, setShowPalestraCoach] = React.useState(false)
  const [palestraUserProfile, setPalestraUserProfile] = React.useState(null)
  const [palestraLastMatch, setPalestraLastMatch] = React.useState(null)
  const [palestraOpenLoading, setPalestraOpenLoading] = React.useState(false)

  const openPalestraCoach = React.useCallback(async () => {
    setPalestraOpenLoading(true)
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
      const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache'
        },
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        setPalestraUserProfile(data.profile || null)
        setPalestraLastMatch(data.matches?.[0] || null)
      }
      setShowPalestraCoach(true)
    } catch (e) {
      console.error('[contromisure-pre-partita] Prefetch dashboard for Palestra:', e)
      setShowPalestraCoach(true)
    } finally {
      setPalestraOpenLoading(false)
    }
  }, [router])

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validazione dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('errorImageTooLarge'))
      return
    }

    // Validazione tipo
    if (!file.type.startsWith('image/')) {
      setError(t('errorInvalidImage'))
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageDataUrl = event.target?.result
      if (!imageDataUrl) return
      setUploadImage(imageDataUrl)
      setError(null)
      setExtractedFormation(null)
      setCountermeasures(null)
      await runFullPipeline(imageDataUrl)
    }
    reader.readAsDataURL(file)
  }

  /** Pipeline completo: estrazione + generazione contromisure (avvio automatico al caricamento) */
  const runFullPipeline = async (imageDataUrl) => {
    if (!imageDataUrl) return
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

      // 1. Estrazione
      const extractRes = await fetch('/api/extract-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrl })
      })
      if (!extractRes.ok) {
        const errorData = await extractRes.json()
        const { message } = mapErrorToUserMessage(errorData?.error || '', t('errorExtractingFormation'), lang)
        throw new Error(message)
      }
      const extractData = await extractRes.json()
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

      // 2. Salva formazione avversaria
      const saveRes = await fetch('/api/supabase/save-opponent-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          formation_name: extractData.formation || null,
          playing_style: extractData.playing_style || null,
          extracted_data: {
            formation: extractData.formation,
            slot_positions: extractData.slot_positions,
            players: extractData.players,
            overall_strength: extractData.overall_strength,
            tactical_style: extractData.tactical_style,
            coach: extractData.coach || null
          },
          is_pre_match: true
        })
      })
      const saveData = await safeJsonResponse(saveRes, t('errorSaveFormation'))
      const formationForState = {
        id: saveData.formation?.id,
        formation_name: extractData.formation,
        playing_style: extractData.playing_style,
        players: extractData.players,
        overall_strength: extractData.overall_strength,
        tactical_style: extractData.tactical_style,
        coach: extractData.coach || null
      }
      setExtractedFormation(formationForState)
      setExtracting(false)

      // 3. Generazione contromisure (automatica)
      setGenerating(true)
      const generateRes = await fetch('/api/generate-countermeasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          opponent_formation_id: formationForState.id,
          language: lang
        })
      })
      const generateData = await safeJsonResponse(generateRes, t('errorGeneratingCountermeasures'))
      if (generateData.success && generateData.countermeasures) {
        setCountermeasures(generateData.countermeasures)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
      } else {
        throw new Error(t('errorGeneratingCountermeasures'))
      }
    } catch (err) {
      console.error('[CountermeasuresPreMatch] Pipeline error:', err)
      setError(err.message || t('errorGeneratingCountermeasures'))
    } finally {
      setExtracting(false)
      setGenerating(false)
    }
  }

  const handleGenerateCountermeasures = async () => {
    if (!extractedFormation?.id) {
      setError(t('noFormationUploaded'))
      return
    }

    setGenerating(true)
    setError(null)
    setCountermeasures(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('tokenNotAvailable'))
      }

      const generateRes = await fetch('/api/generate-countermeasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          opponent_formation_id: extractedFormation.id,
          language: lang
        })
      })

      const generateData = await safeJsonResponse(generateRes, t('errorGeneratingCountermeasures'))
      // La risposta API ha struttura: { success: true, countermeasures: {...}, model_used: '...' }
      if (generateData.success && generateData.countermeasures) {
        setCountermeasures(generateData.countermeasures)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
      } else {
        throw new Error(t('errorGeneratingCountermeasures'))
      }
    } catch (err) {
      console.error('[CountermeasuresPreMatch] Generate error:', err)
      setError(err.message || t('errorGeneratingCountermeasures'))
    } finally {
      setGenerating(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'var(--neon-orange)'
      case 'medium': return 'var(--neon-blue)'
      default: return 'var(--neon-blue)'
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return `${t('priority')}: ${t('priorityHigh')}`
      case 'medium': return `${t('priority')}: ${t('priorityMedium')}`
      default: return `${t('priority')}: ${t('priorityMedium')}`
    }
  }

  return (
    <main data-tour-id="tour-counter-intro" style={{ 
      minHeight: '100vh', 
      className: 'neon-card',
      padding: 'clamp(16px, 4vw, 24px)',
      paddingTop: '80px',
      color: '#fff'
    }}>
      {/* Header sticky: resta visibile su mobile quando si scrolla, così il contesto "Contromisure pre-partita" non si perde */}
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
          <h1 className="neon-text" style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('countermeasuresLive')}
          </h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Upload Sezione */}
      {!extractedFormation && (
        <div data-tour-id="tour-counter-upload" className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' }} />
            {t('uploadOpponentFormation')}
          </h2>
          
          {!uploadImage ? (
            <label style={{ display: 'block' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                disabled={extracting}
              />
              <div
                className="upload-area"
                style={{
                  padding: 'clamp(24px, 6vw, 48px)',
                  background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 70%)',
                  border: '2px dashed rgba(251, 191, 36, 0.5)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  cursor: extracting ? 'not-allowed' : 'pointer',
                  opacity: extracting ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!extracting) {
                    e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0.1) 70%)'
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.8)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!extracting) {
                    e.currentTarget.style.background = 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 70%)'
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                <Camera size={48} style={{ marginBottom: '16px', color: '#fbbf24', filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.9))' }} />
                <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 600, marginBottom: '8px' }}>
                  {t('uploadPhoto')}
                </div>
                <div style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', opacity: 0.8 }}>
                  {t('uploadPhotoDescription')}
                </div>
                <div style={{ fontSize: 'clamp(11px, 2vw, 12px)', opacity: 0.6, marginTop: '6px' }}>
                  {t('countermeasuresAutoStart')}
                </div>
              </div>
            </label>
          ) : (
            <div>
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img 
                  src={uploadImage} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {extracting ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}>
                    <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--neon-orange)' }} />
                    <span>{t('extracting')}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => runFullPipeline(uploadImage)}
                    className="btn primary"
                    style={{ flex: 1, minWidth: '200px' }}
                  >
                    <RefreshCw size={16} />
                    {t('retry')}
                  </button>
                )}
                <button
                  onClick={() => {
                    setUploadImage(null)
                    setExtractedFormation(null)
                    setCountermeasures(null)
                    setError(null)
                  }}
                  className="neon-button"
                  disabled={extracting || generating}
                >
                  <X size={16} />
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Formazione Estratta */}
      {extractedFormation && !countermeasures && (
        <div data-tour-id="tour-counter-extracted" className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={24} color="#22C55E" />
            {t('formationExtracted')}
          </h2>
          
          <div style={{ 
            padding: 'clamp(12px, 3vw, 16px)', 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.3)', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <strong>{t('formation')}:</strong> {extractedFormation.formation_name || 'N/A'}
              </div>
              {extractedFormation.playing_style && (
                <div>
                  <strong>{t('playingStyle')}:</strong> {extractedFormation.playing_style}
                </div>
              )}
              {extractedFormation.overall_strength && (
                <div>
                  <strong>{t('overallStrength')}:</strong> {extractedFormation.overall_strength}
                </div>
              )}
            </div>
            {extractedFormation.coach && (
              <div style={{ 
                marginTop: '12px', 
                padding: '10px', 
                background: 'rgba(0, 212, 255, 0.1)', 
                border: '1px solid rgba(0, 212, 255, 0.3)', 
                borderRadius: '6px',
                fontSize: 'clamp(12px, 2.5vw, 14px)'
              }}>
                <strong style={{ color: 'var(--neon-blue)' }}>✓ {t('coach')} estratto:</strong> {extractedFormation.coach.coach_name || 'N/A'}
                {extractedFormation.coach.age && ` (${extractedFormation.coach.age} ${t('years')})`}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateCountermeasures}
            className="btn primary"
            disabled={generating}
            style={{ width: '100%' }}
          >
            {generating ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {t('generatingCountermeasures')}
              </>
            ) : (
              <>
                <Brain size={18} />
                {t('generateCountermeasures')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Contromisure Generate */}
      {countermeasures && (
        <>
          <p style={{ fontSize: 'clamp(13px, 2.5vw, 14px)', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', marginTop: 0 }}>
            {t('countermeasuresPreMatchContext')}
          </p>
          {/* Analisi Formazione Avversaria */}
          <div data-tour-id="tour-counter-result" className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px',
                cursor: 'pointer'
              }}
              onClick={() => setExpandedSections(prev => ({ ...prev, analysis: !prev.analysis }))}
            >
              <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Target size={24} color="var(--neon-blue)" />
                {t('opponentFormationAnalysis')}
              </h2>
              {expandedSections.analysis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {expandedSections.analysis && (
              <div>
                {countermeasures.analysis.is_meta_formation && (
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
                    <strong>{t('metaFormation')}:</strong> {pickLang(countermeasures.analysis.meta_type, lang)}
                  </div>
                )}

                <div style={{ marginBottom: '16px', lineHeight: '1.7' }}>
                  {pickLang(countermeasures.analysis.opponent_formation_analysis, lang)}
                </div>

                {countermeasures.analysis.strengths && countermeasures.analysis.strengths.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: 'var(--neon-orange)' }}>{t('formationStrengths')}:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {countermeasures.analysis.strengths.map((strength, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{pickLang(strength, lang)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {countermeasures.analysis.weaknesses && countermeasures.analysis.weaknesses.length > 0 && (
                  <div>
                    <strong style={{ color: 'var(--neon-blue)' }}>{t('formationWeaknesses')}:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {countermeasures.analysis.weaknesses.map((weakness, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{pickLang(weakness, lang)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {countermeasures.analysis.why_weaknesses && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px', fontSize: 'clamp(13px, 3vw, 14px)' }}>
                    <strong>{t('reason')}:</strong> {pickLang(countermeasures.analysis.why_weaknesses, lang)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contromisure Tattiche */}
          {(countermeasures.countermeasures.formation_adjustments?.length > 0 || 
            countermeasures.countermeasures.tactical_adjustments?.length > 0) && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, tactical: !prev.tactical }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Shield size={24} color="var(--neon-orange)" />
                  {t('tacticalCountermeasures')}
                </h2>
                {expandedSections.tactical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.tactical && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {countermeasures.countermeasures.formation_adjustments?.map((adj, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(255, 165, 0, 0.1)',
                          border: `1px solid ${getPriorityColor(adj.priority)}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(adj.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(adj.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {adj.type === 'formation_change' ? t('changeFormation') : t('changePlayingStyle')}: {pickLang(adj.suggestion, lang)}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {pickLang(adj.reason, lang)}
                        </div>
                      </div>
                    ))}

                  {countermeasures.countermeasures.tactical_adjustments?.map((adj, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: `1px solid ${getPriorityColor(adj.priority)}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(adj.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(adj.priority)}
                          </span>
                        </div>
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
              )}
            </div>
          )}

          {/* Suggerimenti Giocatori */}
          {countermeasures.countermeasures.player_suggestions?.length > 0 && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, players: !prev.players }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Users size={24} color="var(--neon-blue)" />
                  {t('playerSuggestions')}
                </h2>
                {expandedSections.players ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.players && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {countermeasures.countermeasures.player_suggestions.map((suggestion, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: `1px solid ${getPriorityColor(suggestion.priority)}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(suggestion.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(suggestion.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {suggestion.action === 'add_to_starting_xi'
                            ? (suggestion.replace_player_name || suggestion.replace_player_id)
                              ? t('replaceInStartingXI')
                                    .replace('${replacePlayerName}', suggestion.replace_player_name || '?')
                                    .replace('${playerName}', suggestion.player_name || '')
                                    .replace('${position}', suggestion.position || '')
                              : `${t('addToStartingXI')}: ${suggestion.player_name} (${suggestion.position || ''})`
                            : `${t('removeFromStartingXI')}: ${suggestion.player_name} (${suggestion.position || ''})`}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {pickLang(suggestion.reason, lang)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Istruzioni Individuali */}
          {countermeasures.countermeasures.individual_instructions?.length > 0 && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, instructions: !prev.instructions }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Settings size={24} color="var(--neon-blue)" />
                  {t('individualInstructions')}
                </h2>
                {expandedSections.instructions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.instructions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {countermeasures.countermeasures.individual_instructions.map((instruction, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(10px, 2.5vw, 12px)',
                          className: 'neon-panel',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: 'clamp(13px, 3vw, 14px)', fontWeight: 600 }}>
                            {instruction.slot}: {pickLang(instruction.instruction, lang)}
                          </span>
                        </div>
                        <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', opacity: 0.8, marginLeft: '24px' }}>
                          {pickLang(instruction.reason, lang)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {countermeasures.warnings && countermeasures.warnings.length > 0 && (
            <div style={{
              padding: 'clamp(12px, 3vw, 16px)',
              background: 'rgba(255, 165, 0, 0.1)',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
                <AlertCircle size={18} color="var(--neon-orange)" />
                {t('warnings')}
              </div>
              <ul style={{ marginLeft: '24px' }}>
                {countermeasures.warnings.map((warning, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', fontSize: 'clamp(13px, 3vw, 14px)' }}>{pickLang(warning, lang)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Info Confidence */}
          <div style={{
            padding: 'clamp(10px, 2.5vw, 12px)',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: 'clamp(12px, 2.5vw, 13px)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span>
              <strong>{t('confidence')}:</strong> {countermeasures.confidence}%
            </span>
            <span>
              <strong>{t('dataQuality')}:</strong> {countermeasures.data_quality || 'N/A'}
            </span>
          </div>

          {/* Dopo la partita: flusso post-match coerente con dashboard (aggiungi partita + Palestra) */}
          <div
            data-tour-id="tour-counter-postmatch"
            className="neon-card"
            style={{
              padding: 'clamp(16px, 4vw, 22px)',
              marginBottom: '24px',
              background: 'rgba(5, 12, 28, 0.75)',
              border: '1px solid rgba(0, 212, 255, 0.25)',
              borderRadius: '12px'
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(16px, 3.5vw, 18px)',
                fontWeight: 700,
                margin: '0 0 14px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#fff'
              }}
            >
              <Trophy size={22} style={{ color: 'var(--neon-orange)', flexShrink: 0 }} aria-hidden />
              {t('countermeasuresPostMatchTitle')}
            </h2>

            <div
              style={{
                padding: '14px',
                marginBottom: '14px',
                background: 'rgba(0, 212, 255, 0.06)',
                borderRadius: '10px',
                border: '1px solid rgba(0, 212, 255, 0.15)'
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: 1.65, color: 'rgba(255,255,255,0.88)' }}>
                {t('countermeasuresPostMatchPhotosIntro')}
              </p>
              <Link
                href="/match/new"
                className="btn primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  width: '100%',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <Camera size={18} aria-hidden />
                {t('countermeasuresPostMatchAddMatchCta')}
              </Link>
            </div>

            <div
              style={{
                padding: '14px',
                background: 'rgba(251, 191, 36, 0.06)',
                borderRadius: '10px',
                border: '1px solid rgba(251, 191, 36, 0.2)'
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: 1.65, color: 'rgba(255,255,255,0.88)' }}>
                {t('countermeasuresPostMatchPalestraIntro')}
              </p>
              <button
                type="button"
                className="neon-button"
                disabled={palestraOpenLoading}
                onClick={openPalestraCoach}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  cursor: palestraOpenLoading ? 'wait' : 'pointer',
                  opacity: palestraOpenLoading ? 0.85 : 1
                }}
              >
                {palestraOpenLoading ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} aria-hidden />
                    {t('openPalestraCoach')}
                  </>
                )}
              </button>
            </div>
          </div>

        </>
      )}

      <CoachFeedbackChat
        show={showPalestraCoach}
        onClose={() => {
          setShowPalestraCoach(false)
          setPalestraUserProfile(null)
          setPalestraLastMatch(null)
        }}
        userProfile={palestraUserProfile}
        lastMatch={palestraLastMatch}
      />

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(251, 191, 36, 0.5); box-shadow: 0 0 0 rgba(251, 191, 36, 0); }
          50% { border-color: rgba(251, 191, 36, 0.8); box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
        }
        .upload-area {
          animation: pulse-border 2s infinite;
        }
        .upload-area:hover {
          animation: none;
        }
      `}</style>
    </main>
  )
}
