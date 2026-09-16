const PHOTO_SECTIONS = Object.freeze([
  'player_ratings',
  'team_stats',
  'attack_areas',
  'ball_recovery_zones',
  'formation_style'
])

export type MatchSectionName =
  | 'player_ratings'
  | 'team_stats'
  | 'attack_areas'
  | 'ball_recovery_zones'
  | 'formation_style'

export type MatchResultClass = 'win' | 'loss' | 'draw'
export type MatchDataCompleteness = 'complete' | 'partial'

// Shape consumed by the section calculators: every field is dynamic user/DB
// data, so values stay unknown and get narrowed at the point of use.
export interface MatchSectionSource {
  player_ratings?: unknown
  team_stats?: unknown
  attack_areas?: unknown
  ball_recovery_zones?: unknown
  formation_played?: unknown
  playing_style_played?: unknown
  team_strength?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasKeys(value: unknown): value is Record<string, unknown> {
  return isObject(value) && Object.keys(value).length > 0
}

export function hasPlayerRatings(playerRatings: unknown): boolean {
  if (!hasKeys(playerRatings)) return false
  if (hasKeys(playerRatings.cliente) || hasKeys(playerRatings.avversario)) return true
  return !playerRatings.cliente && !playerRatings.avversario
}

export function calculateMissingSections(match: MatchSectionSource = {}): MatchSectionName[] {
  const missing: MatchSectionName[] = []

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

export function calculateDataCompleteness(match: MatchSectionSource = {}): MatchDataCompleteness {
  return calculateMissingSections(match).length === 0 ? 'complete' : 'partial'
}

export function calculateSectionsPresent(match: MatchSectionSource = {}): number {
  return PHOTO_SECTIONS.length - calculateMissingSections(match).length
}

export const calculatePhotosUploaded = calculateSectionsPresent

export function classifyMatchResult(result: unknown): MatchResultClass {
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

export function isWin(result: unknown): boolean {
  return classifyMatchResult(result) === 'win'
}

export function isLoss(result: unknown): boolean {
  return classifyMatchResult(result) === 'loss'
}
