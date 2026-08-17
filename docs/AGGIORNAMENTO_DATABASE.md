# Aggiornamento database

Procedura unica e testata per aggiornare:

1. **`player_catalog`** da **PESDB** (catalogo globale carte / nuova rosa)
2. **`card_advisor_releases` + `card_advisor_cards`** da **eFHUB** (Card Advisor)

Usare **solo** questa guida. Gli script temporanei `_tmp_*` e i vecchi documenti separati sono stati rimossi.

---

## Prerequisiti

| Cosa | Dettaglio |
|------|-----------|
| Progetto Supabase | `zliuuorrwdetylollrua` → `https://zliuuorrwdetylollrua.supabase.co` |
| MCP Cursor | `.cursor/mcp.json` deve puntare a `project_ref=zliuuorrwdetylollrua` |
| Shell | PowerShell, dalla **root** del repo `efoot` |
| Python | 3.x, dipendenze già installate per gli script in `scripts/` |
| Chiavi locali | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (in `.env.local` o variabili d'ambiente). **Non serve** la service role key per il flusso standard. |

### Cosa non fare

- Non usare Vercel per recuperare chiavi.
- Non scrivere in `players` durante import catalogo.
- Non deduplicare per nome: l'identità carta è `source + source_player_id + card_type`.
- Non lasciare RPC temporanee attive dopo l'import.
- Non committare export JSON di batch (`scripts/pesdb_novita_*.json`, `scripts/card_advisor_efhub_export.json`).

---

## Convenzione file per ogni sessione

Sostituire `YYYYMMDD` con la data del batch (es. `20260625`).

| File | Uso |
|------|-----|
| `scripts/pesdb_novita_YYYYMMDD_sources.json` | URL PESDB generate |
| `scripts/pesdb_novita_YYYYMMDD_ids.json` | ID trovati in lista |
| `scripts/pesdb_novita_YYYYMMDD_missing.json` | ID assenti in catalogo |
| `scripts/pesdb_novita_YYYYMMDD.json` | Record scrapati pronti per import |
| `scripts/card_advisor_efhub_export.json` | Export eFHUB arricchito |

---

# Parte A — Catalogo rosa (`player_catalog`) da PESDB

## A1. Generare le sorgenti PESDB (ultimi N giorni)

Finestra tipica: **7 giorni**, **4 pagine** per giorno.

```powershell
python scripts/generate_pesdb_time_added_sources.py `
  --end-date 2026-06-25 `
  --days 7 `
  --max-pages 4 `
  --output scripts/pesdb_novita_20260625_sources.json
```

## A2. Trovare gli ID mancanti in Supabase

Un solo comando: lista PESDB + confronto con `player_catalog` via REST (anon key).

```powershell
python scripts/pesdb_compare_missing.py `
  --end-date 2026-06-25 `
  --days 7 `
  --max-pages 4 `
  --output-ids-json scripts/pesdb_novita_20260625_ids.json `
  --output-missing-json scripts/pesdb_novita_20260625_missing.json
```

Controllare l'output finale: `missing` deve essere > 0 solo se ci sono carte nuove. Se `missing: 0`, **stop** (catalogo già allineato).

## A3. Scrape dettaglio solo dei mancanti

```powershell
python -u scripts/pesdb_scrape_missing_ids.py `
  --missing-json scripts/pesdb_novita_20260625_missing.json `
  --output-json scripts/pesdb_novita_20260625.json `
  --sleep 2.5
```

Verifiche obbligatorie:

- `errors` nel JSON deve essere **0** (o investigare ogni errore).
- Ogni record deve avere `source_player_id`, `player_name`, `card_type`.
- Non importare JSON con record costruiti a mano.

## A4. Creare la RPC temporanea su Supabase

```powershell
python scripts/pesdb_import_rpc.py write-sql --batch-tag 20260625
```

Genera:

- `scripts/sql/pesdb_import_rpc_20260625.sql` (create + grant)
- `scripts/sql/pesdb_drop_rpc_20260625.sql` (drop)

**Su Cursor:** eseguire il file create con **Supabase MCP → `apply_migration`** (incollare il contenuto di `pesdb_import_rpc_20260625.sql`).

Token interno della funzione: `pesdb-missing-20260625` (legato al `--batch-tag`).

## A5. Importare i record via REST

```powershell
python scripts/pesdb_import_rpc.py apply `
  --batch-tag 20260625 `
  --input-json scripts/pesdb_novita_20260625.json
```

Output atteso: righe `200 upserted_batch ...` fino a coprire tutti i record.

## A6. Aggiornare i payload rosa

**Su Cursor:** Supabase MCP → `execute_sql`:

```sql
SELECT public.refresh_player_catalog_payloads();
```

(Oppure eseguire `scripts/sql/pesdb_refresh_payloads.sql`.)

## A7. Rimuovere la RPC temporanea

**Su Cursor:** Supabase MCP → `apply_migration` con il contenuto di `scripts/sql/pesdb_drop_rpc_20260625.sql`.

## A8. Verifica catalogo

```sql
select count(*) as pesdb_ready
from public.player_catalog
where source = 'pesdb'
  and lower(card_type) <> 'standard'
  and catalog_ready = true;
```

Per carte specifiche appena importate:

```sql
select source_player_id, player_name, card_type, position, team_name,
       catalog_ready, needs_review, players_payload is not null as has_payload
from public.player_catalog
where source = 'pesdb'
  and source_player_id in ('ID1', 'ID2');
```

---

# Parte B — Card Advisor (`card_advisor_*`) da eFHUB

Fonte live: **https://efhub.com/it** (pack attualmente in homepage).

## B1. Export live eFHUB (scrape + arricchimento dettaglio)

```powershell
python scripts/sync_card_advisor_cards.py `
  --export-only `
  --sleep 0.25 `
  --output-json scripts/card_advisor_efhub_export.json
```

Output atteso a fine run (esempio):

```json
{"cards": 56, "complete": 56, "partial": 0, "failed": 0}
```

Se `failed` > 0 o `complete` < `cards`, **non importare**: ripetere export o aumentare `--sleep`.

Controllare nel JSON che i pack attesi ci siano (es. `Brazil Selection 25 Jun '26` con Kaká, Ronaldinho, Cafu).

## B2. Disattivare i vecchi pack eFHUB attivi

Non cancellare lo storico: si imposta `is_active = false`.

**Su Cursor:** Supabase MCP → `apply_migration` con `scripts/sql/card_advisor_deactivate_efhub.sql`.

Verifica:

```sql
select count(*) as still_active
from public.card_advisor_releases
where source = 'efhub' and is_active = true;
```

Atteso: **0**.

## B3. Creare la RPC temporanea Card Advisor

**Su Cursor:** Supabase MCP → `apply_migration` con `scripts/sql/card_advisor_import_rpc.sql`.

## B4. Importare ogni release

```powershell
python scripts/import_card_advisor_export_rpc.py `
  --input-json scripts/card_advisor_efhub_export.json
```

Output atteso: una riga `200 <slug-pack> <N> {"cards": N, ...}` per ogni pack.

## B5. Verifica Card Advisor

```sql
select
  (select count(*) from card_advisor_releases where source='efhub' and is_active) as active_releases,
  (select count(*) from card_advisor_cards where source='efhub' and is_active) as active_cards,
  (select count(*) from card_advisor_cards where source='efhub' and is_active and enrichment_status='complete') as complete_cards;
```

Per pack e giocatori specifici:

```sql
select r.source_release_id, r.release_name, c.player_name, c.overall_display, c.is_active, c.enrichment_status
from card_advisor_releases r
join card_advisor_cards c on c.release_id = r.id
where r.source = 'efhub'
  and r.is_active = true
  and c.is_active = true
order by r.release_name, c.overall_display desc;
```

Esempio Brazil Selection:

```sql
select c.player_name, c.overall_display
from card_advisor_cards c
join card_advisor_releases r on r.id = c.release_id
where r.source_release_id = 'brazil-selection-25-jun-26'
  and c.is_active = true
order by c.overall_display desc;
```

Atteso: **11 carte** incluse Kaká, Ronaldinho Gaucho, Cafu.

## B6. Rimuovere la RPC temporanea

**Su Cursor:** Supabase MCP → `apply_migration` con `scripts/sql/card_advisor_drop_import_rpc.sql`.

## B7. Verifica UI

1. Aprire **Card Advisor Lab** in produzione.
2. Selezionare il pack corretto (i nomi sono quelli eFHUB, es. `Brazil Selection 25 Jun '26`, non "Brazil 2002").
3. Dopo deploy, l'API `/api/card-advisor-lab/releases` non deve essere servita da cache CDN stale.

Se in UI mancano carte ma Supabase è ok: hard refresh o attendere deploy con fix cache route.

---

# Script ufficiali (riferimento rapido)

| Script | Funzione |
|--------|----------|
| `scripts/generate_pesdb_time_added_sources.py` | Genera URL PESDB per `time_added` |
| `scripts/pesdb_compare_missing.py` | Lista ID + confronto mancanti |
| `scripts/pesdb_scrape_missing_ids.py` | Scrape dettaglio PESDB mancanti |
| `scripts/pesdb_import_rpc.py` | RPC temporanea + import catalogo |
| `scripts/import_epic_catalog.py` | Parser PESDB (usato internamente) |
| `scripts/sync_card_advisor_cards.py` | Scrape eFHUB (`--export-only`) |
| `scripts/import_card_advisor_export_rpc.py` | Import pack via RPC |
| `scripts/sql/*.sql` | SQL da eseguire con MCP |

### Percorso alternativo (solo se hai `SUPABASE_SERVICE_ROLE_KEY` in locale)

```powershell
python scripts/upsert_player_catalog.py --input-json scripts/pesdb_novita_YYYYMMDD.json
python scripts/sync_card_advisor_cards.py --replace-active --sleep 0.35
```

Usare il flusso MCP + RPC sopra se la service role **non** è disponibile in locale (caso normale in Cursor).

---

# Checklist rapida sessione

## PESDB / catalogo

- [ ] A1 sources generate
- [ ] A2 missing contati
- [ ] A3 scrape `errors: 0`
- [ ] A4 RPC create su MCP
- [ ] A5 apply REST completato
- [ ] A6 `refresh_player_catalog_payloads()`
- [ ] A7 RPC drop
- [ ] A8 conteggi verificati

## eFHUB / Card Advisor

- [ ] B1 export `failed: 0`, pack attesi presenti
- [ ] B2 deactivate vecchi pack
- [ ] B3 RPC create
- [ ] B4 import tutte le release `200`
- [ ] B5 conteggi + spot check giocatori
- [ ] B6 RPC drop
- [ ] B7 UI ok

---

*Ultimo aggiornamento procedura: 2026-06-25*
