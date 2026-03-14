import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { getCurrentWeek, generateWeeklyTasksForUser, updateTasksProgressAfterMatch, translate } from '@/lib/taskHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks/list
 * Restituisce task attivi per utente corrente
 * Query params: ?week_start_date=2026-01-26 (opzionale, default: settimana corrente)
 */
export async function GET(request) {
  try {
    // 1. Autenticazione (pattern enterprise coerente)
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validazione token (pattern coerente con altri endpoint)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    let user_id = userData.user.id
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      if (!serviceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', user_id)
        .single()
      
      if (existingProfile?.user_id) {
        user_id = existingProfile.user_id
      } else {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    // 2. Rate limiting (riattivato con limite alto - endpoint leggero)
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/tasks/list']
    const rateLimit = await checkRateLimit(
      user_id,
      '/api/tasks/list',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }

    // 3. Parametri query (sicurezza: lang whitelist it|en, mai da input in stringhe)
    const { searchParams } = new URL(request.url)
    let weekStartDate = searchParams.get('week_start_date') || getCurrentWeek().start
    const langParam = searchParams.get('lang') || request.headers.get('accept-language')?.split(',')[0]?.slice(0, 2) || 'it'
    const lang = (langParam === 'en' || langParam === 'it') ? langParam : 'it'

    // Validazione formato data (se fornita)
    if (weekStartDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(weekStartDate)) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
      }

      // Validazione: data non troppo vecchia (max 1 anno fa) o futura
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
        // Data futura: usa settimana corrente
        weekStartDate = getCurrentWeek().start
      } else if (weekStart < oneYearAgo) {
        return NextResponse.json({ error: 'Date cannot be more than 1 year ago' }, { status: 400 })
      }
    }

    // Normalizza sempre a Lunedì (UTC) per garantire coerenza tra query e generazione
    // Evita mismatch se il client manda una data diversa o se getCurrentWeek differisce per timezone
    try {
      const d = new Date(weekStartDate)
      const day = d.getUTCDay()
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
      d.setUTCDate(diff)
      d.setUTCHours(0, 0, 0, 0)
      weekStartDate = d.toISOString().split('T')[0]
    } catch (e) {
      // Fallback in caso di errore strano, mantiene weekStartDate originale
      console.warn('[tasks/list] Date normalization failed:', e)
    }

    // 4. Recupera task da Supabase (usa Service Role per evitare errori JWT/RLS)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    let { data: tasks, error: tasksError } = await admin
      .from('weekly_goals')
      .select('id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_by, created_at, updated_at, completed_at')
      .eq('user_id', user_id)
      .eq('week_start_date', weekStartDate)
      .order('created_at', { ascending: true })

    if (tasksError) {
      console.error('[tasks/list] Error fetching tasks:', tasksError)
      console.error('[tasks/list] Error details:', JSON.stringify(tasksError, null, 2))
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[tasks/list] Found ${tasks?.length || 0} tasks for user, week ${weekStartDate}`)
    }

    // 5. Auto-generazione task: se non ci sono per la settimana corrente, generali
    const currentWeek = getCurrentWeek()
    const isCurrentWeek = weekStartDate === currentWeek.start
    
    if (process.env.NODE_ENV !== 'production') console.log(`[tasks/list] Current week: ${currentWeek.start}, Requested week: ${weekStartDate}, isCurrentWeek: ${isCurrentWeek}`)

    // Genera task se è la settimana corrente e non ci sono task
    // (per settimane passate o future, non generiamo automaticamente)
    // NOTA: Per test, genera anche per utenti con partite che non hanno mai avuto task
    if (isCurrentWeek && (!tasks || tasks.length === 0)) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        try {
          // Calcola week end per la settimana richiesta (pattern coerente con generate)
          const weekStart = new Date(weekStartDate)
          // Assicura che sia lunedì (normalizza) - Usa UTC per evitare problemi di timezone
          const dayOfWeek = weekStart.getUTCDay()
          const diff = weekStart.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          weekStart.setUTCDate(diff)
          weekStart.setUTCHours(0, 0, 0, 0)

          const weekEnd = new Date(weekStart)
          weekEnd.setUTCDate(weekEnd.getUTCDate() + 6) // Domenica
          weekEnd.setUTCHours(23, 59, 59, 999)

          const week = {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0]
          }
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[tasks/list] Auto-generating tasks for week ${week.start}`)
          }
          
          const generatedTasks = await generateWeeklyTasksForUser(
            user_id,
            supabaseUrl,
            serviceKey,
            week,
            lang
          )
          
          if (process.env.NODE_ENV !== 'production') console.log(`[tasks/list] generateWeeklyTasksForUser returned ${generatedTasks?.length || 0} tasks`)
          
          if (!generatedTasks || generatedTasks.length === 0) {
            console.warn(`[tasks/list] generateWeeklyTasksForUser returned empty array - this might indicate an issue`)
            console.warn(`[tasks/list] User might not have enough data for personalized tasks`)
          } else {
            // Se generati, recuperali di nuovo (usa Service Role)
            // USARE week.start esatto usato per la generazione
            const queryWeekStart = week.start
            if (process.env.NODE_ENV !== 'production') console.log(`[tasks/list] Attempting to fetch ${generatedTasks.length} generated tasks for week ${queryWeekStart}`)
            
            const { data: newTasks, error: fetchError } = await admin
              .from('weekly_goals')
              .select('id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_by, created_at, updated_at, completed_at')
              .eq('user_id', user_id)
              .eq('week_start_date', queryWeekStart)
              .order('created_at', { ascending: true })
            
            if (!fetchError && newTasks && newTasks.length > 0) {
              tasks = newTasks
              if (process.env.NODE_ENV !== 'production') console.log(`[tasks/list] Successfully retrieved ${tasks.length} tasks via Admin Client`)
            } else {
              console.warn(`[tasks/list] Admin query returned ${newTasks?.length || 0} tasks for week ${queryWeekStart}, error:`, fetchError)
              
              // CRITICAL FIX: Se la query fallisce ma abbiamo generatedTasks, usiamo quelli!
              // Questo risolve problemi di race condition o consistenza eventuale
              if (generatedTasks && generatedTasks.length > 0) {
                 if (process.env.NODE_ENV !== 'production') console.log(`[tasks/list] Using generatedTasks directly as fallback (${generatedTasks.length} tasks)`)
                 tasks = generatedTasks
              } else {
                 // Fallback estremo: usa admin per verificare se i task esistono
                 const admin = createClient(supabaseUrl, serviceKey, {
                   auth: { autoRefreshToken: false, persistSession: false }
                 })
                 
                 const { data: adminTasks, error: adminError } = await admin
                   .from('weekly_goals')
                   .select('id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_by, created_at, updated_at, completed_at')
                   .eq('user_id', user_id)
                   .eq('week_start_date', weekStartDate)
                   .order('created_at', { ascending: true })
                 
                 if (!adminError && adminTasks && adminTasks.length > 0) {
                   console.warn(`[tasks/list] Found ${adminTasks.length} tasks via admin (RLS might be blocking), using admin results`)
                   tasks = adminTasks
                 } else {
                   console.error('[tasks/list] Admin query also failed:', adminError)
                 }
              }
            }
          }
        } catch (genError) {
          console.error('[tasks/list] Error auto-generating tasks:', genError)
          console.error('[tasks/list] Error stack:', genError.stack)
          // Non bloccare, restituisci task esistenti o array vuoto
        }
      }
    }

    // 5b. Ricalcola progresso per settimana corrente quando l'utente apre la lista
    // (altrimenti il progresso si aggiorna solo al salvataggio partita; es. "usa chat 2 volte" resterebbe 0)
    if (isCurrentWeek && tasks && tasks.length > 0 && serviceKey) {
      try {
        await updateTasksProgressAfterMatch(user_id, supabaseUrl, serviceKey, { id: 'list-sync' })
        const { data: refreshedTasks, error: refErr } = await admin
          .from('weekly_goals')
          .select('id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_by, created_at, updated_at, completed_at')
          .eq('user_id', user_id)
          .eq('week_start_date', weekStartDate)
          .order('created_at', { ascending: true })
        if (!refErr && refreshedTasks && refreshedTasks.length > 0) {
          tasks = refreshedTasks
        }
      } catch (syncErr) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[tasks/list] Progress sync failed (non-blocking):', syncErr?.message)
        }
      }
    }

    // 6. Coerenza: escludi task autodichiarati (use_recommended_formation) dalla risposta
    const GOAL_TYPE_HIDDEN = 'use_recommended_formation'
    let visibleTasks = (tasks || []).filter(t => t && t.goal_type !== GOAL_TYPE_HIDDEN)

    // 7. Dynamic Description Refresh: Corregge descrizioni "raw" (es. goalIncreaseWins) nel DB
    // Rigenera la descrizione al volo basandosi sul tipo e sul target_value attuale.
    if (visibleTasks.length > 0) {
      visibleTasks = visibleTasks.map(task => {
        // Mappa tipo task -> chiave traduzione
        const typeToKey = {
          'increase_wins': 'goalIncreaseWins',
          'complete_matches': 'goalCompleteMatches',
          'use_ai_recommendations': 'goalUseAIRecommendations',
          'clean_sheet_matches': 'goalCleanSheets',
          // Per goal complessi (reduce_goals, improve_possession) la descrizione nel DB è solitamente ok perché generata con parametri dinamici,
          // ma se fosse una chiave secca, servirebbero i parametri originali che non abbiamo qui facilmente.
          // Ci concentriamo su quelli "semplici" che sono stati segnalati come rotti.
        }

        const translationKey = typeToKey[task.goal_type]
        if (translationKey && task.target_value) {
          // Rigenera descrizione
          const newDesc = translate(translationKey, lang, { count: task.target_value })
          // Sovrascrivi solo se la descrizione attuale sembra una chiave o se vogliamo forzare la coerenza
          // (Per sicurezza sovrascriviamo sempre per questi tipi semplici per garantire la lingua corretta)
          return {
            ...task,
            goal_description: newDesc
          }
        }
        return task
      })
    }

    // LAST RESORT FALLBACK: Se non abbiamo task (neanche dopo generazione e recupero),
    // restituiamo task statici per evitare che l'utente veda "Nessun obiettivo".
    // Questo è un fallback di sicurezza per la UI.
    if (!visibleTasks || visibleTasks.length === 0) {
      console.warn('[tasks/list] Final fallback: Returning static tasks to avoid empty UI')
      visibleTasks = [
        {
          id: 'fallback-1',
          goal_type: 'complete_matches',
          goal_description: lang === 'it' ? 'Completa almeno 3 partite questa settimana' : 'Complete at least 3 matches this week',
          target_value: 3,
          current_value: 0,
          difficulty: 'easy',
          status: 'active',
          week_start_date: weekStartDate
        },
        {
          id: 'fallback-2',
          goal_type: 'increase_wins',
          goal_description: lang === 'it' ? 'Vinci almeno 2 partite questa settimana' : 'Win at least 2 matches this week',
          target_value: 2,
          current_value: 0,
          difficulty: 'medium',
          status: 'active',
          week_start_date: weekStartDate
        },
        {
          id: 'fallback-3',
          goal_type: 'use_ai_recommendations',
          goal_description: lang === 'it' ? 'Usa almeno 2 volte chat, analisi partita o contromisure questa settimana' : 'Use chat, match analysis or countermeasures at least 2 times this week',
          target_value: 2,
          current_value: 0,
          difficulty: 'easy',
          status: 'active',
          week_start_date: weekStartDate
        }
      ]
    }

    return NextResponse.json({
      success: true,
      tasks: visibleTasks,
      week_start_date: weekStartDate,
      count: visibleTasks.length
    })
  } catch (error) {
    console.error('[tasks/list] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
