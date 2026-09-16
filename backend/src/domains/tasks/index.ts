import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { BackendConfig } from '../../config.js'
import { assertDormantRead } from '../../dormant.js'
import type { BackendSupabaseClient, ReadOnlySupabaseProvider, UserSupabaseWriteProvider } from '../../readOnlySupabase.js'
import type { HttpError, IdentityProvider } from '../../types.js'
import type { Database } from '../../types/database.js'

export const HIDDEN_GOAL_TYPES = new Set(['use_recommended_formation'])

export type WeeklyGoalRow = Database['public']['Tables']['weekly_goals']['Row']
export type MatchProgressRow = Pick<
  Database['public']['Tables']['matches']['Row'],
  'id' | 'match_date' | 'result' | 'team_stats' | 'data_completeness'
>

export interface WeekRange {
  start: string
  end: string
}

export function weekForDate(value: Date | string = new Date()): WeekRange {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error('Invalid date'), { statusCode: 400 }) as HttpError
  const day = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - day + (day === 0 ? -6 : 1))
  date.setUTCHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setUTCDate(end.getUTCDate() + 6)
  return { start: date.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export function validateWeekDate(
  value: string | undefined,
  now: Date = new Date(),
  { futureFallsBack = false }: { futureFallsBack?: boolean } = {}
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw Object.assign(new Error('Invalid date format. Use YYYY-MM-DD'), { statusCode: 400 }) as HttpError
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw Object.assign(new Error('Invalid date'), { statusCode: 400 }) as HttpError
  const today = new Date(now)
  today.setUTCHours(23, 59, 59, 999)
  const oldest = new Date(now)
  oldest.setUTCFullYear(oldest.getUTCFullYear() - 1)
  oldest.setUTCHours(0, 0, 0, 0)
  if (date > today) {
    if (futureFallsBack) return weekForDate(now).start
    throw Object.assign(new Error('Date cannot be in the future'), { statusCode: 400 }) as HttpError
  }
  if (date < oldest) throw Object.assign(new Error('Date cannot be more than 1 year ago'), { statusCode: 400 }) as HttpError
  return weekForDate(date).start
}

export interface TaskItem {
  id: string
  goal_type: string
  goal_description: string
  target_value: number
  current_value: number
  difficulty: string
  status: string
  week_start_date: string
  week_end_date?: string | null
  completed_at?: string | null
  [key: string]: unknown
}

export function fallbackTasks(lang: string, weekStart: string): TaskItem[] {
  const it = lang !== 'en'
  return [
    ['fallback-1', 'complete_matches', it ? 'Completa almeno 3 partite questa settimana' : 'Complete at least 3 matches this week', 3, 'easy'],
    ['fallback-2', 'increase_wins', it ? 'Vinci almeno 2 partite questa settimana' : 'Win at least 2 matches this week', 2, 'medium'],
    ['fallback-3', 'use_ai_recommendations', it ? 'Usa almeno 2 volte chat, analisi partita o contromisure questa settimana' : 'Use chat, match analysis or countermeasures at least 2 times this week', 2, 'easy']
  ].map(([id, goal_type, goal_description, target_value, difficulty]) => ({
    id: String(id),
    goal_type: String(goal_type),
    goal_description: String(goal_description),
    target_value: Number(target_value),
    current_value: 0,
    difficulty: String(difficulty),
    status: 'active',
    week_start_date: weekStart
  }))
}

interface QueryOutcome<T> {
  data: T | null
  error: { message: string } | null
}

async function data<T>(query: PromiseLike<QueryOutcome<T>>, fallback: T): Promise<T> {
  const { data: value, error } = await query
  if (error) throw Object.assign(new Error(error.message), { statusCode: 502 }) as HttpError
  return value ?? fallback
}

export function createTasksDb({ readProvider }: { readProvider: ReadOnlySupabaseProvider }) {
  return {
    async readWeeklyGoals({
      token,
      userId,
      weekStartDate
    }: {
      token: string
      userId: string
      weekStartDate: string
    }): Promise<WeeklyGoalRow[]> {
      return data(
        readProvider.forUser(token).from('weekly_goals').select('*')
          .eq('user_id', userId).eq('week_start_date', weekStartDate)
          .order('created_at', { ascending: true }) as PromiseLike<QueryOutcome<WeeklyGoalRow[]>>,
        []
      )
    }
  }
}

function goalsFromMatches(
  matches: Array<{ result?: string | null; team_stats?: unknown }> | null | undefined,
  lang: string,
  weekStart: string
): TaskItem[] {
  if (!matches?.length || matches.length < 3) return fallbackTasks(lang, weekStart)
  const conceded = matches.map((match) => {
    const stats = match.team_stats && typeof match.team_stats === 'object'
      ? match.team_stats as Record<string, unknown>
      : null
    const direct = Number(stats?.goals_conceded)
    if (Number.isFinite(direct)) return direct
    const parts = String(match.result || '').split('-').map(Number)
    return parts.length === 2 && parts.every(Number.isFinite) ? parts[1] : null
  }).filter((value): value is number => Number.isFinite(value as number))
  const possession = matches.map((match) => {
    const stats = match.team_stats && typeof match.team_stats === 'object'
      ? match.team_stats as Record<string, unknown>
      : null
    return Number(stats?.possession)
  }).filter((value) => Number.isFinite(value) && value >= 0 && value <= 100)
  const wins = matches.filter((match) => {
    const [ours, theirs] = String(match.result || '').split('-').map(Number)
    return Number.isFinite(ours) && ours > theirs
  }).length
  const output: Array<[string, string, number, string]> = []
  if (conceded.length && conceded.reduce((a, b) => a + b, 0) / conceded.length > 2) {
    output.push(['reduce_goals_conceded', lang === 'en' ? 'Reduce average goals conceded' : 'Riduci la media dei gol subiti', 2, 'medium'])
  }
  if (possession.length && possession.reduce((a, b) => a + b, 0) / possession.length < 50) {
    output.push(['improve_possession', lang === 'en' ? 'Reach 50% average possession' : 'Raggiungi il 50% di possesso medio', 50, 'medium'])
  }
  if (wins / matches.length < 0.5) {
    output.push(['increase_wins', lang === 'en' ? 'Win 3 matches this week' : 'Vinci 3 partite questa settimana', 3, 'hard'])
  }
  output.push(['clean_sheet_matches', lang === 'en' ? 'Keep 2 clean sheets' : 'Ottieni 2 clean sheet', 2, 'medium'])
  output.push(['use_ai_recommendations', lang === 'en' ? 'Use AI recommendations twice' : 'Usa 2 volte i consigli IA', 2, 'easy'])
  return output.slice(0, 5).map(([goal_type, goal_description, target_value, difficulty], index) => ({
    id: `generated-${index + 1}`,
    goal_type,
    goal_description,
    target_value,
    current_value: 0,
    difficulty,
    status: 'active',
    week_start_date: weekStart
  }))
}

export function createTaskGenerator({
  readProvider,
  writeProvider
}: {
  readProvider: ReadOnlySupabaseProvider
  writeProvider: UserSupabaseWriteProvider
}) {
  return async ({
    token,
    userId,
    week,
    lang = 'it'
  }: {
    token: string
    userId: string
    week: WeekRange
    lang?: string
  }): Promise<WeeklyGoalRow[]> => {
    const reader: BackendSupabaseClient = readProvider.forUser(token)
    const existing = await data(
      reader.from('weekly_goals').select('*')
        .eq('user_id', userId).eq('week_start_date', week.start) as PromiseLike<QueryOutcome<WeeklyGoalRow[]>>,
      []
    )
    if (existing.length) return existing
    const matches = await data(
      reader.from('matches')
        .select('id, match_date, result, team_stats, data_completeness')
        .eq('user_id', userId).order('match_date', { ascending: false }).limit(10) as PromiseLike<QueryOutcome<MatchProgressRow[]>>,
      []
    )
    const generated = goalsFromMatches(matches, lang, week.start)
    const rows = generated.map(({ id: _id, ...goal }) => ({
      ...goal,
      user_id: userId,
      week_end_date: week.end,
      created_by: 'system'
    }))
    const writer = writeProvider.forUser(token)
    return data(
      writer.from('weekly_goals').insert(rows).select('*') as PromiseLike<QueryOutcome<WeeklyGoalRow[]>>,
      []
    )
  }
}

export function createTaskProgress({
  readProvider,
  writeProvider
}: {
  readProvider: ReadOnlySupabaseProvider
  writeProvider: UserSupabaseWriteProvider
}) {
  return async ({ token, userId }: { token: string; userId: string }): Promise<WeeklyGoalRow[]> => {
    const reader = readProvider.forUser(token)
    const [goals, matches] = await Promise.all([
      data(
        reader.from('weekly_goals').select('*').eq('user_id', userId).eq('status', 'active') as PromiseLike<QueryOutcome<WeeklyGoalRow[]>>,
        []
      ),
      data(
        reader.from('matches').select('id, match_date, result, team_stats, data_completeness')
          .eq('user_id', userId).order('match_date', { ascending: false }).limit(100) as PromiseLike<QueryOutcome<MatchProgressRow[]>>,
        []
      )
    ])
    const writer = writeProvider.forUser(token)
    for (const goal of goals) {
      const inWeek = matches.filter((match) =>
        Boolean(match.match_date) &&
        Boolean(goal.week_start_date) &&
        Boolean(goal.week_end_date) &&
        String(match.match_date) >= String(goal.week_start_date) &&
        String(match.match_date) <= String(goal.week_end_date)
      )
      let current = Number(goal.current_value) || 0
      if (goal.goal_type === 'complete_matches') current = inWeek.filter((match) => match.data_completeness === 'complete').length
      if (goal.goal_type === 'increase_wins') current = inWeek.filter((match) => {
        const [a, b] = String(match.result || '').split('-').map(Number)
        return Number.isFinite(a) && a > b
      }).length
      if (goal.goal_type === 'clean_sheet_matches') current = inWeek.filter((match) => Number(String(match.result || '').split('-')[1]) === 0).length
      const patch = {
        current_value: current,
        ...(current >= Number(goal.target_value) ? { status: 'completed', completed_at: new Date().toISOString() } : {})
      }
      const { error } = await writer.from('weekly_goals').update(patch)
        .eq('id', goal.id).eq('user_id', userId)
      if (error) throw Object.assign(new Error(error.message), { statusCode: 502 }) as HttpError
    }
    return goals
  }
}

export interface TasksServiceDeps {
  config: Pick<BackendConfig, 'dormant'>
  db: ReturnType<typeof createTasksDb>
  generator: ReturnType<typeof createTaskGenerator>
  progress: ReturnType<typeof createTaskProgress>
  translate?: (key: string, lang: string, vars: { count: number }) => string
  now?: () => Date
}

export function createTasksService({
  config,
  db,
  generator,
  progress,
  translate = (_key, _lang, { count }) => String(count),
  now = () => new Date()
}: TasksServiceDeps) {
  return {
    async list({
      userId,
      token,
      weekStartDate,
      lang = 'it'
    }: {
      userId: string
      token: string
      weekStartDate?: string
      lang?: string
    }) {
      const safeLang = lang === 'en' ? 'en' : 'it'
      const current = weekForDate(now())
      const normalized = validateWeekDate(weekStartDate || current.start, now(), { futureFallsBack: true })
      let tasks: Array<WeeklyGoalRow | TaskItem> = await db.readWeeklyGoals({ userId, token, weekStartDate: normalized })
      if (normalized === current.start && !tasks.length && !config.dormant) {
        assertDormantRead(config, 'tasks.list.auto-generate')
        tasks = await generator({ userId, token, week: current, lang: safeLang })
      }
      if (normalized === current.start && tasks.length && !config.dormant) {
        assertDormantRead(config, 'tasks.list.progress-sync')
        await progress({ userId, token })
        tasks = await db.readWeeklyGoals({ userId, token, weekStartDate: normalized })
      }
      const simpleDescriptions: Record<string, string> = {
        increase_wins: 'goalIncreaseWins',
        complete_matches: 'goalCompleteMatches',
        use_ai_recommendations: 'goalUseAIRecommendations',
        clean_sheet_matches: 'goalCleanSheets'
      }
      let visible = tasks.filter((task) => task && !HIDDEN_GOAL_TYPES.has(String(task.goal_type))).map((task) => ({
        ...task,
        goal_description: simpleDescriptions[String(task.goal_type)] && task.target_value
          ? translate(simpleDescriptions[String(task.goal_type)], safeLang, { count: Number(task.target_value) })
          : task.goal_description
      }))
      if (!visible.length) visible = fallbackTasks(safeLang, normalized)
      return { success: true, tasks: visible, week_start_date: normalized, count: visible.length }
    },

    async generate({
      userId,
      token,
      weekStartDate,
      lang = 'it'
    }: {
      userId: string
      token: string
      weekStartDate?: string
      lang?: string
    }) {
      assertDormantRead(config, 'tasks.generate')
      const normalized = validateWeekDate(weekStartDate || weekForDate(now()).start, now())
      const week = weekForDate(normalized)
      const tasks = await generator({ userId, token, week, lang: lang === 'en' ? 'en' : 'it' })
      return { success: true, tasks, week, count: tasks.length }
    }
  }
}

type TaskListQuery = { week_start_date?: string; lang?: string }
type TaskGenerateBody = { week_start_date?: string; lang?: string }

export function registerTaskRoutes(
  app: FastifyInstance,
  { identity, service }: { identity: IdentityProvider; service: ReturnType<typeof createTasksService> }
) {
  const failure = (reply: FastifyReply, error: HttpError | Error) =>
    reply.code(('statusCode' in error && error.statusCode) || 500).send({ error: error.message })
  app.get('/v1/tasks/list', async (request: FastifyRequest<{ Querystring: TaskListQuery }>, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return reply.send(await service.list({
        userId: session.userId,
        token: session.token,
        weekStartDate: request.query?.week_start_date,
        lang: request.query?.lang || String(request.headers['accept-language'] || '').slice(0, 2)
      }))
    } catch (error) { return failure(reply, error as HttpError) }
  })
  app.post('/v1/tasks/generate', async (request: FastifyRequest<{ Body: TaskGenerateBody }>, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return reply.send(await service.generate({
        userId: session.userId,
        token: session.token,
        weekStartDate: request.body?.week_start_date,
        lang: request.body?.lang
      }))
    } catch (error) { return failure(reply, error as HttpError) }
  })
}
