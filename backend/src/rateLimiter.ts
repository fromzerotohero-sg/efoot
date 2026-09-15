import type { FastifyInstance } from 'fastify'
import type { IdentityProvider } from './types.js'

export interface RateLimitRule {
  maxRequests: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
}

export interface RateLimiter {
  check(userId: string, capability: string, override?: Partial<RateLimitRule>): Promise<RateLimitResult>
  clear(): void
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

declare module 'fastify' {
  interface FastifyRequest {
    rateLimit: RateLimitResult | null
  }
  interface FastifyContextConfig {
    capability?: string
    rateLimit?: Partial<RateLimitRule>
  }
}

const store = new Map<string, RateLimitEntry>()

export const RATE_LIMIT_CONFIG: Record<string, RateLimitRule> = {
  'matches.save': { maxRequests: 20, windowMs: 60_000 },
  'countermeasures.generate': { maxRequests: 5, windowMs: 60_000 },
  'users.profile.save': { maxRequests: 30, windowMs: 60_000 },
  'coaches.save': { maxRequests: 20, windowMs: 60_000 },
  'coaches.setActive': { maxRequests: 20, windowMs: 60_000 },
  'tactics.save': { maxRequests: 30, windowMs: 60_000 },
  'vision.extractMatch': { maxRequests: 10, windowMs: 60_000 },
  'vision.extractPlayer': { maxRequests: 15, windowMs: 60_000 },
  'vision.extractFormation': { maxRequests: 10, windowMs: 60_000 },
  'vision.extractCoach': { maxRequests: 5, windowMs: 60_000 },
  'vision.extractGameAnalysis': { maxRequests: 5, windowMs: 60_000 },
  'players.delete': { maxRequests: 5, windowMs: 60_000 },
  'knowledge.read': { maxRequests: 20, windowMs: 60_000 },
  'hero.chat': { maxRequests: 30, windowMs: 60_000 },
  'hero.threads': { maxRequests: 60, windowMs: 60_000 },
  'hero.plans': { maxRequests: 20, windowMs: 60_000 },
  'diagnostics.refresh': { maxRequests: 8, windowMs: 60_000 },
  'players.save': { maxRequests: 30, windowMs: 60_000 },
  'formations.saveLayout': { maxRequests: 20, windowMs: 60_000 },
  'matches.saveOpponentFormation': { maxRequests: 15, windowMs: 60_000 },
  'roster.assignSlot': { maxRequests: 30, windowMs: 60_000 },
  'roster.removeSlot': { maxRequests: 30, windowMs: 60_000 },
  'notifications.list': { maxRequests: 60, windowMs: 60_000 },
  'notifications.prefs': { maxRequests: 30, windowMs: 60_000 }
}

const RATE_LIMIT_ROUTES = new Map<string, string>([
  ['POST /v1/players', 'players.save'],
  ['POST /v1/users/profile/save', 'users.profile.save'],
  ['POST /v1/users/ai-info', 'users.profile.save'],
  ['DELETE /v1/players/:id', 'players.delete'],
  ['PATCH /v1/roster/assign-to-slot', 'roster.assignSlot'],
  ['PATCH /v1/roster/remove-from-slot', 'roster.removeSlot'],
  ['POST /v1/formations/layout', 'formations.saveLayout'],
  ['POST /v1/coaches', 'coaches.save'],
  ['POST /v1/coaches/active', 'coaches.setActive'],
  ['POST /v1/tactics', 'tactics.save'],
  ['POST /v1/matches', 'matches.save'],
  ['POST /v1/matches/opponent-formations', 'matches.saveOpponentFormation'],
  ['POST /v1/vision/extract-player', 'vision.extractPlayer'],
  ['POST /v1/vision/extract-coach', 'vision.extractCoach'],
  ['POST /v1/vision/extract-formation', 'vision.extractFormation'],
  ['POST /v1/vision/extract-match-data', 'vision.extractMatch'],
  ['POST /v1/vision/extract-game-analysis', 'vision.extractGameAnalysis'],
  ['GET /v1/knowledge/read', 'knowledge.read'],
  ['POST /v1/diagnostics/refresh', 'diagnostics.refresh'],
  ['GET /v1/notifications/list', 'notifications.list'],
  ['PATCH /v1/notifications/list', 'notifications.list'],
  ['GET /v1/notifications/prefs', 'notifications.prefs'],
  ['POST /v1/notifications/prefs', 'notifications.prefs']
])

export function createRateLimiter({ now = () => Date.now() }: { now?: () => number } = {}): RateLimiter {
  return {
    async check(userId, capability, override = {}) {
      const config = {
        maxRequests: 10,
        windowMs: 60_000,
        ...((RATE_LIMIT_CONFIG[capability] || {}) as Partial<RateLimitRule>),
        ...override
      }
      const timestamp = now()
      const key = `${userId}:${capability}`
      let entry = store.get(key)
      if (!entry || timestamp > entry.resetAt) {
        entry = { count: 0, resetAt: timestamp + config.windowMs }
        store.set(key, entry)
      }
      const allowed = entry.count < config.maxRequests
      if (allowed || entry.count === 0) entry.count += 1
      return {
        allowed,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetAt: new Date(entry.resetAt)
      }
    },
    clear() {
      store.clear()
    }
  }
}

export function installRateLimitHook(
  app: FastifyInstance,
  limiter: RateLimiter = createRateLimiter(),
  identity: IdentityProvider | null = null
): void {
  app.decorateRequest('rateLimit', null)
  app.addHook('preHandler', async (request, reply) => {
    const routeKey = `${request.method} ${request.routeOptions?.url || ''}`
    const capability = request.routeOptions?.config?.capability || RATE_LIMIT_ROUTES.get(routeKey)
    if (!capability) return
    if (!request.auth && identity) request.auth = await identity.resolveUser(request)
    const userId = request.auth?.userId
    if (!userId) return
    const result = await limiter.check(
      userId,
      capability,
      request.routeOptions?.config?.rateLimit || {}
    )
    request.rateLimit = result
    reply.header('x-ratelimit-limit', String(result.limit))
    reply.header('x-ratelimit-remaining', String(result.remaining))
    reply.header('x-ratelimit-reset', result.resetAt.toISOString())
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
      return reply.header('Retry-After', String(retryAfter)).code(429).send({
        error: 'Too many requests. Please try again later.',
        resetAt: result.resetAt
      })
    }
  })
}
