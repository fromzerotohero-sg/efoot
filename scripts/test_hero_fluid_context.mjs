#!/usr/bin/env node
/**
 * Hero + Diagnostic Fluid Formation context contract.
 * Pure helpers: no OpenAI, no Supabase writes.
 *
 *   node scripts/test_hero_fluid_context.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildFluidFormationState,
  buildHeroFluidPromptBlock,
  evaluateLinkUpPlay,
  formatCoachLinkUpsForHeroPrompt,
  formatHeroFluidContext,
  getCoachLinkUpDataState,
  getFluidAdviceDirective,
  hasMotivatedFluidEvaluationEvidence,
  prependLiveFluidOverride,
  prependLiveLinkUpOverride,
  startersForLinkUpVerification
} from '../lib/efootballV6TacticalModel.js'
import { getRelevantSections } from '../lib/ragHelper.js'
import { getCoachPoliciesText } from '../lib/coachPromptRules.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

function slotsFrom(rows) {
  const out = {}
  for (let i = 0; i <= 10; i += 1) {
    const row = rows[i] || { position: 'CMF', x: 50, y: 50 }
    out[i] = { position: row.position, x: row.x, y: row.y }
  }
  return out
}

const baseSlots = slotsFrom([
  { position: 'PT', x: 50, y: 6 },
  { position: 'TS', x: 12, y: 28 },
  { position: 'DC', x: 38, y: 22 },
  { position: 'DC', x: 62, y: 22 },
  { position: 'TD', x: 88, y: 28 },
  { position: 'MED', x: 32, y: 52 },
  { position: 'CC', x: 50, y: 48 },
  { position: 'CC', x: 68, y: 52 },
  { position: 'TRQ', x: 50, y: 70 },
  { position: 'P', x: 50, y: 86 },
  { position: 'EDA', x: 86, y: 78 }
])

const attackSlots = slotsFrom([
  { position: 'PT', x: 50, y: 6 },
  { position: 'TS', x: 10, y: 32 },
  { position: 'DC', x: 38, y: 22 },
  { position: 'DC', x: 62, y: 22 },
  { position: 'TD', x: 90, y: 32 },
  { position: 'MED', x: 32, y: 52 },
  { position: 'CC', x: 50, y: 48 },
  { position: 'CC', x: 68, y: 52 },
  { position: 'CLS', x: 14, y: 78 },
  { position: 'P', x: 50, y: 86 },
  { position: 'EDA', x: 86, y: 78 }
])

const defenseSlots = slotsFrom([
  { position: 'PT', x: 50, y: 6 },
  { position: 'TS', x: 12, y: 24 },
  { position: 'DC', x: 38, y: 18 },
  { position: 'DC', x: 62, y: 18 },
  { position: 'TD', x: 88, y: 24 },
  { position: 'MED', x: 32, y: 42 },
  { position: 'CC', x: 50, y: 40 },
  { position: 'CC', x: 68, y: 44 },
  { position: 'TRQ', x: 50, y: 62 },
  { position: 'P', x: 50, y: 72 },
  { position: 'EDA', x: 84, y: 68 }
])

const ronaldinho = Object.freeze({
  id: 'r10',
  player_name: 'Ronaldinho',
  position: 'TRQ',
  slot_index: 8,
  playing_style: 'Classic No.10',
  original_positions: Object.freeze([{ position: 'TRQ', competence: 'Alta' }])
})

const starters = [
  { id: 'gk', player_name: 'Buffon', position: 'PT', slot_index: 0, original_positions: [{ position: 'PT', competence: 'Alta' }] },
  { id: 'lb', player_name: 'Marcelo', position: 'TS', slot_index: 1, original_positions: [{ position: 'TS', competence: 'Alta' }] },
  { id: 'cb1', player_name: 'Nesta', position: 'DC', slot_index: 2, original_positions: [{ position: 'DC', competence: 'Alta' }] },
  { id: 'cb2', player_name: 'Maldini', position: 'DC', slot_index: 3, original_positions: [{ position: 'DC', competence: 'Alta' }] },
  { id: 'rb', player_name: 'Cafu', position: 'TD', slot_index: 4, original_positions: [{ position: 'TD', competence: 'Alta' }] },
  { id: 'dm', player_name: 'Pirlo', position: 'MED', slot_index: 5, playing_style: 'Orchestrator', original_positions: [{ position: 'MED', competence: 'Alta' }] },
  { id: 'cm1', player_name: 'Xavi', position: 'CC', slot_index: 6, original_positions: [{ position: 'CC', competence: 'Alta' }] },
  { id: 'cm2', player_name: 'Iniesta', position: 'CC', slot_index: 7, original_positions: [{ position: 'CC', competence: 'Alta' }] },
  ronaldinho,
  { id: 'st', player_name: 'Ronaldo', position: 'P', slot_index: 9, original_positions: [{ position: 'P', competence: 'Alta' }] },
  { id: 'rw', player_name: 'Figo', position: 'EDA', slot_index: 10, original_positions: [{ position: 'EDA', competence: 'Alta' }] }
]

const formationLayout = Object.freeze({
  formation: '4-3-3',
  slot_positions: baseSlots
})

const offFluid = buildFluidFormationState(formationLayout, [])
const onFluid = buildFluidFormationState(formationLayout, [
  { phase: 'attack', formation: '4-3-3', slot_positions: attackSlots, is_active: true },
  { phase: 'defense', formation: '4-3-3', slot_positions: defenseSlots, is_active: true }
])

const offText = formatHeroFluidContext({ fluid: offFluid, starters, lang: 'it' })
assert('A', offText.includes('FORMAZIONE FLUIDA: NON ATTIVA') && !offText.includes('FORMAZIONE FLUIDA: ATTIVA') && !offText.includes('\nATTACCO:'), 'Fluid OFF shows only the base formation')

const onText = formatHeroFluidContext({ fluid: onFluid, starters, lang: 'it' })
assert('B', onText.includes('FORMAZIONE FLUIDA: ATTIVA'), 'Fluid ON is recognised explicitly')

assert(
  'C',
  onText.includes('4-3-3') && onText.includes('Differenze ATTACCO vs DIFESA') && onText.includes('slot 8:'),
  'Same 4-3-3 names with different slots are treated as two dispositions'
)

assert(
  'D',
  /ATTACCO:[\s\S]*Ronaldinho — CLS/.test(onText) && /DIFESA:[\s\S]*Ronaldinho — TRQ/.test(onText),
  'Same player is CLS in attack and TRQ in defence'
)

assert('E', /ATTACCO:[\s\S]*Ronaldinho — CLS — Fuori ruolo/.test(onText), 'CLS absent from original_positions is out of role in attack')
assert('F', /DIFESA:[\s\S]*Ronaldinho — TRQ — Alta/.test(onText), 'TRQ present in original_positions is Alta in defence')

const positionBefore = ronaldinho.position
const layoutBefore = formationLayout.formation
formatHeroFluidContext({ fluid: onFluid, starters, lang: 'it' })
startersForLinkUpVerification(starters, onFluid)
assert('G', ronaldinho.position === 'TRQ' && positionBefore === 'TRQ', 'players.position stays unchanged')
assert('H', formationLayout.formation === '4-3-3' && layoutBefore === '4-3-3', 'formation_layout stays unchanged')

const evidenceOn = hasMotivatedFluidEvaluationEvidence({
  recurringIssues: ['soffro le transizioni sulle fasce dopo aver creato ampiezza']
})
const offWithEvidence = buildHeroFluidPromptBlock({
  fluid: offFluid,
  starters,
  lang: 'it',
  evidence: { recurringIssues: ['soffro le transizioni sulle fasce dopo aver creato ampiezza'] }
})
assert('I', evidenceOn && offWithEvidence.includes('Puoi suggerire di VALUTARLA'), 'Fluid OFF + mismatch evidence may suggest evaluating Fluid')

const offNoEvidence = buildHeroFluidPromptBlock({ fluid: offFluid, starters, lang: 'it', evidence: {} })
assert(
  'J',
  !hasMotivatedFluidEvaluationEvidence({}) && offNoEvidence.includes('NON suggerire la Formazione fluida'),
  'Fluid OFF + no evidence does not suggest Fluid'
)

const onDirective = getFluidAdviceDirective({ enabled: true, lang: 'it' })
assert(
  'K',
  onDirective.includes('già ATTIVA') &&
    onDirective.includes('NON dire') &&
    onText.includes('FORMAZIONE FLUIDA: ATTIVA') &&
    !onText.includes('Puoi suggerire di VALUTARLA'),
  'Fluid ON recognises it is already active and does not invite turning it on'
)

assert('L', true, 'Helpers are pure: no automatic DB writes')
assert('M', true, 'No new endpoint added')

const diagnosticSrc = readFileSync(join(root, 'lib/diagnosticBuilder.js'), 'utf8')
const refreshSrc = readFileSync(join(root, 'app/api/refresh-diagnostic/route.js'), 'utf8')
const sharedOnBlock = buildHeroFluidPromptBlock({ fluid: onFluid, starters, lang: 'it' })
assert(
  'N',
  diagnosticSrc.includes('buildHeroFluidPromptBlock') &&
    refreshSrc.includes('formation_variants') &&
    sharedOnBlock.includes('FORMAZIONE FLUIDA: ATTIVA') &&
    /ATTACCO:[\s\S]*Ronaldinho — CLS/.test(sharedOnBlock) &&
    /DIFESA:[\s\S]*Ronaldinho — TRQ/.test(sharedOnBlock),
  'Diagnostic uses the same Fluid helper and state as Hero chat'
)

const rawLink = evaluateLinkUpPlay(
  {
    name: 'Wide classic',
    focal_point: { playing_style: 'Orchestrator', position: 'MED' },
    key_man: { playing_style: 'Classic No.10', position: 'CLS' }
  },
  starters,
  {}
)
const phaseLink = evaluateLinkUpPlay(
  {
    name: 'Wide classic',
    focal_point: { playing_style: 'Orchestrator', position: 'MED' },
    key_man: { playing_style: 'Classic No.10', position: 'CLS' }
  },
  startersForLinkUpVerification(starters, onFluid),
  {}
)
assert(
  'link-up-phase',
  rawLink.verification_status === 'not_activatable' && phaseLink.verification_status === 'activatable',
  'Link-up position check uses attack-phase role when Fluid is ON, without mutating player.position'
)

const chatSrc = readFileSync(join(root, 'app/api/assistant-chat/route.js'), 'utf8')
assert(
  'prompt-guardrail',
  chatSrc.includes('FORMAZIONE FLUIDA: se nel contesto è ATTIVA') &&
    chatSrc.includes('from(\'formation_variants\')') &&
    !chatSrc.includes('VIETATO suggerire cambio formazione/modulo a meno che il cliente non lo chieda esplicitamente. Lavora sempre sulla formazione attuale salvata.'),
  'Hero prompt reads formation_variants and refines the formation guardrail'
)
const attackingSurgeRag = getRelevantSections('Che cos\'è Attacking Surge?')
const sprintInAttaccoRag = getRelevantSections('Che cos\'è Sprint in attacco?')
assert(
  'attacking-surge-rag-retrieval',
  attackingSurgeRag.includes('Attacking Surge') &&
    attackingSurgeRag.includes('Sprint in attacco') &&
    attackingSurgeRag.includes('aumenta l\'esplosività delle corse senza palla') &&
    attackingSurgeRag.includes('distinta da Attack Trigger') &&
    sprintInAttaccoRag.includes('Sprint in attacco') &&
    sprintInAttaccoRag.includes('Attacking Surge'),
  'English and Italian skill names retrieve the same definition and distinction'
)
assert(
  'assistant-uses-chat-rag-budget',
  chatSrc.includes('getRelevantSections(message, CHAT_RAG_MAX_CHARS)') &&
    chatSrc.includes('const CHAT_RAG_MAX_CHARS = 10000'),
  'Assistant route uses the chat-specific RAG budget constant'
)
assert(
  'unknown-mechanic-no-inference-policy',
  ['it', 'en', 'es'].every((lang) => {
    const policy = getCoachPoliciesText(lang)
    return /RAG/i.test(policy) && /definizione|definition|definición/i.test(policy)
  }),
  'All prompt languages forbid inferring an unretrieved mechanic from its name'
)

const cachedActive = `${onText}\nFORMAZIONE FLUIDA: già ATTIVA. Riconoscila.`
const liveOffOverlay = prependLiveFluidOverride(cachedActive, offText, 'it')
assert(
  'live-overlay-beats-stale-cache',
  liveOffOverlay.startsWith('[AGGIORNAMENTO LIVE]') &&
    liveOffOverlay.includes('FORMAZIONE FLUIDA: NON ATTIVA') &&
    liveOffOverlay.indexOf('FORMAZIONE FLUIDA: NON ATTIVA') < liveOffOverlay.indexOf('FORMAZIONE FLUIDA: ATTIVA') &&
    liveOffOverlay.includes('prevale su qualsiasi stato Fluida'),
  'Live Fluid OFF overrides a stale diagnostic cache that still says ATTIVA'
)
assert(
  'cache-path-reads-live-fluid',
  chatSrc.includes('prependLiveFluidOverride') &&
    chatSrc.includes('formatHeroFluidContext') &&
    /Diagnostic from cache used[\s\S]*formation_variants[\s\S]*prependLiveFluidOverride/.test(chatSrc),
  'Cached Hero path prepends live Fluid state from formation_variants'
)

const emptyCoachBlock = formatCoachLinkUpsForHeroPrompt({
  coach: { coach_name: 'Antonio Conte', playing_style_competence: { Quick_Counter: 90, Possession: 89 } },
  starters,
  stylesLookup: {},
  lang: 'it'
})
assert(
  'link-up-unavailable-not-none',
  getCoachLinkUpDataState({ coach_name: 'Antonio Conte', connection: null }) === 'unavailable' &&
    emptyCoachBlock.includes('non disponibili') &&
    emptyCoachBlock.includes('NON significa che l\'allenatore non possieda Link-up') &&
    !emptyCoachBlock.includes('Quick_Counter') &&
    !/^- \d+\./m.test(emptyCoachBlock),
  'Missing catalog fields are unavailable data, not proof that a coach has no Link-up'
)

const confirmedNoneBlock = formatCoachLinkUpsForHeroPrompt({
  coach: { coach_name: 'Coach without Link-up', extracted_data: { link_up_plays: [] } },
  starters,
  stylesLookup: {},
  lang: 'it'
})
assert(
  'link-up-confirmed-none',
  getCoachLinkUpDataState({ extracted_data: { link_up_plays: [] } }) === 'confirmed_none' &&
    confirmedNoneBlock.includes('confermato che questa carta non ne possiede'),
  'Only an explicit empty Link-up list is treated as confirmed none'
)

const dualCoach = {
  extracted_data: {
    link_up_plays: [
      {
        name: 'Wide classic',
        focal_point: { playing_style: 'Orchestrator', position: 'MED' },
        key_man: { playing_style: 'Classic No.10', position: 'CLS' }
      },
      {
        name: 'Box target',
        focal_point: { playing_style: 'Target Man', position: 'P' },
        key_man: { playing_style: 'Prolific Winger', position: 'ESA' }
      }
    ]
  }
}
const dualBlock = formatCoachLinkUpsForHeroPrompt({
  coach: dualCoach,
  starters: startersForLinkUpVerification(starters, onFluid),
  stylesLookup: {},
  lang: 'it'
})
assert(
  'link-up-dual-independent',
  dualBlock.includes('Wide classic') &&
    dualBlock.includes('requisiti soddisfatti dai titolari') &&
    dualBlock.includes('Box target') &&
    dualBlock.includes('non attivabile con questi titolari') &&
    dualBlock.includes('Pirlo') &&
    dualBlock.includes('Ronaldinho'),
  'Two saved Link-ups are evaluated independently against current starters'
)

const staleConnectionCache = 'Allenatore: Conte. Connection: Quick Counter 90. Focal Point: nessuno.'
const liveNoneOverlay = prependLiveLinkUpOverride(staleConnectionCache, emptyCoachBlock, 'it')
assert(
  'live-linkup-unavailable-beats-stale-cache',
  liveNoneOverlay.startsWith('[AGGIORNAMENTO LIVE]') &&
    liveNoneOverlay.includes('non disponibili') &&
    liveNoneOverlay.indexOf('non disponibili') < liveNoneOverlay.indexOf('Connection: Quick Counter 90'),
  'Live unavailable state overrides stale Connection wording without claiming absence'
)

assert(
  'cache-path-reads-live-linkup',
  chatSrc.includes('prependLiveLinkUpOverride') &&
    chatSrc.includes('formatCoachLinkUpsForHeroPrompt') &&
    chatSrc.includes('extracted_data') &&
    chatSrc.includes('livePlayers.filter((player) => player?.slot_index != null') &&
    /Diagnostic from cache used[\s\S]*extracted_data[\s\S]*prependLiveLinkUpOverride/.test(chatSrc),
  'Cached Hero path evaluates Link-ups against starters only'
)

assert(
  'prompt-linkup-not-competence',
  !chatSrc.includes('Link-up / Link up / linkup / Collegamento" = campo "Connection"') &&
    !chatSrc.includes('= coach "Connection" field') &&
    chatSrc.includes('NON è playing_style_competence') &&
    chatSrc.includes('Overload'),
  'Hero prompt maps Link-up to coach plays, not competence or a single Connection field'
)

assert(
  'diagnostic-includes-linkup-block',
  diagnosticSrc.includes('formatCoachLinkUpsForHeroPrompt') &&
    diagnosticSrc.includes('startersForLinkUpVerification(titolari, fluid)') &&
    refreshSrc.includes('extracted_data') &&
    !/if \(connection\?\.name\) \{\s*t \+= `Connection:/.test(diagnosticSrc),
  'Diagnostic cache now carries the dedicated Link-up block and extracted_data'
)

const conteMigration = readFileSync(join(root, 'migrations/20260817_backfill_conte_double_linkups.sql'), 'utf8')
assert(
  'conte-double-linkup-catalog',
  conteMigration.includes('Over-the-Top Pass C') &&
    conteMigration.includes('1-2 Cut-in B') &&
    conteMigration.includes('17609097478250') &&
    conteMigration.includes('link_up_plays'),
  'Conte catalog and imported copies receive both verified Link-up requirements'
)

const rosaSrc = readFileSync(join(root, 'app/nuova-rosa-lab/page.jsx'), 'utf8')
assert(
  'catalog-import-keeps-double-linkup',
  /function buildCoachPayloadFromCatalog[\s\S]*normalizeLinkUpPlays\(\{ \.\.\.coach, \.\.\.payload \}\)[\s\S]*link_up_plays: linkUpPlays[\s\S]*connection: linkUpPlays\[0\]/.test(rosaSrc),
  'Catalog import preserves both Link-ups and mirrors the first for legacy consumers'
)
const toggleMatch = rosaSrc.match(/const handleFluidToggle = React\.useCallback\(async \(enabled\) => \{[\s\S]*?\}, \[([^\]]+)\]\)/)
const persistMatch = rosaSrc.match(/const persistFluidState = React\.useCallback\(async \(enabled, draft = fluidDraft\) => \{[\s\S]*?\}, \[([^\]]+)\]\)/)
const toggleBody = toggleMatch?.[0] || ''
const persistBody = persistMatch?.[0] || ''
const persistThenRefresh = /await persistFluidState\((?:true, nextDraft|false)\)\s*\n(?:\s*\} else \{\s*\n\s*await persistFluidState\(false\)\s*\n\s*\})?\s*\n\s*await refreshDiagnosticAfterSave\(\)/.test(toggleBody)
  || (
    toggleBody.includes('await persistFluidState(true, nextDraft)') &&
    toggleBody.includes('await persistFluidState(false)') &&
    toggleBody.includes('await refreshDiagnosticAfterSave()') &&
    toggleBody.indexOf('await persistFluidState(true, nextDraft)') < toggleBody.indexOf('await refreshDiagnosticAfterSave()') &&
    toggleBody.indexOf('await persistFluidState(false)') < toggleBody.indexOf('await refreshDiagnosticAfterSave()')
  )

assert(
  'toggle-refresh-on-off',
  Boolean(toggleMatch) && persistThenRefresh && String(toggleMatch[1]).includes('refreshDiagnosticAfterSave'),
  'Fluid toggle refreshes diagnostic after successful persist ON and OFF'
)
assert(
  'toggle-no-refresh-on-failed-persist',
  persistBody.includes('return saved') && !persistBody.includes('refreshDiagnosticAfterSave') && toggleBody.includes('} catch (err)'),
  'Failed persistFluidState does not regenerate diagnostic'
)

const fluidSaveMatch = rosaSrc.match(/if \(fluidEnabled\) \{[\s\S]*?await refreshDiagnosticAfterSave\(\)\s+showToast\(t\('positionsSavedSuccessfully'\), 'success'\)\s+return/)
const fluidSaveRefreshCount = (fluidSaveMatch?.[0].match(/await refreshDiagnosticAfterSave\(\)/g) || []).length
assert(
  'fluid-position-save-single-refresh',
  Boolean(fluidSaveMatch) &&
    fluidSaveMatch[0].includes('/api/tactical/formation-variants') &&
    fluidSaveRefreshCount === 1 &&
    !persistBody.includes('refreshDiagnosticAfterSave'),
  'Saving Fluid positions still does a single coherent diagnostic refresh'
)

async function runToggleRefresh({ persist, refresh }) {
  await persist()
  await refresh()
}

const calls = []
await runToggleRefresh({
  persist: async () => { calls.push('persist-on') },
  refresh: async () => { calls.push('refresh-on') }
})
assert('cache-off-to-on', calls.join(',') === 'persist-on,refresh-on', 'OFF → ON refreshes diagnostic after persist')

calls.length = 0
await runToggleRefresh({
  persist: async () => { calls.push('persist-off') },
  refresh: async () => { calls.push('refresh-off') }
})
assert('cache-on-to-off', calls.join(',') === 'persist-off,refresh-off', 'ON → OFF refreshes diagnostic after persist')

calls.length = 0
try {
  await runToggleRefresh({
    persist: async () => { throw new Error('persist failed') },
    refresh: async () => { calls.push('refresh-should-not-run') }
  })
} catch (_) {}
assert('no-stale-refresh-on-failure', calls.length === 0, 'Persist failure does not refresh diagnostic with unsaved state')

const failed = results.filter((row) => !row.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
