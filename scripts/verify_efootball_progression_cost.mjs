/**
 * Verifica automatica tariffa progression PT (costo per tacca) + intrecci su distribuzioni.
 * Esegui da root: node scripts/verify_efootball_progression_cost.mjs
 */
import assert from 'node:assert/strict'
import {
  MAX_LIVELLO_PRIMA_TACCA,
  MAX_TACCE_PER_MACRO,
  costoProssimaTacca,
  costoTotaleTacche,
  costoTotaleDistribuzione,
} from '../lib/efootballProgressionCost.js'

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

// --- Confini fasce (nessun buco / salto errato) ---
assert.equal(costoProssimaTacca(0), 1)
assert.equal(costoProssimaTacca(3), 1)
assert.equal(costoProssimaTacca(4), 2)
assert.equal(costoProssimaTacca(5), 2)
assert.equal(costoProssimaTacca(7), 2)
assert.equal(costoProssimaTacca(8), 3)
assert.equal(costoProssimaTacca(9), 3)
assert.equal(costoProssimaTacca(11), 3)
assert.equal(costoProssimaTacca(12), 4)
assert.equal(costoProssimaTacca(13), 4)
assert.equal(costoProssimaTacca(15), 4)
assert.equal(costoProssimaTacca(16), 5)
assert.equal(costoProssimaTacca(17), 5)
assert.equal(costoProssimaTacca(19), 5)
assert.equal(costoProssimaTacca(20), 6)
assert.equal(costoProssimaTacca(21), 6)
assert.equal(costoProssimaTacca(23), 6)
assert.equal(costoProssimaTacca(24), 7)
assert.equal(costoProssimaTacca(25), null)
assert.equal(costoProssimaTacca(26), null)

// Monotonia non decrescente (ogni tacca costa almeno quanto la fascia precedente in media; qui verifichiamo punto a punto)
for (let L = 0; L < MAX_LIVELLO_PRIMA_TACCA; L++) {
  const a = costoProssimaTacca(L)
  const b = costoProssimaTacca(L + 1)
  if (b != null && a != null && b < a) fail(`costo diminuisce da L=${L} (${a}) a L=${L + 1} (${b})`)
}

// Cumulativi noti
assert.equal(costoTotaleTacche(0), 0)
assert.equal(costoTotaleTacche(1), 1)
assert.equal(costoTotaleTacche(4), 4) // 4 x 1
assert.equal(costoTotaleTacche(5), 6) // 4x1 + 1x2
assert.equal(costoTotaleTacche(8), 12) // 4x1 + 4x2
assert.equal(costoTotaleTacche(9), 15) // + 1x3

// Costo massimo una macro (25 tacce): 4*1 + 4*2 + 4*3 + 4*4 + 4*5 + 4*6 + 1*7 = 91
let manual = 0
for (let L = 0; L < MAX_TACCE_PER_MACRO; L++) manual += costoProssimaTacca(L)
assert.equal(manual, 91)
assert.equal(costoTotaleTacche(MAX_TACCE_PER_MACRO), 91)
assert.equal(costoTotaleTacche(MAX_TACCE_PER_MACRO + 1), null)

// --- Intrecci multi-macro (stesso PT speso, ruoli diversi: qui solo costi, non OVR) ---
// Esempio utente: 2 tiro + 4 forza in aria (macro indipendenti da zero)
const casoSemenyoLike = costoTotaleDistribuzione({ tiro: 2, forzaInAria: 4 })
assert.equal(casoSemenyoLike, costoTotaleTacche(2) + costoTotaleTacche(4))
assert.equal(casoSemenyoLike, 6) // 2 + 4 PT

// Tre macro basse vs una sola macro alta (stesso numero totale tacche? no - intreccio su budget)
const spread = costoTotaleDistribuzione({ tiro: 2, passaggio: 2, dribbling: 2 }) // 2+2+2 tacche fascia 1
assert.equal(spread, 6)
const unBuco = costoTotaleTacche(6) // 6 tacche tutte sulla stessa macro: 4x1 + 2x2
assert.equal(unBuco, 8)

// Simulazione PT totali tipo carta max (54): ripartizione Donnarumma-like da screenshot
const buildDonnarummaLike = costoTotaleDistribuzione({
  forzaInAria: 5,
  pt1: 12,
  pt2: 8,
  pt3: 8,
})
assert.equal(
  buildDonnarummaLike,
  costoTotaleTacche(5) + costoTotaleTacche(12) + costoTotaleTacche(8) + costoTotaleTacche(8),
)
assert.equal(buildDonnarummaLike, 54)

console.log('verify_efootball_progression_cost: OK')
console.log('  max tacche/macro:', MAX_TACCE_PER_MACRO, 'costo max/macro:', costoTotaleTacche(MAX_TACCE_PER_MACRO))
console.log('  2 tiro + 4 aria (costo PT):', casoSemenyoLike, '(indipendente dal ruolo — OVR è altra cosa)')
