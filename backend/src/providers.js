import { createSupabaseIdentityProvider } from './auth.js'
import {
  createReadOnlySupabaseProvider,
  createServerSupabaseWriteProvider,
  createUserSupabaseWriteProvider
} from './readOnlySupabase.js'
import { createOpenAiProvider } from './openai.js'

export class NotImplementedProviderError extends Error {
  constructor(provider, method) {
    super(`${provider}.${method} is NOT IMPLEMENTED`)
    this.name = 'NotImplementedProviderError'
    this.provider = provider
    this.method = method
    this.statusCode = 501
  }
}

export function createIdentityProvider() {
  return {
    name: 'MetalGateIdentityProvider',
    async resolveUser() {
      throw new NotImplementedProviderError('MetalGateIdentityProvider', 'resolveUser')
    }
  }
}

export function createMetalGateCreditProvider() {
  return {
    name: 'MetalGateCreditProvider',
    async balance() {
      throw new NotImplementedProviderError('MetalGateCreditProvider', 'balance')
    },
    async deduct() {
      throw new NotImplementedProviderError('MetalGateCreditProvider', 'deduct')
    },
    async refund() {
      throw new NotImplementedProviderError('MetalGateCreditProvider', 'refund')
    }
  }
}

export function createMockCreditProvider() {
  const ledger = []
  return {
    name: 'MockCreditProvider',
    async balance() {
      return { spendable: 0, mock: true }
    },
    async deduct({ capability, idempotencyKey }) {
      ledger.push({ type: 'deduct', capability, idempotencyKey, applied: false })
      return { ok: true, mock: true, applied: false, remaining: 0 }
    },
    async refund({ capability, idempotencyKey }) {
      ledger.push({ type: 'refund', capability, idempotencyKey, applied: false })
      return { ok: true, mock: true, applied: false }
    },
    async accredit({ capability, idempotencyKey }) {
      ledger.push({ type: 'accredit', capability, idempotencyKey, applied: false })
      return { ok: true, mock: true, applied: false }
    },
    snapshot() {
      return ledger.slice()
    }
  }
}

export function createSupabaseProvider(config) {
  return {
    name: 'SupabaseProvider',
    async query() {
      if (config.dormant) {
        const error = new Error('Supabase access is read-only and not wired in dormant slice 1')
        error.statusCode = 403
        throw error
      }
      const error = new Error('Supabase provider is not wired in this slice')
      error.statusCode = 501
      throw error
    },
    async mutate() {
      const error = new Error(config.dormant
        ? 'Supabase writes are forbidden in dormant mode'
        : 'Supabase provider is not wired in this slice')
      error.statusCode = config.dormant ? 403 : 501
      throw error
    }
  }
}

export function createProviders(config) {
  return {
    identity: createSupabaseIdentityProvider(config),
    metalgateIdentity: createIdentityProvider(),
    credits: createMockCreditProvider(),
    metalgateCredits: createMetalGateCreditProvider(),
    openai: createOpenAiProvider(config),
    supabase: createSupabaseProvider(config),
    readOnlySupabase: createReadOnlySupabaseProvider(config),
    userSupabaseWrites: createUserSupabaseWriteProvider(config),
    serverSupabaseWrites: createServerSupabaseWriteProvider(config)
  }
}
