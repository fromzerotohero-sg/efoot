# lib/ — helper runtime

## Auth / crediti / AI

| File | Ruolo |
|------|--------|
| `authHelper.js` | MetalGate verify + fallback Supabase |
| `supabaseClient.js` | Client browser (anon) |
| `creditService.js` | `AI_COST = 2`, wallet MetalGate, tracking locale |
| `openaiHelper.js` | timeout/retry, model_not_found |
| `ragHelper.js` | sezioni da `info_rag.md` |
| `efootballTruthLayer.js` | regole ufficiali versionate |
| `coachPromptRules.js` | policies + verbalizzazione condivisa |
| `rateLimiter.js` | in-memory |
| `diagnosticBuilder.js` / `diagnosticCacheSanitize.js` | contesto Hero |
| `aiKnowledgeHelper.js` | “Quanto ti conosce” |
| `heroChatStore.js` | persistenza thread (niente `system` UI) |

## Rosa / tattiche / zone

`playerSavePayload.js`, `rosterSkillsContext.js`, `playerSkillLabels.js`, `playingStyleResolve.js`, `teamPlayingStyles.js`, `tacticalInstructions.js`, `matchAttackZones.js`, `formation*`, `validateFormationLimits.js`, …

## Card Advisor / contromisure

`cardAdvisor*.js`, `countermeasuresHelper.js`, `prematch*.js`

## Gate / PWA / i18n

`prelaunch*`, `maintenance*`, `pwaInstall.js`, `coachReadinessNudge.js`, `i18n.js`

## Legacy

`taskHelper.js` — UI Task rimossa; non trattarlo come feature attiva.

Costi: [docs/COSTI_HP_USO_PIATTAFORMA.md](../docs/COSTI_HP_USO_PIATTAFORMA.md).  
Sistemi: [docs/sistemi/](../docs/sistemi/).
