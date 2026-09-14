function hasObjectData(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
}

function hasPlayerRatings(playerRatings) {
  if (!hasObjectData(playerRatings)) return false

  return (
    hasObjectData(playerRatings.cliente) ||
    hasObjectData(playerRatings.avversario) ||
    (!playerRatings.cliente && !playerRatings.avversario && Object.keys(playerRatings).length > 0)
  )
}

export function getMissingMatchSections(match) {
  const missing = []

  if (!hasPlayerRatings(match.player_ratings)) missing.push('player_ratings')
  if (!hasObjectData(match.team_stats)) missing.push('team_stats')
  if (!hasObjectData(match.attack_areas)) missing.push('attack_areas')
  if (!Array.isArray(match.ball_recovery_zones) || match.ball_recovery_zones.length === 0) {
    missing.push('ball_recovery_zones')
  }
  if (!match.formation_played && !match.playing_style_played && !match.team_strength) {
    missing.push('formation_style')
  }

  return missing
}

export function normalizeMatchSummary(match) {
  const missing = getMissingMatchSections(match)
  const photosUploaded = 5 - missing.length

  return {
    id: match.id,
    match_date: match.match_date,
    opponent_name: match.opponent_name,
    result: match.result,
    photos_uploaded: photosUploaded,
    missing_photos: missing.length > 0 ? missing : null,
    data_completeness: missing.length === 0 ? 'complete' : 'partial'
  }
}
