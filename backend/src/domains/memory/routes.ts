// @ts-nocheck
export function registerMemoryRoutes(app, { identity, aiKnowledge }) {
  app.get('/v1/knowledge/read', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const refresh = request.query?.refresh === '1' || request.query?.refresh === 'true'
      const result = await aiKnowledge.read({
        token: session.token,
        userId: session.userId,
        refresh
      })
      reply.header('Cache-Control', 'private, max-age=300')
      reply.header('X-Resolved-User-Id', session.userId)
      return result
    } catch (error) {
      return reply.code(error.statusCode || 500).send({
        error: error.message || 'Internal server error'
      })
    }
  })
}
