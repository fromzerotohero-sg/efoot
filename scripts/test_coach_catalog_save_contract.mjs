import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCoachCatalogResult } from '../lib/coachCatalogNormalization.js'

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

console.log('Coach catalog save contract tests passed')
