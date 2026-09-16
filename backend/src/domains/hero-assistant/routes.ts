// @ts-nocheck
import { apiError, requestLanguage } from './utils.js'

function idempotencyKey(request, userId) {
  return request.headers?.['idempotency-key'] ||
    `hero.chat:${userId}:${request.id}`
}

function sendError(reply, error, fallbackLang) {
  const lang = error?.lang || fallbackLang
  const status = error?.statusCode || 500
  let message = error?.message || apiError('GENERIC_ERROR', lang)
  if (status === 401) {
    message = apiError(/required/i.test(String(error?.message || '')) ? 'AUTH_REQUIRED' : 'AUTH_INVALID', lang)
  }
  if (error?.type === 'rate_limit') message = apiError('RATE_LIMIT', lang)
  if (['timeout', 'network_error', 'server_error', 'openai_parse'].includes(error?.type)) {
    message = apiError('OPENAI_ERROR', lang)
  }
  reply.header('Content-Language', lang)
  if (error?.type === 'rate_limit') {
    reply.header('X-RateLimit-Limit', '30')
    if (error.remaining != null) reply.header('X-RateLimit-Remaining', String(error.remaining))
    if (error.resetAt != null) reply.header('X-RateLimit-Reset', String(error.resetAt))
  }
  return reply.code(status).send({
    error: message,
    ...(error?.type ? { code: error.type } : {}),
    ...(error?.type === 'insufficient_credits' && error?.message ? { details: error.message } : {})
  })
}

export function registerHeroAssistantRoutes(app, { identity, heroAssistant }) {
  app.post('/v1/hero/chat', async (request, reply) => {
    const lang = requestLanguage(request)
    try {
      const session = await identity.resolveUser(request)
      const result = await heroAssistant.chat({
        ...(request.body || {}),
        token: session.token,
        userId: session.userId,
        idempotencyKey: idempotencyKey(request, session.userId)
      })
      return reply
        .header('Content-Language', result.lang || request.body?.language || lang)
        .send(result)
    } catch (error) {
      return sendError(reply, error, lang)
    }
  })
}
