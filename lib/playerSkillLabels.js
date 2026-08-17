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

/** Etichette IT ufficiali client eFootball (scheda abilità in-game). */
export const SKILL_CATEGORIES = {
  Tiro: [
    'Tiro di prima',
    'Tiro dalla distanza',
    'Tiro a scendere',
    'Tiro a salire',
    'A giro da distante',
    'Tiro a giro spiovente',
    'Pallonetto mirato',
    'Tiro di collo',
    'Colpo di testa',
    'Incornata',
    'Sassata rasoterra',
    'Colpo di tacco',
    'Finalizzazione acrobatica',
    'Istinto del gol',
    'Forza di volontà',
    'Esterno a giro'
  ],
  Passaggio: [
    'Passaggio di prima',
    'Passaggio filtrante',
    'Passaggio calibrato',
    'Passaggi illuminanti',
    'Passaggio calcolato',
    'Passaggi cruciali',
    'Cross calibrato',
    'Cross spiovente',
    'Passaggio a scavalcare',
    'Rabona',
    'No-look',
    'Rimessa laterale lunga'
  ],
  Dribbling: [
    'Doppio tocco',
    'Finta doppio passo',
    'Elastico',
    'Veronica',
    'Sombrero',
    'Svolta secca',
    'Taglia alle spalle e gira',
    'Rimbalzo interno',
    'Controllo di suola',
    'Protezione',
    'Calamita ai piedi',
    'Dribbling fulmineo',
    'Scatto bruciante',
    'Tap Trick',
    'Trickster'
  ],
  Difesa: [
    'Intercettazione',
    'Marcatore',
    'Tornante',
    'Scivolata',
    'Muro',
    'Dominio palle alte',
    'Difesa svettante',
    'Disimpegno acrobatico',
    'Contrasto Aggressivo',
    'Tackle in allungo',
    'Caposaldo',
    'Pressing alle spalle',
    'Fortezza'
  ],
  Portiere: [
    'Traiettoria bassa al portiere',
    'Rimessa profonda al portiere',
    'Rilancio del portiere',
    'Para-rigori',
    'Direzione alla difesa',
    'Portiere galvanizzatore',
    'Uscita portiere'
  ],
  Speciali: [
    'Leader',
    'Riserva di lusso',
    'Astuzia',
    'Specialista punizioni',
    'Specialista dei rigori',
    'Specialista cross',
    'Attivatore d\'attacco',
    'Attacking Surge',
    'Spirito combattivo',
    'Jolly'
  ]
}

/** Ordine e nomi inglesi ufficiali (stesso set usato in nuova rosa / estrazioni). */
export const PLAYER_SKILL_PRESETS = [
  'Double Touch',
  'Tap Trick',
  'Sole Control',
  'Flip Flap',
  'Marseille Turn',
  'Sombrero',
  'Cut Behind & Turn',
  'Scissors Feint',
  'Cross Over Turn',
  'Scotch Move',
  'Chop Turn',
  'Step On Skill Control',
  'Heading',
  'Long-Range Curler',
  'Long-Range Shooting',
  'Chip Shot Control',
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
  'Long Lofted Pass',
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
  'Fighting Spirit',
  'Attacking Surge'
]

/**
 * en: nome card / API inglese
 * it: stringa come in gestione rosa (ManualPlayerModal) dove esiste corrispondenza 1:1
 * camel: chiavi efhub / JSON omonimi
 * aliasIt / aliasEn: varianti già salvate o vecchie traduzioni da risolvere
 */
const SKILL_DEFINITIONS = [
  { en: 'Double Touch', it: 'Doppio tocco', es: 'Doble toque', camel: ['doubleTouch'] },
  { en: 'Tap Trick', it: 'Tap Trick', es: 'Tap Trick', camel: ['tapTrick'], aliasIt: ['Tap Trik'], aliasEn: ['Tap-Trick'] },
  { en: 'Sole Control', it: 'Controllo di suola', es: 'Control de suela', camel: ['soleControl'], aliasEn: ['Sole control'] },
  { en: 'Flip Flap', it: 'Elastico', es: 'Elástica', camel: ['flipFlap'] },
  { en: 'Marseille Turn', it: 'Veronica', es: 'Verónica', camel: ['marseilleTurn'] },
  { en: 'Sombrero', it: 'Sombrero', es: 'Sombrero', camel: ['sombrero'] },
  { en: 'Cross Over Turn', it: 'Svolta secca', es: 'Giro seco', camel: ['crossOverTurn'], aliasIt: ['Volta secca'] },
  { en: 'Scotch Move', it: 'Rimbalzo interno', es: 'Rebote interno', camel: ['scotchMove'], aliasEn: ['Scotch move'] },
  { en: 'Chop Turn', it: 'Chop turn', es: 'Chop turn', camel: ['chopTurn'], aliasEn: ['Chop turn'], aliasIt: ['Stop e croce'] },
  {
    en: 'Cut Behind & Turn',
    it: 'Taglia alle spalle e gira',
    es: 'Recorte y giro',
    camel: ['cutBehindTurn', 'cutBehindAndTurn'],
    aliasIt: ['Taglio alle spalle e svolta', 'Taglio alle spalle e giro', 'Taglia alle spalle gira']
  },
  { en: 'Scissors Feint', it: 'Finta doppio passo', es: 'Bicicleta', camel: ['scissorsFeint'], aliasIt: ['Doppio passo'] },
  {
    en: 'Step On Skill Control',
    it: 'Controllo di suola',
    es: 'Control de suela',
    camel: ['stepOnSkillControl'],
    aliasIt: ['Stop acrobatico', 'Controllo abilita con suola']
  },
  { en: 'Heading', it: 'Colpo di testa', es: 'Remate de cabeza', camel: ['heading'] },
  {
    en: 'Long-Range Curler',
    it: 'A giro da distante',
    es: 'Rosca lejana',
    camel: ['longRangeCurler', 'longRangeDrive'],
    aliasIt: ['Tiro a giro da lontano', 'Tiro a giro'],
    aliasEn: ['Long Range Curler']
  },
  {
    en: 'Long-Range Shooting',
    it: 'Tiro dalla distanza',
    es: 'Tiro lejano',
    camel: ['longRangeShooting'],
    aliasEn: ['Long Range Shooting']
  },
  {
    en: 'Chip Shot Control',
    it: 'Pallonetto mirato',
    es: 'Vaselina ajustada',
    camel: ['chipShotControl', 'chipShot'],
    aliasIt: ['Controllo pallonetto', 'Pallonetto']
  },
  { en: 'Power Shot', it: 'Tiro potente', es: 'Remate potente', camel: ['powerShot'], aliasIt: ['Tiro Potente'] },
  {
    en: 'Knuckle Shot',
    it: 'Tiro di collo',
    es: 'Tiro de empeine',
    camel: ['knuckleShot'],
    aliasIt: ['Tiro imprevedibile', 'Tiro a effetto imprevedibile']
  },
  { en: 'Dipping Shot', it: 'Tiro a scendere', es: 'Tiro en picada', camel: ['dippingShot'], aliasIt: ['Tiri a scendere'] },
  { en: 'Rising Shot', it: 'Tiro a salire', es: 'Tiro en subida', camel: ['risingShot'], aliasIt: ['Colpo In Aumento', 'Tiri a salire'], aliasEn: ['Rising Shots'] },
  {
    en: 'Acrobatic Finishing',
    it: 'Finalizzazione acrobatica',
    es: 'Finalización acrobática',
    camel: ['acrobaticFinishing'],
    aliasIt: ['Tiro acrobatico', 'Finalizz. acrobatica']
  },
  { en: 'Heel Trick', it: 'Colpo di tacco', es: 'Tacón', camel: ['heelTrick'], aliasEn: ['Hell Trick'] },
  { en: 'First-time Shot', it: 'Tiro di prima', es: 'Remate de primera', camel: ['firstTimeShot'], aliasIt: ['Tiro al volo'] },
  { en: 'One-touch Pass', it: 'Passaggio di prima', es: 'Pase de primera', camel: ['oneTouchPass'] },
  { en: 'Through Passing', it: 'Passaggio filtrante', es: 'Pase filtrado', camel: ['throughPassing', 'throughPass'] },
  {
    en: 'Weighted Pass',
    it: 'Passaggio calibrato',
    es: 'Pase medido',
    camel: ['weightedPass'],
    aliasIt: ['Passaggio dosato']
  },
  {
    en: 'Long Lofted Pass',
    it: 'Lancio lungo preciso',
    es: 'Pase largo preciso',
    camel: ['longLoftedPass', 'longLofted'],
    // "Lancio lungo" in input utente non deve mai finire su Long-Range Shooting.
    aliasIt: ['Lancio lungo']
  },
  { en: 'Pinpoint Crossing', it: 'Cross calibrato', es: 'Centro medido', camel: ['pinpointCrossing'], aliasIt: ['Cross preciso'] },
  { en: 'Outside Curler', it: 'Esterno a giro', es: 'Rosca exterior', camel: ['outsideCurler'], aliasIt: ['Tiro a giro'] },
  { en: 'Rabona', it: 'Rabona', es: 'Rabona', camel: ['rabona'] },
  { en: 'No Look Pass', it: 'No-look', es: 'No-look', camel: ['noLookPass'], aliasIt: ['Passaggio no look'] },
  { en: 'Low Lofted Pass', it: 'Passaggio a scavalcare', es: 'Pase bombeado', camel: ['lowLoftedPass'] },
  { en: 'GK Low Punt', it: 'Traiettoria bassa al portiere', es: 'Saque bajo', camel: ['gkLowPunt'], aliasIt: ['Traiettoria bassa PT', 'Rinvio basso PT', 'Traiettoria bassa portiere'] },
  { en: 'GK High Punt', it: 'Rimessa profonda al portiere', es: 'Saque largo', camel: ['gkHighPunt'], aliasIt: ['Rimessa profonda PT', 'Rilancio del PT', 'Rinvio alto PT', 'Rimessa profonda portiere'] },
  {
    en: 'Long Throw',
    it: 'Rimessa laterale lunga',
    es: 'Saque de banda largo',
    camel: ['longThrow'],
    aliasEn: ['Long throw'],
    aliasIt: ['Rimessa lat. lunga', 'Rimessa lunga', 'Rimessa laterale e lunga']
  },
  {
    en: 'GK Long Throw',
    it: 'Rilancio del portiere',
    es: 'Saque largo del portero',
    camel: ['gkLongThrow'],
    aliasEn: ['Gk Long Throw', 'GK long throw'],
    aliasIt: ['Rimessa lunga PT', 'Rimessa lunga portiere', 'Rilancio del PT']
  },
  { en: 'Penalty Specialist', it: 'Specialista dei rigori', es: 'Especialista en penaltis', camel: ['penaltySpecialist'], aliasIt: ['Specialista rigori'] },
  { en: 'Gamesmanship', it: 'Astuzia', es: 'Astucia', camel: ['gamesmanship'], aliasIt: ['Malizia'] },
  { en: 'Man Marking', it: 'Marcatore', es: 'Marcador', camel: ['manMarking'], aliasIt: ['Marcatura', 'Marcatura a uomo', 'Marcatori'] },
  { en: 'Track Back', it: 'Tornante', es: 'Recuperador', camel: ['trackBack'], aliasIt: ['Ripiegamento', 'Rientro difensivo', 'Tornanti'] },
  { en: 'Interception', it: 'Intercettazione', es: 'Intercepción', camel: ['interception'] },
  { en: 'Blocker', it: 'Muro', es: 'Bloqueador', camel: ['blocker'], aliasIt: ['Blocco'] },
  {
    en: 'Aerial Superiority',
    it: 'Dominio palle alte',
    es: 'Dominio aéreo',
    camel: ['aerialSuperiority'],
    aliasIt: ['Dominio aereo', 'Superiorita aerea', 'Superiorità aerea']
  },
  { en: 'Sliding Tackle', it: 'Scivolata', es: 'Barrida', camel: ['slidingTackle'] },
  {
    en: 'Acrobatic Clearance',
    it: 'Disimpegno acrobatico',
    es: 'Despeje acrobático',
    camel: ['acrobaticClearance', 'acrobaticClear'],
    aliasIt: ['Rinvio acrobatico']
  },
  { en: 'Captaincy', it: 'Leader', es: 'Líder', camel: ['captaincy'], aliasIt: ['Leadership'] },
  { en: 'Super-sub', it: 'Riserva di lusso', es: 'Revulsivo', camel: ['superSub', 'supersub'], aliasIt: ['Super riserva'] },
  { en: 'Fighting Spirit', it: 'Spirito combattivo', es: 'Espíritu combativo', camel: ['fightingSpirit'] },
  /** efhub legacy / varianti */
  /** Solo picker gestione rosa (ManualPlayerModal) — prima non erano in indice */
  { en: 'Shielding', it: 'Protezione', es: 'Protección', camel: ['shielding', 'protectTheBall'] },
  { en: 'Aggressive Defence', it: 'Contrasto Aggressivo', es: 'Entrada agresiva', camel: ['aggressiveDefence', 'aggressiveDefense'] },
  { en: 'Anchor', it: 'Caposaldo', es: 'Ancla', camel: ['anchor', 'fortress'] },
  { en: 'Penalty Saver', it: 'Para-rigori', es: 'Para-penaltis', camel: ['penaltySaver', 'gkPenaltySaver'], aliasEn: ['GK Penalty Saver', 'Gk Penalty Saver'], aliasIt: ['Para rigori'] },
  { en: 'Set Piece Specialist', it: 'Specialista punizioni', es: 'Especialista en faltas', camel: ['setPieceSpecialist', 'deadBallSpecialist'] },
  { en: 'Goalkeeper Rush', it: 'Uscita portiere', es: 'Salida del portero', camel: ['goalkeeperRush', 'gkRush'] },
  { en: 'Utility Player', it: 'Jolly', es: 'Comodín', camel: ['utilityPlayer', 'oneManArmy'] },
  /**
   * Tratti / comSkills / Showtime — IT per UI e RAG (localizeSkillTermsInText).
   * Persistenza DB: sempre `en` canonico via normalizePlayerSkillsArray.
   */
  { en: 'Edged Crossing', it: 'Cross spiovente', es: 'Centro con rosca', camel: ['edgedCrossing'], aliasIt: ['Cross tagliente', 'Cross spiombente'] },
  { en: 'Phenomenal Passing', it: 'Passaggi illuminanti', es: 'Pases fenomenales', camel: ['phenomenalPassing'], aliasIt: ['Passaggio fenomenale', 'Passaggio sensazionale'], aliasEn: ['Phenomenal Pass'] },
  { en: 'Phenomenal Finishing', it: 'Istinto del gol', es: 'Instinto de gol', camel: ['phenomenalFinishing'], aliasIt: ['Finalizzazione fenomenale', 'Tiro sensazionale'] },
  { en: 'Visionary Pass', it: 'Passaggio calcolato', es: 'Pase visionario', camel: ['visionaryPass'], aliasIt: ['Passaggio visionario', 'Passaggio illuminante'] },
  { en: 'Game-changing Pass', it: 'Passaggi cruciali', es: 'Pases decisivos', camel: ['gameChangingPass'] },
  { en: 'Blitz Curler', it: 'Tiro a giro spiovente', es: 'Rosca rápida', camel: ['blitzCurler'] },
  { en: 'Bullet Header', it: 'Incornata', es: 'Cabezazo potente', camel: ['bulletHeader'] },
  { en: 'Aerial Fort', it: 'Difesa svettante', es: 'Bastión aéreo', camel: ['aerialFort'], aliasIt: ['Difesa aspettante'], aliasEn: ['Aerial Forte'] },
  { en: 'Shadow Hunt', it: 'Pressing alle spalle', es: 'Presión por detrás', camel: ['shadowHunt'], aliasIt: ['Caccia all\'ombra', 'Shadow Hunt'] },
  { en: 'Fortress', it: 'Fortezza', es: 'Fortaleza', camel: ['fortress'] },
  { en: 'Long-reach Tackle', it: 'Tackle in allungo', es: 'Entrada larga', camel: ['longReachTackle'], aliasIt: ['Contrasto a distanza', 'Taker in a lungo'], aliasEn: ['Long Reach Tackle'] },
  { en: 'Incisive Run', it: 'Inserimento incisivo', es: 'Desmarque incisivo', camel: ['incisiveRun'] },
  { en: 'Mazing Run', it: 'Corsa ubriacante', es: 'Regate imprevisible', camel: ['mazingRun'] },
  { en: 'Speeding Bullet', it: 'Proiettile veloce', es: 'Bala veloz', camel: ['speedingBullet'] },
  { en: 'Long Ball Expert', it: 'Specialista lancio lungo', es: 'Especialista en balón largo', camel: ['longBallExpert'], aliasEn: ['Long Ball Expert'] },
  { en: 'Early Crosser', it: 'Cross anticipato', es: 'Centro temprano', camel: ['earlyCross', 'earlyCrosser'], aliasEn: ['Early Cross'] },
  { en: 'Long Ranger', it: 'Tiro dalla distanza', es: 'Tiro lejano', camel: ['longRange', 'longRanger'] },
  { en: 'Low Screamer', it: 'Sassata rasoterra', es: 'Tiro raso potente', camel: ['lowScreamer'], aliasIt: ['Rasoterra potente', 'Sasata rasu terra', 'Sassata rasu terra'] },
  { en: 'Acceleration Burst', it: 'Scatto bruciante', es: 'Arranque explosivo', camel: ['accelerationBurst'], aliasIt: ['Scatto esplosivo', 'Scatto'] },
  { en: 'Trickster', it: 'Trickster', es: 'Trickster', camel: ['trickster'] },
  { en: 'Momentum Dribbling', it: 'Dribbling fulmineo', es: 'Regate explosivo', camel: ['momentumDribbling'], aliasIt: ['Dribbling in slancio', 'Dribbling fulminei', 'Dribbling fulmine'] },
  { en: 'Magnetic Feet', it: 'Calamita ai piedi', es: 'Imán en los pies', camel: ['magneticFeet'], aliasIt: ['Piedi magnetici', 'Calamita i piedi'] },
  { en: 'Cross Specialist', it: 'Specialista cross', es: 'Especialista en centros', camel: ['crossSpecialist'], aliasIt: ['Specialista di cross'] },
  { en: 'Attack Trigger', it: 'Attivatore d\'attacco', es: 'Activador de ataque', camel: ['attackTrigger'] },
  { en: 'Attacking Surge', it: 'Attacking Surge', es: 'Attacking Surge', camel: ['attackingSurge'] },
  { en: 'GK Directing Defence', it: 'Direzione alla difesa', es: 'Dirigiendo la defensa', camel: ['gkDirectingDefence', 'gkDirectingDefense'], aliasIt: ['Direzione difesa PT'], aliasEn: ['Gk Direct Defending'] },
  { en: 'GK Spirit Roar', it: 'Portiere galvanizzatore', es: 'Rugido del portero', camel: ['gkSpiritRoar'], aliasIt: ['Ruggito spirito PT'] },
  { en: 'Willpower', it: 'Forza di volontà', es: 'Fuerza de voluntad', camel: ['willpower'] }
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
    const entry = { en: row.en, it: row.it, es: row.es }
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
  if (entry) return lang === 'en' ? entry.en : lang === 'es' ? (entry.es || entry.en) : entry.it
  // Second pass: EN canonico (es. da OCR/card) → voce dizionario
  const canon = canonicalSkillStorageName(trimmed)
  if (canon && canon !== trimmed) {
    const k2 = normalizeSkillKey(canon)
    const entry2 = SKILL_INDEX.get(k2)
    if (entry2) return lang === 'en' ? entry2.en : lang === 'es' ? (entry2.es || entry2.en) : entry2.it
  }
  if (lang === 'es') {
    const localized = localizeSkillTermsInText(trimmed, 'es')
    if (localized && localized !== trimmed) return localized
  }
  if (lang === 'it') {
    const localized = localizeSkillTermsInText(trimmed, 'it')
    if (localized && localized !== trimmed) return localized
  }
  return lang === 'en' ? humanizeFallback(trimmed) : trimmed
}

const FIXED_INNATE_CARD_SKILL_LABELS = new Set([
  ...SKILL_CATEGORIES.Speciali,
  'Direzione alla difesa',
  'Portiere galvanizzatore',
  'Forza di volontà'
])

const FIXED_INNATE_SKILL_KEYS = (() => {
  const keys = new Set()
  for (const itLabel of FIXED_INNATE_CARD_SKILL_LABELS) {
    keys.add(normalizeSkillKey(itLabel))
  }
  for (const row of SKILL_DEFINITIONS) {
    if (!FIXED_INNATE_CARD_SKILL_LABELS.has(row.it)) continue
    keys.add(normalizeSkillKey(row.en))
    keys.add(normalizeSkillKey(row.it))
    for (const alias of row.aliasIt || []) keys.add(normalizeSkillKey(alias))
    for (const alias of row.aliasEn || []) keys.add(normalizeSkillKey(alias))
    for (const camel of row.camel || []) keys.add(normalizeSkillKey(camel))
  }
  return keys
})()

/** Abilità Speciali innate (Leader, Spirito combattivo, …): sulla carta ma non negli slot programmi PT. */
export function isFixedInnateCardSkill(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return false
  if (FIXED_INNATE_SKILL_KEYS.has(normalizeSkillKey(trimmed))) return true
  const canon = canonicalSkillStorageName(trimmed)
  if (!canon) return false
  if (FIXED_INNATE_SKILL_KEYS.has(normalizeSkillKey(canon))) return true
  const itKey = normalizeSkillKey(getSkillDisplayLabel(canon, 'it'))
  return FIXED_INNATE_SKILL_KEYS.has(itKey)
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
    for (const a of row.aliasIt || []) pairs.push([a, row.it])
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
