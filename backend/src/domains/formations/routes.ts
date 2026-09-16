import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { HttpError, IdentityProvider } from '../../types.js'
import type { createFormationReadService, createFormationWriteService } from './service.js'

function sendFailure(reply: FastifyReply, error: HttpError | Error) {
  const err = error as HttpError
  return reply.code(err.statusCode || 500).send({
    error: error.message || 'Internal error'
  })
}

type LayoutBody = {
  formation?: unknown
  slot_positions?: unknown
  preserve_slots?: unknown
}

type VariantsBody = {
  enabled?: unknown
  attack?: { formation?: unknown; slot_positions?: unknown }
  defense?: { formation?: unknown; slot_positions?: unknown }
}

export function registerFormationRoutes(
  app: FastifyInstance,
  {
    identity,
    formationReads,
    formationWrites
  }: {
    identity: IdentityProvider
    formationReads: ReturnType<typeof createFormationReadService>
    formationWrites: ReturnType<typeof createFormationWriteService>
  }
) {
  app.get('/v1/formations', async (request, reply) => {
    try {
      reply.header('Cache-Control', 'no-store')
      const session = await identity.resolveUser(request)
      return await formationReads.getFormation({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })

  app.post('/v1/formations/layout', async (request: FastifyRequest<{ Body: LayoutBody }>, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const body = request.body || {}
      return await formationWrites.saveLayout({
        token: session.token,
        userId: session.userId,
        formation: body.formation,
        slotPositions: body.slot_positions,
        preserveSlots: body.preserve_slots
      })
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })

  app.get('/v1/formations/variants', async (request, reply) => {
    try {
      reply.header('Cache-Control', 'no-store')
      const session = await identity.resolveUser(request)
      const state = await formationReads.getVariants({
        token: session.token,
        userId: session.userId
      })
      return { success: true, fluid_formation: state }
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })

  app.post('/v1/formations/variants', async (request: FastifyRequest<{ Body: VariantsBody }>, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const body = request.body || {}
      const state = await formationWrites.saveVariants({
        token: session.token,
        userId: session.userId,
        enabled: body.enabled,
        attack: body.attack,
        defense: body.defense
      })
      return { success: true, fluid_formation: state }
    } catch (error) {
      return sendFailure(reply, error as HttpError)
    }
  })
}
