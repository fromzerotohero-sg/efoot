/**
 * Offline evals for eFootball truth layer, Hero coach CTAs and memory.
 * node scripts/test-efootball-truth-layer.mjs
 */
import { getSkillDisplayLabel } from '../lib/playerSkillLabels.js'
import {
  TEAM_STYLE_FACTS,
  VALID_INDIVIDUAL_INSTRUCTIONS,
  MAX_ADDITIONAL_SKILLS,
  GAME_FACTS,
  collectCoachLinkUps,
  formatCoachLinkUpsForPrompt,
  getTruthLayerPromptBlock,
  isComAiPlaystyle,
  isRemovedIndividualInstruction,
  isValidIndividualInstruction
} from '../lib/efootballTruthLayer.js'
import { getCoachPoliciesText, getCoachSharedCoreText } from '../lib/coachPromptRules.js'
import {
  buildTacticalHistory,
  defaultCoachFallbacks,
  formatTacticalFeedbackForPrompt,
  isExcludedFromTacticalHistory,
  mentionsUnknownPlayer,
  refineCoachSuggestions
} from '../lib/coachSuggestionEngine.js'
import { orderNewestFirstThenChronological } from '../lib/heroChatStore.js'
import { getSelectableInstructions, validateIndividualInstruction } from '../lib/tacticalInstructions.js'
import { getPlayerSplitPlayingStyles, resolvePlayingStyleDbName } from '../lib/playingStyleResolve.js'
import {
  getMergedPlayerSkills,
  getNativePlayerSkills,
  getAdditionalOrUnclassifiedPlayerSkills,
  getPlayerComAiPlaystyles
} from '../lib/rosterSkillsContext.js'

let failed = 0
function assert(cond, msg) {
  if (!cond) {
    failed += 1
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}

assert(TEAM_STYLE_FACTS.length === 6, 'six official team styles')
assert(TEAM_STYLE_FACTS.some((s) => s.it === 'Pressing totale' && s.en === 'Overload'), 'Overload / Pressing totale present')
assert(MAX_ADDITIONAL_SKILLS === 5, 'max 5 additional skills')
assert(VALID_INDIVIDUAL_INSTRUCTIONS.every((item) => !['offensivo', 'linea_bassa'].includes(item.id)), 'removed instructions not selectable')
assert(isRemovedIndividualInstruction('offensivo') && isRemovedIndividualInstruction('linea_bassa'), 'removed instruction ids')
assert(isValidIndividualInstruction('difensivo') && !isValidIndividualInstruction('offensivo'), 'valid vs removed instructions')

const promptIt = getTruthLayerPromptBlock('it')
assert(/Formazione fluida/i.test(promptIt), 'fluid formation in truth prompt')
assert(/due Collegamenti|Link-up/i.test(promptIt), 'dual link-up in truth prompt')
assert(/Attivatore d.attacco|Attack Trigger/i.test(promptIt), 'Attack Trigger in truth prompt')
assert(!/\d+\s*%/.test(promptIt), 'no invented stamina percentages')
assert(/non citare percentuali/i.test(promptIt), 'stamina: official effects only')
assert(/source_version/i.test(promptIt), 'catalog provenance required')

const policies = getCoachPoliciesText('it')
assert(!/stats\/card fisse|statistiche\/card fisse|card sono fisse/i.test(policies), 'policies no longer claim fixed cards')
assert(/Formazione fluida/.test(policies), 'policies mention Fluid Formation')
assert(/max 5/.test(policies), 'policies mention 5 additional skills')

assert(isComAiPlaystyle('mazing run') && isComAiPlaystyle('Funambolo'), 'COM/AI playstyles detected')
assert(!isComAiPlaystyle('Trickster') && !isComAiPlaystyle('Attack Trigger'), 'real skills are not COM/AI')

const player = {
  skills: ['Passaggio filtrante', 'mazing run'],
  native_skills: ['Passaggio filtrante'],
  additional_skills: ['Tiro di prima'],
  com_skills: ['mazing run', 'Funambolo']
}
const merged = getMergedPlayerSkills(player).map((s) => getSkillDisplayLabel(s, 'it'))
assert(merged.some((s) => /filtrante/i.test(s)) && merged.some((s) => /tiro di prima/i.test(s)), 'merged player skills keep native+additional')
assert(!merged.some((s) => /mazing|funambolo/i.test(s)), 'COM/AI not merged into player skills')
assert(getNativePlayerSkills(player).map((s) => getSkillDisplayLabel(s, 'it')).some((s) => /filtrante/i.test(s)), 'native skills separated')
assert(getAdditionalOrUnclassifiedPlayerSkills(player).map((s) => getSkillDisplayLabel(s, 'it')).some((s) => /tiro di prima/i.test(s)), 'additional skills separated')
assert(getPlayerComAiPlaystyles(player).length >= 1, 'COM/AI playstyles exposed separately')

assert(resolvePlayingStyleDbName('Box-to-Box') === 'Box-to-Box', 'Box-to-Box exact DB name')
assert(resolvePlayingStyleDbName('orchestrator') === 'Tra le linee', 'orchestrator maps to Tra le linee')
assert(resolvePlayingStyleDbName('front line pressure') === 'Pressione in attacco', 'v6 defensive style')
const split = getPlayerSplitPlayingStyles({
  role: 'Opportunista',
  metadata: { attacking_playing_style: 'Opportunista', defensive_playing_style: 'Pressione in attacco' }
})
assert(split.attacking && split.defending && split.attacking !== split.defending, 'split attacking/defensive styles')

const selectable = getSelectableInstructions('attacco_1')
assert(!selectable.some((i) => i.id === 'offensivo'), 'new saves cannot pick Attacking')
const legacyShown = getSelectableInstructions('attacco_1', 'offensivo')
assert(legacyShown.some((i) => i.id === 'offensivo' && i.legacy), 'legacy Attacking shown only if already set')
const rejected = validateIndividualInstruction('attacco_1', 'p1', 'offensivo', [{ id: 'p1', position: 'CC' }])
assert(rejected.valid === false && rejected.legacy === true, 'Attacking rejected for new saves')

const linkUps = collectCoachLinkUps({
  connection: { name: 'Tiki-Taka', focal_point: { playing_style: 'Regista', position: 'CC' } },
  connections: [{ name: 'Quick Link', key_man: { playing_style: 'Opportunista', position: 'P' } }]
})
assert(linkUps.length === 2, 'two Link-up Plays collected from saved data')
assert(/Tiki-Taka/.test(formatCoachLinkUpsForPrompt({ connection: linkUps[0], connections: linkUps })), 'link-up prompt cites names')

GAME_FACTS.forEach((fact) => {
  assert(fact.status === 'confirmed', `fact ${fact.id} is confirmed`)
})

const roster = ['Maldini', 'Nesta', 'Rijkaard']
const ctas = refineCoachSuggestions([
  'Quale modulo mi consigli?',
  'Fammi capire quando Maldini deve uscire in marcatura',
  'Fammi capire quando Maldini deve uscire in marcatura',
  'Prova Mbappe in punta',
  'Incrocia questo con i titolari attuali',
  'Dimmi chi deve accompagnare Maldini in copertura',
  'Dammi un esercizio semplice per allenare questa uscita',
  'tier list dei moduli'
], { lang: 'it', rosterNames: roster, fallback: defaultCoachFallbacks('it') })
assert(ctas.length <= 3, 'max 3 CTAs')
assert(ctas.length >= 2, 'at least 2 CTAs when useful')
assert(!ctas.some((s) => /quale modulo|tier list|Mbappe|incrocia/i.test(s)), 'forbidden, internal and unknown-player CTAs dropped')
assert(ctas.some((s) => /capire/i.test(s)), 'CTA offers a tactical understanding path')
assert(ctas.some((s) => /chi deve|applicar/i.test(s)), 'CTA offers a concrete application path')
assert(ctas.some((s) => /esercizio|allenar/i.test(s)), 'CTA offers a training path')
assert(mentionsUnknownPlayer('Prova Mbappe in punta', roster), 'unknown player detected in CTA')
assert(!mentionsUnknownPlayer('Fammi capire la marcatura per Maldini', roster), 'roster player allowed in CTA')

const fallbackCtas = defaultCoachFallbacks('it')
assert(!fallbackCtas.some((s) => /incrocia|approfondisci|correzione principale/i.test(s)), 'fallback CTAs avoid internal or vague wording')
assert(fallbackCtas.some((s) => /Spiegami/i.test(s)) && fallbackCtas.some((s) => /Mostrami/i.test(s)) && fallbackCtas.some((s) => /Dammi/i.test(s)), 'fallback CTAs guide understand/apply/train')

const history = buildTacticalHistory([
  { role: 'user', content: 'feedback perso', kind: 'workflow_feedback', workflowType: 'feedback' },
  { role: 'hero', content: 'ok match', kind: 'workflow_feedback', payload: { workflowType: 'feedback' } },
  { role: 'user', content: 'come schiero Rijkaard?' },
  { role: 'hero', content: 'Ancoraggio su Rijkaard.' }
], 10)
assert(history.length === 2, 'feedback transcripts excluded from tactical history')
assert(history[0].content.includes('Rijkaard'), 'tactical turns kept')
assert(isExcludedFromTacticalHistory({ kind: 'workflow_feedback' }), 'feedback kind excluded')

const ordered = orderNewestFirstThenChronological([
  { id: 1, created_at: '2026-09-01T10:00:00Z' },
  { id: 2, created_at: '2026-09-15T10:00:00Z' },
  { id: 3, created_at: '2026-09-10T10:00:00Z' }
], 2)
assert(ordered.map((r) => r.id).join(',') === '3,2', 'newest window then chronological')

const feedbackBlock = formatTacticalFeedbackForPrompt([
  {
    created_at: '2026-09-14T20:00:00Z',
    opponent_name: 'Alex',
    outcome: 'sconfitta',
    formation_played: '4-2-3-1',
    style_played: 'Possesso palla',
    conversation_summary: 'Ho sofferto tra le linee',
    insights: [{ issue: 'CC scoperti' }]
  }
], 'it')
assert(/FEEDBACK TATTICO RECENTE/.test(feedbackBlock), 'feedback injected even without diagnostic cache')
assert(/Alex/.test(feedbackBlock) && /CC scoperti/.test(feedbackBlock), 'feedback has provenance')

const policiesFull = getCoachPoliciesText('it') + '\n' + getCoachSharedCoreText('it')
assert(/non a essere recitati|non a essere RECITATI/i.test(policiesFull), 'verbalization rule: data is for deciding not reciting')
assert(/SIGNIFICATO TATTICO/i.test(policiesFull), 'verbalization rule: tactical meaning')
assert(/EVIDENZA -> SIGNIFICATO -> DECISIONE -> SPIEGAZIONE -> TEST/i.test(policiesFull), 'verbalization internal model present')
const negExampleStripped = policiesFull
  .replace(/ESEMPIO DA NON SEGUIRE:[\s\S]*?ESEMPIO DA SEGUIRE:/i, '')
  .replace(/NO "Davids \(Passaggio di prima\)"/i, '')
assert(!/Rijkaard \(Passaggio/.test(negExampleStripped), 'no parenthesized skill labels in positive examples')
assert(/perché può far circolare la palla rapidamente/i.test(policiesFull), 'verbalization positive example present')

// --- Ciclo 2: metadata skills, link-up array, RAG routing, fluid helpers, stale strip ---
const fromMeta = {
  skills: ['Passaggio filtrante', 'Tiro di prima', 'mazing run'],
  metadata: {
    native_skills: ['Passaggio filtrante'],
    additional_skills: ['Tiro di prima']
  },
  com_skills: ['mazing run']
}
assert(getNativePlayerSkills(fromMeta).some((s) => /filtrante/i.test(getSkillDisplayLabel(s, 'it'))), 'native skills from metadata jsonb')
assert(getAdditionalOrUnclassifiedPlayerSkills(fromMeta).some((s) => /tiro di prima/i.test(getSkillDisplayLabel(s, 'it'))), 'additional skills from metadata jsonb')
assert(getAdditionalOrUnclassifiedPlayerSkills(fromMeta).length <= 5, 'max 5 additional respected')

const arrayLinkUps = collectCoachLinkUps({
  connection: [
    { name: 'Link A', focal_point: { playing_style: 'Collante', position: 'MED' } },
    { name: 'Link B', key_man: { playing_style: 'Opportunista', position: 'P' } }
  ]
})
assert(arrayLinkUps.length === 2, 'link-ups from connection jsonb array (no connection_2)')
assert(!/connection_2/.test(String(collectCoachLinkUps)), 'collectCoachLinkUps helper available')

const { getRelevantSections, getRelevantSectionsForContext } = await import('../lib/ragHelper.js')
const lineaBassaSections = getRelevantSections('perché non posso più usare linea bassa?', 8000)
assert(/ISTRUZIONI INDIVIDUALI/i.test(lineaBassaSections), 'linea bassa routes to §5 individual instructions')
assert(/rimoss|non consigli|v6\.0\.0/i.test(lineaBassaSections), 'linea bassa section explains removal')
const analyzeBundle = getRelevantSectionsForContext('analyze-match', 20000)
assert(/PROVENIENZA CATALOGO/i.test(analyzeBundle), '§11 provenance in analyze-match bundle')
const counterBundle = getRelevantSectionsForContext('countermeasures', 22000)
assert(/PROVENIENZA CATALOGO/i.test(counterBundle), '§11 provenance in countermeasures bundle')

const { buildFluidFormationState, formatHeroFluidContext } = await import('../lib/efootballV6TacticalModel.js')
const fluidOn = buildFluidFormationState(
  { formation: '4-3-3', slot_positions: Object.fromEntries([...Array(11)].map((_, i) => [i, { x: 10, y: 10, position: 'CC' }])) },
  [
    { phase: 'attack', formation: '3-4-3', is_active: true, slot_positions: Object.fromEntries([...Array(11)].map((_, i) => [i, { x: 20, y: 20, position: 'CC' }])) },
    { phase: 'defense', formation: '5-2-3', is_active: true, slot_positions: Object.fromEntries([...Array(11)].map((_, i) => [i, { x: 30, y: 30, position: 'CC' }])) }
  ]
)
assert(fluidOn.enabled === true, 'fluid formation enabled when both phases active')
const fluidText = formatHeroFluidContext({ fluid: fluidOn, starters: [], lang: 'it' })
assert(/ATTIVA|ON/i.test(fluidText) && /3-4-3/.test(fluidText) && /5-2-3/.test(fluidText), 'Hero fluid context cites attack/defense')

const { stripStaleDiagnosticSections } = await import('../lib/diagnosticCacheSanitize.js')
const stripped = stripStaleDiagnosticSections(
  `Profilo: Test\nInformazioni per l'IA: lag\nFORMAZIONE FLUIDA\nATTIVA\nbase 4-3-3\nTattica: stile squadra Possesso.\nRosa: ok`,
  { stripAiInfo: true }
)
assert(!/Informazioni per l'IA/i.test(stripped), 'stale AI info stripped when PROFILE live')
assert(!/FORMAZIONE FLUIDA/i.test(stripped), 'stale fluid block stripped for live overlay')
assert(!/^Tattica:/m.test(stripped), 'stale tactics line stripped')

assert(/STILI SQUADRA \(solo questi 6\)|TEAM PLAYSTYLES \(only these 6\)/i.test(getTruthLayerPromptBlock('en') + getTruthLayerPromptBlock('it')), 'truth layer is single source for 6 styles list')

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll eFootball truth layer checks passed')
