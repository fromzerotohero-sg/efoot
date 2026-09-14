/**
 * Persistenza Hero Chat (service role).
 */
const SURFACE = 'hero-home'
const MAX_MESSAGES = 80

export async function getOrCreateThread(admin, userId, surface = SURFACE) {
  const { data: existing } = await admin
    .from('hero_chat_threads')
    .select('id, surface, updated_at')
    .eq('user_id', userId)
    .eq('surface', surface)
    .maybeSingle()

  if (existing?.id) return existing

  const { data: created, error } = await admin
    .from('hero_chat_threads')
    .insert({ user_id: userId, surface })
    .select('id, surface, updated_at')
    .single()

  if (error) {
    // Due richieste ravvicinate (user + assistant) possono concorrere sulla
    // unique user/surface: recupera il thread già creato dall'altra richiesta.
    const { data: concurrent } = await admin
      .from('hero_chat_threads')
      .select('id, surface, updated_at')
      .eq('user_id', userId)
      .eq('surface', surface)
      .maybeSingle()
    if (concurrent?.id) return concurrent
    throw error
  }
  return created
}

export async function loadThreadMessages(admin, userId, { surface = SURFACE, limit = 50 } = {}) {
  const thread = await getOrCreateThread(admin, userId, surface)
  const { data, error } = await admin
    .from('hero_chat_messages')
    .select('id, role, content, payload, created_at')
    .eq('thread_id', thread.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(Math.min(limit, MAX_MESSAGES))

  if (error) throw error
  return { thread, messages: data || [] }
}

export async function appendMessages(admin, userId, messages, { surface = SURFACE, threadId = null } = {}) {
  let thread
  if (threadId) {
    const { data: ownedThread, error } = await admin
      .from('hero_chat_threads')
      .select('id, surface, updated_at')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single()
    if (error || !ownedThread) throw new Error('Chat thread not found')
    thread = ownedThread
  } else {
    thread = await getOrCreateThread(admin, userId, surface)
  }

  const rows = (messages || [])
    .filter((m) => m && (m.content || m.payload))
    .map((m) => ({
      thread_id: thread.id,
      user_id: userId,
      role: m.role === 'user' ? 'user' : m.role === 'system' ? 'system' : 'hero',
      content: String(m.content || '').slice(0, 8000),
      payload: m.payload && typeof m.payload === 'object' ? m.payload : {}
    }))

  if (!rows.length) return { thread, inserted: [] }

  const { data, error } = await admin
    .from('hero_chat_messages')
    .insert(rows)
    .select('id, role, content, payload, created_at')

  if (error) throw error

  await admin
    .from('hero_chat_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', thread.id)

  // Trim oldest beyond MAX_MESSAGES
  const { data: allIds } = await admin
    .from('hero_chat_messages')
    .select('id')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: false })

  if (Array.isArray(allIds) && allIds.length > MAX_MESSAGES) {
    const toDelete = allIds.slice(MAX_MESSAGES).map((r) => r.id)
    if (toDelete.length) {
      await admin.from('hero_chat_messages').delete().in('id', toDelete)
    }
  }

  return { thread, inserted: data || [] }
}

export function dbMessageToClient(row) {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    id: row.id,
    role: row.role === 'user' ? 'user' : 'hero',
    content: row.content || '',
    kind: payload.kind || null,
    workflowId: payload.workflowId || null,
    workflowType: payload.workflowType || null,
    matchId: payload.matchId || null,
    suggestions: payload.suggestions || null,
    tips: payload.tips || null,
    plan: payload.plan || null,
    created_at: row.created_at
  }
}
