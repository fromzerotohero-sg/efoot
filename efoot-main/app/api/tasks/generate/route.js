import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'
import { generateWeeklyTasksForUser, getCurrentWeek } from '@/lib/taskHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tasks/generate
 * Genera task settimanali per utente corrente (per test/manuale)
 * Body: { week_start_date?: 'YYYY-MM-DD' } (opzionale, default: settimana corrente)
 */
export async function POST(request) {
  try {
    // 1. Autenticazione
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validazione token (pattern coerente con altri endpoint)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const user_id = userData.user.id

    // 2. Rate limiting
    const rateLimit = await checkRateLimit(user_id, '/api/tasks/generate')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
        { status: 429 }
      )
    }

    // 3. Parametri body
    const body = await request.json().catch(() => ({}))
    let weekStartDate = body.week_start_date || getCurrentWeek().start

    // Validazione formato data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (weekStartDate && !dateRegex.test(weekStartDate)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Validazione range data (non futura, max 1 anno fa)
    if (weekStartDate) {
      const weekStart = new Date(weekStartDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      oneYearAgo.setHours(0, 0, 0, 0)

      if (isNaN(weekStart.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
      }

      if (weekStart > today) {
        return NextResponse.json({ error: 'Date cannot be in the future' }, { status: 400 })
      }

      if (weekStart < oneYearAgo) {
        return NextResponse.json({ error: 'Date cannot be more than 1 year ago' }, { status: 400 })
      }
    }

    // Calcola week end (domenica)
    const weekStart = new Date(weekStartDate)
    // Assicura che sia lunedì (normalizza)
    const dayOfWeek = weekStart.getDay()
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Domenica
    weekEnd.setHours(23, 59, 59, 999)

    const week = {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    }

    // 4. Genera task (usa variabili già dichiarate sopra)
    const tasks = await generateWeeklyTasksForUser(user_id, supabaseUrl, serviceKey, week)

    // 5. Restituisci task generati
    return NextResponse.json({
      success: true,
      tasks: tasks,
      week: week,
      count: tasks.length
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
      }
    })
  } catch (error) {
    console.error('[tasks/generate] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
