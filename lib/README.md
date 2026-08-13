# lib/ — helper runtime

## Auth / crediti / AI

| File | Ruolo |
|------|--------|
| `authHelper.js` | MetalGate verify + fallback Supabase; Bearer |
| `supabaseClient.js` | Client browser (anon key) |
| `creditService.js` | `AI_COST = 2`, MetalGate wallet, tracking locale |
| `liveCoachPricing.js` | 2 HP start + 5 HP/min |
| `openaiHelper.js` | timeout/retry, detect model_not_found |
| `ragHelper.js` | sezioni da `info_rag.md` |
| `rateLimiter.js` | in-memory, non multi-istanza |
| `diagnosticBuilder.js` | cache contesto Hero |

## Rosa / carte / coach

`rosterSlotUtils.js`, `playerSavePayload.js`, `catalogPlayerBackfill.js`, `cardAdvisor*.js`, `efootballBuildRules.js`, `tacticalInstructions.js`, `formationDefaultSlots.js`, `validateFormationLimits.js`, …

## Task / knowledge / i18n

`taskHelper.js` (generate + fallback statico), `aiKnowledgeHelper.js`, `i18n.js`, `errorHelper.js`, `fetchHelper.js`

## Gate / flag

`prelaunchServer.js`, `prelaunchRoutes.js`, `maintenanceServer.js`, `maintenanceRoutes.js`, `smartCoach.js` (flag quarantena), `featureFlags.js`, `pwaInstall.js`, `dailySpinConfig.js`

Doc crediti: [docs/COSTI_HP_USO_PIATTAFORMA.md](../docs/COSTI_HP_USO_PIATTAFORMA.md).  
Non esiste più `docs/SISTEMA_CREDITI_AI.md`.
