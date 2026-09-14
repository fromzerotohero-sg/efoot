/**
 * Costo progression point per tacca (macro-area), allineato alla logica EFHub:
 * la prossima tacca costa `ceil(nextTick / 4)`, dove `nextTick` e la tacca
 * che si sta raggiungendo.
 *
 * Fasce:
 * - tacche 1-4: costo 1
 * - tacche 5-8: costo 2
 * - tacche 9-12: costo 3
 * - tacche 13-16: costo 4
 * - tacche 17-20: costo 5
 * - tacche 21-24: costo 6
 * - tacca 25: costo 7
 *
 * Non copre l'overall: solo quanti PT servono per una distribuzione di tacche.
 */

/** Ultimo livello "prima tacca" ammesso: livello 24 -> tacca 25. */
export const MAX_LIVELLO_PRIMA_TACCA = 24

/** Tacche massime per macro con questa scala. */
export const MAX_TACCE_PER_MACRO = MAX_LIVELLO_PRIMA_TACCA + 1

/**
 * @param {number} livelloPrima tacce gia allocate in quella macro (intero >= 0)
 * @returns {number | null} costo PT della prossima tacca, o null se oltre il massimo noto
 */
export function costoProssimaTacca(livelloPrima) {
  const L = Math.floor(Number(livelloPrima))
  if (!Number.isFinite(L) || L < 0) return null
  if (L > MAX_LIVELLO_PRIMA_TACCA) return null
  return Math.ceil((L + 1) / 4)
}

/**
 * Costo totale per portare una macro da 0 a `numTacche` tacche.
 * @param {number} numTacche
 * @returns {number | null}
 */
export function costoTotaleTacche(numTacche) {
  const n = Math.floor(Number(numTacche))
  if (!Number.isFinite(n) || n < 0) return null
  if (n > MAX_TACCE_PER_MACRO) return null
  let sum = 0
  for (let L = 0; L < n; L++) {
    const c = costoProssimaTacca(L)
    if (c == null) return null
    sum += c
  }
  return sum
}

/**
 * Costo PT totale per piu macro indipendenti (ogni macro parte da 0 tacce).
 * @param {Record<string, number>} tacchePerMacro es. `{ tiro: 2, forzaInAria: 4 }`
 * @returns {number | null}
 */
export function costoTotaleDistribuzione(tacchePerMacro) {
  if (!tacchePerMacro || typeof tacchePerMacro !== 'object') return null
  let total = 0
  for (const value of Object.values(tacchePerMacro)) {
    const partial = costoTotaleTacche(value)
    if (partial == null) return null
    total += partial
  }
  return total
}
