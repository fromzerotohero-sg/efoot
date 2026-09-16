import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { HttpError, IdentityProvider } from '../../types.js'
import type { createCoachReadService, createCoachWriteService } from './service.js'

function sendFailure(reply: FastifyReply, error: HttpError | Error) {
  const err = error as HttpError
  return reply.code(err.statusCode || 500).send({
    error: error.message || 'Internal error'
  })
}

type CoachSaveBody = { coach?: unknown }
type CoachActiveBody = { coach_id?: unknown }
type CoachIdParams = { id?: string }

export function registerCoachRoutes(
  app: FastifyInstance,
  {
    identity,
    coachReads,
    coachWrites
  }: {
    identity: IdentityProvider
    coachReads: ReturnType<typeof createCoachReadService>
    coachWrites: ReturnType<typeof createCoachWriteService>
  }
) {
  app.get('/v1/coaches', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await coachReads.list({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })

  app.post('/v1/coaches', async (request: FastifyRequest<{ Body: CoachSaveBody }>, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const result = await coachWrites.save({
        token: session.token,
        userId: session.userId,
        coach: request.body?.coach
      })
      return reply.code(201).send(result)
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })

  app.post('/v1/coaches/active', async (request: FastifyRequest<{ Body: CoachActiveBody }>, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await coachWrites.setActive({
        token: session.token,
        userId: session.userId,
        coachId: request.body?.coach_id
      })
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })

  app.delete('/v1/coaches/:id', async (request: FastifyRequest<{ Params: CoachIdParams }>, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await coachWrites.delete({
        token: session.token,
        userId: session.userId,
        coachId: request.params?.id
      })
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })
}
