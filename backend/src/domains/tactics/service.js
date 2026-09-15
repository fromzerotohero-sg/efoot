import { createDisabledKnowledgeRefreshSideEffect } from '../memory/knowledgeRefresh.js'
import { sanitizeTacticalSettings } from './rules.js'

function domainError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function createTacticsWriteService(writeProvider, options = {}) {
  const knowledgeRefresh =
    options.knowledgeRefresh ||
    writeProvider?.knowledgeRefresh ||
    createDisabledKnowledgeRefreshSideEffect()

  return {
    async save({ token, userId, teamPlayingStyle, individualInstructions }) {
      const client = writeProvider.forUser(token)
      const [playersResult, formationResult] = await Promise.all([
        client
          .from('players')
          .select('id, position, slot_index')
          .eq('user_id', userId)
          .not('slot_index', 'is', null),
        client
          .from('formation_layout')
          .select('slot_positions')
          .eq('user_id', userId)
          .maybeSingle()
      ])
      if (playersResult.error) {
        throw domainError('Failed to fetch players for validation')
      }
      if (formationResult.error && process.env.NODE_ENV !== 'production') {
        console.warn('[tactics] formation validation context unavailable:', formationResult.error.message)
      }
      const normalized = sanitizeTacticalSettings({
        teamPlayingStyle,
        individualInstructions,
        starters: playersResult.data || [],
        formationLayout: formationResult.data || null
      })
      const saved = await client
        .from('team_tactical_settings')
        .upsert({
          user_id: userId,
          team_playing_style: normalized.teamPlayingStyle,
          individual_instructions: normalized.individualInstructions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select('id, team_playing_style, individual_instructions')
        .single()
      if (saved.error) {
        throw domainError(`Failed to save settings: ${saved.error.message}`)
      }

      // This mirrors the legacy non-blocking cache invalidation.
      Promise.resolve(
        client.from('user_diagnostic_cache').delete().eq('user_id', userId)
      ).catch(() => {})
      try {
        knowledgeRefresh.schedule({ userId, source: 'tactics.save' })
      } catch {
        // Non-blocking by contract.
      }
      return {
        success: true,
        settings: saved.data,
        droppedInstructions: normalized.droppedInstructions
      }
    }
  }
}

export function registerTacticsRoutes(app, { identity, tacticsWrites }) {
  app.post('/v1/tactics', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const body = request.body || {}
      const result = await tacticsWrites.save({
        token: session.token,
        userId: session.userId,
        teamPlayingStyle: body.team_playing_style,
        individualInstructions: body.individual_instructions
      })
      const { droppedInstructions, ...payload } = result
      if (droppedInstructions.length) {
        payload.warning =
          'Alcune istruzioni sono state rimosse (giocatore non in formazione o non selezionato). Assegna un titolare se vuoi.'
      }
      return payload
    } catch (error) {
      return reply.code(error.statusCode || 500).send({
        error: error.message || 'Internal error'
      })
    }
  })
}
