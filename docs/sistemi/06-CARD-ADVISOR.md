# Card Advisor

Pilastro **Carte**. Pagina: `/card-advisor-lab`.

## API attive (UX corrente)

| Route | Ruolo | HP |
|-------|--------|----|
| `GET /api/card-advisor-lab/releases` | Pack / release | — |
| `GET /api/card-advisor-lab/image` | Proxy immagini allowlist | — |
| `POST /api/card-advisor-lab/build-preview` | Preview build | — |
| `POST /api/card-advisor-lab/deep-analysis` | Verdetto Pro | 2 |

## Cosa usa deep-analysis

Profilo, rosa (limiti ridotti post-migrazione), formazione, coach, tattiche, pattern, game analysis, diagnostic, feedback Palestra, performance aggregates, RAG selettivo (budget 5000).

## Tabelle

`card_advisor_releases`, `card_advisor_cards` (accesso via route server; non trattarle come API pubbliche client).

## UI accessoria

`components/card-advisor/StylePitch.jsx` — pitch movimento stile (solo frontend).

Import operativo: [CARD_ADVISOR_MANUAL_SUPABASE_IMPORT.md](../CARD_ADVISOR_MANUAL_SUPABASE_IMPORT.md).

## Legacy (non esporre / non migrare)

- `POST /api/card-advisor-lab/evaluate` — UX attuale usa deep-analysis
- `POST /api/card-advisor-access/unlock` — nessun caller attivo
