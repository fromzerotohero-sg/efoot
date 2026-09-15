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
import { getCoachPoliciesText } from '../lib/coachPromptRules.js'
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
  'Approfondisci la marcatura per Maldini',
  'Approfondisci la marcatura per Maldini',
  'Prova Mbappe in punta',
  'Incrocia questo con i titolari attuali',
  'Prova la correzione principale nella prossima partita',
  'tier list dei moduli'
], { lang: 'it', rosterNames: roster, fallback: defaultCoachFallbacks('it') })
assert(ctas.length <= 3, 'max 3 CTAs')
assert(ctas.length >= 2, 'at least 2 CTAs when useful')
assert(!ctas.some((s) => /quale modulo|tier list|Mbappe/i.test(s)), 'forbidden and unknown-player CTAs dropped')
assert(mentionsUnknownPlayer('Prova Mbappe in punta', roster), 'unknown player detected in CTA')
assert(!mentionsUnknownPlayer('Approfondisci la marcatura per Maldini', roster), 'roster player allowed in CTA')

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

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll eFootball truth layer checks passed')
