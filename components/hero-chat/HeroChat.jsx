'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  SendHorizonal,
  Mic,
  MicOff,
  Plus,
  Gauge,
  Zap,
  X,
  Trophy,
  MessageSquareHeart,
  AlertCircle,
  Camera,
  ImagePlus,
  CheckCircle2,
  ClipboardList,
  ChevronLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { pickLang } from '@/lib/i18n'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import { resolveHomeState, resolveGreetingName } from '@/components/coach-v2/homeState'
import { daysSince, STATS_STALE_DAYS } from '@/lib/chatReadiness'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import ChatMarkdown from '@/components/hero-chat/ChatMarkdown'
import PrematchPitch from '@/components/hero-chat/PrematchPitch'
import { opponentVisualTrait, instructionLabel } from '@/lib/prematchCustomerPlan'
import { buildTacticalHistory } from '@/lib/coachSuggestionEngine'

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
  actionStats: { it: 'Carica statistiche', en: 'Upload stats', es: 'Cargar estadísticas' },
  actionPrepare: { it: 'Carica contromisure', en: 'Upload countermeasures', es: 'Cargar contramedidas' },
  actionMatch: { it: 'Carica partita', en: 'Upload match', es: 'Cargar partido' },
  actionFeedback: { it: 'Racconta l’ultima partita', en: 'Talk about the last match', es: 'Cuenta el último partido' },
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
    it: (name) => `Bentornato ${name}. Cosa vuoi fare oggi?`,
    en: (name) => `Welcome back ${name}. What would you like to do today?`,
    es: (name) => `Bienvenido de nuevo ${name}. ¿Qué quieres hacer hoy?`
  },
  attachCamera: { it: 'Scatta foto', en: 'Take photo', es: 'Hacer foto' },
  attachGallery: { it: 'Carica da galleria', en: 'Upload from gallery', es: 'Subir de la galería' },
  attachStatsMode: { it: 'Statistiche', en: 'Stats', es: 'Estadísticas' },
  attachCounterMode: { it: 'Contromisure', en: 'Countermeasures', es: 'Contramedidas' },
  attachStatsHint: { it: 'Foto Analisi eFootball (max 2)', en: 'eFootball Analysis screenshots (max 2)', es: 'Capturas de Análisis (máx. 2)' },
  attachAddPhoto: { it: 'Aggiungi foto', en: 'Add photo', es: 'Añadir foto' },
  attachAddGallery: { it: 'Scegli dalla galleria', en: 'Choose from gallery', es: 'Elegir de la galería' },
  attachAnalyze: { it: 'Analizza e salva', en: 'Analyze and save', es: 'Analizar y guardar' },
  counterAnalyze: { it: 'Crea contromisure', en: 'Build countermeasures', es: 'Crear contramedidas' },
  counterAnalyzing: { it: 'Sto leggendo l’assetto avversario…', en: 'Reading the opponent setup…', es: 'Leyendo el planteamiento rival…' },
  counterConfirming: { it: 'Sto preparando il piano sul tuo setup…', en: 'Building the plan on your setup…', es: 'Preparando el plan sobre tu setup…' },
  counterRequest: { it: 'Mandami una o due foto della formazione avversaria: preparo qui il piano pre-partita, senza aprire altre pagine.', en: 'Send me one or two photos of the opponent formation: I’ll build the pre-match plan here, without opening another page.', es: 'Envíame una o dos fotos de la formación rival: prepararé aquí el plan previo, sin abrir otras páginas.' },
  counterDone: { it: 'Piano pre-partita pronto. Applica il setup e tieni a mente le indicazioni iniziali.', en: 'Pre-match plan ready. Apply the setup and keep the starting tips in mind.', es: 'Plan previo listo. Aplica el setup y ten en cuenta las indicaciones iniciales.' },
  counterConfirmTitle: { it: 'Ho letto', en: 'I read', es: 'He leído' },
  counterConfirmHint: { it: 'Conferma il modulo oppure correggilo prima di generare il piano.', en: 'Confirm the formation or correct it before generating the plan.', es: 'Confirma el módulo o corrígelo antes de generar el plan.' },
  counterConfirmUncertain: { it: 'La foto non è chiarissima: correggi il modulo se serve, poi genera.', en: 'The photo is a bit unclear: correct the formation if needed, then generate.', es: 'La foto no está clara: corrige el módulo si hace falta y genera.' },
  counterConfirmCta: { it: 'Genera piano', en: 'Generate plan', es: 'Generar plan' },
  counterConfirmFix: { it: 'Modulo', en: 'Formation', es: 'Módulo' },
  planTitle: { it: 'Piano pre-partita', en: 'Pre-match plan', es: 'Plan previo' },
  planSaved: { it: 'Controlla il setup, poi entra in partita con una sola idea chiara.', en: 'Check the setup, then enter the match with one clear idea.', es: 'Comprueba la configuración y entra al partido con una sola idea clara.' },
  planRead: { it: 'Lettura avversario', en: 'Opponent read', es: 'Lectura del rival' },
  planStrengths: { it: 'Cosa fa bene', en: 'What they do well', es: 'Lo que hace bien' },
  planWeaknesses: { it: 'Dove attaccare', en: 'Where to attack', es: 'Dónde atacar' },
  planAttack: { it: 'Piano offensivo', en: 'Attacking plan', es: 'Plan ofensivo' },
  planDefend: { it: 'Piano difensivo', en: 'Defensive plan', es: 'Plan defensivo' },
  planAvoid: { it: 'Evita', en: 'Avoid', es: 'Evita' },
  planStyle: { it: 'Stile squadra', en: 'Team playstyle', es: 'Estilo de equipo' },
  planInstructions: { it: 'Istruzioni individuali', en: 'Individual instructions', es: 'Instrucciones individuales' },
  planSubstitutions: { it: 'Cambi consigliati', en: 'Suggested substitutions', es: 'Cambios sugeridos' },
  planManual: { it: 'Nel Game Plan', en: 'In Game Plan', es: 'En Game Plan' },
  planQuickTips: { it: 'Piano iniziale', en: 'Starting plan', es: 'Plan inicial' },
  planSteps: { it: 'Passaggi chiave', en: 'Key steps', es: 'Pasos clave' },
  planCountermeasures: { it: 'Contromisure', en: 'Countermeasures', es: 'Contramedidas' },
  planAttackLine: { it: 'Linea d’attacco', en: 'Attacking line', es: 'Línea de ataque' },
  planDefenseLine: { it: 'Linea difensiva', en: 'Defensive line', es: 'Línea defensiva' },
  planDecision: { it: 'Decisione', en: 'Decision', es: 'Decisión' },
  planOpponent: { it: 'Avversario', en: 'Opponent', es: 'Rival' },
  planSetup: { it: 'Imposta prima del calcio d’inizio', en: 'Set before kickoff', es: 'Configura antes del inicio' },
  planNoSetup: { it: 'Mantieni il setup attuale.', en: 'Keep your current setup.', es: 'Mantén la configuración actual.' },
  planWithBall: { it: 'Con palla', en: 'With the ball', es: 'Con balón' },
  planWithoutBall: { it: 'Senza palla', en: 'Without the ball', es: 'Sin balón' },
  planB: { it: 'Piano B', en: 'Plan B', es: 'Plan B' },
  planIf: { it: 'Se', en: 'If', es: 'Si' },
  planAskHero: { it: 'Continua con Hero', en: 'Continue with Hero', es: 'Continúa con Hero' },
  planGenerated: { it: 'Generato', en: 'Generated', es: 'Generado' },
  planOperations: { it: 'Apri setup e istruzioni', en: 'Open setup and instructions', es: 'Abrir configuración e instrucciones' },
  planNoCountermeasure: { it: 'Nessuna modifica necessaria: parti dal tuo assetto e segui i passaggi chiave.', en: 'No change needed: start from your shape and follow the key steps.', es: 'No hace falta cambiar: empieza con tu estructura y sigue los pasos clave.' },
  planDetails: { it: 'Perché questo piano?', en: 'Why this plan?', es: '¿Por qué este plan?' },
  attachAnalyzing: { it: 'Sto leggendo le tue statistiche…', en: 'Reading your stats…', es: 'Leyendo tus estadísticas…' },
  attachDone: { it: 'Statistiche aggiornate. Ora posso consigliarti meglio.', en: 'Stats updated. I can advise you better now.', es: 'Estadísticas actualizadas. Ahora puedo aconsejarte mejor.' },
  attachError: { it: 'Non sono riuscito a leggere le foto. Riprova con screenshot più nitidi.', en: 'I couldn’t read the photos. Try clearer screenshots.', es: 'No pude leer las fotos. Prueba capturas más nítidas.' },
  attachRead: { it: 'Leggi questa sezione', en: 'Read this section', es: 'Leer esta sección' },
  attachReadMore: { it: 'Aggiungi foto', en: 'Add photo', es: 'Añadir foto' },
  matchIntro: { it: 'Raccogliamo la partita dentro la chat. Ti guiderò foto per foto e non salverò nulla finché non mi dai conferma.', en: 'Let’s collect the match inside the chat. I’ll guide you photo by photo and won’t save anything until you confirm.', es: 'Recopilemos el partido dentro del chat. Te guiaré foto a foto y no guardaré nada hasta que confirmes.' },
  matchHomeQuestion: { it: 'Hai giocato in casa o fuori casa?', en: 'Did you play at home or away?', es: '¿Jugaste en casa o fuera?' },
  matchHome: { it: 'Casa', en: 'Home', es: 'Casa' },
  matchAway: { it: 'Fuori casa', en: 'Away', es: 'Fuera' },
  matchOpponent: { it: 'Contro chi hai giocato? (opzionale)', en: 'Who did you play against? (optional)', es: '¿Contra quién jugaste? (opcional)' },
  matchOpponentPlaceholder: { it: 'Nome avversario', en: 'Opponent name', es: 'Nombre del rival' },
  matchStartPhotos: { it: 'Inizia con le foto', en: 'Start with photos', es: 'Empezar con las fotos' },
  matchSetup: { it: 'Impostazione', en: 'Setup', es: 'Preparación' },
  matchSection: { it: 'Sezione', en: 'Section', es: 'Sección' },
  matchRead: { it: 'Letta', en: 'Read', es: 'Leída' },
  matchReady: { it: 'Pronta da leggere', en: 'Ready to read', es: 'Lista para leer' },
  matchOptional: { it: 'opzionale', en: 'optional', es: 'opcional' },
  matchSectionDone: { it: 'Sezione letta. Passiamo alla prossima.', en: 'Section read. Let’s move to the next one.', es: 'Sección leída. Pasemos a la siguiente.' },
  matchAllRead: { it: 'Ho letto tutte le sezioni. Controlla il riepilogo e conferma il salvataggio.', en: 'I’ve read all sections. Check the summary and confirm the save.', es: 'He leído todas las secciones. Revisa el resumen y confirma el guardado.' },
  matchSkip: { it: 'Salta per ora', en: 'Skip for now', es: 'Saltar por ahora' },
  matchBack: { it: 'Indietro', en: 'Back', es: 'Atrás' },
  matchContinue: { it: 'Mantieni e continua', en: 'Keep and continue', es: 'Mantener y continuar' },
  matchReviewSections: { it: 'Torna alle sezioni', en: 'Back to sections', es: 'Volver a las secciones' },
  matchExampleTitle: { it: 'Esempio schermata', en: 'Screenshot example', es: 'Ejemplo de pantalla' },
  matchExampleHint: { it: 'Tocca per ingrandire', en: 'Tap to enlarge', es: 'Toca para ampliar' },
  matchReview: { it: 'Rivedi partita', en: 'Review match', es: 'Revisar partido' },
  matchSave: { it: 'Conferma e salva partita', en: 'Confirm and save match', es: 'Confirmar y guardar partido' },
  matchSaving: { it: 'Salvataggio…', en: 'Saving…', es: 'Guardando…' },
  matchMin: { it: 'Per un’analisi utile servono almeno 3 sezioni lette.', en: 'At least 3 sections must be read for a useful analysis.', es: 'Se necesitan al menos 3 secciones leídas para un análisis útil.' },
  matchSaved: { it: 'Partita salvata. Ora posso collegare dati, pattern e feedback.', en: 'Match saved. I can now connect data, patterns and feedback.', es: 'Partido guardado. Ahora puedo conectar datos, patrones y feedback.' },
  matchAskFeedback: { it: 'Vuoi raccontarmi com’è andata? Così collego i numeri a quello che hai vissuto in partita.', en: 'Want to tell me how it went? I’ll connect the numbers to what you experienced.', es: '¿Quieres contarme cómo fue? Conectaré los datos con lo que viviste.' },
  showHistory: { it: 'Mostra conversazione precedente', en: 'Show previous conversation', es: 'Mostrar conversación anterior' },
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

const MATCH_SECTIONS = [
  {
    id: 'player_ratings',
    title: { it: 'Pagelle giocatori', en: 'Player ratings', es: 'Valoraciones de jugadores' },
    description: { it: 'La schermata post-partita con i voti dei giocatori. Puoi caricare una seconda foto per completare l’altra squadra.', en: 'The post-match screen with player ratings. You can add a second photo to complete the other team.', es: 'La pantalla postpartido con las valoraciones. Puedes añadir una segunda foto para completar el otro equipo.' },
    maxImages: 2
  },
  {
    id: 'team_stats',
    title: { it: 'Statistiche squadra', en: 'Team statistics', es: 'Estadísticas del equipo' },
    description: { it: 'La schermata con risultato, possesso, tiri, passaggi e statistiche della partita.', en: 'The screen with score, possession, shots, passes and match statistics.', es: 'La pantalla con resultado, posesión, tiros, pases y estadísticas.' },
    maxImages: 1
  },
  {
    id: 'attack_areas',
    title: { it: 'Aree di attacco', en: 'Attack areas', es: 'Zonas de ataque' },
    description: { it: 'La mappa che mostra da quali zone hai sviluppato gli attacchi.', en: 'The map showing where your attacks were developed.', es: 'El mapa que muestra desde qué zonas desarrollaste tus ataques.' },
    maxImages: 1
  },
  {
    id: 'ball_recovery_zones',
    title: { it: 'Zone di recupero palla', en: 'Ball recovery zones', es: 'Zonas de recuperación' },
    description: { it: 'La mappa con i punti in cui hai recuperato il pallone.', en: 'The map showing where you recovered the ball.', es: 'El mapa con los puntos donde recuperaste el balón.' },
    maxImages: 1
  },
  {
    id: 'formation_style',
    title: { it: 'Formazione e stile avversario', en: 'Opponent formation and style', es: 'Formación y estilo rival' },
    description: { it: 'La schermata con modulo, stile di gioco e forza della squadra avversaria.', en: 'The screen with the opponent formation, playstyle and team strength.', es: 'La pantalla con la formación, estilo de juego y fuerza del rival.' },
    maxImages: 1
  }
]

const MATCH_EXAMPLES = [
  {
    id: 'formation_style',
    src: '/examples/formation-upload/formazione-game-plan-esempio.png',
    caption: { it: 'Formazione e game plan', en: 'Formation and game plan', es: 'Formación y game plan' }
  }
]

function makeWorkflowId(type) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function mergePlayerRatingsData(listOfData) {
  const cliente = {}
  const avversario = {}
  for (const data of listOfData || []) {
    if (data?.cliente && typeof data.cliente === 'object') Object.assign(cliente, data.cliente)
    if (data?.avversario && typeof data.avversario === 'object') Object.assign(avversario, data.avversario)
  }
  if (!Object.keys(cliente).length && !Object.keys(avversario).length) return listOfData?.[0] || null
  return {
    cliente: Object.keys(cliente).length ? cliente : null,
    avversario: Object.keys(avversario).length ? avversario : null
  }
}

function L(lang, entry) {
  return pickLang(lang, entry)
}

function Lfn(lang, entry, ...args) {
  const fn = pickLang(lang, entry)
  return typeof fn === 'function' ? fn(...args) : fn
}

const COUNTER_FORMATIONS = [
  '4-3-3', '4-4-2', '4-2-1-3', '4-1-2-3', '4-3-1-2', '4-2-3-1', '4-1-4-1',
  '3-4-3', '3-5-2', '3-4-1-2', '3-1-4-2',
  '5-3-2', '5-4-1', '4-5-1', '4-1-3-2', '3-3-2-2', '4-2-2-2'
]

function PrematchPlanCard({
  plan,
  lang,
  starters = [],
  slotPositions = null,
  formationVariants = [],
  formation = null,
  onFollowup
}) {
  if (!plan) return null

  const raw = plan.countermeasures || {}
  const customer = raw.customer_plan || plan.change_set?.customer_plan || null
  const changeSet = plan.change_set || {}
  const setup = customer?.setup || {}
  const localized = (value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return L(lang, value) || ''
  }

  const diagnosis = localized(customer?.diagnosis)
    || localized(raw.play_summary?.match_key)
    || localized(raw.diagnosis)
    || L(lang, COPY.planTitle)
  const mainDecision = localized(customer?.main_decision) || diagnosis

  const trait = localized(customer?.opponent_read?.trait) || ''
  const opponentFormation = localized(customer?.opponent_read?.formation) || ''
  const teamStyle = setup.team_playing_style
    || changeSet.team_playing_style
    || null

  const playerSuggestions = (() => {
    const fromSetup = Array.isArray(setup.substitutions) ? setup.substitutions : []
    if (fromSetup.length) {
      return fromSetup.map((sub) => ({
        action: 'add_to_starting_xi',
        player_id: sub.in_player_id,
        player_name: sub.in_player_name,
        replace_player_id: sub.out_player_id,
        replace_player_name: sub.out_player_name,
        position: sub.position
      }))
    }
    const fromApi = Array.isArray(raw.countermeasures?.player_suggestions)
      ? raw.countermeasures.player_suggestions
      : []
    if (fromApi.length) return fromApi
    return (Array.isArray(changeSet.substitutions) ? changeSet.substitutions : []).map((sub) => ({
      action: 'add_to_starting_xi',
      player_id: sub.in_player_id,
      player_name: sub.in_player_name,
      replace_player_id: sub.out_player_id,
      replace_player_name: sub.out_player_name,
      position: sub.position
    }))
  })()

  const individualInstructions = (() => {
    const fromSetup = Array.isArray(setup.individual_instructions) ? setup.individual_instructions : []
    if (fromSetup.length) {
      return fromSetup.map((row) => ({
        ...row,
        instruction_label: row.instruction_label || instructionLabel(row.instruction, lang)
      }))
    }
    const fromApi = Array.isArray(raw.countermeasures?.individual_instructions)
      ? raw.countermeasures.individual_instructions
      : []
    if (fromApi.length) {
      return fromApi.map((row) => ({
        ...row,
        instruction_label: instructionLabel(row.instruction, lang)
      }))
    }
    return Object.entries(changeSet.individual_instructions || {}).map(([slot, row]) => ({
      slot,
      player_id: row?.player_id,
      player_name: row?.player_name,
      position: row?.position,
      instruction: row?.instruction,
      instruction_label: instructionLabel(row?.instruction, lang)
    }))
  })()

  const startingPlan = (() => {
    const fromCustomer = Array.isArray(customer?.starting_plan) ? customer.starting_plan : []
    if (fromCustomer.length) return fromCustomer.map((t) => localized(t)).filter(Boolean).slice(0, 3)
    const fromChange = Array.isArray(changeSet.starting_plan) ? changeSet.starting_plan : []
    return fromChange.map((t) => localized(t)).filter(Boolean).slice(0, 3)
  })()

  const countermeasures = customer?.countermeasures || {}
  const attackLines = Array.isArray(countermeasures.attack) ? countermeasures.attack : []
  const defenseLines = Array.isArray(countermeasures.defense) ? countermeasures.defense : []
  const setupActions = (() => {
    const fromCustomer = Array.isArray(customer?.setup_actions)
      ? customer.setup_actions.map((action) => ({
          label: localized(action?.label),
          value: localized(action?.value),
          detail: localized(action?.detail),
          status: action?.status || null
        })).filter((action) => action.label && action.value)
      : []
    if (fromCustomer.length) return fromCustomer.slice(0, 5)
    const fallback = []
    if (setup.formation) fallback.push({ label: L(lang, COPY.counterConfirmFix), value: localized(setup.formation) })
    if (teamStyle) fallback.push({ label: L(lang, COPY.planStyle), value: localized(teamStyle) })
    playerSuggestions.slice(0, 1).forEach((suggestion) => {
      const value = suggestion.replace_player_name && suggestion.player_name
        ? `${suggestion.replace_player_name} → ${suggestion.player_name}`
        : suggestion.player_name || suggestion.replace_player_name
      if (value) fallback.push({ label: L(lang, COPY.planSubstitutions), value })
    })
    individualInstructions.slice(0, 2).forEach((instruction) => {
      if (instruction.player_name && instruction.instruction_label) {
        fallback.push({ label: instruction.player_name, value: instruction.instruction_label })
      }
    })
    return fallback.slice(0, 5)
  })()
  const playbook = customer?.playbook || {}
  const phaseSteps = (value, fallbacks = []) => {
    const source = Array.isArray(value) ? value : value ? [value] : fallbacks
    return source.map((item) => localized(item)).filter(Boolean).slice(0, 2)
  }
  const withBall = phaseSteps(playbook.with_ball, [
    attackLines[0]?.title,
    startingPlan[0]
  ])
  const withoutBall = phaseSteps(playbook.without_ball, [
    defenseLines[0]?.title,
    startingPlan.find((tip) => !withBall.includes(tip))
  ])
  const avoid = localized(playbook.avoid) || ''
  const planB = customer?.plan_b || null
  const planBTrigger = localized(planB?.trigger)
  const planBAction = localized(planB?.action || planB)
  const followUps = (Array.isArray(customer?.follow_ups) ? customer.follow_ups : [])
    .map((item) => localized(item))
    .filter(Boolean)
    .slice(0, 3)
  const generatedAt = (() => {
    if (!plan.created_at) return ''
    const date = new Date(plan.created_at)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleTimeString(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  })()

  return (
    <div className="hc-planCard">
      <div className="hc-planHead">
        <Trophy size={16} aria-hidden="true" />
        <strong>{L(lang, COPY.planTitle)}</strong>
        {generatedAt ? (
          <span className="hc-planFreshness">{L(lang, COPY.planGenerated)} {generatedAt}</span>
        ) : null}
        <span className="hc-planStatus hc-planStatusDone">✓</span>
      </div>

      <div className="hc-planHero">
        <span className="hc-planEyebrow">{L(lang, COPY.planDecision)}</span>
        <strong>{mainDecision}</strong>
        {(opponentFormation || trait) ? (
          <p className="hc-planOpponent">
            <span>{L(lang, COPY.planOpponent)}</span>
            {[opponentFormation, trait].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>

      <PrematchPitch
        starters={starters}
        slotPositions={slotPositions}
        formationVariants={formationVariants}
        formation={setup.formation || formation}
        playerSuggestions={playerSuggestions}
        individualInstructions={individualInstructions}
        teamStyle={teamStyle}
        attackLine={attackLines[0] || null}
        defenseLine={defenseLines[0] || null}
        lang={lang}
      />

      <details className="hc-planOperations">
        <summary>{L(lang, COPY.planOperations)}</summary>
        <div className="hc-planOperationsBody">
      <section className="hc-planSetup" aria-label={L(lang, COPY.planSetup)}>
        <div className="hc-planSectionHead">
          <span className="hc-planQuickLabel">{L(lang, COPY.planSetup)}</span>
          <span>{L(lang, COPY.planManual)}</span>
        </div>
        {setupActions.length > 0 ? (
          <div className="hc-planSetupRows">
            {setupActions.map((action, index) => (
              <div className="hc-planSetupRow" key={`${action.label}-${index}`}>
                <span>{action.label}</span>
                <div>
                  <strong>{action.value}</strong>
                  {action.detail ? <small>{action.detail}</small> : null}
                </div>
                {action.status === 'keep' ? <small>✓</small> : null}
              </div>
            ))}
          </div>
        ) : <p className="hc-planEmpty">{L(lang, COPY.planNoSetup)}</p>}
      </section>

      {(withBall.length > 0 || withoutBall.length > 0) && (
        <div className="hc-planPlaybook">
          {withBall.length > 0 ? (
            <article className="hc-planPhase hc-planPhaseBall">
              <span>{L(lang, COPY.planWithBall)}</span>
              <ol>
                {withBall.map((step, index) => <li key={`with-ball-${index}`}>{step}</li>)}
              </ol>
            </article>
          ) : null}
          {withoutBall.length > 0 ? (
            <article className="hc-planPhase hc-planPhaseNoBall">
              <span>{L(lang, COPY.planWithoutBall)}</span>
              <ol>
                {withoutBall.map((step, index) => <li key={`without-ball-${index}`}>{step}</li>)}
              </ol>
            </article>
          ) : null}
          {avoid ? <p className="hc-planAvoid"><strong>{L(lang, COPY.planAvoid)}:</strong> {avoid}</p> : null}
        </div>
      )}

      {planBAction ? (
        <section className="hc-planB">
          <span>{L(lang, COPY.planB)}</span>
          {planBTrigger ? <p><small>{L(lang, COPY.planIf)}</small> {planBTrigger}</p> : null}
          <strong>{planBAction}</strong>
        </section>
      ) : null}

      {followUps.length > 0 && typeof onFollowup === 'function' ? (
        <section className="hc-planFollowups">
          <span>{L(lang, COPY.planAskHero)}</span>
          <div>
            {followUps.map((followup) => (
              <button type="button" key={followup} onClick={() => onFollowup(followup)}>
                {followup}
              </button>
            ))}
          </div>
        </section>
      ) : null}
        </div>
      </details>
    </div>
  )
}

function CounterConfirmCard({
  draft,
  lang,
  confirming,
  onConfirm
}) {
  const [formation, setFormation] = React.useState(draft?.formation || '')
  React.useEffect(() => {
    setFormation(draft?.formation || '')
  }, [draft?.formation, draft?.formationId])

  if (!draft) return null
  const uncertain = Boolean(draft.uncertain)
  const trait = draft.trait || ''
  const options = COUNTER_FORMATIONS.includes(formation) || !formation
    ? COUNTER_FORMATIONS
    : [formation, ...COUNTER_FORMATIONS]

  return (
    <div className="hc-counterConfirm">
      <div className="hc-counterConfirmHead">
        <Trophy size={16} aria-hidden="true" />
        <strong>
          {L(lang, COPY.counterConfirmTitle)}
          {formation ? ` ${formation}` : ''}
        </strong>
      </div>
      {trait ? <p className="hc-counterConfirmTrait">{trait}</p> : null}
      <p className="hc-counterConfirmHint">
        {L(lang, uncertain ? COPY.counterConfirmUncertain : COPY.counterConfirmHint)}
      </p>
      <label className="hc-counterConfirmLabel" htmlFor="hc-counter-formation">
        {L(lang, COPY.counterConfirmFix)}
      </label>
      <select
        id="hc-counter-formation"
        className="hc-counterConfirmSelect"
        value={formation}
        onChange={(e) => setFormation(e.target.value)}
        disabled={confirming}
      >
        {options.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <button
        type="button"
        className="hc-counterConfirmCta"
        disabled={confirming || !draft.formationId}
        onClick={() => onConfirm?.(formation)}
      >
        {confirming ? L(lang, COPY.counterConfirming) : L(lang, COPY.counterConfirmCta)}
      </button>
    </div>
  )
}

function MatchUploadCard({
  flow,
  lang,
  attachments,
  analyzing,
  lowHp,
  saving,
  onSide,
  onOpponentChange,
  onBegin,
  onCamera,
  onGallery,
  onRead,
  onSkip,
  onSave,
  onBack,
  onShowExample
}) {
  if (!flow) return null
  const completed = MATCH_SECTIONS.filter((section) => flow.data?.[section.id]).length
  const currentSection = MATCH_SECTIONS[flow.sectionIndex] || MATCH_SECTIONS[0]

  return (
    <div className="hc-matchCard">
      <div className="hc-matchHead">
        <ClipboardList size={17} aria-hidden="true" />
        <strong>{L(lang, COPY.actionMatch)}</strong>
        <span>
          {flow.phase === 'context'
            ? L(lang, COPY.matchSetup)
            : `${flow.phase === 'review' ? completed : flow.sectionIndex + 1}/${MATCH_SECTIONS.length}`}
        </span>
      </div>

      {flow.phase === 'context' && (
        <div className="hc-matchContext">
          <p className="hc-matchQuestion">{L(lang, COPY.matchHomeQuestion)}</p>
          <div className="hc-matchChoiceGrid">
            <button
              type="button"
              className={`hc-matchChoice${flow.isHome === true ? ' hc-matchChoiceActive' : ''}`}
              onClick={() => onSide(true)}
            >
              <span>⌂</span>
              {L(lang, COPY.matchHome)}
            </button>
            <button
              type="button"
              className={`hc-matchChoice${flow.isHome === false ? ' hc-matchChoiceActive' : ''}`}
              onClick={() => onSide(false)}
            >
              <span>✈</span>
              {L(lang, COPY.matchAway)}
            </button>
          </div>
          <label className="hc-matchLabel" htmlFor="hc-match-opponent">
            {L(lang, COPY.matchOpponent)}
          </label>
          <input
            id="hc-match-opponent"
            className="hc-matchOpponent"
            value={flow.opponentName}
            onChange={(event) => onOpponentChange(event.target.value)}
            placeholder={L(lang, COPY.matchOpponentPlaceholder)}
          />
          <button
            type="button"
            className="hc-matchPrimary"
            disabled={typeof flow.isHome !== 'boolean'}
            onClick={onBegin}
          >
            {L(lang, COPY.matchStartPhotos)}
          </button>
        </div>
      )}

      {flow.phase === 'upload' && (
        <div className="hc-matchUpload">
          <button type="button" className="hc-matchBack" onClick={onBack} disabled={analyzing}>
            <ChevronLeft size={16} aria-hidden="true" />
            {L(lang, COPY.matchBack)}
          </button>
          <div className="hc-matchProgress" aria-label={`${L(lang, COPY.matchSection)} ${flow.sectionIndex + 1} di ${MATCH_SECTIONS.length}`}>
            {MATCH_SECTIONS.map((section, index) => (
              <span
                key={section.id}
                className={`hc-matchProgressDot${index < flow.sectionIndex || flow.data?.[section.id] ? ' hc-matchProgressDone' : ''}${index === flow.sectionIndex ? ' hc-matchProgressCurrent' : ''}`}
              />
            ))}
          </div>
          <div className="hc-matchSectionMeta">
            <span>{L(lang, COPY.matchSection)} {flow.sectionIndex + 1}/{MATCH_SECTIONS.length}</span>
            {currentSection.maxImages > 1 && <span>max {currentSection.maxImages} foto</span>}
          </div>
          <h3>{L(lang, currentSection.title)}</h3>
          <p>{L(lang, currentSection.description)}</p>
          {(() => {
            const examples = MATCH_EXAMPLES.filter((ex) => ex.id === currentSection.id)
            if (examples.length === 0) return null
            return (
              <div className="hc-matchExamples">
                <span className="hc-matchExamplesLabel">{L(lang, COPY.matchExampleTitle)}</span>
                <div className="hc-matchExamplesGrid">
                  {examples.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      className="hc-matchExampleThumb"
                      onClick={() => onShowExample && onShowExample(ex)}
                      aria-label={L(lang, COPY.matchExampleHint)}
                    >
                      <img src={ex.src} alt={L(lang, ex.caption)} loading="lazy" />
                      <span className="hc-matchExampleCaption">{L(lang, ex.caption)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
          <div className="hc-matchUploadActions">
            <button type="button" className="hc-matchUploadButton" onClick={onCamera} disabled={analyzing}>
              <Camera size={18} aria-hidden="true" />
              {L(lang, COPY.attachCamera)}
            </button>
            <button type="button" className="hc-matchUploadButton" onClick={onGallery} disabled={analyzing}>
              <ImagePlus size={18} aria-hidden="true" />
              {L(lang, COPY.attachGallery)}
            </button>
          </div>
          {attachments.length > 0 && (
            <div className="hc-matchThumbs">
              {attachments.map((attachment) => (
                <img key={attachment.id} src={attachment.dataUrl} alt="" />
              ))}
            </div>
          )}
          <button type="button" className="hc-matchPrimary" onClick={onRead} disabled={!attachments.length || analyzing || lowHp}>
            {analyzing ? L(lang, COPY.attachAnalyzing) : L(lang, COPY.attachRead)}
          </button>
          <button type="button" className="hc-matchSkip" onClick={onSkip} disabled={analyzing}>
            {flow.data?.[currentSection.id] ? L(lang, COPY.matchContinue) : L(lang, COPY.matchSkip)}
          </button>
        </div>
      )}

      {flow.phase === 'review' && (
        <div className="hc-matchReview">
          <div className="hc-matchReviewIntro">
            <strong>{L(lang, COPY.matchReview)}</strong>
            <span>{flow.isHome ? L(lang, COPY.matchHome) : L(lang, COPY.matchAway)}{flow.opponentName ? ` · ${flow.opponentName}` : ''}</span>
          </div>
          <div className="hc-matchSummaryList">
            {MATCH_SECTIONS.map((section) => (
              <div key={section.id} className="hc-matchSummaryRow">
                <span className={flow.data?.[section.id] ? 'hc-matchSummaryOk' : 'hc-matchSummaryMissing'}>
                  {flow.data?.[section.id] ? '✓' : '–'}
                </span>
                <span>{L(lang, section.title)}</span>
                {!flow.data?.[section.id] && <small>{L(lang, COPY.matchOptional)}</small>}
              </div>
            ))}
          </div>
          <p className="hc-matchHint">{L(lang, COPY.matchMin)}</p>
          <button type="button" className="hc-matchBack hc-matchReviewBack" onClick={onBack} disabled={saving}>
            <ChevronLeft size={16} aria-hidden="true" />
            {L(lang, COPY.matchReviewSections)}
          </button>
          <button type="button" className="hc-attachAnalyze" onClick={onSave} disabled={saving || completed < 3}>
            {saving ? L(lang, COPY.matchSaving) : L(lang, COPY.matchSave)}
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
  starters = [],
  slotPositions = null,
  formationVariants = [],
  formation = null,
  hasActiveCoach,
  recentMatches,
  gameAnalysisLastCapture,
  statsUploadRequest = 0,
  hpBalance,
  onStatsSuccess
}) {
  const router = useRouter()
  const clientName = resolveGreetingName(userProfile)
  const greetUserKey = userProfile?.user_id || userProfile?.id || userProfile?.email || ''

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
  const [attachmentMode, setAttachmentMode] = React.useState('stats') // stats | counter | match
  const [matchFlow, setMatchFlow] = React.useState(null)
  const [matchSaving, setMatchSaving] = React.useState(false)
  const [exampleLightbox, setExampleLightbox] = React.useState(null)
  const [feedbackMatchId, setFeedbackMatchId] = React.useState(null)
  const [lastSavedMatchId, setLastSavedMatchId] = React.useState(null)
  const [threadId, setThreadId] = React.useState(null)
  const [historyLoading, setHistoryLoading] = React.useState(true)
  const [prematchPlan, setPrematchPlan] = React.useState(null)
  const [counterConfirmDraft, setCounterConfirmDraft] = React.useState(null)
  const [counterConfirming, setCounterConfirming] = React.useState(false)
  const [activeWorkflowId, setActiveWorkflowId] = React.useState(null)
  const recognitionRef = React.useRef(null)
  const feedRef = React.useRef(null)
  const cameraInputRef = React.useRef(null)
  const galleryInputRef = React.useRef(null)
  const autoCounterAnalyzeRef = React.useRef(false)
  const handledStatsUploadRequestRef = React.useRef(0)
  const stickToBottomRef = React.useRef(true)
  const pendingScrollRef = React.useRef(false)
  const suppressNextScrollRef = React.useRef(false)

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

  // Greeting one-shot per utente: niente card ultima partita, solo Bentornato {name}.
  const [greetingVariant, setGreetingVariant] = React.useState('returning')
  React.useEffect(() => {
    if (!greetUserKey) return
    const storageKey = `${GREETED_KEY}:${greetUserKey}`
    try {
      const greeted = localStorage.getItem(storageKey) === '1'
      setGreetingVariant(greeted ? 'returning' : 'first')
      localStorage.setItem(storageKey, '1')
    } catch { /* ignore */ }
  }, [greetUserKey])
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

  // Autoscroll solo se l'utente è vicino al fondo o ha appena inviato un messaggio
  React.useEffect(() => {
    const el = feedRef.current
    if (!el) return
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = distance < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  React.useEffect(() => {
    const el = feedRef.current
    if (!el) return
    if (suppressNextScrollRef.current) {
      suppressNextScrollRef.current = false
      return
    }
    if (pendingScrollRef.current || stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
      pendingScrollRef.current = false
    }
  }, [messages, sending, feedbackMessages, feedbackSending, matchFlow, attachments, attachAnalyzing, prematchPlan])

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
              workflowId: item.workflowId || item.payload?.workflowId || null,
              workflowType: item.workflowType || item.payload?.workflowType || null,
              matchId: item.matchId || item.payload?.matchId || null,
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
        const headers = { Authorization: `Bearer ${token}` }
        const [historyRes, plansRes] = await Promise.all([
          fetch('/api/hero-chat?limit=50', { headers, cache: 'no-store' }),
          fetch('/api/hero-chat/plans', { headers, cache: 'no-store' })
        ])
        const [historyData, plansData] = await Promise.all([
          historyRes.json().catch(() => ({})),
          plansRes.json().catch(() => ({}))
        ])
        if (!cancelled && historyRes.ok) {
          setThreadId(historyData.thread?.id || null)
          if (Array.isArray(historyData.messages) && historyData.messages.length) {
            // Il primo popolamento da storico non deve scrollare in fondo:
            // l'utente legge dall'alto (saluto → conversazione).
            suppressNextScrollRef.current = true
            setMessages(historyData.messages)
          }
        }
        if (!cancelled) {
          const latestCanonicalPlan = plansRes.ok && Array.isArray(plansData.plans)
            ? plansData.plans[0] || null
            : null
          const latestEmbeddedPlan = Array.isArray(historyData.messages)
            ? [...historyData.messages].reverse().find((message) => (
                (message.kind || message.payload?.kind) === 'plan' && message.plan
              ))?.plan || null
            : null
          setPrematchPlan((current) => latestCanonicalPlan || latestEmbeddedPlan || current)
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
    pendingScrollRef.current = true

    const historyForApi = buildTacticalHistory(messages, 10)

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
      const heroMessage = {
        role: 'hero',
        content: answer,
        suggestions
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

  const enterFeedbackMode = React.useCallback((matchId = null) => {
    setActionsOpen(false)
    setMatchFlow(null)
    setPrematchPlan(null)
    setAttachments([])
    setAttachmentMode('stats')
    const workflowId = makeWorkflowId('feedback')
    setActiveWorkflowId(workflowId)
    setFeedbackMode(true)
    setFeedbackMatchId(matchId || null)
    setSaveState('idle')
    setFeedbackMessages([{ role: 'hero', content: L(lang, COPY.feedbackIntro) }])
    const workflowMsg = {
      role: 'hero',
      content: '',
      kind: 'workflow_feedback',
      workflowId,
      workflowType: 'feedback',
      payload: { kind: 'workflow_feedback', workflowId, workflowType: 'feedback' }
    }
    pendingScrollRef.current = true
    setMessages((prev) => [...prev, workflowMsg])
    void persistMessages([workflowMsg])
  }, [lang, persistMessages])

  const exitFeedbackMode = React.useCallback(() => {
    setFeedbackMode(false)
    setFeedbackMatchId(null)
    setFeedbackMessages([])
    setPrematchPlan(null)
    setSaveState('idle')
    setActiveWorkflowId((id) => (String(id || '').startsWith('feedback') ? null : id))
  }, [])

  const beginFocusedAttachment = React.useCallback((mode = 'stats') => {
    setMatchFlow(null)
    setFeedbackMode(false)
    setFeedbackMessages([])
    setPrematchPlan(null)
    setAttachments([])
    const workflowId = makeWorkflowId(mode === 'counter' ? 'counter' : 'stats')
    setActiveWorkflowId(workflowId)
    setAttachmentMode(mode === 'counter' ? 'counter' : 'stats')
    const workflowMsg = {
      role: 'hero',
      content: '',
      kind: 'workflow_attach',
      workflowId,
      workflowType: mode === 'counter' ? 'counter' : 'stats',
      payload: {
        kind: 'workflow_attach',
        workflowId,
        workflowType: mode === 'counter' ? 'counter' : 'stats'
      }
    }
    pendingScrollRef.current = true
    setMessages((prev) => [...prev, workflowMsg])
    void persistMessages([workflowMsg])
    return workflowId
  }, [persistMessages])

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
    pendingScrollRef.current = true

    const historyForApi = feedbackMessages.slice(-10).map((m) => ({
      role: m.role === 'hero' ? 'assistant' : 'user',
      content: m.content
    }))

    setFeedbackMessages((prev) => [...prev, { role: 'user', content: message }])
    void persistMessages([{
      role: 'user',
      content: message,
      kind: 'workflow_feedback',
      workflowId: activeWorkflowId,
      workflowType: 'feedback',
      payload: { kind: 'workflow_feedback', workflowId: activeWorkflowId, workflowType: 'feedback' }
    }])
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
      const heroMessage = {
        role: 'hero',
        content: answer,
        kind: 'workflow_feedback',
        workflowId: activeWorkflowId,
        workflowType: 'feedback',
        payload: { kind: 'workflow_feedback', workflowId: activeWorkflowId, workflowType: 'feedback' }
      }
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
  }, [feedbackSending, feedbackMessages, lang, router, stopListening, persistMessages, activeWorkflowId])

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
          session_type: (feedbackMatchId || lastMatch) ? 'feedback' : 'update',
          match_id: feedbackMatchId || lastMatch?.id || null
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
  }, [saveState, feedbackMessages, feedbackMatchId, lastMatch, lang, router, exitFeedbackMode])

  const startMatchUpload = React.useCallback(() => {
    setActionsOpen(false)
    setFeedbackMode(false)
    setFeedbackMessages([])
    setPrematchPlan(null)
    setAttachments([])
    setAttachmentMode('match')
    const workflowId = makeWorkflowId('match')
    setActiveWorkflowId(workflowId)
    setMatchFlow({
      workflowId,
      phase: 'context',
      isHome: null,
      opponentName: '',
      sectionIndex: 0,
      data: {},
      result: null
    })
    const intro = { role: 'hero', content: L(lang, COPY.matchIntro), kind: 'system' }
    const workflowMsg = {
      role: 'hero',
      content: '',
      kind: 'workflow_match',
      workflowId,
      workflowType: 'match',
      payload: { kind: 'workflow_match', workflowId, workflowType: 'match' }
    }
    pendingScrollRef.current = true
    setMessages((prev) => [...prev, intro, workflowMsg])
    void persistMessages([intro, workflowMsg])
  }, [lang, persistMessages])

  const updateMatchOpponent = React.useCallback((opponentName) => {
    setMatchFlow((prev) => prev ? { ...prev, opponentName } : prev)
  }, [])

  const chooseMatchSide = React.useCallback((isHome) => {
    setMatchFlow((prev) => prev ? { ...prev, isHome } : prev)
  }, [])

  const beginMatchPhotos = React.useCallback(() => {
    setMatchFlow((prev) => {
      if (!prev || typeof prev.isHome !== 'boolean') return prev
      return { ...prev, phase: 'upload' }
    })
    setAttachments([])
  }, [])

  const openMatchCamera = React.useCallback(() => {
    setAttachmentMode('match')
    setActionsOpen(false)
    cameraInputRef.current?.click()
  }, [])

  const openMatchGallery = React.useCallback(() => {
    setAttachmentMode('match')
    setActionsOpen(false)
    galleryInputRef.current?.click()
  }, [])

  const addAttachmentFiles = React.useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f?.type?.startsWith('image/'))
    if (!files.length) return
    setActionsOpen(false)
    const next = [...attachments]
    const currentSection = matchFlow?.phase === 'upload' ? MATCH_SECTIONS[matchFlow.sectionIndex] : null
    const maxFiles = currentSection?.maxImages || MAX_ATTACH
    for (const file of files) {
      if (next.length >= maxFiles) break
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
    const nextAttachments = next.slice(0, maxFiles)
    setAttachments(nextAttachments)
    if (attachmentMode === 'counter' && nextAttachments.length > 0) {
      autoCounterAnalyzeRef.current = true
    }
  }, [attachments, attachmentMode, lang, matchFlow])

  const removeAttachment = React.useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const openCamera = React.useCallback(() => {
    setActionsOpen(false)
    cameraInputRef.current?.click()
  }, [])

  const openStatsWorkflow = React.useCallback(() => {
    beginFocusedAttachment('stats')
  }, [beginFocusedAttachment])

  const openStatsCamera = React.useCallback(() => {
    openStatsWorkflow()
    openCamera()
  }, [openStatsWorkflow, openCamera])

  React.useEffect(() => {
    if (statsUploadRequest <= 0 || handledStatsUploadRequestRef.current === statsUploadRequest) return
    handledStatsUploadRequestRef.current = statsUploadRequest
    openStatsWorkflow()
  }, [statsUploadRequest, openStatsWorkflow])

  const openCounterCamera = React.useCallback(() => {
    beginFocusedAttachment('counter')
    setCounterConfirmDraft(null)
    setActionsOpen(false)
    setMessages((prev) => [
      ...prev.filter((m) => m.kind !== 'counter_confirm'),
      { role: 'hero', content: L(lang, COPY.counterRequest), kind: 'system' }
    ])
    cameraInputRef.current?.click()
  }, [beginFocusedAttachment, lang])

  React.useEffect(() => {
    const onOpenCountermeasures = () => openCounterCamera()
    window.addEventListener('open-countermeasures', onOpenCountermeasures)
    return () => window.removeEventListener('open-countermeasures', onOpenCountermeasures)
  }, [openCounterCamera])

  const analyzeMatchAttachment = React.useCallback(async (token, imageDataUrls) => {
    const flow = matchFlow
    const section = flow?.phase === 'upload' ? MATCH_SECTIONS[flow.sectionIndex] : null
    if (!section) throw new Error(L(lang, COPY.attachError))

    const results = []
    let detectedResult = flow.result || null
    for (const imageDataUrl of imageDataUrls) {
      const extractRes = await fetch('/api/extract-match-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
        },
        body: JSON.stringify({
          imageDataUrl,
          section: section.id,
          is_home: flow.isHome
        })
      })
      const extractData = await extractRes.json().catch(() => ({}))
      if (!extractRes.ok) throw new Error(extractData.error || L(lang, COPY.attachError))
      results.push(extractData.data || {})
      if (typeof extractData.result === 'string' && extractData.result.trim()) {
        detectedResult = extractData.result.trim()
      }
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
    }

    const sectionData = section.id === 'player_ratings'
      ? mergePlayerRatingsData(results)
      : results[0] || null
    const isLast = flow.sectionIndex >= MATCH_SECTIONS.length - 1
    const nextFlow = {
      ...flow,
      phase: isLast ? 'review' : 'upload',
      sectionIndex: isLast ? flow.sectionIndex : flow.sectionIndex + 1,
      data: { ...flow.data, [section.id]: sectionData },
      result: detectedResult
    }
    setMatchFlow(nextFlow)
    setAttachments([])

    const message = {
      role: 'hero',
      content: L(lang, isLast ? COPY.matchAllRead : COPY.matchSectionDone),
      kind: 'success',
      payload: { matchSection: section.id }
    }
    setMessages((prev) => [...prev.filter((item) => item.kind !== 'system'), message])
    void persistMessages([message])
  }, [lang, matchFlow, persistMessages])

  const skipMatchSection = React.useCallback(() => {
    setMatchFlow((prev) => {
      if (!prev || prev.phase !== 'upload') return prev
      const isLast = prev.sectionIndex >= MATCH_SECTIONS.length - 1
      const sectionId = MATCH_SECTIONS[prev.sectionIndex].id
      const hasExistingData = Boolean(prev.data?.[sectionId])
      return {
        ...prev,
        phase: isLast ? 'review' : 'upload',
        sectionIndex: isLast ? prev.sectionIndex : prev.sectionIndex + 1,
        data: hasExistingData ? prev.data : { ...prev.data, [sectionId]: null }
      }
    })
    setAttachments([])
  }, [])

  const goBackMatchSection = React.useCallback(() => {
    setMatchFlow((prev) => {
      if (!prev) return prev
      if (prev.phase === 'review') {
        return { ...prev, phase: 'upload', sectionIndex: MATCH_SECTIONS.length - 1 }
      }
      if (prev.phase !== 'upload') return prev
      if (prev.sectionIndex <= 0) {
        return { ...prev, phase: 'context', sectionIndex: 0 }
      }
      return { ...prev, sectionIndex: prev.sectionIndex - 1 }
    })
    setAttachments([])
  }, [])

  const saveMatchFlow = React.useCallback(async () => {
    if (!matchFlow || matchFlow.phase !== 'review' || matchSaving) return
    const completedSections = MATCH_SECTIONS.filter((section) => matchFlow.data[section.id]).length
    if (completedSections < 3) {
      const message = { role: 'hero', content: L(lang, COPY.matchMin), kind: 'error' }
      setMessages((prev) => [...prev, message])
      void persistMessages([message])
      return
    }

    setMatchSaving(true)
    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }
      const teamStats = matchFlow.data.team_stats || null
      const matchResult = matchFlow.result || teamStats?.result || null
      const { result: _result, ...teamStatsWithoutResult } = teamStats || {}
      const stepImages = Object.fromEntries(
        Object.keys(matchFlow.data).map((key) => [key, 'uploaded'])
      )
      const matchData = {
        result: matchResult,
        opponent_name: matchFlow.opponentName.trim() || null,
        is_home: matchFlow.isHome,
        player_ratings: matchFlow.data.player_ratings || null,
        team_stats: Object.keys(teamStatsWithoutResult).length ? teamStatsWithoutResult : null,
        attack_areas: matchFlow.data.attack_areas || null,
        ball_recovery_zones: matchFlow.data.ball_recovery_zones || null,
        formation_played: matchFlow.data.formation_style?.formation_played || null,
        playing_style_played: matchFlow.data.formation_style?.playing_style_played || null,
        team_strength: matchFlow.data.formation_style?.team_strength || null,
        extracted_data: { stepData: matchFlow.data, stepImages }
      }
      const res = await fetch('/api/supabase/save-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ matchData })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.error || L(lang, COPY.errorGeneric))

      const savedMatchId = data.match?.id || null
      setLastSavedMatchId(savedMatchId)
      setFeedbackMatchId(savedMatchId)
      setMatchFlow(null)
      setActiveWorkflowId(null)
      setAttachmentMode('stats')
      const message = { role: 'hero', content: L(lang, COPY.matchSaved), kind: 'success' }
      const afterMsg = {
        role: 'hero',
        content: L(lang, COPY.matchAskFeedback),
        kind: 'after_match',
        matchId: savedMatchId,
        payload: { kind: 'after_match', matchId: savedMatchId }
      }
      setMessages((prev) => [...prev, message, afterMsg])
      void persistMessages([message, afterMsg])
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('match-saved'))
        window.dispatchEvent(new CustomEvent('diagnostic-updated'))
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
      }
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch { /* non bloccare il salvataggio */ }
    } catch {
      const message = { role: 'hero', content: L(lang, COPY.errorGeneric), kind: 'error' }
      setMessages((prev) => [...prev, message])
      void persistMessages([message])
    } finally {
      setMatchSaving(false)
    }
  }, [lang, matchFlow, matchSaving, persistMessages, router])

  const extractCountermeasureAttachment = React.useCallback(async (token, imageDataUrls) => {
    const extractRes = await fetch('/api/extract-formation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
      },
      body: JSON.stringify({ imageDataUrls })
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

    const profile = extractData.visual_tactical_profile || null
    const conf = Number(profile?.formation_confidence)
    const uncertain = !extractData.formation
      || (Number.isFinite(conf) && conf < 0.55)
      || (Array.isArray(profile?.uncertain_points) && profile.uncertain_points.length > 0)

    return {
      formationId: saveData.formation.id,
      formation: extractData.formation || saveData.formation.formation_name || '',
      trait: opponentVisualTrait(profile, lang),
      uncertain,
      profile
    }
  }, [lang])

  const generateCountermeasurePlan = React.useCallback(async (token, formationId, correctedFormation) => {
    const generateRes = await fetch('/api/generate-countermeasures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        opponent_formation_id: formationId,
        language: lang,
        corrected_formation: correctedFormation || undefined
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
        opponent_formation_id: formationId,
        thread_id: threadId,
        language: lang,
        idempotency_key: `hero-${formationId}-${Date.now()}`
      })
    })
    const planData = await planRes.json().catch(() => ({}))
    if (!planRes.ok || !planData.plan) {
      throw new Error(planData.error || L(lang, COPY.attachError))
    }
    return planData.plan
  }, [lang, threadId])

  const confirmCountermeasureDraft = React.useCallback(async (correctedFormation, draftOverride = null) => {
    const draft = draftOverride || counterConfirmDraft
    if (!draft?.formationId || counterConfirming) return
    setCounterConfirming(true)
    const processingMessage = {
      role: 'hero',
      content: L(lang, COPY.counterConfirming),
      kind: 'system'
    }
    setMessages((prev) => [...prev.filter((m) => m.kind !== 'counter_confirm'), processingMessage])
    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }
      const plan = await generateCountermeasurePlan(
        token,
        draft.formationId,
        correctedFormation || draft.formation
      )
      setPrematchPlan(plan)
      setCounterConfirmDraft(null)
      setActiveWorkflowId(null)
      const doneMessage = {
        role: 'hero',
        content: L(lang, COPY.counterDone),
        kind: 'plan',
        plan,
        payload: { kind: 'plan', plan }
      }
      setMessages((prev) => [
        ...prev.filter((m) => !['system', 'plan', 'counter_confirm'].includes(m.kind || m.payload?.kind)),
        doneMessage
      ])
      void persistMessages([doneMessage])
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== 'system'),
        { role: 'hero', content: L(lang, COPY.attachError), kind: 'error' }
      ])
    } finally {
      setCounterConfirming(false)
    }
  }, [
    counterConfirmDraft,
    counterConfirming,
    generateCountermeasurePlan,
    lang,
    persistMessages,
    router
  ])

  const analyzeAttachments = React.useCallback(async () => {
    if (!attachments.length || attachAnalyzing) return
    setAttachAnalyzing(true)
    const matchSection = matchFlow?.phase === 'upload' ? MATCH_SECTIONS[matchFlow.sectionIndex] : null
    const processingMessage = {
      role: 'hero',
      content: attachmentMode === 'match' && matchSection
        ? `${L(lang, matchSection.title)}…`
        : attachmentMode === 'counter'
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
      if (attachmentMode === 'match') {
        await analyzeMatchAttachment(token, attachments.map((attachment) => attachment.dataUrl))
        return
      }
      if (attachmentMode === 'counter') {
        const draft = await extractCountermeasureAttachment(
          token,
          attachments.map((attachment) => attachment.dataUrl)
        )
        setCounterConfirmDraft(draft)
        setAttachments([])
        if (!draft.uncertain && draft.formation) {
          await confirmCountermeasureDraft(draft.formation, draft)
          return
        }
        setActiveWorkflowId(null)
        const confirmMessage = {
          role: 'hero',
          content: '',
          kind: 'counter_confirm',
          payload: { kind: 'counter_confirm', draft }
        }
        setMessages((prev) => [
          ...prev.filter((m) => !['system', 'counter_confirm'].includes(m.kind || m.payload?.kind)),
          confirmMessage
        ])
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
      setActiveWorkflowId(null)
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
    matchFlow,
    analyzeMatchAttachment,
    extractCountermeasureAttachment,
    confirmCountermeasureDraft,
    lang,
    router,
    onStatsSuccess,
    persistMessages
  ])

  React.useEffect(() => {
    if (
      attachmentMode !== 'counter'
      || !autoCounterAnalyzeRef.current
      || !attachments.length
      || attachAnalyzing
    ) return

    autoCounterAnalyzeRef.current = false
    void analyzeAttachments()
  }, [analyzeAttachments, attachAnalyzing, attachmentMode, attachments])

  const openFeedCard = (cardId) => {
    setFeedCards((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]))
  }

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
        return () => enterFeedbackMode(lastSavedMatchId || lastMatch?.id || null)
      case 'READY_NO_STATS':
        return openStatsCamera
      case 'STALE_STATS':
        return null
      default:
        return null
    }
  })()

  const quickActions = [
    { key: 'stats', icon: Camera, label: L(lang, COPY.actionStats), run: openStatsCamera },
    { key: 'counter', icon: Trophy, label: L(lang, COPY.actionPrepare), run: openCounterCamera },
    { key: 'match', icon: ClipboardList, label: L(lang, COPY.actionMatch), run: startMatchUpload },
    { key: 'feedback', icon: MessageSquareHeart, label: L(lang, COPY.actionFeedback), run: () => enterFeedbackMode(lastSavedMatchId || lastMatch?.id || null) }
  ]
  const activePlanMessageIndex = prematchPlan
    ? messages.findLastIndex((message) => {
        const kind = message.kind || message.payload?.kind
        if (kind !== 'plan' || !message.plan) return false
        return prematchPlan.id
          ? message.plan.id === prematchPlan.id
          : message.plan.opponent_formation_id === prematchPlan.opponent_formation_id
      })
    : -1

  return (
    <div className="heroChat">
      {/* Header conversazione: logo + anello conoscenza */}
      <header className="hc-header">
        <div className="hc-identity">
          <span className="hc-avatarWrap">
            <img src="/logo.png" alt="" className="hc-avatar" />
            <span className="hc-online" aria-hidden="true" />
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
                <circle cx="13" cy="13" r="10" fill="none" stroke="var(--border-soft)" strokeWidth="3" />
                <circle
                  cx="13" cy="13" r="10" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={scoreRing.c} strokeDashoffset={scoreRing.offset} transform="rotate(-90 13 13)"
                />
              </svg>
              <span className="hc-ringValue">{scoreRing.value}%</span>
            </button>
          )}
        </div>
      </header>

      {/* Feed conversazione */}
      <div className={`hc-feed${historyLoading ? '' : ' is-ready'}`} ref={feedRef}>
        <div className="hc-banner">
          <p className="hc-bannerOverline">{L(lang, { it: 'Il tuo assistente di gioco', en: 'Your game assistant', es: 'Tu asistente de juego' })}</p>
          <h1 className="hc-bannerTitle">{L(lang, COPY.heroTitle)}</h1>
          <p className="hc-bannerSub">{L(lang, COPY.heroSub)}</p>
        </div>

        <div className="hc-row">
          <span className="hc-bubbleAvatar" aria-hidden="true">
            <img src="/logo.png" alt="" />
          </span>
          <div className="hc-bubble hc-bubbleHero">
            {greetingVariant === 'first'
              ? Lfn(lang, COPY.greetingNamed, clientName)
              : Lfn(lang, COPY.greetingReturningNamed, clientName)}
          </div>
        </div>

        {historyLoading && (
          <div className="hc-historyLoading" aria-live="polite">
            <span className="hc-historyDot" />
            <span className="hc-historyDot" />
            <span className="hc-historyDot" />
            <span>{pickLang(lang, { it: 'Recupero la conversazione…', en: 'Loading your conversation…', es: 'Cargando la conversación…' })}</span>
          </div>
        )}

        {messages.map((m, i) => {
          const key = m.id || `msg-${i}`
          const kind = m.kind || m.payload?.kind || null
          const workflowId = m.workflowId || m.payload?.workflowId || null

          if (kind === 'workflow_match') {
            const isActive = Boolean(matchFlow && matchFlow.workflowId === workflowId)
            if (!isActive) {
              return (
                <div key={key} className="hc-workflowDone">
                  <ClipboardList size={14} aria-hidden="true" />
                  <span>{L(lang, COPY.actionMatch)}</span>
                </div>
              )
            }
            return (
              <MatchUploadCard
                key={key}
                flow={matchFlow}
                lang={lang}
                attachments={attachments}
                analyzing={attachAnalyzing}
                lowHp={lowHp}
                saving={matchSaving}
                onSide={chooseMatchSide}
                onOpponentChange={updateMatchOpponent}
                onBegin={beginMatchPhotos}
                onCamera={openMatchCamera}
                onGallery={openMatchGallery}
                onRead={analyzeAttachments}
                onSkip={skipMatchSection}
                onSave={saveMatchFlow}
                onBack={goBackMatchSection}
                onShowExample={setExampleLightbox}
              />
            )
          }

          if (kind === 'workflow_attach') {
            const isActive = activeWorkflowId === workflowId && !matchFlow && !feedbackMode && (attachmentMode === 'stats' || attachmentMode === 'counter')
            if (!isActive) {
              return (
                <div key={key} className="hc-workflowDone">
                  {attachmentMode === 'counter' || m.workflowType === 'counter' ? <Trophy size={14} aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}
                  <span>{m.workflowType === 'counter' ? L(lang, COPY.actionPrepare) : L(lang, COPY.actionStats)}</span>
                </div>
              )
            }
            return (
              <div key={key} className="hc-attachBar hc-attachBarInline" role="region" aria-label={L(lang, COPY.attachStatsHint)}>
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
                {attachments.length > 0 && (
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
                )}
                {(attachmentMode !== 'counter' || attachments.length === 0) && attachments.length < MAX_ATTACH && (
                  <div className="hc-attachAddRow">
                    <button type="button" className="hc-attachAdd" onClick={() => cameraInputRef.current?.click()}>
                      <Camera size={14} aria-hidden="true" />
                      {L(lang, COPY.attachAddPhoto)}
                    </button>
                    <button type="button" className="hc-attachAdd" onClick={() => galleryInputRef.current?.click()}>
                      <ImagePlus size={14} aria-hidden="true" />
                      {L(lang, COPY.attachAddGallery)}
                    </button>
                  </div>
                )}
                {attachmentMode !== 'counter' && (
                  <button
                    type="button"
                    className="hc-attachAnalyze"
                    disabled={!attachments.length || attachAnalyzing || lowHp}
                    onClick={analyzeAttachments}
                  >
                    {attachAnalyzing
                      ? L(lang, COPY.attachAnalyzing)
                      : L(lang, COPY.attachAnalyze)}
                  </button>
                )}
              </div>
            )
          }

          if (kind === 'workflow_feedback') {
            const isActive = feedbackMode && activeWorkflowId === workflowId
            if (!isActive) {
              return (
                <div key={key} className="hc-workflowDone">
                  <MessageSquareHeart size={14} aria-hidden="true" />
                  <span>{L(lang, COPY.actionFeedback)}</span>
                </div>
              )
            }
            return (
              <div key={key} className="hc-feedbackBlock">
                <div className="hc-feedbackBadge" role="status">
                  <span className="hc-feedbackBadgeDot" aria-hidden="true" />
                  <span className="hc-feedbackBadgeText">
                    {L(lang, COPY.feedbackBadge)} · {L(lang, COPY.feedbackCostNote)}
                  </span>
                  <button type="button" className="hc-feedbackExit" onClick={exitFeedbackMode}>
                    {L(lang, COPY.feedbackExit)}
                  </button>
                </div>
                {feedbackMessages.map((fm, fi) => (
                  <div key={`fb-${fi}`} className={fm.role === 'user' ? 'hc-row hc-rowUser' : 'hc-row'}>
                    {fm.role === 'hero' && (
                      <span className="hc-bubbleAvatar" aria-hidden="true">
                        <img src="/logo.png" alt="" />
                      </span>
                    )}
                    <div className={fm.role === 'user' ? 'hc-bubble hc-bubbleUser' : `hc-bubble hc-bubbleHero${fm.kind === 'error' || fm.kind === 'lowhp' ? ' hc-bubbleWarn' : ''}`}>
                      {fm.kind === 'lowhp' && (
                        <span className="hc-warnRow">
                          <AlertCircle size={14} aria-hidden="true" />
                          <button type="button" className="hc-lowHpCta" onClick={() => router.push('/impostazioni-profilo')}>
                            {L(lang, COPY.lowHpCta)}
                          </button>
                        </span>
                      )}
                      <ChatMarkdown>{fm.content}</ChatMarkdown>
                    </div>
                  </div>
                ))}
                {feedbackSending && (
                  <div className="hc-row">
                    <span className="hc-bubbleAvatar" aria-hidden="true">
                      <img src="/logo.png" alt="" />
                    </span>
                    <div className="hc-bubble hc-bubbleHero hc-thinking">
                      <span className="hc-dot" /><span className="hc-dot" /><span className="hc-dot" />
                      <span className="hc-srOnly">{L(lang, COPY.thinking)}</span>
                    </div>
                  </div>
                )}
                {saveState !== 'saved' && feedbackMessages.some((fm) => fm.role === 'user') && (
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
              </div>
            )
          }

          if (kind === 'plan' && m.plan) {
            // Persisted plan messages remain part of conversation history, but the
            // active card has one canonical source: prematchPlan.
            if (i !== activePlanMessageIndex || !prematchPlan || feedbackMode || matchFlow) return null
            return (
              <PrematchPlanCard
                key={key}
                plan={prematchPlan}
                lang={lang}
                starters={starters}
                slotPositions={slotPositions}
                formationVariants={formationVariants}
                formation={formation}
                onFollowup={sendMessage}
              />
            )
          }

          if (kind === 'counter_confirm') {
            const hasNewerCounterState = messages.slice(i + 1).some((item) => {
              const itemKind = item.kind || item.payload?.kind
              return itemKind === 'counter_confirm' || itemKind === 'plan'
            })
            if (hasNewerCounterState) return null
            const draft = m.payload?.draft || counterConfirmDraft
            return (
              <CounterConfirmCard
                key={key}
                draft={draft}
                lang={lang}
                confirming={counterConfirming}
                onConfirm={confirmCountermeasureDraft}
              />
            )
          }

          if (kind === 'after_match') {
            return (
              <div key={key} className="hc-afterMatchCard">
                <p>{m.content || L(lang, COPY.matchAskFeedback)}</p>
                <button
                  type="button"
                  className="hc-guidedPrimary"
                  onClick={() => enterFeedbackMode(m.matchId || m.payload?.matchId || lastSavedMatchId)}
                >
                  {L(lang, COPY.actionFeedback)}
                </button>
              </div>
            )
          }

          if (!m.content && kind === 'system') return null

          return (
            <div key={key} className={m.role === 'user' ? 'hc-row hc-rowUser' : 'hc-row'}>
              {m.role === 'hero' && (
                <span className="hc-bubbleAvatar" aria-hidden="true">
                  <img src="/logo.png" alt="" />
                </span>
              )}
              <div className={m.role === 'user' ? 'hc-bubble hc-bubbleUser' : `hc-bubble hc-bubbleHero${kind === 'error' || kind === 'lowhp' ? ' hc-bubbleWarn' : ''}${kind === 'success' ? ' hc-bubbleOk' : ''}`}>
                {kind === 'lowhp' && (
                  <span className="hc-warnRow">
                    <AlertCircle size={14} aria-hidden="true" />
                    <button type="button" className="hc-lowHpCta" onClick={() => router.push('/impostazioni-profilo')}>
                      {L(lang, COPY.lowHpCta)}
                    </button>
                  </span>
                )}
                {kind === 'success' && (
                  <span className="hc-warnRow">
                    <CheckCircle2 size={14} aria-hidden="true" />
                  </span>
                )}
                {m.content ? <ChatMarkdown>{m.content}</ChatMarkdown> : null}
                {m.role === 'hero' && Array.isArray(m.suggestions) && m.suggestions.length > 0 && (
                  <div className="hc-bubbleActions">
                    {m.suggestions.filter(Boolean).slice(0, 3).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className="hc-bubbleAction"
                        onClick={() => sendMessage(sug)}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {prematchPlan && activePlanMessageIndex < 0 && !feedbackMode && !matchFlow && (
          <PrematchPlanCard
            plan={prematchPlan}
            lang={lang}
            starters={starters}
            slotPositions={slotPositions}
            formationVariants={formationVariants}
            formation={formation}
            onFollowup={sendMessage}
          />
        )}

        {sending && (
          <div className="hc-row">
            <span className="hc-bubbleAvatar" aria-hidden="true">
              <img src="/logo.png" alt="" />
            </span>
            <div className="hc-bubble hc-bubbleHero hc-thinking">
              <span className="hc-dot" /><span className="hc-dot" /><span className="hc-dot" />
              <span className="hc-srOnly">{L(lang, COPY.thinking)}</span>
            </div>
          </div>
        )}

        {stateCopy && stateCta && !feedbackMode && !matchFlow && (
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

      </div>

      {/* LOW HP banner (solo saldo reale noto) */}
      {lowHp && (
        <div className="hc-lowHpBanner" role="status">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{L(lang, COPY.lowHp)}</span>
          <button type="button" className="hc-lowHpCta" onClick={() => router.push('/impostazioni-profilo')}>
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

      {exampleLightbox && (
        <div
          className="hc-exampleLightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setExampleLightbox(null)}
        >
          <button
            type="button"
            className="hc-exampleLightboxClose"
            aria-label={L(lang, COPY.matchExampleHint)}
            onClick={() => setExampleLightbox(null)}
          >
            <X size={20} />
          </button>
          <img
            src={exampleLightbox.src}
            alt={exampleLightbox.caption ? L(lang, exampleLightbox.caption) : ''}
            onClick={(e) => e.stopPropagation()}
          />
          {exampleLightbox.caption && (
            <span className="hc-exampleLightboxCaption">{L(lang, exampleLightbox.caption)}</span>
          )}
        </div>
      )}

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
          object-fit: contain;
          background: #0b1220;
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

        .hc-feed {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 2px 4px calc(12px + env(safe-area-inset-bottom, 0px));
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .hc-feed.is-ready {
          animation: hcFeedFadeIn 0.22s ease-out;
        }

        @keyframes hcFeedFadeIn {
          from { opacity: 0.4; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hc-historyLoading {
          display: flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          padding: 8px 12px;
          color: var(--text-dim);
          font-size: 12.5px;
        }

        .hc-historyDot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--text-dim);
          animation: hcDotPulse 1s ease-in-out infinite;
        }

        .hc-historyDot:nth-child(2) { animation-delay: 0.15s; }
        .hc-historyDot:nth-child(3) { animation-delay: 0.3s; }

        .hc-workflowDone {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          align-self: flex-start;
          min-height: 36px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--border-soft);
          background: var(--surface-2);
          color: var(--text-dim);
          font-size: 12px;
          font-weight: 700;
        }

        .hc-feedbackBlock {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hc-attachBarInline {
          width: 100%;
          max-width: min(100%, 560px);
        }

        :global(.hc-md) {
          display: flex;
          flex-direction: column;
          gap: 0.55em;
        }

        :global(.hc-md-p) {
          margin: 0;
        }

        :global(.hc-md-strong) {
          font-weight: 800;
          color: inherit;
        }

        :global(.hc-md-em) {
          font-style: italic;
        }

        :global(.hc-md-ul),
        :global(.hc-md-ol) {
          margin: 0;
          padding-left: 1.2em;
        }

        :global(.hc-md-li) {
          margin: 0.2em 0;
        }

        :global(.hc-md-a) {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        :global(.hc-md-heading) {
          margin: 0;
          font-weight: 800;
        }

        :global(.hc-md-code) {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.92em;
          padding: 0.1em 0.35em;
          border-radius: 6px;
          background: var(--surface-2);
        }

        :global(.hc-md-quote) {
          margin: 0;
          padding-left: 0.75em;
          border-left: 2px solid var(--accent-border);
          color: var(--text-dim);
        }

        .hc-historyPeek {
          align-self: center;
          min-height: 32px;
          padding: 6px 11px;
          border-radius: 999px;
          border: 1px solid var(--border-soft);
          background: var(--surface-2);
          color: var(--text-dim);
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .hc-historyPeek:hover {
          color: var(--text-main);
          border-color: var(--accent-border);
        }

        .hc-banner {
          border-radius: 20px;
          padding: clamp(22px, 5vw, 34px);
          background:
            radial-gradient(circle at 82% 12%, rgba(61, 220, 151, 0.16), transparent 44%),
            radial-gradient(circle at 12% 88%, rgba(0, 168, 200, 0.12), transparent 40%),
            var(--surface);
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
          color: var(--text-main);
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
          object-fit: contain;
          background: #0b1220;
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
          color: var(--text-main);
        }

        .hc-bubbleWarn {
          border-color: rgba(255, 191, 0, 0.35);
        }

        .hc-warnRow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          color: var(--gold-text);
        }

        .hc-lowHpCta {
          padding: 4px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 203, 5, 0.5);
          background: var(--gold-bg);
          color: var(--gold-text);
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
          background: linear-gradient(150deg, var(--accent-bg), var(--surface));
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

        :global(.hc-guidedCard) {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 10px;
          align-items: center;
          padding: 12px;
          border: 1px solid var(--accent-border);
          border-radius: 14px;
          background: linear-gradient(140deg, var(--accent-bg), var(--surface-2));
        }

        :global(.hc-guidedIcon) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          color: var(--accent);
          background: var(--surface-3);
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
          background: linear-gradient(150deg, var(--accent-bg), var(--surface));
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
          color: var(--danger-text);
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
          color: var(--gold-text);
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
          padding: 0 4px calc(8px + env(safe-area-inset-bottom, 0px));
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

        .hc-bubbleActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .hc-bubbleAction {
          min-height: 44px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--accent-border);
          background: var(--accent-bg);
          color: var(--accent);
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          line-height: 1.25;
          max-width: 100%;
        }

        .hc-bubbleAction:hover {
          filter: brightness(1.06);
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

        .hc-attachAddRow {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .hc-attachAdd {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 30px;
          padding: 5px 9px;
          border-radius: 999px;
          border: 1px dashed var(--border-soft);
          background: transparent;
          color: var(--text-dim);
          font: inherit;
          font-size: 11px;
          cursor: pointer;
        }

        .hc-attachAdd:hover {
          color: var(--text-main);
          border-color: var(--accent-border);
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

        :global(.hc-attachAnalyze) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          align-self: stretch;
          width: 100%;
          min-height: 48px;
          padding: 11px 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: var(--accent-ink);
          font: inherit;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        :global(.hc-attachAnalyze:disabled) {
          opacity: 0.45;
          cursor: default;
        }

        :global(.hc-attachAnalyze:not(:disabled):hover) {
          filter: brightness(1.05);
        }

        :global(.hc-planCard) {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid var(--accent-border);
          background: linear-gradient(145deg, rgba(61, 220, 151, 0.11), var(--surface-2));
        }

        :global(.hc-planHead) {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent);
        }

        :global(.hc-planFreshness) {
          margin-left: auto;
          color: var(--text-dim);
          font-size: 10px;
          font-weight: 700;
        }

        :global(.hc-planStatus) {
          padding: 4px 8px;
          border-radius: 999px;
          background: var(--surface-3);
          color: var(--text-dim);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        :global(.hc-planStatusDone) {
          color: var(--accent);
          background: var(--accent-bg);
        }

        :global(.hc-planSection) {
          display: block;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid var(--border-soft);
          background: var(--inset-bg);
          font-size: 13px;
        }

        :global(.hc-planSaved) {
          margin: -4px 0 2px;
          color: var(--text-dim);
          font-size: 12px;
        }

        :global(.hc-counterConfirm) {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid var(--accent-border);
          background: linear-gradient(145deg, rgba(61, 220, 151, 0.1), var(--surface-2));
        }

        :global(.hc-counterConfirmHead) {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent);
        }

        :global(.hc-counterConfirmTrait),
        :global(.hc-counterConfirmHint) {
          margin: 0;
          color: var(--text-dim);
          font-size: 13px;
          line-height: 1.4;
        }

        :global(.hc-counterConfirmTrait) {
          color: var(--text-main);
          font-weight: 600;
        }

        :global(.hc-counterConfirmLabel) {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-dim);
        }

        :global(.hc-counterConfirmSelect) {
          appearance: none;
          border-radius: 10px;
          border: 1px solid var(--border-soft);
          background: var(--inset-bg);
          color: var(--text-main);
          padding: 10px 12px;
          font-size: 14px;
          font-weight: 700;
        }

        :global(.hc-counterConfirmCta) {
          appearance: none;
          border: 0;
          border-radius: 12px;
          padding: 11px 14px;
          background: var(--accent);
          color: var(--accent-ink);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        :global(.hc-counterConfirmCta:disabled) {
          opacity: 0.55;
          cursor: default;
        }

        :global(.hc-planHero) {
          padding: 12px;
          border-radius: 12px;
          background: rgba(61, 220, 151, 0.09);
          border: 1px solid rgba(61, 220, 151, 0.22);
        }

        :global(.hc-planHero strong) {
          display: block;
          color: var(--text-main);
          font-size: 16px;
          line-height: 1.35;
        }

        :global(.hc-planEyebrow) {
          display: block;
          margin-bottom: 6px;
          color: var(--accent);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        :global(.hc-planOpponent) {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          align-items: baseline;
        }

        :global(.hc-planOpponent span) {
          color: var(--text-main);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        :global(.hc-planHero p),
        :global(.hc-planSection p) {
          margin: 6px 0 0;
          color: var(--text-dim);
          line-height: 1.45;
        }

        :global(.hc-countermeasures) {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border-soft);
          border-radius: 14px;
          background: var(--surface-2);
        }

        :global(.hc-countermeasuresHead) {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        :global(.hc-countermeasuresHint) {
          color: var(--text-dim);
          font-size: 10px;
        }

        :global(.hc-countermeasuresGrid) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        :global(.hc-countermeasureColumn) {
          min-width: 0;
          padding: 10px;
          border-radius: 11px;
          background: var(--inset-bg);
          border: 1px solid var(--border-soft);
        }

        :global(.hc-countermeasureColumn h3) {
          margin: 0;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.02em;
        }

        :global(.hc-countermeasureAttack h3) {
          color: var(--gold-text);
        }

        :global(.hc-countermeasureDefense h3) {
          color: var(--info-text);
        }

        :global(.hc-countermeasureColumn ol) {
          display: grid;
          gap: 7px;
          margin: 9px 0 0;
          padding-left: 20px;
          color: var(--text-main);
          font-size: 12px;
          line-height: 1.35;
        }

        :global(.hc-countermeasureColumn li) {
          padding-left: 2px;
        }

        :global(.hc-countermeasureColumn li::marker) {
          color: var(--accent);
          font-weight: 800;
        }

        :global(.hc-countermeasureColumn li strong) {
          display: block;
          font-weight: 750;
        }

        :global(.hc-countermeasureColumn li small) {
          display: block;
          margin-top: 3px;
          color: var(--text-dim);
          font-size: 10px;
          line-height: 1.35;
        }

        :global(.hc-countermeasureColumn p),
        :global(.hc-countermeasuresEmpty) {
          margin: 8px 0 0;
          color: var(--text-dim);
          font-size: 12px;
          line-height: 1.4;
        }

        :global(.hc-planQuick) {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border-soft);
          background: var(--surface-2);
        }

        :global(.hc-planQuickLabel) {
          color: var(--accent);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        :global(.hc-planQuickList) {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
          color: var(--text-main);
          font-size: 13px;
          line-height: 1.4;
        }

        :global(.hc-planSetup),
        :global(.hc-planPlaybook),
        :global(.hc-planB),
        :global(.hc-planFollowups),
        :global(.hc-planOperations) {
          border: 1px solid var(--border-soft);
          border-radius: 14px;
          background: var(--surface-2);
        }

        :global(.hc-planSetup) {
          padding: 12px;
        }

        :global(.hc-planSectionHead) {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
        }

        :global(.hc-planSectionHead > span:last-child) {
          color: var(--text-dim);
          font-size: 10px;
        }

        :global(.hc-planSetupRows) {
          display: grid;
          gap: 1px;
          overflow: hidden;
          border-radius: 10px;
          background: var(--border-soft);
        }

        :global(.hc-planSetupRow) {
          display: grid;
          grid-template-columns: minmax(72px, 0.65fr) minmax(0, 1.35fr) auto;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 8px 10px;
          background: var(--inset-bg);
        }

        :global(.hc-planSetupRow > span) {
          color: var(--text-dim);
          font-size: 11px;
        }

        :global(.hc-planSetupRow > div > strong) {
          display: block;
          color: var(--text-main);
          font-size: 12px;
          line-height: 1.3;
        }

        :global(.hc-planSetupRow > div > small) {
          display: block;
          margin-top: 3px;
          color: var(--text-dim);
          font-size: 10px;
          line-height: 1.3;
        }

        :global(.hc-planSetupRow > small) {
          color: var(--accent);
          font-weight: 900;
        }

        :global(.hc-planEmpty) {
          margin: 0;
          color: var(--text-dim);
          font-size: 12px;
        }

        :global(.hc-planPlaybook) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
        }

        :global(.hc-planPhase) {
          min-width: 0;
          padding: 11px;
          border-radius: 11px;
          background: var(--inset-bg);
        }

        :global(.hc-planPhase > span),
        :global(.hc-planB > span),
        :global(.hc-planFollowups > span) {
          display: block;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        :global(.hc-planPhaseBall > span) {
          color: var(--gold-text);
        }

        :global(.hc-planPhaseNoBall > span) {
          color: var(--info-text);
        }

        :global(.hc-planPhase ol) {
          display: grid;
          gap: 7px;
          margin: 0;
          padding-left: 18px;
          color: var(--text-main);
          font-size: 12px;
          line-height: 1.4;
        }

        :global(.hc-planPhase li) {
          padding-left: 2px;
          font-weight: 700;
        }

        :global(.hc-planPhase li::marker) {
          color: var(--accent);
          font-weight: 900;
        }

        :global(.hc-planAvoid) {
          grid-column: 1 / -1;
          margin: 0;
          padding: 4px 5px 2px;
          color: var(--text-dim);
          font-size: 11px;
          line-height: 1.4;
        }

        :global(.hc-planAvoid strong) {
          color: var(--danger-text, #ff8f8f);
        }

        :global(.hc-planB) {
          padding: 12px;
          border-color: rgba(255, 203, 5, 0.2);
          background: linear-gradient(145deg, rgba(255, 203, 5, 0.08), var(--surface-2));
        }

        :global(.hc-planB > span) {
          color: var(--gold-text);
        }

        :global(.hc-planB p) {
          margin: 0 0 5px;
          color: var(--text-dim);
          font-size: 11px;
          line-height: 1.35;
        }

        :global(.hc-planB p small) {
          color: var(--gold-text);
          font-size: inherit;
          font-weight: 850;
          text-transform: uppercase;
        }

        :global(.hc-planB > strong) {
          display: block;
          color: var(--text-main);
          font-size: 12px;
          line-height: 1.4;
        }

        :global(.hc-planFollowups) {
          padding: 12px;
          background: var(--inset-bg);
        }

        :global(.hc-planFollowups > span) {
          color: var(--text-dim);
        }

        :global(.hc-planFollowups > div) {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        :global(.hc-planFollowups button) {
          appearance: none;
          border: 1px solid var(--accent-border);
          border-radius: 999px;
          background: var(--accent-bg);
          color: var(--text-main);
          padding: 7px 10px;
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.25;
          text-align: left;
          cursor: pointer;
        }

        :global(.hc-planFollowups button:hover) {
          border-color: var(--accent);
          color: var(--accent);
        }

        :global(.hc-planOperations) {
          overflow: hidden;
        }

        :global(.hc-planOperations > summary) {
          min-height: 46px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          color: var(--text-main);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        :global(.hc-planOperations[open] > summary) {
          border-bottom: 1px solid var(--border-soft);
        }

        :global(.hc-planOperationsBody) {
          display: grid;
          gap: 8px;
          padding: 8px;
        }

        @media (max-width: 560px) {
          :global(.hc-countermeasuresGrid) {
            grid-template-columns: 1fr;
          }

          :global(.hc-planPlaybook) {
            grid-template-columns: 1fr;
          }
        }

        :global(.hc-planDetails) {
          border-radius: 12px;
          border: 1px solid var(--border-soft);
          background: var(--inset-bg);
          padding: 4px 10px 10px;
        }

        :global(.hc-planDetails > summary) {
          cursor: pointer;
          min-height: 44px;
          display: flex;
          align-items: center;
          color: var(--text-main);
          font-size: 13px;
          font-weight: 800;
          list-style-position: inside;
        }

        :global(.hc-planDetails[open] > summary) {
          margin-bottom: 8px;
        }

        :global(.hc-planVisualGrid) {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        :global(.hc-planSectionTitle) {
          display: block;
          color: var(--text-main);
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        :global(.hc-planListGroup) {
          margin-top: 10px;
        }

        :global(.hc-planListGroup > span) {
          color: var(--accent);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        :global(.hc-planListGroup ul) {
          display: grid;
          gap: 5px;
          margin: 6px 0 0;
          padding-left: 17px;
          color: var(--text-dim);
          font-size: 12px;
          line-height: 1.4;
        }

        :global(.hc-planAdvice) {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 9px;
          padding: 8px 9px;
          border-left: 2px solid var(--accent);
          border-radius: 0 8px 8px 0;
          background: var(--surface-2);
        }

        :global(.hc-planAdvice strong) {
          color: var(--text-main);
          font-size: 12px;
          line-height: 1.35;
        }

        :global(.hc-planAdvice small) {
          color: var(--text-dim);
          font-size: 11px;
          line-height: 1.35;
        }

        :global(.hc-planAdviceWarning) {
          border-left-color: var(--primary-orange);
        }

        :global(.hc-matchCard) {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(61, 220, 151, 0.32);
          background: linear-gradient(145deg, rgba(61, 220, 151, 0.10), var(--surface-2));
        }

        :global(.hc-matchHead) {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent);
        }

        :global(.hc-matchHead span) {
          margin-left: auto;
          color: var(--text-dim);
          font-size: 11px;
          font-weight: 800;
        }

        :global(.hc-matchQuestion) {
          margin: 0 0 9px;
          color: var(--text-main);
          font-weight: 800;
        }

        :global(.hc-matchChoiceGrid) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        :global(.hc-matchChoice) {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 48px;
          padding: 9px 11px;
          border-radius: 11px;
          border: 1px solid var(--border-soft);
          background: var(--inset-bg);
          color: var(--text-main);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        :global(.hc-matchChoiceActive) {
          border-color: var(--accent);
          background: var(--accent-bg);
          color: var(--accent);
        }

        :global(.hc-matchChoice span) {
          font-size: 18px;
        }

        :global(.hc-matchLabel) {
          display: block;
          margin-top: 12px;
          color: var(--text-dim);
          font-size: 11px;
          font-weight: 700;
        }

        :global(.hc-matchOpponent) {
          width: 100%;
          min-height: 40px;
          margin-top: 6px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid var(--border-soft);
          background: var(--inset-bg);
          color: var(--text-main);
          font: inherit;
          font-size: 13px;
        }

        :global(.hc-matchProgress) {
          display: flex;
          gap: 6px;
        }

        :global(.hc-matchBack) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 36px;
          margin: 0 0 8px;
          padding: 6px 2px;
          border: 0;
          background: transparent;
          color: var(--text-dim);
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        :global(.hc-matchBack:hover) {
          color: var(--text-main);
        }

        :global(.hc-matchBack:disabled) {
          opacity: 0.45;
          cursor: default;
        }

        :global(.hc-matchReviewBack) {
          margin-bottom: 0;
          justify-content: center;
        }

        :global(.hc-matchProgressDot) {
          flex: 1;
          height: 4px;
          border-radius: 999px;
          background: var(--surface-3);
        }

        :global(.hc-matchProgressDone),
        :global(.hc-matchProgressCurrent) {
          background: var(--accent);
        }

        :global(.hc-matchSectionMeta) {
          display: flex;
          justify-content: space-between;
          color: var(--text-dim);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        :global(.hc-matchUpload h3) {
          margin: 0;
          color: var(--text-main);
          font-size: 16px;
        }

        :global(.hc-matchUpload p) {
          margin: -5px 0 0;
          color: var(--text-dim);
          font-size: 12px;
          line-height: 1.45;
        }

        :global(.hc-matchUploadActions) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        :global(.hc-matchUploadButton) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 52px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(61, 220, 151, 0.32);
          background: rgba(61, 220, 151, 0.10);
          color: var(--text-main);
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease;
        }

        :global(.hc-matchUploadButton:hover) {
          border-color: var(--accent);
          background: rgba(61, 220, 151, 0.18);
        }

        :global(.hc-matchUploadButton:disabled) {
          opacity: 0.55;
          cursor: default;
        }

        :global(.hc-matchThumbs) {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
          width: 100%;
        }

        :global(.hc-matchThumbs img) {
          width: 100%;
          height: 150px;
          border-radius: 10px;
          object-fit: contain;
          background: var(--inset-bg);
          border: 1px solid var(--accent-border);
        }

        :global(.hc-matchExamples) {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
          margin-bottom: 4px;
        }

        :global(.hc-matchExamplesLabel) {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-dim);
        }

        :global(.hc-matchExamplesGrid) {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
          gap: 8px;
        }

        :global(.hc-matchExampleThumb) {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0;
          border: 1px solid var(--border-soft);
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.18s ease, transform 0.18s ease;
        }

        :global(.hc-matchExampleThumb:hover) {
          border-color: var(--accent);
          transform: translateY(-1px);
        }

        :global(.hc-matchExampleThumb img) {
          width: 100%;
          height: 72px;
          object-fit: cover;
          background: var(--inset-bg);
          display: block;
        }

        :global(.hc-matchExampleCaption) {
          padding: 4px 6px;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-dim);
          line-height: 1.3;
        }

        .hc-exampleLightbox {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 9999;
          padding: clamp(12px, 4vw, 24px);
          box-sizing: border-box;
          animation: hc-exampleFade 0.18s ease;
        }

        @keyframes hc-exampleFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .hc-exampleLightbox img {
          max-width: min(100%, 560px);
          max-height: 78vh;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .hc-exampleLightboxCaption {
          color: rgba(255, 255, 255, 0.86);
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        .hc-exampleLightboxClose {
          position: absolute;
          top: max(16px, env(safe-area-inset-top, 0px));
          right: max(16px, env(safe-area-inset-right, 0px));
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        :global(.hc-matchPrimary) {
          width: 100%;
          min-height: 48px;
          padding: 11px 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: var(--accent-ink);
          font: inherit;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        :global(.hc-matchPrimary:disabled) {
          opacity: 0.45;
          cursor: default;
        }

        :global(.hc-matchSkip) {
          align-self: center;
          min-height: 32px;
          padding: 4px 10px;
          border: none;
          background: transparent;
          color: var(--text-dim);
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        :global(.hc-matchSkip:hover) {
          color: var(--text-main);
        }

        :global(.hc-matchReviewIntro) {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--text-main);
          font-size: 13px;
        }

        :global(.hc-matchReviewIntro span) {
          color: var(--text-dim);
          text-align: right;
        }

        :global(.hc-matchSummaryList) {
          display: grid;
          gap: 6px;
        }

        :global(.hc-matchSummaryRow) {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 9px;
          border-radius: 9px;
          background: var(--inset-bg);
          color: var(--text-main);
          font-size: 12px;
        }

        :global(.hc-matchSummaryRow small) {
          margin-left: auto;
          color: var(--text-dim);
        }

        :global(.hc-matchSummaryOk) {
          color: var(--accent);
          font-weight: 900;
        }

        :global(.hc-matchSummaryMissing) {
          color: var(--text-dim);
        }

        :global(.hc-matchHint) {
          margin: 0;
          color: var(--text-dim);
          font-size: 11px;
          line-height: 1.4;
        }

        :global(.hc-afterMatchCard) {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 12px;
          border-radius: 13px;
          border: 1px solid rgba(61, 220, 151, 0.24);
          background: rgba(61, 220, 151, 0.07);
        }

        :global(.hc-afterMatchCard p) {
          flex: 1;
          margin: 0;
          color: var(--text-dim);
          font-size: 12px;
          line-height: 1.4;
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
          background: var(--inset-bg);
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
          color: var(--gold-text);
          font-size: 12px;
        }

        :global(.hc-planActions) {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hc-sendBtn:focus-visible,
        .hc-micBtn:focus-visible,
        .hc-plusBtn:focus-visible,
        .hc-stateBtn:focus-visible,
        .hc-richCta:focus-visible,
        .hc-bubbleAction:focus-visible,
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

          .hc-bubbleAction {
            width: 100%;
          }

        }
      `}</style>
    </div>
  )
}
