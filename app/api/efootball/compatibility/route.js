import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { EFOOTBALL_RULESET, findLegacyInstructionIssues, getLegacyInstructionLabel } from '@/lib/efootballV6Rules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    let userId = userData.user.id
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .maybeSingle()
      if (!existingProfile?.user_id) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
      userId = existingProfile.user_id
    }

    const { data: settings, error: settingsError } = await admin
      .from('team_tactical_settings')
      .select('team_playing_style, individual_instructions, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (settingsError) {
      console.error('[efootball-compatibility] settings error:', settingsError)
      return NextResponse.json({ error: 'Failed to load tactical settings' }, { status: 500 })
    }

    const issues = findLegacyInstructionIssues(settings?.individual_instructions)
    const playerIds = [...new Set(issues.map(issue => issue.player_id).filter(Boolean))]
    const nameById = new Map()

    if (playerIds.length > 0) {
      const { data: players, error: playersError } = await admin
        .from('players')
        .select('id, player_name, position')
        .eq('user_id', userId)
        .in('id', playerIds)
      if (playersError) {
        console.warn('[efootball-compatibility] players lookup warning:', playersError.message)
      } else {
        for (const player of players || []) {
          nameById.set(String(player.id), {
            name: player.player_name || null,
            position: player.position || null
          })
        }
      }
    }

    const hydratedIssues = issues.map(issue => ({
      ...issue,
      label_it: getLegacyInstructionLabel(issue.instruction, 'it'),
      label_en: getLegacyInstructionLabel(issue.instruction, 'en'),
      player: issue.player_id ? (nameById.get(String(issue.player_id)) || null) : null
    }))

    return NextResponse.json({
      ruleset: EFOOTBALL_RULESET,
      compatible: hydratedIssues.length === 0,
      issues: hydratedIssues,
      checked_at: new Date().toISOString()
    }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('[efootball-compatibility] unexpected error:', error)
    return NextResponse.json({ error: 'Compatibility check failed' }, { status: 500 })
  }
}
