'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, SkipForward, Save, Camera, Trophy } from 'lucide-react'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'

// STEPS sarà definito dentro il componente per avere accesso a t()

const STORAGE_KEY = 'match_wizard_progress'
const HOME_AWAY_STEP_ID = 'home_away'

export default function NewMatchPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  
  const STEPS = React.useMemo(() => [
    { id: HOME_AWAY_STEP_ID, label: t('stepHomeAway'), icon: '🏠' },
    { id: 'player_ratings', label: t('stepPlayerRatings'), icon: '⭐' },
    { id: 'team_stats', label: t('stepTeamStats'), icon: '📊' },
    { id: 'attack_areas', label: t('stepAttackAreas'), icon: '⚽' },
    { id: 'ball_recovery_zones', label: t('stepBallRecoveryZones'), icon: '🔄' },
    { id: 'formation_style', label: t('stepFormationStyle'), icon: '🎯' }
  ], [t])
  
  const [currentStep, setCurrentStep] = React.useState(0)
  const [stepData, setStepData] = React.useState({}) // { section: { data, image } }
  const [stepImages, setStepImages] = React.useState({}) // { section: dataUrl }
  const [extracting, setExtracting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [showSummary, setShowSummary] = React.useState(false)
  const [opponentName, setOpponentName] = React.useState('')
  const [isHome, setIsHome] = React.useState(true) // Default: Casa
  const [extractingFormation2d, setExtractingFormation2d] = React.useState(false)

  // Carica progresso salvato al mount
  React.useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const loadedStepData = parsed.stepData || {}
        // Retrocompatibilità: se isHome era salvato ma manca stepData.home_away, considera step Casa/Fuori già fatto
        if (parsed.isHome !== undefined && loadedStepData[HOME_AWAY_STEP_ID] === undefined) {
          loadedStepData[HOME_AWAY_STEP_ID] = true
        }
        setStepData(loadedStepData)
        // Normalizza player_ratings: da stringa a array (retrocompat)
        const rawImages = parsed.stepImages || {}
        const stepImagesNorm = { ...rawImages }
        if (rawImages.player_ratings != null && typeof rawImages.player_ratings === 'string') {
          stepImagesNorm.player_ratings = [rawImages.player_ratings]
        }
        setStepImages(stepImagesNorm)
        if (parsed.opponentName) {
          setOpponentName(parsed.opponentName)
        }
        if (parsed.isHome !== undefined) {
          setIsHome(parsed.isHome)
        }
        // Trova primo step senza dati
        const firstEmptyStep = STEPS.findIndex(step => !loadedStepData[step.id])
        if (firstEmptyStep >= 0) {
          setCurrentStep(firstEmptyStep)
        }
      }
    } catch (err) {
      console.warn('[NewMatch] Error loading saved progress:', err)
    }
  }, [STEPS])

  // Salva progresso in localStorage (include opponentName per persistenza)
  const saveProgress = React.useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stepData,
        stepImages,
        opponentName: opponentName || undefined,
        isHome: isHome,
        timestamp: Date.now()
      }))
    } catch (err) {
      console.warn('[NewMatch] Error saving progress:', err)
    }
  }, [stepData, stepImages, opponentName, isHome])

  React.useEffect(() => {
    if (mounted) {
      saveProgress()
    }
  }, [stepData, stepImages, opponentName, isHome, mounted, saveProgress])

  // Pulisci localStorage dopo salvataggio riuscito
  const clearProgress = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.warn('[NewMatch] Error clearing progress:', err)
    }
  }

  const processSelectedImage = React.useCallback(async ({ section, slotIndex = null, file }) => {
    if (!file || !file.type.startsWith('image/')) {
      setError(t('selectValidImage'))
      return false
    }

    try {
      const optimized = await optimizeImageFile(file)
      const dataUrl = optimized.dataUrl
      setStepImages(prev => {
        if (section === 'player_ratings' && (slotIndex === 0 || slotIndex === 1)) {
          const arr = Array.isArray(prev.player_ratings) ? [...prev.player_ratings] : []
          arr[slotIndex] = dataUrl
          return { ...prev, player_ratings: arr }
        }
        return { ...prev, [section]: dataUrl }
      })
      setStepData(prev => {
        const next = { ...prev }
        delete next[section]
        return next
      })
      setError(null)
      return true
    } catch (err) {
      console.error('[match/new] image optimization error:', err)
      setError(getImageOptimizeUserMessage(err, t))
      return false
    }
  }, [t])

  const handleImageSelect = (section, slotIndex = null) => async (e) => {
    const file = e.target.files?.[0]
    await processSelectedImage({ section, slotIndex, file })
    e.target.value = ''
  }

  /** Merge due (o più) oggetti player_ratings da extract-match-data in uno solo (titolari + riserve). */
  const mergePlayerRatings = (listOfData) => {
    if (!listOfData || listOfData.length === 0) return null
    const cliente = {}
    const avversario = {}
    listOfData.forEach(d => {
      if (!d || typeof d !== 'object') return
      if (d.cliente && typeof d.cliente === 'object') Object.assign(cliente, d.cliente)
      if (d.avversario && typeof d.avversario === 'object') Object.assign(avversario, d.avversario)
    })
    if (Object.keys(cliente).length === 0 && Object.keys(avversario).length === 0) return listOfData[0] || null
    return {
      ...(Object.keys(cliente).length > 0 ? { cliente } : {}),
      ...(Object.keys(avversario).length > 0 ? { avversario } : {})
    }
  }

  const handleExtract = async (section) => {
    const isPlayerRatings = section === 'player_ratings'
    const images = isPlayerRatings
      ? (Array.isArray(stepImages.player_ratings) ? stepImages.player_ratings : stepImages.player_ratings ? [stepImages.player_ratings] : []).filter(Boolean)
      : [stepImages[section]].filter(Boolean)
    if (images.length === 0) {
      setError(t('loadImageFirst'))
      return
    }

    setExtracting(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('sessionExpiredRedirect'))
      }

      const results = []

      for (let i = 0; i < images.length; i++) {
        const imageDataUrl = images[i]
        const extractRes = await fetch('/api/extract-match-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept-Language': lang === 'en' ? 'en' : 'it'
          },
          body: JSON.stringify({
            imageDataUrl,
            section,
            is_home: isHome
          })
        })

        const extractData = await extractRes.json()

        if (!extractRes.ok) {
          const { message } = mapErrorToUserMessage(extractData?.error || '', t('extractDataError'), lang)
          throw new Error(message)
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

        results.push(extractData.data)
        if (extractData.result && typeof extractData.result === 'string' && extractData.result.trim()) {
          results._result = extractData.result.trim()
        }
      }

      const merged = isPlayerRatings && results.length > 0 ? mergePlayerRatings(results) : results[0]
      const resultToSave = results._result

      setStepData(prev => ({
        ...prev,
        [section]: isPlayerRatings && merged && typeof merged === 'object' ? { cliente: merged.cliente || null, avversario: merged.avversario || null } : merged
      }))

      if (resultToSave) {
        setStepData(prev => ({ ...prev, result: resultToSave }))
      }

      const currentIndex = STEPS.findIndex(s => s.id === section)
      if (currentIndex < STEPS.length - 1) {
        setTimeout(() => setCurrentStep(currentIndex + 1), 500)
      }
    } catch (err) {
      console.error('[NewMatch] Extract error:', err)
      const { message } = mapErrorToUserMessage(err, t('extractDataError'), lang)
      setError(message)
    } finally {
      setExtracting(false)
    }
  }

  const handleExtractFormation2d = async () => {
    const imageDataUrl = stepImages.formation_2d_seed
    if (!imageDataUrl) {
      setError(t('loadImageFirst'))
      return
    }

    setExtractingFormation2d(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')

      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('sessionExpiredRedirect'))
      }

      const res = await fetch('/api/extract-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrl })
      })

      const data = await res.json()
      if (!res.ok) {
        const { message } = mapErrorToUserMessage(data?.error || '', t('errorExtractingFormation'), lang)
        throw new Error(message)
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

      const formationPlayed = typeof data?.formation === 'string' ? data.formation.trim() : null
      const playersDetected = Array.isArray(data?.players) ? data.players.length : 0

      setStepData(prev => ({
        ...prev,
        formation_style: {
          ...(prev.formation_style || {}),
          ...(formationPlayed ? { formation_played: formationPlayed } : {})
        },
        formation_2d_seed: {
          imported: true,
          formation_played: formationPlayed || null,
          players_detected: playersDetected
        }
      }))
    } catch (err) {
      console.error('[NewMatch] 2D formation extract error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorExtractingFormation'), lang)
      setError(message)
    } finally {
      setExtractingFormation2d(false)
    }
  }

  const handleSkip = (section) => {
    // Salva null per indicare che è stato saltato
    setStepData(prev => ({
      ...prev,
      [section]: null
    }))
    setStepImages(prev => {
      const next = { ...prev }
      delete next[section]
      return next
    })

    // Avanza allo step successivo
    const currentIndex = STEPS.findIndex(s => s.id === section)
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(currentIndex + 1)
    }
  }

  // Calcola progresso foto (solo sezioni foto, escluso Casa/Fuori)
  const photoSteps = React.useMemo(() => STEPS.filter(s => s.id !== HOME_AWAY_STEP_ID), [STEPS])
  const photosUploaded = React.useMemo(() => {
    return photoSteps.filter(step => stepData[step.id] && stepData[step.id] !== null).length
  }, [stepData, photoSteps])

  const photosMissing = React.useMemo(() => {
    return photoSteps.filter(step => !stepData[step.id] || stepData[step.id] === null).map(step => step.label)
  }, [stepData, photoSteps])

  const photosComplete = React.useMemo(() => {
    return photoSteps.filter(step => stepData[step.id] && stepData[step.id] !== null).map(step => step.label)
  }, [stepData, photoSteps])

  const handleShowSummary = () => {
    const photosCount = photoSteps.filter(step => stepData[step.id] != null).length
    if (photosCount < 3) {
      setError(t('loadAtLeastThreePhotos'))
      return
    }
    if (typeof isHome !== 'boolean') {
      setError(t('homeAwayLabel') + ' - ' + t('required'))
      return
    }
    setShowSummary(true)
    setError(null)
  }

  const handleConfirmSave = () => {
    setShowSummary(false)
    handleSave()
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('sessionExpired'))
      }

      // Estrai risultato se presente (può essere in stepData.result o in team_stats)
      let matchResult = stepData.result || null
      if (!matchResult && stepData.team_stats && stepData.team_stats.result) {
        matchResult = stepData.team_stats.result
      }
      
      // Rimuovi result da team_stats se presente (non fa parte delle statistiche)
      // RM-003: non mutare stepData; usa variabile locale per il payload
      let teamStatsForPayload = stepData.team_stats || null
      if (teamStatsForPayload && teamStatsForPayload.result) {
        const { result, ...statsWithoutResult } = teamStatsForPayload
        teamStatsForPayload = statsWithoutResult
      }

      // Prepara dati match
      const matchData = {
        result: matchResult,
        opponent_name: opponentName.trim() || null,
        is_home: isHome, // Campo Casa/Fuori Casa
        player_ratings: stepData.player_ratings || null,
        team_stats: teamStatsForPayload,
        attack_areas: stepData.attack_areas || null,
        ball_recovery_zones: stepData.ball_recovery_zones || null,
        formation_played: stepData.formation_style?.formation_played || null,
        playing_style_played: stepData.formation_style?.playing_style_played || null,
        team_strength: stepData.formation_style?.team_strength || null,
        extracted_data: {
          stepData,
          stepImages: Object.keys(stepImages).reduce((acc, key) => {
            // Non salvare le immagini base64 nel DB (troppo grandi)
            acc[key] = 'uploaded'
            return acc
          }, {})
        }
      }

      const saveRes = await fetch('/api/supabase/save-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchData })
      })

      let saveData
      try {
        saveData = await saveRes.json()
      } catch (_) {
        throw new Error(mapErrorToUserMessage('500', t('saveMatchError'), lang).message)
      }

      if (!saveRes.ok) {
        throw new Error(saveData?.error || t('saveMatchError'))
      }

      setSuccess(true)
      clearProgress()

      // FIX: Notifica altri componenti che partita è stata salvata
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('match-saved'))
      }

      // Aggiorna riassunto analisi (diagnostic) per la chat
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare redirect */ }

      // Redirect dopo 2 secondi con refresh dati
      setTimeout(() => {
        router.push('/')
        router.refresh() // Forza refresh dati dashboard
      }, 2000)
    } catch (err) {
      console.error('[NewMatch] Save error:', err)
      const { message } = mapErrorToUserMessage(err, t('saveMatchError'), lang)
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const currentStepInfo = STEPS[currentStep]
  const currentSection = currentStepInfo?.id
  const isPlayerRatingsStep = currentSection === 'player_ratings'
  const playerRatingsImages = isPlayerRatingsStep && Array.isArray(stepImages.player_ratings) ? stepImages.player_ratings : (stepImages.player_ratings ? [stepImages.player_ratings] : [])
  const currentImage = isPlayerRatingsStep ? (playerRatingsImages[0] || null) : stepImages[currentSection]
  const hasImageForExtract = isPlayerRatingsStep ? playerRatingsImages.filter(Boolean).length >= 1 : !!stepImages[currentSection]
  const currentData = stepData[currentSection]
  const progress = ((currentStep + 1) / STEPS.length) * 100
  const extractedResult = stepData.result || null
  const formation2dSeed = stepData.formation_2d_seed || null
  const uploadStepTitle = lang === 'en' ? '1. Upload photo' : '1. Carica foto'
  const uploadStepHint = lang === 'en'
    ? 'First upload the screenshot for this section, then extract the data.'
    : 'Prima carica lo screenshot di questa sezione, poi estrai i dati.'

  if (!mounted) {
    return null
  }

  return (
    <main data-tour-id="tour-match-intro" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#fff',
      padding: 'clamp(12px, 3vw, 20px)',
      paddingBottom: '100px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 700, margin: 0 }}>
            {t('addMatch')}
          </h1>
        </div>
      </div>

      {/* Progress Bar */}
      <div data-tour-id="tour-match-progress" style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        height: '8px',
        marginBottom: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #00d4ff 0%, #ff6b00 100%)',
          height: '100%',
          width: `${progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Progress Counter & Result */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '14px',
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{photosUploaded}/{photoSteps.length} {t('photosCount')}</span>
        </div>
        {extractedResult && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: '#86efac'
          }}>
            <Trophy size={16} />
            <span><strong>{t('resultExtracted')}:</strong> {extractedResult}</span>
          </div>
        )}
      </div>

      {/* Optional 2D Formation Import */}
      <div style={{
        marginBottom: '24px',
        padding: '14px',
        background: 'rgba(251, 191, 36, 0.1)',
        border: '1px solid rgba(251, 191, 36, 0.35)',
        borderRadius: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fde68a', marginBottom: '4px' }}>
              {t('importFormation2dOptional')}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.45 }}>
              {t('importFormation2dHint')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              id="match-formation-2d-upload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect('formation_2d_seed')}
              style={{ display: 'none' }}
              disabled={extracting || extractingFormation2d || saving}
            />
            <button
              type="button"
              onClick={() => document.getElementById('match-formation-2d-upload')?.click()}
              disabled={extracting || extractingFormation2d || saving}
              style={{
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(251, 191, 36, 0.45)',
                background: 'rgba(251, 191, 36, 0.16)',
                color: '#fde68a',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: extracting || extractingFormation2d || saving ? 'not-allowed' : 'pointer',
                opacity: extracting || extractingFormation2d || saving ? 0.55 : 1
              }}
            >
              <Upload size={16} />
              {t('upload')}
            </button>
            <button
              type="button"
              onClick={handleExtractFormation2d}
              disabled={!stepImages.formation_2d_seed || extracting || extractingFormation2d || saving}
              style={{
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(251, 191, 36, 0.45)',
                background: 'rgba(120, 53, 15, 0.35)',
                color: '#fef3c7',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: !stepImages.formation_2d_seed || extracting || extractingFormation2d || saving ? 'not-allowed' : 'pointer',
                opacity: !stepImages.formation_2d_seed || extracting || extractingFormation2d || saving ? 0.55 : 1
              }}
            >
              {extractingFormation2d ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={16} />}
              {extractingFormation2d ? t('importFormation2dExtracting') : t('importFormation2dExtract')}
            </button>
          </div>
        </div>

        {stepImages.formation_2d_seed && (
          <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
            <img src={stepImages.formation_2d_seed} alt="" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '220px', objectFit: 'cover' }} />
          </div>
        )}

        {formation2dSeed?.imported && (
          <div style={{
            marginTop: '12px',
            borderRadius: '8px',
            padding: '10px 12px',
            background: 'rgba(34, 197, 94, 0.16)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#bbf7d0',
            fontSize: '13px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <span>{t('importFormation2dSuccess')}</span>
            {formation2dSeed?.formation_played && (
              <span><strong>{t('importFormation2dDetected')}:</strong> {formation2dSeed.formation_played}</span>
            )}
            <span><strong>{t('importFormation2dPlayersDetected')}:</strong> {formation2dSeed.players_detected ?? 0}</span>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div data-tour-id="tour-match-steps" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '32px',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {STEPS.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = stepData[step.id] !== null && stepData[step.id] !== undefined
          const isSkipped = stepData[step.id] === null

          return (
            <div
              key={step.id}
              style={{
                flex: 1,
                minWidth: '60px',
                textAlign: 'center',
                padding: '8px',
                borderRadius: '8px',
                background: isActive
                  ? 'rgba(0, 212, 255, 0.2)'
                  : isCompleted
                  ? 'rgba(34, 197, 94, 0.2)'
                  : isSkipped
                  ? 'rgba(156, 163, 175, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${
                  isActive
                    ? 'rgba(0, 212, 255, 0.5)'
                    : isCompleted
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'rgba(255, 255, 255, 0.1)'
                }`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setCurrentStep(index)}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{step.icon}</div>
              <div style={{
                fontSize: '10px',
                opacity: 0.8,
                display: isCompleted ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <CheckCircle2 size={12} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fca5a5'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.5)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#86efac'
        }}>
          <CheckCircle2 size={20} />
          <span>{t('matchSavedSuccess')}</span>
        </div>
      )}

      {/* Current Step Content */}
      {currentStepInfo && (
        <div data-tour-id="tour-match-content" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{currentStepInfo.icon}</span>
            Passaggio {currentStep + 1}: {currentStepInfo.label}
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px' }}>
            {currentSection === HOME_AWAY_STEP_ID && t('stepHomeAwayInstruction')}
            {currentStep === 1 && t('step0Instruction')}
            {currentStep === 2 && t('step1Instruction')}
            {currentStep === 3 && t('step2Instruction')}
            {currentStep === 4 && t('step3Instruction')}
            {currentStep === 5 && t('step4Instruction')}
          </p>

          {/* Step 0: Casa / Fuori Casa (obbligatorio, prima delle foto) */}
          {currentSection === HOME_AWAY_STEP_ID ? (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsHome(true)
                    setStepData(prev => ({ ...prev, [HOME_AWAY_STEP_ID]: true }))
                    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
                  }}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: isHome ? 'rgba(0, 212, 255, 0.25)' : 'rgba(0, 212, 255, 0.08)',
                    border: `2px solid ${isHome ? 'rgba(0, 212, 255, 0.7)' : 'rgba(0, 212, 255, 0.25)'}`,
                    borderRadius: '10px',
                    color: '#00d4ff',
                    fontSize: '16px',
                    fontWeight: isHome ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isHome ? '0 0 14px rgba(0, 212, 255, 0.25)' : 'none'
                  }}
                >
                  🏠 {t('home')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHome(false)
                    setStepData(prev => ({ ...prev, [HOME_AWAY_STEP_ID]: true }))
                    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
                  }}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: !isHome ? 'rgba(0, 212, 255, 0.25)' : 'rgba(0, 212, 255, 0.08)',
                    border: `2px solid ${!isHome ? 'rgba(0, 212, 255, 0.7)' : 'rgba(0, 212, 255, 0.25)'}`,
                    borderRadius: '10px',
                    color: '#00d4ff',
                    fontSize: '16px',
                    fontWeight: !isHome ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: !isHome ? '0 0 14px rgba(0, 212, 255, 0.25)' : 'none'
                  }}
                >
                  ✈️ {t('away')}
                </button>
              </div>
              <div style={{ fontSize: '12px', opacity: 0.75, color: 'var(--neon-blue)' }}>
                {t('homeAwayHint')}
              </div>
            </div>
          ) : (
            <>
          {/* Errore in-context (estrazione o salvataggio) */}
          {error && (
            <div
              role="alert"
              style={{
                marginBottom: '16px',
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
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
          <div style={{
            marginBottom: '16px',
            padding: '14px',
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.22)',
            borderRadius: '10px'
          }}>
            <div style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#7dd3fc',
              marginBottom: '4px'
            }}>
              {uploadStepTitle}
            </div>
            <div style={{
              fontSize: '13px',
              lineHeight: 1.45,
              opacity: 0.82
            }}>
              {uploadStepHint}
            </div>
          </div>
          {/* Image Preview(s) */}
          {isPlayerRatingsStep ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
              {[0, 1].map(slot => (
                <div key={slot} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>
                    {slot === 0 ? t('stepPlayerRatingsPhoto1') : t('stepPlayerRatingsPhoto2')}
                  </div>
                  {playerRatingsImages[slot] ? (
                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                      <img src={playerRatingsImages[slot]} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
                    </div>
                  ) : null}
                  <input
                    id={`match-upload-${slot}`}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect(currentSection, slot)}
                    style={{ display: 'none' }}
                    disabled={extracting || saving}
                  />
                  <input
                    id={`match-camera-${slot}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect(currentSection, slot)}
                    style={{ display: 'none' }}
                    disabled={extracting || saving}
                  />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById(`match-upload-${slot}`)?.click()}
                      disabled={extracting || saving}
                      style={{
                      flex: '1 1 150px',
                      minHeight: '48px',
                      borderRadius: '10px',
                      border: '1px solid rgba(0, 212, 255, 0.35)',
                      background: 'rgba(0, 212, 255, 0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: extracting || saving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#00d4ff',
                      opacity: extracting || saving ? 0.5 : 1
                    }}
                    >
                      <Upload size={16} />
                      {t('upload')}
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById(`match-camera-${slot}`)?.click()}
                      disabled={extracting || saving}
                      style={{
                      flex: '1 1 150px',
                      minHeight: '48px',
                      borderRadius: '10px',
                      border: '1px solid rgba(0, 212, 255, 0.35)',
                      background: 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: extracting || saving ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#00d4ff',
                      opacity: extracting || saving ? 0.5 : 1
                    }}
                    >
                      <Camera size={16} />
                      {t('cameraCaptureTitle')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : currentImage ? (
            <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <img src={currentImage} alt="Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
          ) : null}

          {/* Upload Button (solo per step non pagelle) */}
          {!isPlayerRatingsStep && (
            <>
              <input
                id={`match-upload-${currentSection}`}
                type="file"
                accept="image/*"
                onChange={handleImageSelect(currentSection)}
                style={{ display: 'none' }}
                disabled={extracting || saving}
              />
              <input
                id={`match-camera-${currentSection}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect(currentSection)}
                style={{ display: 'none' }}
                disabled={extracting || saving}
              />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => document.getElementById(`match-upload-${currentSection}`)?.click()}
                disabled={extracting || saving}
                style={{
                flex: '1 1 150px',
                minHeight: '48px',
                borderRadius: '10px',
                border: '1px solid rgba(0, 212, 255, 0.35)',
                background: 'rgba(0, 212, 255, 0.18)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: extracting || saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                color: '#00d4ff',
                opacity: extracting || saving ? 0.5 : 1
              }}
              >
                <Upload size={16} />
                {t('upload')}
              </button>
              <button
                type="button"
                onClick={() => document.getElementById(`match-camera-${currentSection}`)?.click()}
                disabled={extracting || saving}
                style={{
                flex: '1 1 150px',
                minHeight: '48px',
                borderRadius: '10px',
                border: '1px solid rgba(0, 212, 255, 0.35)',
                background: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: extracting || saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                color: '#00d4ff',
                opacity: extracting || saving ? 0.5 : 1
              }}
              >
                <Camera size={16} />
                {t('cameraCaptureTitle')}
              </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {hasImageForExtract && (
              <button
                onClick={() => handleExtract(currentSection)}
                disabled={extracting || saving || !!currentData}
                style={{
                  flex: 1,
                  background: currentData
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(0, 212, 255, 0.2)',
                  border: `1px solid ${currentData ? 'rgba(34, 197, 94, 0.5)' : 'rgba(0, 212, 255, 0.5)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  color: currentData ? '#86efac' : '#00d4ff',
                  cursor: extracting || saving || currentData ? 'not-allowed' : 'pointer',
                  opacity: extracting || saving || currentData ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600
                }}
              >
                {extracting ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('extracting')}
                  </>
                ) : currentData ? (
                  <>
                    <CheckCircle2 size={18} />
                    {t('extractData')}
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    {t('extractData')}
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => handleSkip(currentSection)}
              disabled={extracting || saving}
              style={{
                flex: hasImageForExtract ? 0.5 : 1,
                background: 'rgba(156, 163, 175, 0.2)',
                border: '1px solid rgba(156, 163, 175, 0.5)',
                borderRadius: '8px',
                padding: '12px',
                color: '#d1d5db',
                cursor: extracting || saving ? 'not-allowed' : 'pointer',
                opacity: extracting || saving ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600
              }}
            >
              <SkipForward size={18} />
              {t('skip')}
            </button>
          </div>

          {/* Extracted Data Preview */}
          {currentData && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              opacity: 0.8
            }}>
              <strong>{t('dataExtractedSuccess')}</strong>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* Save Button (solo all'ultimo step o se tutti gli step sono completati/saltati) */}
      {(currentStep === STEPS.length - 1 || Object.keys(stepData).length === STEPS.length) && (
        <button
          data-tour-id="tour-match-save"
          onClick={handleShowSummary}
          disabled={saving || photosUploaded < 3 || typeof isHome !== 'boolean'}
          style={{
            width: '100%',
            background: saving
              ? 'rgba(156, 163, 175, 0.2)'
              : 'rgba(34, 197, 94, 0.2)',
            border: `1px solid ${saving ? 'rgba(156, 163, 175, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
            borderRadius: '8px',
            padding: '16px',
            color: saving ? '#d1d5db' : '#86efac',
            cursor: saving || photosUploaded < 3 || typeof isHome !== 'boolean' ? 'not-allowed' : 'pointer',
            opacity: saving || photosUploaded < 3 || typeof isHome !== 'boolean' ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '16px'
          }}
        >
          {saving ? (
            <>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
              {t('saving')}
            </>
          ) : (
            <>
              <Save size={20} />
              {t('saveMatch')}
            </>
          )}
        </button>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          overflowY: 'auto'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSummary(false)
          }
        }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: 'clamp(16px, 4vw, 24px)',
            paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
            maxWidth: '600px',
            width: '100%',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSummary(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Trophy size={24} color="var(--neon-orange)" />
              {t('matchSummary')}
            </h2>

            {/* Risultato Estratto */}
            {extractedResult && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#86efac'
              }}>
                <Trophy size={18} />
                <span><strong>{t('resultExtracted')}:</strong> {extractedResult}</span>
              </div>
            )}

            {/* Campo Casa/Fuori Casa - Obbligatorio */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-blue)',
                marginBottom: '8px'
              }}>
                {t('homeAwayLabel')} <span style={{ opacity: 0.6, fontWeight: 400 }}>({t('required')})</span>
              </label>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsHome(true)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: isHome
                      ? 'rgba(0, 212, 255, 0.3)'
                      : 'rgba(0, 212, 255, 0.1)',
                    border: `1px solid ${isHome ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.3)'}`,
                    borderRadius: '8px',
                    color: '#00d4ff',
                    fontSize: '14px',
                    fontWeight: isHome ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isHome ? '0 0 10px rgba(0, 212, 255, 0.3)' : 'none'
                  }}
                >
                  🏠 {t('home')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsHome(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: !isHome
                      ? 'rgba(0, 212, 255, 0.3)'
                      : 'rgba(0, 212, 255, 0.1)',
                    border: `1px solid ${!isHome ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.3)'}`,
                    borderRadius: '8px',
                    color: '#00d4ff',
                    fontSize: '14px',
                    fontWeight: !isHome ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: !isHome ? '0 0 10px rgba(0, 212, 255, 0.3)' : 'none'
                  }}
                >
                  ✈️ {t('away')}
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.7,
                marginTop: '4px',
                color: '#00d4ff'
              }}>
                {t('homeAwayHint')}
              </div>
            </div>

            {/* Campo Nome Avversario - Opzionale */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-blue)',
                marginBottom: '8px'
              }}>
                {t('opponentNameLabel')} <span style={{ opacity: 0.6, fontWeight: 400 }}>({t('optional')})</span>
              </label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder={t('opponentNamePlaceholder')}
                maxLength={255}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#00d4ff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(0, 212, 255, 0.6)'
                  e.target.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.3)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <div style={{
                fontSize: '12px',
                opacity: 0.7,
                marginTop: '4px',
                color: '#00d4ff'
              }}>
                {t('opponentNameHint')}
              </div>
            </div>

            {/* Sezioni Complete/Mancanti */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {photosComplete.length > 0 && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                    {t('sectionsComplete')} ({photosComplete.length})
                  </div>
                  <div style={{ fontSize: '14px', color: '#86efac' }}>
                    {photosComplete.join(', ')}
                  </div>
                </div>
              )}
              {photosMissing.length > 0 && (
                <div style={{
                  background: 'rgba(255, 165, 0, 0.1)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                    {t('sectionsMissing')} ({photosMissing.length})
                  </div>
                  <div style={{ fontSize: '14px', color: '#ffa500' }}>
                    {photosMissing.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background: saving
                    ? 'rgba(156, 163, 175, 0.2)'
                    : 'rgba(34, 197, 94, 0.2)',
                  border: `1px solid ${saving ? 'rgba(156, 163, 175, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  color: saving ? '#d1d5db' : '#86efac',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {t('confirmSave')}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSummary(false)}
                disabled={saving}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background: 'rgba(156, 163, 175, 0.2)',
                  border: '1px solid rgba(156, 163, 175, 0.5)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#d1d5db',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600
                }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
