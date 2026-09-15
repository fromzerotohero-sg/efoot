import type { FastifyError, FastifyInstance } from 'fastify'
import type { BackendConfig } from './config.js'
import type { RouteInventoryItem } from './inventory.js'

export class DormantError extends Error {
  statusCode: number
  extra: Record<string, unknown>

  constructor(message: string, extra: Record<string, unknown> = {}) {
    super(message)
    this.name = 'DormantError'
    this.statusCode = 403
    this.extra = extra
  }
}

export function assertDormantRead(config: Pick<BackendConfig, 'dormant'>, action = 'write'): void {
  if (config.dormant) {
    throw new DormantError(`Blocked in dormant mode: ${action}`, {
      dormant: true,
      action
    })
  }
}

export interface DormantPayload {
  ok: false
  dormant: true
  action: string
  capability: string
  domain: string
  status: RouteInventoryItem['status']
  source: string
  mutating: boolean
  credits: boolean
  note: string | null
  message: string
}

export function dormantPayload(item: RouteInventoryItem, action = 'invoke'): DormantPayload {
  return {
    ok: false,
    dormant: true,
    action,
    capability: item.capability,
    domain: item.domain,
    status: item.status,
    source: item.source,
    mutating: Boolean(item.mutating),
    credits: Boolean(item.credits),
    note: item.note || null,
    message: item.status === 'legacy-do-not-migrate'
      ? 'This route is not used by the active product UX and is intentionally not exposed.'
      : item.status === 'deferred-metalgate'
        ? 'MetalGate is deferred to Tommaso. Placeholder only.'
        : 'Dormant backend: no production traffic, no writes, no credit side effects.'
  }
}

export function installDormantGuard(app: FastifyInstance, config: BackendConfig): void {
  app.addHook('onRequest', async (request, reply) => {
    const url = request.url.split('?')[0]
    if (url === '/health' || url === '/version' || url === '/inventory' || url === '/ready' || url === '/handoff/metalgate') return
    if (!config.dormant) return
    if (request.method === 'GET' || request.method === 'HEAD') return
    return reply.code(403).send({
      ok: false,
      dormant: true,
      error: 'Mutating requests are forbidden while BACKEND_MODE=dormant',
      method: request.method,
      url
    })
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof DormantError) {
      return reply.code(error.statusCode).send({
        ok: false,
        error: error.message,
        ...error.extra
      })
    }
    request.log.error(error)
    return reply.code(error.statusCode || 500).send({
      ok: false,
      error: error.message || 'Internal error'
    })
  })
}
