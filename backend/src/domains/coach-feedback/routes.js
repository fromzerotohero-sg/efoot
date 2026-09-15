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
}

export function coachFeedbackLanguage(request) {
  const value = String(request.headers?.['accept-language'] || '').toLowerCase()
  return value.startsWith('it') || value.includes('it') ? 'it' : 'en'
}

function idempotencyKey(request, capability, userId) {
  const supplied = request.headers?.['idempotency-key']
  return typeof supplied === 'string' && supplied.trim()
    ? supplied.trim()
    : `${capability}:${userId}:${request.id}`
}

function failureMessage(error, lang, operation) {
  if (error?.type === 'message_required') return ERRORS.messageRequired[lang]
  if (error?.type === 'message_too_long') return ERRORS.messageTooLong[lang]
  if (error?.type === 'conversation_required') return ERRORS.conversationRequired[lang]
  if (error?.type === 'insufficient_credits') return ERRORS.insufficient[lang]
  return operation === 'chat' ? ERRORS.chatServer[lang] : ERRORS.saveServer[lang]
}

function sendFailure(reply, error, lang, operation) {
  const statusCode = error?.type === 'insufficient_credits'
    ? 402
    : error?.statusCode || 500
  return reply.code(statusCode).send({
    error: failureMessage(error, lang, operation)
  })
}

function routeOptions(identity, capability, rateLimit) {
  return {
    config: { capability, rateLimit },
    async preValidation(request, reply) {
      const lang = coachFeedbackLanguage(request)
      try {
        request.auth = await identity.resolveUser(request)
      } catch (error) {
        const hasToken = String(request.headers?.authorization || '')
          .toLowerCase()
          .startsWith('bearer ')
        return reply.code(error?.statusCode || 401).send({
          error: (hasToken ? ERRORS.authInvalid : ERRORS.authRequired)[lang]
        })
      }
    },
    errorHandler(error, request, reply) {
      const lang = coachFeedbackLanguage(request)
      if (error?.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
        return reply.code(400).send({ error: ERRORS.bodyInvalid[lang] })
      }
      return sendFailure(reply, error, lang, capability.endsWith('.chat') ? 'chat' : 'save')
    }
  }
}

export function registerCoachFeedbackRoutes(app, { identity, coachFeedback }) {
  if (!identity || !coachFeedback) {
    throw new TypeError('identity and coachFeedback are required')
  }

  app.post(
    '/v1/coach-feedback/chat',
    routeOptions(identity, 'coachFeedback.chat', { maxRequests: 30, windowMs: 60_000 }),
    async (request, reply) => {
      const lang = coachFeedbackLanguage(request)
      try {
        const session = request.auth
        return await coachFeedback.chat({
          ...(request.body || {}),
          token: session.token,
          userId: session.userId,
          lang,
          rateLimit: request.rateLimit,
          idempotencyKey: idempotencyKey(request, 'coach-feedback-chat', session.userId)
        })
      } catch (error) {
        return sendFailure(reply, error, lang, 'chat')
      }
    }
  )

  app.post(
    '/v1/coach-feedback/save',
    routeOptions(identity, 'coachFeedback.save', { maxRequests: 5, windowMs: 60_000 }),
    async (request, reply) => {
      const lang = coachFeedbackLanguage(request)
      const body = request.body || {}
      try {
        const session = request.auth
        return await coachFeedback.save({
          conversation: body.conversation,
          sessionType: body.session_type,
          matchId: body.match_id,
          token: session.token,
          userId: session.userId,
          lang,
          rateLimit: request.rateLimit,
          idempotencyKey: idempotencyKey(request, 'save-coach-feedback', session.userId)
        })
      } catch (error) {
        return sendFailure(reply, error, lang, 'save')
      }
    }
  )
}
