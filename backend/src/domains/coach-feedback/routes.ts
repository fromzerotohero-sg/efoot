import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { IdentityProvider, ResolvedIdentity } from '../../types.js'
import type { CoachFeedbackError, createCoachFeedbackService } from './service.js'

const ERRORS = {
  authRequired: { it: 'Autenticazione richiesta.', en: 'Authentication required.' },
  authInvalid: { it: 'Token non valido o scaduto.', en: 'Invalid or expired token.' },
  bodyInvalid: { it: 'Corpo della richiesta non valido.', en: 'Invalid request body.' },
  messageRequired: { it: 'Il messaggio è obbligatorio.', en: 'Message is required.' },
  messageTooLong: { it: 'Messaggio troppo lungo.', en: 'Message too long.' },
  conversationRequired: { it: 'Conversazione vuota.', en: 'Empty conversation.' },
  chatServer: { it: 'Errore temporaneo. Riprova.', en: 'Temporary error. Please retry.' },
  saveServer: { it: 'Errore durante il salvataggio.', en: 'Error saving. Please retry.' },
  insufficient: {
    it: 'Crediti insufficienti. Ricarica per continuare.',
    en: 'Insufficient credits. Please recharge to continue.'
  }
} as const

type CoachFeedbackLang = 'it' | 'en'

export function coachFeedbackLanguage(request: FastifyRequest): CoachFeedbackLang {
  const value = String(request.headers?.['accept-language'] || '').toLowerCase()
  return value.startsWith('it') || value.includes('it') ? 'it' : 'en'
}

function idempotencyKey(request: FastifyRequest, capability: string, userId: string): string {
  const supplied = request.headers?.['idempotency-key']
  return typeof supplied === 'string' && supplied.trim()
    ? supplied.trim()
    : `${capability}:${userId}:${request.id}`
}

function failureMessage(error: CoachFeedbackError | Error | undefined, lang: CoachFeedbackLang, operation: 'chat' | 'save'): string {
  const typed = error as CoachFeedbackError | undefined
  if (typed?.type === 'message_required') return ERRORS.messageRequired[lang]
  if (typed?.type === 'message_too_long') return ERRORS.messageTooLong[lang]
  if (typed?.type === 'conversation_required') return ERRORS.conversationRequired[lang]
  if (typed?.type === 'insufficient_credits') return ERRORS.insufficient[lang]
  return operation === 'chat' ? ERRORS.chatServer[lang] : ERRORS.saveServer[lang]
}

function sendFailure(
  reply: FastifyReply,
  error: CoachFeedbackError | Error | undefined,
  lang: CoachFeedbackLang,
  operation: 'chat' | 'save'
) {
  const typed = error as CoachFeedbackError | undefined
  const statusCode = typed?.type === 'insufficient_credits'
    ? 402
    : typed?.statusCode || 500
  return reply.code(statusCode).send({
    error: failureMessage(error, lang, operation)
  })
}

function routeOptions(identity: IdentityProvider, capability: string, rateLimit: { maxRequests: number; windowMs: number }) {
  return {
    config: { capability, rateLimit },
    async preValidation(request: FastifyRequest, reply: FastifyReply) {
      const lang = coachFeedbackLanguage(request)
      try {
        request.auth = await identity.resolveUser(request)
      } catch (error) {
        const err = error as { statusCode?: number }
        const hasToken = String(request.headers?.authorization || '')
          .toLowerCase()
          .startsWith('bearer ')
        return reply.code(err?.statusCode || 401).send({
          error: (hasToken ? ERRORS.authInvalid : ERRORS.authRequired)[lang]
        })
      }
    },
    errorHandler(error: Error & { code?: string; statusCode?: number; type?: string }, request: FastifyRequest, reply: FastifyReply) {
      const lang = coachFeedbackLanguage(request)
      if (error?.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
        return reply.code(400).send({ error: ERRORS.bodyInvalid[lang] })
      }
      return sendFailure(reply, error as CoachFeedbackError, lang, capability.endsWith('.chat') ? 'chat' : 'save')
    }
  }
}

type ChatBody = Record<string, unknown>
type SaveBody = {
  conversation?: unknown
  session_type?: unknown
  match_id?: unknown
}

export function registerCoachFeedbackRoutes(
  app: FastifyInstance,
  {
    identity,
    coachFeedback
  }: {
    identity: IdentityProvider
    coachFeedback: ReturnType<typeof createCoachFeedbackService>
  }
) {
  if (!identity || !coachFeedback) {
    throw new TypeError('identity and coachFeedback are required')
  }

  app.post(
    '/v1/coach-feedback/chat',
    routeOptions(identity, 'coachFeedback.chat', { maxRequests: 30, windowMs: 60_000 }),
    async (request: FastifyRequest<{ Body: ChatBody }>, reply) => {
      const lang = coachFeedbackLanguage(request)
      try {
        const session = request.auth as ResolvedIdentity
        return await coachFeedback.chat({
          ...(request.body || {}),
          token: session.token,
          userId: session.userId,
          lang,
          rateLimit: (request as FastifyRequest & { rateLimit?: { remaining?: number; resetAt?: unknown } }).rateLimit,
          idempotencyKey: idempotencyKey(request, 'coach-feedback-chat', session.userId)
        })
      } catch (error) {
        return sendFailure(reply, error as CoachFeedbackError, lang, 'chat')
      }
    }
  )

  app.post(
    '/v1/coach-feedback/save',
    routeOptions(identity, 'coachFeedback.save', { maxRequests: 5, windowMs: 60_000 }),
    async (request: FastifyRequest<{ Body: SaveBody }>, reply) => {
      const lang = coachFeedbackLanguage(request)
      const body = request.body || {}
      try {
        const session = request.auth as ResolvedIdentity
        return await coachFeedback.save({
          conversation: body.conversation,
          sessionType: body.session_type,
          matchId: body.match_id,
          token: session.token,
          userId: session.userId,
          lang,
          rateLimit: (request as FastifyRequest & { rateLimit?: { remaining?: number; resetAt?: unknown } }).rateLimit,
          idempotencyKey: idempotencyKey(request, 'save-coach-feedback', session.userId)
        })
      } catch (error) {
        return sendFailure(reply, error as CoachFeedbackError, lang, 'save')
      }
    }
  )
}
