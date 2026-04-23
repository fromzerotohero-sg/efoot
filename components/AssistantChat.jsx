'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Brain, X, Send, Sparkles, ChevronDown, ChevronUp, Mic, MicOff } from 'lucide-react'
import { mapErrorToUserMessage } from '@/lib/errorHelper'

export default function AssistantChat({ mode = 'popup' }) {
  const pathname = usePathname()
  const currentPage = pathname || ''
  const { t, lang } = useTranslation()
  const [isOpen, setIsOpen] = useState(mode === 'page' ? true : false)
  const [isBlockedByCoachFeedback, setIsBlockedByCoachFeedback] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [lastSuggestions, setLastSuggestions] = useState([]) // 3 suggerimenti cliccabili dopo ogni risposta
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false) // riquadro suggerimenti collassato = più spazio chat
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [interimText, setInterimText] = useState('') // Testo temporaneo durante l'ascolto
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const sendAbortRef = useRef(null)
  const recognitionRef = useRef(null)
  const voiceTimeoutRef = useRef(null)
  const confirmedTextRef = useRef('') // Testo finale confermato durante la sessione

  // Render minimo Markdown (safe): **bold**, *italic*, newlines → <br/>
  const renderRichText = React.useCallback((text) => {
    const raw = text == null ? '' : String(text)
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    // Non è un markdown completo: è intenzionale (robusto e sicuro).
    // Ordine importante: bold prima di italic.
    const withBold = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    const withItalic = withBold.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    const withBreaks = withItalic.replace(/\n/g, '<br/>')

    return { __html: withBreaks }
  }, [])

  useEffect(() => {
    return () => { 
      sendAbortRef.current?.abort()
      recognitionRef.current?.stop()
      clearTimeout(voiceTimeoutRef.current)
    }
  }, [])

  // Responsive: traccia viewport mobile per layout popup
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Usiamo breakpoint "lg" (Tailwind) così include tutti i device mobile/tablet
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobileViewport(!!mq.matches)
    update()
    if (mq.addEventListener) mq.addEventListener('change', update)
    else mq.addListener(update)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update)
      else mq.removeListener(update)
    }
  }, [])

  // Inizializza Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('[AssistantChat] Web Speech API not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = lang === 'en' ? 'en-US' : 'it-IT'

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceError(null)
      setInterimText('')
      // Prendi il testo attuale come base
      confirmedTextRef.current = input.trim()
      // Auto-stop dopo 10 secondi di silenzio o ascolto
      voiceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }
      }, 10000)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // Se c'è un risultato finale, accumulalo nel ref
      if (finalTranscript) {
        confirmedTextRef.current = (confirmedTextRef.current + ' ' + finalTranscript).trim()
        // Aggiorna l'input con il testo confermato (senza l'interim precedente)
        setInput(confirmedTextRef.current)
        // Resetta l'interim
        setInterimText('')
      } else if (interimTranscript) {
        // Mostra preview mentre parla (aggiunto al testo confermato)
        setInterimText(interimTranscript)
        // Aggiorna l'input visualizzato: confermato + interim
        const displayText = confirmedTextRef.current 
          ? confirmedTextRef.current + ' ' + interimTranscript 
          : interimTranscript
        setInput(displayText.trim())
      }
    }

    recognition.onerror = (event) => {
      console.error('[AssistantChat] Speech recognition error:', event.error)
      if (event.error !== 'aborted') {
        setVoiceError(t('voiceError'))
      }
      setIsListening(false)
      clearTimeout(voiceTimeoutRef.current)
    }

    recognition.onend = () => {
      setIsListening(false)
      clearTimeout(voiceTimeoutRef.current)
      // Rimuovi marker temporanei
      setInput(prev => prev.replace(/\[\.\.\.\]$/, ''))
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      clearTimeout(voiceTimeoutRef.current)
    }
  }, [lang, t])

  // Apertura da Mission Center / link esterni: apri chat principale con messaggio precompilato
  useEffect(() => {
    const handler = (e) => {
      if (isBlockedByCoachFeedback) return
      const message = (e.detail && e.detail.message) ? String(e.detail.message) : ''
      setIsOpen(true)
      if (message) setInput(message)
    }
    window.addEventListener('open-assistant-chat', handler)
    return () => window.removeEventListener('open-assistant-chat', handler)
  }, [isBlockedByCoachFeedback])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleCoachFeedbackVisibility = (event) => {
      const nextIsOpen = !!event?.detail?.isOpen
      setIsBlockedByCoachFeedback(nextIsOpen)
      if (nextIsOpen && mode !== 'page') {
        setIsOpen(false)
      }
    }

    window.addEventListener('coach-feedback-visibility-change', handleCoachFeedbackVisibility)
    return () => window.removeEventListener('coach-feedback-visibility-change', handleCoachFeedbackVisibility)
  }, [mode])

  // Suggerimenti utili: analisi vs rosa, uso comandi/abilità, priorità concrete
  const initialSuggestions = useMemo(() => {
    const page = (currentPage || '').toLowerCase()
    if (lang === 'en') {
      if (page.includes('gestione-formazione')) return ['Do my analysis stats match the roster I have?', 'Am I using passing and shooting in line with my players\' skills?', 'Based on roster and matches, what should I work on first?']
      if (page.includes('match/new')) return ['What to prepare for the next match with my roster?', 'What priorities in defence and attack with the players I use?', 'How to get the most from my roster\'s skills in a match?']
      if (page.includes('match/') && !page.includes('new')) return ['What to fix after this match based on how I played?', 'Do my stats (passing, shot, defence) fit my roster?', 'What priorities for the next matches?']
      if (page.includes('contromisure')) return ['How to counter aggressive formations with my roster?', 'What priorities in defence and attack?', 'What to prepare on set pieces with my players?']
      if (page.includes('allenatori')) return ['What style fits my coach with my roster?', 'Do my game stats suit the players I have?', 'What priorities with this coach?']
      return ['Do my analysis stats match the roster I have?', 'Am I using commands (passing, shot, defence) in line with my roster\'s skills?', 'Based on matches and data, what should I work on first?']
    }
    if (page.includes('gestione-formazione')) return ['Le mie statistiche di analisi sono adatte alla rosa che ho?', 'Uso passaggio e tiro in modo coerente con le abilità dei miei giocatori?', 'In base a rosa e partite, qual è la prima cosa su cui lavorare?']
    if (page.includes('match/new')) return ['Cosa preparare per la prossima partita con la mia rosa?', 'Quali priorità in difesa e attacco con i giocatori che schiero?', 'Come sfruttare al meglio le abilità della rosa in partita?']
    if (page.includes('match/') && !page.includes('new')) return ['Cosa correggere dopo questa partita in base a come ho giocato?', 'Le mie statistiche (passaggio, tiro, difesa) vanno d\'accordo con la rosa?', 'Quali priorità per le prossime partite?']
    if (page.includes('contromisure')) return ['Come contrastare formazioni aggressive con la mia rosa?', 'Quali priorità in difesa e attacco?', 'Cosa preparare sui piazzati con i miei giocatori?']
    if (page.includes('allenatori')) return ['Quale stile abbinare al mio allenatore con la rosa?', 'Le mie statistiche di gioco sono adatte ai giocatori che ho?', 'Quali priorità con questo allenatore?']
    return ['Le mie statistiche di analisi sono adatte alla rosa che ho?', 'Uso i comandi (passaggio, tiro, difesa) in modo coerente con le abilità della rosa?', 'In base a partite e dati, su cosa mi conviene lavorare prima?']
  }, [currentPage, lang])
  
  // Carica profilo utente al mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        let token = localStorage.getItem('auth_token')
        let userId = null
        
        if (token) {
           const userData = localStorage.getItem('metalgate_user')
           if (userData) {
             userId = JSON.parse(userData).id
           }
        } else {
           const { data: session } = await supabase.auth.getSession()
           if (session?.session) {
             token = session.session.access_token
             userId = session.session.user.id
           }
        }
        
        if (!userId) return
        
        // Use standard Supabase query if available (public/RLS allowing)
        // Or if custom token, we might need to rely on API or assume basic profile if not fetchable directly
        // Ideally we should use an API that supports the custom token
        
        if (token && localStorage.getItem('auth_token')) {
           // Custom token path: fetch from dashboard API which includes profile
           const res = await fetch('/api/dashboard', {
             headers: { 'Authorization': `Bearer ${token}` }
           })
           if (res.ok) {
             const data = await res.json()
             if (data.profile) {
               setUserProfile(data.profile)
               handleGreeting(data.profile)
             }
           }
        } else {
           // Fallback or Supabase session: try to use API first if token available, 
           // otherwise (if really needed) we could fallback to supabase but we want to avoid it.
           // Since we have the token (from session), let's try the API.
           try {
             const res = await fetch('/api/user/profile', {
               headers: { 'Authorization': `Bearer ${token}` }
             })
             if (res.ok) {
               const profile = await res.json()
               setUserProfile(profile)
               handleGreeting(profile)
             }
           } catch (e) {
             console.error('Error fetching profile via API:', e)
           }
        }
      } catch (error) {
        console.error('[AssistantChat] Error loading profile:', error)
      }
    }
    
    const handleGreeting = (profile) => {
      // Saluto personale al primo accesso
      const hasGreeted = localStorage.getItem('assistant_greeted')
      if (!hasGreeted && profile.first_name) {
        setTimeout(() => {
          const aiName = profile.ai_name || (lang === 'en' ? 'your Coach AI' : 'il tuo Coach AI')
          const greeting = lang === 'en'
            ? `Hi ${profile.first_name}! 👋 I'm ${aiName}. I'm here to help and guide you. Just tell me what you need! 💪`
            : `Ciao ${profile.first_name}! 👋 Sono ${aiName}. Sono qui per aiutarti e guidarti. Dimmi pure cosa ti serve! 💪`
          setMessages([{ role: 'assistant', content: greeting }])
          localStorage.setItem('assistant_greeted', 'true')
        }, 500)
      }
    }
    
    loadProfile()
  }, [])
  
  // Auto-scroll a ultimo messaggio
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return
    
    const userMessage = messageText.trim()
    setInput('')
    setLoading(true)
    setLastSuggestions([]) // nascondi suggerimenti precedenti mentre carica
    
    // Aggiungi messaggio utente
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      sendAbortRef.current?.abort()
      sendAbortRef.current = new AbortController()
      const signal = sendAbortRef.current.signal

      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error('Session expired')
      }
      if (signal.aborted) return

      // Determina stato app (cosa sta facendo il cliente)
      const appState = {
        completingMatch: currentPage.includes('/match/new'),
        viewingMatch: currentPage.includes('/match/') && !currentPage.includes('/match/new'),
        managingFormation: currentPage.includes('/gestione-formazione'),
        viewingDashboard: currentPage === '/'
      }

      // Storia conversazione (ultimi 10 messaggi, senza il messaggio corrente) per continuità come ChatGPT
      const history = messages
        .slice(-10)
        .map(({ role, content }) => ({ role, content: typeof content === 'string' ? content : String(content) }))
      
      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          currentPage,
          appState,
          language: lang,
          history
        })
      })
      if (signal.aborted) return

      if (!res.ok) {
        let errorBody = {}
        try {
          errorBody = await res.json()
        } catch (_) {
          // Risposta non JSON (es. 502/503 da Vercel)
        }
        const errMsg = errorBody?.error || (res.status === 503 ? (lang === 'en' ? 'Service temporarily unavailable. Try again.' : 'Servizio temporaneamente non disponibile. Riprova.') : 'Error generating response')
        throw new Error(errMsg)
      }
      
      const data = await res.json().catch((jsonError) => {
        console.error('[AssistantChat] JSON parse error:', jsonError)
        throw new Error('Invalid response from server')
      })
      if (signal.aborted) return

      // Verifica che data.response esista
      if (!data || !data.response) {
        console.error('[AssistantChat] Invalid response data:', data)
        throw new Error('Invalid response format')
      }

      // Aggiungi risposta AI (fallback doppia lingua); mostra modello usato (es. gpt-5 / gpt-4o)
      const fallbackNoResponse = lang === 'en' ? "Sorry, I didn't receive a valid response." : 'Mi dispiace, non ho ricevuto una risposta valida.'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || fallbackNoResponse,
        timestamp: new Date(),
        model_used: data.model_used || null
      }])
      setLastSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      setSuggestionsExpanded(false) // nuove risposta = suggerimenti collassati per non restringere la chat
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

    } catch (error) {
      if (error?.name === 'AbortError' || sendAbortRef.current?.signal.aborted) return
      console.error('[AssistantChat] Error:', error)
      const { message: friendlyMsg } = mapErrorToUserMessage(error, t('tryAgainInMoment'), lang)
      const errorMsg = `${t('errorChatGeneric')} ${friendlyMsg} 😔`
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }
  
  const handleQuickAction = (text) => {
    setInput(text)
    setTimeout(() => handleSend(text), 100)
  }

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError(t('voiceNotSupported'))
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      // Assicurati che l'input contenga solo il testo confermato
      setInput(confirmedTextRef.current)
      setInterimText('')
    } else {
      // Non cancellare l'input esistente, continua da dove eri
      confirmedTextRef.current = input.trim()
      setInterimText('')
      setVoiceError(null)
      try {
        recognitionRef.current?.start()
      } catch (err) {
        console.error('[AssistantChat] Failed to start recognition:', err)
        setVoiceError(t('voiceError'))
      }
    }
  }
  
  if (!isOpen) {
    // In modalità page, non mostrare il bottone fluttuante
    if (mode === 'page') return null
    if (isBlockedByCoachFeedback) return null
    
    return (
      <>
        <style jsx>{`
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 0.4; }
            100% { transform: scale(1.3); opacity: 0; }
          }
          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
          @keyframes chat-launcher-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 24px rgba(0, 212, 255, 0.5), inset 0 0 12px rgba(0, 212, 255, 0.25); }
            50% { transform: scale(1.06); box-shadow: 0 0 32px rgba(0, 212, 255, 0.7), inset 0 0 14px rgba(0, 212, 255, 0.35); }
          }
          .pulse-ring {
            position: absolute;
            inset: -5px;
            border-radius: 50%;
            border: 2px solid rgba(0, 212, 255, 0.6);
            animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            pointer-events: none;
          }
          .pulse-ring:nth-child(2) {
            animation-delay: 0.5s;
          }
          .chat-launcher {
            animation: chat-launcher-pulse 2s ease-in-out infinite;
          }
          .ai-badge {
            animation: pulse-dot 2s ease-in-out infinite;
          }
        `}</style>
        <button
          onClick={() => setIsOpen(true)}
          className="chat-launcher"
          style={{
            // Posizionamento fisso a destra in basso, sempre visibile
            position: 'fixed',
            right: '20px',
            bottom: isMobileViewport ? '100px' : '20px',
            width: isMobileViewport ? '56px' : '72px',
            height: isMobileViewport ? '56px' : '72px',
            borderRadius: '50%',
            background: '#050814',
            border: '2px solid rgba(0, 212, 255, 0.8)',
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(0, 212, 255, 0.5), inset 0 0 12px rgba(0, 212, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'visible',
            padding: 0
          }}
          onMouseEnter={(e) => {
            // Espansione solo su desktop (non su mobile)
            if (isMobileViewport) return
            e.currentTarget.style.width = '180px'
            e.currentTarget.style.borderRadius = '40px'
            e.currentTarget.style.animation = 'none'
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 212, 255, 0.8), inset 0 0 20px rgba(0, 212, 255, 0.4)'
            const label = e.currentTarget.querySelector('.chat-label')
            if (label) {
              label.style.opacity = '1'
              label.style.transform = 'translateX(0)'
            }
          }}
          onMouseLeave={(e) => {
            if (isMobileViewport) return
            e.currentTarget.style.width = '72px'
            e.currentTarget.style.borderRadius = '50%'
            e.currentTarget.style.animation = 'chat-launcher-pulse 2s ease-in-out infinite'
            e.currentTarget.style.boxShadow = '0 0 24px rgba(0, 212, 255, 0.5), inset 0 0 12px rgba(0, 212, 255, 0.3)'
            const label = e.currentTarget.querySelector('.chat-label')
            if (label) {
              label.style.opacity = '0'
              label.style.transform = 'translateX(-10px)'
            }
          }}
          onTouchStart={(e) => {
            // Su mobile: piccola animazione feedback, nessuna espansione
            const el = e.currentTarget
            el.style.transform = 'scale(0.95)'
          }}
          onTouchEnd={(e) => {
            const el = e.currentTarget
            el.style.transform = 'scale(1)'
          }}
          aria-label={t('openAssistant') || 'Apri assistente'}
        >
          {/* Anelli pulse */}
          <div className="pulse-ring" />
          <div className="pulse-ring" />
          
          {/* Container immagine */}
          <div style={{
            position: 'relative',
            width: isMobileViewport ? '56px' : '72px',
            height: isMobileViewport ? '56px' : '72px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            <img 
              src="/chat-button.png" 
              alt="AI Coach" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          
          {/* Label che appare on hover */}
          <span 
            className="chat-label"
            style={{
              position: 'absolute',
              left: isMobileViewport ? '72px' : '88px',
              whiteSpace: 'nowrap',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              opacity: 0,
              transform: 'translateX(-10px)',
              transition: 'all 0.3s ease',
              pointerEvents: 'none',
              textShadow: '0 0 10px rgba(0, 212, 255, 0.8)'
            }}
          >
            {t('askCoach') || 'Chiedi al Coach'}
          </span>
          
          {/* Badge AI */}
          <div 
            className="ai-badge"
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff 0%, #00a1a6 100%)',
              border: '2px solid #050814',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: '#000',
              boxShadow: '0 0 10px rgba(0, 212, 255, 0.8)',
              zIndex: 2
            }}
          >
            AI
          </div>
        </button>
      </>
    )
  }
  
  // Sfondo chat: immagine centrata (bicycle kick neon) + overlay per leggibilità
  const chatBgImage = "url('/backgrounds/chat-bicycle.png')"
  const chatBgOverlay = 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.88) 100%)'
  const chatBgCommon = {
    backgroundImage: `${chatBgOverlay}, ${chatBgImage}`,
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat'
  }

  // Stile per modalità page (full-screen) vs popup
  const isMobilePopup = mode !== 'page' && isMobileViewport
  const containerStyle = mode === 'page'
    ? {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '0',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...chatBgCommon
      }
    : (isMobileViewport
        ? {
            // Mobile: popup diventa fullscreen per essere realmente responsivo
            position: 'fixed',
            inset: 0,
            width: '100vw',
            // Fallback compatibilità: base 100vh, poi 100dvh via @supports (vedi style sotto)
            height: '100vh',
            border: 'none',
            borderRadius: '0',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10050,
            overflow: 'hidden',
            // Importantissimo per scroll in flex su iOS: permette ai figli scrollabili di ridursi
            minHeight: 0,
            ...chatBgCommon
          }
        : {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: 'clamp(320px, 90vw, 400px)',
            height: 'clamp(500px, 70vh, 600px)',
            border: '2px solid var(--neon-blue)',
            borderRadius: '16px',
            boxShadow: 'var(--glow-blue)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            ...chatBgCommon
          })
  
  return (
    <div style={containerStyle} className={isMobilePopup ? 'assistantchat-mobile' : undefined}>
      {isMobilePopup && (
        <style jsx global>{`
          .assistantchat-mobile {
            padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          @supports (height: 100dvh) {
            .assistantchat-mobile {
              height: 100dvh !important;
            }
          }
        `}</style>
      )}
      {/* Header */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(5, 8, 20, 0.95), rgba(13, 20, 40, 0.9))',
          borderBottom: '1px solid rgba(0, 212, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid rgba(0, 212, 255, 0.8)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
            flexShrink: 0
          }}>
            <img src="/chat-button.png" alt="AI Coach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', fontSize: '16px', textShadow: '0 0 8px rgba(0, 212, 255, 0.4)' }}>
              {userProfile?.ai_name || t('yourCoach') || t('yourCoachAI')}
            </div>
            {userProfile?.first_name && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                {t('assistantGreetingShort', { name: userProfile.first_name })}
              </div>
            )}
          </div>
        </div>
        {mode !== 'page' && (
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neon-cyan)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.8))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--neon-cyan)';
              e.currentTarget.style.filter = 'none';
            }}
            aria-label={t('closeAssistant') || 'Chiudi assistente'}
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
          // Mobile UX: evita che lo scroll "passi" alla pagina sotto
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.9 }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(0, 212, 255, 0.8)',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)'
            }}>
              <img src="/chat-button.png" alt="AI Coach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--neon-cyan)', marginBottom: '8px' }}>
              {userProfile?.first_name 
                ? (lang === 'en' 
                    ? `Hi ${userProfile.first_name}! How can I help you?` 
                    : `Ciao ${userProfile.first_name}! Come posso aiutarti?`)
                : (lang === 'en' 
                    ? 'Hi! How can I help you?' 
                    : 'Ciao! Come posso aiutarti?')
              }
            </div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>
              {lang === 'en' 
                ? 'Specific questions → better answers. Use suggestions or ask your own!' 
                : 'Domande specifiche → risposte migliori. Usa i suggerimenti o chiedi tu!'}
            </div>
          </div>
        )}
        {/* Mostra suggerimenti iniziali anche dopo il saluto (nessun messaggio utente ancora) — no typing */}
        {(() => {
          const hasOnlyGreeting = messages.length === 1 && messages[0]?.role === 'assistant'
          return hasOnlyGreeting && (
            <div style={{ fontSize: '12px', opacity: 0.7, padding: '4px 0', textAlign: 'center' }}>
              {lang === 'en' 
                ? 'The more details you give me, the more useful my advice' 
                : 'Più dettagli mi dai, più utili i miei consigli'}
            </div>
          )
        })()}
        
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            display: 'flex', 
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            gap: '8px',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%'
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1px solid rgba(0, 212, 255, 0.6)',
                flexShrink: 0,
                marginTop: '4px'
              }}>
                <img src="/chat-button.png" alt="AI Coach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.role === 'user' 
                  ? 'var(--neon-blue)'
                  : 'rgba(255, 255, 255, 0.1)',
                fontSize: '14px',
                lineHeight: '1.6',
                wordWrap: 'break-word',
                border: msg.role === 'assistant' ? '1px solid rgba(0, 212, 255, 0.3)' : 'none',
                color: msg.role === 'user' ? '#fff' : 'rgba(255, 255, 255, 0.9)',
                maxWidth: '100%'
              }}
            >
              {msg.role === 'assistant'
                ? <span style={{ display: 'block', maxWidth: '100%' }} dangerouslySetInnerHTML={renderRichText(msg.content)} />
                : msg.content
              }
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{ alignSelf: 'flex-start', opacity: 0.7 }}>
            <div style={{ display: 'flex', gap: '4px', padding: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: 'var(--neon-blue)', 
                animation: 'bounce 1s infinite' 
              }} />
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: 'var(--neon-blue)', 
                animation: 'bounce 1s infinite 0.2s' 
              }} />
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: 'var(--neon-blue)', 
                animation: 'bounce 1s infinite 0.4s' 
              }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggerimenti: riquadro collassabile. Mostrati all'apertura (0 messaggi) e dopo il saluto iniziale (1 messaggio = solo assistant), senza typing */}
      {(() => {
        const showInitialSuggestions = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant')
        return showInitialSuggestions
      })() && (
        <div style={{ borderTop: '1px solid rgba(0, 212, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)' }}>
          <button
            type="button"
            onClick={() => setSuggestionsExpanded(s => !s)}
            aria-expanded={suggestionsExpanded}
            aria-label={lang === 'en' ? 'Show or hide suggestions' : 'Mostra o nascondi suggerimenti'}
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neon-blue)',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--neon-blue)'; e.currentTarget.style.outlineOffset = '2px' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >
            <span>💡 {lang === 'en' ? 'Suggestions (3)' : 'Suggerimenti (3)'}</span>
            {suggestionsExpanded ? <ChevronUp size={16} color="var(--neon-blue)" /> : <ChevronDown size={16} color="var(--neon-blue)" />}
          </button>
          {suggestionsExpanded && (
            <div style={{ padding: '8px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {initialSuggestions.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAction(text)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid var(--neon-blue)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'white',
                    maxWidth: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                    e.currentTarget.style.boxShadow = 'var(--glow-blue)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {messages.length >= 2 && lastSuggestions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(0, 212, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)' }}>
          <button
            type="button"
            onClick={() => setSuggestionsExpanded(s => !s)}
            aria-expanded={suggestionsExpanded}
            aria-label={lang === 'en' ? 'Show or hide suggestions' : 'Mostra o nascondi suggerimenti'}
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neon-blue)',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--neon-blue)'; e.currentTarget.style.outlineOffset = '2px' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >
            <span>💡 {lang === 'en' ? 'Suggestions (3)' : 'Suggerimenti (3)'}</span>
            {suggestionsExpanded ? <ChevronUp size={16} color="var(--neon-blue)" /> : <ChevronDown size={16} color="var(--neon-blue)" />}
          </button>
          {suggestionsExpanded && (
            <div style={{ padding: '8px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lastSuggestions.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAction(text)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid var(--neon-blue)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'white',
                    maxWidth: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                    e.currentTarget.style.boxShadow = 'var(--glow-blue)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Input (bordo coerente con area messaggi e suggerimenti) */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid rgba(0, 212, 255, 0.2)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.5)',
          // Mobile: non far finire l'input dietro la bottom nav
          paddingBottom: isMobileViewport
            ? 'calc(16px + var(--bottom-nav-height, 80px) + env(safe-area-inset-bottom, 0px))'
            : '16px'
        }}
      >
        {/* Voice Button */}
        {(() => {
          const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
          if (!SpeechRecognition) return null
          
          return (
            <>
              <style jsx>{`
                @keyframes voice-recording {
                  0%, 100% { 
                    box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.4),
                                0 0 0 0 rgba(255, 59, 48, 0.2);
                  }
                  50% { 
                    box-shadow: 0 0 0 8px rgba(255, 59, 48, 0),
                                0 0 0 16px rgba(255, 59, 48, 0);
                  }
                }
                @keyframes sound-wave-bar {
                  0%, 100% { height: 4px; }
                  50% { height: 20px; }
                }
                .voice-btn {
                  position: relative;
                  overflow: visible !important;
                }
                .voice-btn.recording {
                  animation: voice-recording 1.5s ease-out infinite;
                }
                .sound-wave {
                  display: flex;
                  gap: 3px;
                  align-items: center;
                  height: 24px;
                }
                .sound-wave span {
                  width: 4px;
                  background: #FF3B30;
                  border-radius: 2px;
                  animation: sound-wave-bar 0.5s ease-in-out infinite;
                }
                .sound-wave span:nth-child(1) { animation-delay: 0s; }
                .sound-wave span:nth-child(2) { animation-delay: 0.1s; }
                .sound-wave span:nth-child(3) { animation-delay: 0.2s; }
                .sound-wave span:nth-child(4) { animation-delay: 0.3s; }
                .sound-wave span:nth-child(5) { animation-delay: 0.15s; }
              `}</style>
              <button
                onClick={toggleVoiceInput}
                disabled={loading}
                className={isListening ? 'voice-btn recording' : 'voice-btn'}
                style={{
                  padding: '12px 14px',
                  minWidth: '44px',
                  height: '44px',
                  background: isListening 
                    ? 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)' 
                    : 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)',
                  border: isListening 
                    ? '2px solid #FF3B30' 
                    : '2px solid rgba(0, 212, 255, 0.6)',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: isListening 
                    ? '0 0 20px rgba(255, 59, 48, 0.5)' 
                    : '0 0 10px rgba(0, 212, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && !isListening) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 161, 166, 0.2) 100%)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.9)'
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && !isListening) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 161, 166, 0.1) 100%)'
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.6)'
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.2)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
                aria-label={isListening ? t('voiceListening') : t('voiceInput')}
                title={isListening ? t('voiceListening') : t('voiceInput')}
              >
                {isListening ? (
                  <div className="sound-wave">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <Mic size={22} color="#00d4ff" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.8))' }} />
                )}
              </button>
            </>
          )
        })()}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={isListening ? (t('voiceListening') || 'Sto ascoltando... Parla ora') : (t('typeMessage') || 'Scrivi un messaggio...')}
          disabled={loading || isListening}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: isListening 
              ? 'rgba(255, 59, 48, 0.08)' 
              : 'rgba(255, 255, 255, 0.1)',
            border: isListening 
              ? '2px solid rgba(255, 59, 48, 0.6)' 
              : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            color: isListening && interimText ? '#FFB4B4' : 'white',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: isListening ? '0 0 15px rgba(255, 59, 48, 0.2) inset' : 'none'
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim() || isListening}
          style={{
            padding: '12px 16px',
            background: loading || !input.trim() || isListening
              ? 'rgba(255, 255, 255, 0.1)'
              : 'var(--neon-blue)',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || !input.trim() || isListening ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading && input.trim() && !isListening) {
              e.currentTarget.style.background = 'var(--neon-orange)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && input.trim() && !isListening) {
              e.currentTarget.style.background = 'var(--neon-blue)'
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
          aria-label={t('sendMessage') || 'Invia messaggio'}
        >
          <Send size={18} color="white" />
        </button>
      </div>
      
      {/* Voice Error Toast */}
      {voiceError && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 59, 48, 0.1)',
            borderTop: '1px solid rgba(255, 59, 48, 0.2)',
            color: '#FF3B30',
            fontSize: '12px',
            textAlign: 'center'
          }}
        >
          {voiceError}
        </div>
      )}
    </div>
  )
}
