# app/api/ – Endpoint API

Tutti richiedono Bearer token. Rate limit su endpoint critici.

## AI
- assistant-chat, analyze-match, generate-countermeasures
- extract-player, extract-formation, extract-match-data, extract-coach

## Supabase CRUD
- supabase/save-player, save-formation-layout, assign/remove-player-from-slot
- supabase/save-match, update-match, delete-match
- supabase/save-profile, save-coach, set-active-coach, save-tactical-settings, save-opponent-formation

## Altri
- ai-knowledge, tasks/list, tasks/generate, credits/usage, admin/recalculate-patterns

Doc: docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md, docs/VERIFICA_SUPABASE_END_TO_END.md
