'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Crown, ImagePlus, Loader2, Mic, MicOff, Radio, Sparkles, UploadCloud, X } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { getValidAccessToken, supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'

const DEFAULT_VOICE = 'cedar'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function LiveCoachLauncher() {
  const { t, lang } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [error, setError] = useState(null)
  const [opponentContext, setOpponentContext] = useState(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [userLine, setUserLine] = useState('')
  const [coachLine, setCoachLine] = useState('')
  const [sessionInfo, setSessionInfo] = useState(null)
  const [voice, setVoice] = useState(DEFAULT_VOICE)

  const fileInputRef = useRef(null)
  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioElRef = useRef(null)
  const heartbeatRef = useRef(null)
  const sessionIdRef = useRef(null)

  const premiumLabel = useMemo(() => lang === 'en' ? 'Premium' : 'Premium', [lang])

  useEffect(() => {
    return () => {
      stopRealtime(false)
    }
  }, [])

  const getToken = async () => {
    let token = localStorage.getItem('auth_token')
    if (!token && supabase) {
      token = await getValidAccessToken()
    }
    return token
  }

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }

  const stopRealtime = async (notifyServer = true) => {
    stopHeartbeat()

    try {
      dcRef.current?.close?.()
    } catch (_) {}
    try {
      pcRef.current?.close?.()
    } catch (_) {}
    try {
      mediaStreamRef.current?.getTracks?.().forEach(track => track.stop())
    } catch (_) {}

    dcRef.current = null
    pcRef.current = null
    mediaStreamRef.current = null

    setIsConnected(false)
    setIsConnecting(false)
    setIsMuted(false)

    if (notifyServer && sessionIdRef.current) {
      try {
        const token = await getToken()
        if (token) {
          await fetch('/api/live-coach/end', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              lang,
              opponentContext,
              clientState: {
                userLine,
                coachLine
              }
            })
          })
        }
      } catch (_) {}
    }

    sessionIdRef.current = null
  }

  const handleRealtimeEvent = (event) => {
    if (!event || typeof event !== 'object') return

    if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
      setUserLine(event.transcript)
      return
    }

    if ((event.type === 'response.audio_transcript.delta' || event.type === 'response.output_text.delta') && event.delta) {
      setCoachLine(prev => `${prev}${event.delta}`)
      return
    }

    if ((event.type === 'response.audio_transcript.done' || event.type === 'response.output_text.done') && event.transcript) {
      setCoachLine(event.transcript)
      return
    }

    if (event.type === 'response.done' && event.response?.usage) {
      setSessionInfo(prev => ({
        ...(prev || {}),
        usage: event.response.usage
      }))
      return
    }

    if (event.type === 'error') {
      setError(event.error?.message || t('liveCoachRealtimeError'))
    }
  }

  const startHeartbeat = (intervalMs) => {
    stopHeartbeat()
    heartbeatRef.current = setInterval(async () => {
      if (!sessionIdRef.current) return
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch('/api/live-coach/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            lang
          })
        })
        if (res.status === 402) {
          const payload = await res.json().catch(() => ({}))
          setError(payload?.error || t('liveCoachEndedNoCredits'))
          await stopRealtime(false)
          return
        }
        const payload = await safeJsonResponse(res, t('liveCoachBillingError'))
        if (payload?.additionalCost > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('credits-consumed'))
        }
        if (payload?.ended) {
          setError(payload.error || t('liveCoachEndedNoCredits'))
          await stopRealtime(false)
        }
      } catch (err) {
        console.error('[LiveCoachLauncher] heartbeat error:', err)
      }
    }, intervalMs)
  }

  const startRealtime = async () => {
    if (isConnecting || isConnected) return
    setError(null)
    setIsConnecting(true)
    setCoachLine('')
    setUserLine('')

    try {
      const token = await getToken()
      if (!token) throw new Error(t('sessionExpired'))

      const sessionRes = await fetch('/api/live-coach/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lang,
          voice,
          opponentContext
        })
      })
      const sessionPayload = await safeJsonResponse(sessionRes, t('liveCoachStartError'))
      const clientSecret = sessionPayload?.clientSecret
      const sessionId = sessionPayload?.sessionId

      if (!clientSecret || !sessionId) {
        throw new Error(t('liveCoachStartError'))
      }

      sessionIdRef.current = sessionId
      setSessionInfo(sessionPayload)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioElRef.current = audioEl
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0]
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      mediaStreamRef.current = mediaStream
      mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream))

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.addEventListener('message', (e) => {
        try {
          handleRealtimeEvent(JSON.parse(e.data))
        } catch (_) {}
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp'
        }
      })

      const answerSdp = await sdpRes.text()
      if (!sdpRes.ok) {
        throw new Error(t('liveCoachRealtimeError'))
      }

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      })

      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true)
          setIsConnecting(false)
          startHeartbeat(sessionPayload?.heartbeatMs || 55000)
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          setIsConnected(false)
          if (pc.connectionState !== 'connected') {
            setError(t('liveCoachRealtimeError'))
          }
        }
      })
    } catch (err) {
      console.error('[LiveCoachLauncher] start error:', err)
      setError(err.message || t('liveCoachStartError'))
      await stopRealtime(Boolean(sessionIdRef.current))
    } finally {
      setIsConnecting(false)
    }
  }

  const toggleMute = () => {
    const tracks = mediaStreamRef.current?.getAudioTracks?.() || []
    const nextMuted = !isMuted
    tracks.forEach(track => {
      track.enabled = !nextMuted
    })
    setIsMuted(nextMuted)
  }

  const handlePhotoPick = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploadingPhoto(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error(t('sessionExpired'))
      const imageDataUrl = await fileToDataUrl(file)

      const extractRes = await fetch('/api/extract-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ imageDataUrl })
      })
      const extractPayload = await safeJsonResponse(extractRes, t('liveCoachPhotoError'))

      const normalizedOpponent = {
        formation: extractPayload?.formation || null,
        players: Array.isArray(extractPayload?.players) ? extractPayload.players : [],
        coach: extractPayload?.coach || null
      }
      setOpponentContext(normalizedOpponent)

      await fetch('/api/supabase/save-opponent-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          formation_name: normalizedOpponent.formation,
          extracted_data: normalizedOpponent,
          is_pre_match: true,
          formation_image: imageDataUrl
        })
      }).catch(() => null)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }
    } catch (err) {
      console.error('[LiveCoachLauncher] photo error:', err)
      setError(err.message || t('liveCoachPhotoError'))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('liveCoachOpen')}
        style={{
          position: 'fixed',
          left: '20px',
          bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))',
          zIndex: 1001,
          width: '76px',
          height: '76px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 215, 100, 0.55)',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,224,130,0.35), rgba(15,18,40,0.98) 55%, rgba(8,10,22,1) 100%)',
          boxShadow: '0 0 32px rgba(255, 196, 0, 0.35), inset 0 0 24px rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          color: '#FFF4CC',
          backdropFilter: 'blur(16px)'
        }}
      >
        <div style={{
          position: 'absolute',
          inset: '-1px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(255,228,138,0.55), transparent 35%, rgba(0,212,255,0.16) 100%)',
          pointerEvents: 'none'
        }} />
        <Crown size={20} />
        <Radio size={18} />
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>{premiumLabel}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10020,
            background: 'rgba(2, 6, 18, 0.8)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              width: 'min(100%, 560px)',
              maxHeight: 'min(90vh, 820px)',
              overflowY: 'auto',
              borderRadius: '28px',
              border: '1px solid rgba(255, 215, 100, 0.35)',
              background: 'linear-gradient(180deg, rgba(9,12,28,0.98), rgba(5,8,20,0.98))',
              boxShadow: '0 20px 80px rgba(0,0,0,0.55), 0 0 50px rgba(255,196,0,0.12)',
              padding: '22px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '6px 10px', borderRadius: '999px', border: '1px solid rgba(255,215,100,0.28)', background: 'rgba(255,215,100,0.08)', color: '#FFD76A', fontSize: '12px', fontWeight: 700 }}>
                  <Sparkles size={14} />
                  {t('liveCoachPremiumBadge')}
                </div>
                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#FFFFFF' }}>{t('liveCoachTitle')}</h2>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>{t('liveCoachSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false)
                  await stopRealtime(true)
                }}
                aria-label={t('liveCoachClose')}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', display: 'grid', placeItems: 'center', background: 'rgba(255,215,100,0.1)', color: '#FFD76A' }}>
                    <ImagePlus size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>{t('liveCoachPhotoTitle')}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.66)' }}>{t('liveCoachPhotoSubtitle')}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  style={{
                    width: '100%',
                    borderRadius: '16px',
                    border: '1px dashed rgba(255,215,100,0.32)',
                    background: 'rgba(255,215,100,0.06)',
                    color: '#FFF3CB',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    fontWeight: 700
                  }}
                >
                  {isUploadingPhoto ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={18} />}
                  {isUploadingPhoto ? t('liveCoachPhotoUploading') : t('liveCoachPhotoButton')}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoPick} />

                {opponentContext?.formation && (
                  <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--neon-cyan)' }}>{t('liveCoachPhotoReady')}</div>
                    <div style={{ marginTop: '4px', color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                      {t('liveCoachPhotoDetected')}: <strong>{opponentContext.formation}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>{t('liveCoachVoiceTitle')}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.66)' }}>{t('liveCoachVoiceSubtitle')}</div>
                  </div>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    disabled={isConnected || isConnecting}
                    style={{
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255,255,255,0.12)',
                      padding: '10px 12px'
                    }}
                  >
                    <option value="cedar">{t('liveCoachVoiceCedar')}</option>
                    <option value="marin">{t('liveCoachVoiceMarin')}</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {!isConnected ? (
                    <button
                      type="button"
                      onClick={startRealtime}
                      disabled={isConnecting}
                      style={{
                        gridColumn: '1 / -1',
                        minHeight: '62px',
                        borderRadius: '18px',
                        border: '1px solid rgba(255,215,100,0.35)',
                        background: 'linear-gradient(135deg, rgba(255,215,100,0.18), rgba(0,212,255,0.12))',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '16px',
                        fontWeight: 800
                      }}
                    >
                      {isConnecting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Mic size={18} />}
                      {isConnecting ? t('liveCoachConnecting') : t('liveCoachStartTalking')}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={toggleMute}
                        style={{
                          minHeight: '56px',
                          borderRadius: '16px',
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.05)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          fontWeight: 700
                        }}
                      >
                        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        {isMuted ? t('liveCoachUnmute') : t('liveCoachMute')}
                      </button>
                      <button
                        type="button"
                        onClick={() => stopRealtime(true)}
                        style={{
                          minHeight: '56px',
                          borderRadius: '16px',
                          border: '1px solid rgba(255,59,48,0.28)',
                          background: 'rgba(255,59,48,0.12)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          fontWeight: 700
                        }}
                      >
                        <X size={18} />
                        {t('liveCoachStop')}
                      </button>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ padding: '8px 12px', borderRadius: '999px', background: isConnected ? 'rgba(52,199,89,0.12)' : 'rgba(255,215,100,0.1)', color: isConnected ? '#7DFF9A' : '#FFD76A', fontSize: '12px', fontWeight: 700 }}>
                    {isConnected ? t('liveCoachStatusLive') : t('liveCoachStatusReady')}
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700 }}>
                    {t('liveCoachHpHint')}
                  </div>
                  {sessionInfo?.voice && (
                    <div style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(0,212,255,0.08)', color: 'var(--neon-cyan)', fontSize: '12px', fontWeight: 700 }}>
                      {sessionInfo.voice}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>{t('liveCoachLiveFeed')}</div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.03)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(0,212,255,0.9)', marginBottom: '6px' }}>{t('liveCoachYou')}</div>
                    <div style={{ color: 'rgba(255,255,255,0.82)', minHeight: '20px' }}>{userLine || t('liveCoachWaitingYou')}</div>
                  </div>
                  <div style={{ borderRadius: '14px', background: 'rgba(255,215,100,0.05)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFD76A', marginBottom: '6px' }}>{t('liveCoachCoach')}</div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', minHeight: '20px' }}>{coachLine || t('liveCoachWaitingCoach')}</div>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ borderRadius: '16px', border: '1px solid rgba(255,59,48,0.22)', background: 'rgba(255,59,48,0.08)', color: '#FFDAD6', padding: '14px 16px', fontWeight: 600 }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
