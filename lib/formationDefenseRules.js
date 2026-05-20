/**
 * Regole difesa eFootball (allineate a info_rag §3.4 e validateFormationLimits):
 * - max 3 DC, max 1 TD, max 1 TS tra i titolari
 * - 3 DC sono validi; se vuoi il 4° difensore deve essere TD/TS, non un altro DC
 * - se hai già 3 DC: non proporre una riserva card DC fuori da uno slot DC (es. Thuram DC al posto di Marcelo CLS)
 */

const DEFENSE_ROLES = ['DC', 'TD', 'TS']
const FULLBACK_ROLES = ['TD', 'TS']

function normalizeRole(value) {
  return String(value || '').trim().toUpperCase()
}

function getPlayerRoleSet(player) {
  const roles = new Set()
  const primary = normalizeRole(player?.position)
  if (primary) roles.add(primary)

  const originals = Array.isArray(player?.original_positions) ? player.original_positions : []
  for (const entry of originals) {
    const role = normalizeRole(typeof entry === 'string' ? entry : entry?.position)
    if (role) roles.add(role)
  }

  return roles
}

function canPlayAnyRole(player, roles) {
  const playerRoles = getPlayerRoleSet(player)
  return roles.some((role) => playerRoles.has(role))
}

/**
 * @param {Array<{ position?: string }>} titolari
 * @returns {{ dc: number, td: number, ts: number, fullbacks: number, total: number }}
 */
export function countDefenseRolesFromTitolari(titolari) {
  const counts = { dc: 0, td: 0, ts: 0 }
  for (const p of titolari || []) {
    const pos = normalizeRole(p?.position)
    if (pos === 'DC') counts.dc += 1
    else if (pos === 'TD') counts.td += 1
    else if (pos === 'TS') counts.ts += 1
  }
  return {
    ...counts,
    fullbacks: counts.td + counts.ts,
    total: counts.dc + counts.td + counts.ts
  }
}

/**
 * @param {{ dc: number, td: number, ts: number, fullbacks?: number }} counts
 * @returns {string[]} codici errore
 */
export function getDefenseRuleViolations(counts) {
  const errors = []
  if (counts.dc > 3) errors.push('max_3_dc')
  if (counts.td > 1) errors.push('max_1_td')
  if (counts.ts > 1) errors.push('max_1_ts')
  const fullbacks = counts.fullbacks != null ? counts.fullbacks : counts.td + counts.ts
  const defenders = counts.dc + fullbacks
  // 3 DC sono validi; il problema nasce quando il quarto difensore non è TD/TS.
  if (defenders >= 4 && counts.dc >= 3 && fullbacks < 1) errors.push('min_1_fullback_as_fourth_defender')
  return errors
}

/**
 * Simula sostituzione: la riserva entra nello STESSO slot/ruolo del titolare uscente.
 * @param {Array<{ id: string, position?: string }>} titolari
 * @param {string} replacePlayerId
 * @param {string} [incomingRole] - ruolo slot del titolare uscente (se già noto)
 * @returns {{ dc: number, td: number, ts: number, fullbacks: number }}
 */
export function countDefenseAfterSwap(titolari, replacePlayerId, incomingRole) {
  const counts = { dc: 0, td: 0, ts: 0 }
  let slotRole = incomingRole ? normalizeRole(incomingRole) : ''

  for (const p of titolari || []) {
    let pos = normalizeRole(p?.position)
    if (p.id === replacePlayerId) {
      if (!slotRole) slotRole = pos
      pos = slotRole
    }
    if (pos === 'DC') counts.dc += 1
    else if (pos === 'TD') counts.td += 1
    else if (pos === 'TS') counts.ts += 1
  }

  return {
    ...counts,
    fullbacks: counts.td + counts.ts,
    slotRole
  }
}

/**
 * @param {Array<{ id: string, position?: string }>} titolari
 * @param {{ id: string, position?: string }} reserve
 * @param {string} replacePlayerId
 * @returns {{ valid: boolean, errors: string[], slotRole: string, reserveCardRole: string }}
 */
export function validateStartingXISwap(titolari, reserve, replacePlayerId) {
  const replaced = (titolari || []).find((p) => p.id === replacePlayerId)
  if (!replaced) {
    return { valid: false, errors: ['replace_not_in_xi'], slotRole: '', reserveCardRole: '' }
  }

  const slotRole = normalizeRole(replaced.position)
  const reserveCardRole = normalizeRole(reserve?.position)
  const before = countDefenseRolesFromTitolari(titolari)
  const after = countDefenseAfterSwap(titolari, replacePlayerId, slotRole)
  const errors = getDefenseRuleViolations(after)

  const reserveCanBeFullbackInThisSlot = FULLBACK_ROLES.includes(slotRole) && canPlayAnyRole(reserve, [slotRole])

  // Caso jambo: già 3 DC → un altro DC è ok solo se esce un DC,
  // oppure se quella card può davvero coprire lo slot TD/TS suggerito.
  if (reserveCardRole === 'DC' && before.dc >= 3 && slotRole !== 'DC' && !reserveCanBeFullbackInThisSlot) {
    errors.push('dc_reserve_with_3_dc_already')
  }

  return {
    valid: errors.length === 0,
    errors,
    slotRole,
    reserveCardRole
  }
}

/** Testo compatto per prompt contromisure */
export function formatDefenseLineupSummary(titolari) {
  const c = countDefenseRolesFromTitolari(titolari)
  if (c.total === 0) return 'nessun DC/TD/TS in titolari'
  const parts = []
  if (c.dc) parts.push(`${c.dc} DC`)
  if (c.td) parts.push(`${c.td} TD`)
  if (c.ts) parts.push(`${c.ts} TS`)
  const warn = []
  if (c.dc > 3) warn.push('ERRORE: 4+ DC in formazione — correggi prima di suggerire altri DC')
  else if (c.dc >= 3 && c.fullbacks > 0) warn.push('3 DC + terzino ok — non aggiungere 4° DC')
  else if (c.dc >= 3) warn.push('3 DC ok — se aggiungi un 4° difensore deve essere TD/TS')
  const base = parts.join(', ')
  return warn.length ? `${base} — ${warn.join('; ')}` : base
}

export { DEFENSE_ROLES, FULLBACK_ROLES }
