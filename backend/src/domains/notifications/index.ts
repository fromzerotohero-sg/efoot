import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { BackendConfig } from '../../config.js'
import { assertDormantRead } from '../../dormant.js'
import type { ReadOnlySupabaseProvider, UserSupabaseWriteProvider } from '../../readOnlySupabase.js'
import type { HttpError, IdentityProvider, ResolvedIdentity } from '../../types.js'
import type { Json } from '../../types/database.js'

export const NOTIFICATION_PREF_KEYS = ['weekly_goals', 'credits', 'leaderboard', 'coach'] as const
export type NotificationPrefKey = (typeof NOTIFICATION_PREF_KEYS)[number]
export type NotificationPrefs = Record<NotificationPrefKey, boolean>

export const DEFAULT_NOTIFICATION_PREFS: Readonly<NotificationPrefs> = Object.freeze(
  Object.fromEntries(NOTIFICATION_PREF_KEYS.map((key): [NotificationPrefKey, boolean] => [key, true]))
) as NotificationPrefs

export function normalizeNotificationPrefs(stored: Record<string, unknown> = {}): NotificationPrefs {
  const result: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS }
  for (const key of NOTIFICATION_PREF_KEYS) {
    const value = stored?.[key]
    if (typeof value === 'boolean') result[key] = value
  }
  return result
}

export function notificationPrefsPatch(input: Record<string, unknown> = {}): Partial<NotificationPrefs> {
  const result: Partial<NotificationPrefs> = {}
  for (const key of NOTIFICATION_PREF_KEYS) {
    const value = input?.[key]
    if (typeof value === 'boolean') result[key] = value
  }
  return result
}

function failure(message: string, statusCode: number): HttpError {
  return Object.assign(new Error(message), { statusCode })
}

// Structural supertype of the postgrest-js response union (success carries
// data, failure carries error, count exists on exact-count queries).
interface QueryOutcome<T> {
  data: T | null
  error: { message: string } | null
  count: number | null
}

async function response<T>(query: PromiseLike<QueryOutcome<T>>, fallback: T | number | null = null): Promise<T | number | null> {
  const { data, error, count } = await query
  if (error) throw failure(error.message, 502)
  return count ?? data ?? fallback
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

export interface NotificationDb {
  readNotifications(params: { token: string; userId: string; limit: number }): Promise<NotificationItem[]>
  countUnreadNotifications(params: { token: string; userId: string }): Promise<number | null>
  markNotificationsRead(params: { token: string; userId: string; ids: string[] | null; readAt: string }): Promise<void>
  readNotificationPrefs(params: { token: string; userId: string }): Promise<Record<string, unknown>>
  writeNotificationPrefs(params: { token?: string; userId: string; prefs: Record<string, unknown> }): Promise<void>
}

export function createNotificationDb({
  readProvider,
  writeProvider
}: {
  readProvider: ReadOnlySupabaseProvider
  writeProvider: UserSupabaseWriteProvider
}): NotificationDb {
  return {
    async readNotifications({ token, userId, limit }) {
      return (await response<NotificationItem[]>(readProvider.forUser(token).from('notifications')
        .select('id, type, title, body, href, read_at, created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit), [])) as NotificationItem[]
    },
    async countUnreadNotifications({ token, userId }) {
      const { error, count } = await readProvider.forUser(token).from('notifications')
        .select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null)
      if (error) throw failure(error.message, 502)
      return count
    },
    async markNotificationsRead({ token, userId, ids, readAt }) {
      let query = writeProvider.forUser(token).from('notifications')
        .update({ read_at: readAt }).eq('user_id', userId).is('read_at', null)
      if (ids) query = query.in('id', ids)
      await response(query)
    },
    async readNotificationPrefs({ token, userId }) {
      const row = (await response<{ notification_prefs: Json } | null>(readProvider.forUser(token).from('user_profiles')
        .select('notification_prefs').eq('user_id', userId).maybeSingle(), null)) as { notification_prefs?: unknown } | null
      return (row?.notification_prefs || {}) as Record<string, unknown>
    },
    async writeNotificationPrefs({ token, userId, prefs }) {
      await response(writeProvider.forUser(token).from('user_profiles')
        .update({ notification_prefs: prefs as Json }).eq('user_id', userId))
    }
  }
}

export interface NotificationService {
  list(params: { userId: string; token: string }): Promise<{ notifications: NotificationItem[]; unreadCount: number }>
  markRead(params: { userId: string; token: string; ids?: unknown; all?: boolean }): Promise<{ ok: true }>
  preferences(params: { userId: string; token: string }): Promise<{ prefs: NotificationPrefs }>
  savePreferences(params: { userId: string; token?: string; input?: Record<string, unknown> }): Promise<{ ok: true; prefs: NotificationPrefs }>
}

export function createNotificationService({
  config,
  db,
  now = () => new Date()
}: {
  config: Pick<BackendConfig, 'dormant'>
  db: NotificationDb
  now?: () => Date
}): NotificationService {
  return {
    async list({ userId, token }) {
      const [notifications, unreadCount] = await Promise.all([
        db.readNotifications({ userId, token, limit: 30 }),
        db.countUnreadNotifications({ userId, token })
      ])
      return { notifications: notifications || [], unreadCount: Number(unreadCount || 0) }
    },
    async markRead({ userId, token, ids, all = false }) {
      assertDormantRead(config, 'notifications.mark-read')
      const safeIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id) : []
      if (!all && !safeIds.length) throw failure('ids or all required', 400)
      await db.markNotificationsRead({
        userId, token,
        ids: all ? null : safeIds,
        readAt: now().toISOString()
      })
      return { ok: true }
    },
    async preferences({ userId, token }) {
      return { prefs: normalizeNotificationPrefs(await db.readNotificationPrefs({ userId, token })) }
    },
    async savePreferences({ userId, token, input }) {
      assertDormantRead(config, 'notifications.preferences')
      const patch = notificationPrefsPatch(input)
      if (!Object.keys(patch).length) throw failure('No valid preference keys', 400)
      const stored = await db.readNotificationPrefs({ userId, token: token as string })
      const merged = { ...(stored || {}), ...patch }
      await db.writeNotificationPrefs({
        userId,
        ...(token === undefined ? {} : { token }),
        prefs: merged
      })
      return { ok: true, prefs: normalizeNotificationPrefs(merged) }
    }
  }
}

export function registerNotificationRoutes(
  app: FastifyInstance,
  { identity, service }: { identity: IdentityProvider; service: NotificationService }
): void {
  const noCache = (reply: FastifyReply) => reply
    .header('Cache-Control', 'no-store, no-cache, private, max-age=0, must-revalidate')
    .header('Pragma', 'no-cache').header('Vary', 'Authorization')
  const run = async (
    request: FastifyRequest,
    reply: FastifyReply,
    work: (session: ResolvedIdentity) => unknown,
    cache = false
  ) => {
    try {
      const session = await identity.resolveUser(request)
      if (cache) noCache(reply)
      return reply.send(await work(session))
    } catch (error) {
      const err = error as { statusCode?: number; message?: string }
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  }
  app.get('/v1/notifications/list', { config: { rateLimit: { maxRequests: 60, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.list({ userId: session.userId, token: session.token }), true))
  app.patch<{ Body: { ids?: unknown; all?: unknown } }>('/v1/notifications/list', { config: { rateLimit: { maxRequests: 60, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.markRead({
      userId: session.userId, token: session.token, ids: request.body?.ids, all: request.body?.all === true
    })))
  app.get('/v1/notifications/prefs', { config: { rateLimit: { maxRequests: 30, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.preferences({ userId: session.userId, token: session.token }), true))
  app.post<{ Body: Record<string, unknown> }>('/v1/notifications/prefs', { config: { rateLimit: { maxRequests: 30, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.savePreferences({ userId: session.userId, token: session.token, input: request.body })))
}
