function sendFailure(reply, error) {
  return reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal error'
  })
}

export function registerFormationRoutes(
  app,
  { identity, formationReads, formationWrites }
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
      return sendFailure(reply, error)
    }
  })

  app.post('/v1/formations/layout', async (request, reply) => {
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
      return sendFailure(reply, error)
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
      return sendFailure(reply, error)
    }
  })

  app.post('/v1/formations/variants', async (request, reply) => {
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
      return sendFailure(reply, error)
    }
  })
}
