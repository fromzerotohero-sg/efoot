// Simulatore offline del verdetto Card Advisor.
// Replica le parti rilevanti di app/api/card-advisor-lab/evaluate/route.js
// (cardBeatsAlternative, classifyRosterConflict, score building, purchaseDecision)
// e applica 4 set di soglie: CURRENT, L1, L1+L2, L1+L2+L3.

function clamp(v, min, max) { return Math.min(Math.max(v, min), max) }

// ---- Implementazione "CURRENT" (identica a route.js oggi) ----
function cardBeatsAlternativeCurrent(s) {
  if (!s.hasAlternative) return true
  if (s.onlyOnCard >= 2) return true
  if (s.onlyOnCard >= 1 && s.cardProfile >= 74) return true
  if (s.cardProfile >= s.altProfile + 6) return true
  if (s.premiumCard && !s.almostSame && s.cardProfile >= 76) return true
  if (s.premiumCard && s.onlyOnCard >= 1) return true
  return false
}

function classifyConflictCurrent(s) {
  const hasCoveredRole = s.sameRoleLength > 0
  const upgradeEdge = hasCoveredRole && cardBeatsAlternativeCurrent(s)
  const deepBench = s.sameRoleLength >= 3
  const duplicate = hasCoveredRole && deepBench && !upgradeEdge
  const starterBlocked = s.hasFormation && s.sameRoleHasStarter && !upgradeEdge
  return {
    roleGap: s.sameRoleLength === 0,
    duplicate,
    starterBlocked,
    upgradeEdge,
    rosterCrowded: s.sameRoleLength >= 2
  }
}

function buildScoreCurrent(s, c) {
  let score = s.hasRoster ? (s.hasCompleteCardData ? 66 : 52) : (s.hasCompleteCardData ? 58 : 50)
  if (c.roleGap) score += 20
  if (c.upgradeEdge) score += 14
  if (s.premiumCard && s.hasCompleteCardData) score += 12
  if (c.duplicate && s.diversificationDifferentMovement) score += 2
  if (c.starterBlocked && s.diversificationDifferentMovement) score += 2
  if (s.diversificationDifferentMovement) score += 8
  if (s.diversificationDifferentBody) score += 3
  if (s.rotationPoolValue) score += 6
  if (s.hasNativeEdge) score += 6
  if (s.hasTacticalFit) score += 6
  if (s.teamStyleFit) score += 6
  if (s.profileNeedFit) score += 6
  if (s.hasMapFit) score += 4
  if (c.rosterCrowded && (s.diversificationValue || s.rotationPoolValue)) score += 3
  return clamp(score, 28, 95)
}

function purchaseDecisionCurrent({ score, c, s }) {
  if (!s.hasCompleteCardData) return { level: 'needs-card-data', label: 'Dati carta da completare' }
  if (!s.hasRoster) return { level: 'needs-roster', label: 'Valore carta' }
  if (s.sameName && c.upgradeEdge) return { level: 'buy', label: 'Upgrade versione' }
  if (s.sameName) return { level: 'watch', label: 'Stesso giocatore' }
  if (c.upgradeEdge && (c.roleGap || score >= 68)) return { level: 'buy', label: 'Sinergia alta' }
  if (c.upgradeEdge && c.rosterCrowded) return { level: 'watch', label: 'Opzione upgrade' }
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= 72) return { level: 'buy', label: 'Diversifica la rosa' }
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= 58) return { level: 'watch', label: 'Varietà tattica' }
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 72 : 76)) return { level: 'buy', label: 'Rotazione premium' }
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 56 : 62)) return { level: 'watch', label: 'Opzione premium' }
  if (c.duplicate || c.starterBlocked) return { level: 'watch', label: 'Opzione rotazione' }
  if (c.roleGap || score >= 74) return { level: 'buy', label: 'Sinergia alta' }
  if (score >= 58) return { level: 'watch', label: 'Sinergia situazionale' }
  return { level: 'skip', label: 'Bassa priorità' }
}

// ---- L1: stricter cardBeatsAlternative + cap stacking + penalità ruolo affollato + soglie BUY più alte ----
function cardBeatsAlternativeL1(s) {
  if (!s.hasAlternative) return true
  // Profile dominance: card profile chiaramente sopra alt (+4)
  if (s.cardProfile >= s.altProfile + 4) return true
  // Tante skill uniche + profilo non molto peggio
  if (s.onlyOnCard >= 3 && s.cardProfile >= s.altProfile - 2) return true
  // Skill uniche + profilo meglio
  if (s.onlyOnCard >= 2 && s.cardProfile >= s.altProfile + 2) return true
  // Premium con almeno 1 skill unica E profilo pari o meglio
  if (s.premiumCard && s.onlyOnCard >= 1 && s.cardProfile >= s.altProfile) return true
  return false
}

function classifyConflictL1(s) {
  const hasCoveredRole = s.sameRoleLength > 0
  const upgradeEdge = hasCoveredRole && cardBeatsAlternativeL1(s)
  const deepBench = s.sameRoleLength >= 3
  const duplicate = hasCoveredRole && deepBench && !upgradeEdge
  const starterBlocked = s.hasFormation && s.sameRoleHasStarter && !upgradeEdge
  return { roleGap: s.sameRoleLength === 0, duplicate, starterBlocked, upgradeEdge, rosterCrowded: s.sameRoleLength >= 2 }
}

function buildScoreL1(s, c) {
  let score = s.hasRoster ? (s.hasCompleteCardData ? 66 : 52) : (s.hasCompleteCardData ? 58 : 50)
  if (c.roleGap) score += 20
  if (c.upgradeEdge) score += 14
  if (s.premiumCard && s.hasCompleteCardData) score += 12
  if (c.duplicate && s.diversificationDifferentMovement) score += 2
  if (c.starterBlocked && s.diversificationDifferentMovement) score += 2
  if (s.diversificationDifferentMovement) score += 8
  if (s.diversificationDifferentBody) score += 3
  if (s.rotationPoolValue) score += 6
  // L1.1: cap stacking dei bonus tattici a +14 (oggi possono arrivare a +24)
  const tacticalStack = (s.hasNativeEdge ? 6 : 0) + (s.hasTacticalFit ? 6 : 0) + (s.teamStyleFit ? 6 : 0) + (s.profileNeedFit ? 6 : 0)
  score += Math.min(tacticalStack, 14)
  if (s.hasMapFit) score += 4
  // L1.2: penalità per ruolo affollato senza upgrade reale
  if (c.rosterCrowded && (c.duplicate || c.starterBlocked) && !c.upgradeEdge) score -= 6
  else if (c.rosterCrowded && (s.diversificationValue || s.rotationPoolValue)) score += 3
  return clamp(score, 28, 95)
}

function purchaseDecisionL1({ score, c, s }) {
  if (!s.hasCompleteCardData) return { level: 'needs-card-data', label: 'Dati carta da completare' }
  if (!s.hasRoster) return { level: 'needs-roster', label: 'Valore carta' }
  if (s.sameName && c.upgradeEdge) return { level: 'buy', label: 'Upgrade versione' }
  if (s.sameName) return { level: 'watch', label: 'Stesso giocatore' }
  if (c.upgradeEdge && (c.roleGap || score >= 70)) return { level: 'buy', label: 'Sinergia alta' }
  if (c.upgradeEdge && c.rosterCrowded) return { level: 'watch', label: 'Opzione upgrade' }
  // L1.3: BUY diversification differenziata per affollamento del ruolo
  const deepBench = s.sameRoleLength >= 3
  const buyDivThreshold = deepBench ? 88 : 80
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= buyDivThreshold) return { level: 'buy', label: 'Diversifica la rosa' }
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= 65) return { level: 'watch', label: 'Varietà tattica' }
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 80 : 84)) return { level: 'buy', label: 'Rotazione premium' }
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 56 : 62)) return { level: 'watch', label: 'Opzione premium' }
  if (c.duplicate || c.starterBlocked) return { level: 'watch', label: 'Opzione rotazione' }
  if (c.roleGap || score >= 74) return { level: 'buy', label: 'Sinergia alta' }
  if (score >= 58) return { level: 'watch', label: 'Sinergia situazionale' }
  return { level: 'skip', label: 'Bassa priorità' }
}

// ---- L2: L1 + stretta extra sui premium (richiede skill uniche più nette o profilo +) ----
function cardBeatsAlternativeL2(s) {
  if (!s.hasAlternative) return true
  if (s.cardProfile >= s.altProfile + 4) return true
  if (s.onlyOnCard >= 3 && s.cardProfile >= s.altProfile - 2) return true
  if (s.onlyOnCard >= 2 && s.cardProfile >= s.altProfile + 2) return true
  // L2 stringe la regola premium: richiede 2+ skill uniche e parità di profilo (era 1 skill e parità in L1)
  if (s.premiumCard && s.onlyOnCard >= 2 && s.cardProfile >= s.altProfile) return true
  if (s.premiumCard && s.onlyOnCard >= 1 && s.cardProfile >= s.altProfile + 2) return true
  return false
}

function classifyConflictL2(s) {
  const hasCoveredRole = s.sameRoleLength > 0
  const upgradeEdge = hasCoveredRole && cardBeatsAlternativeL2(s)
  const deepBench = s.sameRoleLength >= 3
  const duplicate = hasCoveredRole && deepBench && !upgradeEdge
  const starterBlocked = s.hasFormation && s.sameRoleHasStarter && !upgradeEdge
  return { roleGap: s.sameRoleLength === 0, duplicate, starterBlocked, upgradeEdge, rosterCrowded: s.sameRoleLength >= 2 }
}

function purchaseDecisionL2({ score, c, s }) {
  if (!s.hasCompleteCardData) return { level: 'needs-card-data', label: 'Dati carta da completare' }
  if (!s.hasRoster) return { level: 'needs-roster', label: 'Valore carta' }
  if (s.sameName && c.upgradeEdge) return { level: 'buy', label: 'Upgrade versione' }
  if (s.sameName) return { level: 'watch', label: 'Stesso giocatore' }
  if (c.upgradeEdge && (c.roleGap || score >= 70)) return { level: 'buy', label: 'Sinergia alta' }
  if (c.upgradeEdge && c.rosterCrowded) return { level: 'watch', label: 'Opzione upgrade' }
  const deepBench = s.sameRoleLength >= 3
  const buyDivThreshold = deepBench ? 88 : 80
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= buyDivThreshold) return { level: 'buy', label: 'Diversifica la rosa' }
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= 65) return { level: 'watch', label: 'Varietà tattica' }
  // L2: soglie premium BUY 80→84 (con div), 84→88 (senza div); WATCH 56→60 (con div)
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 84 : 88)) return { level: 'buy', label: 'Rotazione premium' }
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 60 : 65)) return { level: 'watch', label: 'Opzione premium' }
  if (c.duplicate || c.starterBlocked) return { level: 'watch', label: 'Opzione rotazione' }
  if (c.roleGap || score >= 74) return { level: 'buy', label: 'Sinergia alta' }
  if (score >= 58) return { level: 'watch', label: 'Sinergia situazionale' }
  return { level: 'skip', label: 'Bassa priorità' }
}

// ---- L3: SKIP esplicito per ruoli affollati senza upgrade ----
function purchaseDecisionL3({ score, c, s }) {
  if (!s.hasCompleteCardData) return { level: 'needs-card-data', label: 'Dati carta da completare' }
  if (!s.hasRoster) return { level: 'needs-roster', label: 'Valore carta' }
  if (s.sameName && c.upgradeEdge) return { level: 'buy', label: 'Upgrade versione' }
  if (s.sameName) return { level: 'watch', label: 'Stesso giocatore' }
  if (c.upgradeEdge && (c.roleGap || score >= 70)) return { level: 'buy', label: 'Sinergia alta' }
  if (c.upgradeEdge && c.rosterCrowded) return { level: 'watch', label: 'Opzione upgrade' }
  const deepBench = s.sameRoleLength >= 3
  const buyDivThreshold = deepBench ? 88 : 80
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= buyDivThreshold) return { level: 'buy', label: 'Diversifica la rosa' }
  if ((c.duplicate || c.starterBlocked) && s.diversificationValue && score >= 65) return { level: 'watch', label: 'Varietà tattica' }
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 84 : 88)) return { level: 'buy', label: 'Rotazione premium' }
  if ((c.duplicate || c.starterBlocked) && s.premiumCard && score >= (s.diversificationValue ? 60 : 65)) return { level: 'watch', label: 'Opzione premium' }
  // L3: SKIP esplicito per ruoli affollati + niente upgrade + niente diversificazione + score basso
  if ((c.duplicate || c.starterBlocked) && !s.diversificationValue && !s.premiumCard && score < 65) return { level: 'skip', label: 'Ruolo già coperto' }
  if (c.duplicate && c.rosterCrowded && !c.upgradeEdge && !s.diversificationValue && score < 70) return { level: 'skip', label: 'Ruolo già coperto' }
  if (c.duplicate || c.starterBlocked) return { level: 'watch', label: 'Opzione rotazione' }
  if (c.roleGap || score >= 74) return { level: 'buy', label: 'Sinergia alta' }
  if (score >= 58) return { level: 'watch', label: 'Sinergia situazionale' }
  return { level: 'skip', label: 'Bassa priorità' }
}

// ---- Helper per derivare diversificationValue ----
function deriveDiversification(s) {
  const divScore = (s.diversificationDifferentMovement ? 10 : 0) + (s.diversificationDifferentBody ? 4 : 0)
  return {
    diversificationValue: s.diversificationDifferentMovement || divScore >= 8 || s.rotationPoolValue,
    diversificationScore: divScore
  }
}

// ---- Esecuzione 4 set su uno scenario ----
function runScenario(name, scenarioInput) {
  const s = { ...scenarioInput, ...deriveDiversification(scenarioInput) }

  // CURRENT
  const cCur = classifyConflictCurrent(s)
  const scoreCur = buildScoreCurrent(s, cCur)
  const verCur = purchaseDecisionCurrent({ score: scoreCur, c: cCur, s })

  // L1
  const cL1 = classifyConflictL1(s) // L1 ora include anche cardBeatsAlternative più stretta
  const scoreL1 = buildScoreL1(s, cL1)
  const verL1 = purchaseDecisionL1({ score: scoreL1, c: cL1, s })

  // L1+L2
  const cL2 = classifyConflictL2(s) // L2 cambia cardBeatsAlternative in modo simile a L1 (parità +3 per premium)
  const scoreL2 = buildScoreL1(s, cL2)
  const verL2 = purchaseDecisionL2({ score: scoreL2, c: cL2, s })

  // L1+L2+L3
  const cL3 = classifyConflictL2(s)
  const scoreL3 = buildScoreL1(s, cL3)
  const verL3 = purchaseDecisionL3({ score: scoreL3, c: cL3, s })

  return { name, s, results: [
    { tier: 'CURRENT', score: scoreCur, conflict: cCur, verdict: verCur },
    { tier: 'L1',      score: scoreL1, conflict: cL1, verdict: verL1 },
    { tier: 'L1+L2',   score: scoreL2, conflict: cL2, verdict: verL2 },
    { tier: 'ALL',     score: scoreL3, conflict: cL3, verdict: verL3 }
  ]}
}

// ---- Scenari di test ----
const scenarios = [
  {
    name: '#1 Rice Highlight su MED affollato (Rijkaard+Davids tit + 1 riserva)',
    hasRoster: true, hasFormation: true, hasCompleteCardData: true,
    sameRoleLength: 3, sameRoleHasStarter: true, sameName: false,
    hasAlternative: true,
    premiumCard: false,            // Highlight NON è classificato premium (solo Epic/Legendary/Big Time)
    onlyOnCard: 2,                 // Rice ha 2-3 skill che Rijkaard/Davids non hanno
    cardProfile: 76, altProfile: 80, almostSame: false,
    diversificationDifferentMovement: true,   // Rice (ball winner) vs Rijkaard (orchestrator)
    diversificationDifferentBody: false,
    rotationPoolValue: false,
    hasNativeEdge: true, hasTacticalFit: true, teamStyleFit: true, profileNeedFit: false, hasMapFit: false
  },
  {
    name: '#2 Mbappé Epic su EDA affollato (2 titolari + Mbappé sarebbe 3°)',
    hasRoster: true, hasFormation: true, hasCompleteCardData: true,
    sameRoleLength: 2, sameRoleHasStarter: true, sameName: false,
    hasAlternative: true,
    premiumCard: true,             // Epic
    onlyOnCard: 2,
    cardProfile: 88, altProfile: 82, almostSame: false,
    diversificationDifferentMovement: true,
    diversificationDifferentBody: true,
    rotationPoolValue: true,
    hasNativeEdge: true, hasTacticalFit: true, teamStyleFit: true, profileNeedFit: true, hasMapFit: true
  },
  {
    name: '#3 Mbappé Epic su EDA scoperto (0 EDA in rosa)',
    hasRoster: true, hasFormation: true, hasCompleteCardData: true,
    sameRoleLength: 0, sameRoleHasStarter: false, sameName: false,
    hasAlternative: false,
    premiumCard: true,
    onlyOnCard: 2,
    cardProfile: 88, altProfile: 0, almostSame: false,
    diversificationDifferentMovement: false,
    diversificationDifferentBody: false,
    rotationPoolValue: false,
    hasNativeEdge: true, hasTacticalFit: true, teamStyleFit: true, profileNeedFit: true, hasMapFit: false
  },
  {
    name: '#4 Casillas Epic GK upgrade su portiere scarso (titolare GK 76)',
    hasRoster: true, hasFormation: true, hasCompleteCardData: true,
    sameRoleLength: 2, sameRoleHasStarter: true, sameName: false,
    hasAlternative: true,
    premiumCard: true,
    onlyOnCard: 3,
    cardProfile: 86, altProfile: 76, almostSame: false,
    diversificationDifferentMovement: false,
    diversificationDifferentBody: false,
    rotationPoolValue: false,
    hasNativeEdge: true, hasTacticalFit: false, teamStyleFit: false, profileNeedFit: true, hasMapFit: false
  },
  {
    name: '#5 Epic MED tecnicamente debole su MED forte (premiumCard ma cardProfile basso)',
    hasRoster: true, hasFormation: true, hasCompleteCardData: true,
    sameRoleLength: 2, sameRoleHasStarter: true, sameName: false,
    hasAlternative: true,
    premiumCard: true,
    onlyOnCard: 1,                 // solo 1 skill unica
    cardProfile: 72, altProfile: 82, almostSame: false,  // -10 vs titolare
    diversificationDifferentMovement: false,
    diversificationDifferentBody: false,
    rotationPoolValue: false,
    hasNativeEdge: true, hasTacticalFit: false, teamStyleFit: false, profileNeedFit: false, hasMapFit: false
  },
  {
    name: '#6b Mbappé Epic su EDA con titolari di pari livello (rotation, non upgrade)',
    hasRoster: true, hasFormation: true, hasCompleteCardData: true,
    sameRoleLength: 2, sameRoleHasStarter: true, sameName: false,
    hasAlternative: true,
    premiumCard: true,
    onlyOnCard: 2,
    cardProfile: 82, altProfile: 82, almostSame: false,
    diversificationDifferentMovement: true,
    diversificationDifferentBody: false,
    rotationPoolValue: true,
    hasNativeEdge: true, hasTacticalFit: true, teamStyleFit: true, profileNeedFit: false, hasMapFit: false
  },
  {
    name: '#6 Highlight Selection medio su DC affollato (3 DC titolari, no diversificazione)',
    hasRoster: true, hasFormation: true, hasCompleteCardData: true,
    sameRoleLength: 4, sameRoleHasStarter: true, sameName: false,
    hasAlternative: true,
    premiumCard: false,
    onlyOnCard: 1,
    cardProfile: 75, altProfile: 78, almostSame: false,
    diversificationDifferentMovement: false,
    diversificationDifferentBody: false,
    rotationPoolValue: false,
    hasNativeEdge: false, hasTacticalFit: false, teamStyleFit: false, profileNeedFit: false, hasMapFit: false
  }
]

// ---- Print results ----
function pad(s, n) { return String(s).padEnd(n) }

console.log('\n=== SIMULAZIONE VERDETTI CARD ADVISOR ===\n')
for (const sc of scenarios) {
  const out = runScenario(sc.name, sc)
  console.log(`>>> ${out.name}`)
  console.log(`    ${pad('TIER',8)} ${pad('SCORE',7)} ${pad('VERDICT',8)} LABEL`)
  for (const r of out.results) {
    const ver = r.verdict
    const tag = ver.level === 'buy' ? '🟢 BUY  ' : ver.level === 'watch' ? '🟡 WATCH' : ver.level === 'skip' ? '🔴 SKIP ' : '⚪ ' + ver.level
    console.log(`    ${pad(r.tier,8)} ${pad(r.score,7)} ${tag}  ${ver.label}`)
  }
  console.log('')
}

console.log('LEGENDA:')
console.log('CURRENT = stato attuale (post-fix 21 maggio)')
console.log('L1      = cardBeatsAlternative stretta + cap bonus +14 + penalità ruolo affollato −6 + BUY diversif. 80 (88 se 3+) + WATCH 65')
console.log('L1+L2   = L1 + premium upgrade richiede 2+ skill uniche con parità profilo (o 1 + profilo+2) + premium BUY 84/88')
console.log('ALL     = L1+L2 + SKIP esplicito quando ruolo affollato senza diversificazione, score basso')
