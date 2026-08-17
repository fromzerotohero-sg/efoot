'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { Upload, Camera, AlertCircle, CheckCircle2, RefreshCw, BarChart3, Zap, Gift, ChevronDown, ChevronUp, Award, Pencil, ArrowLeft } from 'lucide-react'
import { getPhotoTypeStyle } from '@/lib/playerPhotoTypes'
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/uploadConstants'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'
import { getSkillDisplayLabel } from '@/lib/playerSkillLabels'
import ManualPlayerModal from '@/components/ManualPlayerModal'
import ManualBoostersModal from '@/components/ManualBoostersModal'
import { getPlayerDisplayStats, getPlayerDisplayOverall } from '@/lib/playerEffectiveStats'
import { getPlayerPhaseStyleDisplay } from '@/lib/playingStyleResolve'

export default function PlayerDetailPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const playerId = params?.id

  const [player, setPlayer] = React.useState(null)
  const [playingStyleName, setPlayingStyleName] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [uploadType, setUploadType] = React.useState(null) // 'stats', 'skills', 'booster'
  const [images, setImages] = React.useState([])
  const [confirmModal, setConfirmModal] = React.useState(null) // { show, extractedData, nameMismatch, teamMismatch, positionMismatch, onConfirm, onCancel }
  const [showManualBoostersModal, setShowManualBoostersModal] = React.useState(false)
  const [manualBoosters, setManualBoosters] = React.useState([])
  const [queueStatus, setQueueStatus] = React.useState({
    phase: 'idle', // idle | extracting | confirming | saving
    activeType: null,
    currentIndex: 0,
    total: 0
  })
  const [expandedSections, setExpandedSections] = React.useState({
    stats: true,
    skills: true,
    boosters: true
  })
  const pendingUploadLabels = React.useMemo(() => ({
    stats: t('statsSection'),
    skills: t('skillsSection'),
    booster: t('boostersSection')
  }), [t])
  const isQueueActive = queueStatus.phase !== 'idle'
  const isUiBusy = uploading || isQueueActive
  const queueStatusContent = React.useMemo(() => {
    if (images.length === 0) return null

    const activeLabel = queueStatus.activeType ? (pendingUploadLabels[queueStatus.activeType] || queueStatus.activeType) : null
    const stepLabel = queueStatus.total > 0 ? `${queueStatus.currentIndex}/${queueStatus.total}` : null

    if (queueStatus.phase === 'extracting') {
      return {
        tone: 'info',
        title: lang === 'en' ? `Analyzing ${activeLabel} (${stepLabel})` : `Sto analizzando ${activeLabel} (${stepLabel})`,
        description: lang === 'en'
          ? 'Please wait. The app is reading the selected screenshot before asking for confirmation.'
          : 'Attendi un attimo. L’app sta leggendo lo screenshot selezionato prima di chiederti conferma.'
      }
    }

    if (queueStatus.phase === 'confirming') {
      return {
        tone: 'warning',
        title: lang === 'en' ? `Confirm ${activeLabel} (${stepLabel})` : `Conferma ${activeLabel} (${stepLabel})`,
        description: lang === 'en'
          ? 'Review the extracted data in the modal. After confirming, the app will continue with the next queued photo.'
          : 'Controlla i dati estratti nel modal. Dopo la conferma, l’app continuera con la foto successiva in coda.'
      }
    }

    if (queueStatus.phase === 'saving') {
      return {
        tone: 'success',
        title: lang === 'en' ? `Saving ${activeLabel} (${stepLabel})` : `Sto salvando ${activeLabel} (${stepLabel})`,
        description: lang === 'en'
          ? 'Do not close this page. The current section is being updated now.'
          : 'Non chiudere questa pagina. La sezione corrente si sta aggiornando adesso.'
      }
    }

    const countLabel = images.length === 1
      ? (lang === 'en' ? '1 photo ready' : '1 foto pronta')
      : (lang === 'en' ? `${images.length} photos ready` : `${images.length} foto pronte`)

    return {
      tone: 'neutral',
      title: countLabel,
      description: lang === 'en'
        ? 'Selected photos are queued by section. Tap "Save and update" once to process them in order.'
        : 'Le foto selezionate sono in coda per sezione. Tocca una sola volta "Salva e aggiorna" per processarle in ordine.'
    }
  }, [images.length, lang, pendingUploadLabels, queueStatus.activeType, queueStatus.currentIndex, queueStatus.phase, queueStatus.total])

  // Carica dati giocatore
  React.useEffect(() => {
    if (!playerId || !supabase) {
      router.push('/gestione-formazione')
      return
    }

    const fetchPlayer = async () => {
      setLoading(true)
      setError(null)

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

        const res = await fetch(`/api/players/${playerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login')
            return
          }
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || t('playerNotFound'))
        }

        const data = await res.json()
        setPlayer(data.player)
        setPlayingStyleName(data.playingStyleName)

      } catch (err) {
        console.error('[PlayerDetail] Error:', err)
        setError(err.message || t('errorLoadingPlayer'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlayer()
  }, [playerId, router, t])

  const processImageFile = async (file, type) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      // Continua: proviamo a ottimizzare client-side prima di bloccare l'utente
    }
    setError(null)
    try {
      const optimized = await optimizeImageFile(file)
      setImages(prev => {
        const nextImage = {
          file,
          dataUrl: optimized.dataUrl,
          name: file.name || 'camera.jpg',
          type
        }
        const existingIndex = prev.findIndex(img => img.type === type)
        if (existingIndex >= 0) {
          const next = [...prev]
          next[existingIndex] = nextImage
          return next
        }
        return [...prev, nextImage]
      })
      setUploadType(type)
    } catch (err) {
      console.error('[PlayerDetail] image optimization error:', err)
      setError(getImageOptimizeUserMessage(err, t))
    }
  }

  const handleFileSelect = async (e, type) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      setError(t('selectAtLeastOneImage'))
      return
    }
    if (imageFiles.length > 1) {
      setError(t('uploadOneImageOnly'))
      return
    }
    await processImageFile(imageFiles[0], type)
    e.target.value = ''
  }

  // Funzione per aggiornare il giocatore con i dati estratti
  const performUpdate = async (extractedPlayerData, type, currentPlayerData = player) => {
    if (!currentPlayerData) {
      setError(t('playerNotFound'))
      return null
    }
    
    setUploading(true)
    setError(null)

    try {
      const updateData = {}
      const photoSlots = currentPlayerData.photo_slots && typeof currentPlayerData.photo_slots === 'object'
        ? { ...currentPlayerData.photo_slots }
        : {}

      if (type === 'stats') {
        if (extractedPlayerData.base_stats) {
          updateData.base_stats = extractedPlayerData.base_stats
        }
        photoSlots.statistiche = true
      } else if (type === 'skills') {
        if (extractedPlayerData.skills) {
          updateData.skills = extractedPlayerData.skills
        }
        if (extractedPlayerData.com_skills) {
          updateData.com_skills = extractedPlayerData.com_skills
        }
        // Stili di gioco IA: salva in metadata se estratti (non c'è colonna dedicata)
        if (extractedPlayerData.ai_playstyles && Array.isArray(extractedPlayerData.ai_playstyles) && extractedPlayerData.ai_playstyles.length > 0) {
          updateData.metadata = {
            ...(currentPlayerData.metadata && typeof currentPlayerData.metadata === 'object' ? currentPlayerData.metadata : {}),
            ai_playstyles: extractedPlayerData.ai_playstyles
          }
        }
        // Se ci sono booster estratti dalla stessa foto, salvali e traccia
        if (extractedPlayerData.boosters && Array.isArray(extractedPlayerData.boosters) && extractedPlayerData.boosters.length > 0) {
          updateData.available_boosters = extractedPlayerData.boosters
          photoSlots.booster = true
        }
        photoSlots.abilita = true
      } else if (type === 'booster') {
        if (extractedPlayerData.boosters) {
          updateData.available_boosters = extractedPlayerData.boosters
        }
        photoSlots.booster = true
      }

      updateData.photo_slots = photoSlots
      updateData.updated_at = new Date().toISOString()

      // Aggiorna tramite API
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || t('errorUpdatingPlayer'))
      }

      const { player: updatedPlayer } = await res.json()

      setPlayer(updatedPlayer)
      setTimeout(() => {
        setError(null)
      }, 3000)
      return updatedPlayer
    } catch (err) {
      console.error('[PlayerDetail] Update error:', err)
      setError(err.message || t('errorUpdatingPlayer'))
      return null
    } finally {
      setUploading(false)
    }
  }

  const extractAndValidateImage = async (img, currentPlayerData, token) => {
    const extractRes = await fetch('/api/extract-player', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept-Language': lang === 'en' ? 'en' : 'it'
      },
      body: JSON.stringify({ imageDataUrl: img.dataUrl })
    })

    let extractData
    try {
      extractData = await extractRes.json()
    } catch (_) {
      throw new Error(mapErrorToUserMessage('500', t('errorExtractingData'), lang).message)
    }
    if (!extractRes.ok) {
      const { message } = mapErrorToUserMessage(extractData?.error || '', t('errorExtractingData'), lang)
      throw new Error(message)
    }

    if (!extractData.player) {
      throw new Error(t('unableToExtractData'))
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

    const normalizeBasic = (value) => {
      if (!value) return ''
      return String(value).toLowerCase().trim().replace(/\s+/g, ' ')
    }

    const normalizeTeamKey = (value) => {
      const s = normalizeBasic(value)
      if (!s) return ''
      return s
        .replace(/[–—]/g, '-')
        .replace(/[^a-z0-9\- ]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\bb\s+(?=\d)/g, 'b')
        .replace(/\s*-\s*/g, '-')
        .trim()
    }

    const extractedName = normalizeBasic(extractData.player.player_name)
    const currentName = normalizeBasic(currentPlayerData.player_name)
    const nameMismatch = extractedName !== currentName

    const extractedTeam = normalizeTeamKey(extractData.player.team)
    const currentTeam = normalizeTeamKey(currentPlayerData.team)
    const teamMismatch = extractedTeam !== currentTeam && extractedTeam !== '' && currentTeam !== ''

    const extractedPosition = normalizeBasic(extractData.player.position)
    const currentPosition = normalizeBasic(currentPlayerData.position)
    const positionMismatch = extractedPosition !== currentPosition && extractedPosition !== '' && currentPosition !== ''

    const extractedAge = extractData.player.age ? Number(extractData.player.age) : null
    const currentAge = currentPlayerData.age ? Number(currentPlayerData.age) : null
    const ageMismatch = extractedAge !== null && currentAge !== null && extractedAge !== currentAge

    return {
      extractedData: extractData.player,
      nameMismatch,
      teamMismatch,
      positionMismatch,
      ageMismatch,
      hasMismatch: nameMismatch || positionMismatch || ageMismatch
    }
  }

  const handleUploadAndUpdate = async () => {
    if (images.length === 0 || !player) {
      setError(t('selectOneImage'))
      return
    }

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

      const pendingImages = [...images]

      const openConfirmationForIndex = async (index, currentPlayerData) => {
        if (index >= pendingImages.length) {
          setQueueStatus({
            phase: 'idle',
            activeType: null,
            currentIndex: 0,
            total: 0
          })
          setImages([])
          setUploadType(null)
          setConfirmModal(null)
          return
        }

        const img = pendingImages[index]
        setQueueStatus({
          phase: 'extracting',
          activeType: img.type,
          currentIndex: index + 1,
          total: pendingImages.length
        })
        const validation = await extractAndValidateImage(img, currentPlayerData, token)

        setConfirmModal({
          show: true,
          extractedData: validation.extractedData,
          nameMismatch: validation.nameMismatch,
          teamMismatch: validation.teamMismatch,
          positionMismatch: validation.positionMismatch,
          ageMismatch: validation.ageMismatch,
          hasMismatch: validation.hasMismatch,
          uploadType: img.type,
          currentStep: index + 1,
          totalSteps: pendingImages.length,
          onConfirm: async () => {
            setQueueStatus({
              phase: 'saving',
              activeType: img.type,
              currentIndex: index + 1,
              total: pendingImages.length
            })
            const updatedPlayer = await performUpdate(validation.extractedData, img.type, currentPlayerData)
            if (!updatedPlayer) {
              setQueueStatus({
                phase: 'idle',
                activeType: null,
                currentIndex: 0,
                total: 0
              })
              setConfirmModal(null)
              return
            }
            setConfirmModal(null)
            await openConfirmationForIndex(index + 1, updatedPlayer)
          },
          onCancel: () => {
            setQueueStatus({
              phase: 'idle',
              activeType: null,
              currentIndex: 0,
              total: 0
            })
            setImages([])
            setUploadType(null)
            setConfirmModal(null)
          }
        })
        setQueueStatus({
          phase: 'confirming',
          activeType: img.type,
          currentIndex: index + 1,
          total: pendingImages.length
        })
      }

      await openConfirmationForIndex(0, player)
    } catch (err) {
      console.error('[PlayerDetail] Upload error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorUploadingPhoto'), lang)
      setError(message)
      setQueueStatus({
        phase: 'idle',
        activeType: null,
        currentIndex: 0,
        total: 0
      })
    }
  }

  const openManualBoosters = React.useCallback(() => {
    if (!player) return
    const existing = Array.isArray(player.available_boosters) ? player.available_boosters : []
    setManualBoosters(existing.length > 0 ? existing : [{ name: '', effect: '' }])
    setShowManualBoostersModal(true)
  }, [player])

  const saveManualBoosters = React.useCallback(async () => {
    if (!player) return
    setUploading(true)
    setError(null)
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const cleaned = (Array.isArray(manualBoosters) ? manualBoosters : [])
        .map(b => ({
          name: typeof b?.name === 'string' ? b.name.trim() : '',
          effect: typeof b?.effect === 'string' ? b.effect.trim() : '',
        }))
        .filter(b => b.name || b.effect)

      const photoSlots = player.photo_slots && typeof player.photo_slots === 'object' ? { ...player.photo_slots } : {}
      photoSlots.booster = true

      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          available_boosters: cleaned,
          photo_slots: photoSlots
        })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || t('errorUpdatingPlayer'))
      }
      const { player: updatedPlayer } = await res.json()
      setPlayer(updatedPlayer)
      setShowManualBoostersModal(false)
    } catch (err) {
      console.error('[PlayerDetail] Manual boosters save error:', err)
      setError(err.message || t('errorUpdatingPlayer'))
    } finally {
      setUploading(false)
    }
  }, [manualBoosters, player, playerId, t])

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loading')}</div>
      </main>
    )
  }

  if (error && !player) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div className="error" style={{ marginBottom: '24px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
        <button onClick={() => router.push('/gestione-formazione')} className="neon-button">
          <ArrowLeft size={16} />
          {t('back')}
        </button>
      </main>
    )
  }

  if (!player) {
    return null
  }

  const photoSlots = player.photo_slots || {}
  const baseStats = getPlayerDisplayStats(player) || {}
  const skills = player.skills || []
  const comSkills = player.com_skills || []
  const boosters = player.available_boosters || []

  // Fallback: usa dati reali se photo_slots inconsistente (fix conteggio errato)
  const hasStatisticheData = baseStats && Object.keys(baseStats).length > 0
  const hasAbilitaData = skills.length > 0 || comSkills.length > 0
  const hasBoosterData = Array.isArray(boosters) && boosters.length > 0
  const hasCardStatistiche = (photoSlots.card || photoSlots.statistiche) || hasStatisticheData
  const hasAbilitaBooster = (photoSlots.abilita || photoSlots.booster) || hasAbilitaData || hasBoosterData

  // Profilo completo solo quando i dati mostrati ci sono davvero (non dire "Profilo Completo" se statistiche/abilità sono "non disponibili")
  const isProfileComplete = hasStatisticheData && (hasAbilitaData || hasBoosterData)
  const completedSections = [hasCardStatistiche, hasAbilitaData || photoSlots.abilita, hasBoosterData || photoSlots.booster].filter(Boolean).length

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <main style={{ padding: '32px 24px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => router.push('/gestione-formazione')}
          className="neon-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          {t('back')}
        </button>
        <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
          {player.player_name}
        </h1>
        <button
          onClick={() => setShowEditModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', background: 'rgba(0,212,255,0.1)',
            border: '1px solid var(--neon-blue)', borderRadius: '8px',
            color: 'var(--neon-blue)', fontSize: '13px', cursor: 'pointer',
            fontWeight: 600, transition: 'all 0.2s'
          }}
        >
          <Pencil size={14} />
          {lang === 'en' ? 'Edit' : 'Modifica'}
        </button>
        {isProfileComplete && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))',
            border: '2px solid #22c55e',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#22c55e',
            marginLeft: 'auto'
          }}>
            <Award size={18} />
            {t('profileComplete')}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Player Info */}
      <div className="neon-card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {player.position && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('position')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.position}</div>
            </div>
          )}
          {player.overall_rating && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('overallRating')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-blue)' }}>{getPlayerDisplayOverall(player)}</div>
            </div>
          )}
          {player.age && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('age')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.age} {t('years')}</div>
            </div>
          )}
          {(player.club_name || player.team) && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('club')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.club_name || player.team}</div>
            </div>
          )}
          {player.nationality && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('nationality')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.nationality}</div>
            </div>
          )}
          {(() => {
            // v6 dual Playing Style (ATT/DEF): solo con contratto duale reale;
            // le card legacy a stile singolo mantengono la riga precedente.
            const dualStyle = getPlayerPhaseStyleDisplay(player)
            if (!dualStyle) {
              return (playingStyleName || player.role) ? (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('playingStyle')}</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-orange)' }}>{playingStyleName || player.role}</div>
                </div>
              ) : null
            }
            return (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('playingStyle')}</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-orange)' }}>
                  {t('dualStyleAttack')} {dualStyle.attack || '-'} · {t('dualStyleDefense')} {dualStyle.defense || t('noSpecialDefenseStyle')}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      <PlayerDetailUploadPanel
        player={player}
        images={images}
        isUiBusy={isUiBusy}
        queueStatus={queueStatus}
        queueStatusContent={queueStatusContent}
        onFileSelect={handleFileSelect}
        onUpload={handleUploadAndUpdate}
        onOpenManualEdit={() => setShowEditModal(true)}
        onOpenManualBoosters={openManualBoosters}
      />

      {/* Upload Sections */}
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Statistiche */}
        <StatsSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.stats}
          onToggle={() => toggleSection('stats')}
          onFileSelect={(e) => handleFileSelect(e, 'stats')}
          uploading={isUiBusy}
          onEdit={() => setShowEditModal(true)}
        />

        {/* Abilità */}
        <SkillsSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.skills}
          onToggle={() => toggleSection('skills')}
          onFileSelect={(e) => handleFileSelect(e, 'skills')}
          uploading={isUiBusy}
          onEdit={() => setShowEditModal(true)}
        />

        {/* Booster */}
        <BoostersSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.boosters}
          onToggle={() => toggleSection('boosters')}
          onFileSelect={(e) => handleFileSelect(e, 'booster')}
          onManualEdit={openManualBoosters}
          uploading={isUiBusy}
        />
      </div>

      {/* Modal Conferma Aggiornamento */}
      {confirmModal && confirmModal.show && (
        <ConfirmUpdateModal
          currentPlayer={player}
          extractedData={confirmModal.extractedData}
          nameMismatch={confirmModal.nameMismatch}
          teamMismatch={confirmModal.teamMismatch}
          positionMismatch={confirmModal.positionMismatch}
          ageMismatch={confirmModal.ageMismatch}
          hasMismatch={confirmModal.hasMismatch}
          uploadType={confirmModal.uploadType}
          currentStep={confirmModal.currentStep}
          totalSteps={confirmModal.totalSteps}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Modal Modifica/Completa Manualmente */}
      <ManualPlayerModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        existingPlayer={player}
        onSaved={async () => {
          setShowEditModal(false)
          // Ricarica dati giocatore tramite API per supportare custom token
          try {
            let token = localStorage.getItem('auth_token')
            if (!token && supabase) {
              const { data: session } = await supabase.auth.getSession()
              token = session?.session?.access_token
            }
            if (!token) return

            const res = await fetch(`/api/players/${playerId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
              const data = await res.json()
              setPlayer(data.player)
              setPlayingStyleName(data.playingStyleName)
            }
          } catch (e) {
            console.error('Error refreshing player:', e)
          }
        }}
      />

      {showManualBoostersModal && (
        <ManualBoostersModal
          boosters={manualBoosters}
          setBoosters={setManualBoosters}
          onCancel={() => setShowManualBoostersModal(false)}
          onSave={saveManualBoosters}
          saving={uploading}
        />
      )}
    </main>
  )
}

// Stile card unificato (stesso design del modal Upload in gestione-formazione)
const SECTION_CARD_STYLE = (style) => ({
  padding: '24px',
  borderRadius: '12px',
  border: `1px solid ${style.borderColor}`,
  background: style.bgColor
})

// Componente Sezione Statistiche (design unificato: card = Statistiche, colore neon-blue)
function StatsSection({ player, photoSlots, isExpanded, onToggle, onFileSelect, uploading, onEdit }) {
  const { t } = useTranslation()
  const style = getPhotoTypeStyle('card')
  if (!player) return null
  
  const baseStats = getPlayerDisplayStats(player) || {}
  const hasStats = (photoSlots.statistiche || (baseStats && Object.keys(baseStats).length > 0)) && baseStats && Object.keys(baseStats).length > 0

  return (
    <div className="neon-card" style={SECTION_CARD_STYLE(style)}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : 0,
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={24} color={style.color} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: style.color }}>{t('statsSection')}</h2>
          {(photoSlots.statistiche || (baseStats && Object.keys(baseStats).length > 0)) && (
            <CheckCircle2 size={20} color="#22c55e" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <>
          {hasStats ? (
            <div style={{ marginBottom: '16px' }}>
              {/* Attacco */}
              {baseStats.attacking && Object.keys(baseStats.attacking).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-blue)' }}>
                    {t('attacking')}
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.entries(baseStats.attacking).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        className: 'neon-panel',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 212, 255, 0.2)'
                      }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          {t(key) || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Difesa */}
              {baseStats.defending && Object.keys(baseStats.defending).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#ef4444' }}>
                    {t('defending')}
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.entries(baseStats.defending).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          {t(key) || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forza/Fisico */}
              {baseStats.athleticism && Object.keys(baseStats.athleticism).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#f59e0b' }}>
                    {t('athleticism')}
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.entries(baseStats.athleticism).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        background: 'rgba(245, 158, 11, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(245, 158, 11, 0.2)'
                      }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          {t(key) || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              padding: '16px', 
              className: 'neon-panel', 
              borderRadius: '8px', 
              marginBottom: '16px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              {t('statsNotAvailable')}
            </div>
          )}

        </>
      )}
    </div>
  )
}

// Componente Sezione Abilità (design unificato: stats = Abilità, colore neon-purple)
function SkillsSection({ player, photoSlots, isExpanded, onToggle, onFileSelect, uploading, onEdit }) {
  const { t, lang } = useTranslation()
  const style = getPhotoTypeStyle('stats')
  if (!player) return null
  
  const skills = player.skills || []
  const comSkills = player.com_skills || []
  const hasSkills = (photoSlots.abilita || skills.length > 0 || comSkills.length > 0) && (skills.length > 0 || comSkills.length > 0)

  return (
    <div className="neon-card" style={SECTION_CARD_STYLE(style)}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : 0,
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={24} color={style.color} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: style.color }}>{t('skillsSection')}</h2>
          {(photoSlots.abilita || (skills.length > 0 || comSkills.length > 0)) && (
            <CheckCircle2 size={20} color="#22c55e" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <>
          {hasSkills ? (
            <div style={{ marginBottom: '16px' }}>
              {/* Abilità Giocatore */}
              {skills.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-purple)' }}>
                    {t('playerSkills')}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    {skills.map((skill, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--neon-purple)'
                      }}>
                        {getSkillDisplayLabel(skill, lang)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abilità Aggiuntive */}
              {comSkills.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#a855f7' }}>
                    {t('additionalSkills')}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    {comSkills.map((skill, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#a855f7'
                      }}>
                        {getSkillDisplayLabel(skill, lang)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stili di gioco IA (da metadata, estratti da card) */}
              {Array.isArray(player.metadata?.ai_playstyles) && player.metadata.ai_playstyles.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#a855f7' }}>
                    {t('aiPlaystyles')}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {player.metadata.ai_playstyles.map((style, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.9)'
                      }}>
                        {style}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(168, 85, 247, 0.05)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              {t('skillsNotAvailable')}
            </div>
          )}

        </>
      )}
    </div>
  )
}

// Componente Sezione Booster (design unificato: skills = Booster, colore neon-orange)
function BoostersSection({ player, photoSlots, isExpanded, onToggle, onFileSelect, uploading, onManualEdit }) {
  const { t } = useTranslation()
  const style = getPhotoTypeStyle('skills')
  if (!player) return null
  
  const boosters = player.available_boosters || []
  const hasBoosters = (photoSlots.booster || (Array.isArray(boosters) && boosters.length > 0)) && Array.isArray(boosters) && boosters.length > 0

  return (
    <div className="neon-card" style={SECTION_CARD_STYLE(style)}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : 0,
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Gift size={24} color={style.color} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: style.color }}>{t('boostersSection')}</h2>
          {(photoSlots.booster || (Array.isArray(boosters) && boosters.length > 0)) && (
            <CheckCircle2 size={20} color="#22c55e" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <>
          {hasBoosters ? (
            <div style={{ marginBottom: '16px' }}>
              {boosters.map((booster, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  background: 'rgba(255, 107, 53, 0.1)',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    marginBottom: '8px',
                    color: 'var(--neon-orange)'
                  }}>
                    {booster.name || `${t('boostersSection')} ${idx + 1}`}
                  </div>
                  {booster.effect && (
                    <div style={{ fontSize: '14px', marginBottom: '4px', opacity: 0.9 }}>
                      <strong>{t('effect')}:</strong> {booster.effect}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(255, 107, 53, 0.05)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              {t('boostersNotAvailable')}
            </div>
          )}

        </>
      )}
    </div>
  )
}

function PlayerDetailUploadPanel({
  player,
  images,
  isUiBusy,
  queueStatus,
  queueStatusContent,
  onFileSelect,
  onUpload,
  onOpenManualEdit,
  onOpenManualBoosters
}) {
  const { t, lang } = useTranslation()
  const imageTypes = [
    {
      key: 'stats',
      label: t('photoStats'),
      description: t('photoStatsDesc'),
      Icon: BarChart3,
      required: true,
      ...getPhotoTypeStyle('card')
    },
    {
      key: 'skills',
      label: t('photoSkills'),
      description: t('photoSkillsDesc'),
      Icon: Zap,
      required: true,
      ...getPhotoTypeStyle('stats')
    },
    {
      key: 'booster',
      label: t('photoBooster'),
      description: t('photoBoosterDesc'),
      Icon: Gift,
      required: false,
      ...getPhotoTypeStyle('skills')
    }
  ]

  const getImageForType = (type) => images.find(img => img.type === type)
  const hasExistingSection = (type) => {
    const photoSlots = player?.photo_slots || {}
    if (type === 'stats') {
      return Boolean(photoSlots.statistiche) || Boolean(player?.base_stats && Object.keys(player.base_stats).length > 0)
    }
    if (type === 'skills') {
      return Boolean(photoSlots.abilita) || Boolean((player?.skills || []).length > 0 || (player?.com_skills || []).length > 0)
    }
    if (type === 'booster') {
      return Boolean(photoSlots.booster) || Boolean(Array.isArray(player?.available_boosters) && player.available_boosters.length > 0)
    }
    return false
  }

  const selectedCount = images.length

  return (
    <div className="neon-card" style={{
      marginBottom: '24px',
      padding: 'clamp(16px, 4vw, 24px)',
      background: 'rgba(10, 14, 39, 0.95)',
      border: '2px solid rgba(0, 212, 255, 0.55)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 700, margin: 0 }}>
            {lang === 'en' ? 'Update Player Photos' : 'Aggiorna Foto Giocatore'}
          </h2>
          <div style={{ fontSize: '14px', opacity: 0.82, marginTop: '8px', lineHeight: 1.5 }}>
            {lang === 'en'
              ? 'Use the same guided flow as the first upload: choose the sections to update, then save once.'
              : 'Usa lo stesso flusso guidato del primo caricamento: scegli le sezioni da aggiornare, poi salva una sola volta.'}
          </div>
        </div>
        {typeof onOpenManualEdit === 'function' && (
          <button
            type="button"
            onClick={() => { if (!isUiBusy) onOpenManualEdit() }}
            disabled={isUiBusy}
            className="neon-button"
            style={{
              padding: '10px 14px',
              borderColor: 'var(--neon-blue)',
              color: 'var(--neon-blue)',
              background: 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '44px',
              opacity: isUiBusy ? 0.6 : 1
            }}
          >
            <Pencil size={16} />
            {lang === 'en' ? 'Edit player data' : 'Modifica dati giocatore'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
        {imageTypes.map((type, idx) => {
          const image = getImageForType(type.key)
          const isComplete = !!image
          return (
            <div key={type.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isComplete ? type.color : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: isComplete ? '#000' : 'rgba(255,255,255,0.5)',
                border: `2px solid ${isComplete ? type.color : 'rgba(255,255,255,0.2)'}`,
                transition: 'all 0.3s ease'
              }}>
                {isComplete ? '✓' : idx + 1}
              </div>
              {idx < imageTypes.length - 1 && (
                <div style={{
                  width: '40px',
                  height: '2px',
                  background: isComplete ? type.color : 'rgba(255,255,255,0.1)'
                }} />
              )}
            </div>
          )
        })}
      </div>

      {queueStatusContent && (
        <div style={{
          marginBottom: '20px',
          padding: '14px 16px',
          borderRadius: '12px',
          border: `1px solid ${
            queueStatusContent.tone === 'warning'
              ? 'rgba(245, 158, 11, 0.35)'
              : queueStatusContent.tone === 'success'
              ? 'rgba(34, 197, 94, 0.35)'
              : queueStatusContent.tone === 'info'
              ? 'rgba(0, 212, 255, 0.35)'
              : 'rgba(255,255,255,0.12)'
          }`,
          background: `${
            queueStatusContent.tone === 'warning'
              ? 'rgba(245, 158, 11, 0.10)'
              : queueStatusContent.tone === 'success'
              ? 'rgba(34, 197, 94, 0.10)'
              : queueStatusContent.tone === 'info'
              ? 'rgba(0, 212, 255, 0.10)'
              : 'rgba(255,255,255,0.04)'
          }`
        }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 700,
            marginBottom: '4px',
            color:
              queueStatusContent.tone === 'warning'
                ? '#fbbf24'
                : queueStatusContent.tone === 'success'
                ? '#86efac'
                : queueStatusContent.tone === 'info'
                ? '#7dd3fc'
                : '#fff'
          }}>
            {queueStatusContent.title}
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.45, opacity: 0.82 }}>
            {queueStatusContent.description}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {imageTypes.map(({ key, label, description, color, bgColor, borderColor, required, Icon }) => {
          const image = getImageForType(key)
          const alreadyPresent = hasExistingSection(key)
          const isActive = queueStatus.activeType === key && queueStatus.phase !== 'idle'
          return (
            <div key={key} style={{
              padding: '16px',
              background: image ? bgColor : 'rgba(0, 212, 255, 0.05)',
              border: `1px solid ${image ? borderColor : 'rgba(0, 212, 255, 0.2)'}`,
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}>
              {image ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={24} color={color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '16px', fontWeight: 700, color }}>{label}</span>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      background: isActive ? 'rgba(0, 212, 255, 0.18)' : 'rgba(34, 197, 94, 0.18)',
                      color: isActive ? '#7dd3fc' : '#86efac',
                      borderRadius: '999px',
                      fontWeight: 700
                    }}>
                      {isActive
                        ? (queueStatus.phase === 'confirming'
                          ? (lang === 'en' ? 'Confirm now' : 'Conferma ora')
                          : queueStatus.phase === 'saving'
                          ? (lang === 'en' ? 'Saving' : 'Salvataggio')
                          : (lang === 'en' ? 'Analyzing' : 'In analisi'))
                        : (lang === 'en' ? 'Ready' : 'Pronta')}
                    </div>
                  </div>
                  <img
                    src={image.dataUrl}
                    alt={label}
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', opacity: 0.8 }}>{t('uploadedPhotoLabel')}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', background: color, color: '#000', borderRadius: '4px', fontWeight: 700 }}>
                      ✓
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={22} color={color} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color }}>
                          {label}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>{description}</div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '999px',
                      color: alreadyPresent ? '#86efac' : (required ? '#fca5a5' : color),
                      background: alreadyPresent ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255,255,255,0.08)'
                    }}>
                      {alreadyPresent
                        ? (lang === 'en' ? 'Already present' : 'Gia presente')
                        : required
                        ? (lang === 'en' ? 'Required' : 'Obbligatoria')
                        : (lang === 'en' ? 'Optional' : 'Opzionale')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{
                      flex: '1 1 150px',
                      minHeight: '48px',
                      borderRadius: '10px',
                      border: `2px solid ${borderColor}`,
                      background: bgColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: isUiBusy ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 700,
                      color,
                      opacity: isUiBusy ? 0.6 : 1
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onFileSelect(e, key)}
                        style={{ display: 'none' }}
                        disabled={isUiBusy}
                      />
                      <Upload size={16} color={color} />
                      {t('upload')}
                    </label>
                    <label style={{
                      flex: '1 1 150px',
                      minHeight: '48px',
                      borderRadius: '10px',
                      border: `2px solid ${borderColor}`,
                      background: 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: isUiBusy ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 700,
                      color,
                      opacity: isUiBusy ? 0.6 : 1
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => onFileSelect(e, key)}
                        style={{ display: 'none' }}
                        disabled={isUiBusy}
                      />
                      <Camera size={16} color={color} />
                      {t('cameraCaptureTitle')}
                    </label>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingTop: '20px'
      }}>
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {typeof onOpenManualBoosters === 'function' && (
            <button
              type="button"
              onClick={() => { if (!isUiBusy) onOpenManualBoosters() }}
              disabled={isUiBusy}
              className="neon-button"
              style={{
                padding: '8px 14px',
                borderColor: 'var(--neon-orange)',
                color: 'var(--neon-orange)',
                background: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                opacity: isUiBusy ? 0.6 : 1
              }}
            >
              <Pencil size={14} />
              {lang === 'en' ? 'Manual booster' : 'Booster manuale'}
            </button>
          )}
          <span style={{ fontSize: '13px', opacity: 0.7 }}>
            {selectedCount === 0 ? (
              t('noPhotosSelected')
            ) : (
              <span style={{ color: 'var(--neon-green)' }}>
                {selectedCount} {selectedCount === 1 ? t('photoSelected') : t('photosSelected')}
              </span>
            )}
          </span>
        </div>
        {selectedCount > 0 && (
          <button
            onClick={onUpload}
            className="btn primary"
            disabled={isUiBusy}
            style={{
              minHeight: '48px',
              padding: '12px 24px',
              opacity: isUiBusy ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {queueStatus.phase === 'extracting' ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {lang === 'en'
                  ? `Analyzing ${queueStatus.currentIndex}/${queueStatus.total}`
                  : `Analisi ${queueStatus.currentIndex}/${queueStatus.total}`}
              </>
            ) : queueStatus.phase === 'confirming' ? (
              <>
                <AlertCircle size={18} />
                {lang === 'en'
                  ? `Waiting confirmation ${queueStatus.currentIndex}/${queueStatus.total}`
                  : `In attesa di conferma ${queueStatus.currentIndex}/${queueStatus.total}`}
              </>
            ) : queueStatus.phase === 'saving' || isUiBusy ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {lang === 'en'
                  ? `Saving ${queueStatus.currentIndex || 1}/${queueStatus.total || selectedCount}`
                  : `Salvataggio ${queueStatus.currentIndex || 1}/${queueStatus.total || selectedCount}`}
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                {selectedCount > 1
                  ? (lang === 'en' ? `Save and update ${selectedCount} photos` : `Salva e aggiorna ${selectedCount} foto`)
                  : t('saveAndUpdate')}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Componente Modal Conferma
function ConfirmUpdateModal({ 
  currentPlayer, 
  extractedData, 
  nameMismatch, 
  teamMismatch, 
  positionMismatch,
  ageMismatch,
  hasMismatch,
  uploadType,
  currentStep,
  totalSteps,
  onConfirm, 
  onCancel 
}) {
  const { t, lang } = useTranslation()
  const uploadTypeLabels = {
    stats: t('statsSection'),
    skills: t('skillsSection'),
    booster: t('boostersSection')
  }
  const teamIsSoftWarning = Boolean(teamMismatch) && !hasMismatch

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'max(12px, env(safe-area-inset-top, 0px)) 12px max(12px, env(safe-area-inset-bottom, 0px))'
      }}
      onClick={onCancel}
    >
      <div 
        className="neon-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: 'calc(100vh - 24px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          overflowY: 'auto',
          padding: 'clamp(16px, 4vw, 24px)',
          paddingBottom: 'calc(16px + 72px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(10, 14, 39, 0.95)',
          border: `2px solid ${hasMismatch ? '#ef4444' : 'var(--neon-blue)'}`,
          borderRadius: '16px',
          marginTop: 'auto',
          marginBottom: 'auto',
          position: 'relative'
        }}
      >
        <h2 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 700, marginBottom: '16px', marginTop: 0, lineHeight: 1.2 }}>
          {t('confirmUpdate')} {uploadTypeLabels[uploadType] || ''}
        </h2>
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          borderRadius: '10px',
          background: 'rgba(0, 212, 255, 0.10)',
          border: '1px solid rgba(0, 212, 255, 0.24)',
          fontSize: '13px',
          lineHeight: 1.45,
          color: '#7dd3fc'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>
            {lang === 'en'
              ? `Step ${currentStep || 1} of ${totalSteps || 1}`
              : `Passaggio ${currentStep || 1} di ${totalSteps || 1}`}
          </div>
          <div style={{ opacity: 0.9 }}>
            {lang === 'en'
              ? 'Confirm this update to continue with the next queued photo.'
              : 'Conferma questo aggiornamento per continuare con la foto successiva in coda.'}
          </div>
        </div>

        {/* Confronto Dati */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(0, 212, 255, 0.1)', 
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{t('currentPlayerInfo')}:</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              <div><strong>{t('name')}:</strong> {currentPlayer.player_name || t('nA')}</div>
              {currentPlayer.team && <div><strong>{t('team')}:</strong> {currentPlayer.team}</div>}
              {currentPlayer.position && <div><strong>{t('role')}:</strong> {currentPlayer.position}</div>}
              {currentPlayer.age && <div><strong>{t('age')}:</strong> {currentPlayer.age}</div>}
            </div>
          </div>

          <div style={{ 
            padding: '12px', 
            background: hasMismatch ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
            borderRadius: '8px',
            border: `1px solid ${hasMismatch ? '#ef4444' : '#22c55e'}`
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>{t('extractedDataFromPhoto')}:</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              <div style={{ color: nameMismatch ? '#ef4444' : 'inherit' }}>
                <strong>{t('name')}:</strong> {extractedData.player_name || 'N/A'}
                {nameMismatch && ' ⚠️'}
              </div>
              {extractedData.team && (
                <div style={{ color: teamMismatch ? (teamIsSoftWarning ? '#f59e0b' : '#ef4444') : 'inherit' }}>
                  <strong>{t('team')}:</strong> {extractedData.team}
                  {teamMismatch && (teamIsSoftWarning ? ' ⚠️' : ' ⚠️')}
                </div>
              )}
              {extractedData.position && (
                <div style={{ color: positionMismatch ? '#ef4444' : 'inherit' }}>
                  <strong>{t('role')}:</strong> {extractedData.position}
                  {positionMismatch && ' ⚠️'}
                </div>
              )}
              {extractedData.age && (
                <div style={{ color: ageMismatch ? '#ef4444' : 'inherit' }}>
                  <strong>{t('age')}:</strong> {extractedData.age}
                  {ageMismatch && ' ⚠️'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Warning se mismatch */}
        {(hasMismatch || teamIsSoftWarning) && (
          <div style={{ 
            padding: '12px', 
            background: hasMismatch ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.18)',
            border: `1px solid ${hasMismatch ? '#ef4444' : '#f59e0b'}`,
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: hasMismatch ? '#ef4444' : '#f59e0b' }}>
              ⚠️ {hasMismatch ? t('dataMismatch') : t('teamDifferent')}
            </div>
            <div style={{ opacity: 0.9 }}>
              {nameMismatch && <div>• {t('nameDifferent')}</div>}
              {teamMismatch && <div>• {t('teamDifferent')}</div>}
              {positionMismatch && <div>• {t('positionDifferent')}</div>}
              {ageMismatch && <div>• {t('ageDifferent')}</div>}
              <div style={{ marginTop: '8px' }}>
                {t('ensureSamePlayer')}
              </div>
            </div>
          </div>
        )}

        {/* Bottoni */}
        <div style={{
          position: 'sticky',
          bottom: 'calc(-1 * (16px + env(safe-area-inset-bottom, 0px)))',
          marginLeft: 'calc(-1 * clamp(16px, 4vw, 24px))',
          marginRight: 'calc(-1 * clamp(16px, 4vw, 24px))',
          marginBottom: 'calc(-1 * clamp(16px, 4vw, 24px))',
          padding: '12px clamp(16px, 4vw, 24px) calc(12px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          gap: '12px',
          justifyContent: 'stretch',
          flexWrap: 'wrap',
          background: 'rgba(10, 14, 39, 0.98)',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <button 
            onClick={onCancel} 
            className="neon-button"
            style={{
              flex: '1 1 160px',
              minHeight: '48px',
              padding: '12px 16px',
              justifyContent: 'center'
            }}
          >
            {t('cancel')}
          </button>
          <button 
            onClick={onConfirm} 
            className="btn primary"
            style={{ 
              flex: '1 1 160px',
              minHeight: '48px',
              padding: '12px 16px',
              background: hasMismatch ? '#ef4444' : 'var(--neon-blue)',
              borderColor: hasMismatch ? '#ef4444' : 'var(--neon-blue)',
              justifyContent: 'center'
            }}
          >
            {hasMismatch ? t('confirmAnyway') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
