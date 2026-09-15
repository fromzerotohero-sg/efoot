import {
  getPlayingStylesContract,
  resolvePlayingStyleDbName
} from '../catalog/playingStyles.js'

export const MAX_RESERVES = 12
export const MAX_ADDITIONAL_SKILLS = 5

const SKILL_ALIASES = new Map([
  ['doppiotocco', 'Double Touch'],
  ['controllodisuola', 'Sole Control'],
  ['elastico', 'Flip Flap'],
  ['veronica', 'Marseille Turn'],
  ['tagliaallespallegira', 'Cut Behind & Turn'],
  ['fintadoppiopasso', 'Scissors Feint'],
  ['colpoditesta', 'Heading'],
  ['agirodadistante', 'Long-Range Curler'],
  ['tirodalladistanza', 'Long-Range Shooting'],
  ['pallonettomirato', 'Chip Shot Control'],
  ['tirodicollo', 'Knuckle Shot'],
  ['tiroascendere', 'Dipping Shot'],
  ['tiroasalire', 'Rising Shot'],
  ['finalizzazioneacrobatica', 'Acrobatic Finishing'],
  ['colpoditacco', 'Heel Trick'],
  ['tirodiprima', 'First-time Shot'],
  ['passaggiodiprima', 'One-touch Pass'],
  ['passaggiofiltrante', 'Through Passing'],
  ['passaggiocalibrato', 'Weighted Pass'],
  ['crosscalibrato', 'Pinpoint Crossing'],
  ['esternoagiro', 'Outside Curler'],
  ['nolook', 'No Look Pass'],
  ['passaggioascavalcare', 'Low Lofted Pass'],
  ['traiettoriabassaalportiere', 'GK Low Punt'],
  ['rimessaprofondaalportiere', 'GK High Punt'],
  ['rimessalateralelunga', 'Long Throw'],
  ['rilanciodelportiere', 'GK Long Throw'],
  ['specialistadeirigori', 'Penalty Specialist'],
  ['astuzia', 'Gamesmanship'],
  ['marcatore', 'Man Marking'],
  ['tornante', 'Track Back'],
  ['intercettazione', 'Interception'],
  ['muro', 'Blocker'],
  ['dominiopallealte', 'Aerial Superiority'],
  ['scivolata', 'Sliding Tackle'],
  ['disimpegnoacrobatico', 'Acrobatic Clearance'],
  ['leader', 'Captaincy'],
  ['riservadilusso', 'Super-sub'],
  ['spiritocombattivo', 'Fighting Spirit']
])

function normalizedKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

for (const canonical of [
  'Double Touch',
  'Tap Trick',
  'Sole Control',
  'Flip Flap',
  'Marseille Turn',
  'Sombrero',
  'Cut Behind & Turn',
  'Scissors Feint',
  'Cross Over Turn',
  'Scotch Move',
  'Chop Turn',
  'Step On Skill Control',
  'Heading',
  'Long-Range Curler',
  'Long-Range Shooting',
  'Chip Shot Control',
  'Power Shot',
  'Knuckle Shot',
  'Dipping Shot',
  'Rising Shot',
  'Acrobatic Finishing',
  'Heel Trick',
  'First-time Shot',
  'One-touch Pass',
  'Through Passing',
  'Weighted Pass',
  'Long Lofted Pass',
  'Pinpoint Crossing',
  'Outside Curler',
  'Rabona',
  'No Look Pass',
  'Low Lofted Pass',
  'GK Low Punt',
  'GK High Punt',
  'Long Throw',
  'GK Long Throw',
  'Penalty Specialist',
  'Gamesmanship',
  'Man Marking',
  'Track Back',
  'Interception',
  'Blocker',
  'Aerial Superiority',
  'Sliding Tackle',
  'Acrobatic Clearance',
  'Captaincy',
  'Super-sub',
  'Fighting Spirit',
  'Shielding',
  'Aggressive Defence',
  'Anchor',
  'GK Penalty Saver',
  'Set Piece Specialist',
  'Goalkeeper Rush',
  'Utility Player',
  'Edged Crossing',
  'Phenomenal Pass',
  'Phenomenal Finishing',
  'Visionary Pass',
  'Game-changing Pass',
  'Blitz Curler',
  'Bullet Header',
  'Aerial Fort',
  'Shadow Hunt',
  'Fortress',
  'Long-reach Tackle',
  'Incisive Run',
  'Mazing Run',
  'Speeding Bullet',
  'Long Ball Expert',
  'Early Crosser',
  'Long Ranger',
  'Low Screamer',
  'Acceleration Burst',
  'Trickster',
  'Momentum Dribbling',
  'Magnetic Feet',
  'Cross Specialist',
  'Attack Trigger',
  'Attacking Surge',
  'Snap Strike',
  'GK Directing Defence',
  'GK Spirit Roar',
  'Willpower'
]) {
  SKILL_ALIASES.set(normalizedKey(canonical), canonical)
}
SKILL_ALIASES.set(normalizedKey('Penalty Saver'), 'GK Penalty Saver')
SKILL_ALIASES.set(normalizedKey('Phenomenal Passing'), 'Phenomenal Pass')

export function normalizePlayerSkillsArray(skills) {
  const output = []
  const seen = new Set()
  for (const raw of Array.isArray(skills) ? skills : []) {
    const text = String(raw || '').trim()
    if (!text) continue
    const canonical = SKILL_ALIASES.get(normalizedKey(text)) || text
    const key = normalizedKey(canonical)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(canonical)
  }
  return output
}

export function toText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function toInt(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : null
}

export function isCatalogPlayerSave(player) {
  if (!player || typeof player !== 'object') return false
  const metadata = player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const extracted =
    player.extracted_data && typeof player.extracted_data === 'object'
      ? player.extracted_data
      : {}
  return metadata.source === 'player_catalog' ||
    Boolean(metadata.catalog_link_method) ||
    metadata.saved_via === 'nuova_rosa_catalog' ||
    extracted.source === 'player_catalog'
}

export function omitClientFlags(player) {
  if (!player || typeof player !== 'object') return player
  const { refresh_original_positions: ignored, ...rest } = player
  return rest
}

export function normalizeOriginalPositions(raw, fallbackPosition = null) {
  const output = []
  for (const entry of Array.isArray(raw) ? raw : []) {
    const position = typeof entry === 'string' ? toText(entry) : toText(entry?.position)
    if (!position) continue
    output.push({
      position: position.toUpperCase(),
      competence: toText(entry?.competence) || 'Alta'
    })
  }
  if (output.length) return output
  const fallback = toText(fallbackPosition)
  return fallback ? [{ position: fallback.toUpperCase(), competence: 'Alta' }] : []
}

export function playerStyleContract(player) {
  const contract = getPlayingStylesContract(player)
  const attack = resolvePlayingStyleDbName(contract.attack) || contract.attack || null
  const defense = resolvePlayingStyleDbName(contract.defense) || contract.defense || null
  return {
    format: defense ? 'dual' : 'single',
    attack,
    defense,
    primary: attack
  }
}

export function mergeV6Styles(metadata, player) {
  const contract = playerStyleContract(player)
  const next = metadata && typeof metadata === 'object' ? { ...metadata } : {}
  if (contract.attack || contract.defense) {
    next.playing_styles = contract
    if (contract.attack) next.attacking_playing_style = contract.attack
    if (contract.defense) next.defensive_playing_style = contract.defense
  }
  return next
}

export async function lookupPlayingStyle(client, raw) {
  const name = resolvePlayingStyleDbName(raw)
  if (!name) return { id: null, name: null }
  const { data, error } = await client
    .from('playing_styles')
    .select('id, name')
    .ilike('name', name)
    .maybeSingle()
  if (error) return { id: null, name }
  return { id: data?.id || null, name: data?.name || name }
}

export function domainError(message, statusCode = 400, extra = {}) {
  const error = new Error(message)
  error.statusCode = statusCode
  Object.assign(error, extra)
  return error
}
