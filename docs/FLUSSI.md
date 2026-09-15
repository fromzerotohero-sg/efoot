# Flussi applicativi correnti

Route e side effect verificati nel codice. Dati/tabelle: [FLUSSI_LOGICA_SUPABASE.md](./FLUSSI_LOGICA_SUPABASE.md).

## Auth (MetalGate)

```
/login
  → NEXT_PUBLIC_METALGATE_LOGIN_URL
  → /auth/callback
  → POST /api/auth/metalgate-callback
  → mapping user_profiles.metalgate_user_id
  → localStorage: metalgate_user + auth_token
  → /login-success
  → app (eventuale /access se PRELAUNCH_ACCESS_CODE è set)
```

`lib/authHelper.validateToken`: prova `POST {METALGATE_API}/sso/verify`, poi fallback `supabase.auth.getUser` salvo `forbidSupabaseFallback`.

Route `forgot-password` / `reset-password` esistono ancora (legacy Supabase). L’ingresso primario è SSO MetalGate.

## Hero Chat

```
AssistantChat (popup globale da AppLayoutShell, o /assistant)
  → POST /api/assistant-chat  (Bearer)
  → RAG sezioni da info_rag.md (keyword, non embeddings)
  → contesto da user_profiles, rosa, coach, cache diagnostica
  → se cache >6h il dettaglio user_tactical_feedback può non entrare nel prompt (P1 noto)
  → deduct AI_COST (2 HP) via creditService / MetalGate
```

## Palestra (motore interno)

Aperta da Home e da contromisure, non è una route primaria.

```
CoachFeedbackChat
  → POST /api/coach-feedback-chat
  → POST /api/save-coach-feedback  → user_tactical_feedback + campi profilo
```

UX V2: stessa identità Hero, motori separati.

## Rosa

```
/gestione-formazione  (= nuova-rosa-lab)
  picker catalogo → /api/player-catalog/search
  save player     → /api/supabase/save-player
  slot            → assign-player-to-slot / remove-player-from-slot
  layout          → save-formation-layout
  tattiche        → save-tactical-settings
  coach           → save-coach / set-active-coach / extract-coach
```

11 titolari (`slot_index` 0–10) + riserve (`slot_index` NULL).

## Partite e derivati

```
POST /api/supabase/save-match
  insert matches
  async: team_tactical_patterns, AI knowledge, weekly_goals progress

POST /api/supabase/update-match
  update matches + ricalcolo pattern/knowledge/task

DELETE /api/supabase/delete-match
  elimina match; non ricalcola esplicitamente pattern/performance come save/update (P2 noto)
```

Contromisure: `/contromisure-pre-partita` → extract-formation + generate-countermeasures.

## Hero Points

Saldo effettivo utenti MetalGate: API wallet MetalGate. Tracking locale: `user_credit_usage`, `credit_transactions`.

```
azione AI → deductCredits / recordUsage (AI_COST = 2)
402 → messaggio crediti insufficienti
acquisto → home.fromzerotohero.io (MetalGate)
webhook  → POST /api/credits/accredit (CREDITS_ACCREDIT_API_KEY)
Live Coach → start 2 HP, heartbeat, end; extra 5 HP/min
```

## Task

`GET /api/tasks/list` **non è read-only**: può generare `weekly_goals` e aggiornare il progresso. Fallback statico in `taskHelper.js` è debito noto. Preservare il side effect finché non viene spostato consapevolmente.

## Card Advisor

```
/card-advisor-lab
  evaluate / releases / build-preview
  deep-analysis → 2 HP, modello CARD_ADVISOR_DEEP_MODEL || gpt-5.2
```

Usa contesto reale: profilo, rosa, coach, tattiche, pattern, stats, diagnostic, feedback.
