# Mappa dati Supabase (eFootball)

Intrecci verificati. Non cambiare semantica di queste tabelle in uno sprint UX.

## Hub

| Tabella | Consumatori | Note |
|---------|-------------|------|
| `user_profiles` | Auth mapping, Hero, Palestra, Card Advisor, credits, tasks, Knowledge | Hub utente. Include `metalgate_user_id`, knowledge score, dati di gioco. |
| `user_tactical_feedback` | Diagnostic, Card Advisor, countermeasures, Knowledge | Memoria Hero. Poco popolata; non perderla. |
| `user_diagnostic_cache` | Hero Chat, Card Advisor | Cache, non source of truth. Stale >6h: Hero può perdere dettaglio feedback. |

## Rosa / Coach

| Tabella | Ruolo |
|---------|--------|
| `players` | Rosa utente. `slot_index` 0–10 titolari, NULL riserve. |
| `formation_layout` | Modulo + coordinate slot. Un layout per utente. |
| `team_tactical_settings` | Istruzioni/tattiche. |
| `playing_styles` | Catalogo stili. |
| `player_catalog` | Catalogo globale carte. Non usare `players` come catalogo. |
| `coaches` / `coach_catalog` | Allenatore utente vs catalogo. `is_active` è contesto Hero. |

## Partite / derivati

| Tabella | Ruolo |
|---------|--------|
| `matches` | Partite salvate dal workflow Hero. |
| `team_tactical_patterns` | Derivato dal codice (non editarlo dalla UI). |
| `user_game_analysis` | Ultima analisi stats (una riga recente, non storico). |
| `opponent_formations` | Contromisure / extract formation. |
| `weekly_goals` | Task. `GET /api/tasks/list` può inserire/aggiornare. |

## Economia locale

| Tabella | Ruolo |
|---------|--------|
| `user_credit_usage` | Tracking periodo. Saldo reale MetalGate per utenti SSO. |
| `credit_transactions` | Log usage/accrediti. |
| `credit_error_logs` | Errori wallet/tracking. |

Card Advisor: `card_advisor_releases`, `card_advisor_cards` (RLS on, policy assenti: accesso via route server).

## Side effect da preservare

| Trigger applicativo | Effetti |
|---------------------|---------|
| `save-match` | pattern + knowledge + task progress |
| `save-coach-feedback` | `user_tactical_feedback` + eventuali campi profilo |
| `tasks/list` GET | generate weekly goals + update progress |
| `assign/remove slot` | coerenza 11 titolari |

Non esiste nel codice corrente la catena classifica (`leaderboard_snapshots` / RPC leaderboard). Non documentarla come servizio attivo.
