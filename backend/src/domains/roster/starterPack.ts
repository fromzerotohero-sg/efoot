// @ts-nocheck
const MAX_STARTER_VISIBLE_PLAYERS = 5

const clone = (value) => JSON.parse(JSON.stringify(value))
const normalizeName = (value) => String(value || '').trim().toLowerCase()

export function positionAliases(position) {
  const value = String(position || '').toUpperCase().trim()
  const groups = {
    PT: ['PT'],
    GK: ['PT'],
    TS: ['TS', 'TD', 'DC'],
    TD: ['TD', 'TS', 'DC'],
    DC: ['DC', 'TS', 'TD', 'MED'],
    MED: ['MED', 'CC', 'DC'],
    CC: ['CC', 'MED', 'TRQ'],
    TRQ: ['TRQ', 'CC', 'ESA', 'EDA'],
    ESA: ['ESA', 'CLS', 'TRQ', 'P'],
    EDA: ['EDA', 'CLD', 'TRQ', 'P'],
    CLS: ['CLS', 'ESA', 'TRQ', 'P'],
    CLD: ['CLD', 'EDA', 'TRQ', 'P'],
    P: ['P', 'CF', 'TRQ', 'ESA', 'EDA'],
    CF: ['CF', 'P', 'TRQ']
  }
  return groups[value] || [value]
}

function candidateSupports(candidate, position) {
  const preferred = Array.isArray(candidate?.preferred_positions)
    ? candidate.preferred_positions
    : [candidate?.position]
  return positionAliases(position).some((alias) =>
    preferred.map((value) => String(value).toUpperCase()).includes(alias)
  )
}

function pickCandidate(pack, position, usedNames) {
  for (const alias of positionAliases(position)) {
    const found = pack.candidates.find((candidate) =>
      !usedNames.has(normalizeName(candidate.player_name)) &&
      candidateSupports(candidate, alias)
    )
    if (found) return found
  }
  return pack.candidates.find((candidate) =>
    !usedNames.has(normalizeName(candidate.player_name))
  ) || null
}

export function buildStarterPlayerRow(
  template,
  { userId, styles = {}, slotIndex = null, position = null }
) {
  const player = clone(template)
  return {
    user_id: userId,
    player_name: player.player_name,
    position: position || player.position,
    team: player.team,
    nationality: player.nationality,
    club_name: player.club_name,
    overall_rating: player.overall_rating,
    age: player.age,
    form: player.form,
    role: player.role || player.playing_style_name || null,
    playing_style_id: player.playing_style_name
      ? styles[normalizeName(player.playing_style_name)] || null
      : null,
    base_stats: player.base_stats || {},
    skills: Array.isArray(player.skills) ? player.skills : [],
    com_skills: Array.isArray(player.com_skills) ? player.com_skills : [],
    available_boosters: Array.isArray(player.available_boosters) ? player.available_boosters : [],
    photo_slots: player.photo_slots || {},
    original_positions: Array.isArray(player.original_positions) ? player.original_positions : [],
    extracted_data: player.extracted_data || { source: 'starter-pack' },
    slot_index: slotIndex
  }
}

function domainError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function ensure(result, label) {
  if (result?.error) throw domainError(`${label}: ${result.error.message}`)
  return result
}

export function createStarterPackImportService(writeProvider, {
  pack,
  knowledgeRefresh,
  now = () => new Date()
} = {}) {
  if (!pack?.formation || !Array.isArray(pack?.candidates)) {
    throw new TypeError('A starter pack definition is required')
  }

  return {
    async import({ token, userId }) {
      const client = writeProvider.forUser(token)
      const [playersResult, layoutResult, coachResult, tacticsResult, statsResult, stylesResult] =
        await Promise.all([
          client.from('players').select('id, player_name, slot_index, position').eq('user_id', userId),
          client.from('formation_layout').select('id, formation, slot_positions').eq('user_id', userId).maybeSingle(),
          client.from('coaches').select('id, coach_name, is_active').eq('user_id', userId).eq('is_active', true).maybeSingle(),
          client.from('team_tactical_settings').select('id, team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
          client.from('user_game_analysis').select('user_id, stats').eq('user_id', userId).maybeSingle(),
          client.from('playing_styles').select('id, name')
        ])
      for (const [result, label] of [
        [playersResult, 'Starter pack players read failed'],
        [layoutResult, 'Starter pack layout read failed'],
        [coachResult, 'Starter pack coach read failed'],
        [tacticsResult, 'Starter pack tactics read failed'],
        [statsResult, 'Starter pack stats read failed'],
        [stylesResult, 'Starter pack styles read failed']
      ]) await ensure(result, label)

      const existingPlayers = playersResult.data || []
      if (existingPlayers.length > MAX_STARTER_VISIBLE_PLAYERS) {
        throw domainError('Starter pack is available only up to 5 roster players.', 409)
      }
      const mode = existingPlayers.length === 0 ? 'starter_full' : 'starter_fill_missing'
      const slotPositions = clone(
        layoutResult.data?.slot_positions &&
        Object.keys(layoutResult.data.slot_positions).length
          ? layoutResult.data.slot_positions
          : pack.formation.slot_positions
      )
      if (!layoutResult.data) {
        await ensure(await client.from('formation_layout').upsert({
          user_id: userId,
          formation: pack.formation.formation,
          slot_positions: slotPositions,
          updated_at: now().toISOString()
        }, { onConflict: 'user_id' }), 'Starter pack layout failed')
      }

      const styles = Object.fromEntries((stylesResult.data || [])
        .filter((row) => row?.name)
        .map((row) => [normalizeName(row.name), row.id]))
      const candidates = new Map(pack.candidates.map((candidate) =>
        [candidate.player_name, candidate]))
      const used = new Set(existingPlayers.map((player) => normalizeName(player.player_name)))
      const rows = []

      if (mode === 'starter_full') {
        for (let slot = 0; slot <= 10; slot += 1) {
          const position = slotPositions?.[slot]?.position || pack.formation.slot_positions?.[slot]?.position
          const preferred = candidates.get(pack.starterLineup?.[slot])
          const candidate = preferred && candidateSupports(preferred, position)
            ? preferred
            : pickCandidate(pack, position, used)
          if (!candidate) continue
          used.add(normalizeName(candidate.player_name))
          rows.push(buildStarterPlayerRow(candidate, {
            userId, styles, slotIndex: slot, position: position || candidate.position
          }))
        }
        for (const name of pack.reserveOrder || []) {
          const candidate = candidates.get(name)
          if (!candidate || used.has(normalizeName(candidate.player_name))) continue
          used.add(normalizeName(candidate.player_name))
          rows.push(buildStarterPlayerRow(candidate, { userId, styles }))
        }
      } else {
        const occupied = new Set(existingPlayers.map((player) => Number(player.slot_index))
          .filter((slot) => Number.isInteger(slot) && slot >= 0 && slot <= 10))
        for (let slot = 0; slot <= 10; slot += 1) {
          if (occupied.has(slot)) continue
          const position = slotPositions?.[slot]?.position || pack.formation.slot_positions?.[slot]?.position
          const candidate = pickCandidate(pack, position, used)
          if (!candidate) continue
          used.add(normalizeName(candidate.player_name))
          rows.push(buildStarterPlayerRow(candidate, {
            userId, styles, slotIndex: slot, position: position || candidate.position
          }))
        }
        if (existingPlayers.filter((player) => player.slot_index == null).length < (pack.reserveOrder || []).length) {
          for (const name of pack.reserveOrder || []) {
            const candidate = candidates.get(name)
            if (!candidate || used.has(normalizeName(candidate.player_name))) continue
            used.add(normalizeName(candidate.player_name))
            rows.push(buildStarterPlayerRow(candidate, { userId, styles }))
          }
        }
      }

      let insertedPlayers = []
      if (rows.length) {
        const inserted = await client.from('players').insert(rows).select('id, player_name')
        await ensure(inserted, mode === 'starter_full' ? 'Starter pack players failed' : 'Starter pack fill failed')
        insertedPlayers = inserted.data || []
      }

      if (!coachResult.data) {
        const coach = await client.from('coaches').insert({
          user_id: userId,
          ...pack.coach,
          is_active: true
        }).select('id').single()
        await ensure(coach, 'Starter coach failed')
        if (coach.data?.id) {
          await ensure(await client.from('coaches').update({ is_active: false })
            .eq('user_id', userId).neq('id', coach.data.id), 'Starter coach activation failed')
        }
      }

      const tactics = tacticsResult.data
      const meaningfulTactics = Boolean(
        tactics?.team_playing_style?.trim?.() ||
        (tactics?.individual_instructions && Object.keys(tactics.individual_instructions).length)
      )
      if (!meaningfulTactics) {
        await ensure(await client.from('team_tactical_settings').upsert({
          user_id: userId,
          ...pack.tactics,
          updated_at: now().toISOString()
        }, { onConflict: 'user_id' }), 'Starter tactics failed')
      }

      if (!statsResult.data?.stats || !Object.keys(statsResult.data.stats).length) {
        await ensure(await client.from('user_game_analysis').upsert({
          user_id: userId,
          stats: pack.gameAnalysis,
          captured_at: now().toISOString()
        }, { onConflict: 'user_id' }), 'Starter stats failed')
      }

      try {
        knowledgeRefresh?.schedule?.({ userId, source: 'roster.starterPack' })
      } catch {
        // Non-blocking by contract.
      }
      return {
        success: true,
        mode,
        insertedPlayers: insertedPlayers.length,
        message: 'Test formation imported successfully.'
      }
    }
  }
}
