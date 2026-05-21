/**
 * Confronto abilità carta vs titolare rosa — una frase per Card Advisor Pro.
 */

import { pickComparisonAnchor } from '@/lib/cardAdvisorPurchaseContext'
import { getMergedPlayerSkills } from '@/lib/rosterSkillsContext'
import { canonicalSkillStorageName, getSkillDisplayLabel, normalizeSkillKey } from '@/lib/playerSkillLabels'

const MAX_SHARED_IN_PHRASE = 3
const MAX_CARD_ONLY_IN_PHRASE = 2

/** Peso profilo per skill (chiave normalizzata EN). */
const SKILL_PROFILE_WEIGHT = {
  aerialfort: { aerial: 3, def: 2 },
  aerialsuperiority: { aerial: 3, def: 1 },
  shadowhunt: { def: 3, build: 1 },
  magneticfeet: { build: 2 },
  momentumdribbling: { finish: 1, build: 1 },
  phenomenalpassing: { build: 3 },
  visionarypass: { build: 2 },
  phenomenalfinishing: { finish: 3 },
  blitzcurler: { finish: 2 },
  edgedcrossing: { aerial: 2, build: 1 },
  gamechangingpass: { build: 2 },
  accelerationburst: { finish: 1 },
  trickster: { finish: 1, build: 1 },
  fortress: { def: 2 },
  longreachtackle: { def: 2 },
  interception: { def: 2 },
  manmarking: { def: 2 },
  blocker: { def: 1 },
  onetouchpass: { build: 2 },
  throughpassing: { build: 2, finish: 1 },
  heading: { aerial: 2, finish: 1 },
  firsttimeshot: { finish: 2 },
  captaincy: { def: 0 }
}

const DEF_SKILL_KEYS = new Set([
  'interception', 'manmarking', 'blocker', 'slidingtackle', 'acrobaticclearance',
  'aerialsuperiority', 'aerialfort', 'fortress', 'longreachtackle', 'trackback'
])

function toAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function uniqueSkillKeys(skills = []) {
  const keys = []
  const seen = new Set()
  for (const raw of skills) {
    const canon = canonicalSkillStorageName(String(raw || '').trim())
    if (!canon) continue
    const key = normalizeSkillKey(canon)
    if (!key || seen.has(key)) continue
    seen.add(key)
    keys.push({ key, canon, label: getSkillDisplayLabel(canon, 'it') })
  }
  return keys
}

function collectCardSkills(card, catalogCard) {
  return uniqueSkillKeys([
    ...(Array.isArray(card?.skills) ? card.skills : []),
    ...(Array.isArray(catalogCard?.player_skills) ? catalogCard.player_skills : [])
  ])
}

function anchorComparePrefix(anchor, lang) {
  if (!anchor?.player) return ''
  const isEn = lang === 'en'
  if (anchor.type === 'same_name' || anchor.type === 'same_field_role') {
    return isEn ? `Vs ${anchor.displayLabel}` : `Rispetto a ${anchor.displayLabel}`
  }
  if (anchor.type === 'same_family') {
    return isEn
      ? `Vs ${anchor.displayLabel} (fallback — same line, no ${anchor.cardRole} on your layout)`
      : `Rispetto a ${anchor.displayLabel} (fallback — stesso reparto, nessun ${anchor.cardRole} sul modulo)`
  }
  if (anchor.type === 'same_wide_flank') {
    return isEn
      ? `Vs ${anchor.displayLabel} (wide role in your squad)`
      : `Rispetto a ${anchor.displayLabel} (fascia offensiva in rosa)`
  }
  if (anchor.type === 'natural_competence_only') {
    return isEn
      ? `Vs ${anchor.displayLabel} (skill comparison only — not your ${anchor.cardRole} starter)`
      : `Rispetto a ${anchor.displayLabel} (solo confronto skill — non è il tuo ${anchor.cardRole} titolare)`
  }
  return isEn ? `Vs ${anchor.displayLabel}` : `Rispetto a ${anchor.displayLabel}`
}

function diffSkillSets(cardSkills, starterSkills) {
  const cardKeys = new Set(cardSkills.map((s) => s.key))
  const starterKeys = new Set(starterSkills.map((s) => s.key))
  return {
    shared: cardSkills.filter((s) => starterKeys.has(s.key)),
    onlyOnCard: cardSkills.filter((s) => !starterKeys.has(s.key)),
    onlyOnStarter: starterSkills.filter((s) => !cardKeys.has(s.key))
  }
}

function profileSignals(profile = {}) {
  const weakPoint = toAscii(profile?.ai_weak_point || '')
  const goals = Array.isArray(profile?.ai_learn_goals)
    ? profile.ai_learn_goals.map((g) => String(g || ''))
    : profile?.ai_learn_goals
      ? [String(profile.ai_learn_goals)]
      : []
  const all = toAscii([weakPoint, ...goals].join(' '))
  return {
    needBuild: /(pass|build|uscit|possess|regia|palleggio)/.test(all),
    needDef: /(difes|duel|copert|recuper|conced)/.test(all),
    needFinishing: /(finish|finaliz|gol|shot|tiro|attacco)/.test(all),
    needAerial: /(testa|aerial|cross|corner|set piece|area)/.test(all)
  }
}

function issuesSignals(patterns = {}) {
  const text = toAscii((patterns?.recurring_issues || []).join(' '))
  return {
    needDefence: /(difes|copert|duel|press|conced|recover|recuper|mark)/.test(text),
    needAerial: /(testa|aerial|cross|corner|set piece)/.test(text)
  }
}

function gameSignals(gameAnalysis = {}) {
  const stats = gameAnalysis?.stats && typeof gameAnalysis.stats === 'object' ? gameAnalysis.stats : {}
  const passing = stats.passing && typeof stats.passing === 'object' ? stats.passing : {}
  const defense = stats.defense && typeof stats.defense === 'object' ? stats.defense : {}
  const text = toAscii(JSON.stringify({ passing, defense }))
  return {
    needAerial: /(cross|corner|head|aerial|area)/.test(text),
    needDef: /(conced|defen|tackle|block)/.test(text)
  }
}

function skillValueScore(skillKey, profileRead, issueRead, gameRead) {
  const weights = SKILL_PROFILE_WEIGHT[skillKey] || {}
  let score = 1
  if (weights.aerial && (profileRead.needAerial || issueRead.needAerial || gameRead.needAerial)) score += weights.aerial
  if (weights.def && (profileRead.needDef || issueRead.needDefence || gameRead.needDef)) score += weights.def
  if (weights.build && profileRead.needBuild) score += weights.build
  if (weights.finish && profileRead.needFinishing) score += weights.finish
  return score
}

function isPremiumCard(card, catalogCard) {
  const cat = toAscii(`${card?.category || ''} ${catalogCard?.category || ''} ${catalogCard?.card_type || ''}`)
  return /(epic|legendary|leggendar|show time|showtime|big time)/.test(cat)
}

function formatSkillList(skills, lang, max = 2) {
  return skills
    .slice(0, max)
    .map((s) => getSkillDisplayLabel(s.canon, lang === 'en' ? 'en' : 'it'))
    .filter(Boolean)
    .join(lang === 'en' ? ' and ' : ' e ')
}

function sharedPhrase(shared, lang) {
  if (shared.length === 0) return ''
  const defCount = shared.filter((s) => DEF_SKILL_KEYS.has(s.key)).length
  if (defCount >= 3) {
    return lang === 'en' ? 'the same defensive core' : 'la stessa base difensiva'
  }
  const labels = formatSkillList(
    [...shared].sort((a, b) => a.label.localeCompare(b.label)),
    lang,
    MAX_SHARED_IN_PHRASE
  )
  return lang === 'en' ? `shared ${labels}` : `condividi ${labels}`
}

function profileTail(topCardOnly, profileRead, issueRead, gameRead, lang) {
  const keys = topCardOnly.map((s) => s.key)
  const aerial = keys.some((k) => k === 'aerialfort' || k === 'aerialsuperiority')
  const def = keys.some((k) => DEF_SKILL_KEYS.has(k))
  if (aerial && (profileRead.needAerial || issueRead.needAerial || gameRead.needAerial)) {
    return lang === 'en'
      ? ', especially if you concede aerial pressure in the box'
      : ', soprattutto se subisci cross e palloni pericolosi in area'
  }
  if (def && (profileRead.needDef || issueRead.needDefence || gameRead.needDef)) {
    return lang === 'en'
      ? ', aligned with your defensive priorities'
      : ', in linea con le tue priorità difensive'
  }
  if (topCardOnly.length > 0) {
    return lang === 'en' ? ', moderate fit for your current profile' : ', impatto medio sul tuo profilo attuale'
  }
  return ''
}

function premiumTail(hasCardDelta, lang) {
  if (!hasCardDelta) return ''
  return lang === 'en'
    ? '; as a premium card, worth the coins if that gap matters to you'
    : '; come carta premium, ha senso spendere se quel salto ti serve davvero'
}

/**
 * @param {{
 *   card: object,
 *   catalogCard?: object|null,
 *   players?: object[],
 *   profile?: object,
 *   gameAnalysis?: object|null,
 *   patterns?: object,
 *   lang?: 'it'|'en'
 * }} options
 * @returns {string}
 */
export function buildSkillDeltaSentence({
  card,
  catalogCard = null,
  players = [],
  formation = null,
  profile = {},
  gameAnalysis = null,
  patterns = {},
  lang = 'it'
} = {}) {
  const isEn = lang === 'en'
  const cardSkills = collectCardSkills(card, catalogCard)
  const anchor = pickComparisonAnchor(players, card?.position, card?.name, formation)
  const starter = anchor.player
  const comparePrefix = anchorComparePrefix(anchor, lang)
  const profileRead = profileSignals(profile)
  const issueRead = issuesSignals(patterns)
  const gameRead = gameSignals(gameAnalysis || {})
  const premium = isPremiumCard(card, catalogCard)

  if (!starter || cardSkills.length === 0) {
    const only = cardSkills
      .map((s) => ({
        ...s,
        score: skillValueScore(s.key, profileRead, issueRead, gameRead)
      }))
      .sort((a, b) => b.score - a.score)
    const labels = formatSkillList(only, lang, MAX_CARD_ONLY_IN_PHRASE)
    if (!labels) return ''
    return isEn
      ? `Distinct card skills: ${labels}.`
      : `Skill distintive della carta: ${labels}.`
  }

  const starterSkills = uniqueSkillKeys(getMergedPlayerSkills(starter))
  const { shared, onlyOnCard, onlyOnStarter } = diffSkillSets(cardSkills, starterSkills)

  const rankedCardOnly = onlyOnCard
    .map((s) => ({ ...s, score: skillValueScore(s.key, profileRead, issueRead, gameRead) }))
    .sort((a, b) => b.score - a.score)

  const sharedPart = sharedPhrase(shared, lang)
  const cardOnlyLabels = formatSkillList(rankedCardOnly, lang, MAX_CARD_ONLY_IN_PHRASE)

  if (!cardOnlyLabels && shared.length >= 2) {
    const rotationNote = premium
      ? isEn
        ? ' Still eligible as elite rotation in a crowded lane — judge distinct tools, body type, connection and match plan; not an automatic skip.'
        : ' Resta valida come rotazione d\'élite in corsia affollata — valuta tool distintivi, body type, connessione e piano partita; non è skip automatico.'
      : ''
    return isEn
      ? `${comparePrefix}, skill profile is almost the same (${sharedPart}): new skills are not the main buy reason; judge premium value from distinct tools, stats, traits and rotation.${rotationNote}`
      : `${comparePrefix}, il profilo abilità è quasi uguale (${sharedPart}): le skill nuove non sono il motivo principale; valuta valore premium da tool distintivi, stats, tratti e rotazione.${rotationNote}`
  }

  if (!cardOnlyLabels) {
    const lost = formatSkillList(onlyOnStarter, lang, 1)
    if (lost) {
      return isEn
        ? `${comparePrefix}, no new skills on this card; you would lose ${lost} from your starter.`
        : `${comparePrefix}, nessuna skill nuova sulla carta; perderesti ${lost} del titolare.`
    }
    return isEn
      ? `${comparePrefix}, abilities match closely — any upgrade must come from role use, premium profile, stats or special traits, not new skills.`
      : `${comparePrefix}, le abilità coincidono: l'eventuale upgrade viene da uso ruolo, profilo premium, stats o tratti speciali, non da skill diverse.`
  }

  const tail = profileTail(rankedCardOnly, profileRead, issueRead, gameRead, lang)
  const prem = premium ? premiumTail(true, lang) : ''

  if (sharedPart) {
    return isEn
      ? `${comparePrefix}, you keep ${sharedPart}; the real gain is ${cardOnlyLabels}${tail}${prem}.`
      : `${comparePrefix}, ${sharedPart}; il salto vero è ${cardOnlyLabels}${tail}${prem}.`
  }

  return isEn
    ? `${comparePrefix}, the gain is ${cardOnlyLabels}${tail}${prem}.`
    : `${comparePrefix}, il valore aggiunto è ${cardOnlyLabels}${tail}${prem}.`
}
