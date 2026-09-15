const PHOTO_SECTIONS = Object.freeze([
  'player_ratings',
  'team_stats',
  'attack_areas',
  'ball_recovery_zones',
  'formation_style'
])

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasKeys(value) {
  return isObject(value) && Object.keys(value).length > 0
}

export function hasPlayerRatings(playerRatings) {
  if (!hasKeys(playerRatings)) return false
  if (hasKeys(playerRatings.cliente) || hasKeys(playerRatings.avversario)) return true
  return !playerRatings.cliente && !playerRatings.avversario
}

export function calculateMissingSections(match = {}) {
  const missing = []

  if (!hasPlayerRatings(match.player_ratings)) missing.push('player_ratings')
  if (!hasKeys(match.team_stats)) missing.push('team_stats')
  if (!hasKeys(match.attack_areas)) missing.push('attack_areas')
  if (!Array.isArray(match.ball_recovery_zones) || match.ball_recovery_zones.length === 0) {
    missing.push('ball_recovery_zones')
  }
  if (!match.formation_played && !match.playing_style_played && !match.team_strength) {
    missing.push('formation_style')
  }

  return missing
}

export const calculateMissingPhotos = calculateMissingSections

export function calculateDataCompleteness(match = {}) {
  return calculateMissingSections(match).length === 0 ? 'complete' : 'partial'
}

export function calculateSectionsPresent(match = {}) {
  return PHOTO_SECTIONS.length - calculateMissingSections(match).length
}

export const calculatePhotosUploaded = calculateSectionsPresent

export function classifyMatchResult(result) {
  if (typeof result !== 'string' || !result.trim()) return 'draw'

  const normalized = result.trim().toUpperCase()
  if (
    normalized === 'W' ||
    normalized.includes('VITTORIA') ||
    normalized.includes('WIN')
  ) {
    return 'win'
  }
  if (
    normalized === 'L' ||
    normalized.includes('SCONFITTA') ||
    normalized.includes('LOSS')
  ) {
    return 'loss'
  }

  const score = normalized.match(/^(\d+)\s*-\s*(\d+)$/)
  if (!score) return 'draw'

  const ourGoals = Number(score[1])
  const opponentGoals = Number(score[2])
  if (ourGoals > opponentGoals) return 'win'
  if (ourGoals < opponentGoals) return 'loss'
  return 'draw'
}

export function isWin(result) {
  return classifyMatchResult(result) === 'win'
}

export function isLoss(result) {
  return classifyMatchResult(result) === 'loss'
}
