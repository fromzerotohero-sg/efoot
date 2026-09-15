import test from 'node:test'
import assert from 'node:assert/strict'
import {
  averageZoneMaps,
  buildPatternZonePayload,
  calculateDataCompleteness,
  calculateMissingSections,
  calculateSectionsPresent,
  calculateTacticalPatterns,
  classifyMatchResult,
  resolveMatchAttackZones,
  summarizeMatchAttackZones
} from '../src/domains/matches/index.js'

test('match metadata calculations stay pure and support labeled ratings', () => {
  const match = {
    player_ratings: { cliente: { striker: 7.5 }, avversario: {} },
    team_stats: { possession: 52 },
    attack_areas: { left: 20, center: 50, right: 30 },
    ball_recovery_zones: [{ x: 0.4, y: 0.7 }],
    formation_played: '4-3-3'
  }
  const snapshot = structuredClone(match)

  assert.deepEqual(calculateMissingSections(match), [])
  assert.equal(calculateSectionsPresent(match), 5)
  assert.equal(calculateDataCompleteness(match), 'complete')
  assert.deepEqual(match, snapshot)

  assert.deepEqual(calculateMissingSections({}), [
    'player_ratings',
    'team_stats',
    'attack_areas',
    'ball_recovery_zones',
    'formation_style'
  ])
})

test('result classification uses the user-first score convention', () => {
  assert.equal(classifyMatchResult('3-1'), 'win')
  assert.equal(classifyMatchResult('0 - 2'), 'loss')
  assert.equal(classifyMatchResult('2-2'), 'draw')
  assert.equal(classifyMatchResult('Vittoria'), 'win')
  assert.equal(classifyMatchResult('LOSS'), 'loss')
  assert.equal(classifyMatchResult(null), 'draw')
})

test('zone resolution separates our attack from opponent pressure home and away', () => {
  const home = resolveMatchAttackZones({
    team1: { left: 50, center: 30, right: 20 },
    team2: { left: 20, center: 30, right: 50 }
  }, true)
  assert.deepEqual(home, {
    ours: { left: 50, center: 30, right: 20 },
    theirs: { left: 20, center: 30, right: 50 }
  })

  const away = resolveMatchAttackZones({
    team1: { left: 60, center: 20, right: 20 },
    team2: { left: 10, center: 20, right: 70 }
  }, false)
  assert.deepEqual(away, {
    ours: { left: 10, center: 20, right: 70 },
    theirs: { left: 60, center: 20, right: 20 }
  })

  assert.deepEqual(resolveMatchAttackZones({
    cliente: { sinistra: '25', centro: 50, destra: 25 },
    avversario: { wide_left: 45, centre: 35, wide_right: 20 }
  }), {
    ours: { left: 25, center: 50, right: 25 },
    theirs: { left: 45, center: 35, right: 20 }
  })
})

test('zone summaries aggregate each side without inventing conceded-goal locations', () => {
  const matches = [
    {
      is_home: true,
      attack_areas: {
        team1: { left: 50, center: 30, right: 20 },
        team2: { left: 20, center: 30, right: 50 }
      },
      team_stats: { goals_scored: 3, goals_conceded: 1 }
    },
    {
      is_home: false,
      attack_areas: {
        team1: { left: 60, center: 20, right: 20 },
        team2: { left: 10, center: 20, right: 70 }
      },
      team_stats: { goals_scored: '2', goals_conceded: 2 }
    }
  ]

  assert.deepEqual(summarizeMatchAttackZones(matches), {
    oursAvg: { left: 30, center: 25, right: 45 },
    theirsAvg: { left: 40, center: 25, right: 35 },
    oursCount: 2,
    theirsCount: 2,
    matchCount: 2
  })
  assert.deepEqual(averageZoneMaps([{ l: 20, c: 30, r: 50 }]), {
    left: 20,
    center: 30,
    right: 50
  })
  assert.deepEqual(buildPatternZonePayload(matches), {
    our_attack_areas_avg: { left: 30, center: 25, right: 45 },
    opponent_attack_areas_avg: { left: 40, center: 25, right: 35 },
    conceded_goal_zones_avg: null,
    total_goals_scored: 5,
    total_goals_conceded: 3
  })
})

test('tactical patterns aggregate formations and styles without I/O', () => {
  const patterns = calculateTacticalPatterns([
    {
      formation_played: '4-3-3',
      playing_style_played: 'Possession',
      result: '4-2'
    },
    {
      formation_played: '4-3-3',
      playing_style_played: 'Quick Counter',
      result: 'SCONFITTA'
    },
    {
      formation_played: '4-2-3-1',
      playing_style_played: 'Possession',
      result: '1-1'
    }
  ])

  assert.deepEqual(patterns.formation_usage, {
    '4-3-3': { matches: 2, wins: 1, losses: 1, draws: 0, win_rate: 0.5 },
    '4-2-3-1': { matches: 1, wins: 0, losses: 0, draws: 1, win_rate: 0 }
  })
  assert.deepEqual(patterns.playing_style_usage, {
    Possession: { matches: 2, wins: 1, losses: 0, draws: 1, win_rate: 0.5 },
    'Quick Counter': { matches: 1, wins: 0, losses: 1, draws: 0, win_rate: 0 }
  })
  assert.equal(patterns.last_50_matches_count, 3)
  assert.deepEqual(patterns.recurring_issues, [])
  assert.equal(patterns.conceded_goal_zones_avg, null)
})
