import {
  MATCH_SELECT,
  buildMatchInsert,
  domainError
} from './payloads.js'

async function resolveClientTeamName(client, userId) {
  const profile = await client
    .from('user_profiles')
    .select('team_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (profile.data?.team_name) return profile.data.team_name
  const coach = await client
    .from('coaches')
    .select('team')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  return coach.data?.team || null
}

export function createMatchWriteService(writeProvider, options = {}) {
  const afterSave = typeof options.afterSave === 'function' ? options.afterSave : null
  return {
    async save({ token, userId, matchData, now }) {
      const client = writeProvider.forUser(token)
      const clientTeamName = await resolveClientTeamName(client, userId)
      const insert = buildMatchInsert(userId, matchData, { clientTeamName, now })
      const result = await client
        .from('matches')
        .insert(insert)
        .select(MATCH_SELECT)
        .single()
      if (result.error) throw domainError(result.error.message || 'Error saving match')
      if (afterSave) {
        queueMicrotask(() => {
          Promise.resolve(afterSave({ token, userId, match: result.data }))
            .catch((error) => options.logger?.warn?.(
              '[matches] post-save refresh failed (non-blocking):',
              error?.message || error
            ))
        })
      }
      return {
        success: true,
        match: result.data,
        photos_uploaded: insert.photos_uploaded,
        missing_photos: insert.missing_photos || [],
        data_completeness: insert.data_completeness,
        credits_used: insert.credits_used
      }
    },

    async saveOpponentFormation({ token, userId, formation, now }) {
      if (!formation?.extracted_data || typeof formation.extracted_data !== 'object') {
        throw domainError('extracted_data is required', 400)
      }
      const client = writeProvider.forUser(token)
      const extracted = formation.extracted_data
      const payload = {
        user_id: userId,
        formation_name: formation.formation_name || extracted.formation || null,
        playing_style: formation.playing_style || extracted.playing_style || null,
        tactical_style: extracted.tactical_style || null,
        overall_strength: extracted.overall_strength || null,
        players: Array.isArray(extracted.players) ? extracted.players : [],
        extracted_data: extracted,
        is_pre_match: formation.is_pre_match === true,
        formation_image: formation.formation_image || null,
        match_date: formation.is_pre_match ? (now || new Date()).toISOString() : null,
        updated_at: (now || new Date()).toISOString()
      }
      const saved = await client
        .from('opponent_formations')
        .insert(payload)
        .select('id, formation_name, playing_style, extracted_data, is_pre_match')
        .single()
      if (saved.error) {
        throw domainError(`Failed to save opponent formation: ${saved.error.message}`)
      }
      return { success: true, formation: saved.data }
    }
  }
}
