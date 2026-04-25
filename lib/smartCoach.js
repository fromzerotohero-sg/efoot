export const SMART_COACH_FLAG = 'SMART_COACH_ENTRY'

export function isSmartEnabledServer() {
  if (typeof process === 'undefined') return false
  const value = process.env.NEXT_PUBLIC_FF_SMART_COACH_ENTRY
  if (value === 'false') return false
  if (value === 'true') return true
  return true
}

export function normalizeSmartPlayers(players) {
  if (!Array.isArray(players)) return []

  return players
    .filter((player) => player && typeof player === 'object')
    .map((player, index) => ({
      player_name: typeof player.player_name === 'string' ? player.player_name.trim() : '',
      slot_index: Number.isFinite(Number(player.slot_index)) ? Math.max(0, Math.min(10, Number(player.slot_index))) : index,
      position: typeof player.position === 'string' ? player.position.trim() : null,
      overall_rating: Number.isFinite(Number(player.overall_rating)) ? Number(player.overall_rating) : null,
      team: typeof player.team === 'string' ? player.team.trim() : null,
      nationality: typeof player.nationality === 'string' ? player.nationality.trim() : null,
      player_face_description: typeof player.player_face_description === 'string'
        ? player.player_face_description.trim()
        : null
    }))
    .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
}

export function getSmartReadiness(context) {
  const players = normalizeSmartPlayers(context?.players)
  const starterCount = players.length
  const hasCoach = !!context?.coach && typeof context.coach === 'object' && !!context.coach.coach_name

  if (starterCount >= 11) return { level: 'good', label: 'good' }
  if (starterCount >= 8) return { level: 'partial', label: 'partial' }
  return { level: 'weak', label: 'weak' }
}
