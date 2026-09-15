const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_MAX_RETRIES = 2

function openAiError(type, message, statusCode = 502) {
  const error = new Error(message)
  error.name = 'OpenAiProviderError'
  error.type = type
  error.statusCode = statusCode
  return error
}

export function createOpenAiProvider(config, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES

  return {
    name: 'OpenAiProvider',
    async complete(requestBody, operationType = 'openai-call') {
      if (config.dormant) {
        throw openAiError('dormant', 'OpenAI calls are disabled in dormant mode', 403)
      }
      if (!config.openAiApiKey) {
        throw openAiError('not_configured', 'OpenAI provider is not configured', 503)
      }

      let lastError
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        try {
          const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.openAiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          })
          clearTimeout(timeoutId)
          if (response.ok) return response

          const data = await response.json().catch(() => ({ error: {} }))
          const code = data.error?.code || data.error?.type || 'unknown'
          const message = data.error?.message || 'Unable to process request'
          const normalized = message.toLowerCase()
          const parameterError =
            normalized.includes('max_tokens') ||
            normalized.includes('max_completion_tokens') ||
            normalized.includes('unsupported parameter')
          const modelError =
            !parameterError &&
            (response.status === 404 ||
              code === 'model_not_found' ||
              (response.status === 400 &&
                normalized.includes('model') &&
                ['not found', 'invalid', 'does not exist', 'not available', 'not supported']
                  .some((part) => normalized.includes(part))))

          if (modelError) throw openAiError('model_not_found', message, response.status)
          if (response.status === 429 || code === 'rate_limit_exceeded') {
            lastError = openAiError('rate_limit', 'Rate limit reached. Please try again in a minute.', 429)
            if (attempt < maxRetries) {
              await sleep(5_000)
              continue
            }
            throw lastError
          }
          if (response.status >= 500 && response.status < 504) {
            lastError = openAiError('server_error', 'Service temporarily unavailable. Please try again.')
            if (attempt < maxRetries) {
              await sleep(5_000)
              continue
            }
            throw lastError
          }
          throw openAiError('client_error', message, response.status)
        } catch (error) {
          clearTimeout(timeoutId)
          if (error?.name === 'OpenAiProviderError') throw error
          const timedOut = error?.name === 'AbortError' || error?.message?.includes('timeout')
          lastError = timedOut
            ? openAiError('timeout', 'Request took too long. Please try again.', 504)
            : openAiError('network_error', 'Network error. Please try again.')
          if (attempt < maxRetries) {
            await sleep(timedOut ? 10_000 : 5_000)
            continue
          }
          throw lastError
        }
      }
      throw lastError || openAiError('unknown_error', `${operationType} failed`)
    },
    async parseJson(response) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw openAiError('no_content', 'No content in response')
      try {
        return JSON.parse(content)
      } catch {
        throw openAiError('parse_error', 'Unable to parse OpenAI JSON response')
      }
    }
  }
}
