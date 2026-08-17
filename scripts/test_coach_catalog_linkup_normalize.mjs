#!/usr/bin/env node
/**
 * Local dry-run proof for coach catalog → save-coach payload → normalizeLinkUpPlays().
 * Does not write to Supabase.
 *
 *   node scripts/test_coach_catalog_linkup_normalize.mjs [dryrun.json]
 */
import { readFileSync } from 'node:fs'
import { normalizeLinkUpPlays } from '../lib/efootballV6TacticalModel.js'

function buildCoachPayloadFromCatalog(coach) {
  const payload = coach?.coach_payload && typeof coach.coach_payload === 'object'
    ? coach.coach_payload
    : {}
  return {
    ...payload,
    coach_name: payload.coach_name || coach?.coach_name,
    category: payload.category || coach?.category,
    pack_type: payload.pack_type || coach?.pack_type || 'Special',
    playing_style_competence: payload.playing_style_competence || coach?.playing_style_competence || {},
    stat_boosters: Array.isArray(payload.stat_boosters)
      ? payload.stat_boosters
      : Array.isArray(coach?.stat_boosters)
        ? coach.stat_boosters
        : [],
    connection: payload.connection || coach?.connection || null,
    photo_slots: payload.photo_slots || {
      catalog_card: coach?.source_card_image_url || null
    },
    source_catalog: payload.source_catalog || {
      catalog: 'coach_catalog',
      source: coach?.source || 'efhub',
      source_coach_id: coach?.source_coach_id || null
    }
  }
}

function pickSamples(records) {
  const withCounts = records.map((record) => ({
    record,
    count: Array.isArray(record?.coach_payload?.link_up_plays)
      ? record.coach_payload.link_up_plays.length
      : 0
  }))
  const pick = (n) => withCounts.find((item) => item.count === n)?.record || null
  return {
    zero: pick(0),
    one: pick(1),
    two: pick(2)
  }
}

function prove(label, record) {
  if (!record) {
    console.log(`\n=== ${label} ===`)
    console.log('NOT FOUND in dry-run records')
    return
  }

  const savedCoach = buildCoachPayloadFromCatalog(record)
  const extractedEnvelope = { extracted_data: savedCoach }
  const normalized = normalizeLinkUpPlays(extractedEnvelope)
  const connection = savedCoach.connection || null

  console.log(`\n=== ${label}: ${record.coach_name} (${record.source_coach_id}) ===`)
  console.log('SOURCE raw_linkup / raw_linkup2:')
  console.log(JSON.stringify({
    linkup: record.metadata?.raw_linkup ?? null,
    linkup2: record.metadata?.raw_linkup2 ?? null
  }, null, 2))
  console.log('IMPORTER coach_payload.link_up_plays / connection:')
  console.log(JSON.stringify({
    link_up_plays: record.coach_payload?.link_up_plays,
    connection: record.connection
  }, null, 2))
  console.log('SAVE-COACH extracted_data would contain:')
  console.log(JSON.stringify({
    link_up_plays: savedCoach.link_up_plays,
    connection: savedCoach.connection
  }, null, 2))
  console.log(`normalizeLinkUpPlays() count=${normalized.length}`)
  console.log(JSON.stringify(normalized, null, 2))
  console.log(`legacy connection is first only: ${Boolean(connection) && normalized[0]?.name === connection?.name}`)
}

const input = process.argv[2] || 'scripts/efhub_coach_catalog_linkup_dryrun.json'
const payload = JSON.parse(readFileSync(input, 'utf8'))
const records = Array.isArray(payload) ? payload : (payload.records || [])
const counts = { 0: 0, 1: 0, 2: 0 }
for (const record of records) {
  const n = Array.isArray(record?.coach_payload?.link_up_plays)
    ? record.coach_payload.link_up_plays.length
    : 0
  counts[n] = (counts[n] || 0) + 1
}

console.log(`records=${records.length} counts=${JSON.stringify(counts)}`)
const samples = pickSamples(records)
prove('0 Link-up', samples.zero)
prove('1 Link-up', samples.one)
prove('2 Link-up', samples.two)

const legacyPlay = {
  name: 'Over-the-Top Pass A',
  description: null,
  focal_point: { playing_style: 'Orchestrator', position: 'DMF' },
  key_man: { playing_style: 'Goal Poacher', position: 'CF' }
}
const legacyRow = {
  coach_name: 'Legacy Coach',
  connection: legacyPlay,
  extracted_data: {
    coach_name: 'Legacy Coach',
    connection: legacyPlay
  }
}
const legacyNormalized = normalizeLinkUpPlays(legacyRow)
console.log('\n=== BACKWARD COMPAT: old coach with only connection ===')
console.log(`normalizeLinkUpPlays() count=${legacyNormalized.length}`)
console.log(JSON.stringify(legacyNormalized, null, 2))
