import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateToken, extractBearerToken } from "@/lib/authHelper";
import {
  getCurrentUsage,
  getSpendableBalance,
  CREDITS_INCLUDED_DEFAULT,
} from "@/lib/creditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, private, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Authorization",
};

/**
 * Legge token, valida, legge usage da Supabase, restituisce JSON.
 * Usato da GET e POST per evitare duplicazione e garantire stessa logica.
 */
async function handleCreditsUsage(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { userData, error: authError } = await validateToken(
    token,
    supabaseUrl,
    anonKey,
  );
  if (authError || !userData?.user?.id) {
    return NextResponse.json(
      { error: "Invalid or expired authentication" },
      { status: 401 },
    );
  }

  let userId = userData.user.id;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from("user_profiles")
      .select("user_id")
      .eq("metalgate_user_id", userId)
      .maybeSingle();
    if (existingProfile?.user_id) {
      userId = existingProfile.user_id;
    }
  }

  let metalgateUserId =
    userData.user.user_metadata?.metalgate_user_id || null;
  if (!metalgateUserId) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("metalgate_user_id")
      .eq("user_id", userId)
      .maybeSingle();
    metalgateUserId = profile?.metalgate_user_id || null;
  }

  const usage = await getCurrentUsage(admin, userId, {
    currentPeriodOnly: true,
    metalgateUserId,
  });
  const creditsUsed = Number(usage.credits_used);
  const creditsIncluded = Number(usage.credits_included);
  const used = Number.isFinite(creditsUsed) ? creditsUsed : 0;
  const included = Number.isFinite(creditsIncluded)
    ? creditsIncluded
    : CREDITS_INCLUDED_DEFAULT;
  const percentUsed = included > 0 ? Math.round((used / included) * 100) : 0;

  const tempBalance = Number.isFinite(Number(usage.temp_balance))
    ? Number(usage.temp_balance)
    : 0;
  const balanceRemaining = getSpendableBalance({
    credits_included: included,
    credits_used: used,
    temp_balance: tempBalance,
  });

  return NextResponse.json(
    {
      period_key: usage.period_key,
      credits_used: used,
      credits_included: included,
      balance_remaining: balanceRemaining,
      temp_balance: tempBalance,
      overage: Math.max(0, used - included),
      percent_used: Math.min(100, percentUsed),
      percent_used_raw: percentUsed,
    },
    { headers: NO_CACHE_HEADERS },
  );
}

/**
 * GET /api/credits/usage
 * Restituisce utilizzo crediti per l'utente autenticato (Bearer).
 * Doc: docs/SISTEMA_CREDITI_AI.md
 */
export async function GET(req) {
  try {
    return await handleCreditsUsage(req);
  } catch (err) {
    console.error("[credits/usage] GET Error:", err);
    return NextResponse.json({ error: "Error loading usage" }, { status: 500 });
  }
}

/**
 * POST /api/credits/usage
 * Stessa risposta di GET. Usato dal frontend per evitare cache HTTP su GET.
 * Body ignorato; auth via Bearer.
 */
export async function POST(req) {
  try {
    return await handleCreditsUsage(req);
  } catch (err) {
    console.error("[credits/usage] POST Error:", err);
    return NextResponse.json({ error: "Error loading usage" }, { status: 500 });
  }
}
