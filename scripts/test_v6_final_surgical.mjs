import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillSourcePath = join(root, 'lib/cardAdvisorSkillSuggestions.js')
const skillSource = readFileSync(skillSourcePath, 'utf8')
const executableSkillSource = skillSource
  .replace(
    "import { getNonProgressionReason } from './buildCoachServerUtils.js'",
    'const getNonProgressionReason = () => ({ blocked: false })'
  )
  .replace(
    "import { getTypicalMissingSkillsForPlayer } from './rosterSkillsContext.js'",
    'const getTypicalMissingSkillsForPlayer = () => []'
  )
  .replace(
    "from './playerSkillLabels.js'",
    `from '${pathToFileURL(join(root, 'lib/playerSkillLabels.js')).href}'`
  )
const skillModuleUrl = `data:text/javascript;base64,${Buffer.from(executableSkillSource).toString('base64')}`
const { getAdvisorEquippedSkills } = await import(skillModuleUrl)

const nativeSkills = [
  'Double Touch',
  'Sole Control',
  'Flip Flap',
  'Marseille Turn',
  'Sombrero',
  'Cross Over Turn',
  'Scotch Move',
  'Heading',
  'Long-Range Curler',
  'Long-Range Shooting'
]

const additionalSkills = [
  'First-time Shot',
  'One-touch Pass',
  'Through Passing',
  'Weighted Pass',
  'Pinpoint Crossing',
  'Interception'
]

function equipped(additional = []) {
  return getAdvisorEquippedSkills({
    skills: nativeSkills,
    additional_skills: additional
  })
}

const nativeOnly = equipped()
assert.equal(nativeOnly.programSlotUsed, 0)
assert.equal(nativeOnly.slotsFree, 5)
assert.equal(nativeOnly.catalogOverflow, false)

const fiveAdditional = equipped(additionalSkills.slice(0, 5))
assert.equal(fiveAdditional.programSlotUsed, 5)
assert.equal(fiveAdditional.slotsFree, 0)
assert.equal(fiveAdditional.catalogOverflow, false)

const sixAdditional = equipped(additionalSkills)
assert.equal(sixAdditional.programSlotUsed, 6)
assert.equal(sixAdditional.slotsFree, 0)
assert.equal(sixAdditional.catalogOverflow, true)

for (const fixedSkill of ['Attacking Surge', 'Willpower', 'GK Spirit Roar']) {
  const result = equipped([fixedSkill])
  assert.equal(result.programSlotUsed, 0, `${fixedSkill} must not consume an Additional Skill slot`)
  assert.equal(result.slotsFree, 5)
  assert.equal(result.catalogOverflow, false)
}

assert.match(skillSource, /const MAX_ADDITIONAL_SKILL_SLOTS = 5/)
assert.doesNotMatch(skillSource, /MAX_SKILL_SLOTS/)
assert.match(skillSource, /programSlotUsed > MAX_ADDITIONAL_SKILL_SLOTS/)

const rag = readFileSync(join(root, 'info_rag.md'), 'utf8')
assert.match(rag, /Skill Training consente di aggiungere fino a 5 Additional Skills\./)
assert.doesNotMatch(rag, /6 abilità totali \(native \+ aggiunte\)/)

const python = [
  'import json',
  'from scripts.import_efhub_coach_catalog import make_record, normalize_playstyles',
  'with_overload = make_record({"id": 1, "name": "Fixture", "skills": {"OverLoad": 69}, "boosts": []}, "2026-08-17T00:00:00Z")',
  'without_overload = make_record({"id": 2, "name": "Fixture", "skills": {}, "boosts": []}, "2026-08-17T00:00:00Z")',
  'print(json.dumps({',
  '  "with_overload": with_overload["playing_style_competence"],',
  '  "payload_with_overload": with_overload["coach_payload"]["playing_style_competence"],',
  '  "without_overload": without_overload["playing_style_competence"],',
  '  "existing": normalize_playstyles({"OverLoad": 69}, {"pressing_totale": 70}),',
  '  "invalid": normalize_playstyles({"OverLoad": "not-a-number"}),',
  '}))'
].join('\n')

const pythonRun = spawnSync('python', ['-c', python], {
  cwd: root,
  encoding: 'utf8'
})
assert.equal(pythonRun.status, 0, pythonRun.stderr)
const managerFixtures = JSON.parse(pythonRun.stdout)
assert.deepEqual(managerFixtures.with_overload, { pressing_totale: 69 })
assert.deepEqual(managerFixtures.payload_with_overload, { pressing_totale: 69 })
assert.equal(Object.hasOwn(managerFixtures.without_overload, 'pressing_totale'), false)
assert.deepEqual(managerFixtures.existing, { pressing_totale: 70 })
assert.equal(Object.hasOwn(managerFixtures.invalid, 'pressing_totale'), false)

console.log('V6 final surgical tests passed')
