# Mappa dati Supabase (eFootball)

Intrecci verificati. Non cambiare semantica di queste tabelle senza decisione owner.

## Hub

| Tabella | Consumatori | Note |
|---------|-------------|------|
| `user_profiles` | Auth, Hero, Palestra, Card Advisor, credits, Knowledge | Hub utente + `metalgate_user_id` + AI knowledge |
| `user_tactical_feedback` | Diagnostic, Card Advisor, countermeasures, Knowledge | Memoria Palestra |
| `user_diagnostic_cache` | Hero Chat, Card Advisor | Cache, non source of truth (fresca ≤ ~6h) |

## Rosa / Coach

| Tabella | Ruolo |
|---------|--------|
| `players` | Rosa utente. `slot_index` 0–10 titolari, NULL riserve |
| `formation_layout` | Modulo + coordinate |
| `formation_variants` | Fluid Formation attacco/difesa |
| `team_tactical_settings` | Stile squadra + istruzioni |
| `playing_styles` | Catalogo stili |
| `player_catalog` | Catalogo globale carte |
| `coaches` / `coach_catalog` | Allenatore utente vs catalogo |

## Partite / derivati

| Tabella | Ruolo |
|---------|--------|
| `matches` | Partite salvate da workflow Hero |
| `team_tactical_patterns` | Derivato codice (non edit UI) |
| `user_game_analysis` | Ultima analisi stats |
| `opponent_formations` | Contromisure / extract |
| `prematch_plans` | Piani contromisure |
| `hero_chat_threads` / `hero_chat_messages` | Cronologia Hero |
| `weekly_goals` | Legacy Task; UI assente. Side effect ancora possibili |

## Economia locale

| Tabella | Ruolo |
|---------|--------|
| `user_credit_usage` | Tracking periodo |
| `credit_transactions` | Log usage/accrediti |
| `credit_error_logs` | Errori wallet/tracking |

Card Advisor: `card_advisor_releases`, `card_advisor_cards`.

Notifiche: `notifications`, `notification_prefs` (applicate 2026-09-15).

## Side effect da conoscere

| Trigger | Effetti |
|---------|---------|
| `save-match` | pattern + knowledge (+ weekly_goals progress) |
| `save-coach-feedback` | `user_tactical_feedback` + campi profilo dichiarati |
| save player / coach / tactics / profile | knowledge refresh |
| `tasks/list` GET | legacy: può scrivere `weekly_goals` — non esporre in UX |

## Zone

Attacco utente ≠ pressione avversaria ≠ gol subiti. Non inventare zone senza dati.
