import { writeFileSync } from 'fs'

const BOOSTS_URL = 'https://efhub.com/data/boosts.json?v=dpl_8gpaZLPmcnqkbZEtdqv475w2fYrP'
const OUT_FILE = 'lib/efhubBoosterStats.js'

function normalizeBaseName(name = '') {
  return String(name)
    .replace(/\s*\+\s*\d+\s*$/u, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseLevel(name = '') {
  const match = String(name).match(/\+\s*(\d+)\s*$/u)
  return match ? Number(match[1]) : null
}

function compactStats(stats = {}) {
  return Object.fromEntries(
    Object.entries(stats)
      .filter(([, value]) => Number(value) !== 0)
      .map(([key, value]) => [key, Number(value)])
  )
}

const data = await (await fetch(BOOSTS_URL)).json()
const map = {}

for (const side of ['left', 'right']) {
  for (const boost of data?.[side] || []) {
    const base = normalizeBaseName(boost.name)
    const level = parseLevel(boost.name)
    const stats = compactStats(boost.stats)
    if (!base || !level || Object.keys(stats).length === 0) continue
    map[base] ||= {}
    map[base][level] = stats
  }
}

const source = `// Auto-generated from EFHub ${BOOSTS_URL}
// Do not edit by hand. Run: node scripts/generate-efhub-booster-stats.mjs

export const EFHUB_BOOSTER_STATS_BY_BASE_LEVEL = ${JSON.stringify(map, null, 2)}
`

writeFileSync(OUT_FILE, source)
console.log(`Wrote ${OUT_FILE}`)
console.log(Object.keys(map).sort().join('\n'))
