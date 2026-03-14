/**
 * Benchmark medie per divisione (Div 4, 3, 2, 1) per la schermata Analisi eFootball.
 * Usato per confronto "Tu vs divisioni" in UI e consigli.
 * Le chiavi devono coincidere con quelle estratte da extract-game-analysis (etichette IT).
 *
 * Valori: percentuali (0-100) per shot_usage, passing, dribbling, defense;
 *         conteggi medi per special_commands.
 * goal_types non ha confronto per divisione in-game, quindi non incluso nel benchmark.
 */

export const BENCHMARK_CATEGORIES = ['shot_usage', 'special_commands', 'passing', 'dribbling', 'defense']

/** Medie per divisione: div4 (più bassa) → div1 (più alta). Placeholder: aggiornare con dati reali. */
export const gameAnalysisBenchmark = {
  shot_usage: {
    Normale: { div4: 78, div3: 76, div2: 74, div1: 72 },
    'Tiro calibrato': { div4: 14, div3: 16, div2: 18, div1: 20 },
    Pallonetto: { div4: 4, div3: 4, div2: 4, div1: 4 },
    'Tiro sensazionale': { div4: 0, div3: 0, div2: 1, div1: 2 }
  },
  special_commands: {
    'Chiama pressing': { div4: 1, div3: 1.2, div2: 1.5, div1: 2 },
    'Cambio cursore': { div4: 140, div3: 110, div2: 85, div1: 65 },
    'Uno-due in avanti': { div4: 1, div3: 1.5, div2: 2, div1: 2.5 },
    'Uscita PT': { div4: 0, div3: 0, div2: 0.2, div1: 0.5 }
  },
  passing: {
    'Passaggio rasoterra': { div4: 48, div3: 50, div2: 52, div1: 54 },
    'Passaggio alto': { div4: 6, div3: 5, div2: 5, div1: 4 },
    'Passaggio filtrante rasoterra': { div4: 35, div3: 36, div2: 37, div1: 38 },
    'Passaggio filtrante alto': { div4: 3, div3: 2, div2: 2, div1: 2 },
    'Cross basso': { div4: 2, div3: 2, div2: 1, div1: 1 },
    Cross: { div4: 3, div3: 3, div2: 2, div1: 2 }
  },
  dribbling: {
    Normale: { div4: 30, div3: 32, div2: 34, div1: 36 },
    Scatta: { div4: 65, div3: 62, div2: 60, div1: 58 },
    'Dribbling di precisione': { div4: 2, div3: 3, div2: 4, div1: 4 },
    Neutrale: { div4: 2, div3: 2, div2: 2, div1: 2 }
  },
  defense: {
    Pressa: { div4: 30, div3: 32, div2: 35, div1: 38 },
    'Testa a testa': { div4: 22, div3: 24, div2: 26, div1: 28 },
    Movimento: { div4: 46, div3: 42, div2: 38, div1: 33 }
  }
}

/**
 * Restituisce serie "Tu" + Div 4,3,2,1 per una singola voce (per grafici a barre).
 * @param {Record<string, number>} userCategory - es. stats.shot_usage
 * @param {Record<string, { div4, div3, div2, div1 }>} benchmarkCategory - es. gameAnalysisBenchmark.shot_usage
 * @returns {Array<{ label: string, tu: number | null, div4: number, div3: number, div2: number, div1: number }>}
 */
export function getComparisonSeries(userCategory, benchmarkCategory) {
  if (!benchmarkCategory || typeof benchmarkCategory !== 'object') return []
  const series = []
  for (const [label, divValues] of Object.entries(benchmarkCategory)) {
    const tu = userCategory && typeof userCategory[label] === 'number' ? userCategory[label] : null
    series.push({
      label,
      tu,
      div4: divValues.div4 ?? 0,
      div3: divValues.div3 ?? 0,
      div2: divValues.div2 ?? 0,
      div1: divValues.div1 ?? 0
    })
  }
  return series
}

/**
 * Dati pronti per la UI: per ogni categoria con benchmark, array di { label, tu, div4, div3, div2, div1 }.
 * @param {{ goal_types?: object, shot_usage?: object, special_commands?: object, passing?: object, dribbling?: object, defense?: object }} userStats - stats da user_game_analysis
 * @returns {Record<string, Array<{ label: string, tu: number | null, div4: number, div3: number, div2: number, div1: number }>>}
 */
export function getBenchmarkComparison(userStats) {
  const out = {}
  for (const cat of BENCHMARK_CATEGORIES) {
    const bench = gameAnalysisBenchmark[cat]
    if (!bench) continue
    const userCat = userStats && userStats[cat] && typeof userStats[cat] === 'object' ? userStats[cat] : {}
    out[cat] = getComparisonSeries(userCat, bench)
  }
  return out
}
