// @ts-nocheck
function language(request) {
  const value = String(request.headers?.['accept-language'] || '').toLowerCase()
  if (value.startsWith('es') || value.includes('es')) return 'es'
  return value.startsWith('it') || value.includes('it') ? 'it' : 'en'
}

function sendFailure(reply, error, lang) {
  const status = error.statusCode || (
    error.type === 'rate_limit' ? 429 :
      error.type === 'timeout' ? 408 :
        ['server_error', 'network_error'].includes(error.type) ? 503 : 500
  )
  return reply
    .header('Content-Language', lang)
    .code(status)
    .send({
      error: error.message || 'Internal error',
      ...(error.type ? { code: error.type } : {})
    })
}

function idempotencyKey(request, capability, userId) {
  return request.headers?.['idempotency-key'] ||
    `${capability}:${userId}:${request.id}`
}

async function invoke(request, reply, dependencies, method, capability) {
  const lang = language(request)
  try {
    const session = await dependencies.identity.resolveUser(request)
    return await dependencies.vision[method]({
      ...(request.body || {}),
      token: session.token,
      userId: session.userId,
      idempotencyKey: idempotencyKey(request, capability, session.userId),
      lang
    })
  } catch (error) {
    return sendFailure(reply, error, lang)
  }
}

export function registerVisionRoutes(app, { identity, vision }) {
  const dependencies = { identity, vision }

  app.post('/v1/vision/extract-player', (request, reply) =>
    invoke(request, reply, dependencies, 'extractPlayer', 'vision.extractPlayer'))

  app.post('/v1/vision/extract-coach', (request, reply) =>
    invoke(request, reply, dependencies, 'extractCoach', 'vision.extractCoach'))

  app.post('/v1/vision/extract-formation', (request, reply) =>
    invoke(request, reply, dependencies, 'extractFormation', 'vision.extractFormation'))

  app.post('/v1/vision/extract-match-data', (request, reply) =>
    invoke(request, reply, dependencies, 'extractMatchData', 'vision.extractMatch'))

  app.post('/v1/vision/extract-game-analysis', (request, reply) =>
    invoke(request, reply, dependencies, 'extractGameAnalysis', 'vision.extractGameAnalysis'))

  app.get('/v1/vision/extract-game-analysis', async (request, reply) => {
    const lang = language(request)
    try {
      const session = await identity.resolveUser(request)
      return await vision.getGameAnalysis({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return sendFailure(reply, error, lang)
    }
  })
}
