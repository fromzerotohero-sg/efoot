function sendFailure(reply, error) {
  return reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal error'
  })
}

export function registerCoachRoutes(app, { identity, coachReads, coachWrites }) {
  app.get('/v1/coaches', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await coachReads.list({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.post('/v1/coaches', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const result = await coachWrites.save({
        token: session.token,
        userId: session.userId,
        coach: request.body?.coach
      })
      return reply.code(201).send(result)
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.post('/v1/coaches/active', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await coachWrites.setActive({
        token: session.token,
        userId: session.userId,
        coachId: request.body?.coach_id
      })
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.delete('/v1/coaches/:id', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await coachWrites.delete({
        token: session.token,
        userId: session.userId,
        coachId: request.params?.id
      })
    } catch (error) {
      return sendFailure(reply, error)
    }
  })
}
