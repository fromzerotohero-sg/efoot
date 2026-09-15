const NOOP_RESULT = Object.freeze({ scheduled: false, reason: 'disabled' })

export function createKnowledgeRefreshSideEffect({
  live = false,
  refresh = null,
  logger = console
} = {}) {
  const enabled = live === true && typeof refresh === 'function'

  return {
    enabled,

    schedule({ userId, source = 'unknown' } = {}) {
      if (!enabled || !userId) return NOOP_RESULT

      queueMicrotask(() => {
        Promise.resolve()
          .then(() => refresh({ userId, source }))
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

export function createDisabledKnowledgeRefreshSideEffect() {
  return createKnowledgeRefreshSideEffect()
}
