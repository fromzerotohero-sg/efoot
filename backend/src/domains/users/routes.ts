import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { HttpError, IdentityProvider } from '../../types.js'
import type { UserReadService, UserWriteService } from './service.js'

function fail(reply: FastifyReply, error: Partial<HttpError> & { message?: string }) {
  return reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal server error'
  })
}

function language(request: FastifyRequest): 'it' | 'en' {
  const value = String(request.headers?.['accept-language'] || '').toLowerCase()
  return value.startsWith('it') || value.includes('it') ? 'it' : 'en'
}

export function registerUserRoutes(
  app: FastifyInstance,
  { identity, userReads, userWrites }: {
    identity: IdentityProvider
    userReads: UserReadService
    userWrites: UserWriteService
  }
): void {
  app.get('/v1/users/profile', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const profile = await userReads.profile({
        token: session.token,
        userId: session.userId
      })
      reply.header('Cache-Control', 'no-store')
      reply.header('X-User-Id', session.userId)
      if (profile.id) reply.header('X-Profile-Id', String(profile.id))
      if (profile.current_division) reply.header('X-Division', String(profile.current_division))
      return profile
    } catch (error) {
      return fail(reply, error as Partial<HttpError>)
    }
  })

  app.post<{ Body: Record<string, unknown> }>('/v1/users/profile/save', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await userWrites.saveProfile({
        token: session.token,
        userId: session.userId,
        profile: request.body || {}
      })
    } catch (error) {
      return fail(reply, error as Partial<HttpError>)
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
      return fail(reply, error as Partial<HttpError>)
    }
  })

  app.post<{ Body: Record<string, unknown> }>('/v1/users/ai-info', async (request, reply) => {
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
      return fail(reply, error as Partial<HttpError>)
    }
  })
}
