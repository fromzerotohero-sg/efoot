import test from 'node:test'
import assert from 'node:assert/strict'
import { createOpenAiProvider } from '../src/openai.js'

test('OpenAI is fail-closed in dormant mode', async () => {
  const provider = createOpenAiProvider(
    { dormant: true, openAiApiKey: 'unused' },
    { fetchImpl: async () => { throw new Error('must not call network') } }
  )
  await assert.rejects(
    () => provider.complete({ model: 'gpt-test', messages: [] }),
    (error) => error.statusCode === 403 && error.type === 'dormant'
  )
})

test('OpenAI live provider preserves request and parses JSON content', async () => {
  let request
  const provider = createOpenAiProvider(
    { dormant: false, openAiApiKey: 'test-key' },
    {
      maxRetries: 0,
      fetchImpl: async (url, options) => {
        request = { url, options }
        return {
          ok: true,
          async json() {
            return { choices: [{ message: { content: '{"ok":true}' } }] }
          }
        }
      }
    }
  )
  const response = await provider.complete({ model: 'gpt-test', messages: [] }, 'test')
  assert.equal(request.url, 'https://api.openai.com/v1/chat/completions')
  assert.equal(request.options.headers.Authorization, 'Bearer test-key')
  assert.deepEqual(await provider.parseJson(response), { ok: true })
})

test('OpenAI live provider retries rate limits', async () => {
  let attempts = 0
  const sleeps = []
  const provider = createOpenAiProvider(
    { dormant: false, openAiApiKey: 'test-key' },
    {
      maxRetries: 1,
      sleep: async (ms) => sleeps.push(ms),
      fetchImpl: async () => {
        attempts += 1
        if (attempts === 1) {
          return {
            ok: false,
            status: 429,
            async json() { return { error: { code: 'rate_limit_exceeded' } } }
          }
        }
        return { ok: true, async json() { return { choices: [] } } }
      }
    }
  )
  await provider.complete({ model: 'gpt-test', messages: [] })
  assert.equal(attempts, 2)
  assert.deepEqual(sleeps, [5_000])
})
