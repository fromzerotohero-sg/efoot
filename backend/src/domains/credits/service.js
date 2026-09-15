export const CREDITS_INCLUDED_DEFAULT = 0

export function currentPeriodKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

const numberOr = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function domainError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function normalizeUsage(row, periodKey) {
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

function aggregateValue(result) {
  return numberOr(result?.data?.[0]?.sum ?? result?.data?.[0]?.amount?.sum)
}

export function createCreditReadService(readOnlyProvider, options = {}) {
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
      return normalizeUsage(result.error ? null : result.data, periodKey)
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
        client.from('credit_transactions').select('amount.sum()')
          .eq('user_id', userId).eq('type', 'purchase'),
        client.from('credit_transactions').select('amount.sum()')
          .eq('user_id', userId).eq('type', 'usage'),
        client.from('matches').select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ])
      if (recent.error) throw domainError('Error loading transactions')
      const purchased = Math.max(0, aggregateValue(purchases))
      const rawUsed = aggregateValue(usages)
      const used = Math.abs(rawUsed)
      return {
        transactions: recent.data || [],
        total_analyses: Number.isFinite(analyses.count) ? analyses.count : 0,
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
