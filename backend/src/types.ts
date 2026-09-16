import type { FastifyRequest } from 'fastify'
import type { User } from '@supabase/supabase-js'
import type { OpenAiProvider } from './openai.js'
import type {
  ReadOnlySupabaseProvider,
  ServerSupabaseWriteProvider,
  UserSupabaseWriteProvider
} from './readOnlySupabase.js'

// Session shape produced by auth.js identity providers (auth.js stays plain JS
// as Tommaso's MetalGate perimeter; these are its compile-time contracts).
export interface ResolvedIdentity {
  token: string
  user: User | { id: string }
  userId: string
}

export interface IdentityProvider {
  name: string
  resolveUser(request: FastifyRequest): Promise<ResolvedIdentity>
}

export interface HttpError extends Error {
  statusCode: number
}

// Provider contracts for providers.js (also plain JS by owner decision).
export interface CreditOperationInput {
  capability?: string
  idempotencyKey?: string
}

export interface CreditBalance {
  spendable: number
  mock: boolean
}

export interface CreditDeductResult {
  ok: boolean
  mock: boolean
  applied: boolean
  remaining: number
}

export interface CreditMutationResult {
  ok: boolean
  mock: boolean
  applied: boolean
}

export interface MockCreditLedgerEntry {
  type: 'deduct' | 'refund' | 'accredit'
  capability?: string
  idempotencyKey?: string
  applied: boolean
}

// TODO(ts): unify with the real MetalGate credit contract when domains convert.
export interface MockCreditProvider {
  name: string
  balance(): Promise<CreditBalance>
  deduct(input: CreditOperationInput): Promise<CreditDeductResult>
  refund(input: CreditOperationInput): Promise<CreditMutationResult>
  accredit(input: CreditOperationInput): Promise<CreditMutationResult>
  snapshot(): MockCreditLedgerEntry[]
}

export interface MetalGateCreditProvider {
  name: string
  balance(): Promise<never>
  deduct(): Promise<never>
  refund(): Promise<never>
}

export interface SupabaseProvider {
  name: string
  query(): Promise<never>
  mutate(): Promise<never>
}

export interface Providers {
  identity: IdentityProvider
  metalgateIdentity: IdentityProvider
  credits: MockCreditProvider
  metalgateCredits: MetalGateCreditProvider
  openai: OpenAiProvider
  supabase: SupabaseProvider
  readOnlySupabase: ReadOnlySupabaseProvider
  userSupabaseWrites: UserSupabaseWriteProvider
  serverSupabaseWrites: ServerSupabaseWriteProvider
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: ResolvedIdentity
  }
}

// Repo-root lib/*.js used by domains is covered via // @ts-nocheck on those files
// (paths sit outside backend rootDir; ambient relative declare module paths conflict with tsc).
