/**
 * Guard rail deterministico: domande su "Linea bassa / Deep line" su difensori (RAG §5).
 * L'LLM a volte confonde istruzione individuale vs linea difensiva di squadra.
 */

function normalizeGuardText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True se il messaggio chiede esplicitamente Linea bassa/Deep line in relazione a difensori.
 */
export function isDeepLineOnDefenderQuestion(raw) {
  const m = normalizeGuardText(raw)
  if (m.length < 8) return false

  const hasLine =
    m.includes('linea bassa') ||
    m.includes('liena bassa') ||
    m.includes('deep line') ||
    m.includes('deepline')

  if (!hasLine) return false

  const hasDef =
    /\bdc\b/.test(m) ||
    /\btd\b/.test(m) ||
    /\bts\b/.test(m) ||
    /\bcb\b/.test(m) ||
    /\blb\b/.test(m) ||
    /\brb\b/.test(m) ||
    m.includes('difensor') ||
    m.includes('centrale') ||
    m.includes('terzin') ||
    m.includes('centre back') ||
    m.includes('full back') ||
    m.includes('centrali')

  return hasDef
}

/** Temperatura consigliata quando il guard è attivo (meno creatività su regole fisse). */
export function temperatureForDeepLineGuard(baseTemp) {
  const t = typeof baseTemp === 'number' && Number.isFinite(baseTemp) ? baseTemp : 0.7
  return Math.min(t, 0.35)
}

/** Aggiunta breve al SYSTEM (massima priorità). */
export function getDeepLineGuardSystemAddendum(lang) {
  if (lang === 'en') {
    return (
      'CURRENT-QUESTION OVERRIDE: If the user asks whether "Deep line" / "Linea bassa" (individual without-ball instruction) can be set on CB/RB/LB/DC/TD/TS, the ONLY correct answer is NO — not assignable to defenders (RAG §5). Team defensive line depth (arrows/settings) is a different mechanic. Never approve Deep line on a defender.'
    )
  }
  return (
    'PRIORITÀ DOMANDA ATTUALE: se chiedono se "Linea bassa" / Deep line (istruzione individuale slot senza palla) si può dare a DC/TD/TS (difensori), la risposta corretta è NO — non è assegnabile ai difensori (RAG §5). La "linea difensiva" di squadra (frecce / impostazioni) è un\'altra meccanica. Non approvare mai Linea bassa su un difensore.'
  )
}

/** Blocco in coda al prompt utente (rinforzo). */
export function getDeepLineGuardUserAppendix(lang) {
  if (lang === 'en') {
    return (
      '■ MANDATORY FACT (RAG §5 — do not contradict):\n' +
      'The individual instruction "Deep line" / "Linea bassa" is NOT assignable to defenders (CB/RB/LB / DC/TD/TS). Answer NO to "can my DC have Deep line?". If they want a deeper block, mention team defensive line settings or allowed instructions (marking, anchoring, etc.) — not this instruction on a defender.'
    )
  }
  return (
    '■ FATTO OBBLIGATORIO (RAG §5 — non contraddire):\n' +
      'L\'istruzione individuale "Linea bassa" / Deep line NON è assegnabile ai difensori (DC, TD, TS). Se la domanda è se un DC può averla, rispondi NO. Se vogliono difesa più arretrata, parla della linea difensiva di squadra (altra meccanica) o di istruzioni consentite (marcatura, ancoraggio, ecc.) — non questa istruzione su un difensore.'
  )
}

/**
 * Heuristica: risposta che afferma ancora che si può dare Linea bassa/Deep line a un DC/difensore.
 */
export function responseViolatesDeepLineDefenderRule(reply) {
  const t = normalizeGuardText(reply)
  if (t.length < 20) return false

  if (
    /\b(non|mai|not|never)\b.*(assegn|assign|valid|consent|applic|va su|su dc|sui difensor)/.test(t) &&
    (t.includes('linea bassa') || t.includes('deep line'))
  ) {
    return false
  }
  if (
    (t.includes('linea bassa') || t.includes('deep line')) &&
    /\b(non|mai)\b.*(assegnabile|consentit|permett)/.test(t)
  ) {
    return false
  }

  const hasLine = t.includes('linea bassa') || t.includes('deep line')
  const hasDef = /\bdc\b|\btd\b|\bts\b|\bcb\b|difensor|centrale|terzin/.test(t)
  if (!hasLine || !hasDef) return false

  const affirmative =
    /^(sì|si|yes)\b/.test(t) ||
    /^sì /.test(t) ||
    /^si /.test(t) ||
    t.startsWith('sì:') ||
    t.startsWith('si:') ||
    t.includes('sì:') ||
    t.includes('**sì**') ||
    /^yes\b/.test(t)

  const suggestsOk =
    /(puoi|possibil|assegn|dar(e)?\s+a|consigli|convien|adatto|ok\b|corrett|give|assign|you can|should give)/.test(t)

  return Boolean(affirmative && suggestsOk)
}

export function getDeepLineDefenderCorrectionPrefix(lang) {
  if (lang === 'en') {
    return (
      '**Correction (eFootball / RAG §5):** the individual instruction "Deep line" is **not** assignable to centre-backs or full-backs (DC/TD/TS). For a deeper defensive block, adjust **team** defensive line depth (different mechanic) or use allowed instructions (marking, anchoring, etc.).\n\n'
    )
  }
  return (
    '**Correzione (eFootball / RAG §5):** l\'istruzione individuale "Linea bassa" **non** si assegna a DC/TD/TS. Per arretrare la difesa usa la **linea difensiva di squadra** (altra meccanica) oppure istruzioni consentite (marcatura, ancoraggio, ecc.).\n\n'
  )
}
