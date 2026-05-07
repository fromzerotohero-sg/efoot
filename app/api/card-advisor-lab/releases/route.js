import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EFHUB_HOME_URL = 'https://efhub.com/it'

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

export async function GET() {
  try {
    const response = await fetch(EFHUB_HOME_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Unable to load card releases' }, { status: response.status })
    }

    const markup = await response.text()
    const releases = parseReleases(markup)
    const totalCards = releases.reduce((sum, release) => sum + release.cards.length, 0)

    if (releases.length === 0 || totalCards === 0) {
      return NextResponse.json({ error: 'No card releases found' }, { status: 502 })
    }

    return NextResponse.json(
      {
        source: 'efhub',
        sourceUrl: EFHUB_HOME_URL,
        fetchedAt: new Date().toISOString(),
        releases
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
