/**
 * Servizio crediti: tracciamento utilizzo OpenAI per utente/periodo (mensile).
 * Usato dalle route che chiamano OpenAI e dalla API GET /api/credits/usage.
 * Enterprise: non blocca la risposta se il tracciamento fallisce (fire-and-forget).
 * Doc: docs/SISTEMA_CREDITI_AI.md (Supabase + codice + flusso).
 */

/**
 * Crediti inclusi di default (nuovi utenti / periodo senza acquisto).
 * Legge da env CREDITS_INCLUDED_DEFAULT (es. 10000 per test); se assente o non valido = 200.
 * In produzione, quando collegato al sito pagamenti, lasciare 200 o non impostare la variabile.
 */
function getCreditsIncludedDefault() {
  const raw = typeof process !== 'undefined' && process.env && process.env.CREDITS_INCLUDED_DEFAULT
  const n = raw != null && raw !== '' ? parseInt(String(raw), 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 200
}
export const CREDITS_INCLUDED_DEFAULT = getCreditsIncludedDefault()

/** Costo standard per chiamata AI (richiesto: 2 crediti) */
export const AI_COST = 2

/** Pesi in crediti per operazione (Legacy: sovrascritti da AI_COST dove applicabile, ma mantenuti per reference) */
export const CREDIT_WEIGHTS = {
  'assistant-chat': AI_COST,
  'coach-feedback-chat': AI_COST,
  'save-coach-feedback': AI_COST,
  'extract-player': AI_COST,
  'extract-coach': AI_COST,
  'extract-match-data': AI_COST,
  'generate-countermeasures': AI_COST,
  'extract-formation': AI_COST,
  'extract-game-analysis': AI_COST,
  'analyze-match': AI_COST
}

/**
 * Restituisce la chiave periodo per il mese corrente (YYYY-MM) in UTC.
 * UTC evita mismatch tra server (es. Vercel UTC) e righe scritte in altro fuso:
 * stesso period_key ovunque per lettura/scrittura.
 * @returns {string}
 */
export function getCurrentPeriodKey() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Restituisce la chiave periodo del mese precedente (YYYY-MM) in UTC.
 * @returns {string}
 */
function getPreviousPeriodKey() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() // 0-11
  const prevY = m === 0 ? y - 1 : y
  const prevM = m === 0 ? 11 : m - 1
  return `${prevY}-${String(prevM + 1).padStart(2, '0')}`
}

/**
 * Helper per fetch con retry (esponenziale).
 */
async function fetchWithRetry(url, options, retries = 3, backoff = 300) {
  try {
    const res = await fetch(url, options)
    if (res.ok) return res
    // Retry su errori server o rate limit
    if (retries > 0 && (res.status >= 500 || res.status === 429)) {
      await new Promise(r => setTimeout(r, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
    return res
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
    throw err
  }
}

/**
 * Risolve il MetalGate User ID dato il Supabase User ID locale.
 * Cerca in user_profiles.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function resolveMetalgateId(admin, userId) {
  if (!admin || !userId) return null
  try {
    const { data, error } = await admin
      .from('user_profiles')
      .select('metalgate_user_id')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[creditService] resolveMetalgateId error:', error.message)
      }
      return null
    }
    return data?.metalgate_user_id || null
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[creditService] resolveMetalgateId exception:', err)
    }
    return null
  }
}

/**
 * Ottiene il saldo da MetalGate.
 * @param {string} metalgateUserId
 * @returns {Promise<number|null>} Saldo o null se errore
 */
async function getMetalGateBalance(metalgateUserId) {
  if (!metalgateUserId || !process.env.NEXT_PUBLIC_METALGATE_API_URL || !process.env.METALGATE_API_KEY) {
    return null
  }
  try {
    const metalgateUrl = process.env.NEXT_PUBLIC_METALGATE_API_URL.replace(/\/+$/, '')
    const res = await fetchWithRetry(`${metalgateUrl}/internal/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': process.env.METALGATE_API_KEY
      },
      body: JSON.stringify({ user_id: metalgateUserId })
    })
    
    if (res.ok) {
      const data = await res.json()
      return typeof data.balance === 'number' ? data.balance : null
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('[creditService] MetalGate balance check failed:', res.status)
    }
    return null
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[creditService] MetalGate balance exception:', err)
    }
    return null
  }
}

/**
 * Restituisce l'utilizzo crediti.
 * Per MetalGate, recupera il saldo reale.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {{ currentPeriodOnly?: boolean, metalgateUserId?: string }} [opts]
 * @returns {Promise<{ period_key: string, credits_used: number, credits_included: number, overage: number }>}
 */
export async function getCurrentUsage(admin, userId, opts = {}) {
  const periodKey = getCurrentPeriodKey()
  const currentPeriodOnly = opts.currentPeriodOnly === true
  
  // Se è utente MetalGate, prendi saldo remoto
  if (opts.metalgateUserId) {
    const remoteBalance = await getMetalGateBalance(opts.metalgateUserId)
    if (remoteBalance !== null) {
      // Mappiamo il saldo remoto come "credits_included" e "credits_used" a 0
      // Così il saldo rimanente (included - used) è corretto (= remoteBalance)
      return {
        period_key: periodKey,
        credits_used: 0,
        credits_included: remoteBalance,
        overage: 0
      }
    }
  }

  const fallback = {
    period_key: periodKey,
    credits_used: 0,
    credits_included: CREDITS_INCLUDED_DEFAULT,
    overage: 0
  }
  if (!admin || !userId) return fallback

  try {
    const { data, error } = await admin
      .from('user_credit_usage')
      .select('credits_used, credits_included, period_key')
      .eq('user_id', userId)
      .eq('period_key', periodKey)
      .maybeSingle()

    // console.log('[creditService] getCurrentUsage query:', { userId, periodKey, found: !!data, data, error })

    if (error) {
      console.error('[creditService] getCurrentUsage error:', error.message)
      return fallback
    }
    if (data && (data.credits_used != null || data.credits_included != null)) {
      const used = Number(data.credits_used)
      const included = Number(data.credits_included)
      return {
        period_key: String(data.period_key || periodKey),
        credits_used: Number.isFinite(used) ? used : 0,
        credits_included: Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT,
        overage: Math.max(0, (Number.isFinite(used) ? used : 0) - (Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT))
      }
    }
    if (currentPeriodOnly) return fallback
    const prevKey = getPreviousPeriodKey()
    const { data: prevData, error: prevError } = await admin
      .from('user_credit_usage')
      .select('credits_used, credits_included, period_key')
      .eq('user_id', userId)
      .eq('period_key', prevKey)
      .maybeSingle()
    if (!prevError && prevData) {
      const used = Number(prevData.credits_used)
      const included = Number(prevData.credits_included)
      return {
        period_key: String(prevData.period_key || prevKey),
        credits_used: Number.isFinite(used) ? used : 0,
        credits_included: Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT,
        overage: Math.max(0, (Number.isFinite(used) ? used : 0) - (Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT))
      }
    }
    return fallback
  } catch (err) {
    console.error('[creditService] getCurrentUsage exception:', err?.message || err)
    return fallback
  }
}

/**
 * Verifica se l'utente ha abbastanza crediti.
 * Per utenti MetalGate, controlla il saldo remoto.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {number} cost
 * @param {string} [metalgateUserId] - ID utente MetalGate (opzionale, se null viene risolto)
 * @returns {Promise<boolean>}
 */
export async function checkCredits(admin, userId, cost = AI_COST, metalgateUserId = null) {
  if (!admin || !userId) return false
  if (cost <= 0) return true
  
  // Risolvi ID se necessario
  const mgId = metalgateUserId || await resolveMetalgateId(admin, userId)
  
  const usage = await getCurrentUsage(admin, userId, { currentPeriodOnly: false, metalgateUserId: mgId })
  const balance = Math.max(0, usage.credits_included - usage.credits_used)
  
  return balance >= cost
}

/**
 * Deduce crediti.
 * Per utenti MetalGate, chiama l'API interna di MetalGate.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {string} userToken - Token utente (non usato per MetalGate Auth, mantenuto per compatibilità)
 * @param {number} cost
 * @param {string} operationType
 * @param {string} [metalgateUserId] - ID utente MetalGate (opzionale, se null viene risolto)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deductCredits(admin, userId, userToken, cost = AI_COST, operationType = 'ai-call', metalgateUserId = null) {
  // Risolvi ID se necessario
  const mgId = metalgateUserId || await resolveMetalgateId(admin, userId)

  // 1. Check preventivo
  const hasCredits = await checkCredits(admin, userId, cost, mgId)
  if (!hasCredits) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[creditService] Insufficient credits for user:', userId)
    }
    return { success: false, error: 'Insufficient credits' }
  }

  // 2. Se utente MetalGate, chiama API MetalGate
  if (mgId && process.env.NEXT_PUBLIC_METALGATE_API_URL && process.env.METALGATE_API_KEY) {
    try {
      const metalgateUrl = process.env.NEXT_PUBLIC_METALGATE_API_URL.replace(/\/+$/, '')
      const res = await fetch(`${metalgateUrl}/internal/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': process.env.METALGATE_API_KEY
        },
        body: JSON.stringify({
          user_id: mgId,
          amount: cost,
          description: operationType
        })
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('[creditService] MetalGate deduction failed:', res.status, errData)
        return { success: false, error: errData.error || 'MetalGate deduction failed' }
      }
      
      // Successo su MetalGate - Registra anche localmente per log
      await recordUsage(admin, userId, cost, operationType)
      
      return { success: true }
    } catch (err) {
      console.error('[creditService] MetalGate connection error:', err)
      return { success: false, error: 'Credit service unavailable' }
    }
  }

  // 3. Fallback: Logica locale originale
  if (mgId) {
    console.warn('[creditService] MetalGate configured but API URL or Key missing. Using local deduction.')
  }
  
  await recordUsage(admin, userId, cost, operationType)
  return { success: true }
}

/**
 * Registra l'utilizzo di crediti per l'utente nel periodo corrente.
 * Upsert: inserisce riga se assente, altrimenti incrementa credits_used.
 * Non lancia: in caso di errore logga e ritorna (non bloccare la risposta API).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin - Client Supabase con service role
 * @param {string} userId - user_id (auth.users.id)
 * @param {number} credits - numero crediti da aggiungere (uso CREDIT_WEIGHTS)
 * @param {string} [operationType] - tipo operazione per log (es. 'assistant-chat')
 */
export async function recordUsage(admin, userId, credits, operationType = '') {
  if (!admin || !userId || credits == null || credits < 0) return
  const periodKey = getCurrentPeriodKey()
  try {
    const { data: existing } = await admin
      .from('user_credit_usage')
      .select('id, credits_used')
      .eq('user_id', userId)
      .eq('period_key', periodKey)
      .maybeSingle()

    if (existing) {
      const { error } = await admin
        .from('user_credit_usage')
        .update({
          credits_used: (existing.credits_used || 0) + credits,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      if (error) {
        console.error('[creditService] recordUsage update error:', error.message, 'userId:', userId, 'op:', operationType)
        return
      }
    } else {
      const { error } = await admin
        .from('user_credit_usage')
        .insert({
          user_id: userId,
          period_key: periodKey,
          credits_used: credits,
          credits_included: CREDITS_INCLUDED_DEFAULT
        })
      if (error) {
        console.error('[creditService] recordUsage insert error:', error.message, 'userId:', userId, 'op:', operationType)
        return
      }
    }
    await recordTransaction(admin, userId, -credits, 'usage', operationType || 'usage', null)
  } catch (err) {
    console.error('[creditService] recordUsage exception:', err?.message || err, 'userId:', userId, 'op:', operationType)
  }
}

/**
 * Registra una transazione Hero Points (per Attività recente).
 * Fire-and-forget: non blocca se la tabella non esiste o errore.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {number} amount - positivo acquisto, negativo utilizzo
 * @param {'purchase'|'usage'} type
 * @param {string} [description]
 * @param {string} [referenceId]
 */
export async function recordTransaction(admin, userId, amount, type, description = '', referenceId = null) {
  if (!admin || !userId || amount == null) return
  try {
    const { error } = await admin.from('credit_transactions').insert({
      user_id: userId,
      amount: Number(amount),
      type: type === 'purchase' ? 'purchase' : 'usage',
      description: description || null,
      reference_id: referenceId || null
    })
    if (error) console.error('[creditService] recordTransaction error:', error.message)
  } catch (err) {
    console.error('[creditService] recordTransaction exception:', err?.message || err)
  }
}

/**
 * Accredito Hero Point da sito pagamenti (acquisto pacchetto).
 * Idempotente su orderId: se esiste già una purchase con lo stesso reference_id per l'utente, non fa nulla.
 * Aggiorna user_credit_usage.credits_included per il periodo e registra una transazione purchase.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId - auth.users.id
 * @param {number} creditsAmount - Hero Point da accreditare (es. 200, 500, 700)
 * @param {string} orderId - id ordine lato sito pagamenti (per idempotenza e storico)
 * @param {string} [periodKey] - YYYY-MM; se assente usa getCurrentPeriodKey()
 * @returns {Promise<{ ok: boolean, idempotent?: boolean, error?: string }>}
 */
export async function accreditPurchase(admin, userId, creditsAmount, orderId, periodKey = null) {
  if (!admin || !userId || creditsAmount == null || creditsAmount <= 0 || !orderId) {
    return { ok: false, error: 'Invalid parameters' }
  }
  const period = periodKey || getCurrentPeriodKey()
  const amount = Math.floor(Number(creditsAmount))
  if (amount <= 0) return { ok: false, error: 'credits_amount must be positive' }

  try {
    const { data: existingTx } = await admin
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'purchase')
      .eq('reference_id', orderId)
      .maybeSingle()
    if (existingTx) {
      return { ok: true, idempotent: true }
    }

    const { data: existing } = await admin
      .from('user_credit_usage')
      .select('id, credits_used, credits_included')
      .eq('user_id', userId)
      .eq('period_key', period)
      .maybeSingle()

    if (existing) {
      const { error } = await admin
        .from('user_credit_usage')
        .update({
          credits_included: (existing.credits_included || 0) + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      if (error) {
        console.error('[creditService] accreditPurchase update error:', error.message)
        return { ok: false, error: error.message }
      }
    } else {
      const { error } = await admin.from('user_credit_usage').insert({
        user_id: userId,
        period_key: period,
        credits_used: 0,
        credits_included: amount
      })
      if (error) {
        console.error('[creditService] accreditPurchase insert error:', error.message)
        return { ok: false, error: error.message }
      }
    }

    await recordTransaction(admin, userId, amount, 'purchase', 'Acquisto pacchetto', orderId)
    return { ok: true }
  } catch (err) {
    console.error('[creditService] accreditPurchase exception:', err?.message || err)
    return { ok: false, error: err?.message || String(err) }
  }
}

/**
 * Ultime transazioni crediti per l'utente (Attività recente).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {number} [limit]
 * @returns {Promise<Array<{ id: string, amount: number, type: string, description: string|null, reference_id: string|null, created_at: string }>>}
 */
export async function getRecentTransactions(admin, userId, limit = 20) {
  if (!admin || !userId) return []
  try {
    const { data, error } = await admin
      .from('credit_transactions')
      .select('id, amount, type, description, reference_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50))
    if (error) {
      console.error('[creditService] getRecentTransactions error:', error.message)
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[creditService] getRecentTransactions exception:', err?.message || err)
    return []
  }
}
