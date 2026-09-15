/**
 * Servizio crediti: tracciamento utilizzo OpenAI per utente/periodo (mensile).
 * Usato dalle route che chiamano OpenAI e dalla API GET /api/credits/usage.
 * Enterprise: non blocca la risposta se il tracciamento fallisce (fire-and-forget).
 * Doc: docs/SISTEMA_CREDITI_AI.md (Supabase + codice + flusso).
 */

import { notifyUser } from "./notifyUser";

/**
 * Crediti inclusi di default.
 * POLICY: niente crediti inclusi di default → 0. (I crediti arrivano solo da acquisti o da MetalGate.)
 * Env CREDITS_INCLUDED_DEFAULT è lasciata per compatibilità/dev, ma il default hard è 0.
 */
function getCreditsIncludedDefault() {
  const raw =
    typeof process !== "undefined" &&
    process.env &&
    process.env.CREDITS_INCLUDED_DEFAULT;
  const n = raw != null && raw !== "" ? parseInt(String(raw), 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
export const CREDITS_INCLUDED_DEFAULT = getCreditsIncludedDefault();
const METALGATE_API_BASE = "https://api.fromzerotohero.io";

/** Costo standard per chiamata AI (richiesto: 2 crediti) */
export const AI_COST = 2;

/** Pesi in crediti per operazione (Legacy: sovrascritti da AI_COST dove applicabile, ma mantenuti per reference) */
export const CREDIT_WEIGHTS = {
  "assistant-chat": AI_COST,
  "coach-feedback-chat": AI_COST,
  "save-coach-feedback": AI_COST,
  "extract-player": AI_COST,
  "extract-coach": AI_COST,
  "extract-match-data": AI_COST,
  "generate-countermeasures": AI_COST,
  "extract-formation": AI_COST,
  "extract-game-analysis": AI_COST,
};

/**
 * Restituisce la chiave periodo per il mese corrente (YYYY-MM) in UTC.
 * UTC evita mismatch tra server (es. Vercel UTC) e righe scritte in altro fuso:
 * stesso period_key ovunque per lettura/scrittura.
 * @returns {string}
 */
export function getCurrentPeriodKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Restituisce la chiave periodo del mese precedente (YYYY-MM) in UTC.
 * @returns {string}
 */
function getPreviousPeriodKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11
  const prevY = m === 0 ? y - 1 : y;
  const prevM = m === 0 ? 11 : m - 1;
  return `${prevY}-${String(prevM + 1).padStart(2, "0")}`;
}

/**
 * Helper per fetch con retry (esponenziale).
 */
async function fetchWithRetry(url, options, retries = 3, backoff = 300) {
  try {
    const res = await fetch(url, options);
    if (res.ok) return res;
    // Retry su errori server o rate limit
    if (retries > 0 && (res.status >= 500 || res.status === 429)) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
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
  if (!admin || !userId) return null;
  try {
    const { data, error } = await admin
      .from("user_profiles")
      .select("metalgate_user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[creditService] resolveMetalgateId error:",
          error.message,
        );
      }
      return null;
    }
    return data?.metalgate_user_id || null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[creditService] resolveMetalgateId exception:", err);
    }
    return null;
  }
}

/**
 * Ottiene il saldo da MetalGate.
 * @param {string} metalgateUserId
 * @returns {Promise<number|null>} Saldo o null se errore
 */
async function getMetalGateBalance(metalgateUserId) {
  if (
    !metalgateUserId ||
    !process.env.NEXT_PUBLIC_METALGATE_API_URL ||
    !process.env.METALGATE_API_KEY
  ) {
    return null;
  }
  try {
    const metalgateUrl = process.env.NEXT_PUBLIC_METALGATE_API_URL.replace(
      /\/+$/,
      "",
    );
    const res = await fetchWithRetry(`${metalgateUrl}/internal/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": process.env.METALGATE_API_KEY,
      },
      body: JSON.stringify({ user_id: metalgateUserId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.balance !== "number") return null;
      return {
        balance: data.balance,
        temp_balance:
          typeof data.temp_balance === "number" ? data.temp_balance : 0,
      };
    }
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[creditService] MetalGate balance check failed:",
        res.status,
      );
    }
    return null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[creditService] MetalGate balance exception:", err);
    }
    return null;
  }
}

/**
 * Ricarica HP sul wallet MetalGate (saldo reale usato in app per utenti SSO MetalGate).
 * @param {string} metalgateUserId
 * @param {number} amount
 * @param {string} description
 * @param {string} [referenceId]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function accreditMetalGateWallet(
  metalgateUserId,
  amount,
  description,
  referenceId = null,
) {
  if (!metalgateUserId || !process.env.METALGATE_API_KEY) {
    return { ok: false, error: "MetalGate not configured" };
  }
  const credits = Math.floor(Number(amount));
  if (!Number.isFinite(credits) || credits <= 0) {
    return { ok: false, error: "credits_amount must be positive" };
  }
  try {
    const metalgateUrl = METALGATE_API_BASE.replace(/\/+$/, "");
    if (process.env.NODE_ENV !== "production") {
      console.log("[creditService] MetalGate add start:", {
        endpoint: `${metalgateUrl}/api/user/add`,
        user_id: metalgateUserId,
        amount: credits,
        description,
        reference_id: referenceId,
      });
    }

    const res = await fetchWithRetry(`${metalgateUrl}/api/user/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": process.env.METALGATE_API_KEY,
      },
      body: JSON.stringify({
        user_id: metalgateUserId,
        amount: credits,
        description,
      }),
    });
    if (!res.ok) {
      const rawErrorBody = await res.text().catch(() => "");
      let errData = {};
      try {
        errData = rawErrorBody ? JSON.parse(rawErrorBody) : {};
      } catch {
        errData = { raw: rawErrorBody };
      }
      console.error("[creditService] MetalGate accredit failed:", {
        status: res.status,
        statusText: res.statusText,
        body: errData,
      });
      return { ok: false, error: errData.error || "MetalGate accredit failed" };
    }
    const rawSuccessBody = await res.text().catch(() => "");
    let successData = {};
    try {
      successData = rawSuccessBody ? JSON.parse(rawSuccessBody) : {};
    } catch {
      successData = { raw: rawSuccessBody };
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("[creditService] MetalGate add success:", {
        user_id: metalgateUserId,
        amount: credits,
        response: successData,
      });
    }
    return { ok: true };
  } catch (err) {
    console.error("[creditService] MetalGate accredit exception:", err);
    return { ok: false, error: "MetalGate accredit unavailable" };
  }
}

function sanitizeErrorMessage(error, fallback = "Unknown error") {
  const msg = error?.message || error?.error?.message || error;
  const text = String(msg || fallback);
  return text.length > 1200 ? `${text.slice(0, 1200)}...` : text;
}

/**
 * Log tecnico per errori crediti/rimborsi.
 * Non blocca mai il flusso applicativo.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *  userId?: string|null,
 *  operationType?: string,
 *  eventType: string,
 *  functionName?: string,
 *  errorText?: string,
 *  errorCode?: string,
 *  isRefundable?: boolean,
 *  refundApplied?: boolean,
 *  metadata?: any
 * }} payload
 */
export async function logCreditError(admin, payload) {
  if (!admin || !payload?.eventType) return;
  try {
    const { error } = await admin.from("credit_error_logs").insert({
      user_id: payload.userId || null,
      operation_type: payload.operationType || null,
      cosa: payload.eventType,
      errore_testo: payload.errorText || null,
      funzione: payload.functionName || null,
      error_code: payload.errorCode || null,
      is_refundable: payload.isRefundable === true,
      refund_applied: payload.refundApplied === true,
      metadata:
        payload.metadata && typeof payload.metadata === "object"
          ? payload.metadata
          : {},
    });
    if (error) {
      console.error(
        "[creditService] logCreditError insert error:",
        error.message,
      );
    }
  } catch (err) {
    console.error(
      "[creditService] logCreditError exception:",
      err?.message || err,
    );
  }
}

/**
 * Classifica un errore: rimborsabile solo se errore infrastrutturale/provider.
 */
export function classifyCreditError(error, opts = {}) {
  const statusCode = Number(opts.statusCode);
  const errorType = String(opts.errorType || "").toLowerCase();
  const errorCode = String(opts.errorCode || "").toLowerCase();
  const message = sanitizeErrorMessage(error, "").toLowerCase();

  const userFaultByStatus =
    Number.isFinite(statusCode) &&
    [400, 401, 403, 404, 409, 410, 422].includes(statusCode);
  const userFaultByType = [
    "validation_error",
    "auth_error",
    "user_error",
    "client_error",
    "insufficient_credits",
  ].includes(errorType);
  const userFaultByMessage =
    message.includes("invalid") ||
    message.includes("missing") ||
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("insufficient credits") ||
    message.includes("image is required");

  // 429 e timeout/provider sono trattati come errore nostro/di fornitore -> rimborsabili
  const infraByStatus =
    Number.isFinite(statusCode) &&
    (statusCode >= 500 || statusCode === 429 || statusCode === 408);
  const infraByType = [
    "timeout",
    "network_error",
    "server_error",
    "rate_limit",
    "provider_error",
    "openai_error",
  ].includes(errorType);
  const infraByMessage =
    message.includes("timeout") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("service unavailable") ||
    message.includes("openai");

  const refundable =
    !userFaultByStatus &&
    !userFaultByType &&
    !userFaultByMessage &&
    (infraByStatus || infraByType || infraByMessage || !errorCode);

  return {
    refundable,
    category: refundable ? "internal_error" : "user_or_validation_error",
  };
}

/**
 * Saldo spendibile: crediti permanenti (included - used) + bonus temporanei (es. ruota).
 * @param {{ credits_included?: number, credits_used?: number, temp_balance?: number }} usage
 * @returns {number}
 */
export function getSpendableBalance(usage) {
  const included = Number(usage?.credits_included);
  const used = Number(usage?.credits_used);
  const temp = Number(usage?.temp_balance);
  const permanent = Math.max(
    0,
    (Number.isFinite(included) ? included : 0) -
      (Number.isFinite(used) ? used : 0),
  );
  const bonus = Number.isFinite(temp) && temp > 0 ? temp : 0;
  return permanent + bonus;
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
  const periodKey = getCurrentPeriodKey();
  const currentPeriodOnly = opts.currentPeriodOnly === true;

  // Se è utente MetalGate, prendi saldo remoto
  if (opts.metalgateUserId) {
    const remoteBalance = await getMetalGateBalance(opts.metalgateUserId);
    if (remoteBalance !== null) {
      // Mappiamo il saldo remoto come "credits_included" e "credits_used" a 0
      // Così il saldo rimanente (included - used) è corretto (= remoteBalance.balance)
      return {
        period_key: periodKey,
        credits_used: 0,
        credits_included: remoteBalance.balance,
        temp_balance: remoteBalance.temp_balance,
        overage: 0,
      };
    }
  }

  const fallback = {
    period_key: periodKey,
    credits_used: 0,
    credits_included: CREDITS_INCLUDED_DEFAULT,
    overage: 0,
  };
  if (!admin || !userId) return fallback;

  try {
    const { data, error } = await admin
      .from("user_credit_usage")
      .select("credits_used, credits_included, period_key")
      .eq("user_id", userId)
      .eq("period_key", periodKey)
      .maybeSingle();

    // console.log('[creditService] getCurrentUsage query:', { userId, periodKey, found: !!data, data, error })

    if (error) {
      console.error("[creditService] getCurrentUsage error:", error.message);
      return fallback;
    }
    if (data && (data.credits_used != null || data.credits_included != null)) {
      const used = Number(data.credits_used);
      const included = Number(data.credits_included);
      return {
        period_key: String(data.period_key || periodKey),
        credits_used: Number.isFinite(used) ? used : 0,
        credits_included:
          Number.isFinite(included) && included >= 0
            ? included
            : CREDITS_INCLUDED_DEFAULT,
        overage: Math.max(
          0,
          (Number.isFinite(used) ? used : 0) -
            (Number.isFinite(included) && included >= 0
              ? included
              : CREDITS_INCLUDED_DEFAULT),
        ),
      };
    }
    if (currentPeriodOnly) return fallback;
    const prevKey = getPreviousPeriodKey();
    const { data: prevData, error: prevError } = await admin
      .from("user_credit_usage")
      .select("credits_used, credits_included, period_key")
      .eq("user_id", userId)
      .eq("period_key", prevKey)
      .maybeSingle();
    if (!prevError && prevData) {
      const used = Number(prevData.credits_used);
      const included = Number(prevData.credits_included);
      return {
        period_key: String(prevData.period_key || prevKey),
        credits_used: Number.isFinite(used) ? used : 0,
        credits_included:
          Number.isFinite(included) && included >= 0
            ? included
            : CREDITS_INCLUDED_DEFAULT,
        overage: Math.max(
          0,
          (Number.isFinite(used) ? used : 0) -
            (Number.isFinite(included) && included >= 0
              ? included
              : CREDITS_INCLUDED_DEFAULT),
        ),
      };
    }
    return fallback;
  } catch (err) {
    console.error(
      "[creditService] getCurrentUsage exception:",
      err?.message || err,
    );
    return fallback;
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
export async function checkCredits(
  admin,
  userId,
  cost = AI_COST,
  metalgateUserId = null,
) {
  if (!admin || !userId) return false;
  if (cost <= 0) return true;

  // Risolvi ID se necessario
  const mgId = metalgateUserId || (await resolveMetalgateId(admin, userId));

  const usage = await getCurrentUsage(admin, userId, {
    currentPeriodOnly: false,
    metalgateUserId: mgId,
  });

  return getSpendableBalance(usage) >= cost;
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
export async function deductCredits(
  admin,
  userId,
  userToken,
  cost = AI_COST,
  operationType = "ai-call",
  metalgateUserId = null,
) {
  // Risolvi ID se necessario
  const mgId = metalgateUserId || (await resolveMetalgateId(admin, userId));

  // 1. Check preventivo
  const hasCredits = await checkCredits(admin, userId, cost, mgId);
  if (!hasCredits) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[creditService] Insufficient credits for user:", userId);
    }
    return { success: false, error: "Insufficient credits" };
  }

  // 2. Se utente MetalGate, chiama API MetalGate
  if (
    mgId &&
    process.env.NEXT_PUBLIC_METALGATE_API_URL &&
    process.env.METALGATE_API_KEY
  ) {
    try {
      const metalgateUrl = process.env.NEXT_PUBLIC_METALGATE_API_URL.replace(
        /\/+$/,
        "",
      );
      const res = await fetch(`${metalgateUrl}/internal/deduct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": process.env.METALGATE_API_KEY,
        },
        body: JSON.stringify({
          user_id: mgId,
          amount: cost,
          description: operationType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error(
          "[creditService] MetalGate deduction failed:",
          res.status,
          errData,
        );
        return {
          success: false,
          error: errData.error || "MetalGate deduction failed",
        };
      }

      // Successo su MetalGate - Registra anche localmente per log
      await recordUsage(admin, userId, cost, operationType);

      return { success: true };
    } catch (err) {
      console.error("[creditService] MetalGate connection error:", err);
      return { success: false, error: "Credit service unavailable" };
    }
  }

  // 3. Fallback: Logica locale originale
  if (mgId) {
    console.warn(
      "[creditService] MetalGate configured but API URL or Key missing. Using local deduction.",
    );
  }

  await recordUsage(admin, userId, cost, operationType);
  return { success: true };
}

/**
 * Rimborso crediti: viene invocato solo per errori classificati come "nostri".
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {number} cost
 * @param {string} operationType
 * @param {string|null} [metalgateUserId]
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function refundCredits(
  admin,
  userId,
  cost,
  operationType = "ai-call",
  metalgateUserId = null,
) {
  if (!admin || !userId || !Number.isFinite(cost) || cost <= 0) {
    return { success: false, error: "Invalid refund parameters" };
  }

  const mgId = metalgateUserId || (await resolveMetalgateId(admin, userId));

  if (
    mgId &&
    process.env.NEXT_PUBLIC_METALGATE_API_URL &&
    process.env.METALGATE_API_KEY
  ) {
    try {
      const metalgateUrl = process.env.NEXT_PUBLIC_METALGATE_API_URL.replace(
        /\/+$/,
        "",
      );
      const res = await fetch(`${metalgateUrl}/internal/accredit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-API-Key": process.env.METALGATE_API_KEY,
        },
        body: JSON.stringify({
          user_id: mgId,
          amount: cost,
          description: `refund:${operationType}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error(
          "[creditService] MetalGate refund failed:",
          res.status,
          errData,
        );
        return {
          success: false,
          error: errData.error || "MetalGate refund failed",
        };
      }

      await recordTransaction(
        admin,
        userId,
        cost,
        "purchase",
        `Refund ${operationType}`,
        null,
      );
      return { success: true };
    } catch (err) {
      console.error("[creditService] MetalGate refund exception:", err);
      return { success: false, error: "Credit refund unavailable" };
    }
  }

  try {
    const periodKey = getCurrentPeriodKey();
    const { data: existing, error: readErr } = await admin
      .from("user_credit_usage")
      .select("id, credits_used")
      .eq("user_id", userId)
      .eq("period_key", periodKey)
      .maybeSingle();

    if (readErr) {
      return { success: false, error: readErr.message };
    }

    if (existing?.id) {
      const nextUsed = Math.max(0, Number(existing.credits_used || 0) - cost);
      const { error: updateErr } = await admin
        .from("user_credit_usage")
        .update({
          credits_used: nextUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateErr) return { success: false, error: updateErr.message };
    }

    await recordTransaction(
      admin,
      userId,
      cost,
      "purchase",
      `Refund ${operationType}`,
      null,
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Gestione unificata errore post-addebito: log + rimborso condizionale.
 */
export async function handleCreditOperationError(admin, payload) {
  const classification = classifyCreditError(payload.error, {
    statusCode: payload.statusCode,
    errorType: payload.errorType,
    errorCode: payload.errorCode,
  });

  await logCreditError(admin, {
    userId: payload.userId,
    operationType: payload.operationType,
    eventType: "operation_failed",
    functionName: payload.functionName,
    errorText: sanitizeErrorMessage(payload.error),
    errorCode: payload.errorCode || classification.category,
    isRefundable: classification.refundable,
    refundApplied: false,
    metadata: payload.metadata || {},
  });

  if (!classification.refundable) {
    return { refunded: false, refundable: false };
  }

  const refund = await refundCredits(
    admin,
    payload.userId,
    payload.cost,
    payload.operationType,
    payload.metalgateUserId || null,
  );

  await logCreditError(admin, {
    userId: payload.userId,
    operationType: payload.operationType,
    eventType: refund.success ? "refund_success" : "refund_failed",
    functionName: payload.functionName,
    errorText: refund.success ? null : sanitizeErrorMessage(refund.error),
    errorCode: refund.success ? "refund_applied" : "refund_failed",
    isRefundable: true,
    refundApplied: refund.success,
    metadata: payload.metadata || {},
  });

  return {
    refunded: refund.success,
    refundable: true,
    refundError: refund.error,
  };
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
export async function recordUsage(admin, userId, credits, operationType = "") {
  if (!admin || !userId || credits == null || credits < 0) return;
  const periodKey = getCurrentPeriodKey();
  try {
    const { data: existing } = await admin
      .from("user_credit_usage")
      .select("id, credits_used")
      .eq("user_id", userId)
      .eq("period_key", periodKey)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("user_credit_usage")
        .update({
          credits_used: (existing.credits_used || 0) + credits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) {
        console.error(
          "[creditService] recordUsage update error:",
          error.message,
          "userId:",
          userId,
          "op:",
          operationType,
        );
        return;
      }
    } else {
      const { error } = await admin.from("user_credit_usage").insert({
        user_id: userId,
        period_key: periodKey,
        credits_used: credits,
        credits_included: CREDITS_INCLUDED_DEFAULT,
      });
      if (error) {
        console.error(
          "[creditService] recordUsage insert error:",
          error.message,
          "userId:",
          userId,
          "op:",
          operationType,
        );
        return;
      }
    }
    await recordTransaction(
      admin,
      userId,
      -credits,
      "usage",
      operationType || "usage",
      null,
    );
  } catch (err) {
    console.error(
      "[creditService] recordUsage exception:",
      err?.message || err,
      "userId:",
      userId,
      "op:",
      operationType,
    );
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
export async function recordTransaction(
  admin,
  userId,
  amount,
  type,
  description = "",
  referenceId = null,
) {
  if (!admin || !userId || amount == null) return;
  try {
    const { error } = await admin.from("credit_transactions").insert({
      user_id: userId,
      amount: Number(amount),
      type: type === "purchase" ? "purchase" : "usage",
      description: description || null,
      reference_id: referenceId || null,
    });
    if (error)
      console.error("[creditService] recordTransaction error:", error.message);
  } catch (err) {
    console.error(
      "[creditService] recordTransaction exception:",
      err?.message || err,
    );
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
export async function accreditPurchase(
  admin,
  userId,
  creditsAmount,
  orderId,
  periodKey = null,
) {
  if (
    !admin ||
    !userId ||
    creditsAmount == null ||
    creditsAmount <= 0 ||
    !orderId
  ) {
    return { ok: false, error: "Invalid parameters" };
  }
  const period = periodKey || getCurrentPeriodKey();
  const amount = Math.floor(Number(creditsAmount));
  if (amount <= 0)
    return { ok: false, error: "credits_amount must be positive" };

  try {
    const { data: existingTx } = await admin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "purchase")
      .eq("reference_id", orderId)
      .maybeSingle();
    if (existingTx) {
      return { ok: true, idempotent: true };
    }

    const { data: existing } = await admin
      .from("user_credit_usage")
      .select("id, credits_used, credits_included")
      .eq("user_id", userId)
      .eq("period_key", period)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("user_credit_usage")
        .update({
          credits_included: (existing.credits_included || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) {
        console.error(
          "[creditService] accreditPurchase update error:",
          error.message,
        );
        return { ok: false, error: error.message };
      }
    } else {
      const { error } = await admin.from("user_credit_usage").insert({
        user_id: userId,
        period_key: period,
        credits_used: 0,
        credits_included: amount,
      });
      if (error) {
        console.error(
          "[creditService] accreditPurchase insert error:",
          error.message,
        );
        return { ok: false, error: error.message };
      }
    }

    await recordTransaction(
      admin,
      userId,
      amount,
      "purchase",
      "Acquisto pacchetto",
      orderId,
    );
    // Notifica in-app (fail-soft, non blocca l'accredito)
    await notifyUser(userId, {
      type: "credits",
      title: `+${amount} HP accreditati`,
      body: "Acquisto pacchetto",
      href: "/impostazioni-profilo",
    });
    return { ok: true };
  } catch (err) {
    console.error(
      "[creditService] accreditPurchase exception:",
      err?.message || err,
    );
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Accredita un bonus HP idempotente (es. ruota giornaliera).
 * Idempotenza su referenceId: se esiste gia una purchase con lo stesso reference_id, non riaccredita.
 * Utenti MetalGate: accredito sul wallet MetalGate (come rimborsi/refund), piu log in credit_transactions.
 * Altri utenti: accredito su user_credit_usage (saldo mostrato in barra HP).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {number} creditsAmount
 * @param {string} referenceId
 * @param {string} [description]
 * @param {string} [periodKey]
 * @returns {Promise<{ ok: boolean, idempotent?: boolean, error?: string }>}
 */
export async function accreditBonus(
  admin,
  userId,
  creditsAmount,
  referenceId,
  description = "Bonus HP",
  periodKey = null,
) {
  if (!admin || !userId || !referenceId) {
    return { ok: false, error: "Invalid parameters" };
  }
  const amount = Math.floor(Number(creditsAmount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "credits_amount must be positive" };
  }
  const period = periodKey || getCurrentPeriodKey();

  try {
    const { data: existingTx } = await admin
      .from("credit_transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "purchase")
      .eq("reference_id", referenceId)
      .maybeSingle();
    if (existingTx) {
      return { ok: true, idempotent: true };
    }

    const metalgateUserId = await resolveMetalgateId(admin, userId);
    const usesMetalGateWallet =
      metalgateUserId &&
      process.env.NEXT_PUBLIC_METALGATE_API_URL &&
      process.env.METALGATE_API_KEY;

    if (usesMetalGateWallet) {
      const mgResult = await accreditMetalGateWallet(
        metalgateUserId,
        amount,
        description,
        referenceId,
      );
      if (mgResult.ok) {
        await recordTransaction(
          admin,
          userId,
          amount,
          "purchase",
          description,
          referenceId,
        );
        // Notifica in-app (fail-soft, non blocca l'accredito)
        await notifyUser(userId, {
          type: "credits",
          title: `+${amount} HP accreditati`,
          body: description || null,
          href: "/impostazioni-profilo",
        });
        return { ok: true };
      }
      // Non bloccare la ruota: fallback al wallet locale se MetalGate risponde errore/transiente.
      console.error(
        "[creditService] accreditBonus MetalGate fallback to local wallet:",
        mgResult.error,
      );
    }

    const { data: existing } = await admin
      .from("user_credit_usage")
      .select("id, credits_included")
      .eq("user_id", userId)
      .eq("period_key", period)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateErr } = await admin
        .from("user_credit_usage")
        .update({
          credits_included: (existing.credits_included || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateErr) return { ok: false, error: updateErr.message };
    } else {
      const { error: insertErr } = await admin
        .from("user_credit_usage")
        .insert({
          user_id: userId,
          period_key: period,
          credits_used: 0,
          credits_included: amount,
        });
      if (insertErr) return { ok: false, error: insertErr.message };
    }

    await recordTransaction(
      admin,
      userId,
      amount,
      "purchase",
      description,
      referenceId,
    );
    // Notifica in-app (fail-soft, non blocca l'accredito)
    await notifyUser(userId, {
      type: "credits",
      title: `+${amount} HP accreditati`,
      body: description || null,
      href: "/impostazioni-profilo",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
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
  if (!admin || !userId) return [];
  try {
    const { data, error } = await admin
      .from("credit_transactions")
      .select("id, amount, type, description, reference_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 50));
    if (error) {
      console.error(
        "[creditService] getRecentTransactions error:",
        error.message,
      );
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(
      "[creditService] getRecentTransactions exception:",
      err?.message || err,
    );
    return [];
  }
}
