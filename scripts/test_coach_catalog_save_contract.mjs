import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCoachCatalogResult } from '../lib/coachCatalogNormalization.js'
import { buildCoachStyleDecisionContext } from '../lib/coachStyleDecisionContext.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const connection = {
  name: 'Over-the-Top Pass C',
  focal_point: { position: 'DC', playing_style: 'Build Up' },
  key_man: { position: 'ESA/EDA', playing_style: 'Prolific Winger' }
}

const normalizedConte = normalizeCoachCatalogResult({
  id: 'conte',
  coach_name: 'Antonio Conte',
  playing_style_competence: { contropiede_veloce: 90 },
  metadata: { raw_skills: { OverLoad: 69 } },
  connection,
  coach_payload: {
    playing_style_competence: { contropiede_veloce: 90 },
    connection: null,
    link_up_plays: []
  }
})

assert.equal(normalizedConte.playing_style_competence.pressing_totale, 69)
assert.equal(normalizedConte.coach_payload.playing_style_competence.pressing_totale, 69)
assert.deepEqual(normalizedConte.connection, connection)
assert.deepEqual(normalizedConte.coach_payload.connection, connection)
assert.deepEqual(normalizedConte.coach_payload.link_up_plays, [connection])

const existingNormalized = normalizeCoachCatalogResult({
  playing_style_competence: { pressing_totale: 70 },
  metadata: { raw_skills: { OverLoad: 69 } },
  coach_payload: {}
})
assert.equal(existingNormalized.playing_style_competence.pressing_totale, 70)

const missingOverload = normalizeCoachCatalogResult({
  playing_style_competence: {},
  metadata: { raw_skills: { OverLoad: 'invalid' } },
  coach_payload: {}
})
assert.equal(Object.hasOwn(missingOverload.playing_style_competence, 'pressing_totale'), false)

const searchRoute = readFileSync(join(root, 'app/api/coach-catalog/search/route.js'), 'utf8')
assert.match(searchRoute, /\bconnection,\s*\n\s*catalog_ready,/)
assert.match(searchRoute, /\.map\(normalizeCoachCatalogResult\)/)

const saveRoute = readFileSync(join(root, 'app/api/supabase/save-coach/route.js'), 'utf8')
assert.match(saveRoute, /\.contains\('extracted_data', \{ source_catalog: \{ catalog_id: catalogId \} \}\)/)
assert.match(saveRoute, /\.update\(coachData\)/)
assert.match(saveRoute, /coach_id: existingCoach\.id,\s*\n\s*is_new: false/)

const assistantRoute = readFileSync(join(root, 'app/api/assistant-chat/route.js'), 'utf8')
assert.doesNotMatch(assistantRoute, /Salva il Collegamento dalla scheda allenatore/)
assert.match(assistantRoute, /finché il catalogo non contiene dati Link-up verificati/)
assert.match(assistantRoute, /valuta come candidati solo competenze coach >=70/)
assert.doesNotMatch(assistantRoute, /contrattacco → contropiede_veloce/)

const lampardDecision = buildCoachStyleDecisionContext({
  coach_name: 'Frank Lampard',
  playing_style_competence: {
    contrattacco: 58,
    vie_laterali: 69,
    possesso_palla: 75,
    passaggio_lungo: 89,
    pressing_totale: 89,
    contropiede_veloce: 60
  }
}, 'contrattacco', 'it')
assert.match(lampardDecision, /Passaggio lungo 89, Overload 89/)
assert.match(lampardDecision, /Possesso palla 75/)
assert.doesNotMatch(lampardDecision, /Candidati ammessi[^\n]*Contrattacco 58/)
assert.match(lampardDecision, /Contrattacco 58 — mismatch allenatore, non consigliabile/)
assert.match(lampardDecision, /cambiare allenatore mantenendo lo stile oppure cambiare stile mantenendo l’allenatore/)

console.log('Coach catalog save contract tests passed')
