export function registerStarterPackRoutes(app, { identity, starterPackImports }) {
  app.post('/v1/roster/starter-pack', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await starterPackImports.import({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return reply.code(error.statusCode || 500).send({
        error: error.message || 'Error importing the test formation.'
      })
    }
  })
}
