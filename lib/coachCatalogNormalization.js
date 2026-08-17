function numericCompetence(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeCoachCatalogResult(row) {
  const payload = row?.coach_payload && typeof row.coach_payload === 'object'
    ? row.coach_payload
    : {}
  const payloadStyles = payload.playing_style_competence && typeof payload.playing_style_competence === 'object'
    ? payload.playing_style_competence
    : {}
  const rowStyles = row?.playing_style_competence && typeof row.playing_style_competence === 'object'
    ? row.playing_style_competence
    : {}
  const playingStyleCompetence = { ...payloadStyles, ...rowStyles }
  if (rowStyles.pressing_totale == null && payloadStyles.pressing_totale != null) {
    playingStyleCompetence.pressing_totale = payloadStyles.pressing_totale
  }
  if (playingStyleCompetence.pressing_totale == null) {
    const overload = numericCompetence(row?.metadata?.raw_skills?.OverLoad)
    if (overload != null) playingStyleCompetence.pressing_totale = overload
  }

  const payloadLinkUps = Array.isArray(payload.link_up_plays) ? payload.link_up_plays.filter(Boolean) : []
  const connection = row?.connection || payload.connection || payloadLinkUps[0] || null
  const linkUpPlays = payloadLinkUps.length > 0
    ? payloadLinkUps
    : connection
      ? [connection]
      : []

  return {
    id: row.id,
    source: row.source,
    source_coach_id: row.source_coach_id,
    source_card_image_url: row.source_card_image_url || null,
    coach_name: row.coach_name,
    coach_name_ja: row.coach_name_ja || null,
    category: row.category || null,
    pack_type: row.pack_type || null,
    playing_style_competence: playingStyleCompetence,
    stat_boosters: Array.isArray(row.stat_boosters) ? row.stat_boosters : [],
    boost_ids: Array.isArray(row.boost_ids) ? row.boost_ids : [],
    connection,
    catalog_ready: !!row.catalog_ready,
    needs_review: !!row.needs_review,
    metadata: row.metadata || {},
    coach_payload: {
      ...payload,
      playing_style_competence: playingStyleCompetence,
      connection,
      link_up_plays: linkUpPlays
    }
  }
}
