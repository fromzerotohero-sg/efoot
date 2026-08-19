/**
 * RAG Helper per info_rag.md
 * Recupero sezioni rilevanti per domande eFootball nella chat (solo consigli tattici).
 * Fase 1 MVP: keyword + parsing per ## (sezioni).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** Path info_rag.md: su Vercel __dirname è nel bundle, non in lib/; usiamo cwd (project root). */
function getInfoRagPath() {
  const fromCwd = path.join(process.cwd(), 'info_rag.md')
  if (fs.existsSync(fromCwd)) return fromCwd
  const fromDirname = path.join(__dirname, '..', 'info_rag.md')
  if (fs.existsSync(fromDirname)) return fromDirname
  return fromCwd
}

/** Cache contenuto e sezioni (in memoria) */
let cachedContent = null
let cachedSections = null

/** Massimo caratteri per sezioni RAG in una singola richiesta (limite token/costo). */
const DEFAULT_MAX_CHARS = 32000

/**
 * Mappa: titolo sezione (come in info_rag) -> parole chiave per matching (minuscolo)
 * Le keyword servono per capire quando includere la sezione in base al messaggio utente.
 */
const SECTION_KEYWORDS = {
  'OBIETTIVO': [
    'obiettivo', 'scopo', 'cosa fa', 'a cosa serve',
    'objective', 'goal',
    'objetivo', 'proposito', 'propósito', 'qué hace', 'para qué sirve'
  ],
  'CONTESTO VIDEOGIOCO (FONDAMENTALE)': [
    'contesto videogioco', 'card digitali', 'fisso vs modificabile', 'terminologia ufficiale effotball',
    'statistiche fisse', 'cosa è modificabile', 'regola oro',
    'contexto videojuego', 'cartas digitales', 'fijo vs modificable', 'terminología oficial efootball',
    'estadísticas fijas', 'qué es modificable', 'regla de oro'
  ],
  '1. STATISTICHE GIOCATORI (UFFICIALI eFootball)': [
    'statistiche', 'colpo di testa', 'calci da fermo', 'tiro a giro', 'velocità', 'accelerazione',
    'potenza di tiro', 'finalizzazione', 'possesso stretto', 'passaggio rasoterra', 'passaggio alto',
    'dribbling', 'controllo palla', 'comportamento offensivo', 'comportamento difensivo', 'contrasto',
    'aggressività', 'coinvolgimento difensivo', 'resistenza', 'contatto fisico', 'controllo corpo',
    'salto', 'equilibrio', 'riflessi pt', 'estensione pt', 'presa pt', 'parata pt',
    'frequenza piede debole', 'precisione piede debole', 'forma', 'resistenza infortuni',
    'soglie', 'meta', 'velocità difensori', 'cb ', 'terzini',
    'estadísticas', 'remate de cabeza', 'tiros libres', 'efecto', 'velocidad', 'aceleración',
    'potencia de tiro', 'finalización', 'regate en corto', 'pase raso', 'pase alto',
    'regate', 'control del balón', 'ofensivo', 'conciencia defensiva', 'entradas',
    'agresividad', 'implicación defensiva', 'resistencia', 'contacto físico', 'control corporal',
    'salto', 'equilibrio', 'reflejos', 'alcance', 'atrapada', 'despeje',
    'frec. pierna mala', 'prec. pierna mala', 'forma', 'resist. lesiones',
    'umbrales', 'velocidad defensores', 'laterales'
  ],
  '2. STILI GIOCATORE - Caratteristica card (FISSI)': [
    'stile giocatore', 'playing style giocatore', 'opportunista', 'punta avanzata', 'adv striker', 'advanced striker', 'senza palla', "rapace d'area", 'fulcro',
    'attacante di rientro', 'punta arretrata', 'deep lying forward', 'giocatore chiave', 'specialista cross', 'classico 10', 'regista creativo', 'ala prolifica', 'taglio al centro',
    'tra le linee', 'sviluppo', 'frontale extra', 'incontrista', 'onnipresente', 'collante',
    'box-to-box', 'giocatore chiave', 'hole player', 'orchestrator', 'anchor man', 'terzino offensivo', 'terzino difensivo', 'terzino mattatore',
    'portiere offensivo', 'portiere difensivo', 'funambolo', 'serpentina', 'treno in corsa',
    'stile di gioco in attacco', 'stile di gioco in difesa', 'attacking playstyle', 'defensive playstyle',
    'pressione in attacco', 'frontline pressure', 'front line pressure',
    'front line poacher', 'frontline poacher', 'front line', 'rapace in avanti',
    'fulcro dell\'attacco', 'fulcro dell attacco', 'attack outlet',
    'difensore instancabile', 'all-action defender', 'all action defender',
    'disturbatore di passaggi', 'pass disruptor',
    'ruolo di copertura', 'covering role',
    'maestro della difesa alta', 'high line master',
    'pt stopper', 'sweeper gk', 'fase senza palla', 'senza possesso',
    'come funziona lo stile', 'che stile e', "che stile e'", 'cosa e lo stile', "cos'e lo stile",
    'inserimento', 'esperto palle lunghe', 'crossatore', 'tiratore',
    'che punta', 'che mediano', 'quale stile', 'quando serve', 'chi metto', 'chi schiero',
    'estilo jugador', 'oportunista', 'finta carrera', 'cazagoles', 'delantero de apoyo',
    'hombre objetivo', 'jugador clave', 'especialista en centros', 'clásico nº10', 'mediapunta creativo', 'extremo prolífico', 'extremo interior',
    'orquestador', 'construcción', 'defensa ofensivo', 'destructor', 'box-to-box★', 'ancla',
    'lateral ofensivo', 'lateral defensivo', 'lateral finalizador',
    'portero ofensivo', 'portero defensivo', 'funambulista', 'serpenteo', 'tren en carrera',
    'desmarque', 'experto balones largos', 'centrador', 'tirador',
    'qué delantero', 'qué mediocentro', 'qué estilo', 'cuándo usar', 'a quién pongo', 'a quién alinear'
  ],
  '3. MODULI TATTICI (CONFIGURABILI)': [
    'moduli tattici', 'modulo', 'che modulo', 'quale modulo', 'formazione', '4-3-3', '4-2-3-1', '4-4-2', '4-1-2-3', '4-5-1', '4-4-1-1',
    '4-2-2-2', '3-5-2', '3-4-3', '3-1-4-2', '3-4-1-2', '5-3-2', '5-4-1', '5-2-3',
    'che formazione', 'formazione per', 'formazione contro', 'formazione fluida', 'fluid formation',
    'which formation', 'what formation', 'formation against',
    'mediano', 'mezzala', 'regista basso', 'ala tagliente', 'ala pura',
    'modulos tacticos', 'módulos tácticos', 'modulo', 'qué módulo', 'cuál módulo', 'formacion', 'formación', 'formacion fluida', 'formación fluida',
    'mediocentro defensivo', 'interior', 'organizador bajo', 'extremo corte', 'extremo puro'
  ],
  '4. STILI SQUADRA - Tattica (configurabili)': [
    'stile squadra', 'stili tattici', 'team style', 'possesso palla', 'contropiede veloce', 'contrattacco', 'passaggio lungo',
    'vie laterali', 'pressing totale', 'overload', 'attacco diretto', 'cross e finalizzazione', 'attacco centrale',
    'pressing alto', 'difesa bassa', 'pressing selettivo', 'contenimento difensivo',
    'costruzione posizionale', 'lancio lungo', 'costruzione triangoli',
    'gegenpressing', 'tiki-taka', 'catenaccio', 'pressing costante',
    'out wide', 'contropiede', 'gioco diretto',
    'estilo equipo', 'estilos tácticos', 'posesión', 'contraataque rápido', 'contraataque', 'balón largo',
    'bandas', 'presion total', 'presión total', 'overload', 'ataque directo', 'centro y finalización', 'ataque central',
    'presión alta', 'defensa baja', 'presión selectiva', 'contención defensiva',
    'construcción posicional', 'lanzamiento largo', 'construcción triángulos',
    'juego directo'
  ],
  '5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)': [
    'istruzioni individuali', 'difensivo', 'offensivo', 'ancoraggio', 'anchoring',
    'linea bassa', 'deep line', 'offensivo', 'offensive instruction', 'legacy', 'rimossa', 'rimosso',
    'linea alta', 'marcatura stretta', 'marcatura uomo', 'contropiede',
    'slot offensive', 'slot difensive',
    'individual instructions',
    'instrucciones individuales', 'defensivo', 'ofensivo', 'anclaje',
    'línea baja', 'línea alta', 'marcaje estrecho', 'marcaje al hombre', 'contraataque',
    'slots ofensivos', 'slots defensivos'
  ],
  '6. CALCI PIAZZATI (CONFIGURABILI)': [
    'calci piazzati', 'punizioni', 'corner', 'rigori', 'scatta', 'sponda al centro',
    'scatta e mantieni', 'palla all ariete', 'equilibrato', 'area piccola', 'treno',
    'da centrocampo', 'due ricevitori', 'in diagonale', 'corner corti', 'linea laterale',
    'marcatura a uomo', 'marcatura a zona', 'palo lontano',
    'primo attaccante', 'secondo attaccante', 'terzo attaccante', 'primo palo', 'secondo palo',
    'jugadas a balón parado', 'faltas', 'córner', 'penaltis', 'arranca', 'apoyo al centro',
    'arranca y mantén', 'balón al ariete', 'equilibrado', 'área pequeña', 'tren',
    'desde medio campo', 'dos receptores', 'en diagonal', 'córner corto', 'línea lateral',
    'marcaje al hombre', 'marcaje en zona', 'palo lejano',
    'primer atacante', 'segundo atacante', 'tercer atacante', 'primer palo', 'segundo palo'
  ],
  '7. MECCANICHE DI GIOCO AVANZATE': [
    'meccaniche', 'meccaniche gioco', 'gestione azioni', 'gestire azioni', 'come gestire', 'azioni offensive', 'azioni difensive',
    'transizione', 'vantaggio', 'svantaggio', 'corner', 'punizione', 'pressing', 'matrice', 'situazione',
    'testa a testa', 'contrasto spalla', 'chiama pressing', 'comandi', 'controllo palla', 'difesa manuale',
    'protezione', 'uno-due', 'passaggio sensazionale', 'tiro sensazionale', 'tiro calibrato',
    'controllo tocco di suola', 'finte', 'dribbling precisione', 'cross', 'finta tiro', 'finta passaggio',
    'volee dinamica', 'volée dinamica', 'dynamic volley',
    'link-up', 'link up', 'link-up play', 'collegamenti', 'conexion', 'conexión',
    'analisi', 'statistiche analisi', 'statistiche uso', 'uso comandi', 'passaggi calibrati', 'passaggio filtrante',
    'incrocio rosa', 'statistiche sbagliate', 'dedurre', 'abilita giocatori statistiche', 'idonei', 'ultime 10 partite',
    'dribbling scatto', 'stop veloce', 'doppio tocco', 'tap trick', 'tap trik', 'elastico', 'sombrero', 'svolta secca',
    'super cancel', 'kick cancel', 'kick feint', 'shot cancel', 'pass cancel',
    'tess cancel', 'croqueta', 'croqueta interrotta', 'double touch cancel',
    'alzata tacco', 'voltati', 'finta stop', 'skill move', 'stop e ricezione',
    'mecánicas', 'mecánicas juego', 'gestión acciones', 'gestionar acciones', 'cómo gestionar', 'acciones ofensivas', 'acciones defensivas',
    'transición', 'ventaja', 'desventaja', 'córner', 'falta', 'presión', 'matriz', 'situación',
    'cabeza a cabeza', 'choque hombro', 'llamar presión', 'comandos', 'control balón', 'defensa manual',
    'protección', 'pared', 'pase sensacional', 'tiro sensacional', 'tiro colocado',
    'control suela', 'fintas', 'regate precisión', 'centro', 'finta tiro', 'finta pase',
    'análisis', 'estadísticas análisis', 'estadísticas uso', 'uso comandos', 'pases medidos', 'pase filtrado',
    'cruce plantilla', 'estadísticas erróneas', 'deducir', 'habilidades jugadores estadísticas', 'idóneos', 'últimas 10 partidas',
    'regate arrancada', 'parada rápida', 'doble toque', 'giro seco',
    'cancel', 'croqueta interrumpida', 'double touch cancel',
    'elevación tacón', 'gírate', 'finta parada', 'parada y recepción'
  ],
  '8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)': [
    'abilita', 'abilita giocatore', 'abilita da aggiungere', 'aggiungere abilita', 'quali abilita',
    'che abilita', 'programmi abilita', 'programmi aggiunta abilita', 'skill programs', 'add skill',
    'abilità giocatore', 'programmi aggiunta abilità', 'abilità obbligatorie', 'tornante',
    'piedi magnetici', 'magnetic feet', 'calamita ai piedi', 'shadow hunt', 'caccia all ombra',
    'showtime', 'momentum dribbling', 'tap trick', 'tap trik', 'trickster', 'passaggio fenomenale', 'blitz curler',
    'attacking surge', 'sprint in attacco',
    'super riserva', 'riserva di lusso',
    'spirito combattivo', 'astuzia', 'tattica',
    'tiro di prima', 'tiro al volo', 'tiro a giro', 'tiro potente', 'tiro a scendere',
    'tiro a salire', 'a giro da distante', 'esterno a giro', 'colpo di testa', 'finalizzazione acrobatica',
    'pallonetto mirato', 'tiro di collo', 'pallonetto',
    'passaggio di prima', 'passaggio filtrante', 'passaggio calibrato', 'lancio lungo preciso',
    'passaggio a scavalcare', 'no-look', 'passaggio dosato', 'weighted pass',
    'cross calibrato', 'cross preciso', 'doppio tocco', 'finta doppio passo', 'elastico', 'veronica',
    'controllo di suola', 'rimbalzo interno', 'taglia alle spalle', 'sombrero', 'svolta secca',
    'contrasto aggressivo', 'intercettazione', 'marcatore', 'marcatura', 'scivolata', 'muro',
    'tornante', 'rientro difensivo', 'track back', 'disimpegno acrobatico', 'dominio palle alte',
    'riflessi felini', 'presa sicura', 'uscita portiere', 'parata con piedi', 'rilancio basso', 'rilancio alto', 'parata rigori',
    'scatto', 'resistenza superiore', 'leader', 'super riserva', 'spirito combattivo', 'tattica',
    'habilidades', 'habilidades jugador', 'habilidades añadir', 'añadir habilidades', 'qué habilidades',
    'programas habilidades', 'programas añadir habilidad', 'habilidades obligatorias', 'recuperación',
    'pies magnéticos', 'caza sombra',
    'remate de primera', 'tiro al vuelo', 'tiro con efecto', 'tiro potente', 'tiro con caída',
    'tiro ascendente', 'con efecto lejano', 'remate con exterior', 'cabezazo', 'finalización acrobática',
    'vaselina precisa', 'tiro nudillo', 'vaselina',
    'pase de primera', 'pase filtrado', 'pase medido', 'pase largo preciso',
    'pase elevado', 'pase dosificado',
    'centro medido', 'centro preciso', 'doble toque', 'finta bicicleta', 'elástica', 'sombrero',
    'control con suela', 'rebote interior', 'corte atrás y giro', 'giro seco',
    'entrada agresiva', 'interceptación', 'marcador', 'marcaje', 'entrada deslizante', 'tapón',
    'recuperación', 'repliegue defensivo', 'despeje acrobático', 'dominio balones altos',
    'reflejos felinos', 'atrapada segura', 'salida portero', 'parada con pies', 'saque bajo', 'saque alto', 'parada penaltis',
    'arrancada', 'resistencia superior', 'líder', 'super reserva', 'espíritu combativo', 'astucia'
  ],
  '9. COMPETENZE E SVILUPPO': [
    'competenze sviluppo', 'tipologie giocatori', 'trending', 'in evidenza', 'in risalto',
    'epico', 'leggendario', 'standard', 'valore giocatore', 'vg', 'competenza posizione',
    'livello competenza', 'basso', 'intermedio', 'alto', 'programmi aggiunta posizione',
    'forza base', 'forza complessiva', 'alchimia',
    'frecce forma', 'freccia su', 'freccia giù', 'forma giocatore',
    'competencias desarrollo', 'tipos jugadores', 'destacado',
    'épico', 'legendario', 'estándar', 'valor jugador', 'competencia posición',
    'nivel competencia', 'bajo', 'intermedio', 'alto', 'programas añadir posición',
    'fuerza base', 'fuerza total', 'alquimia',
    'flechas forma', 'flecha arriba', 'flecha abajo', 'forma jugador'
  ]
  // Ex §10 (NOTE CRITICHE): policy spostate in assistant-chat COACH_AI_POLICIES_*
}

/**
 * Carica il contenuto di info_rag.md (con cache)
 * @returns {string}
 */
function loadInfoRagContent() {
  if (cachedContent !== null) return cachedContent
  const infoRagPath = getInfoRagPath()
  try {
    cachedContent = fs.readFileSync(infoRagPath, 'utf-8')
    if (cachedContent && cachedContent.length > 0) {
      if (process.env.NODE_ENV !== 'production') console.log('[ragHelper] info_rag.md loaded, length:', cachedContent.length)
    }
    return cachedContent
  } catch (error) {
    console.error('[ragHelper] Error loading info_rag.md:', error.message, 'path:', infoRagPath)
    return ''
  }
}

/**
 * Parsing: spezza il file per sezioni ## TITOLO (riga che inizia con ## ).
 * content = solo corpo della sezione (senza la riga ## TITOLO).
 * @param {string} content
 * @returns {Array<{ title: string, content: string }>}
 */
function parseSections(content) {
  if (!content || content.trim().length === 0) return []

  const sections = []
  const re = /^## (.+)$/gm
  let match
  let lastTitle = null
  let lastBodyStart = 0

  while ((match = re.exec(content)) !== null) {
    if (lastTitle !== null) {
      const bodyEnd = match.index
      const sectionContent = content.slice(lastBodyStart, bodyEnd).trim()
      if (sectionContent.length > 0) {
        sections.push({ title: lastTitle, content: sectionContent })
      }
    }
    lastTitle = match[1].trim()
    lastBodyStart = match.index + match[0].length
    if (content[lastBodyStart] === '\n') lastBodyStart += 1
  }
  if (lastTitle !== null) {
    const sectionContent = content.slice(lastBodyStart).trim()
    if (sectionContent.length > 0) {
      sections.push({ title: lastTitle, content: sectionContent })
    }
  }

  return sections
}

/**
 * Restituisce le sezioni parse (con cache)
 * @returns {Array<{ title: string, content: string }>}
 */
function getSections() {
  if (cachedSections !== null) return cachedSections
  const content = loadInfoRagContent()
  cachedSections = parseSections(content)
  return cachedSections
}

/**
 * Conta quante keyword della sezione compaiono nel messaggio (normalizzato)
 * @param {string} sectionTitle
 * @param {string} messageNorm
 * @returns {number}
 */
function scoreSection(sectionTitle, messageNorm) {
  const keywords = SECTION_KEYWORDS[sectionTitle]
  if (!keywords || keywords.length === 0) return 0
  let count = 0
  for (const kw of keywords) {
    if (messageNorm.includes(kw)) count += 1
  }
  return count
}

/** Keyword per ruolo (stili giocatori): se il messaggio è chiaramente su un solo ruolo, restituiamo solo quel blocco */
const ROLE_ATTACCANTI_KEYWORDS = [
  'punte', 'punta', 'attaccanti', 'attaccante', 'striker', 'strikers', 'forward', 'forwards',
  'finalizzatore', 'cacciatore di gol', 'ala prolifica', 'istinto di attacante', 'istinto attacante', 'opportunista', "rapace d'area", 'rapace d area', 'fulcro',
  'eda', 'esa', 'p ', ' sp ', ' trq ', 'centravanti',
  'delanteros', 'delantero', 'delanteras', 'atacantes', 'atacante',
  'oportunista', 'cazagoles', 'extremo prolífico', 'hombre objetivo', 'cazador de goles',
  'sd', 'dc ',
  'finalizador'
]
const ROLE_CENTROCAMPISTI_KEYWORDS = [
  'centrocampo', 'centrocampisti', 'centrocampista', 'mediano', 'mediani', 'collante',
  'box-to-box', 'tra le linee', 'sviluppo', 'incontrista', 'onnipresente', 'giocatore chiave',
  'med ', ' cc ', 'mezzala', 'trequartista',
  'centrocampo', 'centrocampistas', 'centrocampista', 'mediocentro', 'mediocentros', 'ancla',
  'orquestador', 'construcción', 'destructor', 'box-to-box★', 'jugador clave',
  'mcd ', ' mc ', 'interior', 'mediapunta'
]
const ROLE_DIFENSORI_KEYWORDS = [
  'difensori', 'difensore', 'difesa', 'terzino', 'terzini', 'centrale', 'dc ', ' td ', ' ts ',
  'difensore distruttore', 'frontale extra', 'stopper', 'libero',
  'defensores', 'defensor', 'defensa', 'lateral', 'laterales', 'central', 'dfc ',
  'defensa ofensivo', 'destructor defensivo'
]

/**
 * Restituisce il contenuto della sezione STILI GIOCATORE filtrato per ruolo.
 * info_rag usa #### Attaccanti e Centrocampisti Offensivi | Centrocampisti e Difensori | Terzini e Portieri.
 * Se messaggio su attaccanti → blocco 1. Centrocampisti → blocco 2. Difensori → blocchi 2+3.
 * @param {string} userMessage - Messaggio utente (normalizzato non richiesto, fatto internamente)
 * @param {string} fullContent - Corpo completo della sezione STILI GIOCATORE
 * @returns {string}
 */
function getStiliContentFilteredByRole(userMessage, fullContent) {
  if (!fullContent || typeof fullContent !== 'string') return fullContent || ''
  const msg = (userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
  const hasAtt = ROLE_ATTACCANTI_KEYWORDS.some(kw => msg.includes(kw.replace(/'/g, ' ').trim()))
  const hasMid = ROLE_CENTROCAMPISTI_KEYWORDS.some(kw => msg.includes(kw))
  const hasDef = ROLE_DIFENSORI_KEYWORDS.some(kw => msg.includes(kw))
  const count = [hasAtt, hasMid, hasDef].filter(Boolean).length
  if (count !== 1) return fullContent

  const re = /^#### (Attaccanti e Centrocampisti Offensivi|Centrocampisti e Difensori|Terzini e Portieri|Delanteros y Centrocampistas Ofensivos|Centrocampistas y Defensores|Laterales y Porteros)\s*$/gm
  const blocks = []
  let lastIndex = 0
  let match
  while ((match = re.exec(fullContent)) !== null) {
    if (lastIndex < match.index) {
      const chunk = fullContent.slice(lastIndex, match.index).trim()
      if (chunk.length > 0) blocks.push({ title: null, content: chunk })
    }
    lastIndex = match.index + match[0].length
    const nextMatch = re.exec(fullContent)
    re.lastIndex = nextMatch ? nextMatch.index : fullContent.length
    const end = nextMatch ? nextMatch.index : fullContent.length
    const body = fullContent.slice(lastIndex, end).trim()
    if (body.length > 0) blocks.push({ title: match[1], content: body })
    lastIndex = end
    if (!nextMatch) break
  }
  if (blocks.length === 0) return fullContent

  const intro = blocks.find(b => b.title === null)
  const introText = intro ? intro.content + '\n\n' : ''
  let chosen = null
  if (hasAtt) chosen = blocks.find(b => b.title === 'Attaccanti e Centrocampisti Offensivi' || b.title === 'Delanteros y Centrocampistas Ofensivos')
  else if (hasMid) chosen = blocks.find(b => b.title === 'Centrocampisti e Difensori' || b.title === 'Centrocampistas y Defensores')
  else if (hasDef) {
    const b2 = blocks.find(b => b.title === 'Centrocampisti e Difensori' || b.title === 'Centrocampistas y Defensores')
    const b3 = blocks.find(b => b.title === 'Terzini e Portieri' || b.title === 'Laterales y Porteros')
    if (b2 && b3) {
      return introText + '#### Centrocampisti e Difensori\n\n' + b2.content + '\n\n#### Terzini e Portieri\n\n' + b3.content
    }
    chosen = b3 || b2
  }
  if (!chosen) return fullContent
  return introText + '#### ' + chosen.title + '\n\n' + chosen.content
}

const MECCANICHE_TITLE = '7. MECCANICHE DI GIOCO AVANZATE'
const MECCANICHE_TITLE_FALLBACK = 'meccaniche di gioco avanzate'

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[''`´’‘]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isMeccanicheSectionTitle(title) {
  return normalizeText(title).includes(MECCANICHE_TITLE_FALLBACK)
}

function extractSubsection(content, subsectionTitle) {
  if (!content || !subsectionTitle) return ''
  const escaped = subsectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const startRe = new RegExp(`(^|\\n)###\\s+${escaped}\\b`, 'i')
  const startMatch = content.match(startRe)
  if (!startMatch || startMatch.index == null) return ''
  const startIdx = startMatch.index + (startMatch[1] ? startMatch[1].length : 0)
  const tail = content.slice(startIdx)
  const nextHeadingIdx = tail.slice(1).search(/\n###\s+\d+\.\d+\b/)
  if (nextHeadingIdx < 0) return tail.trim()
  return tail.slice(0, nextHeadingIdx + 1).trim()
}

/** Keyword che indicano domanda su gameplay / analisi: dare bonus a sez. 7 per includerla più spesso */
const GAMEPLAY_HINT = [
  'come difend', 'come gestir', 'pressing', 'partita', 'in campo', 'in match',
  'calci piazzati', 'corner', 'punizioni', 'difesa', 'attacco', 'transiz',
  'statistiche', 'analisi', 'uso comandi', 'passaggi calibrati', 'dedurre',
  'compattezza', 'linea alta', 'linea bassa', 'pressing totale', 'overload', 'formazione fluida', 'possesso', 'costruzione',
  'presion total', 'presión total', 'formacion fluida', 'formación fluida', 'link-up',
  'super cancel', 'kick cancel', 'kick feint', 'shot cancel', 'pass cancel',
  'tess cancel', 'croqueta', 'croqueta interrotta', 'double touch cancel'
]

/** Domande su quali abilità aggiungere / Programmi — priorità sez. 8, non meccaniche §7 */
const ROSTER_ABILITY_ADVICE_HINT = [
  'abilita', 'skill', 'programmi', 'aggiung', 'consigli', 'suggerisc', 'manc', 'quali', 'che abilit', 'add skill'
]

const TAP_TRICK_HINT = ['tap trick', 'tap trik']
const ATTACKING_SURGE_HINT = ['attacking surge', 'sprint in attacco']

/** Domande su stili giocatore (fase attacco/difesa): priorità sez. 2, non meccaniche §7 */
const STYLE_QUESTION_HINT = [
  'stile giocatore', 'stili giocatore', 'playing style', 'playstyle',
  'stile di gioco in attacco', 'stile di gioco in difesa', 'stile di gioco',
  'rapace in avanti', 'front line poacher', 'frontline poacher',
  'pressione in attacco', 'front line pressure', 'frontline pressure',
  'fulcro dell attacco', 'attack outlet',
  'difensore instancabile', 'all-action defender', 'all action defender',
  'disturbatore di passaggi', 'pass disruptor',
  'ruolo di copertura', 'covering role',
  'maestro della difesa alta', 'high line master',
  'pt stopper', 'sweeper gk', 'fase senza palla',
  'come funziona lo stile', 'cosa e lo stile', 'cos e lo stile'
]

function isStiliSectionTitle(title) {
  return normalizeText(title).includes('stili giocatore')
}

function isStyleQuestion(messageNorm) {
  return STYLE_QUESTION_HINT.some(hint => messageNorm.includes(hint))
}

function isAbilitaSectionTitle(title) {
  return normalizeText(title).includes('habilidades jugadores') || normalizeText(title).includes('abilita giocatori')
}

function isRosterAbilityAdviceQuestion(messageNorm) {
  const mentionsAbility = messageNorm.includes('abilita') || messageNorm.includes('skill')
  if (!mentionsAbility) return false
  return ROSTER_ABILITY_ADVICE_HINT.some(hint => messageNorm.includes(hint))
}

/** Query esplicitamente su meccaniche cancel/skill avanzate: forza inclusione sez. 7 */
const ADVANCED_CANCEL_HINT = [
  'super cancel', 'kick cancel', 'kick feint', 'shot cancel', 'pass cancel',
  'tess cancel', 'croqueta', 'croqueta interrotta', 'double touch cancel'
]

/**
 * Recupera le sezioni più rilevanti per il messaggio utente, fino a maxChars.
 * Le policy IA (ex §10) sono nel system prompt assistant-chat, non nel RAG.
 * @param {string} userMessage - Messaggio dell'utente
 * @param {number} maxChars - Limite caratteri totale (default 18000)
 * @returns {string} - Blocco di testo (sezioni concatenate) da appendere al prompt
 */
export function getRelevantSections(userMessage, maxChars = DEFAULT_MAX_CHARS) {
  const sections = getSections()
  if (sections.length === 0) return ''

  const messageNorm = normalizeText(userMessage)

  const selected = []
  let total = 0

  const isAbilityAdviceQuestion = isRosterAbilityAdviceQuestion(messageNorm)
  const isTapTrickQuestion = TAP_TRICK_HINT.some(hint => messageNorm.includes(hint))
  const isAttackingSurgeQuestion = ATTACKING_SURGE_HINT.some(hint => messageNorm.includes(hint))
  const isPlayerStyleQuestion = isStyleQuestion(messageNorm)
  // Bonus punteggio per sez. 7 (MECCANICHE) se la domanda sembra su gameplay (non consigli Programmi abilità / stili card)
  const isGameplayQuestion =
    !isAbilityAdviceQuestion &&
    !isPlayerStyleQuestion &&
    GAMEPLAY_HINT.some(hint => messageNorm.includes(hint))
  const isAdvancedCancelQuestion = ADVANCED_CANCEL_HINT.some(hint => messageNorm.includes(hint))
  const scored = sections
    .map(s => ({
      ...s,
      score:
        scoreSection(s.title, messageNorm) +
        (isMeccanicheSectionTitle(s.title) && isGameplayQuestion ? 3 : 0) +
        (isAbilitaSectionTitle(s.title) && isAbilityAdviceQuestion ? 6 : 0) +
        (isStiliSectionTitle(s.title) && isPlayerStyleQuestion ? 8 : 0)
    }))

  scored.sort((a, b) => b.score - a.score)

  if (isPlayerStyleQuestion) {
    const stiliSection = scored.find(s => isStiliSectionTitle(s.title))
    if (stiliSection && !selected.some(x => x.title === stiliSection.title)) {
      if (stiliSection.content.length <= maxChars) {
        selected.push(stiliSection)
        total += stiliSection.content.length
      }
    }
  }

  if (isAbilityAdviceQuestion || isTapTrickQuestion || isAttackingSurgeQuestion) {
    const abilitaSection = scored.find(s => isAbilitaSectionTitle(s.title))
    if (abilitaSection && !selected.some(x => x.title === abilitaSection.title)) {
      if (abilitaSection.content.length <= maxChars) {
        selected.push(abilitaSection)
        total += abilitaSection.content.length
      } else if (isTapTrickQuestion) {
        const subsection83 = extractSubsection(abilitaSection.content, '8.3')
        if (subsection83) {
          const condensed = `### 8.3 Abilità Dribbling e Controllo\n\n${subsection83.replace(/^###\s+8\.3[^\n]*\n?/i, '').trim()}`
          selected.push({
            title: abilitaSection.title,
            content: condensed
          })
          total += condensed.length
        }
      }
    }
  }

  // Richieste esplicite su cancel/skill: includi sempre la sezione 7 (contiene anche 7.12).
  if (isAdvancedCancelQuestion) {
    const meccaniche = scored.find(s => isMeccanicheSectionTitle(s.title))
    if (meccaniche) {
      if (meccaniche.content.length <= maxChars) {
        selected.push(meccaniche)
        total += meccaniche.content.length
      } else {
        const subsection712 = extractSubsection(meccaniche.content, '7.12')
        if (subsection712) {
          const condensed = `### 7.12 Meccaniche avanzate \"cancel\" e skill trick (Enterprise)\n\n${subsection712.replace(/^###\s+7\.12[^\n]*\n?/i, '').trim()}`
          selected.push({
            title: MECCANICHE_TITLE,
            content: condensed
          })
          total += condensed.length
        }
      }
    }
  }

  for (const s of scored) {
    const remainingBudget = maxChars - total
    if (total + s.content.length > maxChars && selected.length > 1) break
    if (s.content.length > remainingBudget && selected.length > 1) continue
    const addLen = selected.some(x => x.title === s.title) ? 0 : s.content.length
    if (addLen === 0) continue
    if (total + addLen > maxChars) continue
    if (s.score > 0 || selected.length < 3) {
      selected.push(s)
      total += addLen
    }
  }

  if (selected.length <= 0) {
    const fallback = scored.slice(0, 4).filter(Boolean)
    for (const s of fallback) {
      if (selected.some(x => x.title === s.title)) continue
      if (total + s.content.length <= maxChars) {
        selected.push(s)
        total += s.content.length
      } else if (selected.length <= 1) {
        selected.push(s)
        total += s.content.length
        break
      }
    }
  }

  const STILI_TITLE = '2. STILI GIOCATORE - Caratteristica card (FISSI)'
  return selected
    .map(s => {
      const content = s.title === STILI_TITLE
        ? getStiliContentFilteredByRole(userMessage, s.content)
        : s.content
      return `## ${s.title}\n\n${content}`
    })
    .join('\n\n---\n\n')
}

/** Sezioni info_rag da includere per contesto "analyze-match". Ex §10 (policy IA) ora in system prompt. */
const ANALYZE_MATCH_SECTION_TITLES = [
  '1. STATISTICHE GIOCATORI (UFFICIALI eFootball)',
  '2. STILI GIOCATORE - Caratteristica card (FISSI)',
  '3. MODULI TATTICI (CONFIGURABILI)',
  '4. STILI SQUADRA - Tattica (configurabili)',
  '5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)',
  '6. CALCI PIAZZATI (CONFIGURABILI)',
  '7. MECCANICHE DI GIOCO AVANZATE',
  '8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)',
  '9. COMPETENZE E SVILUPPO'
]

/** Sezioni info_rag da includere per contesto "countermeasures" (strategie serie, pre-partita). Ex §10 (policy IA) ora in system prompt. */
const COUNTERMEASURES_SECTION_TITLES = [
  '3. MODULI TATTICI (CONFIGURABILI)',
  '4. STILI SQUADRA - Tattica (configurabili)',
  '5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)',
  '9. COMPETENZE E SVILUPPO',
  '1. STATISTICHE GIOCATORI (UFFICIALI eFootball)',
  '2. STILI GIOCATORE - Caratteristica card (FISSI)',
  '6. CALCI PIAZZATI (CONFIGURABILI)',
  '8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)'
]

/**
 * Restituisce sezioni info_rag per contesto analyze-match o countermeasures (strategie serie).
 * Non dipende da messaggio utente: usa elenco fisso di sezioni. Stesso RAG della chat, uso diverso.
 * @param {'analyze-match' | 'countermeasures'} contextType
 * @param {number} maxChars - Limite caratteri (default 12000)
 * @returns {string}
 */
export function getRelevantSectionsForContext(contextType, maxChars = 12000) {
  const titles = contextType === 'countermeasures' ? COUNTERMEASURES_SECTION_TITLES : ANALYZE_MATCH_SECTION_TITLES
  const sections = getSections()
  if (!sections || sections.length === 0) return ''

  const byTitle = new Map(sections.map(s => [s.title, s]))
  let total = 0
  const selected = []
  for (const title of titles) {
    const s = byTitle.get(title)
    if (!s) continue
    if (total + s.content.length > maxChars) {
      // Mantieni coerenza: prova le sezioni successive più piccole invece di fermarti al primo overflow.
      if (selected.length === 0) {
        selected.push(s)
        total += s.content.length
      }
      continue
    }
    selected.push(s)
    total += s.content.length
  }

  if (selected.length === 0) return ''
  return selected.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n')
}

/**
 * Termini eFootball: se presenti nel messaggio, la domanda è classificata eFootball (priorità).
 * IT + EN per coerenza bilingue.
 */
const EFOOTBALL_TERMS = [
  // Stili di gioco e ruoli (nomi ufficiali + sinonimi: cacciatore di gol=Opportunista, classico n 10 non trequartista classico)
  'collante', 'orchestrator', 'opportunista', 'cacciatore di gol', 'box-to-box', "rapace d'area", 'rapace d area', 'fulcro', 'istinto di attacante', 'istinto attacante',
  'regista creativo', 'ala prolifica', 'specialista cross', 'senza palla', 'classico 10', 'classico n 10', 'giocatore chiave',
  'onnipresente', 'incontrista', 'sviluppo', 'tra le linee', 'difensore distruttore', 'frontale extra',
  // Stili de juego y roles (nombres oficiales ES + sinónimos)
  'ancla', 'orquestador', 'oportunista', 'cazagoles', 'box-to-box★', 'cazador de goles', 'hombre objetivo',
  'mediapunta creativo', 'extremo prolífico', 'especialista en centros', 'finta carrera', 'clásico nº10', 'jugador clave',
  'destructor', 'construcción', 'defensa ofensivo',
  // Meccaniche di gioco e gestione azioni (RAG sezione 7)
  'meccaniche', 'meccaniche di gioco', 'gestione azioni', 'gestire azioni', 'come gestire', 'come gestisco', 'azioni', 'comandi', 'controllo palla',
  'match-up', 'match up', 'pressing', 'manual defending', 'shadow marking', 'contrasto spalla', 'anticipazione',
  'corner', 'punizione', 'calci piazzati', 'free kick', 'set piece', 'barriera',
  'stile di gioco', 'stili gioco', 'playstyle', 'playing style',
  // Mecánicas de juego ES
  'mecánicas', 'mecánicas de juego', 'gestión acciones', 'gestionar acciones', 'cómo gestionar', 'cómo gestiono', 'acciones', 'comandos', 'control balón',
  'choque hombro', 'anticipación',
  'córner', 'falta', 'jugadas a balón parado', 'barrera',
  'estilo de juego', 'estilos juego',
  // Formazione/MODULO con specifiche (consigli tattici)
  'modulo', 'formazione 4-3-3', '4-2-3-1', '3-5-2', 'che modulo', 'quale modulo', 'quale formazione',
  'mi consigli', 'mi suggerisci', 'cosa ne pensi', 'meglio usare', 'conviene usare',
  // Formación ES
  'módulo', 'formación 4-3-3', 'qué módulo', 'cuál módulo', 'qué formación',
  'me recomiendas', 'me sugieres', 'qué opinas', 'mejor usar', 'conviene usar',
  // Richiesta consiglio specifica e consigli/suggerimenti (RAG meccaniche + note critiche)
  'consigli', 'suggerimenti', 'consiglio su', 'suggerimento su', 'dammi consigli', 'dammi suggerimenti',
  'come devo giocare', 'come gioco contro', 'tattica contro', 'strategia per',
  'ruolo', 'ruoli', 'meccanica', 'meccaniche', 'difesa', 'attacco', 'build', 'build meta', 'meta build', 'progressione', 'punti sviluppo', 'slider', 'build giuste', 'build corrette', 'vanno bene le build', 'sono giuste', 'overall', 'rating',
  'dribbling', 'skill', 'tocco doppio', 'double touch', 'possesso palla', 'contropiede', 'transizione',
  'triangolazione', 'sovrapposizione', 'competenza posizione', 'abilità speciali', 'trait',
  'super cancel', 'kick cancel', 'kick feint', 'shot cancel', 'pass cancel', 'tess cancel', 'croqueta', 'croqueta interrotta', 'double touch cancel',
  'ancoraggio', 'anchoring', 'linea bassa', 'linea alta', 'deep line', 'pressing totale', 'overload', 'formazione fluida', 'fluid formation', 'pressione in attacco', 'frontline pressure', 'front line pressure', 'front line poacher', 'frontline poacher', 'rapace in avanti', 'fulcro dell attacco', 'difensore instancabile', 'disturbatore di passaggi', 'ruolo di copertura', 'maestro della difesa alta', 'pt stopper', 'sweeper gk', 'dynamic volley', 'volée dinamica', 'marcatura stretta', 'marcatura uomo',
  'istruzioni individuali', 'pre-partita', 'in partita',
  'cos\'è ', 'cosa fa ', 'what is ', 'what does ', 'how do i defend', 'come difendo', 'consigli su',
  // Sugerencias ES
  'consejos', 'sugerencias', 'consejo sobre', 'dame consejos', 'dame sugerencias',
  'cómo jugar', 'cómo juego contra', 'táctica contra', 'estrategia para',
  'rol', 'roles', 'mecánica', 'mecánicas', 'defensa', 'ataque', 'construcción', 'progresión', 'puntos desarrollo', 'build correctas', 'son correctas',
  'regate', 'habilidad', 'doble toque', 'posesión', 'contraataque', 'transición',
  'triangulación', 'superposición', 'competencia posición', 'habilidades especiales',
  'anclaje', 'línea baja', 'línea alta', 'presión total', 'overload', 'formación fluida', 'marcaje estrecho', 'marcaje al hombre',
  'instrucciones individuales', 'prepartido', 'en partido',
  '¿qué es ', 'qué hace ', 'cómo defiendo', 'consejos sobre'
]

/**
 * Classifica se la domanda riguarda la PIATTAFORMA (app) o eFootball (meccaniche/tattica/ruoli).
 * Priorità: se nel messaggio c'è un termine eFootball → efootball; altrimenti termini piattaforma → platform; default efootball.
 * @param {string} message
 * @returns {'platform' | 'efootball'}
 */
export { isRosterAbilityAdviceQuestion }

export function classifyQuestion(message) {
  const m = (message || '').toLowerCase().trim()
  if (!m) return 'efootball'

  // Priorità eFootball: domande su stili, meccaniche, ruoli, moduli, calci piazzati, ecc.
  for (const term of EFOOTBALL_TERMS) {
    if (m.includes(term)) return 'efootball'
  }

  const platformTerms = [
    // Italiano: riferimenti ESPLICITI all'app/navigazione (non ambigui con eFootball)
    'dashboard app', 'aggiungi partita', 'caricare partita', 'carico partita', 'upload partita',
    'dove trovo nella app', 'dove si trova nella app', 'funzionalità app',
    'impostazioni profilo app', 'wizard rosa', 'wizard step', 'screenshot pagella',
    'estrai dati', 'salva partita', 'pagelle app', 'campo 2d app',
    'come faccio a caricare', 'non riesco a caricare',
    'dove vado nella app', 'menu app', 'navigazione app', 'piattaforma efoot',
    // English
    'how to add a match', 'upload match', 'add match', 'save match',
    'where do i find in the app', 'profile settings app',
    'how do i upload', 'wizard steps', 'app feature', 'what can you do',
    'guide me through the app',
    // Español: referencias EXPLÍCITAS a la app/navegación
    'panel de la app', 'añadir partido', 'añade partido', 'cargar partido', 'cargo partido',
    'subir partido', 'dónde encuentro en la app', 'dónde está en la app', 'funcionalidad app',
    'ajustes perfil app', 'asistente plantilla', 'pasos asistente', 'captura informe',
    'extraer datos', 'guardar partido', 'informes app', 'campo 2d app',
    'cómo cargo', 'no puedo cargar',
    'dónde voy en la app', 'menú app', 'navegación app', 'plataforma efoot',
    'cómo añadir un partido', 'guíame por la app', 'qué puedes hacer'
  ]
  for (const term of platformTerms) {
    if (m.includes(term)) return 'platform'
  }
  return 'efootball'
}

