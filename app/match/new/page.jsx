'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, SkipForward, Save, Camera, Trophy, Sparkles, Brain, Zap, ShieldCheck, Target, Home, Plane, FileImage } from 'lucide-react'
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
          loadedStepData[HOME_AWAY_STEP_ID] = parsed.isHome
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
        const firstEmptyStep = STEPS.findIndex(step => loadedStepData[step.id] === undefined || loadedStepData[step.id] === null)
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
  const uploadStepTitle = lang === 'en' ? '1. Upload photo' : '1. Carica foto'
  const uploadStepHint = lang === 'en'
    ? 'First upload the screenshot for this section, then extract the data.'
    : 'Prima carica lo screenshot di questa sezione, poi estrai i dati.'
  const compactPreviewFrameStyle = {
    marginBottom: '16px',
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
    maxHeight: '320px',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block'
  }
  const isItalian = lang !== 'en'
  const analysisQuality = photosUploaded >= 5
    ? {
        label: isItalian ? 'Analisi completa' : 'Complete analysis',
        tone: '#22c55e',
        description: isItalian
          ? 'Tutti gli screenshot chiave sono stati letti. Il Coach avra il massimo contesto.'
          : 'All key screenshots have been read. The Coach will have maximum context.'
      }
    : photosUploaded >= 3
    ? {
        label: isItalian ? 'Analisi buona' : 'Good analysis',
        tone: '#facc15',
        description: isItalian
          ? 'Puoi salvare ora. Aggiungi altri screenshot per rendere i consigli piu precisi.'
          : 'You can save now. Add more screenshots to make advice more precise.'
      }
    : {
        label: isItalian ? 'In preparazione' : 'Preparing',
        tone: '#00d4ff',
        description: isItalian
          ? 'Servono almeno 3 screenshot letti per salvare una partita utile al Coach.'
          : 'At least 3 read screenshots are needed to save a useful match for the Coach.'
      }
  const sectionPurpose = {
    player_ratings: isItalian
      ? 'Capisco chi ha performato meglio e peggio nella tua squadra e nell avversario.'
      : 'I understand who performed best and worst on your team and the opponent.',
    team_stats: isItalian
      ? 'Leggo possesso, tiri, passaggi e risultato per interpretare il dominio della partita.'
      : 'I read possession, shots, passes and score to interpret match control.',
    attack_areas: isItalian
      ? 'Vedo da quali zone hai attaccato e dove sei stato piu prevedibile.'
      : 'I see which zones you attacked from and where you were more predictable.',
    ball_recovery_zones: isItalian
      ? 'Mappo dove recuperi palla per capire pressione, baricentro e transizioni.'
      : 'I map where you recover the ball to understand pressure, block height and transitions.',
    formation_style: isItalian
      ? 'Salvo modulo, stile e forza squadra per aggiornare la memoria tattica.'
      : 'I save formation, style and team strength to update tactical memory.'
  }
  const stepStatusLabel = (step) => {
    if (step.id === HOME_AWAY_STEP_ID) {
      return stepData[HOME_AWAY_STEP_ID] !== undefined
        ? (isItalian ? 'Scelto' : 'Selected')
        : (isItalian ? 'Da scegliere' : 'Choose')
    }
    if (stepData[step.id] && stepData[step.id] !== null) return isItalian ? 'Letto' : 'Read'
    if (stepData[step.id] === null) return isItalian ? 'Saltato' : 'Skipped'
    if (step.id === 'player_ratings') {
      const count = Array.isArray(stepImages.player_ratings) ? stepImages.player_ratings.filter(Boolean).length : (stepImages.player_ratings ? 1 : 0)
      return count > 0 ? (isItalian ? 'Pronto' : 'Ready') : (isItalian ? 'Da caricare' : 'Upload')
    }
    return stepImages[step.id] ? (isItalian ? 'Pronto' : 'Ready') : (isItalian ? 'Da caricare' : 'Upload')
  }
  const stepStatusColor = (step) => {
    if (stepData[step.id] && stepData[step.id] !== null) return '#22c55e'
    if (stepData[step.id] === null) return '#9ca3af'
    if (step.id === currentSection) return '#00d4ff'
    return 'rgba(255,255,255,0.48)'
  }
  const readableSections = photosComplete.length
  const minimumReached = photosUploaded >= 3
  const shellCardStyle = {
    background: 'linear-gradient(145deg, rgba(5, 12, 25, 0.92) 0%, rgba(2, 4, 10, 0.96) 100%)',
    border: '1px solid rgba(0, 212, 255, 0.22)',
    borderRadius: '22px',
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden'
  }
  const primaryCtaStyle = {
    minHeight: '52px',
    borderRadius: '14px',
    border: '1px solid rgba(0, 212, 255, 0.52)',
    background: 'linear-gradient(135deg, #00d4ff 0%, #00a1a6 100%)',
    color: '#020510',
    fontWeight: 900,
    fontSize: '15px',
    cursor: extracting || saving || currentData ? 'not-allowed' : 'pointer',
    opacity: extracting || saving || currentData ? 0.58 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 10px 30px rgba(0, 212, 255, 0.28), inset 0 1px 0 rgba(255,255,255,0.45)'
  }

  if (!mounted) {
    return null
  }

  return (
    <main data-tour-id="tour-match-intro" className="match-upload-page" style={{
      minHeight: '100vh',
      color: '#fff',
      padding: 'clamp(14px, 3vw, 28px)',
      paddingBottom: '110px',
      maxWidth: '1180px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '18px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <button
          onClick={() => router.push('/match')}
          className="match-ghost-button"
          type="button"
        >
          <ArrowLeft size={18} />
          {isItalian ? 'Torna alle partite' : 'Back to matches'}
        </button>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '999px',
          border: '1px solid rgba(255, 203, 5, 0.28)',
          background: 'rgba(255, 203, 5, 0.08)',
          color: '#facc15',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '0.4px',
          textTransform: 'uppercase'
        }}>
          <Sparkles size={14} />
          {isItalian ? 'Post partita' : 'Post match'}
        </div>
      </div>

      <section className="match-hero" style={{ ...shellCardStyle, padding: 'clamp(22px, 5vw, 36px)', marginBottom: '18px' }}>
        <div className="hero-orb hero-orb-a" />
        <div className="hero-orb hero-orb-b" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, 0.8fr)',
          gap: '24px',
          alignItems: 'center'
        }} className="match-hero-grid">
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 11px',
              borderRadius: '999px',
              background: 'rgba(0, 212, 255, 0.10)',
              border: '1px solid rgba(0, 212, 255, 0.25)',
              color: '#7dd3fc',
              fontSize: '12px',
              fontWeight: 800,
              marginBottom: '16px'
            }}>
              <Brain size={15} />
              {isItalian ? 'Memoria tattica AI' : 'AI tactical memory'}
            </div>
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(30px, 6vw, 56px)',
              lineHeight: 0.95,
              letterSpacing: '-1.6px',
              fontWeight: 950
            }}>
              {isItalian ? 'Trasforma la partita in vantaggio competitivo.' : 'Turn your match into competitive edge.'}
            </h1>
            <p style={{
              margin: '18px 0 0',
              maxWidth: '680px',
              color: 'rgba(255,255,255,0.74)',
              fontSize: 'clamp(15px, 2vw, 18px)',
              lineHeight: 1.55
            }}>
              {isItalian
                ? 'Carica gli screenshot di eFootball: li leggo, salvo la partita e aggiorno il Coach con pattern, memoria AI, dashboard e task settimanali.'
                : 'Upload your eFootball screenshots: I read them, save the match and update the Coach with patterns, AI memory, dashboard and weekly tasks.'}
            </p>
          </div>
          <div className="quality-card" style={{
            borderRadius: '18px',
            border: `1px solid ${analysisQuality.tone}66`,
            background: `linear-gradient(145deg, ${analysisQuality.tone}20, rgba(255,255,255,0.04))`,
            padding: '18px',
            boxShadow: `0 0 30px ${analysisQuality.tone}22`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.72, fontWeight: 900 }}>
                  {isItalian ? 'Qualita' : 'Quality'}
                </div>
                <div style={{ color: analysisQuality.tone, fontSize: '24px', fontWeight: 950, marginTop: '2px' }}>
                  {analysisQuality.label}
                </div>
              </div>
              <div style={{
                width: '58px',
                height: '58px',
                borderRadius: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.24)',
                border: `1px solid ${analysisQuality.tone}55`
              }}>
                <Target size={28} color={analysisQuality.tone} />
              </div>
            </div>
            <div style={{
              height: '10px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.10)',
              overflow: 'hidden',
              marginTop: '18px'
            }}>
              <div style={{
                height: '100%',
                width: `${(photosUploaded / photoSteps.length) * 100}%`,
                borderRadius: '999px',
                background: `linear-gradient(90deg, #00d4ff, ${analysisQuality.tone})`,
                transition: 'width 0.45s ease'
              }} />
            </div>
            <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.72)', fontSize: '13px', lineHeight: 1.45 }}>
              {analysisQuality.description}
            </p>
            <div style={{ marginTop: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.84)', fontWeight: 800 }}>
              {readableSections}/{photoSteps.length} {isItalian ? 'screenshot letti' : 'screenshots read'}
              {extractedResult ? ` · ${isItalian ? 'Risultato' : 'Score'} ${extractedResult}` : ''}
            </div>
          </div>
        </div>
      </section>

      <div data-tour-id="tour-match-steps" className="match-step-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))',
        gap: '10px',
        marginBottom: '18px'
      }}>
        {STEPS.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = stepData[step.id] !== null && stepData[step.id] !== undefined
          const isSkipped = stepData[step.id] === null

          return (
            <button
              type="button"
              key={step.id}
              className="match-step-pill"
              style={{
                textAlign: 'left',
                padding: '12px',
                borderRadius: '16px',
                background: isActive
                  ? 'linear-gradient(145deg, rgba(0, 212, 255, 0.18), rgba(0, 161, 166, 0.10))'
                  : isCompleted
                  ? 'rgba(34, 197, 94, 0.10)'
                  : isSkipped
                  ? 'rgba(156, 163, 175, 0.10)'
                  : 'rgba(255, 255, 255, 0.045)',
                border: `1px solid ${
                  isActive
                    ? 'rgba(0, 212, 255, 0.55)'
                    : isCompleted
                    ? 'rgba(34, 197, 94, 0.35)'
                    : 'rgba(255, 255, 255, 0.10)'
                }`,
                cursor: 'pointer',
                transition: 'all 0.22s ease',
                color: '#fff',
                minHeight: '104px',
                boxShadow: isActive ? '0 0 24px rgba(0, 212, 255, 0.18)' : 'none'
              }}
              onClick={() => setCurrentStep(index)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '22px' }}>{step.icon}</span>
                {isCompleted ? <CheckCircle2 size={17} color="#22c55e" /> : <span style={{ color: stepStatusColor(step), fontSize: '11px', fontWeight: 900 }}>{index + 1}</span>}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 900, lineHeight: 1.15, minHeight: '28px' }}>{step.label}</div>
              <div style={{ marginTop: '8px', color: stepStatusColor(step), fontSize: '11px', fontWeight: 800 }}>
                {stepStatusLabel(step)}
              </div>
            </button>
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
        <div data-tour-id="tour-match-content" className="match-workspace-card" style={{
          ...shellCardStyle,
          padding: 'clamp(18px, 4vw, 28px)',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '22px'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '999px',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.18)',
                color: '#7dd3fc',
                fontSize: '12px',
                fontWeight: 900,
                marginBottom: '12px'
              }}>
                <span>{currentStepInfo.icon}</span>
                {isItalian ? `Step ${currentStep + 1} di ${STEPS.length}` : `Step ${currentStep + 1} of ${STEPS.length}`}
              </div>
              <h2 style={{
                fontSize: 'clamp(24px, 4vw, 34px)',
                fontWeight: 950,
                letterSpacing: '-0.8px',
                margin: 0
              }}>
                {currentSection === HOME_AWAY_STEP_ID
                  ? (isItalian ? 'Prima cosa: dove hai giocato?' : 'First: where did you play?')
                  : currentStepInfo.label}
              </h2>
              <p style={{ fontSize: '15px', opacity: 0.76, margin: '10px 0 0', maxWidth: '720px', lineHeight: 1.55 }}>
                {currentSection === HOME_AWAY_STEP_ID
                  ? (isItalian
                      ? 'Questa scelta serve solo a leggere correttamente risultato, squadra cliente e avversario.'
                      : 'This only helps read score, client team and opponent correctly.')
                  : sectionPurpose[currentSection]}
              </p>
            </div>
            {currentSection !== HOME_AWAY_STEP_ID && (
              <div style={{
                minWidth: '180px',
                borderRadius: '16px',
                padding: '12px 14px',
                background: currentData ? 'rgba(34,197,94,0.10)' : hasImageForExtract ? 'rgba(250,204,21,0.10)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${currentData ? 'rgba(34,197,94,0.35)' : hasImageForExtract ? 'rgba(250,204,21,0.32)' : 'rgba(255,255,255,0.10)'}`,
                color: currentData ? '#86efac' : hasImageForExtract ? '#facc15' : 'rgba(255,255,255,0.70)',
                fontWeight: 900
              }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', opacity: 0.72 }}>
                  {isItalian ? 'Stato screenshot' : 'Screenshot status'}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentData ? <CheckCircle2 size={16} /> : hasImageForExtract ? <Zap size={16} /> : <FileImage size={16} />}
                  {currentData ? (isItalian ? 'Letto dal Coach' : 'Read by Coach') : hasImageForExtract ? (isItalian ? 'Pronto da leggere' : 'Ready to read') : (isItalian ? 'Da caricare' : 'Upload needed')}
                </div>
              </div>
            )}
          </div>

          {/* Step 0: Casa / Fuori Casa (obbligatorio, prima delle foto) */}
          {currentSection === HOME_AWAY_STEP_ID ? (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginBottom: '14px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsHome(true)
                    setStepData(prev => ({ ...prev, [HOME_AWAY_STEP_ID]: true }))
                    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
                  }}
                  className="match-choice-card"
                  style={{
                    padding: '20px',
                    minHeight: '154px',
                    background: isHome ? 'linear-gradient(145deg, rgba(0,212,255,0.22), rgba(0,161,166,0.10))' : 'rgba(255,255,255,0.045)',
                    border: `1px solid ${isHome ? 'rgba(0, 212, 255, 0.65)' : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: '18px',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.22s ease',
                    boxShadow: isHome ? '0 0 28px rgba(0, 212, 255, 0.22)' : 'none'
                  }}
                >
                  <Home size={28} color={isHome ? '#00d4ff' : 'rgba(255,255,255,0.55)'} />
                  <div style={{ fontSize: '20px', fontWeight: 950, marginTop: '18px' }}>{isItalian ? 'Ho giocato in casa' : 'I played home'}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.66)', lineHeight: 1.4, marginTop: '6px' }}>
                    {isItalian ? 'La tua squadra e a sinistra/casa negli screenshot.' : 'Your team is left/home in screenshots.'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHome(false)
                    setStepData(prev => ({ ...prev, [HOME_AWAY_STEP_ID]: false }))
                    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
                  }}
                  className="match-choice-card"
                  style={{
                    padding: '20px',
                    minHeight: '154px',
                    background: !isHome ? 'linear-gradient(145deg, rgba(0,212,255,0.22), rgba(0,161,166,0.10))' : 'rgba(255,255,255,0.045)',
                    border: `1px solid ${!isHome ? 'rgba(0, 212, 255, 0.65)' : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: '18px',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.22s ease',
                    boxShadow: !isHome ? '0 0 28px rgba(0, 212, 255, 0.22)' : 'none'
                  }}
                >
                  <Plane size={28} color={!isHome ? '#00d4ff' : 'rgba(255,255,255,0.55)'} />
                  <div style={{ fontSize: '20px', fontWeight: 950, marginTop: '18px' }}>{isItalian ? 'Ho giocato fuori casa' : 'I played away'}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.66)', lineHeight: 1.4, marginTop: '6px' }}>
                    {isItalian ? 'La tua squadra e a destra/fuori negli screenshot.' : 'Your team is right/away in screenshots.'}
                  </div>
                </button>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'rgba(125, 211, 252, 0.92)',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.16)',
                borderRadius: '12px',
                padding: '10px 12px'
              }}>
                <ShieldCheck size={16} />
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
            padding: '16px',
            background: 'linear-gradient(145deg, rgba(0, 212, 255, 0.10), rgba(255,255,255,0.035))',
            border: '1px solid rgba(0, 212, 255, 0.20)',
            borderRadius: '16px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 900,
              color: '#7dd3fc',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FileImage size={17} />
              {hasImageForExtract
                ? (isItalian ? 'Screenshot caricato' : 'Screenshot uploaded')
                : (isItalian ? 'Carica lo screenshot giusto' : 'Upload the right screenshot')}
            </div>
            <div style={{
              fontSize: '13px',
              lineHeight: 1.45,
              opacity: 0.82
            }}>
              {hasImageForExtract
                ? (isItalian ? 'Ora fai leggere lo screenshot al Coach. Ogni lettura consuma 2 HP e aggiorna questa sezione.' : 'Now let the Coach read it. Each read uses 2 HP and updates this section.')
                : (isItalian ? 'Scegli dalla galleria o usa la fotocamera. Dopo il caricamento potrai farlo leggere al Coach.' : 'Choose from gallery or use the camera. After upload, the Coach can read it.')}
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
                    <div style={compactPreviewFrameStyle}>
                      <img src={playerRatingsImages[slot]} alt="" style={compactPreviewImageStyle} />
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
                      {isItalian ? 'Carica file' : 'Upload file'}
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
                      {isItalian ? 'Usa fotocamera' : 'Use camera'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : currentImage ? (
            <div style={compactPreviewFrameStyle}>
              <img src={currentImage} alt="Preview" style={compactPreviewImageStyle} />
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
                {isItalian ? 'Carica file' : 'Upload file'}
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
                {isItalian ? 'Usa fotocamera' : 'Use camera'}
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
                    ? 'rgba(34, 197, 94, 0.16)'
                    : 'linear-gradient(135deg, #00d4ff 0%, #00a1a6 100%)',
                  border: `1px solid ${currentData ? 'rgba(34, 197, 94, 0.45)' : 'rgba(0, 212, 255, 0.55)'}`,
                  borderRadius: '14px',
                  padding: '14px',
                  color: currentData ? '#86efac' : '#020510',
                  cursor: extracting || saving || currentData ? 'not-allowed' : 'pointer',
                  opacity: extracting || saving || currentData ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 900,
                  boxShadow: currentData ? 'none' : '0 10px 30px rgba(0, 212, 255, 0.24)'
                }}
              >
                {extracting ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {isItalian ? 'Il Coach sta leggendo...' : 'Coach is reading...'}
                  </>
                ) : currentData ? (
                  <>
                    <CheckCircle2 size={18} />
                    {isItalian ? 'Screenshot letto' : 'Screenshot read'}
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    {isItalian ? 'Leggi screenshot' : 'Read screenshot'}
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => handleSkip(currentSection)}
              disabled={extracting || saving}
              style={{
                flex: hasImageForExtract ? 0.5 : 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '12px',
                color: 'rgba(255,255,255,0.72)',
                cursor: extracting || saving ? 'not-allowed' : 'pointer',
                opacity: extracting || saving ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 800
              }}
            >
              <SkipForward size={18} />
              {isItalian ? 'Lo aggiungo dopo' : 'Add later'}
            </button>
          </div>

          {/* Extracted Data Preview */}
          {currentData && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.14), rgba(255,255,255,0.04))',
              border: '1px solid rgba(34, 197, 94, 0.32)',
              borderRadius: '14px',
              fontSize: '13px',
              color: '#86efac'
            }}>
              <strong>{isItalian ? 'Perfetto: questa sezione ora aiuta il Coach a capire meglio la partita.' : 'Perfect: this section now helps the Coach understand the match better.'}</strong>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* Save Button (solo all'ultimo step o se tutti gli step sono completati/saltati) */}
      {(currentStep === STEPS.length - 1 || Object.keys(stepData).length === STEPS.length) && (
        <div data-tour-id="tour-match-save" style={{
          ...shellCardStyle,
          padding: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          <div style={{ minWidth: '220px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: analysisQuality.tone, fontWeight: 950, fontSize: '17px' }}>
              <ShieldCheck size={19} />
              {minimumReached ? analysisQuality.label : (isItalian ? 'Non ancora salvabile' : 'Not save-ready yet')}
            </div>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.68)', fontSize: '13px' }}>
              {minimumReached
                ? (isItalian ? 'Puoi salvare la partita e aggiornare dashboard, memoria AI e task.' : 'You can save the match and update dashboard, AI memory and tasks.')
                : (isItalian ? 'Leggi almeno 3 screenshot per creare una partita utile.' : 'Read at least 3 screenshots to create a useful match.')}
            </p>
          </div>
          <button
            onClick={handleShowSummary}
            disabled={saving || photosUploaded < 3 || typeof isHome !== 'boolean'}
            className="match-save-cta"
            style={{
              minWidth: '260px',
              minHeight: '58px',
              background: saving || photosUploaded < 3
                ? 'rgba(156, 163, 175, 0.18)'
                : 'linear-gradient(135deg, #22c55e 0%, #86efac 100%)',
              border: `1px solid ${saving || photosUploaded < 3 ? 'rgba(156, 163, 175, 0.35)' : 'rgba(134, 239, 172, 0.55)'}`,
              borderRadius: '16px',
              padding: '16px 22px',
              color: saving || photosUploaded < 3 ? '#d1d5db' : '#021006',
              cursor: saving || photosUploaded < 3 || typeof isHome !== 'boolean' ? 'not-allowed' : 'pointer',
              opacity: saving || photosUploaded < 3 || typeof isHome !== 'boolean' ? 0.55 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 950,
              fontSize: '15px',
              boxShadow: saving || photosUploaded < 3 ? 'none' : '0 12px 32px rgba(34, 197, 94, 0.28)'
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
                {isItalian ? 'Salva e aggiorna il Coach' : 'Save and update Coach'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(14px)',
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
            background: 'linear-gradient(145deg, rgba(5, 12, 25, 0.98) 0%, rgba(2, 4, 10, 0.99) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.26)',
            borderRadius: '24px',
            padding: 'clamp(16px, 4vw, 24px)',
            paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
            maxWidth: '680px',
            width: '100%',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 24px 80px rgba(0,0,0,0.65), 0 0 50px rgba(0,212,255,0.18)'
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

            <div style={{ textAlign: 'center', marginBottom: '22px', padding: '8px 24px 0' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '22px',
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(255,203,5,0.22), rgba(0,212,255,0.14))',
                border: '1px solid rgba(255,203,5,0.35)',
                boxShadow: '0 0 30px rgba(255,203,5,0.16)'
              }}>
                <Trophy size={32} color="var(--neon-orange)" />
              </div>
              <h2 style={{
                fontSize: 'clamp(24px, 5vw, 34px)',
                fontWeight: 950,
                margin: 0,
                letterSpacing: '-0.8px'
              }}>
                {isItalian ? 'Pronto a salvare la partita' : 'Ready to save the match'}
              </h2>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.68)', fontSize: '14px', lineHeight: 1.45 }}>
                {isItalian
                  ? 'Controlla gli ultimi dettagli. Dopo il salvataggio aggiorno il Coach, la dashboard e la memoria tattica.'
                  : 'Check the final details. After saving I update Coach, dashboard and tactical memory.'}
              </p>
            </div>

            {/* Risultato Estratto */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
              marginBottom: '18px'
            }}>
              <div style={{
                background: 'rgba(34, 197, 94, 0.10)',
                border: '1px solid rgba(34, 197, 94, 0.28)',
                borderRadius: '14px',
                padding: '12px',
                color: '#86efac'
              }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', opacity: 0.75, fontWeight: 900 }}>{isItalian ? 'Risultato' : 'Score'}</div>
                <div style={{ fontSize: '20px', fontWeight: 950, marginTop: '4px' }}>{extractedResult || 'N/A'}</div>
              </div>
              <div style={{
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.20)',
                borderRadius: '14px',
                padding: '12px',
                color: '#7dd3fc'
              }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', opacity: 0.75, fontWeight: 900 }}>{isItalian ? 'Lettura' : 'Read quality'}</div>
                <div style={{ fontSize: '20px', fontWeight: 950, marginTop: '4px' }}>{photosUploaded}/5</div>
              </div>
              <div style={{
                background: `${analysisQuality.tone}14`,
                border: `1px solid ${analysisQuality.tone}40`,
                borderRadius: '14px',
                padding: '12px',
                color: analysisQuality.tone
              }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', opacity: 0.75, fontWeight: 900 }}>{isItalian ? 'Qualita' : 'Quality'}</div>
                <div style={{ fontSize: '18px', fontWeight: 950, marginTop: '4px' }}>{analysisQuality.label}</div>
              </div>
            </div>

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

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
              marginBottom: '20px'
            }}>
              {[
                { icon: Brain, text: isItalian ? 'Memoria AI' : 'AI memory' },
                { icon: Target, text: isItalian ? 'Pattern tattici' : 'Tactical patterns' },
                { icon: Zap, text: isItalian ? 'Dashboard e task' : 'Dashboard and tasks' }
              ].map(item => {
                const Icon = item.icon
                return (
                  <div key={item.text} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.045)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: 'rgba(255,255,255,0.78)',
                    fontSize: '13px',
                    fontWeight: 800
                  }}>
                    <Icon size={16} color="#00d4ff" />
                    {item.text}
                  </div>
                )
              })}
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
                    : 'linear-gradient(135deg, #22c55e 0%, #86efac 100%)',
                  border: `1px solid ${saving ? 'rgba(156, 163, 175, 0.5)' : 'rgba(134, 239, 172, 0.55)'}`,
                  borderRadius: '14px',
                  padding: '14px',
                  color: saving ? '#d1d5db' : '#021006',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 950
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
                    {isItalian ? 'Salva e aggiorna il Coach' : 'Save and update Coach'}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSummary(false)}
                disabled={saving}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
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
        .match-upload-page {
          animation: match-page-in 420ms ease both;
        }
        .match-hero,
        .match-workspace-card {
          animation: match-card-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hero-orb {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(4px);
          opacity: 0.55;
        }
        .hero-orb-a {
          width: 240px;
          height: 240px;
          right: -80px;
          top: -90px;
          background: radial-gradient(circle, rgba(0,212,255,0.28), transparent 68%);
          animation: float-orb 7s ease-in-out infinite;
        }
        .hero-orb-b {
          width: 180px;
          height: 180px;
          left: 42%;
          bottom: -90px;
          background: radial-gradient(circle, rgba(255,203,5,0.16), transparent 68%);
          animation: float-orb 8s ease-in-out infinite reverse;
        }
        .match-ghost-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.78);
          font-weight: 800;
          cursor: pointer;
          transition: all 180ms ease;
        }
        .match-ghost-button:hover,
        .match-step-pill:hover,
        .match-choice-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 212, 255, 0.45) !important;
          box-shadow: 0 12px 32px rgba(0, 212, 255, 0.12);
        }
        .match-save-cta {
          position: relative;
          overflow: hidden;
        }
        .match-save-cta::after {
          content: '';
          position: absolute;
          inset: -80% auto auto -30%;
          width: 80px;
          height: 260%;
          background: rgba(255,255,255,0.35);
          transform: rotate(25deg) translateX(-160px);
          transition: transform 700ms ease;
        }
        .match-save-cta:not(:disabled):hover::after {
          transform: rotate(25deg) translateX(520px);
        }
        .match-save-cta:not(:disabled):hover {
          transform: translateY(-2px);
        }
        @keyframes match-page-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes match-card-in {
          from { opacity: 0; transform: translateY(14px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float-orb {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(14px, 12px, 0); }
        }
        @media (max-width: 980px) {
          .match-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .match-step-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 640px) {
          .match-step-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .match-step-pill {
            min-height: 94px !important;
          }
          .quality-card {
            padding: 14px !important;
          }
        }
      `}</style>
    </main>
  )
}
