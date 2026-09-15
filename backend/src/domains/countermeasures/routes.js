function idempotencyKey(request, userId) {
  return request.headers?.['idempotency-key'] ||
    `generate-countermeasures:${userId}:${request.id}`
}

function sendFailure(reply, error) {
  const status = error.statusCode || (
    error.type === 'rate_limit' ? 429 :
      error.type === 'timeout' ? 408 :
        500
  )
  return reply.code(status).send({
    error: error.message || 'Error generating countermeasures',
    ...(error.type ? { code: error.type } : {})
  })
}

export function registerCountermeasuresRoutes(app, { identity, countermeasures, rateLimiter = null }) {
  if (!identity || !countermeasures) {
    throw new TypeError('identity and countermeasures are required')
  }

  app.post('/v1/countermeasures/generate', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      if (rateLimiter) {
        const limited = await rateLimiter.check(session.userId, 'countermeasures.generate')
        reply
          .header('X-RateLimit-Limit', '5')
          .header('X-RateLimit-Remaining', String(limited.remaining))
          .header('X-RateLimit-Reset', limited.resetAt instanceof Date
            ? String(limited.resetAt.getTime())
            : String(limited.resetAt))
        if (!limited.allowed) {
          return reply.code(429).send({
            error: 'Rate limit exceeded. Please try again later.',
            resetAt: limited.resetAt
          })
        }
      }
      const body = request.body || {}
      return await countermeasures.generate({
        token: session.token,
        userId: session.userId,
        idempotencyKey: idempotencyKey(request, session.userId),
        opponentFormationId: body.opponent_formation_id,
        language: body.language,
        correctedFormation: body.corrected_formation,
        context: body.context
      })
    } catch (error) {
      return sendFailure(reply, error)
    }
  })
}
