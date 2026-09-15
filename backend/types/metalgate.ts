/**
 * MetalGate contract on the eFootball Supabase.
 * Generated 2026-09-15 from production. Backend is dormant: types only, no live cutover.
 *
 * Wallet HP lives in MetalGate, not as a column on user_profiles.
 * This file is the subset Tommaso owns. Full schema: ./database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Link SSO MetalGate ↔ utente locale. `metalgate_user_id` is UNIQUE. */
export type UserProfileMetalGateLink = {
  user_id: string
  metalgate_user_id: string | null
  is_metalgate_user: boolean | null
}

/** Ledger locale (storico in-app). Non è il saldo wallet. */
export type CreditTransaction = {
  id: string
  user_id: string
  amount: number
  type: string
  description: string | null
  reference_id: string | null
  created_at: string
}

/** Uso mensile locale. period_key = YYYY-MM UTC. credits_included default 0. */
export type UserCreditUsage = {
  id: string
  user_id: string
  period_key: string
  credits_used: number
  credits_included: number
  created_at: string
  updated_at: string
}

export type CreditErrorLog = {
  id: string
  user_id: string | null
  operation_type: string | null
  cosa: string
  errore_testo: string | null
  funzione: string | null
  error_code: string | null
  is_refundable: boolean
  refund_applied: boolean
  metadata: Json
  created_at: string
}

/** RPC pagamenti: email → auth.users.id. Must NOT be executable by anon. */
export type GetUserIdByEmail = {
  Args: { user_email: string }
  Returns: string
}

export const METALGATE_PLACEHOLDERS = {
  identity: 'MetalGateIdentityProvider.resolveUser NOT IMPLEMENTED',
  credits: 'MetalGateCreditProvider.balance|deduct|refund NOT IMPLEMENTED',
  routes: [
    'auth.metalgate.callback',
    'auth.metalgate.verify',
    'auth.metalgate.sync',
    'credits.accredit'
  ]
} as const

export const METALGATE_UPSTREAM = {
  verify: 'POST {METALGATE_API}/sso/verify',
  userInfo: 'POST {METALGATE_API}/sso/user-info',
  balance: 'POST {METALGATE_API}/internal/balance',
  deduct: 'POST {METALGATE_API}/internal/deduct',
  accreditInternal: 'POST {METALGATE_API}/internal/accredit',
  addWallet: 'POST https://api.fromzerotohero.io/api/user/add'
} as const
