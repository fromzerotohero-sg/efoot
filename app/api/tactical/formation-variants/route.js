import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import {
  buildFluidFormationState,
  normalizeSlotPositions,
  sanitizeFormationName
} from '@/lib/efootballV6TacticalModel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getContext(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { response: NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }
  }

  const token = extractBearerToken(req)
  if (!token) return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) {
    return { response: NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 }) }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .maybeSingle()
    if (!profile?.user_id) {
      return { response: NextResponse.json({ error: 'User profile not found' }, { status: 404 }) }
    }
    userId = profile.user_id
  }

  return { admin, userId }
}

async function loadState(admin, userId) {
  const [{ data: base, error: baseError }, { data: rows, error: variantsError }] = await Promise.all([
    admin.from('formation_layout')
      .select('id, formation, slot_positions, updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('formation_variants')
      .select('id, phase, formation, slot_positions, is_active, source_version, updated_at')
      .eq('user_id', userId)
      .order('phase', { ascending: true })
  ])

  if (baseError) throw new Error(`Failed to load base formation: ${baseError.message}`)
  if (variantsError) throw new Error(`Failed to load formation variants: ${variantsError.message}`)

  return buildFluidFormationState(base, rows || [])
}

export async function GET(req) {
  try {
    const ctx = await getContext(req)
    if (ctx.response) return ctx.response
    const state = await loadState(ctx.admin, ctx.userId)
    return NextResponse.json({ success: true, fluid_formation: state }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('[formation-variants] GET:', error)
    return NextResponse.json({ error: 'Unable to load Fluid Formation' }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const ctx = await getContext(req)
    if (ctx.response) return ctx.response

    const rl = await checkRateLimit(ctx.userId, '/api/tactical/formation-variants', 20, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.', resetAt: rl.resetAt }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const enabled = body.enabled === true

    if (!enabled) {
      const { error } = await ctx.admin
        .from('formation_variants')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', ctx.userId)
      if (error) throw error
      const state = await loadState(ctx.admin, ctx.userId)
      return NextResponse.json({ success: true, fluid_formation: state })
    }

    const attackFormation = sanitizeFormationName(body.attack?.formation)
    const defenseFormation = sanitizeFormationName(body.defense?.formation)
    const attackSlots = normalizeSlotPositions(body.attack?.slot_positions)
    const defenseSlots = normalizeSlotPositions(body.defense?.slot_positions)

    if (!attackFormation || !defenseFormation || !attackSlots || !defenseSlots) {
      return NextResponse.json({
        error: 'Attack and defence formations require a valid formation name and all 11 slot positions.'
      }, { status: 400 })
    }

    // Important: these rows describe alternative layouts only. They NEVER modify
    // players.slot_index, players.position or the backward-compatible formation_layout row.
    const now = new Date().toISOString()
    const rows = [
      {
        user_id: ctx.userId,
        phase: 'attack',
        formation: attackFormation,
        slot_positions: attackSlots,
        is_active: true,
        source_version: 'v6.0.0',
        updated_at: now
      },
      {
        user_id: ctx.userId,
        phase: 'defense',
        formation: defenseFormation,
        slot_positions: defenseSlots,
        is_active: true,
        source_version: 'v6.0.0',
        updated_at: now
      }
    ]

    const { error: upsertError } = await ctx.admin
      .from('formation_variants')
      .upsert(rows, { onConflict: 'user_id,phase' })

    if (upsertError) throw upsertError

    // Knowledge refresh is non-blocking, same behavior used by existing formation save.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    import('@/lib/aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
      updateAIKnowledgeScore(ctx.userId, supabaseUrl, serviceKey).catch((error) => {
        console.warn('[formation-variants] Knowledge refresh warning:', error?.message || error)
      })
    }).catch(() => {})

    const state = await loadState(ctx.admin, ctx.userId)
    return NextResponse.json({ success: true, fluid_formation: state })
  } catch (error) {
    console.error('[formation-variants] POST:', error)
    return NextResponse.json({ error: 'Unable to save Fluid Formation' }, { status: 500 })
  }
}
