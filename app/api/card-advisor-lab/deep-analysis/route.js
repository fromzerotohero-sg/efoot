import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '@/lib/openaiHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { deductCredits, refundCredits } from '@/lib/creditService'
import { getRelevantSections } from '@/lib/ragHelper'
import { getCoachPoliciesText, getCoachSharedCoreText } from '@/lib/coachPromptRules'
import {
  getSkillDisplayLabel,
  getSkillEnglishItalianGlossary,
  localizeSkillTermsInText
} from '@/lib/playerSkillLabels.js'
import { CARD_ADVISOR_SELECT, searchCardAdvisorCardsByName } from '@/lib/cardAdvisorCardsLookup.js'
import { fetchEfhubCardDetail } from '@/lib/efhubPlayerDetail.js'
import { buildSkillDeltaSentence } from '@/lib/cardAdvisorSkillCompare.js'
import { buildPurchaseFactsBlock, normalizePurchaseFit } from '@/lib/cardAdvisorPurchaseContext.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEEP_ANALYSIS_COST = 2
const MODEL = process.env.CARD_ADVISOR_DEEP_MODEL || 'gpt-5.2'

/** Stili di gioco COM; abilità native → getSkillEnglishItalianGlossary (IT ufficiale in-game). */
const STYLE_AND_MECHANIC_GLOSSARY_IT = [
  ['Anchor Man', 'Collante'],
  ['Box To Box', 'Box-to-box'],
  ['Build Up', 'Sviluppo'],
  ['Classic No. 10', 'Classico numero 10'],
  ['Creative Playmaker', 'Regista creativo'],
  ['Dummy Runner', 'Senza palla'],
  ['Extra Frontman', 'Frontale extra'],
  ['Fox In The Box', "Rapace d'area"],
  ['Full-back Finisher', 'Terzino mattatore'],
  ['Goal Poacher', 'Opportunista'],
  ['Hole Player', 'Giocatore chiave'],
  ['Offensive Goalkeeper', 'Portiere offensivo'],
  ['Offensive Wingback', 'Terzino offensivo'],
  ['Orchestrator', 'Orchestratore'],
  ['Prolific Winger', 'Ala prolifica'],
  ['Roaming Flank', 'Taglio al centro'],
  ['Defensive Full-back', 'Terzino difensivo'],
  ['Offensive Full-back', 'Terzino offensivo'],
  ['Destroyer', 'Incontrista'],
  ['Deep-Lying Forward', 'Fulcro di gioco'],
  ['Target Man', 'Fulcro di gioco'],
  ['Second Striker', 'Seconda punta'],
  ['False 9', 'Falso 9']
]

const IT_TERM_GLOSSARY = [...getSkillEnglishItalianGlossary(), ...STYLE_AND_MECHANIC_GLOSSARY_IT]
  .sort((a, b) => b[0].length - a[0].length)

function sanitize(value, maxLen = 500) {
  const text = String(value ?? '').replace(/\r\n|\r|\n/g, ' ').trim()
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function localizeItalianTerms(value = '') {
  let text = localizeSkillTermsInText(String(value || ''), 'it')
  IT_TERM_GLOSSARY.forEach(([en, it]) => {
    text = text.replace(new RegExp(`\\b${escapeRegExp(en)}\\b`, 'gi'), it)
  })
  return text
}

function toAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeCard(raw = {}) {
  return {
    id: String(raw.id || raw.sourcePlayerId || ''),
    name: String(raw.name || '').trim(),
    position: String(raw.position || '').trim(),
    overall: Number(raw.overall) || null,
    category: String(raw.category || '').trim(),
    style: String(raw.style || '').trim(),
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    sourcePlayerId: String(raw.sourcePlayerId || '').trim(),
    source: String(raw.source || '').trim()
  }
}

function collectNumbers(input, bucket = {}, path = '') {
  if (input == null) return bucket
  if (typeof input === 'number' && Number.isFinite(input)) {
    bucket[toAscii(path || 'value')] = input
    return bucket
  }
  if (Array.isArray(input)) {
    input.forEach((entry, index) => collectNumbers(entry, bucket, `${path}_${index}`))
    return bucket
  }
  if (typeof input === 'object') {
    Object.entries(input).forEach(([key, value]) => collectNumbers(value, bucket, path ? `${path}_${key}` : key))
  }
  return bucket
}

function pickStat(stats, keywords = []) {
  const numeric = collectNumbers(stats)
  const values = Object.entries(numeric)
    .filter(([key]) => keywords.some(keyword => key.includes(keyword)))
    .map(([, value]) => Number(value))
    .filter(Number.isFinite)
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function summarizeStats(stats = {}) {
  return {
    speed: pickStat(stats, ['speed', 'accel', 'pace']),
    passing: pickStat(stats, ['pass', 'cross', 'curl']),
    defending: pickStat(stats, ['defen', 'tackl', 'intercept', 'aggression']),
    finishing: pickStat(stats, ['finish', 'kicking', 'shot', 'offens']),
    aerial: pickStat(stats, ['heading', 'jump', 'aerial']),
    physical: pickStat(stats, ['phys', 'contact', 'balance', 'stamina', 'strength'])
  }
}

function hasStats(stats) {
  return Boolean(stats && typeof stats === 'object' && Object.keys(stats).length > 0)
}

function sanitizeList(items = [], maxItems = 8, maxLen = 60) {
  return (Array.isArray(items) ? items : [])
    .map(item => sanitize(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems)
}

function canonSkillsForPrompt(rawList, lang, maxItems = 14, maxLen = 60) {
  const code = lang === 'en' ? 'en' : 'it'
  const unique = [...new Set(
    (Array.isArray(rawList) ? rawList : [])
      .map((s) => getSkillDisplayLabel(String(s || '').trim(), code))
      .filter(Boolean)
  )]
  return sanitizeList(unique, maxItems, maxLen)
}

function compactPlayer(player, stylesLookup = {}, lang = 'it') {
  const skills = [
    ...(Array.isArray(player?.skills) ? player.skills : []),
    ...(Array.isArray(player?.com_skills) ? player.com_skills : [])
  ]
  return {
    name: sanitize(player?.player_name, 60),
    position: player?.position || null,
    starter: Number(player?.slot_index) >= 0 && Number(player?.slot_index) <= 10,
    style: (player?.playing_style_id && stylesLookup[player.playing_style_id]) || player?.role || null,
    skills: canonSkillsForPrompt(skills, lang, 8),
    saved_stats: summarizeStats(player?.base_stats || {}),
    stats_basis: {
      source: 'saved_roster_stats',
      note: 'Stats salvate nel profilo rosa; possono rappresentare una build/edit del cliente se importate cosi.',
      current_level: player?.current_level || null,
      level_cap: player?.level_cap || null,
      active_booster_name: player?.active_booster_name || null
    },
    original_positions: Array.isArray(player?.original_positions) ? player.original_positions.slice(0, 6) : [],
    height: player?.height || null,
    weight: player?.weight || null,
    form: player?.form || null
  }
}

async function resolveUserId(userData, admin) {
  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .single()
    if (!existingProfile?.user_id) throw new Error('User profile not found')
    userId = existingProfile.user_id
  }
  return userId
}

async function fetchCardAdvisorCard(admin, card) {
  const safeName = String(card.name || '').replace(/[%_]/g, '').trim()
  let data = []

  if (card.sourcePlayerId) {
    const { data: rows } = await admin
      .from('card_advisor_cards')
      .select(CARD_ADVISOR_SELECT)
      .eq('is_active', true)
      .eq('source', card.source || 'efhub')
      .eq('source_player_id', card.sourcePlayerId)
      .limit(8)
    data = rows || []
  } else {
    if (!safeName) return null
    const { rows } = await searchCardAdvisorCardsByName(admin, {
      name: card.name,
      source: card.source || 'efhub',
      position: card.position,
      limit: 24
    })
    data = rows || []
  }

  if (!Array.isArray(data) || data.length === 0) return null
  return data
    .sort((a, b) => {
      const nameA = toAscii(a.player_name) === toAscii(card.name) ? 8 : 0
      const nameB = toAscii(b.player_name) === toAscii(card.name) ? 8 : 0
      const posA = a.position === card.position ? 4 : 0
      const posB = b.position === card.position ? 4 : 0
      const qualityA = a.enrichment_status === 'complete' ? 4 : a.enrichment_status === 'partial' ? 1 : 0
      const qualityB = b.enrichment_status === 'complete' ? 4 : b.enrichment_status === 'partial' ? 1 : 0
      return (nameB + posB + qualityB) - (nameA + posA + qualityA)
    })[0]
}

function catalogRowHasCompletePackStats(row) {
  return Boolean(
    row &&
    row.enrichment_status === 'complete' &&
    row.base_stats &&
    typeof row.base_stats === 'object' &&
    Object.keys(row.base_stats).length > 0
  )
}

async function resolveCatalogCardForDeepAnalysis(admin, card) {
  const row = await fetchCardAdvisorCard(admin, card).catch(() => null)
  if (catalogRowHasCompletePackStats(row)) return row

  const source = (String(card.source || 'efhub').trim() || 'efhub')
  const id = String(card.sourcePlayerId || '').trim()
  if (source !== 'efhub' || !id) return row

  const live = await fetchEfhubCardDetail({
    ...card,
    source: 'efhub',
    sourcePlayerId: id,
    overall: card.overall != null ? Number(card.overall) : null
  })
  if (!live?.base_stats || typeof live.base_stats !== 'object' || Object.keys(live.base_stats).length === 0) {
    return row
  }

  return {
    ...(row || {}),
    ...live,
    base_stats: live.base_stats,
    max_stats: live.max_stats ?? row?.max_stats ?? null,
    playing_style: live.playing_style || row?.playing_style || card.style || '',
    player_skills:
      Array.isArray(live.player_skills) && live.player_skills.length
        ? live.player_skills
        : row?.player_skills || [],
    player_name: live.player_name || row?.player_name || card.name,
    position: live.position || row?.position || card.position,
    enrichment_status: 'complete',
    overall_display: row?.overall_display ?? live.overall_level_1 ?? null,
    source: 'efhub',
    source_player_id: id
  }
}

function buildPrompt({ lang, card, catalogCard, profile, players, stylesLookup = {}, formation, coach, tacticalSettings, patterns, gameAnalysis, diagnostic, feedback, performance, ragKnowledge, skillDeltaSentence = '', purchaseFactsText = '' }) {
  const isEn = lang === 'en'
  const cardBaseStats = summarizeStats(catalogCard?.base_stats || {})
  const cardMaxStats = summarizeStats(catalogCard?.max_stats || {})
  const cardPayload = {
    name: card.name,
    position: card.position,
    category: card.category,
    source: card.source || catalogCard?.source || null,
    playing_style: card.style || catalogCard?.playing_style || null,
    native_skills: canonSkillsForPrompt([...(card.skills || []), ...(catalogCard?.player_skills || [])], lang, 14),
    base_stats: cardBaseStats,
    max_stats: hasStats(catalogCard?.max_stats) ? cardMaxStats : null,
    stats_basis: {
      source: 'pack_card_base_stats',
      note: 'Questi sono valori base/non buildati della carta pack. Non trattarli come build finale.',
      has_final_build_stats: hasStats(catalogCard?.max_stats)
    },
    position_compatibility: catalogCard?.position_compatibility || null,
    data_quality: catalogCard ? 'catalog_match' : 'release_basic'
  }

  const compactPlayers = players.map(player => compactPlayer(player, stylesLookup, lang))
  const starters = compactPlayers.filter(player => player.starter)
  const reserves = compactPlayers.filter(player => !player.starter)

  const contextPayload = {
    profile: {
      first_name: profile?.first_name || null,
      nickname: profile?.nickname || null,
      team_name: profile?.team_name || null,
      ai_weak_point: profile?.ai_weak_point || null,
      ai_learn_goals: profile?.ai_learn_goals || null,
      ai_notes: profile?.ai_notes || null,
      input_delay: profile?.input_delay || null,
      connection_quality: profile?.connection_quality || null,
      pass_level: profile?.pass_level || null
    },
    roster: {
      has_roster: players.length > 0,
      starters,
      reserves: reserves.slice(0, 20)
    },
    formation: formation || null,
    coach: coach || null,
    tactical_settings: tacticalSettings || null,
    tactical_patterns: patterns || null,
    game_analysis: gameAnalysis?.stats || null,
    diagnostic_summary: diagnostic ? sanitize(diagnostic.content, 3000) : '',
    coach_feedback: feedback,
    player_performance: performance
  }

  return `
Sei una AI coach enterprise specializzata in eFootball e Card Advisor.
LINGUA: rispondi solo in ${isEn ? 'inglese' : 'italiano'}.

RUOLO:
- Devi produrre una analisi premium della carta per questo cliente.
- Devi ragionare come un coach superiore: stile di gioco, movimento automatico, abilità native, statistiche, compagni, rosa, riserve, tattica, coach, diagnosi e dati partita.
- Non devi mostrare il ragionamento interno. Devi mostrare il risultato finale, chiaro, sicuro e utile.

FOCUS:
- La domanda centrale non è "la carta è forte?", ma "questa carta crea valore reale per questa rosa?".
- Se la rosa è presente, parla in modo personalizzato e deciso.
- Se la rosa non è presente, fai solo review carta basata su stile, skill e stats disponibili.
- Quando un dato è presente, usa forma assertiva: "nella tua rosa c'è", "i tuoi dati mostrano", "hai già". Non usare "se hai" o "potrebbe" per dati già disponibili.
- Usa il condizionale solo quando il dato manca o quando stai indicando una scelta strategica del cliente.
- Non parlare di overall/rating come criterio.
- Non inventare nomi, skill, problemi o ruoli non presenti nei dati.
- Stili e abilità sono diversi: lo stile spiega il movimento; le abilità spiegano cosa sa fare.
- Se trovi una combo reale, mettila al centro. Se manca metà combo, dillo.
- Usa il RAG per interpretare movimenti da stile, meccaniche eFootball, movimenti collettivi, abilità e situazioni di gioco. Non copiarlo: applicalo ai dati del cliente.
- Scrivi corto e denso. Niente tema. Ogni campo deve essere leggibile in pochi secondi.

REGOLE SULLE STATISTICHE:
- Le statistiche della CARTA PACK sono valori base/non buildati, salvo quando max_stats è presente. Non chiamarle mai valori finali.
- Le statistiche dei giocatori in ROSA sono dati salvati dal cliente e possono essere già editati/buildati. Non confrontarle numericamente in modo secco con una carta pack base.
- Evita frasi tipo "velocità 73 lo espone", "aereo 84 basta", "passaggio 65 non migliora" se stai usando solo base_stats della carta.
- Usa i numeri base solo come indizi di profilo, sempre insieme a stile, skill native, ruolo, combo e dati della rosa.
- Se serve parlare di limite statistico, scrivi "dai valori base della carta" o "a build non definita", non come verdetto assoluto.

SEMANTICA:
- Usa termini da coach/community: movimento, skill nativa, combo, catena, rotazione, non prioritaria, luxury pick, riferimento in area, attacca spazio, dà ampiezza, tiene posizione, non cambia gerarchie.
- Evita: "fit stile 56%", "bonus sistema", "sinergia principale", "stat edge", "overall", "rating", "buildalo", "potenzialo", "allenalo".
- Se rispondi in italiano, traduci in italiano anche stili, skill e tag tecnici quando possibile: non lasciare frasi con termini inglesi se esiste già l’italiano nel glossario interno (stessi nomi delle liste native_skills / skills della rosa).
- REGOLE SULLE SKILL (obbligatorie): i campi native_skills e roster.*.skills nel JSON sono nomi già normalizzati nella lingua della risposta (${isEn ? 'inglese' : 'italiano'}) — citane esattamente quelli, senza sostituirli con sinonimi diversi. Non attribuire a un giocatore una skill assente dalla sua lista. Non confondere skill simili (es. cross preciso vs passaggio filtrante; tiro al volo vs tiro dalla distanza; muro vs intercettazione). Per “combo” tra carta e rosa, verifica che la skill compaia in entrambe le liste o spiega che manca il collegamento.
- CONFRONTO ABILITÀ VS TITOLARE (obbligatorio): nel contesto c'è skill_delta_sentence — è la lettura ufficiale su comune vs diverso rispetto al titolare in rosa. Non contraddirla. Nei pros NON usare le skill in comune come motivo d'acquisto; il valore è nelle skill solo sulla carta. Valuta il comune come "non perdi la base", non come upgrade. Se skill_delta_sentence indica poco salto, rispetta un verdetto prudente.
- Carte Epic, Legendary o Showtime: tono leggermente più pro-investimento solo se skill_delta_sentence mostra un salto utile per il profilo; se profilo quasi uguale al titolare, non spingere l'acquisto.
- La sezione "key_reasoning" è la parte più importante: ogni punto deve incrociare almeno due fonti tra carta, stile, skill, stats, rosa, formazione, tattica, coach, diagnosi, game analysis e RAG meccaniche.
- Ogni ragionamento deve chiudere con una conseguenza pratica: cosa cambia, cosa sfruttare, cosa evitare o perché non è priorità.

POLICY POSIZIONI E ACQUISTO (obbligatoria — come Coach chat):
- Nomi giocatori e skill: solo da CONTESTO CLIENTE, FATTI ACQUISTO e skill_delta_sentence. Se manca un dato, non inventare.
- "position" in roster = ruolo ASSEGNATO in formazione (in campo). "original_positions" = competenze naturali sulla card: NON usarle come ruolo attuale.
- Vietato: "Maldini CLS" se in rosa è DC. Obbligatorio: "Maldini (DC)" o "Maldini (DC in rosa)".
- Vietato: "non cambia gerarchie su [Nome] [ruolo carta]" se non c'è titolare con quel ruolo in campo (vedi FATTI ACQUISTO).
- Domanda centrale acquisto: la carta la compro per COME GIOCO OGGI (modulo, disposizione, game stats, profilo)? Non tier list.
- Se la carta è utile nel ruolo pack ma NON c'è titolare in quel ruolo in campo: purchase_fit = fits_if_formation_change (o skill_only_no_slot) e in summary/final_decision scrivi esplicitamente "sì, comprala SE cambi modulo / schieri il ruolo" oppure "oggi no, a meno che...".
- Se game stats e stile carta non matchano (es. cross specialist ma pochi cross nei dati): purchase_fit = not_your_playstyle o fits_if_formation_change con condizione chiara.
- purchase_fit deve essere coerente con verdict e con FATTI ACQUISTO. setup_condition obbligatorio se purchase_fit è fits_if_formation_change o skill_only_no_slot.
- Esempio SBAGLIATO: "Non cambia gerarchie su Maldini CLS". Esempio CORRETTO: "Non sostituisce Maldini (DC); oggi non hai CLS in campo — ha senso solo se cambi modulo per usare la fascia."

${purchaseFactsText}

CARTA
${JSON.stringify(cardPayload, null, 2)}

CONTESTO CLIENTE
${JSON.stringify(contextPayload, null, 2)}

CONFRONTO ABILITÀ (una frase, già calcolata — allineati)
${skillDeltaSentence || (isEn ? 'No roster skill comparison available.' : 'Confronto abilità rosa non disponibile.')}

RAG EFOOTBALL
${ragKnowledge || 'Nessun RAG disponibile.'}

OUTPUT:
Restituisci SOLO JSON valido con questa struttura:
{
  "headline": "titolo breve e deciso, massimo 55 caratteri",
  "verdict": "take|premium_rotation|situational|luxury_pick|not_priority|skip",
  "purchase_fit": "fits_current_setup|fits_with_rotation|fits_if_formation_change|skill_only_no_slot|not_your_playstyle|skip_duplicate|insufficient_data",
  "setup_condition": "vuoto se purchase_fit è fits_current_setup; altrimenti condizione modulo/ruolo max 160 caratteri",
  "summary": "massimo 2 frasi brevi, verdetto acquisto + motivo principale",
  "card_identity": {
    "movement": "movimento automatico da stile, massimo 100 caratteri",
    "key_skills": ["skill rilevanti"],
    "best_use": "uso ideale, massimo 120 caratteri"
  },
  "key_reasoning": [
    { "label": "massimo 35 caratteri", "text": "micro-ragionamento assertivo, massimo 180 caratteri" }
  ],
  "pros": ["max 3 pro concreti, max 120 caratteri ciascuno"],
  "cons": ["max 3 contro concreti, max 120 caratteri ciascuno"],
  "synergies": ["max 3 sinergie/combo, max 140 caratteri ciascuna"],
  "how_to_use": ["max 3 indicazioni pratiche, max 120 caratteri ciascuna"],
  "when_to_avoid": ["max 2 casi, max 120 caratteri ciascuno"],
  "final_decision": "decisione finale netta, massimo 180 caratteri"
}
`.trim()
}

function normalizeDeepAnalysis(payload, lang, skillDeltaLine = '') {
  const clean = (value, maxLen = 500) => {
    const text = sanitize(value, maxLen)
    return lang === 'en' ? text : localizeItalianTerms(text)
  }
  const arr = (value, maxItems = 3, maxLen = 150) => Array.isArray(value) ? value.map(item => clean(item, maxLen)).filter(Boolean).slice(0, maxItems) : []
  const reasoning = (value) => Array.isArray(value)
    ? value
        .map(item => ({
          label: clean(item?.label || '', 45),
          text: clean(item?.text || item, 220)
        }))
        .filter(item => item.text)
        .slice(0, 4)
    : []

  const fallback = lang === 'en'
    ? {
        headline: 'Detailed card read unavailable',
        verdict: 'situational',
        summary: 'The detailed analysis could not be completed. Use the base Card Advisor read for now.',
        card_identity: { movement: '', key_skills: [], best_use: '' },
        key_reasoning: [],
        pros: [],
        cons: [],
        synergies: [],
        how_to_use: [],
        when_to_avoid: [],
        final_decision: 'Use the base read until a new detailed analysis is available.',
        skill_delta_line: '',
        purchase_fit: 'insufficient_data',
        setup_condition: ''
      }
    : {
        headline: 'Analisi dettagliata non disponibile',
        verdict: 'situational',
        summary: 'Non è stato possibile completare l’analisi dettagliata. Usa per ora la lettura base del Card Advisor.',
        card_identity: { movement: '', key_skills: [], best_use: '' },
        key_reasoning: [],
        pros: [],
        cons: [],
        synergies: [],
        how_to_use: [],
        when_to_avoid: [],
        final_decision: 'Usa la lettura base finché non è disponibile una nuova analisi dettagliata.',
        skill_delta_line: '',
        purchase_fit: 'insufficient_data',
        setup_condition: ''
      }

  if (!payload || typeof payload !== 'object') {
    return {
      ...fallback,
      skill_delta_line: skillDeltaLine ? clean(skillDeltaLine, 320) : '',
      purchase_fit: fallback.purchase_fit,
      setup_condition: ''
    }
  }
  const purchaseFit = normalizePurchaseFit(payload.purchase_fit) || fallback.purchase_fit
  const setupCondition = clean(payload.setup_condition, 180)
  return {
    headline: clean(payload.headline, 120) || fallback.headline,
    verdict: ['take', 'premium_rotation', 'situational', 'luxury_pick', 'not_priority', 'skip'].includes(payload.verdict) ? payload.verdict : 'situational',
    purchase_fit: purchaseFit,
    setup_condition: setupCondition,
    summary: clean(payload.summary, 420) || fallback.summary,
    card_identity: {
      movement: clean(payload.card_identity?.movement, 130),
      key_skills: arr(payload.card_identity?.key_skills, 5, 60),
      best_use: clean(payload.card_identity?.best_use, 160)
    },
    key_reasoning: reasoning(payload.key_reasoning),
    pros: arr(payload.pros, 3, 140),
    cons: arr(payload.cons, 3, 140),
    synergies: arr(payload.synergies, 3, 160),
    how_to_use: arr(payload.how_to_use, 3, 140),
    when_to_avoid: arr(payload.when_to_avoid, 2, 140),
    final_decision: clean(payload.final_decision, 220) || fallback.final_decision,
    skill_delta_line: skillDeltaLine ? clean(skillDeltaLine, 320) : ''
  }
}

function buildOpenAIRequestBody(model, prompt) {
  return {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.45,
    max_completion_tokens: 1800
  }
}

export async function POST(req) {
  let charged = false
  let admin = null
  let userId = null
  let token = null

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const apiKey = process.env.OPENAI_API_KEY
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
      return NextResponse.json({ error: 'Deep analysis unavailable' }, { status: 500 })
    }

    token = extractBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    userId = await resolveUserId(userData, admin)

    const rateLimit = await checkRateLimit(userId, '/api/card-advisor-lab/deep-analysis', 6, 60000)
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const card = normalizeCard(body.card)
    const lang = body.lang === 'en' ? 'en' : 'it'
    if (!card.name || !card.position) return NextResponse.json({ error: 'Invalid card' }, { status: 400 })

    const catalogCard = await resolveCatalogCardForDeepAnalysis(admin, card)
    const hasUsableCardData =
      catalogCard?.enrichment_status === 'complete' &&
      catalogCard?.base_stats &&
      typeof catalogCard.base_stats === 'object' &&
      Object.keys(catalogCard.base_stats).length > 0
    if (!hasUsableCardData) {
      return NextResponse.json(
        {
          error: lang === 'en'
            ? 'Detailed analysis is not ready for this card yet.'
            : 'Analisi dettagliata non ancora pronta per questa carta.',
          code: 'card_data_not_ready'
        },
        { status: 409 }
      )
    }

    const deduction = await deductCredits(admin, userId, token, DEEP_ANALYSIS_COST, 'card-advisor-deep-analysis')
    if (!deduction.success) {
      return NextResponse.json(
        {
          error: lang === 'en'
            ? `You need ${DEEP_ANALYSIS_COST} HP to unlock the Pro verdict.`
            : `Ti servono ${DEEP_ANALYSIS_COST} HP per sbloccare il verdetto Pro.`,
          code: 'insufficient_credits',
          requiredCredits: DEEP_ANALYSIS_COST
        },
        { status: 402 }
      )
    }
    charged = true

    const [
      profileRes,
      playersRes,
      stylesRes,
      formationRes,
      coachRes,
      tacticalRes,
      patternsRes,
      gameAnalysisRes,
      diagnosticRes,
      feedbackRes,
      performanceRes
    ] = await Promise.all([
      admin.from('user_profiles').select('first_name, nickname, team_name, ai_weak_point, ai_learn_goals, ai_notes, input_delay, connection_quality, pass_level').eq('user_id', userId).maybeSingle(),
      admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, skills, com_skills, form, base_stats, original_positions, height, weight, current_level, level_cap, active_booster_name').eq('user_id', userId).limit(60),
      admin.from('playing_styles').select('id, name'),
      admin.from('formation_layout').select('formation, slot_positions, updated_at').eq('user_id', userId).maybeSingle(),
      admin.from('coaches').select('coach_name, playing_style_competence, connection, stat_boosters, updated_at').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      admin.from('team_tactical_settings').select('team_playing_style, individual_instructions, updated_at').eq('user_id', userId).maybeSingle(),
      admin.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg, last_50_matches_count').eq('user_id', userId).maybeSingle(),
      admin.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle(),
      admin.from('user_diagnostic_cache').select('content, generated_at').eq('user_id', userId).maybeSingle(),
      admin.from('user_tactical_feedback').select('conversation_summary, insights, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      admin.from('player_performance_aggregates').select('player_id, average_rating, total_goals, total_assists, positions_played, position_performance, attack_areas_avg, recovery_zones_avg, last_50_matches_count').eq('user_id', userId).limit(20)
    ])

    const stylesLookup = {}
    ;(stylesRes.data || []).forEach(style => { stylesLookup[style.id] = style.name })
    const feedback = (feedbackRes.data || []).map(row => ({
      summary: sanitize(row.conversation_summary, 400),
      insights: Array.isArray(row.insights) ? row.insights.slice(0, 4) : []
    }))
    const performance = (performanceRes.data || []).slice(0, 12)
    const ragKnowledge = getRelevantSections('stili giocatore abilità giocatori statistiche cross passaggio filtrante colpo di testa intercettazione movimenti eFootball', 9000)

    const players = playersRes.data || []
    const skillDeltaLine = buildSkillDeltaSentence({
      card,
      catalogCard,
      players,
      profile: profileRes.data || {},
      gameAnalysis: gameAnalysisRes.data || null,
      patterns: patternsRes.data || {},
      lang
    })

    const { text: purchaseFactsText } = buildPurchaseFactsBlock({
      card,
      players,
      formation: formationRes.data || null,
      profile: profileRes.data || {},
      gameAnalysis: gameAnalysisRes.data || null,
      patterns: patternsRes.data || {},
      lang
    })

    const prompt = buildPrompt({
      lang,
      card,
      catalogCard,
      profile: profileRes.data || {},
      players,
      stylesLookup,
      formation: formationRes.data || null,
      coach: coachRes.data || null,
      tacticalSettings: tacticalRes.data || null,
      patterns: patternsRes.data || null,
      gameAnalysis: gameAnalysisRes.data || null,
      diagnostic: diagnosticRes.data || null,
      feedback,
      performance,
      ragKnowledge,
      skillDeltaSentence: skillDeltaLine,
      purchaseFactsText
    })

    const requestBody = buildOpenAIRequestBody(MODEL, prompt)

    let response
    try {
      response = await callOpenAIWithRetry(apiKey, requestBody, 'card-advisor-deep-analysis')
    } catch (error) {
      if (error?.type !== 'model_not_found' || MODEL === 'gpt-4o') throw error
      response = await callOpenAIWithRetry(apiKey, buildOpenAIRequestBody('gpt-4o', prompt), 'card-advisor-deep-analysis')
    }
    const payload = await parseOpenAIResponse(response, 'card-advisor-deep-analysis')
    const analysis = normalizeDeepAnalysis(payload, lang, skillDeltaLine)

    return NextResponse.json({
      success: true,
      cost: DEEP_ANALYSIS_COST,
      analysis
    })
  } catch (error) {
    console.error('[card-advisor-lab:deep-analysis] error:', error)
    if (charged && admin && userId) {
      await refundCredits(admin, userId, DEEP_ANALYSIS_COST, 'card-advisor-deep-analysis')
    }
    return NextResponse.json({ error: 'Deep analysis unavailable' }, { status: 500 })
  }
}
