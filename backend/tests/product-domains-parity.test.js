import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createCardAdvisorService,
  normalizeAdvisorCard,
  parseEfhubReleases,
  validateImageSource
} from '../src/domains/card-advisor/index.js'
import {
  createBuildCoachService,
  getSlotPosition,
  isNonProgressionCardType,
  withBuildFallbacks
} from '../src/domains/build-coach/index.js'
import {
  createTasksService,
  fallbackTasks,
  validateWeekDate,
  weekForDate
} from '../src/domains/tasks/index.js'
import { createDashboardService, normalizeMatchSummary } from '../src/domains/dashboard/index.js'
import { createGateService, MAINTENANCE_COOKIE_NAME } from '../src/domains/gates/index.js'
import {
  createNotificationService,
  normalizeNotificationPrefs,
  notificationPrefsPatch
} from '../src/domains/notifications/index.js'

const live = { dormant: false }
const dormant = { dormant: true }

test('card advisor pure rules preserve validation, releases, and HTTPS image allowlist', () => {
  assert.deepEqual(normalizeAdvisorCard({ name: ' A ', position: 'P', overall: '99' }), {
    id: '', name: 'A', position: 'P', overall: 99, category: '', style: '',
    skills: [], height: null, weight: null, sourcePlayerId: '', source: ''
  })
  assert.equal(validateImageSource('https://efimg.com/a.png').ok, true)
  assert.equal(validateImageSource('http://efimg.com/a.png').ok, false)
  assert.equal(validateImageSource('https://evil.test/a.png').ok, false)
  const markup = '<section><h2>Highlight 15 Sep \'26</h2><a href="/players/42"><img src="https://efimg.com/a.png" alt="Player A"><span class="text-white">98</span><span class="text-white">P</span></a></section>'
  const parsed = parseEfhubReleases(markup)
  assert.equal(parsed[0].id, 'highlight-15-sep-26')
  assert.equal(parsed[0].cards[0].sourcePlayerId, '42')
})

test('card advisor deep analysis blocks dormant cost and refunds failures', async () => {
  let deductions = 0
  const base = {
    db: { readDeepAnalysisContext: async ({ userId }) => {
      assert.equal(userId, 'tenant-a')
      return { catalogCard: { enrichment_status: 'complete', base_stats: { speed: 90 } } }
    } },
    evaluator: {
      buildDeepRequest: async () => ({}),
      normalizeDeep: (value) => value
    },
    credits: {
      deduct: async () => { deductions += 1; return { ok: true } },
      refund: async () => { deductions -= 1 }
    },
    openai: { complete: async () => { throw new Error('boom') }, parseJson: async () => ({}) }
  }
  const blocked = createCardAdvisorService({ ...base, config: dormant })
  await assert.rejects(() => blocked.deepAnalysis({ userId: 'tenant-a', card: { name: 'A', position: 'P' } }), /dormant/i)
  assert.equal(deductions, 0)
  const service = createCardAdvisorService({ ...base, config: live })
  await assert.rejects(() => service.deepAnalysis({ userId: 'tenant-a', card: { name: 'A', position: 'P' } }), /boom/)
  assert.equal(deductions, 0)
})

test('build coach rules and writes are tenant scoped', async () => {
  assert.equal(isNonProgressionCardType('POTW Worldwide'), true)
  assert.equal(getSlotPosition({ slot_index: 2 }, { slot_positions: { 2: { position: 'DC' } } }), 'DC')
  assert.deepEqual(
    withBuildFallbacks({}, { height: 188, base_stats: { speed: 1 }, max_level: 20 }, (_player, card) => card.max_level).estimated,
    ['base_stats', 'level_cap', 'height']
  )
  const updates = []
  const service = createBuildCoachService({
    config: live,
    db: {
      readRosterContext: async ({ userId }) => ({ players: [{ id: 'p1', player_name: 'A', user_id: userId }] }),
      updatePlayerBuild: async (input) => updates.push(input)
    },
    calculator: async () => ({ ok: true, updatePayload: { overall_rating: 99 }, publicResult: { ok: true, player_id: 'p1' } }),
    repairer: async () => ({ ok: true })
  })
  await service.player({ userId: 'tenant-a', playerId: 'p1' })
  assert.deepEqual(updates[0], { userId: 'tenant-a', playerId: 'p1', update: { overall_rating: 99 } })
})

test('tasks use UTC Monday, validate range, and dormant list never writes', async () => {
  const now = new Date('2026-09-15T12:00:00Z')
  assert.deepEqual(weekForDate(now), { start: '2026-09-14', end: '2026-09-20' })
  assert.equal(validateWeekDate('2026-09-15', now), '2026-09-14')
  assert.throws(() => validateWeekDate('bad', now), /YYYY-MM-DD/)
  assert.equal(fallbackTasks('en', '2026-09-14').length, 3)
  let writes = 0
  const service = createTasksService({
    config: dormant,
    now: () => now,
    db: { readWeeklyGoals: async ({ userId }) => { assert.equal(userId, 'tenant-a'); return [] } },
    generator: async () => { writes += 1; return [] },
    progress: async () => { writes += 1 },
    translate: (key) => key
  })
  const result = await service.list({ userId: 'tenant-a' })
  assert.equal(result.count, 3)
  assert.equal(writes, 0)
})

test('dashboard normalizes only the authenticated tenant payload', async () => {
  const complete = normalizeMatchSummary({
    id: 'm1', player_ratings: { cliente: { a: 1 } }, team_stats: { a: 1 },
    attack_areas: { a: 1 }, ball_recovery_zones: [1], formation_played: '4-3-3'
  })
  assert.equal(complete.data_completeness, 'complete')
  const service = createDashboardService({
    readDashboard: async ({ userId }) => {
      assert.equal(userId, 'tenant-a')
      return { matches: [{ id: 'm2' }], activeCoach: { id: 'c1' } }
    }
  })
  const result = await service.read({ userId: 'tenant-a' })
  assert.equal(result.hasActiveCoach, true)
  assert.equal(result.matches[0].photos_uploaded, 0)
})

test('gate rules match production cookies and dormant mode blocks grants', () => {
  const service = createGateService({
    config: live, maintenanceEnabled: true, maintenanceKey: 'secret'
  })
  assert.equal(service.maintenanceStatus({ cookieHeader: '' }).hasBypass, false)
  const unlocked = service.maintenanceUnlock({ key: 'secret' })
  assert.match(unlocked.cookies[0], new RegExp(`^${MAINTENANCE_COOKIE_NAME}=granted`))
  const blocked = createGateService({ config: dormant, maintenanceEnabled: true, maintenanceKey: 'secret' })
  assert.throws(() => blocked.maintenanceUnlock({ key: 'secret' }), /dormant/i)
})

test('notification preferences merge defaults, validate patches, and scope writes', async () => {
  assert.deepEqual(normalizeNotificationPrefs({ credits: false }), {
    weekly_goals: true, credits: false, leaderboard: true, coach: true
  })
  assert.deepEqual(notificationPrefsPatch({ credits: false, unknown: true }), { credits: false })
  let write
  const service = createNotificationService({
    config: live,
    db: {
      readNotificationPrefs: async ({ userId }) => { assert.equal(userId, 'tenant-a'); return { coach: false } },
      writeNotificationPrefs: async (value) => { write = value }
    }
  })
  const result = await service.savePreferences({ userId: 'tenant-a', input: { credits: false } })
  assert.equal(result.prefs.coach, false)
  assert.deepEqual(write, { userId: 'tenant-a', prefs: { coach: false, credits: false } })
})

