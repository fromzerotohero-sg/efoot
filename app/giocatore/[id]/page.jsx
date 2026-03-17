'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { Upload, AlertCircle, CheckCircle2, RefreshCw, BarChart3, Zap, Gift, ChevronDown, ChevronUp, Award, Pencil, ArrowLeft } from 'lucide-react'
import { getPhotoTypeStyle } from '@/lib/playerPhotoTypes'
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/uploadConstants'
import ManualPlayerModal from '@/components/ManualPlayerModal'
import ManualBoostersModal from '@/components/ManualBoostersModal'

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
  const [expandedSections, setExpandedSections] = React.useState({
    stats: true,
    skills: true,
    boosters: true
  })

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

  const processImageFile = (file, type) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(t('imageTooLarge'))
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImages([{
        file,
        dataUrl: e.target.result,
        name: file.name || 'camera.jpg',
        type
      }])
      setUploadType(type)
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e, type) => {
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
    processImageFile(imageFiles[0], type)
    e.target.value = ''
  }

  // Funzione per aggiornare il giocatore con i dati estratti
  const performUpdate = async (extractedPlayerData, type) => {
    if (!player) {
      setError(t('playerNotFound'))
      return
    }
    
    setUploading(true)
    setError(null)

    try {
      const updateData = {}
      const photoSlots = player.photo_slots || {}

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
            ...(player.metadata && typeof player.metadata === 'object' ? player.metadata : {}),
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
      setImages([])
      setUploadType(null)
      
      // Success message
      setTimeout(() => {
        setError(null)
      }, 3000)
    } catch (err) {
      console.error('[PlayerDetail] Update error:', err)
      setError(err.message || t('errorUpdatingPlayer'))
    } finally {
      setUploading(false)
    }
  }

  const handleUploadAndUpdate = async () => {
    if (images.length === 0 || !uploadType || !player) {
      setError(t('selectOneImage'))
      return
    }

    setUploading(true)
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

      const img = images[0]

      // 1. Estrai dati dall'immagine
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

      // 2. VALIDAZIONE: Confronta nome + squadra + ruolo (o età)
      const normalizeBasic = (value) => {
        if (!value) return ''
        return String(value).toLowerCase().trim().replace(/\s+/g, ' ')
      }

      // Normalizzazione "robusta" per confronti soft (es. squadre: "Chelsea B12-13" vs "Chelsea B 12-13")
      const normalizeTeamKey = (value) => {
        const s = normalizeBasic(value)
        if (!s) return ''
        return s
          // uniforma trattini e separatori comuni
          .replace(/[–—]/g, '-')
          // elimina caratteri non informativi mantenendo lettere/numeri e '-'
          .replace(/[^a-z0-9\- ]/g, ' ')
          // collassa spazi
          .replace(/\s+/g, ' ')
          // "b 12-13" -> "b12-13"
          .replace(/\bb\s+(?=\d)/g, 'b')
          // rimuove spazi attorno ai trattini: "12 - 13" -> "12-13"
          .replace(/\s*-\s*/g, '-')
          .trim()
      }

      const extractedName = normalizeBasic(extractData.player.player_name)
      const currentName = normalizeBasic(player.player_name)
      const nameMismatch = extractedName !== currentName

      const extractedTeam = normalizeTeamKey(extractData.player.team)
      const currentTeam = normalizeTeamKey(player.team)
      const teamMismatch = extractedTeam !== currentTeam && extractedTeam !== '' && currentTeam !== ''

      const extractedPosition = normalizeBasic(extractData.player.position)
      const currentPosition = normalizeBasic(player.position)
      const positionMismatch = extractedPosition !== currentPosition && extractedPosition !== '' && currentPosition !== ''

      // Fallback: confronta età se ruolo non disponibile
      const extractedAge = extractData.player.age ? Number(extractData.player.age) : null
      const currentAge = player.age ? Number(player.age) : null
      const ageMismatch = extractedAge !== null && currentAge !== null && extractedAge !== currentAge

      // Policy: la "squadra" è un warning soft (non blocca/non diventa mismatch critico)
      const hasMismatch = nameMismatch || positionMismatch || ageMismatch

      // 3. Mostra modal conferma SEMPRE
      setConfirmModal({
        show: true,
        extractedData: extractData.player,
        nameMismatch,
        teamMismatch,
        positionMismatch,
        ageMismatch,
        hasMismatch,
        uploadType,
        onConfirm: async () => {
          await performUpdate(extractData.player, uploadType)
          setConfirmModal(null)
        },
        onCancel: () => {
          setImages([])
          setUploadType(null)
          setConfirmModal(null)
        }
      })
      setUploading(false)
    } catch (err) {
      console.error('[PlayerDetail] Upload error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorUploadingPhoto'), lang)
      setError(message)
      setUploading(false)
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
  const baseStats = player.base_stats || {}
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
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-blue)' }}>{player.overall_rating}</div>
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
          {(playingStyleName || player.role) && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('playingStyle')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-orange)' }}>{playingStyleName || player.role}</div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Sections */}
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Statistiche */}
        <StatsSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.stats}
          onToggle={() => toggleSection('stats')}
          onFileSelect={(e) => handleFileSelect(e, 'stats')}
          uploading={uploading}
          onEdit={() => setShowEditModal(true)}
        />

        {/* Abilità */}
        <SkillsSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.skills}
          onToggle={() => toggleSection('skills')}
          onFileSelect={(e) => handleFileSelect(e, 'skills')}
          uploading={uploading}
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
          uploading={uploading}
        />
      </div>

      {/* Errore in-context quando c'è upload in corso */}
      {error && images.length > 0 && (
        <div
          role="alert"
          style={{
            marginTop: '24px',
            marginBottom: '0',
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
      {/* Upload Button */}
      {images.length > 0 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleUploadAndUpdate}
            disabled={uploading}
            className="btn primary"
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? (
              <>
                <RefreshCw size={20} style={{ animation: 'spin 0.6s linear infinite' }} />
                {t('loading')}
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                {t('saveAndUpdate')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Preview Image */}
      {images.length > 0 && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <img
            src={images[0].dataUrl}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          />
        </div>
      )}

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
  const { t, lang } = useTranslation()
  const style = getPhotoTypeStyle('card')
  if (!player) return null
  
  const baseStats = player.base_stats || {}
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

          {/* Pulsante Carica (galleria / fotocamera / file via picker di sistema) */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' }}>
            <label style={{
              flex: '1',
              minWidth: '120px',
              padding: '12px 16px',
              border: `2px solid ${style.borderColor}`,
              borderRadius: '8px',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              background: style.bgColor,
              opacity: uploading ? 0.6 : 1
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={onFileSelect}
                style={{ display: 'none' }}
                disabled={uploading}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Upload size={18} color={style.color} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: style.color }}>
                  {photoSlots.statistiche ? t('updateStats') : t('uploadStats')}
                </span>
              </div>
            </label>
            {typeof onEdit === 'function' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onEdit() }}
                style={{
                  padding: '12px 16px',
                  border: '2px solid var(--neon-blue)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--neon-blue)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Pencil size={18} />
                {lang === 'en' ? 'Edit' : 'Modifica'}
              </button>
            )}
          </div>
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
                        {skill}
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
                        {skill}
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

          {/* Pulsante Carica (galleria / fotocamera / file) + Modifica */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' }}>
            <label style={{
              flex: '1',
              minWidth: '120px',
              padding: '12px 16px',
              border: `2px solid ${style.borderColor}`,
              borderRadius: '8px',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              background: style.bgColor,
              opacity: uploading ? 0.6 : 1
            }}>
              <input type="file" accept="image/*" onChange={onFileSelect} style={{ display: 'none' }} disabled={uploading} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Upload size={18} color={style.color} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: style.color }}>{photoSlots.abilita ? t('updateSkills') : t('uploadSkills')}</span>
              </div>
            </label>
            {typeof onEdit === 'function' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onEdit() }}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${style.borderColor}`,
                  borderRadius: '8px',
                  background: 'transparent',
                  color: style.color,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Pencil size={18} />
                {lang === 'en' ? 'Edit' : 'Modifica'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Componente Sezione Booster (design unificato: skills = Booster, colore neon-orange)
function BoostersSection({ player, photoSlots, isExpanded, onToggle, onFileSelect, uploading, onManualEdit }) {
  const { t, lang } = useTranslation()
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

          {/* Pulsante Carica (galleria / fotocamera / file via picker di sistema) */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <label style={{
              padding: '12px 16px',
              border: `2px solid ${style.borderColor}`,
              borderRadius: '8px',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              background: style.bgColor,
              opacity: uploading ? 0.6 : 1
            }}>
              <input type="file" accept="image/*" onChange={onFileSelect} style={{ display: 'none' }} disabled={uploading} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Upload size={18} color={style.color} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: style.color }}>{photoSlots.booster ? t('updateBoosters') : t('uploadBoosters')}</span>
              </div>
            </label>
            {typeof onManualEdit === 'function' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onManualEdit() }}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${style.borderColor}`,
                  borderRadius: '8px',
                  background: 'transparent',
                  color: style.color,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                disabled={uploading}
              >
                <Pencil size={18} />
                {lang === 'en' ? 'Manual' : 'Manuale'}
              </button>
            )}
          </div>
        </>
      )}
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
  onConfirm, 
  onCancel 
}) {
  const { t } = useTranslation()
  const uploadTypeLabels = {
    stats: t('stats'),
    skills: t('skills'),
    booster: t('boosters')
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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px'
      }}
      onClick={onCancel}
    >
      <div 
        className="neon-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          background: 'rgba(10, 14, 39, 0.95)',
          border: `2px solid ${hasMismatch ? '#ef4444' : 'var(--neon-blue)'}`
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', marginTop: 0 }}>
          {t('confirmUpdate')} {uploadTypeLabels[uploadType] || ''}
        </h2>

        {/* Confronto Dati */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(0, 212, 255, 0.1)', 
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{t('currentPlayer')}:</div>
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
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{t('extractedData')}:</div>
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
            marginBottom: '20px',
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
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onCancel} 
            className="neon-button"
            style={{ padding: '10px 20px' }}
          >
            {t('cancel')}
          </button>
          <button 
            onClick={onConfirm} 
            className="btn primary"
            style={{ 
              padding: '10px 20px',
              background: hasMismatch ? '#ef4444' : 'var(--neon-blue)',
              borderColor: hasMismatch ? '#ef4444' : 'var(--neon-blue)'
            }}
          >
            {hasMismatch ? t('confirmAnyway') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
