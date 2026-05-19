import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { fetchRosterContext } from '@/lib/buildCoachServerUtils'
import { computeCardAdvisorBuildPreview } from '@/lib/cardAdvisorBuildPreview'
import {
  normalizeAdvisorCard,
  resolveCardAdvisorCatalog,
  resolveCardAdvisorUserId
} from '@/lib/cardAdvisorLabCatalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const card = normalizeAdvisorCard(body.card)
    const lang = body.lang === 'en' ? 'en' : 'it'
    if (!card.name || !card.position) {
      return NextResponse.json({ error: 'Invalid card' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const userId = await resolveCardAdvisorUserId(userData, admin)
    const { catalogRow, source: catalogSource } = await resolveCardAdvisorCatalog(admin, card)

    let rosterContext = null
    if (userId) {
      try {
        rosterContext = await fetchRosterContext(admin, userId)
      } catch (error) {
        console.warn('[card-advisor-lab:build-preview] roster unavailable:', error?.message || error)
      }
    }

    const preview = await computeCardAdvisorBuildPreview({
      card,
      catalogRow,
      rosterContext,
      lang,
      admin
    })

    return NextResponse.json({
      preview: {
        ...preview,
        catalogSource
      }
    })
  } catch (error) {
    console.error('[card-advisor-lab:build-preview] error:', error)
    return NextResponse.json({ error: 'Build preview unavailable' }, { status: 500 })
  }
}
