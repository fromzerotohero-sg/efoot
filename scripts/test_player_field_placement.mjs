#!/usr/bin/env node
/**
 * Placement vs card competence: client slot is truth; FIT is a trade-off.
 *
 *   node scripts/test_player_field_placement.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  formatDispositionRoles,
  formatStarterPlacementToken,
  getPlacementWarningLines,
  getStarterPhaseRoles
} from '../lib/playerFieldPlacement.js'
import { getCoachPoliciesText } from '../lib/coachPromptRules.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function assert(id, ok, detail) {
  results.push({ id, ok: Boolean(ok), detail: detail || '' })
  if (!ok) console.error(`FAIL ${id}: ${detail}`)
  else console.log(`PASS ${id}: ${detail}`)
}

const scholesCc = {
  player_name: 'Scholes',
  slot_index: 6,
  position: 'CC',
  original_positions: [{ position: 'CC', competence: 'Alta' }]
}

const scholesDc = {
  ...scholesCc,
  position: 'DC'
}

const peleTrq = {
  player_name: 'Pelé',
  slot_index: 8,
  position: 'TRQ',
  original_positions: [{ position: 'P', competence: 'Alta' }]
}

const fluidAttackCcDefenseDc = {
  enabled: true,
  base: { slot_positions: { 6: { position: 'CC' } } },
  attack: { slot_positions: { 6: { position: 'CC' } } },
  defense: { slot_positions: { 6: { position: 'DC' } } }
}

const fluidBothCc = {
  enabled: true,
  base: { slot_positions: { 6: { position: 'CC' } } },
  attack: { slot_positions: { 6: { position: 'CC' } } },
  defense: { slot_positions: { 6: { position: 'CC' } } }
}

assert(
  'scholes-cc-no-warning',
  getPlacementWarningLines([scholesCc], 'it', null).length === 0 &&
    formatStarterPlacementToken(scholesCc, null, 'it') === 'CC',
  'Scholes fielded CC with CC Alta is not treated as an error'
)

const dcWarn = getPlacementWarningLines([scholesDc], 'it', null)
assert(
  'scholes-dc-is-still-dc',
  dcWarn.length === 1 &&
    dcWarn[0].includes('schierato DC') &&
    dcWarn[0].includes('In rosa è DC') &&
    dcWarn[0].includes('suggerimento') &&
    formatStarterPlacementToken(scholesDc, null, 'it') === 'DC',
  'If the client put Scholes at DC, chat must keep DC as current slot and only suggest the card'
)

const peleWarn = getPlacementWarningLines([peleTrq], 'it', null)
assert(
  'pele-trq-is-trq',
  peleWarn.length === 1 &&
    peleWarn[0].includes('schierato TRQ') &&
    peleWarn[0].includes('In rosa è TRQ') &&
    formatStarterPlacementToken(peleTrq, null, 'it') === 'TRQ',
  'Pelé at TRQ stays TRQ; card P is a suggestion'
)

const fluidRoles = getStarterPhaseRoles(scholesCc, fluidAttackCcDefenseDc)
const fluidWarn = getPlacementWarningLines([scholesCc], 'it', fluidAttackCcDefenseDc)
const fluidToken = formatStarterPlacementToken(scholesCc, fluidAttackCcDefenseDc, 'it')
assert(
  'scholes-fluid-attack-cc-defense-dc',
  fluidRoles.attack === 'CC' &&
    fluidRoles.defense === 'DC' &&
    fluidToken === 'attacco CC / difesa DC' &&
    fluidWarn.length === 1 &&
    fluidWarn[0].includes('in attacco CC') &&
    fluidWarn[0].includes('in difesa DC') &&
    fluidWarn[0].includes('NON dire che in questo momento è un difensore'),
  'Fluid: Scholes is CC in attack and DC only in defence; never "he is a defender" now'
)

assert(
  'scholes-fluid-both-cc-no-warning',
  getPlacementWarningLines([scholesCc], 'it', fluidBothCc).length === 0,
  'Fluid with CC in both phases and CC Alta does not warn'
)

assert(
  'empty-originals-skip',
  getPlacementWarningLines([{ ...scholesDc, original_positions: [] }], 'it', null).length === 0,
  'Missing card competences are not treated as out of role'
)

const intermedia = {
  ...scholesCc,
  original_positions: [{ position: 'CC', competence: 'Intermedia' }]
}
assert(
  'intermedia-is-tradeoff',
  getPlacementWarningLines([intermedia], 'it', null).some((line) => line.includes('Intermedia')),
  'Fielded role without Alta competence is underlined'
)

assert(
  'disposition-fluid-splits-phases',
  formatDispositionRoles([scholesCc], fluidAttackCcDefenseDc, 'it') === 'ATTACCO CC. DIFESA DC',
  'Disposition lists attack and defence roles when Fluid is on'
)

const policyIt = getCoachPoliciesText('it')
const policyEn = getCoachPoliciesText('en')
assert(
  'policy-slot-is-truth',
    policyIt.includes('dove SI TROVA') &&
    policyIt.includes('non e "un difensore"') &&
    policyEn.includes('where he IS') &&
    !policyIt.includes('Suggerisci ruolo corretto o aggiustamento') &&
    !policyEn.includes('Suggest the correct role or a safer tactical adjustment'),
  'Coach policy treats client slot as placement truth'
)

const chatSrc = readFileSync(join(root, 'app/api/assistant-chat/route.js'), 'utf8')
const diagnosticSrc = readFileSync(join(root, 'lib/diagnosticBuilder.js'), 'utf8')
assert(
  'no-fix-fit-first-in-hero',
  !chatSrc.includes('correggi FIT prima') &&
    !chatSrc.includes('fix FIT before') &&
    !diagnosticSrc.includes('correggi FIT prima') &&
    !diagnosticSrc.includes('fix FIT before'),
  'Hero/diagnostic no longer tell the model to overwrite the client slot'
)

const failed = results.filter((row) => !row.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
