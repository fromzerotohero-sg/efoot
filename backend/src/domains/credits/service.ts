import type { ReadOnlySupabaseProvider } from '../../readOnlySupabase.js'
import type { HttpError } from '../../types.js'
import type { Database } from '../../types/database.js'

export const CREDITS_INCLUDED_DEFAULT = 0

export type CreditTransactionRow = Pick<
  Database['public']['Tables']['credit_transactions']['Row'],
  'id' | 'amount' | 'type' | 'description' | 'reference_id' | 'created_at'
>

export interface CreditUsageRow {
  credits_used?: number | null
  credits_included?: number | null
  period_key?: string | null
  temp_balance?: number | null
}

export interface NormalizedUsage {
  period_key: string
  credits_used: number
  credits_included: number
  balance_remaining: number
  temp_balance: number
  overage: number
  percent_used: number
  percent_used_raw: number
}

export interface CreditTransactionsResult {
  transactions: CreditTransactionRow[]
  total_analyses: number
  summary: {
    purchased_total: number
    used_total: number
    balance_total: number
    overage_total: number
  }
}

export function currentPeriodKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

const numberOr = (value: unknown, fallback = 0): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function domainError(message: string, statusCode = 500): HttpError {
  const error = new Error(message) as HttpError
  error.statusCode = statusCode
  return error
}

export function normalizeUsage(row: CreditUsageRow | null | undefined, periodKey: string): NormalizedUsage {
  const used = numberOr(row?.credits_used)
  const included = Math.max(0, numberOr(row?.credits_included, CREDITS_INCLUDED_DEFAULT))
  const temp = Math.max(0, numberOr(row?.temp_balance))
  const rawPercent = included > 0 ? Math.round((used / included) * 100) : 0
  return {
    period_key: String(row?.period_key || periodKey),
    credits_used: used,
    credits_included: included,
    balance_remaining: Math.max(0, included - used) + temp,
    temp_balance: temp,
    overage: Math.max(0, used - included),
    percent_used: Math.min(100, rawPercent),
    percent_used_raw: rawPercent
  }
}

function aggregateValue(result: { data?: unknown }): number {
  const rows = result?.data as Array<{ sum?: unknown; amount?: { sum?: unknown } }> | null | undefined
  return numberOr(rows?.[0]?.sum ?? rows?.[0]?.amount?.sum)
}

export interface CreditReadService {
  usage(params: { token: string; userId: string }): Promise<NormalizedUsage>
  transactions(params: { token: string; userId: string; limit?: number }): Promise<CreditTransactionsResult>
}

export function createCreditReadService(
  readOnlyProvider: ReadOnlySupabaseProvider,
  options: { now?: () => Date } = {}
): CreditReadService {
  const now = options.now || (() => new Date())
  return {
    async usage({ token, userId }) {
      const periodKey = currentPeriodKey(now())
      const result = await readOnlyProvider.forUser(token)
        .from('user_credit_usage')
        .select('credits_used, credits_included, period_key')
        .eq('user_id', userId)
        .eq('period_key', periodKey)
        .maybeSingle()
      return normalizeUsage(result.error ? null : (result.data as CreditUsageRow | null), periodKey)
    },

    async transactions({ token, userId, limit = 20 }) {
      const client = readOnlyProvider.forUser(token)
      const boundedLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
        ? Math.min(Math.trunc(Number(limit)), 50)
        : 20
      const [recent, purchases, usages, analyses] = await Promise.all([
        client.from('credit_transactions')
          .select('id, amount, type, description, reference_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(boundedLimit),
        client.from('credit_transactions').select('amount.sum()' as 'amount')
          .eq('user_id', userId).eq('type', 'purchase'),
        client.from('credit_transactions').select('amount.sum()' as 'amount')
          .eq('user_id', userId).eq('type', 'usage'),
        client.from('matches').select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ])
      if (recent.error) throw domainError('Error loading transactions')
      const purchased = Math.max(0, aggregateValue(purchases as { data?: unknown }))
      const rawUsed = aggregateValue(usages as { data?: unknown })
      const used = Math.abs(rawUsed)
      return {
        transactions: (recent.data || []) as CreditTransactionRow[],
        total_analyses: Number.isFinite(analyses.count) ? (analyses.count as number) : 0,
        summary: {
          purchased_total: Math.floor(purchased),
          used_total: Math.floor(used),
          balance_total: Math.max(0, Math.floor(purchased - used)),
          overage_total: Math.max(0, Math.floor(used - purchased))
        }
      }
    }
  }
}
