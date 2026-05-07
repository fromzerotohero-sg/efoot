import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_HOSTS = new Set([
  'pesdb.net',
  'www.efootballhub.net',
  'efootballhub.net'
])

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const src = searchParams.get('src')
    if (!src) {
      return NextResponse.json({ error: 'Missing image source' }, { status: 400 })
    }

    const imageUrl = new URL(src)
    if (!ALLOWED_HOSTS.has(imageUrl.hostname)) {
      return NextResponse.json({ error: 'Image host not allowed' }, { status: 400 })
    }

    const response = await fetch(imageUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `${imageUrl.protocol}//${imageUrl.hostname}/`
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Image unavailable' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/png'
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Source is not an image' }, { status: 415 })
    }

    const body = await response.arrayBuffer()
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      }
    })
  } catch (error) {
    console.error('[card-advisor-lab:image] proxy error:', error)
    return NextResponse.json({ error: 'Image proxy error' }, { status: 500 })
  }
}
