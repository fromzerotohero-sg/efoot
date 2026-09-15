function fail(reply, error) {
  return reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal server error'
  })
}

function language(request) {
  const value = String(request.headers?.['accept-language'] || '').toLowerCase()
  return value.startsWith('it') || value.includes('it') ? 'it' : 'en'
}

export function registerUserRoutes(app, { identity, userReads, userWrites }) {
  app.get('/v1/users/profile', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const profile = await userReads.profile({
        token: session.token,
        userId: session.userId
      })
      reply.header('Cache-Control', 'no-store')
      reply.header('X-User-Id', session.userId)
      if (profile.id) reply.header('X-Profile-Id', profile.id)
      if (profile.current_division) reply.header('X-Division', profile.current_division)
      return profile
    } catch (error) {
      return fail(reply, error)
    }
  })

  app.post('/v1/users/profile/save', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await userWrites.saveProfile({
        token: session.token,
        userId: session.userId,
        profile: request.body || {}
      })
    } catch (error) {
      return fail(reply, error)
    }
  })

  app.get('/v1/users/ai-info', async (request, reply) => {
    const lang = language(request)
    reply.header('Content-Language', lang)
    try {
      const session = await identity.resolveUser(request)
      return await userReads.aiInfo({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return fail(reply, error)
    }
  })

  app.post('/v1/users/ai-info', async (request, reply) => {
    const lang = language(request)
    reply.header('Content-Language', lang)
    try {
      const session = await identity.resolveUser(request)
      return await userWrites.saveAiInfo({
        token: session.token,
        userId: session.userId,
        aiInfo: request.body || {}
      })
    } catch (error) {
      return fail(reply, error)
    }
  })
}
