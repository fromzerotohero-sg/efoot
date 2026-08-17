/**
 * Guard rail deterministico legacy: "Linea bassa / Deep Line" è stata rimossa
 * dalle Istruzioni individuali correnti in eFootball v6.0.0.
 * Manteniamo le API storiche per backward compatibility, ma la risposta corrente
 * deve sempre chiarire che il valore può esistere solo in configurazioni legacy.
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
      'CURRENT-QUESTION OVERRIDE (eFootball v6.0.0): "Deep Line" / "Linea bassa" is no longer a current Individual Instruction. It may appear only in legacy saved configurations. Never recommend, re-apply, or present it as selectable. Team defensive line/shape is a different mechanic.'
    )
  }
  return (
    'PRIORITÀ DOMANDA ATTUALE (eFootball v6.0.0): "Linea bassa" / Deep Line non è più un’Istruzione individuale corrente. Può comparire soltanto in configurazioni legacy già salvate. Non consigliarla, non riapplicarla e non presentarla come selezionabile. La struttura/linea difensiva di squadra è una meccanica diversa.'
  )
}

/** Blocco in coda al prompt utente (rinforzo). */
export function getDeepLineGuardUserAppendix(lang) {
  if (lang === 'en') {
    return (
      '■ MANDATORY FACT (RAG §5 — do not contradict):\n' +
      'In eFootball v6.0.0, the individual instruction "Deep Line" / "Linea bassa" is no longer a current selectable instruction. If it appears in saved data, treat it as legacy only. Recommend current instructions or practical team-shape adjustments instead.'
    )
  }
  return (
    '■ FATTO OBBLIGATORIO (RAG §5 — non contraddire):\n' +
      'In eFootball v6.0.0 l’istruzione individuale "Linea bassa" / Deep Line non è più una voce corrente selezionabile. Se compare nei dati salvati, trattala solo come legacy. Suggerisci istruzioni correnti o aggiustamenti pratici della struttura di squadra.'
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
      '**Correction (eFootball v6.0.0):** the individual instruction "Deep Line" is **no longer a current selectable instruction**. If it is present in saved data, it is legacy only. Use current instructions or team-shape adjustments instead.\n\n'
    )
  }
  return (
    '**Correzione (eFootball v6.0.0):** l’istruzione individuale "Linea bassa" **non è più una voce corrente selezionabile**. Se è presente nei dati salvati, è solo legacy. Usa istruzioni correnti o aggiustamenti della struttura di squadra.\n\n'
  )
}
