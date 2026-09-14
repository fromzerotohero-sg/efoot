import { NextResponse } from 'next/server'
import { resolveHeroChatUser } from '@/lib/heroChatAuth'
import {
  appendMessages,
  dbMessageToClient,
  loadThreadMessages
} from '@/lib/heroChatStore'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authResponse(auth) {
  return NextResponse.json(
    { error: auth.error },
    { status: auth.status }
  )
}

async function rateLimitResponse(auth) {
  const config = RATE_LIMIT_CONFIG['/api/hero-chat']
  const result = await checkRateLimit(auth.userId, '/api/hero-chat', config.maxRequests, config.windowMs)
  if (result.allowed) return null
  return NextResponse.json(
    { error: 'Too many chat requests. Try again shortly.', resetAt: result.resetAt },
    { status: 429 }
  )
}

export async function GET(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const url = new URL(req.url)
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 80)
    const result = await loadThreadMessages(auth.admin, auth.userId, { limit })

    return NextResponse.json({
      success: true,
      thread: result.thread,
      messages: result.messages.map(dbMessageToClient)
    })
  } catch (error) {
    console.error('[hero-chat] GET error:', error)
    return NextResponse.json(
      { error: 'Unable to load chat history' },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  const auth = await resolveHeroChatUser(req)
  if (auth.error) return authResponse(auth)
  const limited = await rateLimitResponse(auth)
  if (limited) return limited

  try {
    const body = await req.json().catch(() => ({}))
    const messages = Array.isArray(body.messages) ? body.messages.slice(-2) : []
    if (!messages.length) {
      return NextResponse.json({ error: 'messages are required' }, { status: 400 })
    }

    const safeMessages = messages
      .filter((message) => message && (message.role === 'user' || message.role === 'hero' || message.role === 'system'))
      .map((message) => ({
        role: message.role,
        content: String(message.content || '').slice(0, 8000),
        payload: message.payload && typeof message.payload === 'object'
          ? message.payload
          : {}
      }))
      .filter((message) => message.content || Object.keys(message.payload).length > 0)

    const result = await appendMessages(
      auth.admin,
      auth.userId,
      safeMessages,
      { threadId: body.threadId || null }
    )

    return NextResponse.json({
      success: true,
      thread: result.thread,
      messages: result.inserted.map(dbMessageToClient)
    })
  } catch (error) {
    console.error('[hero-chat] POST error:', error)
    return NextResponse.json(
      { error: 'Unable to save chat message' },
      { status: 500 }
    )
  }
}
