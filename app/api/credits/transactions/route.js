import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getRecentTransactions } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/transactions
 * Ultime transazioni Hero Points (Attività recente). Richiede tabella credit_transactions.
 */
export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    let userId = userData.user.id
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20
    const transactions = await getRecentTransactions(admin, userId, limit)

    let totalAnalyses = 0
    try {
      const { count, error } = await admin.from('matches').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      if (!error && Number.isFinite(count)) totalAnalyses = count
    } catch (_) {}

    return NextResponse.json({ transactions, total_analyses: totalAnalyses })
  } catch (err) {
    console.error('[credits/transactions] GET Error:', err)
    return NextResponse.json({ error: 'Error loading transactions', transactions: [] }, { status: 500 })
  }
}
