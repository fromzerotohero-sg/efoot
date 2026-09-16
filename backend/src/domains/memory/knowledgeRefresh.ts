// @ts-nocheck
const NOOP_RESULT = Object.freeze({ scheduled: false, reason: 'disabled' })

export type KnowledgeRefreshSideEffect = {
  enabled: boolean
  schedule: (input?: { userId?: string; token?: string; source?: string }) =>
    | { scheduled: false; reason: string }
    | { scheduled: true }
}

export function createKnowledgeRefreshSideEffect({
  live = false,
  refresh = null,
  logger = console
} = {}): KnowledgeRefreshSideEffect {
  const enabled = live === true && typeof refresh === 'function'

  return {
    enabled,

    schedule({ userId, token, source = 'unknown' } = {}) {
      if (!enabled || !userId) return NOOP_RESULT

      queueMicrotask(() => {
        const input = token === undefined
          ? { userId, source }
          : { userId, token, source }
        Promise.resolve()
          .then(() => refresh(input))
          .catch((error) => {
            logger?.warn?.(
              `[knowledge-refresh] ${source} failed (non-blocking):`,
              error?.message || error
            )
          })
      })

      return { scheduled: true }
    }
  }
}

export function createDisabledKnowledgeRefreshSideEffect(): KnowledgeRefreshSideEffect {
  return createKnowledgeRefreshSideEffect()
}
