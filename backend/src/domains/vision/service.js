import {
  PLAYER_PROMPT,
  COACH_PROMPT,
  FORMATION_PROMPT,
  GAME_ANALYSIS_PROMPT,
  matchSectionPrompt
} from './prompts.js'

export const VISION_SECTIONS = [
  'player_ratings',
  'team_stats',
  'attack_areas',
  'ball_recovery_zones',
  'formation_style'
]

const ANALYSIS_KEYS = [
  'goal_types',
  'shot_usage',
  'special_commands',
  'passing',
  'dribbling',
  'defense'
]
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

function serviceError(message, statusCode, type = 'validation') {
  const error = new Error(message)
  error.statusCode = statusCode
  error.type = type
  return error
}

function assertLive(config) {
  if (config?.dormant) {
    throw serviceError('Vision calls are disabled in dormant mode', 403, 'dormant')
  }
}

function validateImage(value) {
  if (!value || typeof value !== 'string') {
    throw serviceError('Image is required', 400)
  }
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) {
    throw serviceError('Invalid image payload', 400, 'invalid_image_payload')
  }
  const base64 = value.split(',')[1] || ''
  if ((base64.length * 3) / 4 > MAX_IMAGE_BYTES) {
    throw serviceError('Image too large (max 10MB)', 400, 'image_too_large')
  }
  return value
}

function validateImages(input, maximum = 2) {
  let values = input?.imageDataUrls || (input?.imageDataUrl ? [input.imageDataUrl] : [])
  if (!Array.isArray(values)) values = [values]
  if (values.length === 0) throw serviceError('At least one image is required', 400)
  if (values.length > maximum) throw serviceError(`Maximum ${maximum} images`, 400)
  return values.map(validateImage)
}

function request(prompt, images, maxTokens) {
  return {
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...images.map((url) => ({
          type: 'image_url',
          image_url: { url, detail: 'high' }
        }))
      ]
    }],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: maxTokens
  }
}

async function completeJson(openai, body, operation, fallbackModel = 'gpt-4o') {
  try {
    return await openai.parseJson(await openai.complete(body, operation))
  } catch (error) {
    if (error?.type !== 'model_not_found' || body.model === fallbackModel) throw error
    const fallback = { ...body, model: fallbackModel }
    return openai.parseJson(await openai.complete(fallback, `${operation}-fallback`))
  }
}

async function charge(credits, capability, input, cost = 1) {
  const result = await credits.deduct({
    capability,
    amount: cost,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey
  })
  if (!result?.ok) throw serviceError('Insufficient credits', 402, 'insufficient_credits')
  return { capability, amount: cost, userId: input.userId, idempotencyKey: input.idempotencyKey }
}

async function withRefund(credits, charged, action) {
  try {
    return await action()
  } catch (error) {
    await credits.refund(charged)
    throw error
  }
}

function toInt(value) {
  if (value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : null
}

export function normalizePlayer(value) {
  if (!value || typeof value !== 'object') return value
  const player = { ...value }
  if (player.overall_rating != null) player.overall_rating = toInt(player.overall_rating)
  if (player.base_stats && typeof player.base_stats === 'object') {
    player.base_stats = Object.fromEntries(
      Object.entries(player.base_stats)
        .filter(([, group]) => group && typeof group === 'object')
        .map(([groupName, group]) => [
          groupName,
          Object.fromEntries(
            Object.entries(group)
              .filter(([, stat]) => stat != null)
              .map(([name, stat]) => [name, toInt(stat)])
          )
        ])
    )
  }
  for (const [key, maximum] of [
    ['skills', 40],
    ['additional_skills', 5],
    ['native_skills', 40],
    ['com_skills', 20],
    ['ai_playstyles', 10],
    ['boosters', 10]
  ]) {
    if (Array.isArray(player[key])) player[key] = player[key].slice(0, maximum)
  }
  player.additional_skills ||= []
  if (!Array.isArray(player.native_skills)) {
    const additional = new Set(player.additional_skills.map((item) => String(item).trim().toLowerCase()))
    player.native_skills = Array.isArray(player.skills)
      ? player.skills.filter((item) => !additional.has(String(item).trim().toLowerCase()))
      : []
  }
  if (!Array.isArray(player.original_positions)) player.original_positions = []
  if (player.original_positions.length === 0 && player.position) {
    player.original_positions = [{ position: player.position, competence: 'Alta' }]
  }
  return player
}

export function normalizeCoach(value) {
  if (!value || typeof value !== 'object') return value
  const coach = { ...value }
  if (coach.age != null) coach.age = toInt(coach.age)
  const source = coach.playing_style_competence
  if (source && typeof source === 'object') {
    const aliases = {
      overload: 'pressing_totale',
      sovraccarico: 'pressing_totale',
      superioridad: 'pressing_totale',
      pressingtotale: 'pressing_totale',
      'pressing totale': 'pressing_totale'
    }
    const allowed = new Set([
      'possesso_palla', 'contropiede_veloce', 'contrattacco',
      'vie_laterali', 'passaggio_lungo', 'pressing_totale'
    ])
    coach.playing_style_competence = {}
    for (const [raw, score] of Object.entries(source)) {
      const key = aliases[String(raw).toLowerCase().trim()] || raw
      if (allowed.has(key) && coach.playing_style_competence[key] == null) {
        coach.playing_style_competence[key] = toInt(score)
      }
    }
  }
  if (Array.isArray(coach.stat_boosters)) {
    coach.stat_boosters = coach.stat_boosters
      .filter((item) => item && typeof item === 'object' && item.stat_name && item.bonus !== undefined)
      .map((item) => ({ stat_name: String(item.stat_name), bonus: toInt(item.bonus) || 0 }))
      .slice(0, 10)
  }
  return coach
}

function clamp(value, low, high, fallback = null) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(low, Math.min(high, number)) : fallback
}

export function normalizeFormation(value) {
  const data = value && typeof value === 'object' ? { ...value } : {}
  const used = new Set()
  data.players = Array.isArray(data.players) ? data.players.map((source, index) => {
    const player = { ...source }
    let slot = clamp(player.slot_index, 0, 10, index)
    if (used.has(slot)) slot = Array.from({ length: 11 }, (_, i) => i).find((i) => !used.has(i)) ?? Math.min(index, 10)
    used.add(slot)
    player.slot_index = slot
    player.x_percent = clamp(player.x_percent ?? player.x, 0, 100)
    player.y_percent = clamp(player.y_percent ?? player.y, 0, 100)
    const rating = Number(player.overall_rating)
    if (player.overall_rating != null && (!Number.isFinite(rating) || rating < 40 || rating > 110)) {
      player.overall_rating = null
    }
    if (typeof player.player_name === 'string') {
      const name = player.player_name.trim()
      if (name.length < 2 || name.length > 100 || /[\x00-\x1f\x7f]/.test(name)) player.player_name = null
    }
    return player
  }) : []
  if (!data.coach || typeof data.coach !== 'object' || typeof data.coach.coach_name !== 'string') data.coach = null
  if (typeof data.formation === 'string' && !/^\d+-\d+(?:-\d+){0,2}$/.test(data.formation.trim())) data.formation = null
  const profile = data.visual_tactical_profile
  const enumValue = (value, values) => values.includes(String(value).toLowerCase()) ? String(value).toLowerCase() : 'unclear'
  const list = (value) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 4) : []
  data.visual_tactical_profile = {
    width_profile: enumValue(profile?.width_profile, ['wide', 'narrow', 'balanced', 'unclear']),
    central_density: enumValue(profile?.central_density, ['high', 'medium', 'low', 'unclear']),
    side_bias: enumValue(profile?.side_bias, ['left', 'right', 'balanced', 'unclear']),
    isolated_striker: profile?.isolated_striker === true,
    two_strikers: profile?.two_strikers === true,
    attackable_zones: list(profile?.attackable_zones),
    defensive_gaps: list(profile?.defensive_gaps),
    formation_confidence: clamp(profile?.formation_confidence, 0, 1, 0),
    shape_confidence: clamp(profile?.shape_confidence, 0, 1, 0),
    slot_confidence: clamp(profile?.slot_confidence, 0, 1, 0),
    uncertain_points: list(profile?.uncertain_points)
  }
  data.slot_positions = Object.fromEntries(data.players
    .filter((player) => player.x_percent != null && player.y_percent != null)
    .map((player) => [player.slot_index, {
      x: player.x_percent,
      y: player.y_percent,
      position: String(player.position || '').trim().toUpperCase() || '?'
    }]))
  return data
}

function number(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return null
  const parsed = Number.parseFloat(value.replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeMatchSection(section, data, isHome = null) {
  if (!data || typeof data !== 'object') return {}
  if (section === 'player_ratings') {
    const output = { cliente: {}, avversario: {} }
    for (const [name, item] of Object.entries(data.ratings || data)) {
      if (!item || typeof item !== 'object' || number(item.rating) == null) continue
      const team = String(item.team || '').toLowerCase()
      const client = team.includes('cliente') || team === (isHome === false ? 'team2' : 'team1')
      const opponent = team.includes('avversario') || team === 'opponent' || team === (isHome === false ? 'team1' : 'team2')
      if (client) output.cliente[name] = { rating: number(item.rating) }
      else if (opponent) output.avversario[name] = { rating: number(item.rating) }
    }
    return {
      cliente: Object.keys(output.cliente).length ? output.cliente : null,
      avversario: Object.keys(output.avversario).length ? output.avversario : null
    }
  }
  if (section === 'team_stats') {
    const side = isHome === false ? (data.team2 || data.right || data.away) : (data.team1 || data.left || data.home)
    const source = side || data
    const output = {}
    for (const field of [
      'possession', 'shots', 'shots_on_target', 'fouls', 'offsides', 'corner_kicks',
      'free_kicks', 'passes', 'successful_passes', 'crosses', 'interceptions',
      'tackles', 'saves', 'goals_scored', 'goals_conceded'
    ]) {
      if (number(source[field]) != null) output[field] = number(source[field])
    }
    const raw = String(data.result || '').replace(/\s/g, '')
    if (/^\d+-\d+$/.test(raw)) {
      const [left, right] = raw.split('-')
      output.result = isHome === false ? `${right}-${left}` : raw
      output.goals_scored = Number(isHome === false ? right : left)
      output.goals_conceded = Number(isHome === false ? left : right)
    }
    return output
  }
  if (section === 'attack_areas') {
    const sides = data.team1 || data.team2
      ? [['team1', data.team1], ['team2', data.team2]]
      : [['team1', data]]
    return Object.fromEntries(sides.filter(([, side]) => side).map(([name, side]) => [
      name,
      Object.fromEntries(['left', 'center', 'right'].map((key) => [key, typeof side[key] === 'number' ? side[key] : null]))
    ]))
  }
  if (section === 'ball_recovery_zones') {
    const zones = Array.isArray(data) ? data : (data.zones || data.recovery_zones || [])
    return zones.filter((zone) => zone && typeof zone === 'object')
      .map((zone) => ({ x: clamp(zone.x, 0, 1), y: clamp(zone.y, 0, 1), team: typeof zone.team === 'string' ? zone.team : 'team1' }))
      .filter((zone) => zone.x != null && zone.y != null)
  }
  return {
    formation_played: typeof data.formation === 'string' ? data.formation.trim() : null,
    playing_style_played: typeof data.playing_style === 'string' ? data.playing_style.trim() : null,
    team_strength: typeof data.team_strength === 'number' ? data.team_strength : (typeof data.strength === 'number' ? data.strength : null)
  }
}

function emptyAnalysis() {
  return Object.fromEntries(ANALYSIS_KEYS.map((key) => [key, {}]))
}

function analysisPart(data) {
  const output = emptyAnalysis()
  for (const key of ANALYSIS_KEYS) {
    if (data?.[key] && typeof data[key] === 'object') output[key] = data[key]
  }
  return output
}

function mergeAnalysis(left, right) {
  return Object.fromEntries(ANALYSIS_KEYS.map((key) => [key, { ...left[key], ...right[key] }]))
}

export function createGameAnalysisStore({ readProvider, writeProvider }) {
  return {
    async save({ token, userId, stats, capturedAt }) {
      const client = writeProvider.forUser(token)
      const { error } = await client.from('user_game_analysis').upsert({
        user_id: userId,
        stats,
        captured_at: capturedAt,
        updated_at: capturedAt
      }, { onConflict: 'user_id' })
      if (error) throw serviceError(error.message, 502, 'database_error')
    },
    async get({ token, userId }) {
      const client = readProvider.forUser(token)
      const { data, error } = await client.from('user_game_analysis')
        .select('stats, captured_at').eq('user_id', userId).maybeSingle()
      if (error) throw serviceError(error.message, 502, 'database_error')
      return {
        captured_at: data?.captured_at || null,
        has_stats: Boolean(data?.stats && Object.keys(data.stats).length),
        stats: data?.stats || null
      }
    }
  }
}

export function createVisionService({ openai, credits, gameAnalysisStore = null, config = {} }) {
  if (!openai || !credits) throw new TypeError('openai and credits providers are required')

  const extract = async (input, specification) => {
    assertLive(config)
    const images = validateImages(input, specification.maximum)
    const charged = await charge(credits, specification.capability, input, images.length)
    return withRefund(credits, charged, async () => {
      const parsed = await completeJson(
        openai,
        request(specification.prompt, images, specification.maxTokens),
        specification.operation
      )
      return specification.normalize(parsed)
    })
  }

  return {
    async extractPlayer(input) {
      const player = await extract(input, {
        capability: 'vision.extractPlayer',
        operation: 'extract-player',
        prompt: PLAYER_PROMPT,
        maximum: 1,
        maxTokens: 2500,
        normalize: (data) => normalizePlayer(data.player && typeof data.player === 'object' ? data.player : data)
      })
      if (!player?.player_name || typeof player.player_name !== 'string' || !player.player_name.trim()) {
        throw serviceError('Player name is required', 400)
      }
      return { player }
    },

    async extractCoach(input) {
      const coach = await extract(input, {
        capability: 'vision.extractCoach',
        operation: 'extract-coach',
        prompt: COACH_PROMPT,
        maximum: 1,
        maxTokens: 2000,
        normalize: (data) => normalizeCoach(data.coach && typeof data.coach === 'object' ? data.coach : data)
      })
      if (coach?.age != null && (coach.age < 16 || coach.age > 70)) throw serviceError('Extracted data contains invalid values', 400)
      if (typeof coach?.coach_name === 'string' && (coach.coach_name.trim().length < 2 || coach.coach_name.length > 100 || /[\x00-\x1f\x7f]/.test(coach.coach_name))) {
        throw serviceError('Extracted data contains invalid values', 400)
      }
      return { coach }
    },

    async extractFormation(input) {
      const images = validateImages(input, 2)
      const result = await extract({ ...input, imageDataUrls: images }, {
        capability: 'vision.extractFormation',
        operation: 'extract-formation',
        prompt: FORMATION_PROMPT,
        maximum: 2,
        maxTokens: 4500,
        normalize: normalizeFormation
      })
      return {
        formation: result.formation || null,
        images_processed: images.length,
        slot_positions: Object.keys(result.slot_positions).length >= 8 ? result.slot_positions : {},
        players: result.players,
        coach: result.coach,
        visual_tactical_profile: result.visual_tactical_profile
      }
    },

    async extractMatchData(input) {
      assertLive(config)
      validateImage(input.imageDataUrl)
      if (!VISION_SECTIONS.includes(input.section)) throw serviceError('Invalid section', 400)
      const charged = await charge(credits, 'vision.extractMatch', input)
      return withRefund(credits, charged, async () => {
        const raw = await completeJson(openai, request(
          matchSectionPrompt(input.section, input.userTeamInfo, input.is_home),
          [input.imageDataUrl],
          2000
        ), `extract-match-data-${input.section}`)
        const data = normalizeMatchSection(input.section, raw, typeof input.is_home === 'boolean' ? input.is_home : null)
        const result = input.section === 'team_stats' ? (data.result || null) : null
        if (data && typeof data === 'object' && !Array.isArray(data)) delete data.result
        return { section: input.section, data, result, raw }
      })
    },

    async extractGameAnalysis(input) {
      assertLive(config)
      const images = validateImages(input, 2)
      await charge(credits, 'vision.extractGameAnalysis', input, images.length)
      let stats = emptyAnalysis()
      try {
        const first = analysisPart(await completeJson(openai, request(GAME_ANALYSIS_PROMPT, [images[0]], 2000), 'extract-game-analysis'))
        if (images.length === 1) stats = first
        else {
          try {
            const second = analysisPart(await completeJson(openai, request(GAME_ANALYSIS_PROMPT, [images[1]], 2000), 'extract-game-analysis'))
            stats = mergeAnalysis(first, second)
          } catch {
            stats = first
          }
        }
      } catch {
        throw serviceError('Could not read data from image', 422, 'unreadable_analysis_image')
      }
      if (Object.values(stats).every((value) => Object.keys(value).length === 0)) {
        throw serviceError('Could not read data from image', 422, 'unreadable_analysis_image')
      }
      const captured_at = new Date().toISOString()
      if (gameAnalysisStore) await gameAnalysisStore.save({ token: input.token, userId: input.userId, stats, capturedAt: captured_at })
      return { success: true, captured_at, stats }
    },

    async getGameAnalysis(input) {
      return gameAnalysisStore ? gameAnalysisStore.get({ token: input.token, userId: input.userId }) : { captured_at: null, has_stats: false, stats: null }
    }
  }
}
