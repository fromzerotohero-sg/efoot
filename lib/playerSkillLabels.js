/**
 * Etichette abilità allineate a components/ManualPlayerModal.jsx (gestione rosa / inserimento manuale).
 * Inglese ufficiale card ↔ italiano come nel picker produzione.
 * Usato da: nuova-rosa-lab, card-advisor evaluate API, UI card advisor.
 */

export const SKILL_CATEGORIES = {
  Tiro: ['Tiro al volo', 'Tiro a giro', 'Tiro Potente', 'Tiro a scendere', 'Tiro a salire', 'A giro da distante', 'Colpo di testa', 'Tiro acrobatico'],
  Passaggio: ['Passaggio di prima', 'Passaggio calibrato', 'Passaggio filtrante', 'Cross preciso', 'Lancio lungo preciso', 'Passaggio dosato', 'Rabona'],
  Dribbling: ['Doppio tocco', 'Finta doppio passo', 'Elastico', 'Controllo di suola', 'Stop acrobatico', 'Protezione'],
  Difesa: ['Intercettazione', 'Marcatura', 'Contrasto Aggressivo', 'Scivolata', 'Muro', 'Caposaldo'],
  Portiere: ['Traiettoria bassa PT', 'Rilancio del PT', 'Para-rigori', 'Uscita portiere'],
  Speciali: ['Leader', 'Tornante', 'Super riserva', 'Specialista punizioni', 'Specialista rigori']
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
  { en: 'Long-Range Curler', it: 'A giro da distante', camel: ['longRangeCurler'], aliasIt: ['Tiro a giro da lontano'] },
  { en: 'Long-Range Shooting', it: 'Tiro dalla distanza', camel: ['longRangeShooting'] },
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
  { en: 'Long Throw', it: 'Rimessa lunga', camel: ['longThrow'] },
  { en: 'GK Long Throw', it: 'Rimessa lunga', camel: ['gkLongThrow'], aliasIt: ['Rimessa lunga PT'] },
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
  { en: 'Cross Over Turn', it: 'Svolta secca', camel: ['crossOverTurn'] }
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
  return map
}

const SKILL_INDEX = buildSkillIndex()

/**
 * @param {string} raw — nome abilità in qualsiasi forma (IT manuale, EN card, camelCase efhub)
 * @param {'it'|'en'} lang
 * @returns {string}
 */
export function getSkillDisplayLabel(raw, lang = 'it') {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return ''
  const key = normalizeSkillKey(trimmed)
  const entry = SKILL_INDEX.get(key)
  if (entry) return lang === 'en' ? entry.en : entry.it
  return lang === 'en' ? humanizeFallback(trimmed) : trimmed
}
