import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { HttpError, IdentityProvider } from '../../types.js'
import type { CreditReadService } from './service.js'

const NO_CACHE = 'no-store, no-cache, private, max-age=0, must-revalidate'

function fail(reply: FastifyReply, error: Partial<HttpError> & { message?: string }, fallback: string) {
  return reply.code(error.statusCode || 500).send({
    error: error.message || fallback
  })
}

export function registerCreditReadRoutes(
  app: FastifyInstance,
  { identity, creditReads }: { identity: IdentityProvider; creditReads: CreditReadService }
): void {
  const usage = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await identity.resolveUser(request)
      reply.header('Cache-Control', NO_CACHE)
      reply.header('Pragma', 'no-cache')
      reply.header('Expires', '0')
      reply.header('Vary', 'Authorization')
      return await creditReads.usage({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return fail(reply, error as Partial<HttpError>, 'Error loading usage')
    }
  }
  app.get('/v1/credits/usage', usage)
  app.post('/v1/credits/usage', usage)
}
