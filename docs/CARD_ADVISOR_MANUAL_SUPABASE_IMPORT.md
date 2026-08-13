# Card Advisor — import con gli script presenti

Script nel repo:

- `scripts/sync_card_advisor_cards.py` — scrape eFHUB → JSON
- `scripts/upsert_card_advisor_cards.py` — upsert su Supabase (`card_advisor_releases` / `card_advisor_cards`)

Non è presente `scripts/publish_card_advisor_export.py`.

Tabelle: `card_advisor_releases`, `card_advisor_cards`. RLS enabled senza policy: l’app passa dalle route server, non dal client diretto.

## 1. Export live

```powershell
python scripts/sync_card_advisor_cards.py --export-only --sleep 0.25 --output-json scripts/_agent_ca_efhub_export.json
```

Non committare i JSON di export.

## 2. Upsert

`upsert_card_advisor_cards.py` usa service role via env (`SUPABASE_SERVICE_ROLE_KEY` / URL). Leggere gli argparse dello script prima di lanciarlo. Non inventare RPC `SECURITY DEFINER` temporanee se lo script upsert basta.

## 3. Verifica in app

- `/card-advisor-lab` mostra release attive
- evaluate usa la rosa reale
- deep analysis: 2 HP, modello `CARD_ADVISOR_DEEP_MODEL` || gpt-5.2

Smoke opzionali: `scripts/smoke-card-advisor-build.mjs`, `scripts/test-card-advisor-anchor.mjs`.
