import { assertDormantRead } from '../../dormant.js'
import { buildPrematchChangeSet } from './changeSet.js'

const SURFACE = 'hero-home'
const MAX_MESSAGES = 80

function failure(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

async function result(query, fallback = null) {
  const { data, error } = await query
  if (error) throw error
  return data ?? fallback
}

export function orderNewestFirstThenChronological(rows, limit = 50) {
  const cap = Math.min(Number(limit) || 50, MAX_MESSAGES)
  return [...(rows || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, cap)
    .reverse()
}

export function dbMessageToClient(row) {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    id: row.id,
    role: row.role === 'user' ? 'user' : 'hero',
    content: row.content || '',
    kind: payload.kind || null,
    workflowId: payload.workflowId || null,
    workflowType: payload.workflowType || null,
    matchId: payload.matchId || null,
    suggestions: payload.suggestions || null,
    tips: payload.tips || null,
    plan: payload.plan || null,
    created_at: row.created_at
  }
}

export function createHeroPersistenceDb({ readProvider, writeProvider, now = () => new Date() }) {
  const read = (token) => readProvider.forUser(token)
  const write = (token) => writeProvider.forUser(token)

  async function findThread({ token, userId, surface }) {
    const { data } = await read(token).from('hero_chat_threads')
      .select('id, surface, updated_at')
      .eq('user_id', userId)
      .eq('surface', surface)
      .maybeSingle()
    return data || null
  }

  async function getOrCreateThread({ token, userId, surface = SURFACE }) {
    const existing = await findThread({ token, userId, surface })
    if (existing?.id) return existing

    const query = write(token).from('hero_chat_threads')
      .insert({ user_id: userId, surface })
      .select('id, surface, updated_at')
      .single()
    const { data: created, error } = await query
    if (!error && created) return created

    const concurrent = await findThread({ token, userId, surface })
    if (concurrent?.id) return concurrent
    throw error || new Error('Unable to create chat thread')
  }

  async function ownedThread({ token, userId, threadId }) {
    const { data, error } = await read(token).from('hero_chat_threads')
      .select('id, surface, updated_at')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single()
    if (error || !data) throw new Error('Chat thread not found')
    return data
  }

  return {
    async loadThreadMessages({ token, userId, surface = SURFACE, limit = 50 }) {
      const thread = await getOrCreateThread({ token, userId, surface })
      const cap = Math.min(limit, MAX_MESSAGES)
      const messages = await result(read(token).from('hero_chat_messages')
        .select('id, role, content, payload, created_at')
        .eq('thread_id', thread.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(cap), [])
      return { thread, messages: orderNewestFirstThenChronological(messages, cap) }
    },

    async appendMessages({ token, userId, messages, surface = SURFACE, threadId = null }) {
      const thread = threadId
        ? await ownedThread({ token, userId, threadId })
        : await getOrCreateThread({ token, userId, surface })
      const rows = (messages || [])
        .filter((message) => message && (message.content || message.payload))
        .map((message) => ({
          thread_id: thread.id,
          user_id: userId,
          role: message.role === 'user' ? 'user' : message.role === 'system' ? 'system' : 'hero',
          content: String(message.content || '').slice(0, 8000),
          payload: message.payload && typeof message.payload === 'object' ? message.payload : {}
        }))
      if (!rows.length) return { thread, inserted: [] }

      const inserted = await result(write(token).from('hero_chat_messages')
        .insert(rows)
        .select('id, role, content, payload, created_at'), [])

      await write(token).from('hero_chat_threads')
        .update({ updated_at: now().toISOString() })
        .eq('id', thread.id)
        .eq('user_id', userId)

      const { data: allIds } = await read(token).from('hero_chat_messages')
        .select('id')
        .eq('thread_id', thread.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (Array.isArray(allIds) && allIds.length > MAX_MESSAGES) {
        const ids = allIds.slice(MAX_MESSAGES).map((row) => row.id)
        if (ids.length) {
          await write(token).from('hero_chat_messages')
            .delete()
            .eq('thread_id', thread.id)
            .eq('user_id', userId)
            .in('id', ids)
        }
      }
      return { thread, inserted }
    },

    async getPlan({ token, userId, planId }) {
      const { data, error } = await read(token).from('prematch_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single()
      if (error || !data) throw failure('Plan not found', 404)
      return data
    },

    async listPlans({ token, userId }) {
      return result(read(token).from('prematch_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10), [])
    },

    async findPlanByIdempotencyKey({ token, userId, idempotencyKey }) {
      const { data } = await read(token).from('prematch_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      return data || null
    },

    async insertPlan({ token, userId, plan }) {
      return result(write(token).from('prematch_plans')
        .insert({ ...plan, user_id: userId })
        .select('*')
        .single())
    },

    async dismissPlan({ token, userId, planId }) {
      return result(write(token).from('prematch_plans')
        .update({ status: 'dismissed', updated_at: now().toISOString() })
        .eq('id', planId)
        .eq('user_id', userId)
        .select('*')
        .single())
    }
  }
}

function asId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function jsonSize(value) {
  try {
    return JSON.stringify(value || {}).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export function createHeroPersistenceService({
  config = { dormant: true },
  db
}) {
  return {
    async chatHistory({ token, userId, limit }) {
      assertDormantRead(config, 'hero.threads.load-or-create')
      const cap = Math.min(Math.max(Number(limit) || 50, 1), MAX_MESSAGES)
      const loaded = await db.loadThreadMessages({ token, userId, limit: cap })
      return {
        success: true,
        thread: loaded.thread,
        messages: loaded.messages.map(dbMessageToClient)
      }
    },

    async appendChat({ token, userId, input = {} }) {
      assertDormantRead(config, 'hero.threads.append')
      const messages = Array.isArray(input.messages) ? input.messages.slice(-2) : []
      if (!messages.length) throw failure('messages are required', 400)
      const safeMessages = messages
        .filter((message) => message &&
          (message.role === 'user' || message.role === 'hero' || message.role === 'system'))
        .map((message) => ({
          role: message.role,
          content: String(message.content || '').slice(0, 8000),
          payload: message.payload && typeof message.payload === 'object' ? message.payload : {}
        }))
        .filter((message) => message.content || Object.keys(message.payload).length > 0)
      const saved = await db.appendMessages({
        token,
        userId,
        messages: safeMessages,
        threadId: input.threadId || null
      })
      return {
        success: true,
        thread: saved.thread,
        messages: saved.inserted.map(dbMessageToClient)
      }
    },

    async plans({ token, userId, planId }) {
      if (planId) {
        return { success: true, plan: await db.getPlan({ token, userId, planId }) }
      }
      return { success: true, plans: await db.listPlans({ token, userId }) }
    },

    async savePlan({ token, userId, input = {} }) {
      assertDormantRead(config, 'hero.plans.save')
      if (jsonSize(input.countermeasures) > 300000) {
        throw failure('Countermeasure plan is too large', 413)
      }
      const idempotencyKey = asId(input.idempotency_key)
      if (idempotencyKey) {
        const existing = await db.findPlanByIdempotencyKey({
          token, userId, idempotencyKey
        })
        if (existing) return { success: true, plan: existing, reused: true }
      }
      const plan = await db.insertPlan({
        token,
        userId,
        plan: {
          thread_id: asId(input.thread_id),
          opponent_formation_id: asId(input.opponent_formation_id),
          status: 'ready',
          countermeasures: input.countermeasures || {},
          change_set: buildPrematchChangeSet(input.countermeasures, { lang: input.language }),
          idempotency_key: idempotencyKey
        }
      })
      return { success: true, plan }
    },

    async patchPlan({ token, userId, input = {} }) {
      assertDormantRead(config, 'hero.plans.dismiss')
      const planId = asId(input.id || input.plan_id)
      if (!planId) throw failure('plan_id is required', 400)
      const plan = await db.getPlan({ token, userId, planId })
      if (input.action !== 'dismiss') {
        throw failure(
          'Pre-match plans are informational. Configure the setup manually in eFootball.',
          400
        )
      }
      return {
        success: true,
        plan: await db.dismissPlan({ token, userId, planId: plan.id })
      }
    }
  }
}

export function registerHeroPersistenceRoutes(app, {
  identity,
  service,
  rateLimiter = null
}) {
  const run = async (request, reply, capability, rateMessage, fallbackError, work) => {
    try {
      const session = await identity.resolveUser(request)
      if (rateLimiter) {
        const limited = await rateLimiter.check(session.userId, capability)
        if (!limited.allowed) {
          return reply.code(429).send({ error: rateMessage, resetAt: limited.resetAt })
        }
      }
      return reply.send(await work(session))
    } catch (error) {
      return reply.code(error.statusCode || 500).send({
        error: error.statusCode ? error.message : fallbackError,
        ...(error.extra || {})
      })
    }
  }

  app.get('/v1/hero/threads', async (request, reply) =>
    run(request, reply, 'hero.threads', 'Too many chat requests. Try again shortly.',
      'Unable to load chat history',
      (session) => service.chatHistory({
        token: session.token,
        userId: session.userId,
        limit: request.query?.limit
      })))
  app.post('/v1/hero/threads', async (request, reply) =>
    run(request, reply, 'hero.threads', 'Too many chat requests. Try again shortly.',
      'Unable to save chat message',
      (session) => service.appendChat({
        token: session.token,
        userId: session.userId,
        input: request.body
      })))
  app.get('/v1/hero/plans', async (request, reply) =>
    run(request, reply, 'hero.plans', 'Too many plan requests. Try again shortly.',
      'Unable to load plans',
      (session) => service.plans({
        token: session.token,
        userId: session.userId,
        planId: request.query?.id
      })))
  app.post('/v1/hero/plans', async (request, reply) =>
    run(request, reply, 'hero.plans', 'Too many plan requests. Try again shortly.',
      'Unable to save countermeasure plan',
      (session) => service.savePlan({
        token: session.token,
        userId: session.userId,
        input: request.body
      })))
  app.patch('/v1/hero/plans', async (request, reply) =>
    run(request, reply, 'hero.plans', 'Too many plan requests. Try again shortly.',
      'Unable to update pre-match plan',
      (session) => service.patchPlan({
        token: session.token,
        userId: session.userId,
        input: request.body
      })))
}

export { buildPrematchChangeSet }
