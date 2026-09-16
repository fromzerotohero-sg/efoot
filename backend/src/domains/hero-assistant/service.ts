// @ts-nocheck
import { buildHeroRag, buildHeroSystemPrompt, buildHeroUserPrompt } from './prompts.js'
import { finalizeHeroReply, validateHeroInput } from './utils.js'

export const HERO_CHAT_COST = 2
export const HERO_CAPABILITY = 'assistant-chat'

function heroError(message, statusCode, type = 'server_error', lang) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.type = type
  if (lang) error.lang = lang
  return error
}

function assertLive(config) {
  if (config?.dormant || !config?.allowLive) {
    throw heroError('Hero assistant calls are disabled in dormant mode', 403, 'dormant')
  }
}

async function readCompletion(response) {
  if (!response || typeof response.ok !== 'boolean') {
    throw heroError('Invalid response from OpenAI API', 503, 'openai_parse')
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const code = data?.error?.code || data?.error?.type
    if (code === 'model_not_found') {
      throw heroError(data?.error?.message || 'Model not found', 404, 'model_not_found')
    }
    throw heroError(data?.error?.message || 'OpenAI API error', 503, 'server_error')
  }
  const data = await response.json().catch(() => {
    throw heroError('Invalid response from OpenAI API', 503, 'openai_parse')
  })
  return data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.content ||
    ''
}

async function completeWithFallback(openai, requestBody) {
  try {
    return {
      rawContent: await readCompletion(await openai.complete(requestBody, HERO_CAPABILITY)),
      model: requestBody.model
    }
  } catch (error) {
    if (error?.type !== 'model_not_found' || requestBody.model === 'gpt-4o') throw error
    const fallback = { ...requestBody, model: 'gpt-4o' }
    return {
      rawContent: await readCompletion(await openai.complete(fallback, `${HERO_CAPABILITY}-fallback`)),
      model: 'gpt-4o'
    }
  }
}

export function createHeroAssistantService({
  config,
  openai,
  credits,
  contextBuilder,
  rateLimiter = async () => ({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000 }),
  ragBuilder = buildHeroRag,
  cardAvailability = async () => ''
}) {
  return {
    async chat(input = {}) {
      // This check must precede validation and every injectable dependency.
      assertLive(config)
      const requestLang = ['it', 'en', 'es'].includes(input.language) ? input.language : 'it'
      const rateLimit = await rateLimiter({
        userId: input.userId,
        capability: HERO_CAPABILITY,
        maxRequests: 30,
        windowMs: 60_000
      })
      if (!rateLimit?.allowed) {
        const error = heroError('Rate limit exceeded. Please try again later.', 429, 'rate_limit', requestLang)
        error.resetAt = rateLimit?.resetAt
        error.remaining = rateLimit?.remaining
        throw error
      }
      const validated = validateHeroInput(input)
      const {
        message, currentPage, appState, history, lang
      } = validated

      const built = await contextBuilder({
        token: input.token,
        userId: input.userId,
        currentPage,
        appState,
        lang
      })
      const rag = await ragBuilder(message)
      let cardAvailabilityBlock = ''
      try {
        cardAvailabilityBlock = await cardAvailability({
          token: input.token,
          userId: input.userId,
          message,
          lang
        })
      } catch {
        // The active route treats Card Advisor availability as non-blocking.
      }
      const prompt = buildHeroUserPrompt({
        message,
        context: built.context,
        lang,
        rag,
        personalContextSummary: built.personalContextSummary,
        contextBlockLabel: built.contextBlockLabel,
        cardAvailabilityBlock,
        hasHistory: history.length > 0
      })
      const model = String(config?.openAiModel || 'gpt-5.2').trim() || 'gpt-5.2'
      const requestBody = {
        model,
        messages: [
          { role: 'system', content: buildHeroSystemPrompt(lang) },
          ...history,
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_completion_tokens: 1200
      }
      const charge = {
        capability: HERO_CAPABILITY,
        amount: HERO_CHAT_COST,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey
      }
      const deduction = await credits.deduct(charge)
      if (!deduction?.ok) {
        throw heroError(
          lang === 'en'
            ? 'Hero Points balance empty. Top up to keep chatting with your Coach.'
            : 'Hero Points esauriti. Ricarica per continuare a chattare con il Coach.',
          402,
          'insufficient_credits',
          lang
        )
      }

      try {
        const completion = await completeWithFallback(openai, requestBody)
        const fallback = lang === 'it'
          ? 'Mi dispiace, non ho capito. Puoi ripetere?'
          : "Sorry, I didn't get that. Can you repeat?"
        const presentation = finalizeHeroReply({
          rawContent: completion.rawContent || fallback,
          message,
          summary: built.personalContextSummary,
          lang,
          rosterNames: built.rosterNames
        })
        // The active route's gpt-4o recovery response predates tip cards.
        if (completion.model === 'gpt-4o' && model !== 'gpt-4o') {
          delete presentation.tips
          delete presentation.cards
        }
        return {
          ...presentation,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
          model_used: completion.model
        }
      } catch (error) {
        await credits.refund(charge)
        throw error
      }
    }
  }
}
