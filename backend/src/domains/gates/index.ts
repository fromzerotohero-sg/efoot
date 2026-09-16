import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { BackendConfig } from '../../config.js'
import { assertDormantRead } from '../../dormant.js'
import type { HttpError, IdentityProvider } from '../../types.js'

export const PRELAUNCH_COOKIE_NAME = 'fzth_prelaunch_access'
export const PRELAUNCH_AUTH_COOKIE_NAME = 'fzth_prelaunch_auth'
export const MAINTENANCE_COOKIE_NAME = 'fzth_maintenance_bypass'

export function parseCookies(header = ''): Record<string, string> {
  return Object.fromEntries(String(header).split(';').map((part): [string, string] => {
    const index = part.indexOf('=')
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
  }).filter(([key]) => key))
}

export interface GateCookieOptions {
  secure?: boolean
  clear?: boolean
  maxAge?: number
}

export function gateCookie(name: string, value: string, { secure = false, clear = false, maxAge }: GateCookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (secure) parts.push('Secure')
  if (clear) parts.push('Max-Age=0')
  else if (maxAge != null) parts.push(`Max-Age=${maxAge}`)
  return parts.join('; ')
}

function failure(message: string, statusCode: number): HttpError {
  return Object.assign(new Error(message), { statusCode })
}

export interface GateServiceOptions {
  config: Pick<BackendConfig, 'dormant'>
  prelaunchEnabled?: boolean
  prelaunchCode?: string
  maintenanceEnabled?: boolean
  maintenanceKey?: string
  secureCookies?: boolean
}

export interface GateResult {
  body: Record<string, unknown>
  cookies: string[]
}

export interface PrelaunchStatus {
  gateEnabled: boolean
  isAuthenticated: boolean
  hasAccess: boolean
}

export interface MaintenanceStatus {
  maintenanceEnabled: boolean
  hasBypass: boolean
}

export interface GateService {
  prelaunchStatus(params: { cookieHeader?: string }): PrelaunchStatus
  prelaunchUnlock(params: { code?: unknown }): GateResult
  prelaunchSession(params: { request: FastifyRequest; identity: IdentityProvider }): Promise<GateResult>
  prelaunchLogout(): GateResult
  maintenanceStatus(params: { cookieHeader?: string }): MaintenanceStatus
  maintenanceUnlock(params: { key?: unknown }): GateResult
}

export function createGateService({
  config,
  prelaunchEnabled = false,
  prelaunchCode = '',
  maintenanceEnabled = false,
  maintenanceKey = '',
  secureCookies = false
}: GateServiceOptions): GateService {
  return {
    prelaunchStatus({ cookieHeader }) {
      const cookies = parseCookies(cookieHeader)
      return {
        gateEnabled: prelaunchEnabled,
        isAuthenticated: cookies[PRELAUNCH_AUTH_COOKIE_NAME] === 'granted',
        hasAccess: !prelaunchEnabled || cookies[PRELAUNCH_COOKIE_NAME] === 'granted'
      }
    },
    prelaunchUnlock({ code }) {
      assertDormantRead(config, 'gates.prelaunch.unlock')
      if (prelaunchEnabled) {
        if (!String(code || '').trim()) throw failure('Access code required', 400)
        if (String(code).trim() !== String(prelaunchCode).trim()) throw failure('Invalid access code', 403)
      }
      return {
        body: { success: true, gateEnabled: prelaunchEnabled },
        cookies: [gateCookie(PRELAUNCH_COOKIE_NAME, 'granted', { secure: secureCookies })]
      }
    },
    async prelaunchSession({ request, identity }) {
      assertDormantRead(config, 'gates.prelaunch.session')
      await identity.resolveUser(request)
      return {
        body: { success: true },
        cookies: [gateCookie(PRELAUNCH_AUTH_COOKIE_NAME, 'granted', { secure: secureCookies })]
      }
    },
    prelaunchLogout() {
      assertDormantRead(config, 'gates.prelaunch.logout')
      return {
        body: { success: true },
        cookies: [
          gateCookie(PRELAUNCH_AUTH_COOKIE_NAME, '', { secure: secureCookies, clear: true }),
          gateCookie(PRELAUNCH_COOKIE_NAME, '', { secure: secureCookies, clear: true })
        ]
      }
    },
    maintenanceStatus({ cookieHeader }) {
      const cookies = parseCookies(cookieHeader)
      return {
        maintenanceEnabled,
        hasBypass: !maintenanceEnabled || cookies[MAINTENANCE_COOKIE_NAME] === 'granted'
      }
    },
    maintenanceUnlock({ key }) {
      assertDormantRead(config, 'gates.maintenance.unlock')
      if (maintenanceEnabled && !String(maintenanceKey).trim()) throw failure('Maintenance bypass not configured', 503)
      if (maintenanceEnabled && !String(key || '').trim()) throw failure('Access key required', 400)
      if (maintenanceEnabled && String(key).trim() !== String(maintenanceKey).trim()) throw failure('Invalid access key', 403)
      return {
        body: { success: true, maintenanceEnabled },
        cookies: [gateCookie(MAINTENANCE_COOKIE_NAME, 'granted', {
          secure: secureCookies, maxAge: 60 * 60 * 24 * 14
        })]
      }
    }
  }
}

export function registerGateRoutes(
  app: FastifyInstance,
  { service, identity }: { service: GateService; identity: IdentityProvider }
): void {
  const send = (reply: FastifyReply, result: GateResult | PrelaunchStatus | MaintenanceStatus) => {
    const withCookies = result as Partial<GateResult>
    if (withCookies.cookies) reply.header('Set-Cookie', withCookies.cookies)
    return reply.send(withCookies.body || result)
  }
  const handle = async (reply: FastifyReply, work: () => unknown) => {
    try { return send(reply, await work() as GateResult) } catch (error) {
      const err = error as { statusCode?: number; message?: string }
      return reply.code(err.statusCode || 500).send({ error: err.message })
    }
  }
  app.get('/v1/gates/prelaunch/status', async (request, reply) =>
    send(reply, service.prelaunchStatus({ cookieHeader: request.headers.cookie })))
  app.post<{ Body: { code?: unknown } }>('/v1/gates/prelaunch/unlock', async (request, reply) =>
    handle(reply, () => service.prelaunchUnlock({ code: request.body?.code })))
  app.post('/v1/gates/prelaunch/logout', async (_request, reply) =>
    handle(reply, () => service.prelaunchLogout()))
  app.get('/v1/gates/maintenance/status', async (request, reply) =>
    send(reply, service.maintenanceStatus({ cookieHeader: request.headers.cookie })))
  app.post<{ Body: { key?: unknown } }>('/v1/gates/maintenance/unlock', async (request, reply) =>
    handle(reply, () => service.maintenanceUnlock({ key: request.body?.key })))
}
