import type { FastifyInstance, FastifyReply } from 'fastify'
import type { IdentityProvider } from '../../types.js'
import type { MatchWriteService, OpponentFormationInput } from './service.js'

function sendFailure(reply: FastifyReply, error: any) {
  return reply.code(error.statusCode || 500).send({ error: error.message || 'Internal error' })
}

export function registerMatchRoutes(
  app: FastifyInstance,
  { identity, matchWrites }: { identity: IdentityProvider; matchWrites: MatchWriteService }
): void {
  app.post<{ Body: { matchData?: unknown } }>('/v1/matches', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const result = await matchWrites.save({
        token: session.token,
        userId: session.userId,
        matchData: request.body?.matchData
      })
      return reply.code(201).send(result)
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.post<{ Body: OpponentFormationInput }>('/v1/matches/opponent-formations', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await matchWrites.saveOpponentFormation({
        token: session.token,
        userId: session.userId,
        formation: request.body || {}
      })
    } catch (error) {
      return sendFailure(reply, error)
    }
  })
}
