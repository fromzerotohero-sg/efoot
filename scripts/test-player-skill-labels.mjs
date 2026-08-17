/**
 * Verifica regressioni sulle traduzioni/canonicalizzazioni skill.
 * node scripts/test-player-skill-labels.mjs
 */
import {
  canonicalSkillStorageName,
  getSkillDisplayLabel,
  isFixedInnateCardSkill,
  isKnownPlayerSkill,
  localizeSkillTermsInText
} from '../lib/playerSkillLabels.js'
import {
  buildSkillMechanicsContext,
  getPlayerSkillSemantic,
  hasSkillSemantic
} from '../lib/playerSkillSemantics.js'

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected "${expected}", got "${actual}"`)
    process.exit(1)
  }
}

assertEqual(canonicalSkillStorageName('Long Range Shooting'), 'Long-Range Shooting', 'Long Range Shooting canonical')
assertEqual(getSkillDisplayLabel('Long-Range Shooting', 'it'), 'Tiro dalla distanza', 'Long-Range Shooting IT')

assertEqual(canonicalSkillStorageName('Lancio lungo'), 'Long Lofted Pass', 'Lancio lungo canonical')
assertEqual(getSkillDisplayLabel('Lancio lungo', 'it'), 'Lancio lungo preciso', 'Lancio lungo IT')

assertEqual(canonicalSkillStorageName('Long Ranger'), 'Long Ranger', 'Long Ranger canonical')
assertEqual(getSkillDisplayLabel('Long Ranger', 'it'), 'Tiro dalla distanza', 'Long Ranger IT')

const koemanSkills = [
  'Lancio lungo',
  'Tiri a salire',
  'Passaggio calibrato',
  'Marcatore',
  'Intercettazione',
  'Spirito combattivo',
  'Muro',
  'Scivolata',
  'Caposaldo',
  'Long Reach Tackle'
].map((skill) => getSkillDisplayLabel(skill, 'it'))

if (koemanSkills[0] === 'Tiro dalla distanza') {
  console.error('FAIL Koeman: Lancio lungo translated to Tiro dalla distanza')
  process.exit(1)
}

assertEqual(koemanSkills[0], 'Lancio lungo preciso', 'Koeman Lancio lungo')
assertEqual(koemanSkills[1], 'Tiro a salire', 'Koeman Tiri a salire')
assertEqual(koemanSkills[9], 'Tackle in allungo', 'Koeman Long Reach Tackle')

const productionVariants = {
  'Attack Trigger': 'Attivatore d\'attacco',
  'Gk Direct Defending': 'Direzione alla difesa',
  'GK Directing Defence': 'Direzione alla difesa',
  'GK Spirit Roar': 'Portiere galvanizzatore',
  'Phenomenal Pass': 'Passaggi illuminanti',
  'Rising Shots': 'Tiro a salire',
  Willpower: 'Forza di volontà',
  'Gk Penalty Saver': 'Para-rigori'
}

for (const [raw, expectedIt] of Object.entries(productionVariants)) {
  if (!isKnownPlayerSkill(raw)) {
    console.error(`FAIL known skill: "${raw}" is not recognized`)
    process.exit(1)
  }
  assertEqual(getSkillDisplayLabel(raw, 'it'), expectedIt, `production variant ${raw}`)
}

const requiredItalianSkills = [
  'Finta doppio passo',
  'Doppio tocco',
  'Elastico',
  'Veronica',
  'Sombrero',
  'Volta secca',
  'Taglia alle spalle e gira',
  'Rimbalzo interno',
  'Controllo di suola',
  'Dribbling fulmine',
  'Scatto bruciante',
  'Calamita i piedi',
  'Colpo di testa',
  'Incornata',
  'A giro da distante',
  'Tiro a giro spiovente',
  'Pallonetto mirato',
  'Tiro di collo',
  'Tiro a scendere',
  'Tiro a salire',
  'Tiro dalla distanza',
  'Sasata rasu terra',
  'Finalizzazione acrobatica',
  'Colpo di tacco',
  'Tiro di prima',
  'Istinto del gol',
  'Forza di volontà',
  'Passaggio di prima',
  'Passaggio filtrante',
  'Passaggio calibrato',
  'Cross calibrato',
  'Cross spiovente',
  'Esterno a giro',
  'Rabona',
  'No look',
  'Passaggi cruciali',
  'Passaggio calcolato',
  'Passaggi illuminanti',
  'Passaggio a scavalcare',
  'Traiettoria bassa al portiere',
  'Rimessa profonda al portiere',
  'Rimessa laterale e lunga',
  'Rilancio del portiere',
  'Specialista dei rigori',
  'Para rigori',
  'Direzione alla difesa',
  'Portiere galvanizzatore',
  'Astuzia',
  'Marcatori',
  'Tornanti',
  'Intercettazione',
  'Muro',
  'Dominio palle alte',
  'Scivolata',
  'Taker in a lungo',
  'Caposaldo',
  'Disimpegno acrobatico',
  'Difesa aspettante',
  'Pressing alle spalle',
  'Leader',
  'Attivatore d\'attacco',
  'Riserva di lusso',
  'Spirito combattivo'
]

for (const skill of requiredItalianSkills) {
  if (!isKnownPlayerSkill(skill)) {
    console.error(`FAIL required Italian skill: "${skill}" is not recognized`)
    process.exit(1)
  }
  if (!hasSkillSemantic(skill)) {
    console.error(`FAIL required Italian skill: "${skill}" has no semantic definition`)
    process.exit(1)
  }
  const label = getSkillDisplayLabel(skill, 'it')
  if (!label) {
    console.error(`FAIL required Italian skill: "${skill}" has empty IT label`)
    process.exit(1)
  }
}

assertEqual(getSkillDisplayLabel('Sasata rasu terra', 'it'), 'Sassata rasoterra', 'dictation Sassata rasoterra')
assertEqual(getSkillDisplayLabel('Taker in a lungo', 'it'), 'Tackle in allungo', 'dictation Tackle in allungo')
assertEqual(getSkillDisplayLabel('Difesa aspettante', 'it'), 'Difesa svettante', 'dictation Difesa svettante')

for (const fixedSkill of ['Forza di volontà', 'Direzione alla difesa', 'Portiere galvanizzatore']) {
  if (!isFixedInnateCardSkill(fixedSkill)) {
    console.error(`FAIL fixed innate skill: "${fixedSkill}" is not fixed`)
    process.exit(1)
  }
}

const koemanMechanics = buildSkillMechanicsContext(
  ['Rising Shot', 'Long Range Shooting', 'Weighted Pass', 'Man Marking', 'Interception', 'Blocker'],
  { lang: 'it' }
)
const koemanLongShot = koemanMechanics.find((item) => item.skill === 'Tiro dalla distanza')
if (!koemanLongShot || !/non sostituisce punta o ala/i.test(koemanLongShot.caution)) {
  console.error('FAIL Koeman mechanics: Tiro dalla distanza must be limited as extra value, not attack fix')
  process.exit(1)
}

const longPassSemantic = getPlayerSkillSemantic('Lancio lungo')
assertEqual(longPassSemantic?.category, 'passing', 'Lancio lungo semantic category')
assertEqual(longPassSemantic?.display, 'Lancio lungo preciso', 'Lancio lungo semantic display')

if (!isKnownPlayerSkill('Attacking Surge')) {
  console.error('FAIL known skill: "Attacking Surge" is not recognized')
  process.exit(1)
}
assertEqual(getSkillDisplayLabel('Attacking Surge', 'it'), 'Attacking Surge', 'Attacking Surge IT')
assertEqual(getPlayerSkillSemantic('Attacking Surge')?.category, 'special', 'Attacking Surge semantic category')
if (!hasSkillSemantic('Attacking Surge')) {
  console.error('FAIL Attacking Surge has no semantic definition')
  process.exit(1)
}
if (!isFixedInnateCardSkill('Attacking Surge')) {
  console.error('FAIL Attacking Surge must be a fixed innate special skill')
  process.exit(1)
}

assertEqual(
  localizeSkillTermsInText('Long-Range Shooting and Long Range Shooting', 'it'),
  'Tiro dalla distanza and Tiro dalla distanza',
  'localize long-range shooting'
)

console.log('OK: player skill labels')
