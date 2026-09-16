// @ts-nocheck
import { assertDormantRead } from '../../dormant.js'
import { computeCardAdvisorBuildPreview } from '../../../../lib/cardAdvisorBuildPreview.js'
import { fetchEfhubCardDetail } from '../../../../lib/efhubPlayerDetail.js'
import { buildDeepAnalysisRequest, normalizeDeepAnalysis } from './deep-analysis.js'

export const CARD_ADVISOR_DEEP_COST = 2
export const CARD_ADVISOR_DEEP_RATE_LIMIT = { maxRequests: 6, windowMs: 60_000 }
export const EFHUB_HOME_URL = 'https://efhub.com/it'
export const CARD_IMAGE_HOSTS = new Set([
  'pesdb.net',
  'efimg.com',
  'www.efootballhub.net',
  'efootballhub.net'
])

export function normalizeAdvisorCard(raw = {}) {
  return {
    id: String(raw.id || raw.sourcePlayerId || ''),
    name: String(raw.name || '').trim(),
    position: String(raw.position || '').trim(),
    overall: Number(raw.overall) || null,
    category: String(raw.category || '').trim(),
    style: String(raw.style || '').trim(),
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    height: Number(raw.height) || null,
    weight: Number(raw.weight) || null,
    sourcePlayerId: String(raw.sourcePlayerId || '').trim(),
    source: String(raw.source || '').trim()
  }
}

function normalizeRequestCard(raw = {}) {
  return {
    ...normalizeAdvisorCard(raw),
    imageUrl: String(raw.imageUrl || '').trim(),
    source: String(raw.source || 'efhub').trim() || 'efhub'
  }
}

export function validateImageSource(src) {
  if (!src) return { ok: false, statusCode: 400, error: 'Missing image source' }
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:' || !CARD_IMAGE_HOSTS.has(url.hostname)) {
      return { ok: false, statusCode: 400, error: 'Image host not allowed' }
    }
    return { ok: true, url }
  } catch {
    return { ok: false, statusCode: 400, error: 'Invalid image source' }
  }
}

export function slugifyRelease(value = '') {
  return String(value).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function categoryFromReleaseName(name = '') {
  const lower = name.toLowerCase()
  if (lower.includes('naruto') || lower.includes('collaboration')) return 'Collaboration'
  if (lower.includes('standout')) return 'Standout'
  if (lower.includes('highlight')) return 'Highlight'
  if (lower.includes('selection')) return 'Selection'
  if (lower.includes('encore')) return 'Encore'
  return 'Special'
}

export function parseEfhubReleases(markup = '') {
  const releases = []
  for (const section of String(markup).matchAll(/<section>([\s\S]*?)<\/section>/g)) {
    const heading = section[1].match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)
    const name = decodeHtml(heading?.[1]?.replace(/<[^>]+>/g, '')).trim()
    if (!name) continue
    const cards = []
    const pattern = /<a\b[^>]*href="\/players\/(\d+)"[\s\S]*?<img\b[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]*?<span class="text-white"[^>]*>(\d+)<\/span><span class="text-white"[^>]*>([^<]+)<\/span>/g
    for (const match of section[1].matchAll(pattern)) {
      cards.push({
        id: `efhub-${match[1]}`,
        source: 'efhub',
        sourcePlayerId: match[1],
        sourceUrl: `https://efhub.com/players/${match[1]}`,
        imageUrl: decodeHtml(match[2]),
        name: decodeHtml(match[3]).trim(),
        overall: Number(match[4]),
        position: match[5].trim(),
        category: categoryFromReleaseName(name),
        style: ''
      })
    }
    if (cards.length) releases.push({
      id: slugifyRelease(name),
      name,
      date: name.match(/\d{1,2}\s+[A-Za-z]+\s+'?\d{2}/)?.[0] || '',
      status: 'active',
      cards
    })
  }
  return releases
}

function domainError(message, statusCode, extra = {}) {
  return Object.assign(new Error(message), { statusCode, ...extra })
}

async function rows(query, fallback = []) {
  const { data, error } = await query
  if (error) throw domainError(error.message, 502)
  return data ?? fallback
}

async function one(query) {
  const { data, error } = await query.maybeSingle()
  if (error) throw domainError(error.message, 502)
  return data || null
}

export function createCardAdvisorDb({ readProvider, writeProvider }) {
  const user = (token) => readProvider.forUser(token)
  const catalog = () => readProvider.forServerCatalog()
  const findCard = async (card) => {
    const client = catalog()
    let query = client.from('card_advisor_cards').select('*')
      .eq('is_active', true)
      .eq('source', card.source || 'efhub')
    if (card.sourcePlayerId) query = query.eq('source_player_id', card.sourcePlayerId)
    else if (card.id) query = query.eq('id', card.id)
    else query = query
      .ilike('player_name', `%${String(card.name || '').replace(/[%_]/g, '')}%`)
      .eq('position', card.position)
    return one(query.limit(1))
  }
  const roster = async ({ token, userId, playerLimit }: { token: string; userId: string; playerLimit?: number }) => {
    const client = user(token)
    let playersQuery = client.from('players').select('*').eq('user_id', userId)
    if (playerLimit) playersQuery = playersQuery.limit(playerLimit)
    const [players, layout, coaches, tacticalSettings, profile] = await Promise.all([
      rows(playersQuery),
      one(client.from('formation_layout').select('*').eq('user_id', userId)),
      rows(client.from('coaches').select('*').eq('user_id', userId).eq('is_active', true).limit(1)),
      one(client.from('team_tactical_settings').select('*').eq('user_id', userId)),
      one(client.from('user_profiles').select('*').eq('user_id', userId))
    ])
    return { players, layout, activeCoach: coaches[0] || null, tacticalSettings, profile }
  }
  const deepRoster = async (input) => {
    const base = await roster({ ...input, playerLimit: 40 })
    const client = user(input.token)
    const [patterns, gameAnalysis, diagnostic, feedback, performance] = await Promise.all([
      one(client.from('team_tactical_patterns').select('*').eq('user_id', input.userId)),
      one(client.from('user_game_analysis').select('*').eq('user_id', input.userId)),
      one(client.from('user_diagnostic_cache').select('*').eq('user_id', input.userId)),
      rows(client.from('user_tactical_feedback').select('*').eq('user_id', input.userId)
        .order('created_at', { ascending: false }).limit(2)),
      rows(client.from('player_performance_aggregates').select('*').eq('user_id', input.userId).limit(12))
    ])
    return { ...base, patterns, gameAnalysis, diagnostic, feedback, performance }
  }
  return {
    async readDeepAnalysisContext(input) {
      const [catalogCard, rosterContext] = await Promise.all([findCard(input.card), deepRoster(input)])
      return { catalogCard, rosterContext }
    },
    async readBuildPreviewContext(input) {
      const [catalogCard, rosterContext] = await Promise.all([findCard(input.card), roster(input)])
      return { catalogCard, rosterContext }
    },
    async readReleases() {
      const client = catalog()
      const [releases, cards] = await Promise.all([
        rows(client.from('card_advisor_releases').select('*')
          .eq('source', 'efhub').eq('is_active', true)
          .order('last_synced_at', { ascending: false }).limit(30)),
        rows(client.from('card_advisor_cards').select('*')
          .eq('source', 'efhub').eq('is_active', true)
          .order('overall_display', { ascending: false }))
      ])
      const byRelease = new Map()
      for (const card of cards) {
        const list = byRelease.get(card.release_id) || []
        list.push({
          id: `${card.source || 'efhub'}-${card.release_id}-${card.source_player_id}`,
          source: card.source,
          sourcePlayerId: card.source_player_id,
          sourceUrl: card.source_url,
          imageUrl: card.image_url,
          name: card.player_name,
          overall: card.overall_display,
          position: card.position,
          category: card.category || card.card_type || 'Special',
          style: card.playing_style || '',
        })
        byRelease.set(card.release_id, list)
      }
      return releases.map((release) => ({
        id: release.source_release_id || release.id,
        source: release.source,
        sourceUrl: release.source_url || EFHUB_HOME_URL,
        name: release.release_name,
        date: release.release_date || '',
        status: release.status || 'active',
        category: release.category || 'Special',
        cards: byRelease.get(release.id) || []
      })).filter((release) => release.cards.length)
    },
    // Kept explicit so this adapter can never be mistaken for a write path.
    async write() {
      if (!writeProvider) throw domainError('Card advisor writes are not configured', 503)
      throw domainError('Unsupported card advisor write', 405)
    }
  }
}

export const cardAdvisorDeepEngine = Object.freeze({
  buildDeepRequest: buildDeepAnalysisRequest,
  normalizeDeep: normalizeDeepAnalysis
})

export async function buildAdvisorPreview({ card, catalogCard, rosterContext, lang = 'it' }) {
  return computeCardAdvisorBuildPreview({
    card,
    catalogRow: catalogCard,
    rosterContext,
    lang: lang === 'en' ? 'en' : 'it',
    admin: null
  })
}

export function createCardAdvisorService({
  config,
  db,
  openai,
  credits,
  evaluator,
  buildPreview,
  fetchImpl = globalThis.fetch,
  fetchCardDetail = fetchEfhubCardDetail,
  now = () => new Date()
}) {
  const resolveCatalog = async (card, catalogCard) => {
    if (catalogCard) return { catalogCard, catalogSource: 'card_advisor_cards' }
    const liveCard = await fetchCardDetail(card).catch(() => null)
    return {
      catalogCard: liveCard,
      catalogSource: liveCard ? 'efhub_live' : null
    }
  }

  return {
    async deepAnalysis({ userId, token, card: input, lang = 'it', idempotencyKey }) {
      assertDormantRead(config, 'card-advisor.deep-analysis')
      const card = normalizeRequestCard(input)
      lang = lang === 'en' ? 'en' : 'it'
      if (!card.name || !card.position) throw domainError('Invalid card', 400)
      const context = await db.readDeepAnalysisContext({ userId, token, card })
      const resolved = await resolveCatalog(card, context.catalogCard)
      context.catalogCard = resolved.catalogCard
      if (!context?.catalogCard?.base_stats || context.catalogCard.enrichment_status !== 'complete') {
        throw domainError(
          lang === 'en'
            ? 'Detailed analysis is not ready for this card yet.'
            : 'Analisi dettagliata non ancora pronta per questa carta.',
          409,
          { code: 'card_data_not_ready' }
        )
      }
      const charge = await credits.deduct({
        userId, token, amount: CARD_ADVISOR_DEEP_COST,
        capability: 'card-advisor-deep-analysis', idempotencyKey
      })
      if (!charge?.ok && !charge?.success) {
        throw domainError(lang === 'en'
          ? `You need ${CARD_ADVISOR_DEEP_COST} HP to unlock the Pro verdict.`
          : `Ti servono ${CARD_ADVISOR_DEEP_COST} HP per sbloccare il verdetto Pro.`, 402, {
          code: 'insufficient_credits', requiredCredits: CARD_ADVISOR_DEEP_COST
        })
      }
      try {
        const model = process.env.CARD_ADVISOR_DEEP_MODEL || 'gpt-5.2'
        let response
        try {
          response = await openai.complete(
            await evaluator.buildDeepRequest({ ...context, card, lang, model }),
            'card-advisor-deep-analysis'
          )
        } catch (error) {
          if (error?.type !== 'model_not_found' || model === 'gpt-4o') throw error
          response = await openai.complete(
            await evaluator.buildDeepRequest({ ...context, card, lang, model: 'gpt-4o' }),
            'card-advisor-deep-analysis'
          )
        }
        return {
          success: true,
          cost: CARD_ADVISOR_DEEP_COST,
          analysis: evaluator.normalizeDeep(await openai.parseJson(response), lang)
        }
      } catch (error) {
        await credits.refund({
          userId, token, amount: CARD_ADVISOR_DEEP_COST,
          capability: 'card-advisor-deep-analysis', idempotencyKey
        })
        throw error
      }
    },

    async preview({ userId, token, card: input, lang = 'it' }) {
      const card = normalizeRequestCard(input)
      if (!card.name || !card.position) throw domainError('Invalid card', 400)
      const context = await db.readBuildPreviewContext({ userId, token, card })
      const resolved = await resolveCatalog(card, context.catalogCard)
      const preview = await buildPreview({
        ...context,
        catalogCard: resolved.catalogCard,
        card,
        lang: lang === 'en' ? 'en' : 'it'
      })
      return { preview: { ...preview, catalogSource: resolved.catalogSource } }
    },

    async releases() {
      const dbReleases = await db.readReleases()
      let live = []
      try {
        const response = await fetchImpl(EFHUB_HOME_URL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        })
        if (response.ok) live = parseEfhubReleases(await response.text())
      } catch {}
      const dbIds = new Set(dbReleases.map((release) => String(release.id || '').trim()).filter(Boolean))
      const dbMatchesLive = live.length === 0 ||
        live.every((release) => dbIds.has(String(release.id || '').trim()))
      const releases = dbReleases.length && dbMatchesLive
        ? dbReleases
        : live.length ? live : dbReleases
      if (!releases.length) throw domainError('No card releases found', 502)
      return {
        source: releases === live ? 'efhub' : 'card_advisor_cards',
        sourceUrl: EFHUB_HOME_URL,
        fetchedAt: now().toISOString(),
        releases
      }
    },

    async image(src) {
      const checked = validateImageSource(src)
      if (!checked.ok) throw domainError(checked.error, checked.statusCode)
      const response = await fetchImpl(checked.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: `${checked.url.protocol}//${checked.url.hostname}/`
        }
      })
      if (!response.ok) throw domainError('Image unavailable', response.status)
      const contentType = response.headers.get('content-type') || 'image/png'
      if (!contentType.startsWith('image/')) throw domainError('Source is not an image', 415)
      return { body: await response.arrayBuffer(), contentType }
    }
  }
}

export function registerCardAdvisorRoutes(app, { identity, service }) {
  const handle = async (reply, work) => {
    try { return reply.send(await work()) } catch (error) {
      const payload = { error: error.message }
      if (error.code) payload.code = error.code
      if (error.requiredCredits) payload.requiredCredits = error.requiredCredits
      return reply.code(error.statusCode || 500).send(payload)
    }
  }
  const authenticated = (capability, rateLimit) => ({
    config: { capability, ...(rateLimit ? { rateLimit } : {}) },
    async preValidation(request, reply) {
      try {
        request.auth = await identity.resolveUser(request)
      } catch (error) {
        const hasToken = String(request.headers?.authorization || '').toLowerCase().startsWith('bearer ')
        return reply.code(error?.statusCode || 401).send({
          error: hasToken ? 'Invalid token' : 'Unauthorized'
        })
      }
    }
  })

  app.post(
    '/v1/cardAdvisor/deepAnalysis',
    authenticated('cardAdvisor.deepAnalysis', CARD_ADVISOR_DEEP_RATE_LIMIT),
    async (request, reply) => {
      const session = request.auth
      return handle(reply, () => service.deepAnalysis({
        ...(request.body || {}),
        userId: session.userId,
        token: session.token,
        idempotencyKey: request.headers['idempotency-key'] ||
          `card-advisor-deep-analysis:${session.userId}:${request.id}`
      }))
    }
  )
  app.post(
    '/v1/cardAdvisor/buildPreview',
    authenticated('cardAdvisor.buildPreview'),
    async (request, reply) => {
      const session = request.auth
      return handle(reply, () => service.preview({
        ...(request.body || {}),
        userId: session.userId,
        token: session.token
      }))
    }
  )
  app.get('/v1/cardAdvisor/releases', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=900')
    return handle(reply, () => service.releases())
  })
  app.get('/v1/cardAdvisor/image', async (request, reply) => {
    try {
      const image = await service.image(request.query?.src)
      return reply.type(image.contentType)
        .header('Cache-Control', 'public, max-age=3600, s-maxage=86400')
        .send(image.body)
    } catch (error) {
      return reply.code(error.statusCode || 500).send({ error: error.message })
    }
  })
}
