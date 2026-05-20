/**
 * Regole difesa eFootball (allineate a info_rag §3.4 e validateFormationLimits):
 * - max 3 DC, max 1 TD, max 1 TS tra i titolari
 * - almeno 1 terzino (TD o TS) obbligatorio se ci sono difensori in campo
 */

const DEFENSE_ROLES = ['DC', 'TD', 'TS']

/**
 * @param {Array<{ position?: string }>} titolari
 * @returns {{ dc: number, td: number, ts: number, fullbacks: number, total: number }}
 */
export function countDefenseRolesFromTitolari(titolari) {
  const counts = { dc: 0, td: 0, ts: 0 }
  for (const p of titolari || []) {
    const pos = String(p?.position || '').trim().toUpperCase()
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
  if (defenders >= 2 && fullbacks < 1) errors.push('min_1_fullback')
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
  let slotRole = incomingRole ? String(incomingRole).trim().toUpperCase() : ''

  for (const p of titolari || []) {
    let pos = String(p?.position || '').trim().toUpperCase()
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

  const slotRole = String(replaced.position || '').trim().toUpperCase()
  const reserveCardRole = String(reserve?.position || '').trim().toUpperCase()
  const after = countDefenseAfterSwap(titolari, replacePlayerId, slotRole)
  const errors = getDefenseRuleViolations(after)

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
  else if (c.dc >= 3) warn.push('già 3 DC (non sostituire TD/TS con DC)')
  if (c.fullbacks === 0 && c.total >= 2) warn.push('manca terzino (serve almeno 1 TD o TS)')
  const base = parts.join(', ')
  return warn.length ? `${base} — ${warn.join('; ')}` : base
}

export { DEFENSE_ROLES }
