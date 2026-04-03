'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock3, Crown, ImagePlus, Loader2, Mic, MicOff, Radio, Sparkles, UploadCloud, X, Zap } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { getValidAccessToken, supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'

const DEFAULT_VOICE = 'marin'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function LiveCoachLauncher({ showLauncherButton = true }) {
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
  const [creditsData, setCreditsData] = useState(null)
  const [creditsLoading, setCreditsLoading] = useState(true)
  const [sessionStartedAt, setSessionStartedAt] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())

  const fileInputRef = useRef(null)
  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioElRef = useRef(null)
  const heartbeatRef = useRef(null)
  const sessionIdRef = useRef(null)
  const stopInProgressRef = useRef(false)
  const responseInFlightRef = useRef(false)
  const lastResponseDoneAtRef = useRef(0)

  const premiumLabel = useMemo(() => lang === 'en' ? 'Premium' : 'Premium', [lang])
  const balanceRemaining = Number.isFinite(Number(creditsData?.balance_remaining)) ? Number(creditsData.balance_remaining) : null
  const currentSessionSpent = Number.isFinite(Number(sessionInfo?.totalHpCharged)) ? Number(sessionInfo.totalHpCharged) : 0
  const elapsedMs = sessionStartedAt ? Math.max(0, nowTick - sessionStartedAt) : 0
  const liveDuration = formatDuration(elapsedMs)
  const hasConversation = Boolean(userLine || coachLine || isConnected || isConnecting)
  const launcherWidth = 'min(268px, calc(100vw - 28px))'

  const getToken = useCallback(async () => {
    let token = localStorage.getItem('auth_token')
    if (!token && supabase) {
      token = await getValidAccessToken()
    }
    return token
  }, [])

  const fetchCredits = useCallback(async (signal) => {
    try {
      const token = await getToken()
      if (signal?.aborted || !token) {
        setCreditsLoading(false)
        return
      }
      const res = await fetch('/api/credits/usage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        cache: 'no-store',
        ...(signal ? { signal } : {})
      })
      if (signal?.aborted) return
      const payload = await safeJsonResponse(res, t('creditsError'))
      if (signal?.aborted) return
      setCreditsData(payload)
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('[LiveCoachLauncher] credits error:', err)
      }
    } finally {
      if (!signal?.aborted) setCreditsLoading(false)
    }
  }, [getToken, t])

  useEffect(() => {
    const ac = new AbortController()
    fetchCredits(ac.signal)
    const onCreditsConsumed = () => fetchCredits(ac.signal)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchCredits(ac.signal)
    }
    window.addEventListener('credits-consumed', onCreditsConsumed)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      ac.abort()
      window.removeEventListener('credits-consumed', onCreditsConsumed)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchCredits])

  useEffect(() => {
    const openLauncher = () => setIsOpen(true)
    if (typeof window !== 'undefined') {
      window.addEventListener('open-live-coach', openLauncher)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-live-coach', openLauncher)
      }
    }
  }, [])

  useEffect(() => {
    if (!isConnected || !sessionStartedAt) return
    const interval = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isConnected, sessionStartedAt])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const stopRealtime = useCallback(async (notifyServer = true) => {
    if (stopInProgressRef.current) return
    stopInProgressRef.current = true
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
    responseInFlightRef.current = false
    lastResponseDoneAtRef.current = 0
    setSessionStartedAt(null)
    setNowTick(Date.now())
    await fetchCredits()
    stopInProgressRef.current = false
  }, [fetchCredits, getToken, lang, opponentContext, stopHeartbeat, userLine, coachLine])

  useEffect(() => {
    return () => {
      stopRealtime(false)
    }
  }, [stopRealtime])

  const requestModelResponse = useCallback((transcript = '') => {
    const text = String(transcript || '').trim()
    const now = Date.now()
    if (!dcRef.current || dcRef.current.readyState !== 'open') return
    if (!text || text.length < 2) return
    if (responseInFlightRef.current) return
    if (now - lastResponseDoneAtRef.current < 2500) return

    responseInFlightRef.current = true
    setCoachLine('')
    dcRef.current.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    }))
  }, [])

  const handleRealtimeEvent = useCallback((event) => {
    if (!event || typeof event !== 'object') return

    if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
      const transcript = String(event.transcript || '').trim()
      setUserLine(transcript)
      requestModelResponse(transcript)
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
      responseInFlightRef.current = false
      lastResponseDoneAtRef.current = Date.now()
      setSessionInfo(prev => ({
        ...(prev || {}),
        usage: event.response.usage
      }))
      return
    }

    if (event.type === 'error') {
      responseInFlightRef.current = false
      setError(event.error?.message || t('liveCoachRealtimeError'))
    }
  }, [requestModelResponse, t])

  const startHeartbeat = useCallback((intervalMs) => {
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
          setSessionInfo(prev => ({
            ...(prev || {}),
            ended: true
          }))
          await stopRealtime(false)
          return
        }
        const payload = await safeJsonResponse(res, t('liveCoachBillingError'))
        setSessionInfo(prev => ({
          ...(prev || {}),
          totalHpCharged: payload?.totalHpCharged ?? prev?.totalHpCharged ?? 0,
          minuteBlocksBilled: payload?.minuteBlocksBilled ?? prev?.minuteBlocksBilled ?? 0
        }))
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
  }, [getToken, lang, stopHeartbeat, stopRealtime, t])

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
      setSessionStartedAt(sessionPayload?.startedAt ? new Date(sessionPayload.startedAt).getTime() : Date.now())
      setSessionInfo({
        ...sessionPayload,
        totalHpCharged: sessionPayload?.pricing?.startHp ?? 0,
        minuteBlocksBilled: 0
      })
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
      dc.addEventListener('open', () => {
        try {
          dc.send(JSON.stringify({
            type: 'session.update',
            session: {
              audio: {
                input: {
                  turn_detection: {
                    type: 'semantic_vad',
                    eagerness: 'medium',
                    interrupt_response: false,
                    create_response: false
                  }
                }
              }
            }
          }))
        } catch (_) {}
      })
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
          startHeartbeat(sessionPayload?.heartbeatMs || 30000)
          return
        }

        if ((pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') && sessionIdRef.current && !stopInProgressRef.current) {
          setError(t('liveCoachRealtimeError'))
          void stopRealtime(true)
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
      <style jsx>{`
        @keyframes liveCoachPulse {
          0%, 100% { box-shadow: 0 0 28px rgba(255,196,0,0.25), 0 0 0 rgba(0,212,255,0.0); transform: translateY(0); }
          50% { box-shadow: 0 0 40px rgba(255,196,0,0.35), 0 0 20px rgba(0,212,255,0.12); transform: translateY(-1px); }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.18); }
        }
        @keyframes voiceOrbBreathe {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes voiceOrbActive {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }
        @keyframes voiceOrbProcess {
          0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          25% { transform: translate(-50%, -50%) scale(1.05) rotate(5deg); }
          75% { transform: translate(-50%, -50%) scale(1.05) rotate(-5deg); }
        }
        @keyframes voiceOrbRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes voiceOrbRotateReverse {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes voiceOrbExpand {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
        }
        @keyframes voiceOrbParticle {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
        }
        @keyframes voiceOrbDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes voiceOrbParticleOrbit {
          0% { transform: rotate(0deg) translateX(50px) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: rotate(360deg) translateX(50px) scale(0); opacity: 0; }
        }
        .live-coach-modal-grid {
          display: grid;
          gap: 14px;
        }
        .live-coach-quickstart {
          display: grid;
          gap: 14px;
        }
        @media (min-width: 920px) {
          .live-coach-quickstart {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            align-items: start;
          }
        }
      `}</style>

      {showLauncherButton && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t('liveCoachOpen')}
          className={isConnected ? 'live-coach-launcher-active' : undefined}
          style={{
            position: 'fixed',
            left: '14px',
            bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))',
            zIndex: 1002,
            width: launcherWidth,
            minHeight: '92px',
            borderRadius: '26px',
            border: isConnected ? '1px solid rgba(88,255,181,0.42)' : '1px solid rgba(255, 215, 100, 0.55)',
            background: isConnected
              ? 'linear-gradient(135deg, rgba(18,33,42,0.98), rgba(6,15,24,0.98))'
              : 'radial-gradient(circle at 20% 20%, rgba(255,224,130,0.30), rgba(15,18,40,0.98) 58%, rgba(8,10,22,1) 100%)',
            boxShadow: isConnected
              ? '0 0 40px rgba(67, 255, 160, 0.18), inset 0 0 24px rgba(255,255,255,0.06)'
              : '0 0 34px rgba(255, 196, 0, 0.28), inset 0 0 24px rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'stretch',
            gap: '14px',
            color: '#FFF4CC',
            backdropFilter: 'blur(18px)',
            padding: '14px 16px',
            textAlign: 'left',
            animation: isConnected ? 'liveCoachPulse 2.4s ease-in-out infinite' : 'none'
          }}
        >
          <div style={{
            width: '52px',
            minWidth: '52px',
            borderRadius: '18px',
            background: isConnected
              ? 'linear-gradient(180deg, rgba(60,255,170,0.18), rgba(0,212,255,0.08))'
              : 'linear-gradient(180deg, rgba(255,215,100,0.18), rgba(0,212,255,0.08))',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <Crown size={18} />
            <Radio size={16} />
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>{t('liveCoachTitle')}</span>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: 'rgba(255,215,100,0.12)',
                    border: '1px solid rgba(255,215,100,0.26)',
                    color: '#FFD76A'
                  }}>
                    {premiumLabel}
                  </span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.72)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isConnected ? t('liveCoachLauncherSubtitleActive') : t('liveCoachLauncherSubtitle')}
                </div>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 9px',
                borderRadius: '999px',
                background: isConnected ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.05)',
                color: isConnected ? '#7DFF9A' : 'rgba(255,255,255,0.82)',
                fontSize: '11px',
                fontWeight: 800
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isConnected ? '#54F5A6' : '#FFD76A',
                  animation: isConnected ? 'liveDot 1.4s ease-in-out infinite' : 'none'
                }} />
                {isConnected ? t('liveCoachLiveShort') : t('liveCoachReadyShort')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700
              }}>
                <Zap size={13} color={balanceRemaining !== null && balanceRemaining <= 2 ? '#FFB454' : '#FFD76A'} />
                {t('liveCoachStatHp')}: {creditsLoading ? '...' : (balanceRemaining ?? '--')}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '12px',
                background: isConnected ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.05)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700
              }}>
                <Clock3 size={13} color={isConnected ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.7)'} />
                {t('liveCoachStatTime')}: {liveDuration}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '12px',
                background: 'rgba(255,215,100,0.08)',
                color: '#FFF2C2',
                fontSize: '12px',
                fontWeight: 700
              }}>
                <Sparkles size={13} color="#FFD76A" />
                {t('liveCoachStatSpent')}: {currentSessionSpent}
              </div>
            </div>
          </div>
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10020,
            background: 'rgba(2, 6, 18, 0.84)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              width: 'min(100%, 760px)',
              maxHeight: 'min(88vh, 820px)',
              overflowY: 'auto',
              borderRadius: '26px',
              border: '1px solid rgba(255, 215, 100, 0.35)',
              background: 'linear-gradient(180deg, rgba(9,12,28,0.99), rgba(5,8,20,0.99))',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,196,0,0.14)',
              padding: '18px'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              alignItems: 'flex-start',
              marginBottom: '14px',
              padding: '16px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255,215,100,0.08), rgba(0,212,255,0.05))',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '6px 10px', borderRadius: '999px', border: '1px solid rgba(255,215,100,0.28)', background: 'rgba(255,215,100,0.08)', color: '#FFD76A', fontSize: '12px', fontWeight: 700 }}>
                  <Sparkles size={14} />
                  {t('liveCoachPremiumBadge')}
                </div>
                <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#FFFFFF' }}>{t('liveCoachTitle')}</h2>
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
              <div className="live-coach-quickstart">
                <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', display: 'grid', placeItems: 'center', background: 'rgba(255,215,100,0.1)', color: '#FFD76A' }}>
                      <ImagePlus size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{t('liveCoachPhotoTitle')}</div>
                      <div style={{ marginTop: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.66)', lineHeight: 1.5 }}>{t('liveCoachPhotoHelper')}</div>
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

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 11px', borderRadius: '999px', background: opponentContext?.formation ? 'rgba(0,212,255,0.10)' : 'rgba(255,255,255,0.05)', color: opponentContext?.formation ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.78)', fontSize: '12px', fontWeight: 700 }}>
                      <ImagePlus size={13} color={opponentContext?.formation ? 'var(--neon-cyan)' : '#FFD76A'} />
                      {opponentContext?.formation ? `${t('liveCoachOpponentReady')} ${opponentContext.formation}` : t('liveCoachOpponentMissing')}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 11px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF', fontSize: '12px', fontWeight: 700 }}>
                      <Zap size={13} color="#FFD76A" />
                      {creditsLoading ? '...' : (balanceRemaining ?? '--')} HP
                    </div>
                  </div>
                </div>

                <div style={{ borderRadius: '20px', border: '1px solid rgba(255,215,100,0.20)', background: 'linear-gradient(180deg, rgba(255,215,100,0.08), rgba(0,212,255,0.04))', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{t('liveCoachVoiceTitle')}</div>
                      <div style={{ marginTop: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.66)', lineHeight: 1.5 }}>{t('liveCoachVoiceHelper')}</div>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '8px 10px',
                      borderRadius: '999px',
                      background: isConnected ? 'rgba(52,199,89,0.12)' : 'rgba(255,255,255,0.05)',
                      color: isConnected ? '#7DFF9A' : 'rgba(255,255,255,0.82)',
                      fontSize: '12px',
                      fontWeight: 800
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isConnected ? '#54F5A6' : '#FFD76A',
                        animation: isConnected ? 'liveDot 1.4s ease-in-out infinite' : 'none'
                      }} />
                      {isConnected ? t('liveCoachStatusLive') : isConnecting ? t('liveCoachStatusConnecting') : t('liveCoachStatusReady')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      disabled={isConnected || isConnecting}
                      style={{
                        minHeight: '44px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '8px 12px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="marin">{t('liveCoachVoiceMarin')}</option>
                      <option value="cedar">{t('liveCoachVoiceCedar')}</option>
                      <option value="coral">{t('liveCoachVoiceCoral')}</option>
                      <option value="verse">{t('liveCoachVoiceVerse')}</option>
                      <option value="sage">{t('liveCoachVoiceSage')}</option>
                      <option value="ballad">{t('liveCoachVoiceBallad')}</option>
                    </select>

                    {!isConnected ? (
                      <button
                        type="button"
                        onClick={startRealtime}
                        disabled={isConnecting}
                        style={{
                          minHeight: '52px',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,215,100,0.4)',
                          background: 'linear-gradient(135deg, rgba(255,215,100,0.2), rgba(0,212,255,0.15))',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: isConnecting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isConnecting ? (
                          <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('liveCoachConnecting')}</>
                        ) : (
                          <><Radio size={16} /> {t('liveCoachStartTalking')}</>
                        )}
                      </button>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={toggleMute}
                          style={{
                            minHeight: '48px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: isMuted ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.05)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: 600,
                            fontSize: '14px'
                          }}
                        >
                          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                          {isMuted ? t('liveCoachUnmute') : t('liveCoachMute')}
                        </button>
                        <button
                          type="button"
                          onClick={() => stopRealtime(true)}
                          style={{
                            minHeight: '48px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,59,48,0.3)',
                            background: 'rgba(255,59,48,0.12)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: 600,
                            fontSize: '14px'
                          }}
                        >
                          <X size={16} />
                          {t('liveCoachStop')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{t('liveCoachLiveFeed')}</div>
                    {!hasConversation && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.66)', lineHeight: 1.5 }}>
                        {t('liveCoachFeedHelper')}
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    <Clock3 size={13} color="var(--neon-cyan)" />
                    {liveDuration}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ borderRadius: '14px', background: 'rgba(255,255,255,0.03)', padding: '14px', minHeight: '76px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(0,212,255,0.9)', marginBottom: '6px' }}>{t('liveCoachYou')}</div>
                    <div style={{ color: 'rgba(255,255,255,0.82)', minHeight: '20px', lineHeight: 1.6 }}>{userLine || t('liveCoachWaitingYou')}</div>
                  </div>
                  <div style={{ borderRadius: '14px', background: 'rgba(255,215,100,0.05)', padding: '14px', minHeight: '88px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFD76A', marginBottom: '6px' }}>{t('liveCoachCoach')}</div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', minHeight: '20px', lineHeight: 1.6 }}>{coachLine || t('liveCoachWaitingCoach')}</div>
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
