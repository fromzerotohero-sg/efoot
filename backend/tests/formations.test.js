import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_FORMATION_NAME,
  DEFAULT_SLOT_POSITIONS
} from '../src/domains/formations/defaults.js'
import {
  buildFluidFormationState,
  completeSlotPositions,
  getFormationNameFromSlotPositions,
  isStarterSlotIndex,
  normalizeFormationVariant
} from '../src/domains/formations/service.js'
import {
  isValidPhase,
  normalizePhase,
  normalizeSlotPositions,
  sanitizeFormationName,
  validateFormationLimits
} from '../src/domains/formations/validators.js'

test('default 4-3-3 is complete and respects formation limits', () => {
  assert.equal(DEFAULT_FORMATION_NAME, '4-3-3')
  assert.equal(Object.keys(DEFAULT_SLOT_POSITIONS).length, 11)

  const validation = validateFormationLimits(DEFAULT_SLOT_POSITIONS)
  assert.equal(validation.valid, true)
  assert.deepEqual(
    {
      defenders: validation.stats.defenders,
      midfielders: validation.stats.midfielders,
      attackers: validation.stats.attackers
    },
    { defenders: 4, midfielders: 3, attackers: 3 }
  )
})

test('missing slots are completed without mutating the input', () => {
  const slots = { 0: { x: 50, y: 90, position: 'PT' } }
  const completed = completeSlotPositions(slots)

  assert.equal(Object.keys(completed).length, 11)
  assert.deepEqual(completed[4], { x: 80, y: 65, position: 'TD' })
  assert.deepEqual(slots, { 0: { x: 50, y: 90, position: 'PT' } })
  assert.equal(isStarterSlotIndex('10'), true)
  assert.equal(isStarterSlotIndex(11), false)
  assert.equal(isStarterSlotIndex(null), false)
})

test('formation limits preserve zone rules and EDE compatibility', () => {
  const invalid = structuredClone(DEFAULT_SLOT_POSITIONS)
  invalid[1].position = 'DC'
  invalid[4].position = 'DC'

  const result = validateFormationLimits(invalid)
  assert.equal(result.valid, false)
  assert.ok(result.errors.includes('Difesa: massimo 3 DC (attualmente: 4)'))
  assert.ok(result.errors.includes('Difesa: con 3 DC, il 4° difensore deve essere un terzino (TD o TS)'))

  const legacyWing = structuredClone(DEFAULT_SLOT_POSITIONS)
  legacyWing[8].position = 'EDE'
  const legacyResult = validateFormationLimits(legacyWing)
  assert.equal(legacyResult.valid, true)
  assert.equal(legacyResult.stats.positionCounts.EDA, 1)
})

test('formation name is derived from coordinates, not role labels', () => {
  const slots = structuredClone(DEFAULT_SLOT_POSITIONS)
  slots[4] = { x: 80, y: 38, position: 'TD' }

  assert.equal(getFormationNameFromSlotPositions(slots), '3-3-4')
  assert.equal(getFormationNameFromSlotPositions(null), '1-1-1')
})

test('tactical variant validators normalize phase, name, coordinates, and roles', () => {
  assert.equal(normalizePhase(' ATTACK '), 'attack')
  assert.equal(normalizePhase('base'), null)
  assert.equal(isValidPhase('defense'), true)
  assert.equal(sanitizeFormationName(' 4-2-1-3 '), '4-2-1-3')
  assert.equal(sanitizeFormationName('x'.repeat(51)), null)

  const input = structuredClone(DEFAULT_SLOT_POSITIONS)
  input[1] = { x: '20.126', y: 65.555, position: ' ts ' }
  const normalized = normalizeSlotPositions(input)
  assert.deepEqual(normalized[1], { x: 20.13, y: 65.56, position: 'TS' })
  assert.equal(normalizeSlotPositions({ 0: input[0] }), null)

  const circular = {}
  circular.self = circular
  assert.equal(normalizeSlotPositions(circular), null)
})

test('formation variants retain existing defaults and reject malformed rows', () => {
  const normalized = normalizeFormationVariant({
    id: 'attack-id',
    phase: 'ATTACK',
    formation: ' 4-3-3 ',
    slot_positions: DEFAULT_SLOT_POSITIONS
  })

  assert.equal(normalized.phase, 'attack')
  assert.equal(normalized.formation, '4-3-3')
  assert.equal(normalized.is_active, true)
  assert.equal(normalized.source_version, 'v6.0.0')
  assert.equal(normalizeFormationVariant({ phase: 'base' }), null)
})

test('fluid formation is enabled only with active attack and defense variants', () => {
  const base = { formation: '4-3-3', slot_positions: DEFAULT_SLOT_POSITIONS, ignored: true }
  const attack = {
    id: 'a',
    phase: 'attack',
    formation: '4-2-1-3',
    slot_positions: DEFAULT_SLOT_POSITIONS,
    is_active: true
  }
  const defense = {
    id: 'd',
    phase: 'defense',
    formation: '4-4-2',
    slot_positions: DEFAULT_SLOT_POSITIONS,
    is_active: true
  }

  const enabled = buildFluidFormationState(base, [attack, { phase: 'invalid' }, defense])
  assert.equal(enabled.enabled, true)
  assert.deepEqual(enabled.base, {
    formation: '4-3-3',
    slot_positions: DEFAULT_SLOT_POSITIONS
  })

  const disabled = buildFluidFormationState(base, [attack, { ...defense, is_active: false }])
  assert.equal(disabled.enabled, false)
  assert.equal(disabled.attack.is_active, true)
  assert.equal(disabled.defense.is_active, false)
})
