/**
 * Smoke test: Card Advisor build preview (meta vs roster).
 * node scripts/smoke-card-advisor-build.mjs
 */
import assert from 'node:assert/strict'
import { computeCardAdvisorBuildPreview } from '../lib/cardAdvisorBuildPreview.js'

const SAMPLE_STATS = {
  offensiveAwareness: 88,
  finishing: 92,
  lowPass: 75,
  loftedPass: 70,
  dribbling: 80,
  ballControl: 82,
  tightPossession: 78,
  heading: 85,
  setPieceTaking: 60,
  curl: 72,
  defensiveAwareness: 45,
  ballWinning: 40,
  trackingBack: 42,
  aggression: 55,
  speed: 84,
  acceleration: 86,
  kickingPower: 88,
  physicalContact: 82,
  balance: 80,
  stamina: 78,
  jump: 88
}

const card = {
  id: 'smoke-cf',
  name: 'Smoke Striker',
  position: 'P',
  overall: 95,
  category: 'Highlight',
  style: 'Goal Poacher',
  skills: ['Tiro di prima'],
  sourcePlayerId: 'smoke-1',
  source: 'efhub'
}

const catalogRow = {
  source: 'efhub',
  source_player_id: 'smoke-1',
  player_name: card.name,
  position: 'P',
  card_type: 'Highlight',
  max_level: 31,
  overall_level_1: 91,
  overall_max_level: 99,
  height: 182,
  base_stats: SAMPLE_STATS,
  max_stats: SAMPLE_STATS,
  playing_style: 'Goal Poacher',
  player_skills: ['Tiro di prima']
}

const rosterContext = {
  players: [
    {
      slot_index: 9,
      position: 'P',
      player_name: 'Rosa Punta',
      overall_rating: 92,
      height: 180,
      base_stats: SAMPLE_STATS,
      skills: [],
      com_skills: []
    }
  ],
  layout: {
    slot_positions: {
      9: { slot_index: 9, position: 'P' }
    }
  },
  tacticalSettings: { team_playing_style: 'contropiede_veloce' },
  activeCoach: null
}

const preview = await computeCardAdvisorBuildPreview({
  card,
  catalogRow,
  rosterContext,
  lang: 'it',
  admin: null
})

console.log('preview.ok:', preview.ok)
console.log('meta.ok:', preview.meta?.ok, 'PT:', preview.meta?.pointsUsed, '/', preview.meta?.pointsAvailable)
console.log('roster.ok:', preview.roster?.ok, 'PT:', preview.roster?.pointsUsed)
console.log('skills:', preview.skills?.items?.map(i => i.skill).join(', ') || preview.skills?.code)

assert.equal(preview.ok, true, 'expected successful preview')
assert.equal(preview.meta?.ok, true, 'meta build should succeed')
assert.ok(preview.meta.pointsUsed > 0, 'meta should spend PT')
assert.equal(preview.roster?.ok, true, 'roster build should succeed')
assert.ok(Array.isArray(preview.skills?.items), 'skills list expected')

const metaPt = Object.values(preview.meta.sliders || {}).reduce((a, b) => a + b, 0)
assert.ok(metaPt > 0, 'meta sliders should have ticks')

assert.ok(preview.meta?.whyLead?.length > 20, 'meta whyLead should be substantive')
assert.ok(Array.isArray(preview.meta?.reasonSections) && preview.meta.reasonSections.length >= 2, 'meta reason sections')
assert.ok(
  preview.roster?.reasonSections?.some(section => section.id === 'skills'),
  'roster should include skills-driven section'
)

console.log('\nOK — Card Advisor build preview smoke test passed.')
