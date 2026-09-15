import type { BackendConfig } from './config.js'

const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_MAX_RETRIES = 2

export type OpenAiErrorType =
  | 'dormant'
  | 'not_configured'
  | 'model_not_found'
  | 'rate_limit'
  | 'server_error'
  | 'client_error'
  | 'timeout'
  | 'network_error'
  | 'unknown_error'
  | 'no_content'
  | 'parse_error'

export interface OpenAiProviderError extends Error {
  name: 'OpenAiProviderError'
  type: OpenAiErrorType
  statusCode: number
}

export interface OpenAiProviderOptions {
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<unknown>
  timeoutMs?: number
  maxRetries?: number
}

export interface OpenAiProvider {
  name: string
  complete(requestBody: unknown, operationType?: string): Promise<Response>
  // TODO(ts): the parsed payload shape belongs to each domain (vision, hero, ...);
  // type it per-domain when the domains are converted.
  parseJson(response: Response): Promise<unknown>
}

function openAiError(type: OpenAiErrorType, message: string, statusCode = 502): OpenAiProviderError {
  const error = new Error(message) as OpenAiProviderError
  error.name = 'OpenAiProviderError'
  error.type = type
  error.statusCode = statusCode
  return error
}

interface OpenAiErrorResponse {
  error?: { code?: string; type?: string; message?: string }
}

export function createOpenAiProvider(config: BackendConfig, options: OpenAiProviderOptions = {}): OpenAiProvider {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  const sleep = options.sleep || ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
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

      let lastError: OpenAiProviderError | undefined
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

          const data: OpenAiErrorResponse = await response.json().catch(() => ({ error: {} }))
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
        } catch (rawError) {
          clearTimeout(timeoutId)
          const error = rawError as { name?: string; message?: string } | null
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
