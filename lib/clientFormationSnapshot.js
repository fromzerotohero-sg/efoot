import { buildFluidFormationState, getPhasePositionFit, resolvePhaseSlot } from './efootballV6TacticalModel.js'
import { normPosCode } from './playerSlotRoleMetadata.js'

function starterList(players) {
  return (Array.isArray(players) ? players : [])
    .filter((player) => {
      const slot = Number(player?.slot_index)
      return Number.isInteger(slot) && slot >= 0 && slot <= 10
    })
    .sort((a, b) => Number(a.slot_index) - Number(b.slot_index))
}

function roleForSlot(slotPositions, baseSlots, player) {
  const resolved = resolvePhaseSlot(slotPositions, baseSlots, player?.slot_index)
  return normPosCode(resolved?.position || player?.position)
}

function phaseEntry(fluid, phase) {
  if (fluid?.enabled && fluid?.[phase]) return fluid[phase]
  return fluid?.base || null
}

export function buildClientFormationSnapshot({ starters = [], baseLayout = null, variantRows = [] } = {}) {
  const fluid = buildFluidFormationState(baseLayout, variantRows)
  const baseSlots = fluid?.base?.slot_positions || baseLayout?.slot_positions || null
  const attack = phaseEntry(fluid, 'attack')
  const defense = phaseEntry(fluid, 'defense')

  const resolvedStarters = starterList(starters).map((player) => {
    const slotRoleBase = roleForSlot(baseSlots, baseSlots, player)
    const slotRoleAttack = roleForSlot(attack?.slot_positions, baseSlots, player)
    const slotRoleDefense = roleForSlot(defense?.slot_positions, baseSlots, player)
    return {
      ...player,
      slotRoleBase,
      slotRoleAttack,
      slotRoleDefense,
      phaseFit: {
        base: getPhasePositionFit(slotRoleBase, player?.original_positions),
        attack: getPhasePositionFit(slotRoleAttack, player?.original_positions),
        defense: getPhasePositionFit(slotRoleDefense, player?.original_positions)
      }
    }
  })

  return {
    fluid,
    enabled: Boolean(fluid?.enabled),
    formation: {
      base: fluid?.base?.formation || baseLayout?.formation || null,
      attack: attack?.formation || fluid?.base?.formation || baseLayout?.formation || null,
      defense: defense?.formation || fluid?.base?.formation || baseLayout?.formation || null
    },
    slots: {
      base: baseSlots,
      attack: attack?.slot_positions || baseSlots,
      defense: defense?.slot_positions || baseSlots
    },
    starters: resolvedStarters
  }
}

export function getSnapshotStarter(snapshot, playerOrId) {
  const id = typeof playerOrId === 'object' ? playerOrId?.id : playerOrId
  const slotIndex = typeof playerOrId === 'object' ? Number(playerOrId?.slot_index) : null
  return (snapshot?.starters || []).find((player) => (
    (id && player.id === id) ||
    (Number.isInteger(slotIndex) && Number(player.slot_index) === slotIndex)
  )) || null
}

export function getSnapshotPlayerRole(snapshot, playerOrId, phase = 'base') {
  const starter = getSnapshotStarter(snapshot, playerOrId)
  const key = phase === 'attack'
    ? 'slotRoleAttack'
    : phase === 'defense'
      ? 'slotRoleDefense'
      : 'slotRoleBase'
  return normPosCode(starter?.[key] || (typeof playerOrId === 'object' ? playerOrId?.position : ''))
}

export function startersForSnapshotPhase(snapshot, phase = 'base') {
  return (snapshot?.starters || []).map((player) => ({
    ...player,
    position: getSnapshotPlayerRole(snapshot, player, phase)
  }))
}

export function activeTacticalInstructions(settings, snapshot) {
  const instructions = settings?.individual_instructions
  if (!instructions || typeof instructions !== 'object') return {}
  const starterIds = new Set((snapshot?.starters || []).map((player) => player.id).filter(Boolean))
  return Object.fromEntries(
    Object.entries(instructions).filter(([, instruction]) => (
      instruction?.enabled &&
      instruction?.player_id &&
      starterIds.has(instruction.player_id)
    ))
  )
}
