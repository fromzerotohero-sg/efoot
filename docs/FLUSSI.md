# Flussi applicativi correnti

Route e side effect verificati nel codice. Tabelle: [FLUSSI_LOGICA_SUPABASE.md](./FLUSSI_LOGICA_SUPABASE.md).  
Sistemi: [sistemi/](./sistemi/).

## Auth (MetalGate)

```
/login → MetalGate → /auth/callback → metalgate-callback
  → user_profiles.metalgate_user_id
  → localStorage token → /login-success → app
```

Dettaglio: [sistemi/01-AUTH.md](./sistemi/01-AUTH.md).

## Hero Chat

```
HeroChat → POST /api/assistant-chat (Bearer, 2 HP)
  → Truth Layer + RAG keyword (info_rag.md)
  → contesto: profilo, rosa, coach, diagnostic, feedback, zone
  → risposta naturale + suggerimenti
```

Persistenza: `/api/hero-chat` (niente messaggi `system` UI).  
Dettaglio: [sistemi/04-HERO-CHAT.md](./sistemi/04-HERO-CHAT.md).

## Palestra

```
workflow feedback → coach-feedback-chat (2 HP)
                 → save-coach-feedback (2 HP)
                 → user_tactical_feedback (+ profilo se dichiarato)
```

Dettaglio: [sistemi/05-PALESTRA-COACH.md](./sistemi/05-PALESTRA-COACH.md).

## Rosa

```
/gestione-formazione
  catalogo → player-catalog/search
  save/slot/layout/tattiche/coach → /api/supabase/* e /api/coaches
  extract → extract-player / extract-coach
```

Dettaglio: [sistemi/02-ROSA.md](./sistemi/02-ROSA.md).

## Partite e contromisure

```
screenshot → extract-* → save-match
  async: patterns + AI knowledge (+ weekly_goals legacy)
contromisure → generate-countermeasures → hero-chat/plans
```

Dettaglio: [sistemi/03-PARTITE.md](./sistemi/03-PARTITE.md).

## Card Advisor

```
/card-advisor-lab
  releases / image / build-preview
  deep-analysis → 2 HP
```

Dettaglio: [sistemi/06-CARD-ADVISOR.md](./sistemi/06-CARD-ADVISOR.md).

## Hero Points

```
azione AI → deductCredits (AI_COST = 2)
402 → crediti insufficienti
acquisto → home.fromzerotohero.io (MetalGate)
webhook → POST /api/credits/accredit
```

Dettaglio: [sistemi/07-CREDITI.md](./sistemi/07-CREDITI.md), [COSTI_HP_USO_PIATTAFORMA.md](./COSTI_HP_USO_PIATTAFORMA.md).

## Memoria / knowledge

```
save rosa/coach/tattica/profilo/partita/feedback
  → updateAIKnowledgeScore / knowledge refresh
GET /api/ai-knowledge → score + breakdown
```

Dettaglio: [sistemi/08-MEMORIA.md](./sistemi/08-MEMORIA.md).

## Backend dormiente

Zero traffico. Avvio locale solo per test. Cutover futuro documentato in [sistemi/09-BACKEND-DORMIENTE.md](./sistemi/09-BACKEND-DORMIENTE.md).
