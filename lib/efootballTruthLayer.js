/**
 * Unique eFootball truth layer (v6.0.0 / eFootball 2027).
 * Facts carry provenance so prompts, RAG and guardrails share one source.
 *
 * status:
 *  - confirmed  = official Konami documentation
 *  - community  = competitive/community heuristic, never present as a game law
 *  - unverified = do not invent numbers or treat as fact
 */

export const EFOOTBALL_TRUTH_VERSION = {
  game: 'eFootball v6.0.0',
  season: 'eFootball 2027',
  verifiedAt: '2026-09-15',
  ragCorpus: '9.1.0'
}

const SRC = {
  v600: {
    id: 'konami-v6.0.0',
    url: 'https://www.konami.com/efootball/en/page/v6/versioninfo_v6-00',
    label: 'Konami Version Info v6.0.0'
  },
  dreamTeam: {
    id: 'konami-dreamteam',
    url: 'https://www.konami.com/efootball/en/page/dreamteam',
    label: 'Konami Dream Team'
  },
  v300: {
    id: 'konami-v3.0.0',
    url: 'https://www.konami.com/efootball/en/page/2024/update_v3_0',
    label: 'Konami Version Info v3.0.0'
  },
  attackTrigger: {
    id: 'konami-attack-trigger',
    url: 'https://www.konami.com/efootball/en/topic/news/4839',
    label: 'Konami Attack Trigger'
  }
}

function fact(id, payload) {
  return { id, ...payload }
}

export const MAX_ADDITIONAL_SKILLS = 5
export const MAX_POSITION_TRAINING_SLOTS = 2
export const MAX_INDIVIDUAL_INSTRUCTION_SLOTS = 4

export const TEAM_STYLE_FACTS = [
  fact('possession', { it: 'Possesso palla', en: 'Possession Game', es: 'Posesión', status: 'confirmed', source: SRC.v600 }),
  fact('quick_counter', { it: 'Contropiede veloce', en: 'Quick Counter', es: 'Contraataque rápido', status: 'confirmed', source: SRC.v600 }),
  fact('long_ball_counter', { it: 'Contrattacco', en: 'Long Ball Counter', es: 'Contraataque con balón largo', status: 'confirmed', source: SRC.v600 }),
  fact('long_ball', { it: 'Passaggio lungo', en: 'Long Ball', es: 'Balón largo', status: 'confirmed', source: SRC.v600 }),
  fact('out_wide', { it: 'Vie laterali', en: 'Out Wide', es: 'Por las bandas', status: 'confirmed', source: SRC.v600 }),
  fact('overload', { it: 'Pressing totale', en: 'Overload', es: 'Superioridad', status: 'confirmed', source: SRC.v600 })
]

export const VALID_INDIVIDUAL_INSTRUCTIONS = [
  { id: 'difensivo', it: 'Difensivo', en: 'Defensive', slot: 'attack' },
  { id: 'ancoraggio', it: 'Ancoraggio', en: 'Anchoring', slot: 'attack' },
  { id: 'marcatura_stretta', it: 'Marcatura stretta', en: 'Tight Marking', slot: 'defense' },
  { id: 'marcatura_uomo', it: 'Marcatura uomo', en: 'Man Marking', slot: 'defense' },
  { id: 'contropiede', it: 'Contropiede', en: 'Counter Target', slot: 'defense' }
]

export const REMOVED_INDIVIDUAL_INSTRUCTIONS = [
  { id: 'offensivo', it: 'Offensivo', en: 'Attacking', removedIn: 'v6.0.0', source: SRC.v600 },
  { id: 'linea_bassa', it: 'Linea bassa', en: 'Deep Line', removedIn: 'v6.0.0', source: SRC.v600 }
]

export const COM_AI_PLAYSTYLE_KEYS = new Set([
  'mazingrun', 'incisiverun', 'speedingbullet', 'longballexpert',
  'earlycrosser', 'earlycross', 'longranger', 'trickster', 'funambolo', 'serpentina',
  'trenoincorsa', 'inserimento', 'espertopallelunghe', 'crossatore', 'tiratore'
])

export const GAME_FACTS = [
  fact('player_progression', {
    status: 'confirmed',
    source: SRC.dreamTeam,
    textIt: 'I Progression Points sbloccati al level-up sviluppano ulteriormente il giocatore. Non dire che stats e card sono immutabili.',
    textEn: 'Progression Points unlocked on level-up further develop the player. Do not say stats and cards are fixed.'
  }),
  fact('skill_training', {
    status: 'confirmed',
    source: SRC.dreamTeam,
    textIt: `Skill Training aggiunge al massimo ${MAX_ADDITIONAL_SKILLS} Additional Skills. Non dedurre la provenienza di un’abilità da array che non distinguono native e aggiuntive. Stili COM/IA e abilità speciali non occupano questi slot.`,
    textEn: `Skill Training adds a maximum of ${MAX_ADDITIONAL_SKILLS} Additional Skills. Do not infer skill provenance from arrays that do not distinguish native and additional skills. COM/AI styles and premium skills do not occupy these slots.`
  }),
  fact('position_training', {
    status: 'confirmed',
    source: SRC.v600,
    textIt: `Position Training alza la competenza su massimo ${MAX_POSITION_TRAINING_SLOTS} posizioni eleggibili. Da v6.0.0 la posizione già registrata sulla card è esclusa da quelle apprendibili.`,
    textEn: `Position Training raises proficiency for a maximum of ${MAX_POSITION_TRAINING_SLOTS} eligible positions. From v6.0.0 the registered card position cannot be learned again.`
  }),
  fact('fluid_formation', {
    status: 'confirmed',
    source: SRC.v600,
    textIt: 'Formazione fluida: due schemi nel Game Plan, uno in possesso e uno senza. Il passaggio non è istantaneo. FZTH salva entrambe le varianti ma non le sincronizza automaticamente dentro eFootball.',
    textEn: 'Fluid Formation: two Game Plan shapes, one in possession and one out of possession. Transition is not instant. FZTH saves both variants but does not automatically sync them into eFootball.'
  }),
  fact('split_playing_styles', {
    status: 'confirmed',
    source: SRC.v600,
    textIt: 'Ogni card può avere Stile di gioco in attacco, in difesa, o entrambi. Due carte nello stesso ruolo possono muoversi in modo diverso senza palla.',
    textEn: 'A card may have an Attacking Playing Style, a Defensive Playing Style, or both. Two cards in the same slot can behave differently without the ball.'
  }),
  fact('team_playstyle_proficiency_removed', {
    status: 'confirmed',
    source: SRC.v300,
    textIt: 'Dal v3.0.0 i giocatori non possiedono più Team Playstyle Proficiency e le loro abilità non aumentano o diminuiscono in base a tale valore.',
    textEn: 'Since v3.0.0 players no longer have Team Playstyle Proficiency and their abilities do not rise or fall based on that value.'
  }),
  fact('dual_linkup', {
    status: 'confirmed',
    source: SRC.v600,
    textIt: 'Alcuni allenatori hanno due Collegamenti (Link-up Plays). Se i dati ne mostrano due, citare entrambi. Collegamento = Connection dell’allenatore, non lag di rete.',
    textEn: 'Some managers have two Link-up Plays. If data shows two, cite both. Link-up is the manager Connection, not network lag.'
  }),
  fact('attack_trigger', {
    status: 'confirmed',
    source: SRC.attackTrigger,
    textIt: 'Attivatore d’attacco: aumenta il Comportamento offensivo di tutti gli altri compagni quando questo giocatore ha palla. Il possessore non è incluso.',
    textEn: 'Attack Trigger increases other teammates’ Attacking Awareness while this player has the ball. The ball-holder is not included.'
  }),
  fact('dynamic_volley', {
    status: 'confirmed',
    source: SRC.v600,
    textIt: 'Volée dinamica: Tiro sensazionale su palla in aria. Non inventare tasti.',
    textEn: 'Dynamic Volley: Stunning Shot while the ball is in the air. Do not invent buttons.'
  }),
  fact('stamina_official', {
    status: 'confirmed',
    source: SRC.v600,
    textIt: 'Resistenza influenza la Velocità in partita. v6.0.0 ha ricalibrato il consumo di Contrattacco e alzato leggermente il recupero a intervallo dei DC. Non citare percentuali di recupero non ufficiali.',
    textEn: 'Stamina affects Speed during matches. v6.0.0 recalibrated Long Ball Counter consumption and slightly increased centre-back half-time recovery. Do not cite unofficial recovery percentages.'
  }),
  fact('defense_commands', {
    status: 'confirmed',
    source: SRC.v600,
    textIt: 'Difesa: Match-up, Chiama pressing e Coinvolgimento difensivo influenzano inseguimento, orientamento e chiusura. v6.0.0 riduce la difesa IA eccessiva e rende più visibili le differenze di Comportamento difensivo. Consiglia azioni, non tasti.',
    textEn: 'Defence: Match-up, Call for Pressure and Defensive Engagement affect tracking, body shape and closing. v6.0.0 reduces overly strong AI defending and makes Defensive Awareness differences clearer. Advise actions, not buttons.'
  })
]

export const COMMUNITY_META_NOTES = [
  {
    status: 'community',
    textIt: 'Meta competitivo v6 (riferimento, non legge): 4-2-3-1 che in attacco fluisce verso 3-2-4-1 è un punto di partenza frequente; Overload sta meglio su 4-3-3/4-2-1-3 con uscita larga e mediano di copertura. Early-season, non consenso testato.',
    textEn: 'Competitive v6 reference, not a law: 4-2-3-1 flowing to 3-2-4-1 in attack is a common starting point; Overload fits 4-3-3/4-2-1-3 with a far-side outlet and holding midfielder. Early-season, not a tested consensus.'
  }
]

function normalizeKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function isRemovedIndividualInstruction(id) {
  const key = String(id || '').trim().toLowerCase()
  return REMOVED_INDIVIDUAL_INSTRUCTIONS.some((item) => item.id === key)
}

export function isValidIndividualInstruction(id) {
  const key = String(id || '').trim().toLowerCase()
  return VALID_INDIVIDUAL_INSTRUCTIONS.some((item) => item.id === key)
}

export function isComAiPlaystyle(raw) {
  const key = normalizeKey(raw)
  if (!key) return false
  if (COM_AI_PLAYSTYLE_KEYS.has(key)) return true
  return /funambolo|serpentina|trenoincorsa|mazingrun|speedingbullet|longranger|longballexpert|earlycross|incisiverun|trickster/.test(key)
}

function pushLinkUp(target, value) {
  if (!value) return
  if (Array.isArray(value)) {
    value.forEach((item) => pushLinkUp(target, item))
    return
  }
  if (typeof value === 'string' && value.trim()) {
    target.push({ name: value.trim() })
    return
  }
  if (typeof value === 'object' && (value.name || value.focal_point || value.key_man)) {
    target.push(value)
  }
}

/** Knowledge-only: if saved coach data shows two Link-ups, expose both. No schema change.
 * Expected formats on coaches.connection (jsonb):
 * - single object `{ name, focal_point?, key_man? }`
 * - OR array of such objects
 * Fallbacks: extracted_data.connection(s), metadata.connection(s). No connection_2 column.
 */
export function collectCoachLinkUps(coachRow) {
  const collected = []
  pushLinkUp(collected, coachRow?.connection)
  pushLinkUp(collected, coachRow?.connections)
  pushLinkUp(collected, coachRow?.extracted_data?.connection)
  pushLinkUp(collected, coachRow?.extracted_data?.connections)
  pushLinkUp(collected, coachRow?.metadata?.connection)
  pushLinkUp(collected, coachRow?.metadata?.connections)

  const seen = new Set()
  return collected.filter((item) => {
    const key = normalizeKey(item?.name || JSON.stringify(item))
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatCoachLinkUpsForPrompt(coachRow, lang = 'it') {
  const linkUps = collectCoachLinkUps(coachRow)
  if (!linkUps.length) return ''
  const isEn = lang === 'en' || lang === 'es'
  const parts = linkUps.map((item, index) => {
    const name = item.name || (isEn ? `Link-up ${index + 1}` : `Collegamento ${index + 1}`)
    const focal = item.focal_point
      ? `${item.focal_point.playing_style || '?'} (${item.focal_point.position || '?'})`
      : ''
    const keyMan = item.key_man
      ? `${item.key_man.playing_style || '?'} (${item.key_man.position || '?'})`
      : ''
    const extra = [focal ? `Focal Point ${focal}` : '', keyMan ? `Key Man ${keyMan}` : ''].filter(Boolean).join(', ')
    return extra ? `${name} (${extra})` : name
  })
  const label = isEn ? 'Connection / Link-up Plays' : 'Connection / Collegamenti'
  return `${label}: ${parts.join(' | ')}.`
}

export function getTruthLayerPromptBlock(lang = 'it') {
  const isEn = lang === 'en' || lang === 'es'
  const teamStyles = TEAM_STYLE_FACTS.map((style) => (isEn ? `${style.en} (${style.it})` : `${style.it} (${style.en})`)).join(', ')
  const instructions = VALID_INDIVIDUAL_INSTRUCTIONS.map((item) => (isEn ? item.en : item.it)).join(', ')
  const removed = REMOVED_INDIVIDUAL_INSTRUCTIONS.map((item) => (isEn ? `${item.en} (${item.it})` : `${item.it} (${item.en})`)).join(', ')
  const facts = GAME_FACTS.map((item) => `- ${isEn ? item.textEn : item.textIt}`).join('\n')
  const community = COMMUNITY_META_NOTES.map((item) => `- [${isEn ? 'COMMUNITY' : 'COMMUNITY'}] ${isEn ? item.textEn : item.textIt}`).join('\n')

  if (isEn) {
    return `EFOOTBALL TRUTH LAYER (${EFOOTBALL_TRUTH_VERSION.game}, verified ${EFOOTBALL_TRUTH_VERSION.verifiedAt}):
TEAM PLAYSTYLES (only these 6): ${teamStyles}.
INDIVIDUAL INSTRUCTIONS (valid): ${instructions}.
REMOVED in v6.0.0 (never recommend as Game Plan instructions): ${removed}. Replaced by Fluid Formation.
CONFIRMED FACTS:
${facts}
COMMUNITY / FZTH (never present as game law):
${community}
CATALOG PROVENANCE: imported cards may come from v5.4, v6.0, eFootball 2027 or older Hub dumps. Do not call a card "current" unless source_version is v6.0.0 / eFootball 2027. If provenance is missing, say the data is from the saved roster/catalog, not that it is the latest patch.`
  }

  return `TRUTH LAYER EFOOTBALL (${EFOOTBALL_TRUTH_VERSION.game}, verificata ${EFOOTBALL_TRUTH_VERSION.verifiedAt}):
STILI SQUADRA (solo questi 6): ${teamStyles}.
ISTRUZIONI INDIVIDUALI valide: ${instructions}.
RIMOSSE in v6.0.0 (non consigliarle come voci Game Plan): ${removed}. Al loro posto c’è la Formazione fluida.
FATTI CONFERMATI:
${facts}
COMMUNITY / FZTH (mai come legge di gioco):
${community}
PROVENIENZA CATALOGO: le carte importate possono venire da v5.4, v6.0, eFootball 2027 o dump Hub più vecchi. Non chiamare una carta "attuale" se source_version non è v6.0.0 / eFootball 2027. Se manca, di che i dati sono della rosa/catalogo salvato, non che sono la patch più recente.`
}
