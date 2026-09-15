const VERDICTS = new Set(['take', 'premium_rotation', 'situational', 'luxury_pick', 'not_priority', 'skip'])
const PURCHASE_FITS = new Set([
  'fits_current_setup',
  'fits_with_rotation',
  'fits_if_formation_change',
  'skill_only_no_slot',
  'not_your_playstyle',
  'skip_duplicate',
  'insufficient_data'
])

function clean(value, maxLength = 500) {
  const text = String(value ?? '').replace(/\r\n|\r|\n/g, ' ').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function list(value, maxItems, maxLength) {
  return Array.isArray(value)
    ? value.map((item) => clean(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : []
}

export function normalizeDeepAnalysis(payload, lang = 'it') {
  const english = lang === 'en'
  const fallback = {
    headline: english ? 'Detailed card read unavailable' : 'Analisi dettagliata non disponibile',
    verdict: 'situational',
    purchase_fit: 'insufficient_data',
    setup_condition: '',
    summary: english
      ? 'The detailed analysis could not be completed. Use the base Card Advisor read for now.'
      : 'Non è stato possibile completare l’analisi dettagliata. Usa per ora la lettura base del Card Advisor.',
    card_identity: { movement: '', key_skills: [], best_use: '' },
    key_reasoning: [],
    pros: [],
    cons: [],
    synergies: [],
    how_to_use: [],
    when_to_avoid: [],
    final_decision: english
      ? 'Use the base read until a new detailed analysis is available.'
      : 'Usa la lettura base finché non è disponibile una nuova analisi dettagliata.',
    skill_delta_line: ''
  }
  if (!payload || typeof payload !== 'object') return fallback

  return {
    headline: clean(payload.headline, 120) || fallback.headline,
    verdict: VERDICTS.has(payload.verdict) ? payload.verdict : fallback.verdict,
    purchase_fit: PURCHASE_FITS.has(payload.purchase_fit) ? payload.purchase_fit : fallback.purchase_fit,
    setup_condition: clean(payload.setup_condition, 180),
    summary: clean(payload.summary, 420) || fallback.summary,
    card_identity: {
      movement: clean(payload.card_identity?.movement, 130),
      key_skills: list(payload.card_identity?.key_skills, 5, 60),
      best_use: clean(payload.card_identity?.best_use, 160)
    },
    key_reasoning: Array.isArray(payload.key_reasoning)
      ? payload.key_reasoning.map((item) => ({
          label: clean(item?.label, 45),
          text: clean(item?.text ?? item, 220)
        })).filter((item) => item.text).slice(0, 4)
      : [],
    pros: list(payload.pros, 3, 140),
    cons: list(payload.cons, 3, 140),
    synergies: list(payload.synergies, 3, 160),
    how_to_use: list(payload.how_to_use, 3, 140),
    when_to_avoid: list(payload.when_to_avoid, 2, 140),
    final_decision: clean(payload.final_decision, 220) || fallback.final_decision,
    skill_delta_line: clean(payload.skill_delta_line, 320)
  }
}

export function buildDeepAnalysisRequest({
  card,
  catalogCard,
  rosterContext,
  lang = 'it',
  model = 'gpt-5.2'
}) {
  const language = lang === 'en' ? 'English' : 'Italian'
  const context = {
    card,
    catalog_card: catalogCard,
    roster: rosterContext?.players || [],
    formation: rosterContext?.layout || null,
    active_coach: rosterContext?.activeCoach || null,
    tactical_settings: rosterContext?.tacticalSettings || null,
    profile: rosterContext?.profile || null,
    tactical_patterns: rosterContext?.patterns || null,
    game_analysis: rosterContext?.gameAnalysis || null,
    diagnostics: rosterContext?.diagnostic || null,
    coach_feedback: rosterContext?.feedback || [],
    player_performance: rosterContext?.performance || []
  }

  return {
    model,
    messages: [{
      role: 'user',
      content: `You are an enterprise eFootball Card Advisor. Answer only in ${language}.
Decide whether this card improves this customer's current squad, formation and play style. Do not use overall as the purchase reason. Do not invent players, skills, roles or stats. Distinguish playing style (movement) from native skills. If roster data exists, establish squad hierarchy before discussing skills. Same-player versions cannot rotate together.

Return ONLY valid JSON:
{
  "headline": "max 55 chars",
  "verdict": "take|premium_rotation|situational|luxury_pick|not_priority|skip",
  "purchase_fit": "fits_current_setup|fits_with_rotation|fits_if_formation_change|skill_only_no_slot|not_your_playstyle|skip_duplicate|insufficient_data",
  "setup_condition": "max 160 chars",
  "summary": "max 2 short sentences",
  "card_identity": {"movement":"","key_skills":[],"best_use":""},
  "key_reasoning": [{"label":"","text":""}],
  "pros": [], "cons": [], "synergies": [], "how_to_use": [], "when_to_avoid": [],
  "final_decision": "max 180 chars"
}

CONTEXT
${JSON.stringify(context, null, 2)}`
    }],
    response_format: { type: 'json_object' },
    temperature: 0.45,
    max_completion_tokens: 2200
  }
}
