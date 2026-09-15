import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { createHeroContextBuilder } from '../src/domains/hero-assistant/context.js'
import { registerHeroAssistantRoutes } from '../src/domains/hero-assistant/routes.js'
import {
  HERO_CHAT_COST,
  createHeroAssistantService
} from '../src/domains/hero-assistant/service.js'
import {
  HERO_LIMITS,
  parseSuggestions,
  validateHeroInput
} from '../src/domains/hero-assistant/utils.js'
import {
  buildHeroRag,
  buildHeroSystemPrompt
} from '../src/domains/hero-assistant/prompts.js'

const USER_ID = '00000000-0000-4000-8000-000000000001'

test('Hero retrieves renamed v9.1 RAG sections and shared truth policies', () => {
  const styleRag = buildHeroRag('Dove si attiva Regista creativo?')
  const skillRag = buildHeroRag('Quali skill posso aggiungere al mio mediano?')
  const system = buildHeroSystemPrompt('it')

  assert.match(styleRag, /2\. STILI DI GIOCO DELLA CARD/)
  assert.match(styleRag, /Non è attivo a CC\/CMF/)
  assert.match(skillRag, /8\. ABILITÀ GIOCATORE, ABILITÀ SPECIALI E STILI COM\/IA/)
  assert.match(skillRag, /massimo di \*\*5 Additional Skills\*\*/)
  assert.match(system, /TRUTH LAYER EFOOTBALL/)
  assert.match(system, /editor a due schemi/)
})

function jsonResponse(content, options = {}) {
  return {
    ok: options.ok ?? true,
    async json() {
      return options.data || { choices: [{ message: { content } }] }
    }
  }
}

function dependencies(overrides = {}) {
  const ledger = []
  const requests = []
  return {
    ledger,
    requests,
    service: createHeroAssistantService({
      config: { dormant: false, allowLive: true, openAiModel: 'gpt-5.2' },
      openai: {
        async complete(body, operation) {
          requests.push({ body, operation })
          return jsonResponse('Usa il mediano per proteggere il centro. Osserva se concedi meno transizioni.\n\nSUGGERIMENTI:\n1. Spiegami meglio questa copertura\n2. Dimmi chi deve accompagnare l’azione')
        }
      },
      credits: {
        async deduct(value) {
          ledger.push({ type: 'deduct', ...value })
          return { ok: true }
        },
        async refund(value) {
          ledger.push({ type: 'refund', ...value })
          return { ok: true }
        }
      },
      contextBuilder: async (input) => ({
        context: {
          profile: { first_name: 'Ada', ai_name: 'Hero' },
          currentPage: input.currentPage,
          appState: input.appState
        },
        personalContextSummary: 'Connection: Vertical Link. Focal Point: Pirlo. Key Man: Mbappé.',
        contextBlockLabel: 'RIASSUNTO ANALISI',
        rosterNames: ['Pirlo', 'Mbappé']
      }),
      ragBuilder: async () => '## 4. STILI SQUADRA',
      rateLimiter: async () => ({ allowed: true, remaining: 12, resetAt: 12345 }),
      ...overrides
    })
  }
}

test('request parity enforces message, history, page, language and app-state limits', () => {
  assert.throws(
    () => validateHeroInput({ message: 'x'.repeat(HERO_LIMITS.message + 1), language: 'en' }),
    (error) => error.statusCode === 400 && /too long/i.test(error.message)
  )
  const result = validateHeroInput({
    message: '  help me  ',
    currentPage: 'p'.repeat(700),
    language: 'es',
    appState: { viewingDashboard: 1, evil: true, completingMatch: 0 },
    history: Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 ? 'hero' : 'user',
      content: `m${index}${'x'.repeat(4000)}`
    }))
  })
  assert.equal(result.message, 'help me')
  assert.equal(result.currentPage.length, 500)
  assert.equal(result.lang, 'es')
  assert.deepEqual(result.appState, { completingMatch: false, viewingDashboard: true })
  assert.equal(result.history.length, 14)
  assert.ok(result.history.every((item) => item.content.length === 3000))
  assert.ok(result.history.some((item) => item.role === 'assistant'))
})

test('chat preserves prompt shape, configured model, response cards, and two-credit idempotency', async () => {
  const state = dependencies()
  const result = await state.service.chat({
    message: 'Come copro il centro?',
    currentPage: '/dashboard',
    appState: { viewingDashboard: true },
    language: 'it',
    history: [{ role: 'user', content: 'Prima domanda' }],
    token: 'jwt',
    userId: USER_ID,
    idempotencyKey: 'hero-1'
  })
  assert.equal(state.requests.length, 1)
  assert.equal(state.requests[0].body.model, 'gpt-5.2')
  assert.equal(state.requests[0].body.temperature, 0.5)
  assert.equal(state.requests[0].body.max_completion_tokens, 1200)
  assert.deepEqual(state.requests[0].body.messages.map((item) => item.role), [
    'system', 'user', 'user'
  ])
  assert.match(state.requests[0].body.messages[0].content, /POLITICHE OBBLIGATORIE/)
  assert.match(state.requests[0].body.messages[2].content, /RIASSUNTO ANALISI/)
  assert.deepEqual(state.ledger, [{
    type: 'deduct',
    capability: 'assistant-chat',
    amount: HERO_CHAT_COST,
    userId: USER_ID,
    idempotencyKey: 'hero-1'
  }])
  assert.equal(result.model_used, 'gpt-5.2')
  assert.equal(result.remaining, 12)
  assert.equal(result.resetAt, 12345)
  assert.equal(result.suggestions.length, 3)
  assert.equal(result.cards?.[0].type, 'tip')
})

test('model-not-found falls back to gpt-4o without charging twice', async () => {
  let calls = 0
  const state = dependencies({
    openai: {
      async complete(body) {
        calls += 1
        if (calls === 1) {
          const error = new Error('missing model')
          error.type = 'model_not_found'
          throw error
        }
        assert.equal(body.model, 'gpt-4o')
        return jsonResponse('Mantieni la squadra corta.')
      }
    }
  })
  const result = await state.service.chat({
    message: 'Aiutami',
    token: 'jwt',
    userId: USER_ID,
    idempotencyKey: 'fallback-1'
  })
  assert.equal(result.model_used, 'gpt-4o')
  assert.equal(calls, 2)
  assert.deepEqual(state.ledger.map((entry) => entry.type), ['deduct'])
})

test('AI failure refunds the exact two-credit idempotent charge', async () => {
  const state = dependencies({
    openai: {
      async complete() {
        const error = new Error('network')
        error.type = 'network_error'
        error.statusCode = 503
        throw error
      }
    }
  })
  await assert.rejects(() => state.service.chat({
    message: 'Aiutami',
    token: 'jwt',
    userId: USER_ID,
    idempotencyKey: 'refund-1'
  }), (error) => error.type === 'network_error')
  assert.deepEqual(state.ledger.map((entry) => entry.type), ['deduct', 'refund'])
  assert.equal(state.ledger[1].amount, 2)
  assert.equal(state.ledger[1].idempotencyKey, 'refund-1')
})

test('direct service is fail-closed dormant before auth-adjacent dependencies, AI, DB, or cost', async () => {
  let effects = 0
  const service = createHeroAssistantService({
    config: { dormant: true, allowLive: false },
    openai: { async complete() { effects += 1 } },
    credits: {
      async deduct() { effects += 1 },
      async refund() { effects += 1 }
    },
    contextBuilder: async () => { effects += 1 },
    rateLimiter: async () => { effects += 1 }
  })
  await assert.rejects(
    () => service.chat({ message: 'hello' }),
    (error) => error.statusCode === 403 && error.type === 'dormant'
  )
  assert.equal(effects, 0)
})

function fakeSupabase(fixtures) {
  const log = []
  const client = {
    from(table) {
      const entry = { table, eq: [] }
      log.push(entry)
      const query = {
        select() { return query },
        eq(column, value) { entry.eq.push([column, value]); return query },
        in() { return query },
        order() { return query },
        limit() { return query },
        maybeSingle() { entry.single = true; return query },
        then(resolve) {
          const value = fixtures[table]
          return Promise.resolve(resolve({
            data: entry.single
              ? (Array.isArray(value) ? value[0] || null : value || null)
              : (Array.isArray(value) ? value : value ? [value] : []),
            error: null
          }))
        }
      }
      return query
    }
  }
  return { client, log }
}

test('context builder uses fresh <=6h diagnostics, live overlays, feedback memory, and tenant filters', async () => {
  const now = new Date('2026-09-15T12:00:00.000Z')
  const database = fakeSupabase({
    user_profiles: { first_name: 'Ada', ai_name: 'Hero' },
    user_diagnostic_cache: {
      content: 'Cached analysis\nTattica: stale',
      generated_at: new Date(now.getTime() - HERO_LIMITS.diagnosticAgeMs).toISOString()
    },
    team_tactical_settings: { team_playing_style: 'Possesso palla', individual_instructions: {} },
    formation_layout: { formation: '4-3-3', slot_positions: {} },
    formation_variants: [],
    coaches: { coach_name: 'Coach', connection: null },
    playing_styles: [],
    matches: [],
    players: [{ id: 'p1', player_name: 'Pirlo', position: 'CC', slot_index: 5, original_positions: [{ position: 'CC', competence: 'Alta' }] }],
    user_tactical_feedback: [{ conversation_summary: 'Keep the midfield compact', created_at: '2026-09-14' }]
  })
  const build = createHeroContextBuilder({
    readProvider: { forUser: (token) => {
      assert.equal(token, 'jwt')
      return database.client
    } },
    now: () => now
  })
  const result = await build({
    token: 'jwt',
    userId: USER_ID,
    currentPage: '/dashboard',
    appState: { viewingDashboard: true },
    lang: 'it'
  })
  assert.equal(result.context.profile.first_name, 'Ada')
  assert.equal(result.contextBlockLabel, 'RIASSUNTO ANALISI')
  assert.match(result.personalContextSummary, /AGGIORNAMENTO LIVE/)
  assert.match(result.personalContextSummary, /FEEDBACK TATTICO RECENTE/)
  assert.match(result.personalContextSummary, /Cached analysis/)
  assert.deepEqual(result.rosterNames, ['Pirlo'])
  for (const query of database.log.filter((entry) => entry.table !== 'playing_styles')) {
    assert.ok(
      query.eq.some(([column, value]) => column === 'user_id' && value === USER_ID),
      `${query.table} must be tenant scoped`
    )
  }
})

test('Fastify registrar injects auth identity and stable request idempotency', async () => {
  const app = Fastify({ logger: false })
  let captured
  registerHeroAssistantRoutes(app, {
    identity: {
      async resolveUser(request) {
        assert.equal(request.headers.authorization, 'Bearer token')
        return { token: 'token', userId: USER_ID }
      }
    },
    heroAssistant: {
      async chat(input) {
        captured = input
        return { response: 'ok', suggestions: [], model_used: 'gpt-4o' }
      }
    }
  })
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/hero/chat',
      headers: { authorization: 'Bearer token', 'idempotency-key': 'request-1' },
      payload: { message: 'hello', language: 'en' }
    })
    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['content-language'], 'en')
    assert.equal(captured.userId, USER_ID)
    assert.equal(captured.token, 'token')
    assert.equal(captured.idempotencyKey, 'request-1')
  } finally {
    await app.close()
  }
})

test('suggestion parser removes the hidden block from visible response', () => {
  assert.deepEqual(
    parseSuggestions('Answer.\n\n---\nSUGGESTIONS:\n1. Explain it\n2. Apply it'),
    { cleanContent: 'Answer.', suggestions: ['Explain it', 'Apply it'] }
  )
})
