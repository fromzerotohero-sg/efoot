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
    'Cross preciso',
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
  { en: 'Sole Control', it: 'Controllo di suola', camel: ['soleControl'] },
  { en: 'Flip Flap', it: 'Elastico', camel: ['flipFlap'] },
  { en: 'Marseille Turn', it: 'Veronica', camel: ['marseilleTurn'] },
  { en: 'Sombrero', it: 'Sombrero', camel: ['sombrero'] },
  { en: 'Cut Behind & Turn', it: 'Taglio alle spalle e svolta', camel: ['cutBehindTurn', 'cutBehindAndTurn'] },
  { en: 'Scissors Feint', it: 'Finta doppio passo', camel: ['scissorsFeint'], aliasIt: ['Doppio passo'] },
  { en: 'Step On Skill Control', it: 'Stop acrobatico', camel: ['stepOnSkillControl'], aliasIt: ['Controllo abilita con suola'] },
  { en: 'Heading', it: 'Colpo di testa', camel: ['heading'] },
  { en: 'Long-Range Curler', it: 'A giro da distante', camel: ['longRangeCurler'], aliasIt: ['Tiro a giro da lontano'], aliasEn: ['Long Range Curler'] },
  { en: 'Long-Range Shooting', it: 'Tiro dalla distanza', camel: ['longRangeShooting'], aliasEn: ['Long Range Shooting'] },
  { en: 'Power Shot', it: 'Tiro Potente', camel: ['powerShot'] },
  { en: 'Knuckle Shot', it: 'Tiro imprevedibile', camel: ['knuckleShot'], aliasIt: ['Tiro a effetto imprevedibile'] },
  { en: 'Dipping Shot', it: 'Tiro a scendere', camel: ['dippingShot'] },
  { en: 'Rising Shot', it: 'Tiro a salire', camel: ['risingShot'] },
  { en: 'Acrobatic Finishing', it: 'Tiro acrobatico', camel: ['acrobaticFinishing'], aliasIt: ['Finalizzazione acrobatica'] },
  { en: 'Heel Trick', it: 'Colpo di tacco', camel: ['heelTrick'] },
  { en: 'First-time Shot', it: 'Tiro al volo', camel: ['firstTimeShot'], aliasIt: ['Tiro di prima'] },
  { en: 'One-touch Pass', it: 'Passaggio di prima', camel: ['oneTouchPass'] },
  { en: 'Through Passing', it: 'Passaggio filtrante', camel: ['throughPassing', 'throughPass'] },
  { en: 'Weighted Pass', it: 'Passaggio calibrato', camel: ['weightedPass'] },
  { en: 'Pinpoint Crossing', it: 'Cross preciso', camel: ['pinpointCrossing'], aliasIt: ['Cross calibrato'] },
  { en: 'Outside Curler', it: 'Tiro a giro', camel: ['outsideCurler'] },
  { en: 'Rabona', it: 'Rabona', camel: ['rabona'] },
  { en: 'No Look Pass', it: 'Passaggio no look', camel: ['noLookPass'] },
  { en: 'Low Lofted Pass', it: 'Passaggio dosato', camel: ['lowLoftedPass'] },
  { en: 'GK Low Punt', it: 'Traiettoria bassa PT', camel: ['gkLowPunt'], aliasIt: ['Rinvio basso PT'] },
  { en: 'GK High Punt', it: 'Rilancio del PT', camel: ['gkHighPunt'], aliasIt: ['Rinvio alto PT'] },
  { en: 'Long Throw', it: 'Rimessa lunga', camel: ['longThrow'], aliasEn: ['Long throw'] },
  {
    en: 'GK Long Throw',
    it: 'Rimessa lunga PT',
    camel: ['gkLongThrow'],
    aliasEn: ['Gk Long Throw', 'GK long throw'],
    aliasIt: ['Rimessa lunga PT', 'Rimessa lunga portiere']
  },
  { en: 'Penalty Specialist', it: 'Specialista rigori', camel: ['penaltySpecialist'] },
  { en: 'Gamesmanship', it: 'Malizia', camel: ['gamesmanship'] },
  { en: 'Man Marking', it: 'Marcatura', camel: ['manMarking'], aliasIt: ['Marcatura a uomo'] },
  { en: 'Track Back', it: 'Ripiegamento', camel: ['trackBack'], aliasIt: ['Rientro difensivo'] },
  { en: 'Interception', it: 'Intercettazione', camel: ['interception'] },
  { en: 'Blocker', it: 'Muro', camel: ['blocker'], aliasIt: ['Blocco'] },
  { en: 'Aerial Superiority', it: 'Dominio aereo', camel: ['aerialSuperiority'], aliasIt: ['Superiorita aerea'] },
  { en: 'Sliding Tackle', it: 'Scivolata', camel: ['slidingTackle'] },
  { en: 'Acrobatic Clearance', it: 'Rinvio acrobatico', camel: ['acrobaticClearance'] },
  { en: 'Captaincy', it: 'Leader', camel: ['captaincy'], aliasIt: ['Leadership'] },
  { en: 'Super-sub', it: 'Super riserva', camel: ['superSub', 'supersub'] },
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
  { en: 'Utility Player', it: 'Tornante', camel: ['utilityPlayer', 'oneManArmy'] }
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
