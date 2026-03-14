import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await supabase
      .from('playing_styles')
      .select('id, name, compatible_positions, category')
      .order('name')

    if (error) {
      throw error
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('[API] Error fetching playing styles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
