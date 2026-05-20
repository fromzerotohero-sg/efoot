/**
 * Lettura live della scheda giocatore eFHUB (HTML) per arricchire Card Advisor
 * quando il catalogo Supabase non è ancora completo. Usato da evaluate e deep-analysis.
 */

function efhubPlayerBaseUrl() {
  const fromEnv =
    (typeof process !== 'undefined' && process.env && process.env.EFHUB_PLAYER_BASE_URL) ||
    (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_EFHUB_PLAYER_BASE_URL)
  const trimmed = String(fromEnv || '').trim().replace(/\/$/, '')
  return trimmed || 'https://efhub.com/players'
}

const EFHUB_POSITION_MAP = {
  GK: 'PT',
  CB: 'DC',
  RB: 'TD',
  LB: 'TS',
  DMF: 'MED',
  CMF: 'CC',
  AMF: 'TRQ',
  LMF: 'CLS',
  RMF: 'CLD',
  CF: 'P',
  SS: 'SP',
  LWF: 'ESA',
  RWF: 'EDA'
}

let boostIndexPromise = null

async function getEfhubBoostIndex() {
  if (!boostIndexPromise) {
    boostIndexPromise = fetch('https://efhub.com/data/boosts.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)' },
      cache: 'no-store'
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const entries = [
          ...(Array.isArray(payload?.left) ? payload.left : []),
          ...(Array.isArray(payload?.right) ? payload.right : [])
        ]
        return entries.reduce((acc, boost) => {
          const id = Number(boost?.id)
          if (Number.isFinite(id)) acc[id] = boost
          return acc
        }, {})
      })
      .catch(() => {
        boostIndexPromise = null
        return {}
      })
  }
  return boostIndexPromise
}

function normalizeBoostStats(stats = {}) {
  return Object.fromEntries(
    Object.entries(stats || {})
      .map(([key, value]) => [key, Number(value)])
      .filter(([, value]) => Number.isFinite(value) && value !== 0)
  )
}

async function resolveEfhubPlayerBooster(boostId) {
  const parsed = Number(boostId)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  const boostIndex = await getEfhubBoostIndex()
  const boost = boostIndex[parsed]
  if (!boost) {
    return {
      source_boost_id: parsed,
      name: `Unknown boost ${parsed}`,
      stat_name: `Unknown boost ${parsed}`,
      source: 'efhub'
    }
  }
  return {
    source_boost_id: parsed,
    name: boost.name,
    stat_name: boost.name,
    bonus: null,
    stats: normalizeBoostStats(boost.stats),
    source: 'efhub',
    metadata: {
      japName: boost.japName,
      version: boost.version
    }
  }
}

function decodeFlightMarkup(markup = '') {
  return String(markup)
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
}

function extractJsonObject(markup, key) {
  const marker = `"${key}":{`
  const start = markup.indexOf(marker)
  if (start < 0) return null
  const objectStart = start + marker.indexOf('{')
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = objectStart; index < markup.length; index += 1) {
    const char = markup[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        const slice = markup.slice(objectStart, index + 1)
        try {
          return JSON.parse(slice)
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function extractString(markup, key) {
  const match = markup.match(new RegExp(`"${key}":"([^"]*)"`, 'i'))
  return match ? match[1] : ''
}

function extractNumber(markup, key) {
  const match = markup.match(new RegExp(`"${key}":(\\d+)`, 'i'))
  return match ? Number(match[1]) : null
}

function extractStringArray(markup, key) {
  const match = markup.match(new RegExp(`"${key}":\\[(.*?)\\]`, 'i'))
  if (!match) return []
  return match[1]
    .split(',')
    .map(item => item.replace(/^"|"$/g, '').trim())
    .filter(Boolean)
}

function normalizeEfhubPosition(position = '') {
  const value = String(position || '').trim().toUpperCase()
  return EFHUB_POSITION_MAP[value] || value
}

/**
 * @param {{ sourcePlayerId?: string, source?: string, name?: string, position?: string, category?: string, overall?: number|null }} card
 * @returns {Promise<object|null>} Oggetto in forma simile a una riga card_advisor_cards (snake_case) o null
 */
export async function fetchEfhubCardDetail(card) {
  const source = (String(card?.source || 'efhub').trim() || 'efhub')
  if (!card?.sourcePlayerId || source !== 'efhub') return null
  const base = efhubPlayerBaseUrl()
  try {
    const sourceUrl = `${base}/${encodeURIComponent(card.sourcePlayerId)}`
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisor/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      cache: 'no-store'
    })
    if (!response.ok) return null

    const markup = decodeFlightMarkup(await response.text())
    const playerDataStart = markup.indexOf('"baseStats":')
    const playerDataMarkup = playerDataStart >= 0 ? markup.slice(playerDataStart) : markup
    const baseStats = extractJsonObject(markup, 'baseStats')
    const maxStats = extractJsonObject(markup, 'maxStats')
    const player = extractJsonObject(markup, 'player')
    const playingStyle = extractString(playerDataMarkup, 'playingStyle')
    const levelCap = extractNumber(playerDataMarkup, 'initialLevelCap')
    const skills = extractStringArray(playerDataMarkup, 'skills')
    const position = normalizeEfhubPosition(
      player?.position || extractString(playerDataMarkup, 'position') || card.position
    )
    const boostId = Number(player?.boostId ?? extractNumber(playerDataMarkup, 'boostId'))
    const playerBooster = await resolveEfhubPlayerBooster(boostId)

    if (!baseStats && !playingStyle && !player) return null

    return {
      source: 'efhub',
      source_player_id: card.sourcePlayerId,
      source_url: sourceUrl,
      player_name: player?.name || card.name,
      position,
      card_type: card.category || 'Live',
      overall_level_1: Number(player?.overallRating || card.overall) || null,
      overall_max_level: Number(player?.maxOverall || player?.overallRating || card.overall) || null,
      playing_style: player?.playingStyle || playingStyle || '',
      player_skills: skills,
      base_stats: baseStats || null,
      max_stats: maxStats || baseStats || null,
      team_name: player?.team || '',
      league: player?.league || '',
      height: player?.height || null,
      max_level: levelCap,
      source_boost_id: Number.isFinite(boostId) && boostId > 0 ? boostId : null,
      available_boosters: playerBooster ? [playerBooster] : [],
      players_payload: {
        boostId: Number.isFinite(boostId) && boostId > 0 ? boostId : null,
        available_boosters: playerBooster ? [playerBooster] : []
      },
      data_quality: baseStats ? 'complete' : 'partial',
      catalog_ready: Boolean(baseStats),
      needs_review: !baseStats
    }
  } catch (error) {
    console.warn('[efhubPlayerDetail] EFHub detail unavailable:', error?.message || error)
    return null
  }
}
