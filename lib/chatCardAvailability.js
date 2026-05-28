/**
 * chatCardAvailability
 *
 * Dato un messaggio cliente in chat, capisce se sta chiedendo un parere
 * di tipo "compra / scarta / vale la pena / upgrade" su una carta giocatore,
 * e costruisce un blocco da iniettare nel prompt che dice all'IA:
 *   - quali nomi citati sono presenti in Card Advisor con release attive
 *   - quali nomi citati NON sono in pacchetti attivi (non acquistabili ora)
 *   - le regole operative per rispondere
 *
 * Non scrive nulla nel DB. Una sola query SELECT su card_advisor_cards
 * filtrata per is_active.
 */

const BUY_TRIGGERS_IT = /\b(compr\w*|prend\w*|vale|conviene|scart\w*|skipp\w*|upgrade|consigl\w*|migliore|meglio|apri|apro|opening|pacchett\w*|pacchi)\b/i
const BUY_TRIGGERS_EN = /\b(buy|buying|take|taking|skip|skipping|worth|recommend\w*|upgrade|better|best|open|opening|pack|packs)\b/i

// Stopword: parole comuni (verbi, articoli, pronomi, termini app/gioco) che
// non devono essere considerate nomi di giocatori. Non includere cognomi
// reali qui (anche se ambigui): meglio false positive con poche righe DB
// che false negative dove il cliente cita un nome vero.
const STOPWORDS = new Set([
  // articoli/pronomi/prep italiani
  'che','come','cosa','quale','dove','quando','quanto','perche','perché','chi',
  'questo','questa','quello','quella','questi','quelle',
  'ciao','ehi','hey','okay','grazie',
  'io','tu','lui','lei','noi','voi','loro',
  'mi','ti','si','ci','vi','ne',
  'il','la','lo','le','gli','un','una','uno',
  'del','dello','della','degli','delle','dei',
  'sono','sei','sia','siamo','siete','hanno','sara','sarebbe','stato','stati',
  'avrebbe','avranno','avete','abbiamo',
  'fare','farlo','farla','farei','farebbe','sarebbe',
  'oggi','domani','ieri','adesso','sempre','mai','forse','magari',
  'dal','dalla','dai','dagli','del','col','con','per','tra','fra','ma','se','non',
  // trigger words (li tolgo perché non sono mai nomi giocatore)
  'compro','comprare','comprarlo','comprarli','compra',
  'prendo','prendere','prendilo','prendila','prendere',
  'vale','conviene','convengono','consigli','consigliami','consigliato','consiglia','consigliate',
  'meglio','migliore','migliori',
  'scarto','scartare','scartarlo','skippo','skippare','skippa',
  'upgrade','apri','apro','opening',
  'pacchetto','pacchetti','pacchi','crediti','credit','credito','token','gemme',
  // termini app/gioco da ignorare
  'rosa','squadra','team','partita','partite','match','formazione','modulo','sistema',
  'card','carta','carte','advisor','analisi','release','releases','pacchetto',
  // nomi release/categoria carte (NON sono nomi giocatore)
  'legendary','epic','highlight','trending','featured','standout','selection',
  'potw','potm','pots','potd','encore','collaboration','starter','strike','arena',
  'icon','icons','national','league','league\'s','europa','copa','seleccion',
  'mvp','mvps','spotlight','versus','versus','reward','rewards','rookie','star',
  'phase','season','best','italian','english','spanish','german','french','japanese',
  'malaysia','brasileir','brasileiro','turkish','indonesia','egypt','algeria','morocco',
  'senegal','thailand','japan','arsenal','chelsea','master',
  // termini sostantivi italiani comuni nelle richieste
  'pena','volta','volte','consiglio','idea','ideale','meta','mister','allenatore',
  // articoli/preposizioni inglesi
  'the','and','but','for','with','from','about','into','onto','over','under',
  'this','that','these','those',
  'i','you','he','she','we','they','me','him','her','us','them','it',
  'my','your','his','our','their','its',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'a','an','of','to','in','on','at','as','or','if','so','no','not','yes',
  'should','would','could','will','shall','may','might','must','can','cannot',
  'good','bad','great','nice','really','also','too','very','quite','more','less',
  'use','using','play','playing','match','matches','game','games',
  // trigger words EN
  'buy','buying','take','taking','skip','skipping','worth','recommend','recommended',
  'better','best','open','opening','pack','packs',
])

const MIN_TOKEN_LEN = 4
const MAX_CANDIDATES = 8
const MAX_DB_RESULTS = 40

function stripDiacritics(value) {
  if (!value) return ''
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function tokenizeForNames(text) {
  if (!text || typeof text !== 'string') return []
  const normalized = stripDiacritics(text).toLowerCase()
  const cleaned = normalized.replace(/[^a-z\s'\-]/g, ' ')
  const words = cleaned.split(/\s+/).filter(Boolean)
  const out = []
  const seen = new Set()
  for (const w of words) {
    if (w.length < MIN_TOKEN_LEN) continue
    if (STOPWORDS.has(w)) continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push(w)
    if (out.length >= MAX_CANDIDATES) break
  }
  return out
}

function hasBuyTrigger(message, lang) {
  if (!message || typeof message !== 'string') return false
  const re = lang === 'en' ? BUY_TRIGGERS_EN : BUY_TRIGGERS_IT
  return re.test(message)
}

/**
 * Esegue una sola query su card_advisor_cards filtrando per is_active e
 * matchando i nomi candidati via ILIKE OR. Restituisce le righe trovate
 * unite alla release attiva.
 */
async function findActiveCardsByTokens(admin, tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return []
  // Escape % e _ nei token (sono wildcard SQL) — improbabile ma safer.
  const safeTokens = tokens
    .map(t => String(t).replace(/[%_]/g, '').trim())
    .filter(t => t.length >= MIN_TOKEN_LEN)
  if (safeTokens.length === 0) return []

  const orFilter = safeTokens.map(t => `player_name.ilike.%${t}%`).join(',')

  try {
    const { data, error } = await admin
      .from('card_advisor_cards')
      .select('player_name, position, card_type, category, overall_display, release_id, card_advisor_releases!inner(release_name, is_active, status)')
      .eq('is_active', true)
      .eq('card_advisor_releases.is_active', true)
      .or(orFilter)
      .limit(MAX_DB_RESULTS)

    if (error) {
      console.warn('[chatCardAvailability] query error:', error.message || error)
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('[chatCardAvailability] query exception:', err?.message || err)
    return []
  }
}

function groupByPlayerName(rows) {
  const map = new Map()
  for (const row of rows) {
    const name = String(row?.player_name || '').trim()
    if (!name) continue
    if (!map.has(name)) map.set(name, [])
    map.get(name).push(row)
  }
  return map
}

function matchedTokensForName(name, tokens) {
  const norm = stripDiacritics(name).toLowerCase()
  return tokens.filter(t => norm.includes(t))
}

function formatCardLine(card) {
  const rel = card?.card_advisor_releases?.release_name || card?.category || '?'
  const ovr = card?.overall_display ?? '?'
  const cardType = card?.card_type ? ` ${card.card_type}` : ''
  return `${rel}${cardType} (${card.position || '?'}, OVR ${ovr})`
}

/**
 * Costruisce il blocco da iniettare nel prompt. Stringa vuota se non c'è
 * un trigger buy/skip nel messaggio o se non ci sono candidati significativi.
 */
export async function buildCardAvailabilityBlock({ admin, message, lang = 'it' }) {
  try {
    if (!admin || !message) return ''
    if (!hasBuyTrigger(message, lang)) return ''
    const tokens = tokenizeForNames(message)
    if (tokens.length === 0) return ''

    const rows = await findActiveCardsByTokens(admin, tokens)
    const groups = groupByPlayerName(rows)

    // token "coperti" da almeno un match
    const coveredTokens = new Set()
    for (const name of groups.keys()) {
      for (const t of matchedTokensForName(name, tokens)) coveredTokens.add(t)
    }
    const uncoveredTokens = tokens.filter(t => !coveredTokens.has(t))

    if (groups.size === 0 && uncoveredTokens.length === 0) return ''

    const out = []
    if (lang === 'en') {
      out.push('CARD AVAILABILITY CHECK (Card Advisor, active releases only):')
    } else {
      out.push('DISPONIBILITA CARD ADVISOR (solo release attive):')
    }

    if (groups.size > 0) {
      for (const [name, cards] of groups) {
        if (cards.length === 1) {
          out.push(`- "${name}" -> ${lang === 'en' ? 'AVAILABLE' : 'DISPONIBILE'}: ${formatCardLine(cards[0])}`)
        } else {
          out.push(`- "${name}" -> ${lang === 'en' ? `AVAILABLE in ${cards.length} active versions` : `DISPONIBILE in ${cards.length} versioni attive`}:`)
          for (const c of cards.slice(0, 6)) {
            out.push(`  * ${formatCardLine(c)}`)
          }
          if (cards.length > 6) out.push(`  * (+${cards.length - 6} ${lang === 'en' ? 'more' : 'altre'})`)
        }
      }
    }

    if (uncoveredTokens.length > 0) {
      if (lang === 'en') {
        out.push(`- NOT IN ACTIVE PACKS: ${uncoveredTokens.join(', ')} -> these names do not match any card in currently active Card Advisor releases. The customer cannot buy these right now.`)
      } else {
        out.push(`- NON IN PACCHETTI ATTIVI: ${uncoveredTokens.join(', ')} -> nessuna corrispondenza nelle release Card Advisor attive. Il cliente non puo comprare queste carte ora.`)
      }
    }

    if (lang === 'en') {
      out.push(
`OPERATIONAL RULES (FOLLOW STRICTLY):
- Card AVAILABLE in active CA: tell the customer the exact release name(s) and invite them to open "Analisi Card" for the precise buy/skip verdict. You may add one short tactical note on how the card would fit in the roster. Do not state your own buy/skip verdict.
- Multiple active versions of the same player: list them with release names and tell the customer to compare them in Analisi Card.
- Same surname matches more than one player: ask the customer to specify which player they mean before redirecting.
- Card NOT in active packs: be clear and direct with the customer that this card is NOT currently buyable. Do not hedge with "maybe later" or "wait for it". Suggest focusing on the cards currently available. Do not produce a buy/skip verdict on it. If the player is in their roster, switch to tactical advice on how to use them.`)
    } else {
      out.push(
`REGOLE OPERATIVE (RISPETTARE SEMPRE):
- Carta DISPONIBILE in CA attiva: dì al cliente il nome esatto della release e invitalo ad aprire "Analisi Card" per il verdetto preciso compra/scarta. Puoi aggiungere una breve nota tattica su come la carta entrerebbe in rosa. Non dare un tuo verdetto compra/scarta autonomo.
- Più versioni attive dello stesso giocatore: elencale tutte con il nome release e dì al cliente di confrontarle in Analisi Card.
- Stesso cognome che corrisponde a più giocatori: chiedi al cliente di specificare quale prima di indirizzare.
- Carta NON in pacchetti attivi: sii chiaro e diretto con il cliente, questa carta NON è acquistabile adesso. Niente "magari più avanti" o "aspetta che torni". Suggerisci di concentrarsi sulle carte attualmente disponibili. Non produrre un verdetto compra/scarta su quella carta. Se il giocatore è già nella sua rosa, passa al consiglio tattico su come usarlo.`)
    }

    return out.join('\n')
  } catch (err) {
    console.warn('[chatCardAvailability] block builder failed:', err?.message || err)
    return ''
  }
}
