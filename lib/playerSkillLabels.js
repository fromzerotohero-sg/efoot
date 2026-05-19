/**
 * Etichette abilità: unica fonte per IT/EN/camelCase (card, eFHUB, rosa).
 *
 * Invarianti da mantenere:
 * - Ogni voce di PLAYER_SKILL_PRESETS deve avere una riga in SKILL_DEFINITIONS con lo stesso `en`.
 * - SKILL_CATEGORIES (picker ManualPlayerModal) usa solo etichette IT uguali a `it` o `aliasIt` in SKILL_DEFINITIONS,
 *   così salvataggio manuale e getSkillDisplayLabel restano coerenti.
 *
 * Usato da: nuova-rosa-lab, card-advisor, API evaluate/deep-analysis, gestione-formazione, giocatore/[id],
 * save-player, PATCH players (canonical EN + dedupe).
 */

export const SKILL_CATEGORIES = {
  Tiro: [
    'Tiro al volo',
    'Tiro a giro',
    'Tiro Potente',
    'Tiro dalla distanza',
    'Tiro imprevedibile',
    'Tiro a scendere',
    'Tiro a salire',
    'A giro da distante',
    'Colpo di testa',
    'Colpo di tacco',
    'Tiro acrobatico'
  ],
  Passaggio: [
    'Passaggio di prima',
    'Passaggio calibrato',
    'Passaggio filtrante',
    'Cross calibrato',
    'Lancio lungo preciso',
    'Passaggio dosato',
    'Rabona',
    'Rimessa lunga',
    'Passaggio no look'
  ],
  Dribbling: ['Doppio tocco', 'Finta doppio passo', 'Elastico', 'Controllo di suola', 'Stop acrobatico', 'Protezione'],
  Difesa: [
    'Intercettazione',
    'Marcatura',
    'Ripiegamento',
    'Contrasto Aggressivo',
    'Scivolata',
    'Muro',
    'Dominio aereo',
    'Caposaldo'
  ],
  Portiere: ['Traiettoria bassa PT', 'Rilancio del PT', 'Rimessa lunga PT', 'Para-rigori', 'Uscita portiere'],
  Speciali: ['Leader', 'Tornante', 'Super riserva', 'Malizia', 'Specialista punizioni', 'Specialista rigori']
}

/** Ordine e nomi inglesi ufficiali (stesso set usato in nuova rosa / estrazioni). */
export const PLAYER_SKILL_PRESETS = [
  'Double Touch',
  'Sole Control',
  'Flip Flap',
  'Marseille Turn',
  'Sombrero',
  'Cut Behind & Turn',
  'Scissors Feint',
  'Step On Skill Control',
  'Heading',
  'Long-Range Curler',
  'Long-Range Shooting',
  'Power Shot',
  'Knuckle Shot',
  'Dipping Shot',
  'Rising Shot',
  'Acrobatic Finishing',
  'Heel Trick',
  'First-time Shot',
  'One-touch Pass',
  'Through Passing',
  'Weighted Pass',
  'Pinpoint Crossing',
  'Outside Curler',
  'Rabona',
  'No Look Pass',
  'Low Lofted Pass',
  'GK Low Punt',
  'GK High Punt',
  'Long Throw',
  'GK Long Throw',
  'Penalty Specialist',
  'Gamesmanship',
  'Man Marking',
  'Track Back',
  'Interception',
  'Blocker',
  'Aerial Superiority',
  'Sliding Tackle',
  'Acrobatic Clearance',
  'Captaincy',
  'Super-sub',
  'Fighting Spirit'
]

/**
 * en: nome card / API inglese
 * it: stringa come in gestione rosa (ManualPlayerModal) dove esiste corrispondenza 1:1
 * camel: chiavi efhub / JSON omonimi
 * aliasIt / aliasEn: varianti già salvate o vecchie traduzioni da risolvere
 */
const SKILL_DEFINITIONS = [
  { en: 'Double Touch', it: 'Doppio tocco', camel: ['doubleTouch'] },
  { en: 'Sole Control', it: 'Sole Control', camel: ['soleControl'], aliasIt: ['Controllo di suola'] },
  { en: 'Flip Flap', it: 'Elastico', camel: ['flipFlap'] },
  { en: 'Marseille Turn', it: 'Veronica', camel: ['marseilleTurn'] },
  { en: 'Sombrero', it: 'Sombrero', camel: ['sombrero'] },
  { en: 'Cut Behind & Turn', it: 'Taglio alle spalle e giro', camel: ['cutBehindTurn', 'cutBehindAndTurn'], aliasIt: ['Taglio alle spalle e svolta'] },
  { en: 'Scissors Feint', it: 'Finta doppio passo', camel: ['scissorsFeint'], aliasIt: ['Doppio passo'] },
  { en: 'Step On Skill Control', it: 'Controllo di suola', camel: ['stepOnSkillControl'], aliasIt: ['Stop acrobatico', 'Controllo abilita con suola'] },
  { en: 'Heading', it: 'Colpo di testa', camel: ['heading'] },
  { en: 'Long-Range Curler', it: 'A giro da distante', camel: ['longRangeCurler', 'longRangeDrive'], aliasIt: ['Tiro a giro da lontano'], aliasEn: ['Long Range Curler'] },
  { en: 'Long-Range Shooting', it: 'Lancio lungo', camel: ['longRangeShooting'], aliasIt: ['Tiro dalla distanza'], aliasEn: ['Long Range Shooting'] },
  { en: 'Power Shot', it: 'Tiro Potente', camel: ['powerShot'] },
  { en: 'Knuckle Shot', it: 'Tiro di collo', camel: ['knuckleShot'], aliasIt: ['Tiro imprevedibile', 'Tiro a effetto imprevedibile'] },
  { en: 'Dipping Shot', it: 'Tiri a scendere', camel: ['dippingShot'], aliasIt: ['Tiro a scendere'] },
  { en: 'Rising Shot', it: 'Colpo In Aumento', camel: ['risingShot'], aliasIt: ['Tiro a salire', 'Tiri a salire'] },
  { en: 'Acrobatic Finishing', it: 'Finalizz. acrobatica', camel: ['acrobaticFinishing'], aliasIt: ['Tiro acrobatico', 'Finalizzazione acrobatica'] },
  { en: 'Heel Trick', it: 'Colpo di tacco', camel: ['heelTrick'] },
  { en: 'First-time Shot', it: 'Tiro di prima', camel: ['firstTimeShot'], aliasIt: ['Tiro al volo'] },
  { en: 'One-touch Pass', it: 'Passaggio di prima', camel: ['oneTouchPass'] },
  { en: 'Through Passing', it: 'Passaggio filtrante', camel: ['throughPassing', 'throughPass'] },
  { en: 'Weighted Pass', it: 'Passaggio calibrato', camel: ['weightedPass'] },
  { en: 'Pinpoint Crossing', it: 'Cross calibrato', camel: ['pinpointCrossing'], aliasIt: ['Cross preciso'] },
  { en: 'Outside Curler', it: 'Esterno a giro', camel: ['outsideCurler'], aliasIt: ['Tiro a giro'] },
  { en: 'Rabona', it: 'Rabona', camel: ['rabona'] },
  { en: 'No Look Pass', it: 'No-look', camel: ['noLookPass'], aliasIt: ['Passaggio no look'] },
  { en: 'Low Lofted Pass', it: 'Passaggio a scavalcare', camel: ['lowLoftedPass'], aliasIt: ['Passaggio dosato'] },
  { en: 'GK Low Punt', it: 'Traiettoria bassa PT', camel: ['gkLowPunt'], aliasIt: ['Rinvio basso PT'] },
  { en: 'GK High Punt', it: 'Rimessa profonda PT', camel: ['gkHighPunt'], aliasIt: ['Rilancio del PT', 'Rinvio alto PT'] },
  { en: 'Long Throw', it: 'Rimessa lunga', camel: ['longThrow'], aliasEn: ['Long throw'] },
  {
    en: 'GK Long Throw',
    it: 'Rimessa lunga PT',
    camel: ['gkLongThrow'],
    aliasEn: ['Gk Long Throw', 'GK long throw'],
    aliasIt: ['Rimessa lunga PT', 'Rimessa lunga portiere']
  },
  { en: 'Penalty Specialist', it: 'Specialista dei rigori', camel: ['penaltySpecialist'], aliasIt: ['Specialista rigori'] },
  { en: 'Gamesmanship', it: 'Astuzia', camel: ['gamesmanship'], aliasIt: ['Malizia'] },
  { en: 'Man Marking', it: 'Marcatore', camel: ['manMarking'], aliasIt: ['Marcatura', 'Marcatura a uomo'] },
  { en: 'Track Back', it: 'Tornante', camel: ['trackBack'], aliasIt: ['Ripiegamento', 'Rientro difensivo'] },
  { en: 'Interception', it: 'Intercettazione', camel: ['interception'] },
  { en: 'Blocker', it: 'Muro', camel: ['blocker'], aliasIt: ['Blocco'] },
  { en: 'Aerial Superiority', it: 'Dominio palle alte', camel: ['aerialSuperiority'], aliasIt: ['Dominio aereo', 'Superiorita aerea'] },
  { en: 'Sliding Tackle', it: 'Scivolata', camel: ['slidingTackle'] },
  { en: 'Acrobatic Clearance', it: 'Disimpegno acrobatico', camel: ['acrobaticClearance', 'acrobaticClear'], aliasIt: ['Rinvio acrobatico'] },
  { en: 'Captaincy', it: 'Leader', camel: ['captaincy'], aliasIt: ['Leadership'] },
  { en: 'Super-sub', it: 'Riserva di lusso', camel: ['superSub', 'supersub'], aliasIt: ['Super riserva'] },
  { en: 'Fighting Spirit', it: 'Spirito combattivo', camel: ['fightingSpirit'] },
  /** efhub legacy / varianti */
  { en: 'Cross Over Turn', it: 'Svolta secca', camel: ['crossOverTurn'] },
  /** Solo picker gestione rosa (ManualPlayerModal) — prima non erano in indice */
  { en: 'Shielding', it: 'Protezione', camel: ['shielding', 'protectTheBall'] },
  { en: 'Aggressive Defence', it: 'Contrasto Aggressivo', camel: ['aggressiveDefence', 'aggressiveDefense'] },
  { en: 'Anchor', it: 'Caposaldo', camel: ['anchor', 'fortress'] },
  { en: 'Penalty Saver', it: 'Para-rigori', camel: ['penaltySaver', 'gkPenaltySaver'] },
  { en: 'Set Piece Specialist', it: 'Specialista punizioni', camel: ['setPieceSpecialist', 'deadBallSpecialist'] },
  { en: 'Long Lofted Pass', it: 'Lancio lungo preciso', camel: ['longLoftedPass', 'longLofted'] },
  { en: 'Goalkeeper Rush', it: 'Uscita portiere', camel: ['goalkeeperRush', 'gkRush'] },
  { en: 'Utility Player', it: 'Tornante', camel: ['utilityPlayer', 'oneManArmy'] },
  /**
   * Tratti / comSkills / Showtime — IT allineato a efhub.com/it (locale gioco).
   * Alcuni nomi restano in inglese anche nel client italiano (Mazing Run, ecc.).
   */
  { en: 'Edged Crossing', it: 'Cross spiovente', camel: ['edgedCrossing'], aliasIt: ['Cross tagliente', 'Cross spiombente'] },
  { en: 'Phenomenal Passing', it: 'Passaggi illuminanti', camel: ['phenomenalPassing'], aliasIt: ['Passaggio fenomenale', 'Passaggio sensazionale'] },
  { en: 'Phenomenal Finishing', it: 'Istinto del gol', camel: ['phenomenalFinishing'], aliasIt: ['Finalizzazione fenomenale', 'Tiro sensazionale'] },
  { en: 'Visionary Pass', it: 'Passaggio calcolato', camel: ['visionaryPass'], aliasIt: ['Passaggio visionario', 'Passaggio illuminante'] },
  { en: 'Game-changing Pass', it: 'Passaggi cruciali', camel: ['gameChangingPass'] },
  { en: 'Blitz Curler', it: 'Tiro a giro spiovente', camel: ['blitzCurler'] },
  { en: 'Bullet Header', it: 'Incornata', camel: ['bulletHeader'] },
  { en: 'Aerial Fort', it: 'Difesa svettante', camel: ['aerialFort'] },
  { en: 'Long-reach Tackle', it: 'Long Reach Tackle', camel: ['longReachTackle'], aliasEn: ['Long Reach Tackle'] },
  { en: 'Incisive Run', it: 'Incisive Run', camel: ['incisiveRun'], aliasIt: ['Inserimento incisivo'] },
  { en: 'Mazing Run', it: 'Mazing Run', camel: ['mazingRun'], aliasIt: ['Corsa ubriacante'] },
  { en: 'Speeding Bullet', it: 'Speeding Bullet', camel: ['speedingBullet'], aliasIt: ['Proiettile veloce'] },
  { en: 'Long Ball Expert', it: 'Long Ball Expert', camel: ['longBallExpert'] },
  { en: 'Early Crosser', it: 'Early Crosser', camel: ['earlyCross', 'earlyCrosser'] },
  { en: 'Long Ranger', it: 'Long Ranger', camel: ['longRange', 'longRanger'] },
  { en: 'Low Screamer', it: 'Low Screamer', camel: ['lowScreamer'] },
  { en: 'Acceleration Burst', it: 'Scatto bruciante', camel: ['accelerationBurst'], aliasIt: ['Scatto esplosivo'] },
  { en: 'Trickster', it: 'Trickster', camel: ['trickster'] },
  { en: 'Momentum Dribbling', it: 'Dribbling fulminei', camel: ['momentumDribbling'], aliasIt: ['Dribbling in slancio'] },
  { en: 'Magnetic Feet', it: 'Magnetic Feet', camel: ['magneticFeet'], aliasIt: ['Piedi magnetici', 'Calamita ai piedi'] },
  { en: 'Cross Specialist', it: 'Specialista di cross', camel: ['crossSpecialist'] }
]

function stripDiacritics(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Chiave deduplicata: lettere e numeri, minuscolo (come vecchio normalizePlayerSkillKey). */
export function normalizeSkillKey(value = '') {
  return stripDiacritics(String(value || '').trim())
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function humanizeFallback(value = '') {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function registerKey(map, key, entry) {
  const k = normalizeSkillKey(key)
  if (!k || map.has(k)) return
  map.set(k, entry)
}

function buildSkillIndex() {
  const map = new Map()
  for (const row of SKILL_DEFINITIONS) {
    const entry = { en: row.en, it: row.it }
    registerKey(map, row.en, entry)
    registerKey(map, row.it, entry)
    for (const c of row.camel || []) registerKey(map, c, entry)
    for (const a of row.aliasIt || []) registerKey(map, a, entry)
    for (const a of row.aliasEn || []) registerKey(map, a, entry)
  }
  // Ogni etichetta italiana del picker gestione rosa non ancora in mappa (stesso normalize delle skill salvate).
  for (const skills of Object.values(SKILL_CATEGORIES)) {
    for (const itLabel of skills) {
      const k = normalizeSkillKey(itLabel)
      if (!k || map.has(k)) continue
      map.set(k, { en: itLabel, it: itLabel })
    }
  }
  return map
}

const SKILL_INDEX = buildSkillIndex()

/** True se la stringa corrisponde a un'abilità giocatore nel dizionario (non tratti AI / rumore catalogo). */
export function isKnownPlayerSkill(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return false
  let key = normalizeSkillKey(trimmed)
  if (SKILL_INDEX.has(key)) return true
  const canon = canonicalSkillStorageName(trimmed)
  if (!canon) return false
  key = normalizeSkillKey(canon)
  return SKILL_INDEX.has(key)
}

/**
 * Nome inglese canonico per persistenza (DB / API), allineato a catalogo e PLAYER_SKILL_PRESETS.
 * Se la stringa non è in dizionario, resta il valore trimmato (retrocompatibilità).
 */
export function canonicalSkillStorageName(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  let key = normalizeSkillKey(trimmed)
  let entry = SKILL_INDEX.get(key)
  if (!entry && /\s{2,}/.test(trimmed)) {
    key = normalizeSkillKey(trimmed.replace(/\s+/g, ' '))
    entry = SKILL_INDEX.get(key)
  }
  if (entry?.en) return String(entry.en).trim()
  return trimmed
}

/**
 * Deduplica per stessa abilità (IT/EN/camel) e converte ogni voce al nome EN canonico quando noto.
 */
export function normalizePlayerSkillsArray(skills) {
  const out = []
  const seen = new Set()
  for (const raw of Array.isArray(skills) ? skills : []) {
    const canon = canonicalSkillStorageName(raw)
    if (!canon) continue
    const dedupeKey = normalizeSkillKey(canon)
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push(canon)
  }
  return out
}

/**
 * @param {string} raw — nome abilità in qualsiasi forma (IT manuale, EN card, camelCase efhub)
 * @param {'it'|'en'} lang
 * @returns {string}
 */
export function getSkillDisplayLabel(raw, lang = 'it') {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  let key = normalizeSkillKey(trimmed)
  let entry = SKILL_INDEX.get(key)
  if (!entry && /\s{2,}/.test(trimmed)) {
    key = normalizeSkillKey(trimmed.replace(/\s+/g, ' '))
    entry = SKILL_INDEX.get(key)
  }
  if (entry) return lang === 'en' ? entry.en : entry.it
  // Second pass: EN canonico (es. da OCR/card) → voce dizionario
  const canon = canonicalSkillStorageName(trimmed)
  if (canon && canon !== trimmed) {
    const k2 = normalizeSkillKey(canon)
    const entry2 = SKILL_INDEX.get(k2)
    if (entry2) return lang === 'en' ? entry2.en : entry2.it
  }
  return lang === 'en' ? humanizeFallback(trimmed) : trimmed
}

/**
 * Coppie [inglese, italiano] per post-processing testo IA (sostituzione termini skill in output IT).
 * Ordine: stringhe più lunghe prima, per evitare match parziali errati.
 */
export function getSkillEnglishItalianGlossary() {
  const pairs = []
  for (const row of SKILL_DEFINITIONS) {
    pairs.push([row.en, row.it])
    for (const a of row.aliasEn || []) pairs.push([a, row.it])
  }
  return pairs.sort((a, b) => b[0].length - a[0].length)
}

function escapeRegExpForSkill(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildCamelItalianPairs() {
  const pairs = []
  for (const row of SKILL_DEFINITIONS) {
    for (const camel of row.camel || []) {
      if (camel && row.it) pairs.push([camel, row.it])
    }
  }
  const seen = new Set()
  return pairs
    .filter(([camel]) => {
      const key = normalizeSkillKey(camel)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b[0].length - a[0].length)
}

const CAMEL_ITALIAN_PAIRS = buildCamelItalianPairs()

/**
 * Sostituisce nomi skill EN / camelCase nel testo IA (verdetto Pro, evaluate, ecc.).
 * @param {string} text
 * @param {'it'|'en'} lang
 */
export function localizeSkillTermsInText(text, lang = 'it') {
  if (lang !== 'it') return String(text || '')
  let out = String(text || '')
  if (!out) return out

  for (const [en, it] of getSkillEnglishItalianGlossary()) {
    out = out.replace(new RegExp(`\\b${escapeRegExpForSkill(en)}\\b`, 'gi'), it)
  }
  for (const [camel, it] of CAMEL_ITALIAN_PAIRS) {
    out = out.replace(new RegExp(escapeRegExpForSkill(camel), 'g'), it)
  }
  return out
}
