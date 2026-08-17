import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildAuthoritativeCoachPayload, normalizeCoachCatalogResult } from '../lib/coachCatalogNormalization.js'

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

const authoritativePayload = buildAuthoritativeCoachPayload({
  coach_name: 'D. Deschamps',
  playing_style_competence: { contrattacco: 1 },
  connection: null,
  link_up_plays: [],
  source_catalog: {
    catalog: 'coach_catalog',
    catalog_id: 'deschamps'
  }
}, {
  id: 'deschamps',
  source: 'efhub',
  source_coach_id: '17606681559180',
  source_card_image_url: 'https://example.com/deschamps.webp',
  coach_name: 'D. Deschamps',
  category: 'Epic',
  pack_type: 'Special',
  playing_style_competence: { contrattacco: 88 },
  stat_boosters: [{ name: 'Physical Contact', value: 1 }],
  connection,
  catalog_ready: true,
  needs_review: false,
  metadata: {},
  coach_payload: {
    connection: null,
    link_up_plays: []
  }
})
assert.deepEqual(authoritativePayload.connection, connection)
assert.deepEqual(authoritativePayload.link_up_plays, [connection])
assert.deepEqual(authoritativePayload.playing_style_competence, { contrattacco: 88 })
assert.deepEqual(authoritativePayload.stat_boosters, [{ name: 'Physical Contact', value: 1 }])
assert.equal(authoritativePayload.source_catalog.catalog_id, 'deschamps')
assert.equal(authoritativePayload.source_catalog.source_coach_id, '17606681559180')

const searchRoute = readFileSync(join(root, 'app/api/coach-catalog/search/route.js'), 'utf8')
assert.match(searchRoute, /\bconnection,\s*\n\s*catalog_ready,/)
assert.match(searchRoute, /\.map\(normalizeCoachCatalogResult\)/)

const saveRoute = readFileSync(join(root, 'app/api/supabase/save-coach/route.js'), 'utf8')
assert.match(saveRoute, /\.from\('coach_catalog'\)/)
assert.match(saveRoute, /buildAuthoritativeCoachPayload\(coach, catalogCoach\)/)
assert.match(saveRoute, /Catalog coach is unavailable or no longer verified/)
assert.match(saveRoute, /\.contains\('extracted_data', \{ source_catalog: \{ catalog_id: catalogId \} \}\)/)
assert.match(saveRoute, /\.update\(coachData\)/)
assert.match(saveRoute, /coach_id: existingCoach\.id,\s*\n\s*is_new: false/)

console.log('Coach catalog save contract tests passed')
