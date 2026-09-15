import { assertDormantRead } from '../../dormant.js'

export const NOTIFICATION_PREF_KEYS = ['weekly_goals', 'credits', 'leaderboard', 'coach']
export const DEFAULT_NOTIFICATION_PREFS = Object.freeze(
  Object.fromEntries(NOTIFICATION_PREF_KEYS.map((key) => [key, true]))
)

export function normalizeNotificationPrefs(stored = {}) {
  const result = { ...DEFAULT_NOTIFICATION_PREFS }
  for (const key of NOTIFICATION_PREF_KEYS) {
    if (typeof stored?.[key] === 'boolean') result[key] = stored[key]
  }
  return result
}

export function notificationPrefsPatch(input = {}) {
  const result = {}
  for (const key of NOTIFICATION_PREF_KEYS) {
    if (typeof input?.[key] === 'boolean') result[key] = input[key]
  }
  return result
}

function failure(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

async function response(query, fallback = null) {
  const { data, error, count } = await query
  if (error) throw failure(error.message, 502)
  return count ?? data ?? fallback
}

export function createNotificationDb({ readProvider, writeProvider }) {
  return {
    async readNotifications({ token, userId, limit }) {
      return response(readProvider.forUser(token).from('notifications')
        .select('id, type, title, body, href, read_at, created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }).limit(limit), [])
    },
    async countUnreadNotifications({ token, userId }) {
      return response(readProvider.forUser(token).from('notifications')
        .select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null), 0)
    },
    async markNotificationsRead({ token, userId, ids, readAt }) {
      let query = writeProvider.forUser(token).from('notifications')
        .update({ read_at: readAt }).eq('user_id', userId).is('read_at', null)
      if (ids) query = query.in('id', ids)
      await response(query)
    },
    async readNotificationPrefs({ token, userId }) {
      const row = await response(readProvider.forUser(token).from('user_profiles')
        .select('notification_prefs').eq('user_id', userId).maybeSingle(), null)
      return row?.notification_prefs || {}
    },
    async writeNotificationPrefs({ token, userId, prefs }) {
      await response(writeProvider.forUser(token).from('user_profiles')
        .update({ notification_prefs: prefs }).eq('user_id', userId))
    }
  }
}

export function createNotificationService({ config, db, now = () => new Date() }) {
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
      const stored = await db.readNotificationPrefs({ userId, token })
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

export function registerNotificationRoutes(app, { identity, service }) {
  const noCache = (reply) => reply
    .header('Cache-Control', 'no-store, no-cache, private, max-age=0, must-revalidate')
    .header('Pragma', 'no-cache').header('Vary', 'Authorization')
  const run = async (request, reply, work, cache = false) => {
    try {
      const session = await identity.resolveUser(request)
      if (cache) noCache(reply)
      return reply.send(await work(session))
    } catch (error) {
      return reply.code(error.statusCode || 500).send({ error: error.message })
    }
  }
  app.get('/v1/notifications/list', { config: { rateLimit: { maxRequests: 60, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.list({ userId: session.userId, token: session.token }), true))
  app.patch('/v1/notifications/list', { config: { rateLimit: { maxRequests: 60, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.markRead({
      userId: session.userId, token: session.token, ids: request.body?.ids, all: request.body?.all === true
    })))
  app.get('/v1/notifications/prefs', { config: { rateLimit: { maxRequests: 30, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.preferences({ userId: session.userId, token: session.token }), true))
  app.post('/v1/notifications/prefs', { config: { rateLimit: { maxRequests: 30, windowMs: 60000 } } }, async (request, reply) =>
    run(request, reply, (session) => service.savePreferences({ userId: session.userId, token: session.token, input: request.body })))
}
