function sendFailure(reply, error) {
  return reply.code(error.statusCode || 500).send({ error: error.message || 'Internal error' })
}

export function registerMatchRoutes(app, { identity, matchWrites }) {
  app.post('/v1/matches', async (request, reply) => {
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

  app.post('/v1/matches/opponent-formations', async (request, reply) => {
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
