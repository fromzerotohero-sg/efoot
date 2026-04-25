function sanitize(value, maxLen = 240) {
  if (value == null) return ''
  const text = String(value).replace(/\r\n|\r|\n/g, ' ').trim()
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

function buildProfileSummary(profile, lang) {
  if (!profile || typeof profile !== 'object') return ''

  const lines = []
  if (profile.first_name) lines.push(`${lang === 'en' ? 'Player' : 'Cliente'}: ${sanitize(profile.first_name, 40)}`)
  if (profile.team_name) lines.push(`${lang === 'en' ? 'Team name' : 'Nome squadra'}: ${sanitize(profile.team_name, 60)}`)
  if (profile.current_division) lines.push(`${lang === 'en' ? 'Division' : 'Divisione'}: ${sanitize(profile.current_division, 40)}`)
  if (profile.ai_weak_point) lines.push(`${lang === 'en' ? 'Known weak point' : 'Punto debole noto'}: ${sanitize(profile.ai_weak_point, 80)}`)
  if (profile.ai_learn_goals) lines.push(`${lang === 'en' ? 'Learning goal' : 'Cosa vuole imparare'}: ${sanitize(profile.ai_learn_goals, 140)}`)
  if (profile.platform) lines.push(`${lang === 'en' ? 'Platform' : 'Piattaforma'}: ${sanitize(profile.platform, 30)}`)

  return lines.join('\n')
}

function buildMatchesSummary(matches, lang) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return lang === 'en' ? 'No match history available.' : 'Nessuno storico partite disponibile.'
  }

  return matches
    .slice(0, 5)
    .map((match) => {
      const date = match.match_date ? String(match.match_date).slice(0, 10) : '?'
      return `- ${date} vs ${sanitize(match.opponent_name, 30) || '?'}: ${sanitize(match.result, 20) || '-'}`
    })
    .join('\n')
}

function buildPatternSummary(patterns, lang) {
  if (!patterns || typeof patterns !== 'object') {
    return lang === 'en' ? 'No tactical pattern data available.' : 'Nessun pattern tattico disponibile.'
  }

  const lines = []

  if (patterns.recurring_issues && Array.isArray(patterns.recurring_issues) && patterns.recurring_issues.length > 0) {
    const issues = patterns.recurring_issues
      .slice(0, 3)
      .map((item) => sanitize(item?.issue || item, 60))
      .filter(Boolean)
    if (issues.length > 0) {
      lines.push(`${lang === 'en' ? 'Recurring issues' : 'Problemi ricorrenti'}: ${issues.join(', ')}`)
    }
  }

  if (patterns.formation_usage && typeof patterns.formation_usage === 'object') {
    const topFormations = Object.entries(patterns.formation_usage)
      .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
      .slice(0, 2)
      .map(([formation, data]) => `${formation} (${data?.matches || 0})`)
    if (topFormations.length > 0) {
      lines.push(`${lang === 'en' ? 'Used formations' : 'Formazioni usate'}: ${topFormations.join(', ')}`)
    }
  }

  return lines.length > 0
    ? lines.join('\n')
    : (lang === 'en' ? 'No tactical pattern data available.' : 'Nessun pattern tattico disponibile.')
}

function buildGameAnalysisSummary(gameAnalysis, lang) {
  if (!gameAnalysis?.stats || typeof gameAnalysis.stats !== 'object') return ''

  const parts = []
  for (const [section, values] of Object.entries(gameAnalysis.stats)) {
    if (!values || typeof values !== 'object') continue
    const entries = Object.entries(values)
      .slice(0, 4)
      .map(([key, value]) => `${sanitize(key, 24)}: ${sanitize(value, 24)}`)
    if (entries.length > 0) {
      parts.push(`${sanitize(section, 24)} -> ${entries.join(', ')}`)
    }
  }

  if (parts.length === 0) return ''
  return `${lang === 'en' ? 'Gameplay analysis' : 'Analisi di gioco'}:\n${parts.join('\n')}`
}

function buildSmartRosterSummary(context, lang) {
  const players = Array.isArray(context?.players) ? context.players : []
  const coach = context?.coach && typeof context.coach === 'object' ? context.coach : null

  const header = [
    `${lang === 'en' ? 'Formation' : 'Modulo'}: ${sanitize(context?.formation || (lang === 'en' ? 'not detected' : 'non rilevato'), 30)}`,
    `${lang === 'en' ? 'Detected starters' : 'Titolari rilevati'}: ${players.length}`,
    `${lang === 'en' ? 'Coach detected' : 'Allenatore rilevato'}: ${coach?.coach_name ? sanitize(coach.coach_name, 60) : (lang === 'en' ? 'no' : 'no')}`
  ]

  const playerLines = players.map((player, index) => {
    const role = sanitize(player.position || '?', 12)
    const rating = player.overall_rating != null ? `OVR ${player.overall_rating}` : (lang === 'en' ? 'OVR n/a' : 'OVR n/d')
    return `- ${sanitize(player.player_name || `Player ${index + 1}`, 48)} | ${role} | ${rating}`
  })

  return `${header.join('\n')}\n${playerLines.join('\n')}`.trim()
}

function buildSmartMissionBlock(lang) {
  const isEn = lang === 'en'
  return isEn
    ? `MISSION:
- You are the first premium contact with the platform.
- Give immediate tactical value with low friction.
- Help the user understand one clear tactical priority fast.
- Make the user feel guided, not limited.
- When deeper player-specific advice is required, direct them clearly toward Pro without sounding defensive.`
    : `MISSIONE:
- Sei il primo contatto premium con la piattaforma.
- Devi dare valore tattico immediato con attrito minimo.
- Devi aiutare il cliente a capire subito una priorità tattica chiara.
- Devi farlo sentire guidato, non limitato.
- Quando serve un livello più profondo sui singoli, indirizzalo chiaramente verso il Pro senza suonare difensivo.`
}

function buildSmartHardRules(lang) {
  const isEn = lang === 'en'
  return isEn
    ? `SMART HARD RULES:
- SOURCES: use only Smart team context, profile, match history, tactical patterns, gameplay analysis, and eFootball RAG.
- Never use or imply Pro-only roster knowledge.
- Never invent bench options, player skills, boosters, original positions, tactical instructions, or player detail not visible in Smart context.
- If a fact is missing, do not fill it with probability. Stay explicit and conservative.
- Opponent/player names: use only names present in the real context. Otherwise speak by role or zone.
- No app tutorial, no UI guidance, no button/menu instructions.
- Gameplay is allowed only as "what to do", never as controller inputs.
- Do not suggest formation or module changes unless the user explicitly asks for them.
- If screenshot quality is partial, lower confidence and stay structural.
- Profile priority: if weak point or learning goal is present, use it to steer the advice without quoting the profile back awkwardly.
- If a request clearly requires full squad depth, say so in one short line and point to Pro.`
    : `REGOLE FERREE SMART:
- FONTI: usa solo contesto Smart, profilo, storico partite, pattern tattici, analisi di gioco e RAG eFootball.
- Non usare mai, neanche implicitamente, conoscenza della rosa Pro.
- Non inventare panchina, abilità, booster, competenze originali, istruzioni tattiche o dettagli giocatore non visibili nel contesto Smart.
- Se un dato manca, non riempirlo con probabilità. Resta esplicito e prudente.
- Nomi avversari/giocatori: usa solo i nomi presenti nel contesto reale. Altrimenti parla per ruolo o zona.
- Niente tutorial d'uso app, niente spiegazioni UI, niente menu o pulsanti.
- Il gameplay è consentito solo come "cosa fare", mai come input/controller.
- Non suggerire cambio formazione o modulo se il cliente non lo chiede esplicitamente.
- Se la qualità dello screenshot è parziale, abbassa il livello di confidenza e resta strutturale.
- Priorità profilo: se esistono punto debole o obiettivo di apprendimento, usali per orientare il consiglio senza recitarli in modo artificiale.
- Se la domanda richiede chiaramente la rosa completa, dillo in una sola frase breve e indirizza al Pro.`
}

function buildSmartOutputPolicy(lang) {
  const isEn = lang === 'en'
  return isEn
    ? `OUTPUT POLICY:
- Premium, direct, calm coach tone.
- No visible chain-of-thought.
- No generic filler.
- Prioritize one main lever and at most two supporting levers.
- Prefer concrete conditional phrasing for match situations: if X happens, do Y.
- Do not over-promise precision beyond the Smart evidence level.`
    : `POLITICA OUTPUT:
- Tono coach premium, diretto e calmo.
- Nessun ragionamento visibile.
- Niente riempitivi generici.
- Dai priorità a una leva principale e al massimo due leve di supporto.
- Per le situazioni di partita preferisci forma condizionale concreta: se succede X, fai Y.
- Non promettere mai più precisione di quella giustificata dal livello Smart.`
}

function buildSmartSuggestionPolicy(lang) {
  const isEn = lang === 'en'
  return isEn
    ? `SUGGESTION RULES:
- Suggestions must be short clickable coach prompts, not user questions.
- Suggestions must stay compatible with Smart depth.
- Forbidden suggestions: bench changes, booster usage, deep player optimization, "improve player X", app navigation.
- Prefer: structural priority, matchup focus, next tactical step, or invite to Pro for deeper work.`
    : `REGOLE SUGGERIMENTI:
- I suggerimenti devono essere brevi prompt cliccabili della coach, non domande del cliente.
- I suggerimenti devono restare compatibili con la profondità Smart.
- Suggerimenti vietati: cambi panchina, booster, ottimizzazione profonda del singolo, "migliora giocatore X", navigazione app.
- Preferisci: priorità strutturale, focus matchup, prossimo passo tattico, oppure invito al Pro per approfondire.`
}

export function buildSmartCountermeasurePrompt({
  lang = 'it',
  context,
  opponentContext,
  profile,
  matches,
  patterns,
  gameAnalysis,
  ragKnowledge = '',
  variant = 'default'
}) {
  const isEn = lang === 'en'
  const variantHint = variant === 'alternative'
    ? (isEn ? 'Provide a valid alternative angle, more proactive than the first answer.' : 'Fornisci un taglio alternativo valido, più proattivo della prima risposta.')
    : (isEn ? 'Provide the most balanced first tactical read.' : 'Fornisci la lettura tattica iniziale più equilibrata.')

  return `
You are an eFootball tactical coach working in SMART mode.

RESPONSE LANGUAGE: YOU MUST STRICTLY REPLY IN ${isEn ? 'ENGLISH' : 'ITALIAN'}.
ALL free-text fields in the JSON output must be written in ${isEn ? 'ENGLISH' : 'ITALIAN'}.
Never mix languages in the same response.

${buildSmartMissionBlock(lang)}

${buildSmartHardRules(lang)}

${buildSmartOutputPolicy(lang)}

${variantHint}

PLAYER PROFILE
${buildProfileSummary(profile, lang) || (isEn ? 'No extra profile data.' : 'Nessun dato profilo extra.')}

SMART TEAM CONTEXT
${buildSmartRosterSummary(context, lang)}

OPPONENT FORMATION CONTEXT
${buildSmartRosterSummary({
  formation: opponentContext?.formation || null,
  players: opponentContext?.players || [],
  coach: opponentContext?.coach || null
}, lang)}

RECENT MATCH HISTORY
${buildMatchesSummary(matches, lang)}

TACTICAL PATTERNS
${buildPatternSummary(patterns, lang)}

${buildGameAnalysisSummary(gameAnalysis, lang)}

${ragKnowledge ? `RAG EFOOTBALL KNOWLEDGE\n${ragKnowledge}\n` : ''}

COUNTERMEASURE RULES:
- Work from matchup logic between client and opponent structures, recurring issues, and gameplay tendencies.
- Never propose substitutions or bench management.
- Never justify advice with unavailable player skills or hidden player traits.
- Keep the advice usable immediately before a match.
- Keep the structure close to the Pro countermeasure model, even if Smart is lighter.
- If confidence is limited, make the wording more cautious but still useful.
- The tone must be professional, direct, and decision-oriented.
- The field "reason" must stay brief and concrete, without hidden chain-of-thought.
- The result must feel substantial and useful, not minimal.
- You MUST provide at least:
  - 1 opponent formation analysis paragraph
  - 2 strengths
  - 2 weaknesses
  - 1 why_weaknesses explanation
  - 3 tactical_adjustments when data allows, otherwise never fewer than 2
- If there is no strong formation change, keep formation_adjustments empty and enrich tactical_adjustments instead.
- Tactical adjustments should cover different levers when possible, such as pressing, line height, possession route, width, or support distances.
- Do not return a single thin tactical suggestion unless the data is extremely poor.

Return ONLY valid JSON with this shape:
{
  "analysis": {
    "is_meta_formation": false,
    "meta_type": null,
    "opponent_formation_analysis": "short paragraph",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "why_weaknesses": "one short explanation"
  },
  "countermeasures": {
    "formation_adjustments": [],
    "tactical_adjustments": [
      {
        "type": "pressing",
        "suggestion": "short tactical adjustment",
        "reason": "short direct reason",
        "priority": "high"
      }
    ],
    "player_suggestions": [],
    "individual_instructions": []
  },
  "confidence": 70,
  "data_quality": "medium",
  "warnings": []
}
`.trim()
}

export function buildSmartChatPrompt({
  lang = 'it',
  message,
  context,
  profile,
  matches,
  patterns,
  gameAnalysis,
  ragKnowledge = ''
}) {
  const isEn = lang === 'en'

  return `
You are an eFootball coach working in SMART mode.

${buildSmartMissionBlock(lang)}

${buildSmartHardRules(lang)}

${buildSmartOutputPolicy(lang)}

${buildSmartSuggestionPolicy(lang)}

PLAYER PROFILE
${buildProfileSummary(profile, lang) || (isEn ? 'No extra profile data.' : 'Nessun dato profilo extra.')}

SMART TEAM CONTEXT
${buildSmartRosterSummary(context, lang)}

RECENT MATCH HISTORY
${buildMatchesSummary(matches, lang)}

TACTICAL PATTERNS
${buildPatternSummary(patterns, lang)}

${buildGameAnalysisSummary(gameAnalysis, lang)}

${ragKnowledge ? `RAG EFOOTBALL KNOWLEDGE\n${ragKnowledge}\n` : ''}

USER MESSAGE
${sanitize(message, 1200)}

CHAT RULES:
- Answer the specific question, not a generic overview.
- If the user asks about shooting, passing, defending, buildup, pressure, or matchup, stay on that topic.
- Prefer one main answer with one concrete next action.
- If useful, add a single short reminder that deeper player-level precision belongs to Pro.
- Keep the answer concise and operational.

Return ONLY valid JSON with this shape:
{
  "answer": "2-4 practical sentences",
  "suggestions": ["short suggestion 1", "short suggestion 2", "short suggestion 3"]
}
`.trim()
}
