// @ts-nocheck
import { buildCardAvailabilityBlock } from '../../../../lib/chatCardAvailability.js'

export function createHeroCardAvailability({ readProvider }) {
  if (!readProvider) throw new TypeError('readProvider is required')

  return async function heroCardAvailability({ token, message, lang }) {
    const client = readProvider.forUser(token)
    return buildCardAvailabilityBlock({
      admin: client,
      message,
      lang
    })
  }
}
