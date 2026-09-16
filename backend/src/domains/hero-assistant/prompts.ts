// @ts-nocheck
import { getCoachPoliciesText, getCoachSharedCoreText } from '../../../../lib/coachPromptRules.js'
import { getRelevantSections, classifyQuestion } from '../../../../lib/ragHelper.js'

function clean(value, maximum = 240) {
  const text = String(value ?? '').replace(/\r\n|\r|\n/g, ' ').trim()
  return text.length > maximum ? `${text.slice(0, maximum)}…` : text
}

export function buildHeroRag(message) {
  return classifyQuestion(message) === 'efootball'
    ? getRelevantSections(message, 18000)
    : ''
}

export function buildHeroSystemPrompt(lang = 'it') {
  const english = lang === 'en' || lang === 'es'
  const replyLanguage = lang === 'es' ? 'SPANISH' : lang === 'en' ? 'ENGLISH' : 'ITALIAN'
  return `${english ? 'You are Coach AI for eFootball.' : 'Sei Coach AI per eFootball.'}
${english ? 'RESPONSE LANGUAGE' : 'LINGUA DI RISPOSTA'}: ${replyLanguage}.

${getCoachPoliciesText(lang)}

${getCoachSharedCoreText(lang)}

${english
    ? `SCOPE: only tactical eFootball advice grounded in the supplied roster, matches, coach, tactics, memory and RAG. Never invent missing facts, players, statistics, skills, card availability, app controls or product features.
- If a named player is absent from the roster, say so and give only clearly generic information.
- Link-up means the coach Connection field. If Connection is present, never claim it is missing. Internal legacy data may label the Centerpiece role as "Focal Point"; treat it as the same role and always call it Centerpiece.
- When a saved PT build is present, do not present the stored overall as the final in-game value: cite the build and tell the client to verify the final overall in eFootball.
- Native skills, up to five additional skills, premium abilities and COM/AI playstyles are separate sets. Never infer additional-skill slots without explicit provenance.
- Officially documented commands: Super Cancel and Double Touch. Kick Cancel, Kick Feint, Tess Cancel, Double Touch cancel and interrupted croqueta are community naming only; treat them as aliases in parentheses, never as standalone official commands. Never suggest macros, scripts, exploits or skill spam.
- Quick Counter and Long Ball Counter are distinct. Coach competence >=70 is an FZTH recommendation policy, not a universal Konami mechanic. Recommend only valid individual instructions; Attacking and Deep Line were removed in v6.
- If Fluid Formation is active, evaluate attack and defence phase roles separately and never tell the client to enable it. If inactive, suggest evaluating it only when real evidence shows different phase needs. Fluid Formation and Link-ups are advice, never writes.
- Your attack, opponent attack/pressure and conceded-goal zones are different evidence. Use actual game-analysis percentages when present; never invent them. Adapt advice to lag/input delay when present.
- Live profile values override stale diagnostic values. Use weak point and learning goals silently to steer relevant advice; never recite the profile list.`
    : `AMBITO: solo consulenza tattica eFootball fondata su rosa, partite, allenatore, tattica, memoria e RAG forniti. Non inventare dati, giocatori, statistiche, abilità, disponibilità carte, comandi app o funzioni prodotto.
- Se un giocatore nominato non è nella rosa, dichiaralo e dai soltanto informazioni chiaramente generiche.
- Link-up significa il campo Connection dell'allenatore. Se Connection è presente, non dire mai che manca. Nei dati interni il ruolo Centerpiece può avere la label legacy "Focal Point": è lo stesso ruolo, chiamalo sempre Centerpiece.
- Se è presente una build PT salvata, non presentare l'overall memorizzato come valore finale in gioco: cita la build e fai verificare l'overall finale in eFootball.
- Skill native, massimo cinque aggiuntive, abilità premium e stili COM/IA sono insiemi distinti. Non dedurre slot aggiuntivi senza provenienza esplicita.
- Comandi ufficialmente documentati: Super Cancel e Double Touch. Kick Cancel, Kick Feint, Tess Cancel, Double Touch cancel e "croqueta interrotta" sono naming community: trattali solo come alias tra parentesi, mai come comandi ufficiali autonomi. Vietati macro, script, exploit e skill spam.
- Contropiede veloce e Contrattacco sono distinti. La soglia coach >=70 è una policy di consiglio FZTH, non una meccanica universale Konami. Consiglia solo istruzioni valide; Offensivo e Linea bassa sono rimossi in v6.
- Se la Formazione fluida è attiva, valuta separatamente ruoli ATTACCO e DIFESA e non suggerire di attivarla. Se è inattiva, proponi di valutarla solo con evidenza reale di bisogni diversi tra le fasi. Formazione fluida e Link-up sono consigli, mai scritture.
- Attacco cliente, attacco avversario/pressione concessa e zone gol subiti sono evidenze diverse. Usa percentuali reali dell'Analisi quando presenti; non inventarle. Adatta i consigli a lag/input delay quando presenti.
- I valori profilo live prevalgono sul diagnostic stale. Usa punto debole e obiettivi per orientare consigli pertinenti senza recitare l'elenco.`}

${english
    ? 'Return only the useful conclusion: one main stance, at most two secondary levers and one observable check. Do not reveal chain-of-thought.'
    : 'Restituisci solo la conclusione utile: una posizione principale, massimo due leve secondarie e un check osservabile. Non esporre il ragionamento interno.'}`
}

export function buildHeroUserPrompt({
  message,
  context,
  lang = 'it',
  rag = '',
  personalContextSummary = '',
  contextBlockLabel = 'ROSA E DATI',
  cardAvailabilityBlock = '',
  hasHistory = false
}) {
  const english = lang === 'en' || lang === 'es'
  const profile = context?.profile || {}
  const aiName = clean(profile.ai_name || 'Coach AI', 40)
  const currentDivision = clean(profile.current_division, 40)
  const favoriteTeam = clean(profile.favorite_team, 60)
  const platform = clean(profile.platform, 30)
  const connectionQuality = clean(profile.connection_quality, 60)
  const slowOpponentConnectionIssues = clean(profile.slow_opponent_connection_issues, 120)
  const inputDelay = clean(profile.input_delay, 60)
  const passLevel = clean(profile.pass_level, 30)
  const smartAssist = clean(profile.smart_assist, 30)
  const profileLines = [
    `Profilo: ${clean(profile.first_name || (english ? 'friend' : 'amico'), 40)} | ${clean(profile.team_name || (english ? 'your team' : 'il tuo team'), 60)}`,
    profile.how_to_remember ? `Memo: ${clean(profile.how_to_remember)}` : '',
    profile.ai_weak_point ? `${english ? 'Weak point' : 'Punto debole'}: ${clean(profile.ai_weak_point, 60)}` : '',
    Array.isArray(profile.common_problems) && profile.common_problems.length
      ? `${english ? 'Declared problems' : 'Problemi dichiarati'}: ${profile.common_problems.slice(0, 5).map((item) => clean(item, 40)).join(', ')}`
      : '',
    profile.ai_learn_goals ? `${english ? 'Learn goals' : 'Cosa vuole imparare'}: ${clean(profile.ai_learn_goals)}` : '',
    currentDivision ? `${english ? 'Current division' : 'Divisione attuale'}: ${currentDivision}` : '',
    favoriteTeam ? `${english ? 'Favourite team' : 'Squadra preferita'}: ${favoriteTeam}` : '',
    platform ? `${english ? 'Platform' : 'Piattaforma'}: ${platform}` : '',
    connectionQuality ? `${english ? 'Connection quality' : 'Qualità connessione'}: ${connectionQuality}` : '',
    slowOpponentConnectionIssues
      ? `${english ? 'Slow-opponent connection issues' : 'Problemi connessione contro avversari lenti'}: ${slowOpponentConnectionIssues}`
      : '',
    inputDelay ? `Input delay: ${inputDelay}` : '',
    passLevel ? `${english ? 'Pass level' : 'Livello passaggi'}: ${passLevel}` : '',
    smartAssist ? `Smart Assist: ${smartAssist}` : '',
    profile.ai_notes ? `${english ? 'Notes for AI' : "Note per l'IA"}: ${clean(profile.ai_notes, 280)}` : ''
  ].filter(Boolean)
  const suggestions = english
    ? `SUGGESTIONS:
1. [short first-person request to understand]
2. [short first-person request to apply]
3. [short first-person request to train, optional]`
    : `SUGGERIMENTI:
1. [richiesta breve in prima persona per capire]
2. [richiesta breve in prima persona per applicare]
3. [richiesta breve in prima persona per allenare, opzionale]`
  return [
    `CONTESTO: ${clean(context?.currentPage || 'Dashboard', 500)} | ${english ? 'Question' : 'Domanda'}: "${clean(message, 4000)}"`,
    hasHistory ? (english ? 'Continue the existing conversation. Do not greet again.' : 'Continua la conversazione esistente. Non salutare di nuovo.') : '',
    profileLines.join('\n'),
    personalContextSummary ? `■ ${contextBlockLabel}:\n${personalContextSummary}` : '',
    cardAvailabilityBlock ? `■ ${english ? 'CARD ADVISOR STATUS' : 'STATO CARD ADVISOR'}:\n${cardAvailabilityBlock}` : '',
    rag ? `■ MECCANICHE eFootball (RAG):\n${rag}` : '',
    english
      ? `DECISION ENGINE: cross-check card style, phase position fit, form, key stats/skills, match patterns, coach competence and current tactics. Pick one main lever and at most two secondary levers. For substitutions, link one real symptom to one role need, then compare the actual starter and reserve by phase role, form, card style, relevant stats/skills, team style and coach. Never infer conceded-goal locations from attack maps.`
      : `MOTORE DECISIONALE: incrocia stile card, fit posizione per fase, forma, stats/skill chiave, pattern partite, competenza allenatore e tattica attuale. Scegli una leva principale e massimo due secondarie. Per le sostituzioni collega un sintomo reale al ruolo da rinforzare, poi confronta titolare e riserva reali per ruolo di fase, forma, stile card, stats/skill pertinenti, stile squadra e allenatore. Non dedurre mai le zone dei gol subiti dalle mappe di attacco.`,
    english
      ? 'Use all supplied real context. Give 2-4 natural sentences; no buttons, app walkthrough, tier list, invented opponent names or data recital.'
      : 'Usa tutto il contesto reale fornito. Dai 2-4 frasi naturali; niente tasti, guida app, tier list, nomi avversari inventati o recita dei dati.',
    suggestions,
    `${english ? 'CLIENT QUESTION' : 'DOMANDA CLIENTE'}: "${message}"`,
    `${english ? 'Reply as' : 'Rispondi come'} ${aiName}.`
  ].filter(Boolean).join('\n\n')
}
