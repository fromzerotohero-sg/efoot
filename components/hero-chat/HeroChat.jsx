'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  SendHorizonal,
  Mic,
  MicOff,
  Plus,
  Users,
  Gauge,
  Settings,
  Zap,
  X,
  BarChart3,
  Trophy,
  Sparkles,
  MessageSquareHeart,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { pickLang } from '@/lib/i18n'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import { resolveHomeState } from '@/components/coach-v2/homeState'

/**
 * HERO CHAT — superficie conversazionale principale (Home).
 * Reference visiva: 3 foto chat approvate dall'owner (dark premium, orb verde).
 * Motore: POST /api/assistant-chat (contratto reale esistente, 2 HP, suggestions).
 * Nessun dato fake: ogni card usa dati reali (rosa, knowledge score, stato Home).
 * Live/voce realtime: esclusa per decisione owner (resta il motore globale esistente).
 */

const GREETED_KEY = 'hero_chat_greeted_v1'

const COPY = {
  online: { it: 'Online', en: 'Online', es: 'En línea' },
  heroTitle: { it: 'Parla con l’AI e porta il tuo gioco a un altro livello.', en: 'Talk to the AI and take your game to another level.', es: 'Habla con la IA y lleva tu juego a otro nivel.' },
  heroSub: { it: 'Tattiche. Rosa. Giocatori. Strategie. Sempre al tuo fianco.', en: 'Tactics. Squad. Players. Strategies. Always by your side.', es: 'Tácticas. Plantilla. Jugadores. Estrategias. Siempre a tu lado.' },
  greeting: { it: 'Ciao! 👋 Sono il tuo assistente di gioco. Posso aiutarti con giocatori, tattiche, formazioni e molto altro. Cosa vuoi sapere oggi?', en: 'Hi! 👋 I’m your game assistant. I can help with players, tactics, formations and much more. What do you want to know today?', es: '¡Hola! 👋 Soy tu asistente de juego. Puedo ayudarte con jugadores, tácticas, formaciones y mucho más. ¿Qué quieres saber hoy?' },
  placeholder: { it: 'Chat', en: 'Chat', es: 'Chat' },
  send: { it: 'Invia messaggio', en: 'Send message', es: 'Enviar mensaje' },
  micStart: { it: 'Parla', en: 'Speak', es: 'Hablar' },
  micStop: { it: 'Ferma dettatura', en: 'Stop dictation', es: 'Detener dictado' },
  listening: { it: 'Ti sto ascoltando…', en: 'Listening…', es: 'Escuchando…' },
  thinking: { it: 'Hero sta scrivendo…', en: 'Hero is typing…', es: 'Hero está escribiendo…' },
  roster: { it: 'Rosa', en: 'Squad', es: 'Plantilla' },
  knowledge: { it: 'Quanto ti conosce', en: 'How well it knows you', es: 'Cuánto te conoce' },
  rosterCardTitle: { it: 'La tua rosa', en: 'Your squad', es: 'Tu plantilla' },
  rosterCardCta: { it: 'Gestisci rosa', en: 'Manage squad', es: 'Gestionar plantilla' },
  starters: { it: 'titolari', en: 'starters', es: 'titulares' },
  reserves: { it: 'riserve', en: 'reserves', es: 'suplentes' },
  coachActive: { it: 'Allenatore attivo', en: 'Active coach', es: 'Entrenador activo' },
  coachMissing: { it: 'Allenatore da configurare', en: 'Coach to set up', es: 'Entrenador por configurar' },
  knowledgeCardTitle: { it: 'Quanto Hero ti conosce', en: 'How well Hero knows you', es: 'Cuánto te conoce Hero' },
  knowledgeCardSub: { it: 'Dati reali usati per personalizzare i consigli.', en: 'Real data used to personalize advice.', es: 'Datos reales usados para personalizar los consejos.' },
  actions: { it: 'Azioni rapide', en: 'Quick actions', es: 'Acciones rápidas' },
  actionStats: { it: 'Aggiungi statistiche', en: 'Add game stats', es: 'Añadir estadísticas' },
  actionPrepare: { it: 'Prepara la prossima partita', en: 'Prepare the next match', es: 'Preparar el próximo partido' },
  actionCards: { it: 'Controlla una carta', en: 'Check a card', es: 'Revisar una carta' },
  actionFeedback: { it: 'Racconta l’ultima partita', en: 'Talk about the last match', es: 'Cuenta el último partido' },
  lowHp: { it: 'Saldo HP insufficiente per le azioni AI (costo standard: 2 HP).', en: 'Not enough HP for AI actions (standard cost: 2 HP).', es: 'HP insuficientes para acciones de IA (costo estándar: 2 HP).' },
  lowHpCta: { it: 'Ottieni HP', en: 'Get HP', es: 'Conseguir HP' },
  errorGeneric: { it: 'Qualcosa non ha funzionato. Riprova tra un momento.', en: 'Something went wrong. Try again in a moment.', es: 'Algo salió mal. Inténtalo de nuevo en un momento.' },
  states: {
    NEW: {
      title: { it: 'Crea la tua rosa', en: 'Create your squad', es: 'Crea tu plantilla' },
      desc: { it: 'Mi servono i tuoi giocatori reali per aiutarti davvero.', en: 'I need your real players to really help you.', es: 'Necesito tus jugadores reales para ayudarte de verdad.' },
      cta: { it: 'Crea la tua rosa', en: 'Create your squad', es: 'Crear plantilla' }
    },
    ROSTER_INCOMPLETE: {
      title: { it: 'Completa la rosa', en: 'Complete your squad', es: 'Completa tu plantilla' },
      desc: { it: 'Ti mancano titolari per una formazione completa.', en: 'You are missing starters for a complete formation.', es: 'Te faltan titulares para una formación completa.' },
      cta: { it: 'Completa rosa', en: 'Complete squad', es: 'Completar plantilla' }
    },
    NO_COACH: {
      title: { it: 'Scegli il tuo allenatore', en: 'Choose your coach', es: 'Elige tu entrenador' },
      desc: { it: 'L’allenatore attivo cambia modulo, tattica e consigli.', en: 'The active coach changes formation, tactics and advice.', es: 'El entrenador activo cambia formación, táctica y consejos.' },
      cta: { it: 'Configura allenatore', en: 'Set up coach', es: 'Configurar entrenador' }
    },
    POST_MATCH: {
      title: { it: 'Raccontami com’è andata', en: 'Tell me how it went', es: 'Cuéntame cómo te fue' },
      desc: { it: 'Partita appena finita: due minuti di feedback rendono i consigli più tuoi.', en: 'Match just finished: two minutes of feedback make advice more yours.', es: 'Partido recién terminado: dos minutos de feedback hacen los consejos más tuyos.' },
      cta: { it: 'Raccontami com’è andata', en: 'Tell me how it went', es: 'Cuéntame cómo te fue' }
    },
    READY_NO_STATS: {
      title: { it: 'Aggiungi le statistiche di gioco', en: 'Add your game stats', es: 'Añade tus estadísticas' },
      desc: { it: 'Non servono per parlare con me, ma rendono i consigli più precisi.', en: 'Not required to talk to me, but they make advice sharper.', es: 'No hacen falta para hablar conmigo, pero hacen los consejos más precisos.' },
      cta: { it: 'Aggiungi statistiche', en: 'Add game stats', es: 'Añadir estadísticas' }
    }
  }
}

function L(lang, entry) {
  return pickLang(lang, entry)
}

export default function HeroChat({
  lang,
  userProfile,
  stats,
  hasActiveCoach,
  recentMatches,
  gameAnalysisLastCapture,
  hpBalance,
  onOpenFeedback,
  onOpenGameAnalysis
}) {
  const router = useRouter()
  const heroName = userProfile?.ai_name || 'Hero Coach'

  const [messages, setMessages] = React.useState([])
  const [feedCards, setFeedCards] = React.useState([]) // card ricche in-conversazione (dati reali)
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [actionsOpen, setActionsOpen] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const [knowledgeScore, setKnowledgeScore] = React.useState(null)
  const recognitionRef = React.useRef(null)
  const feedRef = React.useRef(null)

  const lastMatch = Array.isArray(recentMatches) && recentMatches.length > 0 ? recentMatches[0] : null
  const lastMatchRaw = lastMatch?.created_at || lastMatch?.match_date || null
  const lastMatchDate = lastMatchRaw ? new Date(lastMatchRaw) : null
  const lastMatchMinutesAgo =
    lastMatchDate && !isNaN(lastMatchDate.getTime())
      ? (Date.now() - lastMatchDate.getTime()) / (1000 * 60)
      : null

  const homeState = resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo })
  const stateCopy = COPY.states[homeState]
  const lowHp = typeof hpBalance === 'number' && Number.isFinite(hpBalance) && hpBalance < 2

  // Greeting one-shot: prima bolla Hero, poi la conversazione reale
  React.useEffect(() => {
    if (messages.length > 0) return
    let greeted = false
    try {
      greeted = localStorage.getItem(GREETED_KEY) === '1'
    } catch { /* ignore */ }
    setMessages([
      {
        role: 'hero',
        content: greeted
          ? L(lang, { it: 'Bentornato! Cosa facciamo oggi?', en: 'Welcome back! What are we doing today?', es: '¡Bienvenido de nuevo! ¿Qué hacemos hoy?' })
          : L(lang, COPY.greeting)
      }
    ])
    try {
      localStorage.setItem(GREETED_KEY, '1')
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Knowledge score reale per l'anello header (stesso endpoint di AIKnowledgeBar)
  React.useEffect(() => {
    let cancelled = false
    const fetchScore = async () => {
      try {
        let token = localStorage.getItem('auth_token')
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token || cancelled) return
        const res = await fetch('/api/ai-knowledge', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data = await res.json().catch(() => null)
        const score = Number(data?.score)
        if (!cancelled && Number.isFinite(score)) setKnowledgeScore(Math.round(score))
      } catch { /* anello non critico */ }
    }
    fetchScore()
    window.addEventListener('knowledge-should-refresh', fetchScore)
    return () => {
      cancelled = true
      window.removeEventListener('knowledge-should-refresh', fetchScore)
    }
  }, [])

  // Autoscroll del feed
  React.useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, feedCards, sending])

  // Mic: Web Speech API (stesso pattern di AssistantChat)
  const stopListening = React.useCallback(() => {
    try {
      recognitionRef.current?.stop?.()
    } catch { /* ignore */ }
    setListening(false)
  }, [])

  const toggleListening = React.useCallback(() => {
    if (listening) {
      stopListening()
      return
    }
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) return
    const recognition = new SR()
    recognition.lang = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'it-IT'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript
      }
      if (finalText) setInput((prev) => (prev ? `${prev} ${finalText}` : finalText))
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [listening, lang, stopListening])

  React.useEffect(() => () => stopListening(), [stopListening])

  const resolveToken = async () => {
    let token = localStorage.getItem('auth_token')
    if (!token && supabase) {
      const { data: session } = await supabase.auth.getSession()
      token = session?.session?.access_token
    }
    return token
  }

  const sendMessage = React.useCallback(async (raw) => {
    const message = String(raw || '').trim()
    if (!message || sending) return
    stopListening()
    setActionsOpen(false)

    const historyForApi = messages.slice(-10).map((m) => ({
      role: m.role === 'hero' ? 'assistant' : 'user',
      content: m.content
    }))

    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setInput('')
    setSending(true)

    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          currentPage: '/',
          appState: { surface: 'hero-home' },
          language: lang,
          history: historyForApi
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 402 || data?.code === 'insufficient_credits') {
        setMessages((prev) => [
          ...prev,
          { role: 'hero', content: L(lang, COPY.lowHp), kind: 'lowhp' }
        ])
        return
      }

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.errorGeneric), kind: 'error' }])
        return
      }

      const answer = data.response || data.answer || L(lang, COPY.errorGeneric)
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions.filter(Boolean).slice(0, 3) : []
      setMessages((prev) => [...prev, { role: 'hero', content: answer, suggestions }])

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.errorGeneric), kind: 'error' }])
    } finally {
      setSending(false)
    }
  }, [sending, messages, lang, router, stopListening])

  const openFeedCard = (cardId) => {
    setFeedCards((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]))
  }

  const lastHeroMessage = [...messages].reverse().find((m) => m.role === 'hero')
  const activeSuggestions = !sending && lastHeroMessage?.suggestions?.length ? lastHeroMessage.suggestions : []

  const scoreRing = (() => {
    if (typeof knowledgeScore !== 'number') return null
    const r = 10
    const c = 2 * Math.PI * r
    const p = Math.max(0, Math.min(100, knowledgeScore))
    return { c, offset: c * (1 - p / 100), value: p }
  })()

  const stateCta = (() => {
    switch (homeState) {
      case 'NEW':
      case 'ROSTER_INCOMPLETE':
        return () => router.push('/gestione-formazione')
      case 'NO_COACH':
        return () => router.push('/nuova-rosa-lab')
      case 'POST_MATCH':
        return onOpenFeedback
      case 'READY_NO_STATS':
        return onOpenGameAnalysis
      default:
        return null
    }
  })()

  const quickActions = [
    { key: 'stats', icon: BarChart3, label: L(lang, COPY.actionStats), run: () => onOpenGameAnalysis?.() },
    { key: 'prepare', icon: Trophy, label: L(lang, COPY.actionPrepare), run: () => router.push('/contromisure-pre-partita') },
    { key: 'cards', icon: Sparkles, label: L(lang, COPY.actionCards), run: () => router.push('/card-advisor-lab') },
    { key: 'feedback', icon: MessageSquareHeart, label: L(lang, COPY.actionFeedback), run: () => onOpenFeedback?.() }
  ]

  return (
    <div className="heroChat">
      {/* Header conversazione: identità Hero + HP reale + anello conoscenza + impostazioni */}
      <header className="hc-header">
        <div className="hc-identity">
          <span className="hc-avatarWrap">
            <img src="/coach.jpg" alt="" className="hc-avatar" />
            <span className="hc-online" aria-hidden="true" />
          </span>
          <span className="hc-nameBlock">
            <strong>{heroName}</strong>
            <small>{L(lang, COPY.online)}</small>
          </span>
        </div>
        <div className="hc-headerRight">
          {scoreRing && (
            <span className="hc-ringPill" aria-label={`${scoreRing.value}%`} title={L(lang, COPY.knowledge)}>
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="13" cy="13" r="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <circle
                  cx="13" cy="13" r="10" fill="none" stroke="#3ddc97" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={scoreRing.c} strokeDashoffset={scoreRing.offset} transform="rotate(-90 13 13)"
                />
              </svg>
              <span className="hc-ringValue">{scoreRing.value}%</span>
            </span>
          )}
          {typeof hpBalance === 'number' && (
            <span className="hc-hpPill">
              <Zap size={13} aria-hidden="true" />
              {hpBalance} HP
            </span>
          )}
          <button
            type="button"
            className="hc-iconBtn"
            aria-label={L(lang, { it: 'Impostazioni', en: 'Settings', es: 'Ajustes' })}
            title={L(lang, { it: 'Impostazioni', en: 'Settings', es: 'Ajustes' })}
            onClick={() => router.push('/impostazioni-profilo')}
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* Feed conversazione */}
      <div className="hc-feed" ref={feedRef}>
        {/* Banner Hero (reference foto 1) */}
        <div className="hc-banner">
          <p className="hc-bannerOverline">{L(lang, { it: 'Il tuo assistente di gioco', en: 'Your game assistant', es: 'Tu asistente de juego' })}</p>
          <h1 className="hc-bannerTitle">{L(lang, COPY.heroTitle)}</h1>
          <p className="hc-bannerSub">{L(lang, COPY.heroSub)}</p>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'hc-row hc-rowUser' : 'hc-row'}>
            {m.role === 'hero' && (
              <span className="hc-bubbleAvatar" aria-hidden="true">
                <img src="/coach.jpg" alt="" />
              </span>
            )}
            <div className={m.role === 'user' ? 'hc-bubble hc-bubbleUser' : `hc-bubble hc-bubbleHero${m.kind === 'error' || m.kind === 'lowhp' ? ' hc-bubbleWarn' : ''}`}>
              {m.kind === 'lowhp' && (
                <span className="hc-warnRow">
                  <AlertCircle size={14} aria-hidden="true" />
                  <button type="button" className="hc-lowHpCta" onClick={() => router.push('/gestione-profilo')}>
                    {L(lang, COPY.lowHpCta)}
                  </button>
                </span>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="hc-row">
            <span className="hc-bubbleAvatar" aria-hidden="true">
              <img src="/coach.jpg" alt="" />
            </span>
            <div className="hc-bubble hc-bubbleHero hc-thinking">
              <span className="hc-dot" /><span className="hc-dot" /><span className="hc-dot" />
              <span className="hc-srOnly">{L(lang, COPY.thinking)}</span>
            </div>
          </div>
        )}

        {/* Card di stato reale (setup/post-match/stats): una sola, mai fake */}
        {stateCopy && stateCta && (
          <div className="hc-stateCard">
            <p className="hc-stateTitle">{L(lang, stateCopy.title)}</p>
            <p className="hc-stateDesc">{L(lang, stateCopy.desc)}</p>
            {homeState === 'ROSTER_INCOMPLETE' && stats && (
              <p className="hc-stateMeta">{L(lang, COPY.starters)}: {stats.titolari}/11</p>
            )}
            <button type="button" className="hc-stateBtn" onClick={stateCta}>
              {L(lang, stateCopy.cta)}
            </button>
          </div>
        )}

        {/* Card ricche in-conversazione (dati reali) */}
        {feedCards.includes('roster') && (
          <div className="hc-richCard">
            <div className="hc-richHead">
              <Users size={16} aria-hidden="true" />
              <strong>{L(lang, COPY.rosterCardTitle)}</strong>
              <button type="button" className="hc-richClose" aria-label="X" onClick={() => setFeedCards((p) => p.filter((c) => c !== 'roster'))}>
                <X size={14} />
              </button>
            </div>
            <div className="hc-rosterRows">
              <span>{L(lang, COPY.starters)}: <strong>{stats?.titolari ?? 0}/11</strong></span>
              <span>{L(lang, COPY.reserves)}: <strong>{stats?.riserve ?? 0}</strong></span>
              <span>{hasActiveCoach ? L(lang, COPY.coachActive) : L(lang, COPY.coachMissing)}</span>
              {stats?.formation && <span>{stats.formation}</span>}
            </div>
            <button type="button" className="hc-richCta" onClick={() => router.push('/gestione-formazione')}>
              {L(lang, COPY.rosterCardCta)}
            </button>
          </div>
        )}

        {feedCards.includes('knowledge') && (
          <div className="hc-richCard">
            <div className="hc-richHead">
              <Gauge size={16} aria-hidden="true" />
              <strong>{L(lang, COPY.knowledgeCardTitle)}</strong>
              <button type="button" className="hc-richClose" aria-label="X" onClick={() => setFeedCards((p) => p.filter((c) => c !== 'knowledge'))}>
                <X size={14} />
              </button>
            </div>
            <AIKnowledgeBar variant="gauge" />
            <p className="hc-richSub">{L(lang, COPY.knowledgeCardSub)}</p>
          </div>
        )}

        {/* Suggerimenti reali dal backend */}
        {activeSuggestions.length > 0 && (
          <div className="hc-suggestions">
            {activeSuggestions.map((sug) => (
              <button key={sug} type="button" className="hc-suggestionPill" onClick={() => sendMessage(sug)}>
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LOW HP banner (solo saldo reale noto) */}
      {lowHp && (
        <div className="hc-lowHpBanner" role="status">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{L(lang, COPY.lowHp)}</span>
          <button type="button" className="hc-lowHpCta" onClick={() => router.push('/gestione-profilo')}>
            {L(lang, COPY.lowHpCta)}
          </button>
        </div>
      )}

      {/* Quick actions (reference foto 1: Rosa / Quanto ti conosce) */}
      <div className="hc-quickRow">
        <button type="button" className="hc-quickBtn" onClick={() => openFeedCard('roster')}>
          <Users size={16} aria-hidden="true" />
          {L(lang, COPY.roster)}
        </button>
        <button type="button" className="hc-quickBtn" onClick={() => openFeedCard('knowledge')}>
          <Gauge size={16} aria-hidden="true" />
          {L(lang, COPY.knowledge)}
        </button>
      </div>

      {/* Composer */}
      <div className="hc-composerWrap">
        {actionsOpen && (
          <div className="hc-actionsSheet" role="menu" aria-label={L(lang, COPY.actions)}>
            {quickActions.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.key}
                  type="button"
                  className="hc-actionItem"
                  onClick={() => {
                    setActionsOpen(false)
                    a.run()
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  {a.label}
                </button>
              )
            })}
          </div>
        )}
        <form
          className="hc-composer"
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
        >
          <button
            type="button"
            className={`hc-plusBtn${actionsOpen ? ' hc-plusBtnOpen' : ''}`}
            aria-label={L(lang, COPY.actions)}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((v) => !v)}
          >
            <Plus size={18} />
          </button>
          <input
            className="hc-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={L(lang, COPY.placeholder)}
            aria-label={L(lang, COPY.placeholder)}
            disabled={sending}
          />
          <button
            type="button"
            className={`hc-micBtn${listening ? ' hc-micBtnActive' : ''}`}
            aria-label={listening ? L(lang, COPY.micStop) : L(lang, COPY.micStart)}
            title={listening ? L(lang, COPY.listening) : L(lang, COPY.micStart)}
            onClick={toggleListening}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <button
            type="submit"
            className="hc-sendBtn"
            aria-label={L(lang, COPY.send)}
            disabled={sending || !input.trim()}
          >
            <SendHorizonal size={16} />
          </button>
        </form>
      </div>

      <style jsx>{`
        .heroChat {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          max-width: 860px;
          margin: 0 auto;
          width: 100%;
          color: #f4f6f7;
          position: relative;
        }

        .hc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 4px 12px;
          flex-shrink: 0;
        }

        .hc-identity {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .hc-avatarWrap {
          position: relative;
          flex-shrink: 0;
        }

        .hc-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(61, 220, 151, 0.4);
          display: block;
        }

        .hc-online {
          position: absolute;
          right: 0;
          bottom: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3ddc97;
          border: 2px solid #0a1117;
        }

        .hc-nameBlock {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .hc-nameBlock strong {
          font-size: 15px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hc-nameBlock small {
          font-size: 11px;
          color: #3ddc97;
          font-weight: 600;
        }

        .hc-headerRight {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .hc-ringPill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px 4px 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .hc-ringValue {
          font-size: 11px;
          font-weight: 800;
          color: #3ddc97;
        }

        .hc-hpPill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 203, 5, 0.09);
          border: 1px solid rgba(255, 203, 5, 0.28);
          color: #ffcb05;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .hc-iconBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: rgba(255, 255, 255, 0.65);
          cursor: pointer;
        }

        .hc-feed {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 2px 4px 10px;
          overscroll-behavior: contain;
        }

        .hc-banner {
          border-radius: 20px;
          padding: clamp(22px, 5vw, 34px);
          background:
            radial-gradient(circle at 82% 12%, rgba(61, 220, 151, 0.16), transparent 44%),
            radial-gradient(circle at 12% 88%, rgba(0, 168, 200, 0.12), transparent 40%),
            linear-gradient(150deg, #0e1a1d 0%, #0a1418 55%, #081014 100%);
          border: 1px solid rgba(61, 220, 151, 0.14);
        }

        .hc-bannerOverline {
          margin: 0 0 8px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(61, 220, 151, 0.65);
        }

        .hc-bannerTitle {
          margin: 0;
          font-size: clamp(22px, 5.4vw, 30px);
          font-weight: 850;
          line-height: 1.16;
          letter-spacing: -0.01em;
          color: #ffffff;
          max-width: 20ch;
        }

        .hc-bannerSub {
          margin: 10px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(244, 246, 247, 0.6);
        }

        .hc-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .hc-rowUser {
          justify-content: flex-end;
        }

        .hc-bubbleAvatar {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
        }

        .hc-bubbleAvatar img {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(61, 220, 151, 0.35);
          display: block;
        }

        .hc-bubble {
          max-width: min(78%, 560px);
          padding: 12px 15px;
          font-size: 14px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .hc-bubbleHero {
          background: #111c22;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 4px 16px 16px 16px;
          color: rgba(244, 246, 247, 0.92);
        }

        .hc-bubbleUser {
          background: linear-gradient(135deg, rgba(61, 220, 151, 0.22), rgba(39, 167, 106, 0.18));
          border: 1px solid rgba(61, 220, 151, 0.3);
          border-radius: 16px 4px 16px 16px;
          color: #eafaf2;
        }

        .hc-bubbleWarn {
          border-color: rgba(255, 191, 0, 0.35);
        }

        .hc-warnRow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          color: #ffd76a;
        }

        .hc-lowHpCta {
          padding: 4px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 203, 5, 0.5);
          background: rgba(255, 203, 5, 0.12);
          color: #ffcb05;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-thinking {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .hc-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(61, 220, 151, 0.8);
          animation: hcDotPulse 1.1s ease-in-out infinite;
        }

        .hc-dot:nth-child(2) { animation-delay: 0.18s; }
        .hc-dot:nth-child(3) { animation-delay: 0.36s; }

        .hc-srOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
        }

        @keyframes hcDotPulse {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }

        .hc-stateCard {
          border-radius: 16px;
          padding: 16px 18px;
          background: linear-gradient(150deg, rgba(61, 220, 151, 0.1), rgba(10, 20, 24, 0.6));
          border: 1px solid rgba(61, 220, 151, 0.22);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hc-stateTitle {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
        }

        .hc-stateDesc {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(244, 246, 247, 0.65);
        }

        .hc-stateMeta {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          color: #3ddc97;
        }

        .hc-stateBtn {
          align-self: flex-start;
          min-height: 44px;
          padding: 10px 18px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #3ddc97, #27a76a);
          color: #05231a;
          font-size: 14px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-richCard {
          border-radius: 16px;
          padding: 16px 18px;
          background: #0f171d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hc-richHead {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #3ddc97;
        }

        .hc-richHead strong {
          flex: 1;
          font-size: 14px;
          color: #ffffff;
        }

        .hc-richClose {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
        }

        .hc-rosterRows {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          font-size: 13px;
          color: rgba(244, 246, 247, 0.7);
        }

        .hc-rosterRows strong {
          color: #3ddc97;
        }

        .hc-richCta {
          align-self: flex-start;
          min-height: 40px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid rgba(61, 220, 151, 0.35);
          background: rgba(61, 220, 151, 0.1);
          color: #3ddc97;
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-richSub {
          margin: 0;
          font-size: 12px;
          color: rgba(244, 246, 247, 0.5);
        }

        .hc-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .hc-suggestionPill {
          min-height: 36px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(61, 220, 151, 0.25);
          background: rgba(61, 220, 151, 0.07);
          color: rgba(61, 220, 151, 0.95);
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
        }

        .hc-lowHpBanner {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin: 4px 4px 0;
          padding: 9px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 191, 0, 0.35);
          background: rgba(255, 191, 0, 0.08);
          color: #ffd76a;
          font-size: 12px;
          flex-shrink: 0;
        }

        .hc-lowHpBanner span {
          flex: 1;
          min-width: 180px;
        }

        .hc-quickRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 10px 4px 8px;
          flex-shrink: 0;
        }

        .hc-quickBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #101a20;
          color: rgba(244, 246, 247, 0.85);
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-quickBtn:hover {
          border-color: rgba(61, 220, 151, 0.4);
        }

        .hc-composerWrap {
          position: relative;
          flex-shrink: 0;
          padding: 0 4px 6px;
        }

        .hc-actionsSheet {
          position: absolute;
          left: 4px;
          bottom: calc(100% + 6px);
          min-width: 240px;
          border-radius: 14px;
          padding: 6px;
          background: #101a20;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 2px;
          z-index: 6;
        }

        .hc-actionItem {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
          padding: 8px 12px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: rgba(244, 246, 247, 0.85);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
        }

        .hc-actionItem:hover {
          background: rgba(61, 220, 151, 0.08);
          color: #3ddc97;
        }

        .hc-composer {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 54px;
          padding: 7px 8px;
          border-radius: 999px;
          background: #101a20;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .hc-composer:focus-within {
          border-color: rgba(61, 220, 151, 0.45);
          box-shadow: 0 0 0 3px rgba(61, 220, 151, 0.1);
        }

        .hc-plusBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: transparent;
          color: rgba(244, 246, 247, 0.7);
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }

        .hc-plusBtnOpen {
          transform: rotate(45deg);
          color: #3ddc97;
          border-color: rgba(61, 220, 151, 0.4);
        }

        .hc-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #f4f6f7;
          font-size: 14px;
          font-family: inherit;
        }

        .hc-input::placeholder {
          color: rgba(244, 246, 247, 0.35);
        }

        .hc-micBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: rgba(244, 246, 247, 0.6);
          cursor: pointer;
          flex-shrink: 0;
        }

        .hc-micBtnActive {
          color: #3ddc97;
          background: rgba(61, 220, 151, 0.12);
          animation: hcMicPulse 1.4s ease-in-out infinite;
        }

        @keyframes hcMicPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(61, 220, 151, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(61, 220, 151, 0.06); }
        }

        .hc-sendBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #3ddc97, #27a76a);
          color: #05231a;
          cursor: pointer;
          flex-shrink: 0;
        }

        .hc-sendBtn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .hc-iconBtn:focus-visible,
        .hc-quickBtn:focus-visible,
        .hc-sendBtn:focus-visible,
        .hc-micBtn:focus-visible,
        .hc-plusBtn:focus-visible,
        .hc-stateBtn:focus-visible,
        .hc-richCta:focus-visible,
        .hc-suggestionPill:focus-visible,
        .hc-actionItem:focus-visible,
        .hc-lowHpCta:focus-visible {
          outline: 2px solid rgba(61, 220, 151, 0.85);
          outline-offset: 2px;
        }

        @media (max-width: 767px) {
          .hc-banner {
            padding: 20px;
          }

          .hc-bubble {
            max-width: 86%;
          }
        }
      `}</style>
    </div>
  )
}
