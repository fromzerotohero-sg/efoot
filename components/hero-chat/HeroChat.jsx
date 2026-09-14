'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  SendHorizonal,
  Mic,
  MicOff,
  Plus,
  Gauge,
  Settings,
  Zap,
  X,
  Trophy,
  MessageSquareHeart,
  AlertCircle,
  Camera,
  ImagePlus,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { pickLang } from '@/lib/i18n'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import { resolveHomeState, resolveGreetingName } from '@/components/coach-v2/homeState'
import { daysSince, splitAdviceIntoTips, STATS_STALE_DAYS } from '@/lib/chatReadiness'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'

/**
 * HERO CHAT — superficie conversazionale principale (Home).
 * Reference visiva: 3 foto chat approvate dall'owner (dark premium, orb verde).
 * Motore: POST /api/assistant-chat (contratto reale esistente, 2 HP, suggestions).
 * Nessun dato fake: ogni card usa dati reali (rosa, knowledge score, stato Home).
 * Live/voce realtime: esclusa per decisione owner (resta il motore globale esistente).
 */

const GREETED_KEY = 'hero_chat_greeted_v1'

const MAX_ATTACH = 2
const MAX_ATTACH_BYTES = 1.8 * 1024 * 1024
const ATTACH_MAX_SIDE = 1200

const TIP_TITLES = [
  { it: 'Priorità', en: 'Priority', es: 'Prioridad' },
  { it: 'Azione', en: 'Action', es: 'Acción' },
  { it: 'Dettaglio', en: 'Detail', es: 'Detalle' }
]

const COPY = {
  online: { it: 'Online', en: 'Online', es: 'En línea' },
  heroTitle: { it: 'Parla con l’AI e porta il tuo gioco a un altro livello.', en: 'Talk to the AI and take your game to another level.', es: 'Habla con la IA y lleva tu juego a otro nivel.' },
  heroSub: { it: 'Tattiche. Rosa. Giocatori. Strategie. Sempre al tuo fianco.', en: 'Tactics. Squad. Players. Strategies. Always by your side.', es: 'Tácticas. Plantilla. Jugadores. Estrategias. Siempre a tu lado.' },
  placeholder: { it: 'Chat', en: 'Chat', es: 'Chat' },
  send: { it: 'Invia messaggio', en: 'Send message', es: 'Enviar mensaje' },
  micStart: { it: 'Parla', en: 'Speak', es: 'Hablar' },
  micStop: { it: 'Ferma dettatura', en: 'Stop dictation', es: 'Detener dictado' },
  listening: { it: 'Ti sto ascoltando…', en: 'Listening…', es: 'Escuchando…' },
  thinking: { it: 'Hero sta scrivendo…', en: 'Hero is typing…', es: 'Hero está escribiendo…' },
  knowledge: { it: 'Quanto ti conosce', en: 'How well it knows you', es: 'Cuánto te conoce' },
  starters: { it: 'titolari', en: 'starters', es: 'titulares' },
  knowledgeCardTitle: { it: 'Quanto Hero ti conosce', en: 'How well Hero knows you', es: 'Cuánto te conoce Hero' },
  knowledgeCardSub: { it: 'Dati reali usati per personalizzare i consigli.', en: 'Real data used to personalize advice.', es: 'Datos reales usados para personalizar los consejos.' },
  actions: { it: 'Azioni rapide', en: 'Quick actions', es: 'Acciones rápidas' },
  actionStats: { it: 'Aggiungi statistiche', en: 'Add game stats', es: 'Añadir estadísticas' },
  actionPrepare: { it: 'Prepara la prossima partita', en: 'Prepare the next match', es: 'Preparar el próximo partido' },
  actionCards: { it: 'Controlla una carta', en: 'Check a card', es: 'Revisar una carta' },
  actionFeedback: { it: 'Racconta l’ultima partita', en: 'Talk about the last match', es: 'Cuenta el último partido' },
  guidedQuestion: { it: 'Vuoi preparare una partita?', en: 'Do you want to prepare a match?', es: '¿Quieres preparar un partido?' },
  guidedQuestionSub: { it: 'Ti chiedo solo la foto della formazione avversaria. Poi penso io al piano.', en: 'I only need a screenshot of the opponent formation. Then I’ll build the plan.', es: 'Solo necesito una captura de la formación rival. Después preparo el plan.' },
  guidedYes: { it: 'Sì, prepariamola', en: 'Yes, let’s prepare it', es: 'Sí, preparémoslo' },
  guidedLater: { it: 'Non ora', en: 'Not now', es: 'Ahora no' },
  lowHp: { it: 'Saldo HP insufficiente per le azioni AI (costo standard: 2 HP).', en: 'Not enough HP for AI actions (standard cost: 2 HP).', es: 'HP insuficientes para acciones de IA (costo estándar: 2 HP).' },
  lowHpCta: { it: 'Ottieni HP', en: 'Get HP', es: 'Conseguir HP' },
  errorGeneric: { it: 'Qualcosa non ha funzionato. Riprova tra un momento.', en: 'Something went wrong. Try again in a moment.', es: 'Algo salió mal. Inténtalo de nuevo en un momento.' },
  feedbackBadge: { it: 'Stiamo analizzando la tua partita', en: 'We are reviewing your match', es: 'Estamos analizando tu partido' },
  feedbackCostNote: { it: '2 HP/messaggio', en: '2 HP/message', es: '2 HP/mensaje' },
  feedbackExit: { it: 'Torna alla chat normale', en: 'Back to normal chat', es: 'Volver al chat normal' },
  feedbackIntro: { it: 'Raccontami com’è andata la tua ultima partita. Cosa è andato bene? Cosa possiamo migliorare?', en: 'Tell me how your last match went. What went well? What can we improve?', es: 'Cuéntame cómo te fue en tu último partido. ¿Qué salió bien? ¿Qué podemos mejorar?' },
  saveCardTitle: { it: 'Vuoi che lo ricordi?', en: 'Want me to remember this?', es: '¿Quieres que lo recuerde?' },
  saveCardSub: { it: 'Salvo questa conversazione nella memoria e nella diagnosi di Hero. Il salvataggio costa 2 HP.', en: 'I’ll save this conversation into Hero’s memory and diagnosis. Saving costs 2 HP.', es: 'Guardaré esta conversación en la memoria y el diagnóstico de Hero. Guardar cuesta 2 HP.' },
  saveCardSave: { it: 'Salva', en: 'Save', es: 'Guardar' },
  saveCardSaving: { it: 'Salvataggio…', en: 'Saving…', es: 'Guardando…' },
  saveCardLater: { it: 'Non ora', en: 'Not now', es: 'Ahora no' },
  savedConfirm: { it: 'Fatto: l’ho salvato nella mia memoria e nella diagnosi. La prossima volta ne terrò conto.', en: 'Done: I saved it into my memory and diagnosis. I’ll keep it in mind next time.', es: 'Hecho: lo guardé en mi memoria y diagnóstico. Lo tendré en cuenta la próxima vez.' },
  saveError: { it: 'Non sono riuscito a salvare. Riprova.', en: 'I couldn’t save. Try again.', es: 'No pude guardar. Inténtalo de nuevo.' },
  greetingNamed: {
    it: (name) => `Ciao ${name}! Sono il tuo coach. Ti guido passo passo: rosa, statistiche, partite. Dimmi cosa vuoi fare — o tocca un’azione sotto.`,
    en: (name) => `Hi ${name}! I’m your coach. I’ll guide you step by step: squad, stats, matches. Tell me what you need — or tap an action below.`,
    es: (name) => `¡Hola ${name}! Soy tu coach. Te guío paso a paso: plantilla, estadísticas, partidos. Dime qué quieres — o toca una acción abajo.`
  },
  greetingReturningNamed: {
    it: (name) => `Bentornato ${name}. Cosa facciamo oggi?`,
    en: (name) => `Welcome back ${name}. What are we doing today?`,
    es: (name) => `Bienvenido de nuevo ${name}. ¿Qué hacemos hoy?`
  },
  attachCamera: { it: 'Scatta foto', en: 'Take photo', es: 'Hacer foto' },
  attachGallery: { it: 'Carica da galleria', en: 'Upload from gallery', es: 'Subir de la galería' },
  attachStatsMode: { it: 'Statistiche', en: 'Stats', es: 'Estadísticas' },
  attachCounterMode: { it: 'Contromisure', en: 'Countermeasures', es: 'Contramedidas' },
  attachStatsHint: { it: 'Foto Analisi eFootball (max 2)', en: 'eFootball Analysis screenshots (max 2)', es: 'Capturas de Análisis (máx. 2)' },
  attachAnalyze: { it: 'Analizza e salva', en: 'Analyze and save', es: 'Analizar y guardar' },
  counterAnalyze: { it: 'Crea contromisure', en: 'Build countermeasures', es: 'Crear contramedidas' },
  counterAnalyzing: { it: 'Sto leggendo l’assetto avversario…', en: 'Reading the opponent setup…', es: 'Leyendo el planteamiento rival…' },
  counterRequest: { it: 'Mandami lo screenshot della formazione avversaria: preparo qui il piano partita, senza aprire altre pagine.', en: 'Send me the opponent formation screenshot: I’ll build the match plan here, without opening another page.', es: 'Envíame la captura de la formación rival: prepararé aquí el plan de partido, sin abrir otras páginas.' },
  counterDone: { it: 'Piano pronto: controlla cosa cambierà prima di applicarlo.', en: 'Plan ready: review what will change before applying it.', es: 'Plan listo: revisa qué cambiará antes de aplicarlo.' },
  planTitle: { it: 'Piano contromisure', en: 'Countermeasure plan', es: 'Plan de contramedidas' },
  planApply: { it: 'Applica piano', en: 'Apply plan', es: 'Aplicar plan' },
  planApplying: { it: 'Applico in sicurezza…', en: 'Applying safely…', es: 'Aplicando de forma segura…' },
  planDismiss: { it: 'Non applicare', en: 'Do not apply', es: 'No aplicar' },
  planStyle: { it: 'Stile squadra', en: 'Team playstyle', es: 'Estilo de equipo' },
  planInstructions: { it: 'Istruzioni individuali', en: 'Individual instructions', es: 'Instrucciones individuales' },
  planSubstitutions: { it: 'Cambi consigliati', en: 'Suggested substitutions', es: 'Cambios sugeridos' },
  planManual: { it: 'Da verificare manualmente', en: 'Review manually', es: 'Revisar manualmente' },
  planApplied: { it: 'Piano applicato. Ho aggiornato le impostazioni valide e lasciato in evidenza ciò che richiede controllo manuale.', en: 'Plan applied. Valid settings were updated and anything requiring manual review is highlighted.', es: 'Plan aplicado. Actualicé los ajustes válidos y destaqué lo que requiere revisión manual.' },
  planError: { it: 'Non ho applicato modifiche. Controlla la formazione e riprova.', en: 'No changes were applied. Check your lineup and try again.', es: 'No se aplicaron cambios. Revisa tu alineación e inténtalo de nuevo.' },
  attachAnalyzing: { it: 'Sto leggendo le tue statistiche…', en: 'Reading your stats…', es: 'Leyendo tus estadísticas…' },
  attachDone: { it: 'Statistiche aggiornate. Ora posso consigliarti meglio.', en: 'Stats updated. I can advise you better now.', es: 'Estadísticas actualizadas. Ahora puedo aconsejarte mejor.' },
  attachError: { it: 'Non sono riuscito a leggere le foto. Riprova con screenshot più nitidi.', en: 'I couldn’t read the photos. Try clearer screenshots.', es: 'No pude leer las fotos. Prueba capturas más nítidas.' },
  tipExpand: { it: 'Approfondisci', en: 'Expand', es: 'Ampliar' },
  tipCollapse: { it: 'Riduci', en: 'Collapse', es: 'Reducir' },
  deepenAsk: { it: 'Spiegami meglio questo punto', en: 'Explain this point better', es: 'Explícame mejor este punto' },
  staleDays: {
    it: (n) => `${n} giorni che non aggiorni le statistiche. Con dati freschi i consigli sono più precisi.`,
    en: (n) => `${n} days since your last stats update. Fresh data makes advice sharper.`,
    es: (n) => `${n} días sin actualizar estadísticas. Datos frescos = consejos mejores.`
  },
  states: {
    NEW: {
      title: { it: 'Crea la tua rosa', en: 'Create your squad', es: 'Crea tu plantilla' },
      desc: { it: 'Mi servono i tuoi giocatori reali per aiutarti davvero.', en: 'I need your real players to really help you.', es: 'Necesito tus jugadores reales para ayudarte de verdad.' },
      cta: { it: 'Carica la rosa', en: 'Load your squad', es: 'Cargar plantilla' }
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
      desc: { it: 'Scatta o carica gli screenshot Analisi: lo facciamo qui in chat.', en: 'Take or upload Analysis screenshots — we do it here in chat.', es: 'Haz o sube capturas de Análisis: lo hacemos aquí en el chat.' },
      cta: { it: 'Apri fotocamera', en: 'Open camera', es: 'Abrir cámara' }
    },
    STALE_STATS: {
      title: { it: 'Statistiche da aggiornare', en: 'Stats need an update', es: 'Estadísticas por actualizar' },
      desc: { it: 'Sono giorni che non aggiorni le statistiche. Con dati freschi i consigli sono più precisi.', en: 'It’s been days since your last stats update. Fresh data makes advice sharper.', es: 'Hace días que no actualizas las estadísticas. Datos frescos = consejos mejores.' },
      cta: { it: 'Aggiorna ora', en: 'Update now', es: 'Actualizar ahora' }
    }
  }
}

function L(lang, entry) {
  return pickLang(lang, entry)
}

function Lfn(lang, entry, ...args) {
  const fn = pickLang(lang, entry)
  return typeof fn === 'function' ? fn(...args) : fn
}

function TipCards({ tips, lang, onDeepen }) {
  const [expanded, setExpanded] = React.useState({})
  if (!tips?.length) return null
  return (
    <div className="hc-tips">
      {tips.map((tip, idx) => {
        const open = !!expanded[tip.id]
        const title = L(lang, TIP_TITLES[idx] || TIP_TITLES[0])
        return (
          <div key={tip.id} className={`hc-tip${open ? ' hc-tipOpen' : ''}`}>
            <button
              type="button"
              className="hc-tipHead"
              onClick={() => setExpanded((p) => ({ ...p, [tip.id]: !p[tip.id] }))}
            >
              <span className="hc-tipBadge">{idx + 1}</span>
              <span className="hc-tipTitle">{title}</span>
              <span className="hc-tipToggle">{open ? L(lang, COPY.tipCollapse) : L(lang, COPY.tipExpand)}</span>
            </button>
            <p className={`hc-tipBody${open ? '' : ' hc-tipBodyClamp'}`}>{tip.body}</p>
            {open && (
              <button
                type="button"
                className="hc-tipDeepen"
                onClick={() => onDeepen?.(tip.body)}
              >
                {L(lang, COPY.deepenAsk)}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PrematchPlanCard({ plan, lang, applying, onApply, onDismiss }) {
  if (!plan) return null
  const changeSet = plan.change_set || {}
  const instructions = Object.values(changeSet.individual_instructions || {})
  const substitutions = Array.isArray(changeSet.substitutions) ? changeSet.substitutions : []
  const manual = Array.isArray(plan.apply_result?.manual_substitutions)
    ? plan.apply_result.manual_substitutions
    : []
  const applied = plan.status === 'applied'

  return (
    <div className="hc-planCard">
      <div className="hc-planHead">
        <Trophy size={16} aria-hidden="true" />
        <strong>{L(lang, COPY.planTitle)}</strong>
        <span className={`hc-planStatus${applied ? ' hc-planStatusDone' : ''}`}>
          {applied ? '✓' : 'Preview'}
        </span>
      </div>
      {changeSet.team_playing_style && (
        <div className="hc-planRow">
          <span className="hc-planLabel">{L(lang, COPY.planStyle)}</span>
          <strong>{changeSet.team_playing_style.replace(/_/g, ' ')}</strong>
        </div>
      )}
      {instructions.length > 0 && (
        <div className="hc-planSection">
          <span className="hc-planLabel">{L(lang, COPY.planInstructions)}</span>
          {instructions.map((item, index) => (
            <span key={`${item.player_id}-${index}`} className="hc-planChip">
              {item.player_name || item.player_id}: {item.instruction.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
      {substitutions.length > 0 && (
        <div className="hc-planSection">
          <span className="hc-planLabel">{L(lang, COPY.planSubstitutions)}</span>
          {substitutions.map((item, index) => (
            <span key={`${item.in_player_id}-${index}`} className="hc-planChip">
              {item.in_player_name || item.in_player_id} → {item.out_player_name || item.out_player_id}
            </span>
          ))}
        </div>
      )}
      {manual.length > 0 && (
        <div className="hc-planManual">
          <strong>{L(lang, COPY.planManual)}</strong>
          {manual.map((item, index) => (
            <span key={`${item.in_player_id}-${index}`}>
              {item.in_player_name || item.in_player_id} → {item.out_player_name || item.out_player_id}
            </span>
          ))}
        </div>
      )}
      {!applied && (
        <div className="hc-planActions">
          <button type="button" className="hc-stateBtn" onClick={onApply} disabled={applying}>
            {applying ? L(lang, COPY.planApplying) : L(lang, COPY.planApply)}
          </button>
          <button type="button" className="hc-saveLater" onClick={onDismiss} disabled={applying}>
            {L(lang, COPY.planDismiss)}
          </button>
        </div>
      )}
    </div>
  )
}

export default function HeroChat({
  lang,
  userProfile,
  stats,
  hasActiveCoach,
  recentMatches,
  gameAnalysisLastCapture,
  hpBalance,
  onStatsSuccess
}) {
  const router = useRouter()
  const heroName = userProfile?.ai_name || 'Hero Coach'
  const clientName = resolveGreetingName(userProfile)

  const [messages, setMessages] = React.useState([])
  const [feedCards, setFeedCards] = React.useState([]) // card ricche in-conversazione (dati reali)
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [actionsOpen, setActionsOpen] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const [knowledgeScore, setKnowledgeScore] = React.useState(null)
  // Modalita partita (Palestra dentro la chat): motore /api/coach-feedback-chat reale,
  // salvataggio /api/save-coach-feedback + /api/refresh-diagnostic. Nessun modulo separato.
  const [feedbackMode, setFeedbackMode] = React.useState(false)
  const [feedbackMessages, setFeedbackMessages] = React.useState([])
  const [feedbackSending, setFeedbackSending] = React.useState(false)
  const [saveState, setSaveState] = React.useState('idle') // idle | saving | saved | error
  const [attachments, setAttachments] = React.useState([]) // [{ id, dataUrl, name }]
  const [attachAnalyzing, setAttachAnalyzing] = React.useState(false)
  const [attachmentMode, setAttachmentMode] = React.useState('stats') // stats | counter
  const [threadId, setThreadId] = React.useState(null)
  const [historyLoading, setHistoryLoading] = React.useState(true)
  const [prematchPlan, setPrematchPlan] = React.useState(null)
  const [prematchApplying, setPrematchApplying] = React.useState(false)
  const [guidedPromptDismissed, setGuidedPromptDismissed] = React.useState(false)
  const recognitionRef = React.useRef(null)
  const feedRef = React.useRef(null)
  const cameraInputRef = React.useRef(null)
  const galleryInputRef = React.useRef(null)

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

  // Greeting one-shot: bolla Hero tradotta a render-time (segue la lingua corrente,
  // niente mix IT/ES quando l'utente cambia lingua dopo l'apertura).
  const [greetingVariant] = React.useState(() => {
    let greeted = false
    try {
      greeted = localStorage.getItem(GREETED_KEY) === '1'
    } catch { /* ignore */ }
    try {
      localStorage.setItem(GREETED_KEY, '1')
    } catch { /* ignore */ }
    return greeted ? 'returning' : 'first'
  })

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
  }, [messages, feedCards, sending, attachments, attachAnalyzing, feedbackMessages, feedbackSending])

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

  const persistMessages = React.useCallback(async (items) => {
    if (!Array.isArray(items) || !items.length) return
    try {
      const token = await resolveToken()
      if (!token) return
      const res = await fetch('/api/hero-chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          threadId,
          messages: items.map((item) => ({
            ...item,
            payload: {
              ...(item.payload || {}),
              kind: item.kind || item.payload?.kind || null,
              suggestions: item.suggestions || item.payload?.suggestions || null,
              tips: item.tips || item.payload?.tips || null,
              plan: item.plan || item.payload?.plan || null
            }
          }))
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.thread?.id && !threadId) setThreadId(data.thread.id)
    } catch {
      // La chat resta utilizzabile anche se la persistenza è temporaneamente offline.
    }
  }, [threadId])

  React.useEffect(() => {
    let cancelled = false
    const loadHistory = async () => {
      try {
        const token = await resolveToken()
        if (!token || cancelled) return
        const res = await fetch('/api/hero-chat?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) {
          setThreadId(data.thread?.id || null)
          if (Array.isArray(data.messages) && data.messages.length) {
            setMessages(data.messages)
          }
        }
      } catch {
        // Fallback naturale: la sessione continua in memoria.
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }
    loadHistory()
    return () => {
      cancelled = true
    }
  }, [])

  const sendMessage = React.useCallback(async (raw) => {
    const message = String(raw || '').trim()
    if (!message || sending) return
    stopListening()
    setActionsOpen(false)
    setGuidedPromptDismissed(true)

    const historyForApi = messages.slice(-10).map((m) => ({
      role: m.role === 'hero' ? 'assistant' : 'user',
      content: m.content
    }))

    setMessages((prev) => [...prev, { role: 'user', content: message }])
    void persistMessages([{ role: 'user', content: message }])
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
      const apiTips = Array.isArray(data.tips) ? data.tips.filter((t) => t?.body).slice(0, 3) : null
      const tips = apiTips?.length > 1 ? apiTips : splitAdviceIntoTips(answer, 3)
      const heroMessage = {
        role: 'hero',
        content: answer,
        suggestions,
        tips: tips.length > 1 ? tips : null
      }
      setMessages((prev) => [
        ...prev,
        heroMessage
      ])
      void persistMessages([heroMessage])

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.errorGeneric), kind: 'error' }])
    } finally {
      setSending(false)
    }
  }, [sending, messages, lang, router, stopListening, persistMessages])

  const enterFeedbackMode = React.useCallback(() => {
    setActionsOpen(false)
    setGuidedPromptDismissed(true)
    setFeedbackMode(true)
    setSaveState('idle')
    setFeedbackMessages([{ role: 'hero', content: L(lang, COPY.feedbackIntro) }])
  }, [lang])

  const exitFeedbackMode = React.useCallback(() => {
    setFeedbackMode(false)
    setFeedbackMessages([])
    setSaveState('idle')
  }, [])

  // Eventi globali: la chat Hero e l'unica superficie conversazionale.
  // 'open-assistant-chat' (deep link ?openAssistantChat=1, link "chiedi al coach")
  // pre-compila il composer; 'open-coach-feedback' apre la modalita partita (Palestra in chat).
  React.useEffect(() => {
    const onOpenAssistant = (event) => {
      const message = event?.detail?.message ? String(event.detail.message) : ''
      if (message) setInput(message)
      const el = feedRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
    const onOpenFeedback = () => enterFeedbackMode()
    window.addEventListener('open-assistant-chat', onOpenAssistant)
    window.addEventListener('open-coach-feedback', onOpenFeedback)
    return () => {
      window.removeEventListener('open-assistant-chat', onOpenAssistant)
      window.removeEventListener('open-coach-feedback', onOpenFeedback)
    }
  }, [enterFeedbackMode])

  const sendFeedbackMessage = React.useCallback(async (raw) => {
    const message = String(raw || '').trim()
    if (!message || feedbackSending) return
    stopListening()

    const historyForApi = feedbackMessages.slice(-10).map((m) => ({
      role: m.role === 'hero' ? 'assistant' : 'user',
      content: m.content
    }))

    setFeedbackMessages((prev) => [...prev, { role: 'user', content: message }])
    void persistMessages([{ role: 'user', content: message }])
    setInput('')
    setFeedbackSending(true)

    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/coach-feedback-chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, history: historyForApi, language: lang })
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 402 || data?.code === 'insufficient_credits') {
        setFeedbackMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.lowHp), kind: 'lowhp' }])
        return
      }

      if (!res.ok) {
        setFeedbackMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.errorGeneric), kind: 'error' }])
        return
      }

      const answer = data.response || L(lang, COPY.errorGeneric)
      const heroMessage = { role: 'hero', content: answer }
      setFeedbackMessages((prev) => [...prev, heroMessage])
      void persistMessages([heroMessage])

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }
    } catch {
      setFeedbackMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.errorGeneric), kind: 'error' }])
    } finally {
      setFeedbackSending(false)
    }
  }, [feedbackSending, feedbackMessages, lang, router, stopListening, persistMessages])

  // Salvataggio reale in chat: memoria + profilo + diagnosi (contratto esistente di CoachFeedbackChat).
  const handleSaveFeedback = React.useCallback(async () => {
    if (saveState === 'saving') return
    setSaveState('saving')
    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }

      const conversation = feedbackMessages.map((m) => ({
        role: m.role === 'hero' ? 'assistant' : 'user',
        content: m.content
      }))

      const res = await fetch('/api/save-coach-feedback', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation,
          session_type: lastMatch ? 'feedback' : 'update',
          match_id: lastMatch?.id || null
        })
      })

      if (!res.ok) {
        setSaveState('error')
        return
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
      }
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch { /* non bloccare */ }

      setSaveState('saved')
      setMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.savedConfirm) }])
      window.setTimeout(() => exitFeedbackMode(), 1600)
    } catch {
      setSaveState('error')
    }
  }, [saveState, feedbackMessages, lastMatch, lang, router, exitFeedbackMode])

  const addAttachmentFiles = React.useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f?.type?.startsWith('image/'))
    if (!files.length) return
    setActionsOpen(false)
    const next = [...attachments]
    for (const file of files) {
      if (next.length >= MAX_ATTACH) break
      try {
        const optimized = await optimizeImageFile(file, {
          maxBytes: MAX_ATTACH_BYTES,
          maxLongSide: ATTACH_MAX_SIDE
        })
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dataUrl: optimized.dataUrl,
          name: file.name || 'camera.jpg'
        })
      } catch {
        setMessages((prev) => [...prev, { role: 'hero', content: L(lang, COPY.attachError), kind: 'error' }])
      }
    }
    setAttachments(next.slice(0, MAX_ATTACH))
  }, [attachments, lang])

  const removeAttachment = React.useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const openCamera = React.useCallback(() => {
    setActionsOpen(false)
    cameraInputRef.current?.click()
  }, [])

  const openGallery = React.useCallback(() => {
    setActionsOpen(false)
    galleryInputRef.current?.click()
  }, [])

  const openStatsCamera = React.useCallback(() => {
    setAttachmentMode('stats')
    openCamera()
  }, [openCamera])

  const openStatsGallery = React.useCallback(() => {
    setAttachmentMode('stats')
    openGallery()
  }, [openGallery])

  const openCounterCamera = React.useCallback(() => {
    setAttachmentMode('counter')
    setActionsOpen(false)
    setMessages((prev) => [
      ...prev,
      { role: 'hero', content: L(lang, COPY.counterRequest), kind: 'system' }
    ])
    cameraInputRef.current?.click()
  }, [lang])

  const analyzeCountermeasureAttachment = React.useCallback(async (token, imageDataUrl) => {
    const extractRes = await fetch('/api/extract-formation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
      },
      body: JSON.stringify({ imageDataUrl })
    })
    const extractData = await extractRes.json().catch(() => ({}))
    if (!extractRes.ok) throw new Error(extractData.error || L(lang, COPY.attachError))

    const saveRes = await fetch('/api/supabase/save-opponent-formation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        formation_name: extractData.formation || null,
        playing_style: extractData.playing_style || null,
        extracted_data: {
          formation: extractData.formation || null,
          slot_positions: extractData.slot_positions || {},
          players: extractData.players || [],
          overall_strength: extractData.overall_strength || null,
          tactical_style: extractData.tactical_style || null,
          coach: extractData.coach || null,
          visual_tactical_profile: extractData.visual_tactical_profile || null
        },
        is_pre_match: true
      })
    })
    const saveData = await saveRes.json().catch(() => ({}))
    if (!saveRes.ok || !saveData.formation?.id) {
      throw new Error(saveData.error || L(lang, COPY.attachError))
    }

    const generateRes = await fetch('/api/generate-countermeasures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        opponent_formation_id: saveData.formation.id,
        language: lang
      })
    })
    const generateData = await generateRes.json().catch(() => ({}))
    if (!generateRes.ok || !generateData.success || !generateData.countermeasures) {
      throw new Error(generateData.error || L(lang, COPY.attachError))
    }

    const planRes = await fetch('/api/hero-chat/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        countermeasures: generateData.countermeasures,
        opponent_formation_id: saveData.formation.id,
        thread_id: threadId,
        language: lang,
        idempotency_key: `hero-${saveData.formation.id}-${Date.now()}`
      })
    })
    const planData = await planRes.json().catch(() => ({}))
    if (!planRes.ok || !planData.plan) {
      throw new Error(planData.error || L(lang, COPY.attachError))
    }
    return planData.plan
  }, [lang, threadId])

  const analyzeAttachments = React.useCallback(async () => {
    if (!attachments.length || attachAnalyzing) return
    setAttachAnalyzing(true)
    const processingMessage = {
      role: 'hero',
      content: attachmentMode === 'counter'
        ? L(lang, COPY.counterAnalyzing)
        : L(lang, COPY.attachAnalyzing),
      kind: 'system'
    }
    setMessages((prev) => [...prev, processingMessage])
    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }
      if (attachmentMode === 'counter') {
        const plan = await analyzeCountermeasureAttachment(token, attachments[0].dataUrl)
        setPrematchPlan(plan)
        setAttachments([])
        const doneMessage = {
          role: 'hero',
          content: L(lang, COPY.counterDone),
          kind: 'success',
          plan: plan.change_set || null
        }
        setMessages((prev) => [...prev.filter((m) => m.kind !== 'system'), doneMessage])
        void persistMessages([doneMessage])
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('credits-consumed'))
        }
        return
      }
      const res = await fetch('/api/extract-game-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
        },
        body: JSON.stringify({ imageDataUrls: attachments.map((a) => a.dataUrl) })
      })
      const data = await res.json().catch(() => ({}))
      const dropSystem = (prev) => prev.filter((m) => m.kind !== 'system')
      if (res.status === 402) {
        setMessages((prev) => [...dropSystem(prev), { role: 'hero', content: L(lang, COPY.lowHp), kind: 'lowhp' }])
        return
      }
      if (!res.ok || !data.success) {
        setMessages((prev) => [...dropSystem(prev), { role: 'hero', content: data.error || L(lang, COPY.attachError), kind: 'error' }])
        return
      }
      setAttachments([])
      const doneMessage = { role: 'hero', content: L(lang, COPY.attachDone), kind: 'success' }
      setMessages((prev) => [...dropSystem(prev), doneMessage])
      void persistMessages([doneMessage])
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        window.dispatchEvent(new CustomEvent('diagnostic-updated'))
      }
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch { /* non bloccare */ }
      try {
        await Promise.resolve(onStatsSuccess?.())
      } catch { /* non bloccare */ }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== 'system'),
        { role: 'hero', content: L(lang, COPY.attachError), kind: 'error' }
      ])
    } finally {
      setAttachAnalyzing(false)
    }
  }, [
    attachments,
    attachAnalyzing,
    attachmentMode,
    analyzeCountermeasureAttachment,
    lang,
    router,
    onStatsSuccess,
    persistMessages
  ])

  const applyPrematchPlan = React.useCallback(async () => {
    if (!prematchPlan?.id || prematchApplying) return
    setPrematchApplying(true)
    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch('/api/hero-chat/plans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: prematchPlan.id, action: 'apply' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || L(lang, COPY.planError))
      }
      setPrematchPlan(data.plan || prematchPlan)
      const appliedMessage = { role: 'hero', content: L(lang, COPY.planApplied), kind: 'success' }
      setMessages((prev) => [...prev, appliedMessage])
      void persistMessages([appliedMessage])
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('diagnostic-updated'))
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
      }
    } catch {
      const errorMessage = { role: 'hero', content: L(lang, COPY.planError), kind: 'error' }
      setMessages((prev) => [...prev, errorMessage])
      void persistMessages([errorMessage])
    } finally {
      setPrematchApplying(false)
    }
  }, [lang, persistMessages, prematchApplying, prematchPlan, router])

  const dismissPrematchPlan = React.useCallback(async () => {
    if (!prematchPlan?.id) return
    try {
      const token = await resolveToken()
      if (!token) return
      await fetch('/api/hero-chat/plans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: prematchPlan.id, action: 'dismiss' })
      })
    } finally {
      setPrematchPlan(null)
    }
  }, [prematchPlan])

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

  const statsAgeDays = daysSince(gameAnalysisLastCapture)
  const stateDesc =
    homeState === 'STALE_STATS' && statsAgeDays != null
      ? Lfn(lang, COPY.staleDays, Math.max(statsAgeDays, STATS_STALE_DAYS))
      : stateCopy
        ? L(lang, stateCopy.desc)
        : null

  const startChatPrompt = React.useCallback((message) => {
    setActionsOpen(false)
    setInput(message)
  }, [])

  const stateCta = (() => {
    switch (homeState) {
      case 'NEW':
        return () => startChatPrompt('Aiutami a caricare la mia rosa qui in chat, passo dopo passo.')
      case 'ROSTER_INCOMPLETE':
        return () => startChatPrompt('Aiutami a completare la mia rosa qui in chat.')
      case 'NO_COACH':
        return () => startChatPrompt('Aiutami a scegliere e configurare il mio allenatore qui in chat.')
      case 'POST_MATCH':
        return enterFeedbackMode
      case 'READY_NO_STATS':
        return openStatsCamera
      case 'STALE_STATS':
        return null
      default:
        return null
    }
  })()

  const quickActions = [
    { key: 'camera', icon: Camera, label: L(lang, COPY.attachCamera), run: openStatsCamera },
    { key: 'gallery', icon: ImagePlus, label: L(lang, COPY.attachGallery), run: openStatsGallery }
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
            <button
              type="button"
              className="hc-ringPill"
              aria-label={`${L(lang, COPY.knowledge)}: ${scoreRing.value}%`}
              title={L(lang, COPY.knowledge)}
              onClick={() => openFeedCard('knowledge')}
            >
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="13" cy="13" r="10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <circle
                  cx="13" cy="13" r="10" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={scoreRing.c} strokeDashoffset={scoreRing.offset} transform="rotate(-90 13 13)"
                />
              </svg>
              <span className="hc-ringValue">{scoreRing.value}%</span>
            </button>
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

        <div className="hc-row">
          <span className="hc-bubbleAvatar" aria-hidden="true">
            <img src="/coach.jpg" alt="" />
          </span>
          <div className="hc-bubble hc-bubbleHero">
            {greetingVariant === 'first'
              ? Lfn(lang, COPY.greetingNamed, clientName)
              : Lfn(lang, COPY.greetingReturningNamed, clientName)}
          </div>
        </div>

        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'hc-row hc-rowUser' : 'hc-row'}>
            {m.role === 'hero' && (
              <span className="hc-bubbleAvatar" aria-hidden="true">
                <img src="/coach.jpg" alt="" />
              </span>
            )}
            <div className={m.role === 'user' ? 'hc-bubble hc-bubbleUser' : `hc-bubble hc-bubbleHero${m.kind === 'error' || m.kind === 'lowhp' ? ' hc-bubbleWarn' : ''}${m.kind === 'success' ? ' hc-bubbleOk' : ''}`}>
              {m.kind === 'lowhp' && (
                <span className="hc-warnRow">
                  <AlertCircle size={14} aria-hidden="true" />
                  <button type="button" className="hc-lowHpCta" onClick={() => router.push('/gestione-profilo')}>
                    {L(lang, COPY.lowHpCta)}
                  </button>
                </span>
              )}
              {m.kind === 'success' && (
                <span className="hc-warnRow">
                  <CheckCircle2 size={14} aria-hidden="true" />
                </span>
              )}
              {m.tips?.length > 1 ? (
                <TipCards tips={m.tips} lang={lang} onDeepen={(body) => sendMessage(`${L(lang, COPY.deepenAsk)}: ${body}`)} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}

        {/* Modalita partita (Palestra in chat): badge + thread feedback reale */}
        {feedbackMode && (
          <div className="hc-feedbackBadge" role="status">
            <span className="hc-feedbackBadgeDot" aria-hidden="true" />
            <span className="hc-feedbackBadgeText">
              {L(lang, COPY.feedbackBadge)} · {L(lang, COPY.feedbackCostNote)}
            </span>
            <button type="button" className="hc-feedbackExit" onClick={exitFeedbackMode}>
              {L(lang, COPY.feedbackExit)}
            </button>
          </div>
        )}

        {feedbackMode && feedbackMessages.map((m, i) => (
          <div key={`fb-${i}`} className={m.role === 'user' ? 'hc-row hc-rowUser' : 'hc-row'}>
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

        {feedbackMode && feedbackSending && (
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

        {/* Card salvataggio memoria (consenso): solo se l'utente ha scritto qualcosa */}
        {feedbackMode && saveState !== 'saved' && feedbackMessages.some((m) => m.role === 'user') && (
          <div className="hc-saveCard">
            <p className="hc-stateTitle">{L(lang, COPY.saveCardTitle)}</p>
            <p className="hc-stateDesc">{L(lang, COPY.saveCardSub)}</p>
            {saveState === 'error' && <p className="hc-saveError">{L(lang, COPY.saveError)}</p>}
            <div className="hc-saveActions">
              <button
                type="button"
                className="hc-stateBtn"
                onClick={handleSaveFeedback}
                disabled={saveState === 'saving'}
              >
                {saveState === 'saving' ? L(lang, COPY.saveCardSaving) : L(lang, COPY.saveCardSave)}
              </button>
              <button type="button" className="hc-saveLater" onClick={exitFeedbackMode}>
                {L(lang, COPY.saveCardLater)}
              </button>
            </div>
          </div>
        )}

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
        {stateCopy && stateCta && !feedbackMode && (
          <div className="hc-stateCard">
            <p className="hc-stateTitle">{L(lang, stateCopy.title)}</p>
            <p className="hc-stateDesc">{stateDesc}</p>
            {homeState === 'ROSTER_INCOMPLETE' && stats && (
              <p className="hc-stateMeta">{L(lang, COPY.starters)}: {stats.titolari}/11</p>
            )}
            <button type="button" className="hc-stateBtn" onClick={stateCta}>
              {L(lang, stateCopy.cta)}
            </button>
          </div>
        )}

        {!feedbackMode && prematchPlan && (
          <PrematchPlanCard
            plan={prematchPlan}
            lang={lang}
            applying={prematchApplying}
            onApply={applyPrematchPlan}
            onDismiss={dismissPrematchPlan}
          />
        )}

        {/* Card ricche in-conversazione (dati reali) */}
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

        {/* Una sola domanda contestuale: Hero guida il primo passo senza creare un menu. */}
        {homeState === 'OPERATIONAL'
          && messages.length === 0
          && !guidedPromptDismissed
          && !prematchPlan
          && !feedbackMode && (
            <div className="hc-guidedCard">
              <div className="hc-guidedIcon"><Trophy size={18} aria-hidden="true" /></div>
              <div className="hc-guidedCopy">
                <strong>{L(lang, COPY.guidedQuestion)}</strong>
                <small>{L(lang, COPY.guidedQuestionSub)}</small>
              </div>
              <div className="hc-guidedActions">
                <button type="button" className="hc-guidedPrimary" onClick={openCounterCamera}>
                  {L(lang, COPY.guidedYes)}
                </button>
                <button type="button" className="hc-guidedSecondary" onClick={() => setGuidedPromptDismissed(true)}>
                  {L(lang, COPY.guidedLater)}
                </button>
              </div>
            </div>
          )}

        {/* Suggerimenti reali dal backend: solo dopo una risposta del coach. */}
        {activeSuggestions.length > 0 && !feedbackMode && (
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

      {/* Composer */}
      <div className="hc-composerWrap">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hc-fileHidden"
          onChange={(e) => {
            addAttachmentFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hc-fileHidden"
          onChange={(e) => {
            addAttachmentFiles(e.target.files)
            e.target.value = ''
          }}
        />
        {attachments.length > 0 && (
          <div className="hc-attachBar" role="region" aria-label={L(lang, COPY.attachStatsHint)}>
            <p className="hc-attachHint">
              {attachmentMode === 'counter' ? L(lang, COPY.actionPrepare) : L(lang, COPY.attachStatsHint)}
            </p>
            <div className="hc-attachModes" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={attachmentMode === 'stats'}
                className={`hc-attachMode${attachmentMode === 'stats' ? ' hc-attachModeActive' : ''}`}
                onClick={() => setAttachmentMode('stats')}
              >
                {L(lang, COPY.attachStatsMode)}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={attachmentMode === 'counter'}
                className={`hc-attachMode${attachmentMode === 'counter' ? ' hc-attachModeActive' : ''}`}
                onClick={() => setAttachmentMode('counter')}
              >
                {L(lang, COPY.attachCounterMode)}
              </button>
            </div>
            <div className="hc-attachThumbs">
              {attachments.map((a) => (
                <div key={a.id} className="hc-attachThumb">
                  <img src={a.dataUrl} alt="" />
                  <button type="button" className="hc-attachRemove" aria-label="X" onClick={() => removeAttachment(a.id)}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="hc-attachAnalyze"
              disabled={attachAnalyzing || lowHp}
              onClick={analyzeAttachments}
            >
              {attachAnalyzing
                ? (attachmentMode === 'counter' ? L(lang, COPY.counterAnalyzing) : L(lang, COPY.attachAnalyzing))
                : (attachmentMode === 'counter' ? L(lang, COPY.counterAnalyze) : L(lang, COPY.attachAnalyze))}
            </button>
          </div>
        )}
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
            if (feedbackMode) {
              sendFeedbackMessage(input)
            } else {
              sendMessage(input)
            }
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
            disabled={sending || attachAnalyzing || historyLoading}
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
            disabled={sending || attachAnalyzing || historyLoading || !input.trim()}
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
          color: var(--text-main);
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
          border: 2px solid var(--accent-border);
          display: block;
        }

        .hc-online {
          position: absolute;
          right: 0;
          bottom: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--shell-bg);
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
          color: var(--accent);
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
          background: var(--surface-2);
          border: 1px solid var(--border-soft);
          cursor: pointer;
          font-family: inherit;
        }

        .hc-ringPill:hover {
          border-color: var(--accent-border);
        }

        .hc-ringValue {
          font-size: 11px;
          font-weight: 800;
          color: var(--accent);
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
          background: var(--surface-2);
          border: 1px solid var(--border-soft);
          color: var(--text-dim);
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
          color: var(--accent);
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
          color: var(--text-dim);
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
          border: 1px solid var(--accent-border);
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
          background: var(--surface);
          border: 1px solid var(--border-softer);
          border-radius: 4px 16px 16px 16px;
          color: var(--text-main);
        }

        .hc-bubbleUser {
          background: linear-gradient(135deg, var(--accent-border), rgba(39, 167, 106, 0.18));
          border: 1px solid var(--accent-border);
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
          background: var(--accent);
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
          background: linear-gradient(150deg, var(--accent-bg), rgba(10, 20, 24, 0.6));
          border: 1px solid var(--accent-border);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hc-stateTitle {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: var(--text-main);
        }

        .hc-stateDesc {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-dim);
        }

        .hc-stateMeta {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          color: var(--accent);
        }

        .hc-stateBtn {
          align-self: flex-start;
          min-height: 44px;
          padding: 10px 18px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: var(--accent-ink);
          font-size: 14px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-richCard {
          border-radius: 16px;
          padding: 16px 18px;
          background: var(--surface);
          border: 1px solid var(--border-soft);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hc-richHead {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent);
        }

        .hc-richHead strong {
          flex: 1;
          font-size: 14px;
          color: var(--text-main);
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
          color: var(--text-dim);
          cursor: pointer;
        }


        .hc-richCta {
          align-self: flex-start;
          min-height: 40px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid var(--accent-border);
          background: var(--accent-bg);
          color: var(--accent);
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-richSub {
          margin: 0;
          font-size: 12px;
          color: var(--text-dim);
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
          border: 1px solid var(--accent-border);
          background: var(--accent-bg);
          color: var(--accent);
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
        }

        :global(.hc-guidedCard) {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border: 1px solid var(--accent-border);
          border-radius: 14px;
          background: linear-gradient(140deg, var(--accent-bg), rgba(255, 255, 255, 0.02));
        }

        :global(.hc-guidedIcon) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          color: var(--accent);
          background: rgba(255, 255, 255, 0.08);
        }

        :global(.hc-guidedCopy) {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        :global(.hc-guidedCopy strong) {
          font-size: 13px;
        }

        :global(.hc-guidedCopy small) {
          color: var(--text-dim);
          font-size: 11px;
          line-height: 1.35;
        }

        :global(.hc-guidedActions) {
          grid-column: 1 / -1;
          display: flex;
          gap: 8px;
        }

        :global(.hc-guidedPrimary),
        :global(.hc-guidedSecondary) {
          min-height: 36px;
          padding: 8px 12px;
          border-radius: 9px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        :global(.hc-guidedPrimary) {
          border: 1px solid var(--accent-border);
          background: var(--accent);
          color: var(--accent-ink);
        }

        :global(.hc-guidedSecondary) {
          border: 1px solid var(--border-soft);
          background: transparent;
          color: var(--text-dim);
        }

        .hc-feedbackBadge {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 999px;
          background: var(--accent-bg);
          border: 1px solid var(--accent-border);
        }

        .hc-feedbackBadgeDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
        }

        .hc-feedbackBadgeText {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
        }

        .hc-feedbackExit {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--accent-border);
          background: transparent;
          color: var(--accent);
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-saveCard {
          border-radius: 16px;
          padding: 16px 18px;
          background: linear-gradient(150deg, var(--accent-bg), rgba(10, 20, 24, 0.65));
          border: 1px solid var(--accent-border);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hc-saveActions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .hc-saveLater {
          min-height: 44px;
          padding: 10px 14px;
          border: none;
          background: transparent;
          color: var(--text-dim);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-saveError {
          margin: 0;
          font-size: 12px;
          color: #ff8a8a;
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
          background: var(--surface);
          border: 1px solid var(--border-soft);
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
          color: var(--text-main);
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
        }

        .hc-actionItem:hover {
          background: var(--accent-bg);
          color: var(--accent);
        }

        .hc-composer {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 54px;
          padding: 7px 8px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--border-soft);
        }

        .hc-composer:focus-within {
          border-color: var(--accent-border);
          box-shadow: 0 0 0 3px var(--accent-bg);
        }

        .hc-plusBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--border-soft);
          background: transparent;
          color: var(--text-dim);
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }

        .hc-plusBtnOpen {
          transform: rotate(45deg);
          color: var(--accent);
          border-color: var(--accent-border);
        }

        .hc-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: var(--text-main);
          font-size: 14px;
          font-family: inherit;
        }

        .hc-input::placeholder {
          color: var(--text-dim);
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
          color: var(--text-dim);
          cursor: pointer;
          flex-shrink: 0;
        }

        .hc-micBtnActive {
          color: var(--accent);
          background: var(--accent-bg);
          animation: hcMicPulse 1.4s ease-in-out infinite;
        }

        @keyframes hcMicPulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--accent-border); }
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
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: var(--accent-ink);
          cursor: pointer;
          flex-shrink: 0;
        }

        .hc-sendBtn:disabled {
          opacity: 0.4;
          cursor: default;
        }

        .hc-fileHidden {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .hc-bubbleOk {
          border-color: rgba(61, 220, 151, 0.35);
        }

        :global(.hc-tips) {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        :global(.hc-tip) {
          border-radius: 12px;
          border: 1px solid var(--border-soft);
          background: rgba(255, 255, 255, 0.03);
          padding: 10px 12px;
        }

        :global(.hc-tipHead) {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          border: none;
          background: transparent;
          color: inherit;
          font: inherit;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }

        :global(.hc-tipBadge) {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          background: var(--accent-bg);
          color: var(--accent);
          flex-shrink: 0;
        }

        :global(.hc-tipTitle) {
          flex: 1;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--accent);
        }

        :global(.hc-tipToggle) {
          font-size: 11px;
          color: var(--text-dim);
          font-weight: 600;
        }

        :global(.hc-tipBody) {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.45;
          color: var(--text-main);
          white-space: pre-wrap;
        }

        :global(.hc-tipBodyClamp) {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        :global(.hc-tipDeepen) {
          margin-top: 8px;
          border: none;
          background: transparent;
          color: var(--accent);
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
          padding: 0;
          cursor: pointer;
        }

        .hc-attachBar {
          margin: 0 0 8px;
          padding: 10px 12px;
          border-radius: 16px;
          border: 1px solid var(--border-soft);
          background: var(--surface);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hc-attachHint {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-dim);
        }

        .hc-attachModes {
          display: flex;
          gap: 6px;
        }

        .hc-attachMode {
          min-height: 30px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid var(--border-soft);
          background: transparent;
          color: var(--text-dim);
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-attachModeActive {
          color: var(--accent);
          border-color: var(--accent-border);
          background: var(--accent-bg);
        }

        .hc-attachThumbs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .hc-attachThumb {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border-soft);
        }

        .hc-attachThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hc-attachRemove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .hc-attachAnalyze {
          align-self: stretch;
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid var(--accent-border);
          background: var(--accent-bg);
          color: var(--accent);
          font-size: 13px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .hc-attachAnalyze:disabled {
          opacity: 0.5;
          cursor: default;
        }

        :global(.hc-planCard) {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid var(--accent-border);
          background: linear-gradient(145deg, rgba(61, 220, 151, 0.11), rgba(255, 255, 255, 0.03));
        }

        :global(.hc-planHead) {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent);
        }

        :global(.hc-planStatus) {
          margin-left: auto;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-dim);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        :global(.hc-planStatusDone) {
          color: var(--accent);
          background: var(--accent-bg);
        }

        :global(.hc-planRow),
        :global(.hc-planSection) {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          font-size: 13px;
        }

        :global(.hc-planLabel) {
          width: 100%;
          color: var(--text-dim);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        :global(.hc-planChip) {
          display: inline-flex;
          padding: 7px 9px;
          border-radius: 9px;
          background: rgba(0, 0, 0, 0.16);
          color: var(--text-main);
          font-size: 12px;
        }

        :global(.hc-planManual) {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 9px;
          border-radius: 10px;
          border: 1px solid rgba(255, 191, 0, 0.35);
          color: #ffd76a;
          font-size: 12px;
        }

        :global(.hc-planActions) {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hc-iconBtn:focus-visible,
        .hc-sendBtn:focus-visible,
        .hc-micBtn:focus-visible,
        .hc-plusBtn:focus-visible,
        .hc-stateBtn:focus-visible,
        .hc-richCta:focus-visible,
        .hc-suggestionPill:focus-visible,
        .hc-actionItem:focus-visible,
        .hc-lowHpCta:focus-visible {
          outline: 2px solid var(--accent);
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
