import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EFHUB_HOME_URL = 'https://efhub.com/it'

const RELEASE_SELECT = 'id, source, source_release_id, source_url, release_name, release_date, category, status, last_synced_at'
const CARD_SELECT = [
  'release_id',
  'source',
  'source_player_id',
  'source_url',
  'player_name',
  'position',
  'overall_display',
  'category',
  'image_url',
  'card_type',
  'playing_style'
].join(',')

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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

function parseCards(sectionMarkup, releaseName) {
  const cards = []
  const cardPattern = /<a\b[^>]*href="\/players\/(\d+)"[\s\S]*?<img\b[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]*?<span class="text-white"[^>]*>(\d+)<\/span><span class="text-white"[^>]*>([^<]+)<\/span>/g
  let match

  while ((match = cardPattern.exec(sectionMarkup)) !== null) {
    const sourcePlayerId = match[1]
    const imageUrl = decodeHtml(match[2])
    const playerName = decodeHtml(match[3]).trim()
    const overall = Number(match[4])
    const position = decodeHtml(match[5]).trim()

    if (!sourcePlayerId || !playerName || !imageUrl || !overall || !position) continue

    cards.push({
      id: `efhub-${sourcePlayerId}`,
      source: 'efhub',
      sourcePlayerId,
      sourceUrl: `https://efhub.com/players/${sourcePlayerId}`,
      name: playerName,
      position,
      overall,
      category: categoryFromReleaseName(releaseName),
      style: '',
      imageUrl
    })
  }

  return cards
}

function parseReleases(markup) {
  const releases = []
  const sectionPattern = /<section>([\s\S]*?)<\/section>/g
  let sectionMatch

  while ((sectionMatch = sectionPattern.exec(markup)) !== null) {
    const sectionMarkup = sectionMatch[1]
    const headingMatch = sectionMarkup.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)
    if (!headingMatch) continue

    const releaseName = decodeHtml(headingMatch[1].replace(/<[^>]+>/g, '')).trim()
    if (!releaseName) continue

    const cards = parseCards(sectionMarkup, releaseName)
    if (cards.length === 0) continue

    releases.push({
      id: slugify(releaseName),
      name: releaseName,
      date: releaseName.match(/\d{1,2}\s+[A-Za-z]+\s+'?\d{2}/)?.[0] || '',
      status: 'active',
      cards
    })
  }

  return releases
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

function normalizeDbCard(row) {
  return {
    id: `${row.source || 'efhub'}-${row.release_id}-${row.source_player_id}`,
    source: row.source || 'efhub',
    sourcePlayerId: row.source_player_id,
    sourceUrl: row.source_url,
    name: row.player_name,
    position: row.position,
    overall: Number(row.overall_display) || null,
    category: row.category || row.card_type || 'Special',
    style: row.playing_style || '',
    imageUrl: row.image_url
  }
}

function normalizeDbRelease(release, cardsByRelease) {
  const cards = cardsByRelease.get(release.id) || []
  return {
    id: release.source_release_id || release.id,
    source: release.source || 'efhub',
    sourceUrl: release.source_url || EFHUB_HOME_URL,
    name: release.release_name,
    date: release.release_date || '',
    status: release.status || 'active',
    category: release.category || 'Special',
    cards: cards.map(normalizeDbCard)
  }
}

async function fetchDbReleases() {
  const admin = createAdminClient()
  if (!admin) return []

  const [releasesRes, cardsRes] = await Promise.all([
    admin
      .from('card_advisor_releases')
      .select(RELEASE_SELECT)
      .eq('source', 'efhub')
      .eq('is_active', true)
      .order('last_synced_at', { ascending: false }),
    admin
      .from('card_advisor_cards')
      .select(CARD_SELECT)
      .eq('source', 'efhub')
      .eq('is_active', true)
      .order('overall_display', { ascending: false })
  ])

  if (releasesRes.error || cardsRes.error) {
    console.warn('[card-advisor-lab:releases] DB source unavailable:', releasesRes.error || cardsRes.error)
    return []
  }

  const cardsByRelease = new Map()
  ;(cardsRes.data || []).forEach(card => {
    const current = cardsByRelease.get(card.release_id) || []
    current.push(card)
    cardsByRelease.set(card.release_id, current)
  })

  return (releasesRes.data || [])
    .map(release => normalizeDbRelease(release, cardsByRelease))
    .filter(release => release.cards.length > 0)
}

async function fetchLiveReleases() {
  const response = await fetch(EFHUB_HOME_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error(`Unable to load card releases (${response.status})`)
  }

  const markup = await response.text()
  return parseReleases(markup)
}

function releaseIds(releases = []) {
  return releases.map(release => String(release.id || '').trim()).filter(Boolean)
}

function dbMatchesLive(dbReleases = [], liveReleases = []) {
  const liveIds = releaseIds(liveReleases)
  if (liveIds.length === 0) return true

  const dbIds = new Set(releaseIds(dbReleases))
  return liveIds.every(id => dbIds.has(id))
}

export async function GET() {
  try {
    const dbReleases = await fetchDbReleases()
    const dbTotalCards = dbReleases.reduce((sum, release) => sum + release.cards.length, 0)

    let liveReleases = []
    try {
      liveReleases = await fetchLiveReleases()
    } catch (liveError) {
      console.warn('[card-advisor-lab:releases] live source unavailable:', liveError)
    }
    const liveTotalCards = liveReleases.reduce((sum, release) => sum + release.cards.length, 0)

    if (dbReleases.length > 0 && dbTotalCards > 0 && dbMatchesLive(dbReleases, liveReleases)) {
      return NextResponse.json(
        {
          source: 'card_advisor_cards',
          sourceUrl: EFHUB_HOME_URL,
          fetchedAt: new Date().toISOString(),
          releases: dbReleases
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=300, s-maxage=900'
          }
        }
      )
    }

    if (liveReleases.length === 0 || liveTotalCards === 0) {
      if (dbReleases.length > 0 && dbTotalCards > 0) {
        return NextResponse.json(
          {
            source: 'card_advisor_cards',
            sourceUrl: EFHUB_HOME_URL,
            fetchedAt: new Date().toISOString(),
            releases: dbReleases
          },
          {
            headers: {
              'Cache-Control': 'public, max-age=300, s-maxage=900'
            }
          }
        )
      }
      return NextResponse.json({ error: 'No card releases found' }, { status: 502 })
    }

    return NextResponse.json(
      {
        source: 'efhub',
        sourceUrl: EFHUB_HOME_URL,
        fetchedAt: new Date().toISOString(),
        releases: liveReleases
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=900'
        }
      }
    )
  } catch (error) {
    console.error('[card-advisor-lab:releases] error:', error)
    return NextResponse.json({ error: 'Card releases unavailable' }, { status: 500 })
  }
}
