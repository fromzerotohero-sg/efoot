'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import ConfirmModal from '@/components/ConfirmModal'
import { ArrowLeft, Upload, Camera, AlertCircle, CheckCircle2, X, Trash2, Star, Info, Plus, Zap } from 'lucide-react'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'

export default function AllenatoriPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [coaches, setCoaches] = React.useState([])
  const [activeCoach, setActiveCoach] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [showUploadModal, setShowUploadModal] = React.useState(false)
  const [uploadImages, setUploadImages] = React.useState([]) // Array per 2 foto
  const [uploading, setUploading] = React.useState(false)
  const [selectedCoach, setSelectedCoach] = React.useState(null)
  const [showDetailsModal, setShowDetailsModal] = React.useState(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = React.useState(null) // { show, coachId, coachName }

  // Carica allenatori
  React.useEffect(() => {
    const fetchCoaches = async () => {
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
        const res = await fetch('/api/coaches', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (!res.ok) {
          if (res.status === 401) {
             localStorage.removeItem('auth_token')
             router.push('/login')
             return
          }
          throw new Error(t('coachLoadError'))
        }
        
        const coachesData = await res.json()

        setCoaches(coachesData || [])
        const active = (coachesData || []).find(c => c.is_active)
        setActiveCoach(active || null)
      } catch (err) {
        console.error('[Allenatori] Fetch error:', err)
        setError(err.message || t('coachDataLoadError'))
      } finally {
        setLoading(false)
      }
    }

    fetchCoaches()
  }, [router])

  const handleImageSelect = async (files) => {
    const fileArray = Array.from(files || [])
    if (fileArray.length === 0) return

    const validFiles = fileArray.filter(f => f.type.startsWith('image/'))
    if (validFiles.length === 0) {
      setError(t('selectImageFile'))
      return
    }

    // Max 2 foto
    if (uploadImages.length + validFiles.length > 2) {
      setError(t('maxTwoPhotos'))
      return
    }

    setError(null)
    const preparedImages = []

    for (const file of validFiles) {
      try {
        const optimized = await optimizeImageFile(file)
        preparedImages.push({
          id: Date.now() + preparedImages.length,
          file,
          dataUrl: optimized.dataUrl,
          type: (uploadImages.length + preparedImages.length) === 0 ? 'main' : 'connection'
        })
      } catch (err) {
        console.error('[Allenatori] image optimization error:', err)
        setError(getImageOptimizeUserMessage(err, t))
        return
      }
    }

    if (preparedImages.length > 0) {
      setUploadImages(prev => [...prev, ...preparedImages].slice(0, 2))
    }
  }

  const handleFileInputChange = async (e) => {
    await handleImageSelect(e.target.files)
    // Reset input per permettere di selezionare lo stesso file di nuovo
    e.target.value = ''
  }

  const handleCameraInputChange = async (e) => {
    await handleImageSelect(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleImageSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const removeImage = (id) => {
    setUploadImages(prev => prev.filter(img => img.id !== id))
  }

  const handleUploadCoach = async () => {
    if (uploadImages.length === 0) return

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

      // Estrai dati da tutte le immagini (max 2)
      let coachData = null
      let allExtractedData = {}
      const photoSlots = {}
      const errors = []

      for (const img of uploadImages) {
        const extractRes = await fetch('/api/extract-coach', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept-Language': lang === 'en' ? 'en' : 'it'
          },
          body: JSON.stringify({ imageDataUrl: img.dataUrl })
        })

        const extractData = await extractRes.json()
        if (!extractRes.ok) {
          const { message } = mapErrorToUserMessage(extractData?.error || '', t('unknownError'), lang)
          console.warn('[UploadCoach] Errore estrazione:', message)
          errors.push(message)
          continue
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

        if (extractData.coach) {
          // Prima immagine = dati base
          if (!coachData) {
            coachData = extractData.coach
            photoSlots.main = true
          } else {
            // Seconda immagine = merge dati (specialmente connection)
            coachData = {
              ...coachData,
              ...extractData.coach,
              // Mantieni connection dalla seconda foto se presente
              connection: extractData.coach.connection || coachData.connection,
              // Merge competenze (mantieni valori più alti)
              playing_style_competence: {
                ...coachData.playing_style_competence,
                ...extractData.coach.playing_style_competence
              },
              // Merge booster
              stat_boosters: [
                ...(coachData.stat_boosters || []),
                ...(extractData.coach.stat_boosters || [])
              ]
            }
            photoSlots.connection = true
          }
          allExtractedData[img.type] = extractData.coach
        }
      }

      // Verifica che almeno la prima foto abbia estratto dati
      if (!coachData || !coachData.coach_name) {
        if (errors.length > 0) {
          const quotaError = errors.find(e => e.includes('quota') || e.includes('billing'))
          if (quotaError) {
            throw new Error(t('openAQuotaError'))
          }
          throw new Error(`${t('coachExtractError')}: ${errors[0]}`)
        }
        throw new Error(t('coachExtractError'))
      }

      // Salva allenatore con photo_slots tracciato
      const finalCoachData = {
        ...coachData,
        photo_slots: photoSlots
      }

      const saveRes = await fetch('/api/supabase/save-coach', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ coach: finalCoachData })
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveData.error || t('coachSaveError'))
      }

      // Aggiorna riassunto analisi (diagnostic) per la chat prima del reload
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare UI */ }

      // Ricarica lista e torna in cima
      window.scrollTo(0, 0)
      window.location.reload()
    } catch (err) {
      console.error('[Allenatori] Upload error:', err)
      setError(err.message || t('coachUploadError'))
    } finally {
      setUploading(false)
    }
  }

  const handleSetActive = async (coachId) => {
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

      const res = await fetch('/api/supabase/set-active-coach', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ coach_id: coachId })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t('coachSetActiveError'))
      }

      // Aggiorna riassunto analisi (diagnostic) per la chat prima del reload
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare UI */ }

      // Ricarica lista
      window.location.reload()
    } catch (err) {
      console.error('[Allenatori] Set active error:', err)
      setError(err.message || t('coachSetActiveError'))
    }
  }

  const handleDelete = async (coachId) => {
    // Trova nome allenatore per messaggio
    const coach = coaches.find(c => c.id === coachId)
    const coachName = coach?.coach_name || t('thisCoach')
    
    // Mostra modal conferma invece di window.confirm()
    setDeleteConfirmModal({
      show: true,
      coachId,
      coachName,
      onConfirm: async () => {
        setDeleteConfirmModal(null)
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

          // Use API route instead of direct supabase delete to support custom token
          // Since we don't have a direct /api/supabase/delete-coach route, we might need to create one or use RLS.
          // Wait, we can use supabase client if RLS is set, but with custom token we need API.
          // Let's create an API route for deleting coaches: /api/coaches with DELETE method.
          
          const res = await fetch(`/api/coaches?id=${coachId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (!res.ok) {
             const data = await res.json().catch(() => ({}))
             throw new Error(data.error || t('coachDeleteError'))
          }

          // Aggiorna riassunto analisi (diagnostic) per la chat prima del reload
          try {
            await fetch('/api/refresh-diagnostic', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            })
          } catch (_) { /* non bloccare UI */ }

          // Ricarica lista e torna in cima
          window.scrollTo(0, 0)
          window.location.reload()
        } catch (err) {
          console.error('[Allenatori] Delete error:', err)
          setError(err.message || t('coachDeleteError'))
        }
      },
      onCancel: () => {
        setDeleteConfirmModal(null)
      }
    })
  }

  const showCoachDetails = (coach) => {
    setSelectedCoach(coach)
    setShowDetailsModal(true)
  }

  return (
    <div data-tour-id="tour-coaches-intro" style={{ minHeight: '100vh', padding: 'clamp(16px, 3vw, 32px)', background: 'var(--bg-dark)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => router.push('/')}
            className="neon-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} />
            {t('dashboard')}
          </button>
          <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
            {t('coachesTitle')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <button
              data-tour-id="tour-coaches-upload"
              onClick={() => setShowUploadModal(true)}
              className="btn primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              {t('uploadCoach')}
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

        {/* Loading */}
        {loading && (
          <div className="neon-card" style={{ padding: '48px', textAlign: 'center' }}>
            <div className="neon-text">{t('loading')}</div>
          </div>
        )}

        {/* Lista Allenatori */}
        {!loading && (
          <>
            {coaches.length === 0 ? (
              <div data-tour-id="tour-coaches-list" className="neon-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Info size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--neon-blue)' }} />
                <div style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600 }}>
                  {t('noCoachesLoaded')}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
                  {t('uploadCoachDescription')}
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Upload size={16} />
                  {t('uploadFirstCoach')}
                </button>
              </div>
            ) : (
              <div data-tour-id="tour-coaches-list" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '24px'
              }}>
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="neon-card"
                    style={{
                      padding: '20px',
                      border: coach.is_active ? '2px solid var(--neon-blue)' : '2px solid rgba(0, 212, 255, 0.3)',
                      position: 'relative'
                    }}
                  >
                    {coach.is_active && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'var(--neon-blue)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Star size={18} fill="white" color="white" />
                      </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, marginBottom: '8px' }}>
                        {coach.coach_name}
                      </h3>
                      {coach.team && (
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>
                          {coach.team}
                        </div>
                      )}
                    </div>

                    {coach.playing_style_competence && typeof coach.playing_style_competence === 'object' && (
                      <div style={{ marginBottom: '12px', fontSize: '12px', opacity: 0.7 }}>
                        {Object.entries(coach.playing_style_competence).slice(0, 2).map(([style, value]) => (
                          <div key={style} style={{ marginBottom: '4px' }}>
                            {t(style) || style.replace(/_/g, ' ')}: {typeof value === 'object' ? '' : value}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => showCoachDetails(coach)}
                        className="neon-button"
                        style={{ fontSize: '12px', padding: '6px 12px', flex: 1 }}
                      >
                        <Info size={14} style={{ marginRight: '4px' }} />
                        {t('viewCoachDetails')}
                      </button>
                      {!coach.is_active && (
                        <button
                          onClick={() => handleSetActive(coach.id)}
                          className="neon-button"
                          style={{ fontSize: '12px', padding: '6px 12px', flex: 1 }}
                        >
                          <Star size={14} style={{ marginRight: '4px' }} />
                          {t('setAsTitular')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(coach.id)}
                        className="neon-button"
                        style={{ 
                          fontSize: '12px', 
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          color: 'rgba(239, 68, 68, 1)'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info allenatore attivo */}
            {activeCoach && (
              <div className="neon-card" style={{ 
                padding: '16px', 
                className: 'neon-panel',
                border: '2px solid var(--neon-blue)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <Star size={18} fill="var(--neon-blue)" color="var(--neon-blue)" />
                  <div>
                    <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>
                      {t('activeCoach')}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>
                      {activeCoach.coach_name}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {t('activeCoachInfo')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Upload */}
      {showUploadModal && (
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
          zIndex: 10110,
          padding: '16px'
        }}>
          <div className="neon-card" style={{ 
            maxWidth: '500px', 
            width: '100%', 
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            marginBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'
          }}>
            {/* Header - fisso */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '16px',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ fontSize: '20px', margin: '0 0 8px 0' }}>{t('uploadCoach')}</h2>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                  {t('uploadCoachInstructions')}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadImages([])
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '24px',
                  padding: '4px',
                  marginLeft: '8px',
                  flexShrink: 0
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Body - scrollabile */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              marginRight: '-8px',
              paddingRight: '8px',
              marginBottom: '16px'
            }}>
            {/* Drag & Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                marginBottom: '20px',
                padding: uploadImages.length === 0 ? '48px' : '24px',
                border: '2px dashed rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                className: 'neon-panel',
                textAlign: 'center',
                cursor: 'default',
                transition: 'all 0.2s',
                minHeight: uploadImages.length === 0 ? '200px' : 'auto'
              }}
            >
              {uploadImages.length === 0 ? (
                <>
                  <Upload size={32} style={{ marginBottom: '12px', color: 'var(--neon-blue)' }} />
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    {t('dragDropPhotos')}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    {t('maxTwoPhotosFormat')}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '12px', color: 'rgba(255,255,255,0.85)' }}>
                    {lang === 'en' ? 'Tap here to upload screenshots from gallery or files.' : 'Tocca qui per caricare screenshot da galleria o file.'}
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {uploadImages.map((img) => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <img
                        src={img.dataUrl}
                        alt={`Preview ${img.type}`}
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          border: '2px solid rgba(0, 212, 255, 0.3)',
                          maxHeight: '180px',
                          objectFit: 'contain'
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(img.id)
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}
                      >
                        <X size={16} />
                      </button>
                      <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px', textAlign: 'center' }}>
                        {img.type === 'main' ? t('mainPhoto') : t('connectionPhoto')}
                      </div>
                    </div>
                  ))}
                  {uploadImages.length < 2 && (
                    <div
                      style={{
                        border: '2px dashed rgba(0, 212, 255, 0.3)',
                        borderRadius: '8px',
                        padding: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: 'rgba(0, 212, 255, 0.03)',
                        minHeight: '160px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        document.getElementById('coach-file-input')?.click()
                      }}
                    >
                      <Plus size={24} style={{ marginBottom: '8px', color: 'var(--neon-blue)' }} />
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('addPhoto')}</div>
                    </div>
                  )}
                </div>
              )}
              <input
                id="coach-file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={uploading || uploadImages.length >= 2}
              />
              <input
                id="coach-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraInputChange}
                style={{ display: 'none' }}
                disabled={uploading || uploadImages.length >= 2}
              />
            </div>
            </div>

            {/* Footer - fisso */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              flexShrink: 0,
              paddingTop: '8px',
              borderTop: '1px solid rgba(0, 212, 255, 0.1)'
            }}>
              <button
                onClick={() => document.getElementById('coach-file-input')?.click()}
                className="neon-button"
                disabled={uploading || uploadImages.length >= 2}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: '1 1 150px', minHeight: '52px' }}
              >
                <Upload size={16} />
                {t('upload')}
              </button>
              <button
                onClick={() => document.getElementById('coach-camera-input')?.click()}
                className="neon-button"
                disabled={uploading || uploadImages.length >= 2}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flex: '1 1 150px', minHeight: '52px' }}
              >
                <Camera size={16} />
                {t('cameraCaptureTitle')}
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadImages([])
                }}
                className="neon-button"
                disabled={uploading}
                style={{ flex: '1 1 150px', minHeight: '52px' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUploadCoach}
                className="btn primary"
                disabled={uploadImages.length === 0 || uploading}
                style={{ flex: '1 1 150px', minHeight: '52px' }}
              >
                {uploading ? t('extracting') : t('analyzing')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettagli */}
      {showDetailsModal && selectedCoach && (
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
          padding: '16px'
        }}>
          <div className="neon-card" style={{ 
            maxWidth: '600px', 
            width: '100%', 
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            marginBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexShrink: 0
            }}>
              <h2 style={{ fontSize: '20px', margin: 0 }}>{selectedCoach.coach_name}</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedCoach(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '24px',
                  padding: '4px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Body scrollabile */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              marginRight: '-8px',
              paddingRight: '8px'
            }}>
            {/* Dati base */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('informations')}</h3>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                {selectedCoach.age && <div>{t('age')}: {selectedCoach.age}</div>}
                {selectedCoach.nationality && <div>{t('nationality')}: {selectedCoach.nationality}</div>}
                {selectedCoach.team && <div>{t('team')}: {selectedCoach.team}</div>}
                {selectedCoach.category && <div>{t('category')}: {selectedCoach.category}</div>}
                {selectedCoach.pack_type && <div>{t('type')}: {selectedCoach.pack_type}</div>}
              </div>
            </div>

            {/* Competenza Stili di Gioco */}
            {selectedCoach.playing_style_competence && typeof selectedCoach.playing_style_competence === 'object' && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('playingStyleCompetence')}</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  {Object.entries(selectedCoach.playing_style_competence).map(([style, value]) => (
                    <div key={style} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t(style) || style.replace(/_/g, ' ')}:</span>
                      <strong>{typeof value === 'object' ? '' : value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affinità di allenamento */}
            {selectedCoach.training_affinity_description && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('trainingAffinity')}</h3>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  {selectedCoach.training_affinity_description}
                </div>
              </div>
            )}

            {/* Stat Boosters */}
            {Array.isArray(selectedCoach.stat_boosters) && selectedCoach.stat_boosters.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('statBoosters')}</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  {selectedCoach.stat_boosters.map((booster, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t(booster.stat_name) || booster.stat_name}:</span>
                      <strong>+{booster.bonus}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collegamento */}
            {selectedCoach.connection && typeof selectedCoach.connection === 'object' && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('connection')}</h3>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>{selectedCoach.connection.name}</strong>
                  </div>
                  {selectedCoach.connection.description && (
                    <div style={{ marginBottom: '12px', opacity: 0.8 }}>
                      {selectedCoach.connection.description}
                    </div>
                  )}
                  {selectedCoach.connection.focal_point && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>{t('focalPoint')}:</strong> {selectedCoach.connection.focal_point.playing_style} ({selectedCoach.connection.focal_point.position})
                    </div>
                  )}
                  {selectedCoach.connection.key_man && (
                    <div>
                      <strong>{t('keyMan')}:</strong> {selectedCoach.connection.key_man.playing_style} ({selectedCoach.connection.key_man.position})
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', flexShrink: 0, paddingTop: '8px', borderTop: '1px solid rgba(0, 212, 255, 0.1)' }}>
              {!selectedCoach.is_active && (
                <button
                  onClick={() => {
                    handleSetActive(selectedCoach.id)
                    setShowDetailsModal(false)
                  }}
                  className="btn primary"
                >
                  <Star size={16} style={{ marginRight: '8px' }} />
                  {t('setAsTitular')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ConfirmModal per eliminazione allenatore */}
      {deleteConfirmModal && deleteConfirmModal.show && (
        <ConfirmModal
          show={deleteConfirmModal.show}
          title={t('confirmDeleteCoachTitle')}
          message={deleteConfirmModal.coachName ? `${t('confirmDeleteCoachMessage')} ${deleteConfirmModal.coachName}?` : t('confirmDeleteCoach')}
          details={t('confirmDeleteCoachDetails')}
          variant="error"
          confirmVariant="danger"
          confirmLabel={t('delete')}
          cancelLabel={t('cancel')}
          onConfirm={deleteConfirmModal.onConfirm || (() => {})}
          onCancel={deleteConfirmModal.onCancel || (() => {})}
        />
      )}
    </div>
  )
}
