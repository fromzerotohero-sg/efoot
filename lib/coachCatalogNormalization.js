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

export function buildAuthoritativeCoachPayload(clientCoach, catalogRow) {
  const client = clientCoach && typeof clientCoach === 'object' ? clientCoach : {}
  const normalized = normalizeCoachCatalogResult(catalogRow)
  const payload = normalized.coach_payload && typeof normalized.coach_payload === 'object'
    ? normalized.coach_payload
    : {}
  const sourceCatalog = payload.source_catalog && typeof payload.source_catalog === 'object'
    ? payload.source_catalog
    : {}
  const clientSourceCatalog = client.source_catalog && typeof client.source_catalog === 'object'
    ? client.source_catalog
    : {}
  const photoSlots = payload.photo_slots && typeof payload.photo_slots === 'object'
    ? payload.photo_slots
    : client.photo_slots && typeof client.photo_slots === 'object'
      ? client.photo_slots
      : {}

  return {
    ...client,
    ...payload,
    coach_name: normalized.coach_name || payload.coach_name || client.coach_name,
    category: normalized.category || payload.category || client.category || null,
    pack_type: normalized.pack_type || payload.pack_type || client.pack_type || null,
    playing_style_competence: normalized.playing_style_competence,
    stat_boosters: normalized.stat_boosters,
    connection: normalized.connection,
    link_up_plays: normalized.coach_payload.link_up_plays,
    photo_slots: {
      ...photoSlots,
      catalog_card: normalized.source_card_image_url || photoSlots.catalog_card || null
    },
    source_catalog: {
      ...clientSourceCatalog,
      ...sourceCatalog,
      catalog: 'coach_catalog',
      catalog_id: normalized.id,
      source: normalized.source || sourceCatalog.source || clientSourceCatalog.source || null,
      source_coach_id: normalized.source_coach_id || sourceCatalog.source_coach_id || clientSourceCatalog.source_coach_id || null,
      source_card_image_url: normalized.source_card_image_url || sourceCatalog.source_card_image_url || clientSourceCatalog.source_card_image_url || null
    }
  }
}
