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
  CheckCircle2,
  Users,
  ClipboardList
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
    it: (name) => `Bentornato ${name}. Cosa facciamo oggi?`,
    en: (name) => `Welcome back ${name}. What are we doing today?`,
    es: (name) => `Bienvenido de nuevo ${name}. ¿Qué hacemos hoy?`
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
  counterRequest: { it: 'Mandami una o due foto della formazione avversaria: preparo qui il piano partita, senza aprire altre pagine.', en: 'Send me one or two photos of the opponent formation: I’ll build the match plan here, without opening another page.', es: 'Envíame una o dos fotos de la formación rival: prepararé aquí el plan de partido, sin abrir otras páginas.' },
  counterDone: { it: 'Piano pronto. Qui trovi la lettura dell’avversario e cosa fare in partita.', en: 'Plan ready. Here is the opponent read and what to do in the match.', es: 'Plan listo. Aquí tienes la lectura del rival y qué hacer durante el partido.' },
  planTitle: { it: 'Piano contromisure', en: 'Countermeasure plan', es: 'Plan de contramedidas' },
  planSaved: { it: 'Piano salvato nella conversazione. Usalo nella prossima partita.', en: 'Plan saved in this conversation. Use it in your next match.', es: 'Plan guardado en la conversación. Úsalo en tu próximo partido.' },
  planRead: { it: 'Lettura avversario', en: 'Opponent read', es: 'Lectura del rival' },
  planStrengths: { it: 'Cosa fa bene', en: 'What they do well', es: 'Lo que hace bien' },
  planWeaknesses: { it: 'Dove attaccare', en: 'Where to attack', es: 'Dónde atacar' },
  planAttack: { it: 'Piano offensivo', en: 'Attacking plan', es: 'Plan ofensivo' },
  planDefend: { it: 'Piano difensivo', en: 'Defensive plan', es: 'Plan defensivo' },
  planAvoid: { it: 'Evita', en: 'Avoid', es: 'Evita' },
  planStyle: { it: 'Stile squadra', en: 'Team playstyle', es: 'Estilo de equipo' },
  planInstructions: { it: 'Istruzioni individuali', en: 'Individual instructions', es: 'Instrucciones individuales' },
  planSubstitutions: { it: 'Cambi consigliati', en: 'Suggested substitutions', es: 'Cambios sugeridos' },
  planManual: { it: 'Da verificare manualmente', en: 'Review manually', es: 'Revisar manualmente' },
  planWarnings: { it: 'Attenzione', en: 'Warnings', es: 'Advertencias' },
  planConfidence: { it: 'Confidenza', en: 'Confidence', es: 'Confianza' },
  planQuality: { it: 'Qualità dati', en: 'Data quality', es: 'Calidad de datos' },
  attachAnalyzing: { it: 'Sto leggendo le tue statistiche…', en: 'Reading your stats…', es: 'Leyendo tus estadísticas…' },
  attachDone: { it: 'Statistiche aggiornate. Ora posso consigliarti meglio.', en: 'Stats updated. I can advise you better now.', es: 'Estadísticas actualizadas. Ahora puedo aconsejarte mejor.' },
  attachError: { it: 'Non sono riuscito a leggere le foto. Riprova con screenshot più nitidi.', en: 'I couldn’t read the photos. Try clearer screenshots.', es: 'No pude leer las fotos. Prueba capturas más nítidas.' },
  attachRead: { it: 'Leggi questa sezione', en: 'Read this section', es: 'Leer esta sección' },
  attachReadMore: { it: 'Aggiungi foto', en: 'Add photo', es: 'Añadir foto' },
  actionRoster: { it: 'Carica rosa', en: 'Upload squad', es: 'Cargar plantilla' },
  actionPlayer: { it: 'Carica giocatore', en: 'Upload player', es: 'Cargar jugador' },
  actionCoach: { it: 'Carica allenatore', en: 'Upload coach', es: 'Cargar entrenador' },
  assetIntroRoster: { it: 'Carica le schermate delle card dei tuoi giocatori. Le leggerò tutte insieme e ti mostrerò l’elenco prima di salvarlo.', en: 'Upload your player-card screenshots. I’ll read them together and show the list before saving.', es: 'Carga las capturas de las cartas de tus jugadores. Las leeré y mostraré la lista antes de guardarla.' },
  assetIntroPlayer: { it: 'Carica la schermata completa della card del giocatore. La leggerò e ti mostrerò i dati prima di salvarli.', en: 'Upload the player card screen. I’ll read it and show the data before saving.', es: 'Carga la pantalla completa de la carta del jugador. Leeré los datos y te los mostraré antes de guardarlos.' },
  assetIntroCoach: { it: 'Carica la schermata completa dell’allenatore. La leggerò e ti mostrerò i dati prima di salvarli.', en: 'Upload the full coach screen. I’ll read it and show the data before saving.', es: 'Carga la pantalla completa del entrenador. Leeré los datos y te los mostraré antes de guardarlos.' },
  assetRead: { it: 'Leggi e prepara anteprima', en: 'Read and prepare preview', es: 'Leer y preparar vista previa' },
  assetSave: { it: 'Conferma e salva', en: 'Confirm and save', es: 'Confirmar y guardar' },
  assetSaving: { it: 'Salvataggio…', en: 'Saving…', es: 'Guardando…' },
  assetPreview: { it: 'Controlla i dati estratti prima di salvare.', en: 'Review the extracted data before saving.', es: 'Revisa los datos extraídos antes de guardar.' },
  assetEmpty: { it: 'Non ho trovato dati leggibili. Prova con una schermata completa e nitida.', en: 'I could not find readable data. Try a clear full-screen screenshot.', es: 'No encontré datos legibles. Prueba con una captura completa y nítida.' },
  matchIntro: { it: 'Raccogliamo la partita dentro la chat. Ti guiderò foto per foto e non salverò nulla finché non mi dai conferma.', en: 'Let’s collect the match inside the chat. I’ll guide you photo by photo and won’t save anything until you confirm.', es: 'Recopilemos el partido dentro del chat. Te guiaré foto a foto y no guardaré nada hasta que confirmes.' },
  matchHomeQuestion: { it: 'Hai giocato in casa o fuori casa?', en: 'Did you play at home or away?', es: '¿Jugaste en casa o fuera?' },
  matchHome: { it: 'Casa', en: 'Home', es: 'Casa' },
  matchAway: { it: 'Fuori casa', en: 'Away', es: 'Fuera' },
  matchOpponent: { it: 'Contro chi hai giocato? (opzionale)', en: 'Who did you play against? (optional)', es: '¿Contra quién jugaste? (opcional)' },
  matchOpponentPlaceholder: { it: 'Nome avversario', en: 'Opponent name', es: 'Nombre del rival' },
  matchStartPhotos: { it: 'Inizia con le foto', en: 'Start with photos', es: 'Empezar con las fotos' },
  matchSection: { it: 'Sezione', en: 'Section', es: 'Sección' },
  matchRead: { it: 'Letta', en: 'Read', es: 'Leída' },
  matchReady: { it: 'Pronta da leggere', en: 'Ready to read', es: 'Lista para leer' },
  matchOptional: { it: 'opzionale', en: 'optional', es: 'opcional' },
  matchSectionDone: { it: 'Sezione letta. Passiamo alla prossima.', en: 'Section read. Let’s move to the next one.', es: 'Sección leída. Pasemos a la siguiente.' },
  matchAllRead: { it: 'Ho letto tutte le sezioni. Controlla il riepilogo e conferma il salvataggio.', en: 'I’ve read all sections. Check the summary and confirm the save.', es: 'He leído todas las secciones. Revisa el resumen y confirma el guardado.' },
  matchSkip: { it: 'Salta per ora', en: 'Skip for now', es: 'Saltar por ahora' },
  matchReview: { it: 'Rivedi partita', en: 'Review match', es: 'Revisar partido' },
  matchSave: { it: 'Conferma e salva partita', en: 'Confirm and save match', es: 'Confirmar y guardar partido' },
  matchSaving: { it: 'Salvataggio…', en: 'Saving…', es: 'Guardando…' },
  matchMin: { it: 'Per un’analisi utile servono almeno 3 sezioni lette.', en: 'At least 3 sections must be read for a useful analysis.', es: 'Se necesitan al menos 3 secciones leídas para un análisis útil.' },
  matchSaved: { it: 'Partita salvata. Ora posso collegare dati, pattern e feedback.', en: 'Match saved. I can now connect data, patterns and feedback.', es: 'Partido guardado. Ahora puedo conectar datos, patrones y feedback.' },
  matchAskFeedback: { it: 'Vuoi raccontarmi com’è andata? Così collego i numeri a quello che hai vissuto in partita.', en: 'Want to tell me how it went? I’ll connect the numbers to what you experienced.', es: '¿Quieres contarme cómo fue? Conectaré los datos con lo que viviste.' },
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

function PrematchPlanCard({ plan, lang }) {
  if (!plan) return null
  const raw = plan.countermeasures || {}
  const analysis = raw.analysis || {}
  const tactics = raw.countermeasures || {}
  const summary = raw.play_summary || {}
  const formationAdjustments = Array.isArray(tactics.formation_adjustments) ? tactics.formation_adjustments : []
  const tacticalAdjustments = Array.isArray(tactics.tactical_adjustments) ? tactics.tactical_adjustments : []
  const playerSuggestions = Array.isArray(tactics.player_suggestions) ? tactics.player_suggestions : []
  const individualInstructions = Array.isArray(tactics.individual_instructions) ? tactics.individual_instructions : []
  const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : []
  const weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : []
  const warnings = Array.isArray(raw.warnings) ? raw.warnings : []

  const localized = (value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    return L(lang, value) || ''
  }
  const list = (items) => items.filter(Boolean).map((item, index) => (
    <li key={`${index}-${String(localized(item))}`}>{localized(item)}</li>
  ))

  return (
    <div className="hc-planCard">
      <div className="hc-planHead">
        <Trophy size={16} aria-hidden="true" />
        <strong>{L(lang, COPY.planTitle)}</strong>
        <span className="hc-planStatus hc-planStatusDone">✓</span>
      </div>
      <p className="hc-planSaved">{L(lang, COPY.planSaved)}</p>

      {(summary.match_key || summary.base_plan) && (
        <div className="hc-planHero">
          {summary.match_key && <strong>{localized(summary.match_key)}</strong>}
          {summary.base_plan && <p>{localized(summary.base_plan)}</p>}
        </div>
      )}

      <div className="hc-planVisualGrid">
        {(analysis.opponent_formation_analysis || strengths.length || weaknesses.length) && (
          <details className="hc-planSection" open>
            <summary>{L(lang, COPY.planRead)}</summary>
            {analysis.opponent_formation_analysis && <p>{localized(analysis.opponent_formation_analysis)}</p>}
            {strengths.length > 0 && (
              <div className="hc-planListGroup">
                <span>{L(lang, COPY.planStrengths)}</span>
                <ul>{list(strengths)}</ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div className="hc-planListGroup">
                <span>{L(lang, COPY.planWeaknesses)}</span>
                <ul>{list(weaknesses)}</ul>
              </div>
            )}
          </details>
        )}

        {(summary.attacking || formationAdjustments.length || tacticalAdjustments.length) && (
          <details className="hc-planSection" open>
            <summary>{L(lang, COPY.planAttack)}</summary>
            {summary.attacking && <p>{localized(summary.attacking)}</p>}
            {formationAdjustments.map((item, index) => (
              <div key={`formation-${index}`} className="hc-planAdvice">
                <strong>{localized(item.suggestion)}</strong>
                {item.reason && <small>{localized(item.reason)}</small>}
              </div>
            ))}
            {tacticalAdjustments.map((item, index) => (
              <div key={`tactical-${index}`} className="hc-planAdvice">
                <strong>{localized(item.suggestion)}</strong>
                {item.reason && <small>{localized(item.reason)}</small>}
              </div>
            ))}
          </details>
        )}

        {(summary.defending || summary.avoid) && (
          <details className="hc-planSection" open>
            <summary>{L(lang, COPY.planDefend)}</summary>
            {summary.defending && <p>{localized(summary.defending)}</p>}
            {summary.avoid && (
              <div className="hc-planAdvice hc-planAdviceWarning">
                <strong>{L(lang, COPY.planAvoid)}</strong>
                <small>{localized(summary.avoid)}</small>
              </div>
            )}
          </details>
        )}

        {playerSuggestions.length > 0 && (
          <details className="hc-planSection">
            <summary>{L(lang, COPY.planSubstitutions)}</summary>
            {playerSuggestions.map((item, index) => (
              <div key={`player-${index}`} className="hc-planAdvice">
                <strong>
                  {item.player_name || item.player_id}
                  {item.replace_player_name ? ` → ${item.replace_player_name}` : ''}
                </strong>
                {item.reason && <small>{localized(item.reason)}</small>}
              </div>
            ))}
          </details>
        )}

        {individualInstructions.length > 0 && (
          <details className="hc-planSection">
            <summary>{L(lang, COPY.planInstructions)}</summary>
            {individualInstructions.map((item, index) => (
              <div key={`instruction-${index}`} className="hc-planAdvice">
                <strong>{item.player_name || item.player_id}: {localized(item.instruction)}</strong>
                {item.reason && <small>{localized(item.reason)}</small>}
              </div>
            ))}
          </details>
        )}
      </div>

      {(warnings.length > 0 || raw.confidence != null || raw.data_quality) && (
        <div className="hc-planMeta">
          {warnings.length > 0 && (
            <div className="hc-planWarnings">
              <strong>{L(lang, COPY.planWarnings)}</strong>
              <ul>{list(warnings)}</ul>
            </div>
          )}
          {(raw.confidence != null || raw.data_quality) && (
            <small>
              {raw.confidence != null ? `${L(lang, COPY.planConfidence)}: ${raw.confidence}%` : ''}
              {raw.confidence != null && raw.data_quality ? ' · ' : ''}
              {raw.data_quality ? `${L(lang, COPY.planQuality)}: ${raw.data_quality}` : ''}
            </small>
          )}
        </div>
      )}
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
  onSave
}) {
  if (!flow) return null
  const completed = MATCH_SECTIONS.filter((section) => flow.data?.[section.id]).length
  const currentSection = MATCH_SECTIONS[flow.sectionIndex] || MATCH_SECTIONS[0]

  return (
    <div className="hc-matchCard">
      <div className="hc-matchHead">
        <ClipboardList size={17} aria-hidden="true" />
        <strong>{L(lang, COPY.actionMatch)}</strong>
        <span>{completed}/{MATCH_SECTIONS.length}</span>
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
            className="hc-attachAnalyze"
            disabled={typeof flow.isHome !== 'boolean'}
            onClick={onBegin}
          >
            {L(lang, COPY.matchStartPhotos)}
          </button>
        </div>
      )}

      {flow.phase === 'upload' && (
        <div className="hc-matchUpload">
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
          <div className="hc-matchUploadActions">
            <button type="button" className="hc-matchUploadButton" onClick={onCamera} disabled={analyzing}>
              <Camera size={15} aria-hidden="true" />
              {L(lang, COPY.attachCamera)}
            </button>
            <button type="button" className="hc-matchUploadButton" onClick={onGallery} disabled={analyzing}>
              <ImagePlus size={15} aria-hidden="true" />
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
          <div className="hc-matchUploadFooter">
            <button type="button" className="hc-saveLater" onClick={onSkip} disabled={analyzing}>
              {L(lang, COPY.matchSkip)}
            </button>
            <button type="button" className="hc-attachAnalyze" onClick={onRead} disabled={!attachments.length || analyzing || lowHp}>
              {analyzing ? L(lang, COPY.attachAnalyzing) : L(lang, COPY.attachRead)}
            </button>
          </div>
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
          <button type="button" className="hc-attachAnalyze" onClick={onSave} disabled={saving || completed < 3}>
            {saving ? L(lang, COPY.matchSaving) : L(lang, COPY.matchSave)}
          </button>
        </div>
      )}
    </div>
  )
}

function AssetUploadCard({
  flow,
  lang,
  attachments,
  analyzing,
  saving,
  lowHp,
  onCamera,
  onGallery,
  onRead,
  onSave
}) {
  if (!flow) return null
  const isRoster = flow.type === 'roster'
  const title = flow.type === 'coach'
    ? COPY.actionCoach
    : flow.type === 'player'
      ? COPY.actionPlayer
      : COPY.actionRoster
  const maxImages = isRoster ? 12 : 1
  const results = Array.isArray(flow.results) ? flow.results : []
  const canRead = attachments.length > 0 && !analyzing && !lowHp

  return (
    <div className="hc-assetCard">
      <div className="hc-matchHead">
        <Users size={17} aria-hidden="true" />
        <strong>{L(lang, title)}</strong>
        <span>{flow.phase === 'review' ? results.length : `${attachments.length}/${maxImages}`}</span>
      </div>
      <p className="hc-assetIntro">{L(lang, flow.type === 'coach' ? COPY.assetIntroCoach : flow.type === 'player' ? COPY.assetIntroPlayer : COPY.assetIntroRoster)}</p>

      {flow.phase === 'upload' && (
        <>
          <div className="hc-matchUploadActions">
            <button type="button" className="hc-matchUploadButton" onClick={onCamera} disabled={analyzing}>
              <Camera size={15} aria-hidden="true" />
              {L(lang, COPY.attachCamera)}
            </button>
            <button type="button" className="hc-matchUploadButton" onClick={onGallery} disabled={analyzing}>
              <ImagePlus size={15} aria-hidden="true" />
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
          <button type="button" className="hc-attachAnalyze" onClick={onRead} disabled={!canRead}>
            {analyzing ? L(lang, COPY.attachAnalyzing) : L(lang, COPY.assetRead)}
          </button>
        </>
      )}

      {flow.phase === 'review' && (
        <>
          <p className="hc-assetPreview">{L(lang, COPY.assetPreview)}</p>
          <div className="hc-assetResults">
            {results.map((item, index) => (
              <div className="hc-assetResult" key={`${item.player_name || item.coach_name || index}-${index}`}>
                <strong>{item.player_name || item.coach_name || L(lang, COPY.assetEmpty)}</strong>
                <span>
                  {item.position || item.team || item.nationality || item.category || ''}
                  {item.overall_rating ? ` · ${item.overall_rating}` : ''}
                </span>
              </div>
            ))}
          </div>
          <button type="button" className="hc-attachAnalyze" onClick={onSave} disabled={saving || !results.length}>
            {saving ? L(lang, COPY.assetSaving) : L(lang, COPY.assetSave)}
          </button>
        </>
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
  const [attachmentMode, setAttachmentMode] = React.useState('stats') // stats | counter | match
  const [matchFlow, setMatchFlow] = React.useState(null)
  const [matchSaving, setMatchSaving] = React.useState(false)
  const [feedbackMatchId, setFeedbackMatchId] = React.useState(null)
  const [lastSavedMatchId, setLastSavedMatchId] = React.useState(null)
  const [assetFlow, setAssetFlow] = React.useState(null)
  const [assetSaving, setAssetSaving] = React.useState(false)
  const [threadId, setThreadId] = React.useState(null)
  const [historyLoading, setHistoryLoading] = React.useState(true)
  const [prematchPlan, setPrematchPlan] = React.useState(null)
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

  const enterFeedbackMode = React.useCallback((matchId = null) => {
    setActionsOpen(false)
    setMatchFlow(null)
    setAssetFlow(null)
    setAttachments([])
    setAttachmentMode('stats')
    setFeedbackMode(true)
    setFeedbackMatchId(matchId || null)
    setSaveState('idle')
    setFeedbackMessages([{ role: 'hero', content: L(lang, COPY.feedbackIntro) }])
  }, [lang])

  const exitFeedbackMode = React.useCallback(() => {
    setFeedbackMode(false)
    setFeedbackMatchId(null)
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

  const startAssetUpload = React.useCallback((type) => {
    setActionsOpen(false)
    setFeedbackMode(false)
    setFeedbackMessages([])
    setMatchFlow(null)
    setAttachments([])
    setAttachmentMode('asset')
    setAssetFlow({ type, phase: 'upload', results: [] })
    const copy = type === 'coach' ? COPY.assetIntroCoach : type === 'player' ? COPY.assetIntroPlayer : COPY.assetIntroRoster
    const intro = { role: 'hero', content: L(lang, copy), kind: 'system' }
    setMessages((prev) => [...prev, intro])
    void persistMessages([intro])
  }, [lang, persistMessages])

  const openAssetCamera = React.useCallback(() => {
    setAttachmentMode('asset')
    setActionsOpen(false)
    cameraInputRef.current?.click()
  }, [])

  const openAssetGallery = React.useCallback(() => {
    setAttachmentMode('asset')
    setActionsOpen(false)
    galleryInputRef.current?.click()
  }, [])

  const startMatchUpload = React.useCallback(() => {
    setActionsOpen(false)
    setFeedbackMode(false)
    setFeedbackMessages([])
    setAssetFlow(null)
    setAttachments([])
    setAttachmentMode('match')
    setMatchFlow({
      phase: 'context',
      isHome: null,
      opponentName: '',
      sectionIndex: 0,
      data: {},
      result: null
    })
    const intro = { role: 'hero', content: L(lang, COPY.matchIntro), kind: 'system' }
    setMessages((prev) => [...prev, intro])
    void persistMessages([intro])
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
    const maxFiles = currentSection?.maxImages || (assetFlow ? (assetFlow.type === 'roster' ? 12 : 1) : MAX_ATTACH)
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
    setAttachments(next.slice(0, maxFiles))
  }, [attachments, assetFlow, lang, matchFlow])

  const removeAttachment = React.useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const openCamera = React.useCallback(() => {
    setActionsOpen(false)
    cameraInputRef.current?.click()
  }, [])

  const openStatsCamera = React.useCallback(() => {
    setAttachmentMode('stats')
    openCamera()
  }, [openCamera])

  const openCounterCamera = React.useCallback(() => {
    setAttachmentMode('counter')
    setActionsOpen(false)
    setMessages((prev) => [
      ...prev,
      { role: 'hero', content: L(lang, COPY.counterRequest), kind: 'system' }
    ])
    cameraInputRef.current?.click()
  }, [lang])

  const analyzeAssetAttachments = React.useCallback(async (token, imageDataUrls) => {
    const flow = assetFlow
    if (!flow) throw new Error(L(lang, COPY.attachError))
    const results = []

    for (const imageDataUrl of imageDataUrls) {
      const endpoint = flow.type === 'coach' ? '/api/extract-coach' : '/api/extract-player'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
        },
        body: JSON.stringify({ imageDataUrl })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || L(lang, COPY.attachError))
      const item = flow.type === 'coach' ? data.coach : data.player
      if (item) results.push(item)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
    }

    setAssetFlow((prev) => prev ? { ...prev, phase: 'review', results } : prev)
    setAttachments([])
    const message = {
      role: 'hero',
      content: results.length ? L(lang, COPY.assetPreview) : L(lang, COPY.assetEmpty),
      kind: results.length ? 'success' : 'error'
    }
    setMessages((prev) => [...prev.filter((item) => item.kind !== 'system'), message])
    void persistMessages([message])
  }, [assetFlow, lang, persistMessages])

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
      return {
        ...prev,
        phase: isLast ? 'review' : 'upload',
        sectionIndex: isLast ? prev.sectionIndex : prev.sectionIndex + 1,
        data: { ...prev.data, [MATCH_SECTIONS[prev.sectionIndex].id]: null }
      }
    })
    setAttachments([])
  }, [])

  const saveAssetFlow = React.useCallback(async () => {
    if (!assetFlow || assetFlow.phase !== 'review' || assetSaving || !assetFlow.results?.length) return
    setAssetSaving(true)
    let savedCount = 0
    try {
      const token = await resolveToken()
      if (!token) {
        router.push('/login')
        return
      }
      for (const item of assetFlow.results) {
        const endpoint = assetFlow.type === 'coach' ? '/api/supabase/save-coach' : '/api/supabase/save-player'
        const body = assetFlow.type === 'coach' ? { coach: item } : { player: item }
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data.success === false) throw new Error(data.error || L(lang, COPY.errorGeneric))
        savedCount += 1
      }
      setAssetFlow(null)
      setAttachmentMode('stats')
      setMessages((prev) => [...prev, {
        role: 'hero',
        content: `${savedCount} ${L(lang, assetFlow.type === 'coach' ? COPY.actionCoach : assetFlow.type === 'player' ? COPY.actionPlayer : COPY.actionRoster)} salvato.`,
        kind: 'success'
      }])
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        window.dispatchEvent(new CustomEvent('diagnostic-updated'))
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: 'hero',
        content: savedCount ? `${savedCount} salvato. Il resto non è stato completato.` : L(lang, COPY.errorGeneric),
        kind: 'error'
      }])
    } finally {
      setAssetSaving(false)
    }
  }, [assetFlow, assetSaving, lang, router])

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
      setAttachmentMode('stats')
      const message = { role: 'hero', content: L(lang, COPY.matchSaved), kind: 'success' }
      setMessages((prev) => [...prev, message])
      void persistMessages([message])
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

  const analyzeCountermeasureAttachment = React.useCallback(async (token, imageDataUrls) => {
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
    const matchSection = matchFlow?.phase === 'upload' ? MATCH_SECTIONS[matchFlow.sectionIndex] : null
    const processingMessage = {
      role: 'hero',
      content: attachmentMode === 'asset'
        ? L(lang, COPY.attachAnalyzing)
        : attachmentMode === 'match' && matchSection
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
      if (attachmentMode === 'asset') {
        await analyzeAssetAttachments(token, attachments.map((attachment) => attachment.dataUrl))
        return
      }
      if (attachmentMode === 'match') {
        await analyzeMatchAttachment(token, attachments.map((attachment) => attachment.dataUrl))
        return
      }
      if (attachmentMode === 'counter') {
        const plan = await analyzeCountermeasureAttachment(token, attachments.map((attachment) => attachment.dataUrl))
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
    matchFlow,
    analyzeAssetAttachments,
    analyzeMatchAttachment,
    analyzeCountermeasureAttachment,
    lang,
    router,
    onStatsSuccess,
    persistMessages
  ])

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

        {!feedbackMode && matchFlow && (
          <MatchUploadCard
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
          />
        )}

        {!feedbackMode && assetFlow && (
          <AssetUploadCard
            flow={assetFlow}
            lang={lang}
            attachments={attachments}
            analyzing={attachAnalyzing}
            saving={assetSaving}
            lowHp={lowHp}
            onCamera={openAssetCamera}
            onGallery={openAssetGallery}
            onRead={analyzeAttachments}
            onSave={saveAssetFlow}
          />
        )}

        {!feedbackMode && !matchFlow && !assetFlow && lastSavedMatchId && (
          <div className="hc-afterMatchCard">
            <p>{L(lang, COPY.matchAskFeedback)}</p>
            <button
              type="button"
              className="hc-guidedPrimary"
              onClick={() => enterFeedbackMode(lastSavedMatchId)}
            >
              {L(lang, COPY.actionFeedback)}
            </button>
          </div>
        )}

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
        {stateCopy && stateCta && !feedbackMode && !matchFlow && !assetFlow && (
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

        {/* Suggerimenti reali dal backend: solo dopo una risposta del coach. */}
        {activeSuggestions.length > 0 && !feedbackMode && !matchFlow && !assetFlow && (
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
        {attachments.length > 0 && !matchFlow && !assetFlow && (
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
            {attachments.length < MAX_ATTACH && (
              <div className="hc-attachAddRow">
                <button
                  type="button"
                  className="hc-attachAdd"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={14} aria-hidden="true" />
                  {L(lang, COPY.attachAddPhoto)}
                </button>
                <button
                  type="button"
                  className="hc-attachAdd"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus size={14} aria-hidden="true" />
                  {L(lang, COPY.attachAddGallery)}
                </button>
              </div>
            )}
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

        :global(.hc-planSection) {
          display: block;
          padding: 11px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(0, 0, 0, 0.12);
          font-size: 13px;
        }

        :global(.hc-planSaved) {
          margin: -4px 0 2px;
          color: var(--text-dim);
          font-size: 12px;
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
          font-size: 14px;
        }

        :global(.hc-planHero p),
        :global(.hc-planSection p) {
          margin: 6px 0 0;
          color: var(--text-dim);
          line-height: 1.45;
        }

        :global(.hc-planVisualGrid) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        :global(.hc-planSection summary) {
          cursor: pointer;
          color: var(--text-main);
          font-size: 12px;
          font-weight: 800;
          list-style-position: inside;
        }

        :global(.hc-planListGroup) {
          margin-top: 10px;
        }

        :global(.hc-planListGroup > span),
        :global(.hc-planWarnings > strong) {
          color: var(--accent);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        :global(.hc-planListGroup ul),
        :global(.hc-planWarnings ul) {
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
          background: rgba(255, 255, 255, 0.045);
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
          border-left-color: #ffbf4d;
        }

        :global(.hc-planMeta) {
          display: grid;
          gap: 8px;
          color: var(--text-dim);
          font-size: 11px;
        }

        :global(.hc-planWarnings) {
          padding: 9px;
          border-radius: 10px;
          background: rgba(255, 191, 77, 0.08);
          border: 1px solid rgba(255, 191, 77, 0.2);
        }

        :global(.hc-matchCard) {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(61, 220, 151, 0.32);
          background: linear-gradient(145deg, rgba(61, 220, 151, 0.10), rgba(255, 255, 255, 0.035));
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
          background: rgba(0, 0, 0, 0.16);
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
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-main);
          font: inherit;
          font-size: 13px;
        }

        :global(.hc-matchProgress) {
          display: flex;
          gap: 6px;
        }

        :global(.hc-matchProgressDot) {
          flex: 1;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
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

        :global(.hc-matchUploadActions),
        :global(.hc-matchUploadFooter) {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        :global(.hc-matchUploadButton) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 38px;
          flex: 1 1 130px;
          padding: 7px 10px;
          border-radius: 10px;
          border: 1px solid var(--border-soft);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        :global(.hc-matchUploadButton:hover) {
          border-color: var(--accent-border);
          color: var(--accent);
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
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid var(--accent-border);
        }

        :global(.hc-matchUploadFooter) {
          flex-direction: column;
          align-items: stretch;
        }

        :global(.hc-matchUploadFooter .hc-saveLater) {
          align-self: center;
          min-height: 32px;
          padding: 4px 10px;
          font-size: 12px;
        }

        :global(.hc-matchUploadFooter .hc-attachAnalyze) {
          width: 100%;
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
          background: rgba(0, 0, 0, 0.15);
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

        :global(.hc-assetCard) {
          display: flex;
          flex-direction: column;
          gap: 11px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(125, 211, 252, 0.28);
          background: linear-gradient(145deg, rgba(37, 99, 235, 0.11), rgba(255, 255, 255, 0.035));
        }

        :global(.hc-assetIntro),
        :global(.hc-assetPreview) {
          margin: 0;
          color: var(--text-dim);
          font-size: 12px;
          line-height: 1.45;
        }

        :global(.hc-assetResults) {
          display: grid;
          gap: 6px;
          max-height: 230px;
          overflow: auto;
        }

        :global(.hc-assetResult) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 9px;
          border-radius: 9px;
          background: rgba(0, 0, 0, 0.16);
          color: var(--text-main);
          font-size: 12px;
        }

        :global(.hc-assetResult span) {
          color: var(--text-dim);
          font-size: 11px;
          text-align: right;
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

          :global(.hc-planVisualGrid) {
            grid-template-columns: 1fr;
          }

        }
      `}</style>
    </div>
  )
}
