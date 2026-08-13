# Player catalog — regole e tool presenti

`player_catalog` è il catalogo globale. `players` è la rosa del cliente. Gli import catalogo non devono usare `players` come sorgente.

## Identità carta

Chiave tecnica: `source + source_player_id + card_type`.

- Non deduplicare per nome, nome+posizione o nome+stile.
- Due carte con lo stesso nome possono essere entrambe valide.
- `source = 'pesdb'` è la fonte prodotto. `efootballhub` è staging/esperimento.
- Carte `Standard`: non entrare nel catalogo pronto.
- Record incompleti: `catalog_ready = false`, `needs_review = true`.
- Il campo PESDB `form` non si importa (variabile).

La UI può raggruppare per `player_identity_key` ma deve mostrare tutte le versioni.

## Tool realmente presenti in questo repo

| Tool | Ruolo |
|------|--------|
| `GET /api/player-catalog/search` | Ricerca catalogo usata dal picker Rosa |
| `scripts/backfill-players-catalog-alignment.mjs` | Allinea righe `players` già collegate al catalogo. Dry-run di default; `--apply` scrive |
| `scripts/generate_pesdb_time_added_sources.py` | Genera JSON di URL PESDB per `time_added` |

Non sono presenti in questo snapshot (citati da docs vecchie):

- `scripts/import_epic_catalog.py`
- `scripts/upsert_player_catalog.py`

`generate_pesdb_time_added_sources.py` produce input per quell’importer. Senza l’importer, lo script da solo non aggiorna Supabase.

## Backfill rosa (unico import player eseguibile qui)

```bash
node scripts/backfill-players-catalog-alignment.mjs
node scripts/backfill-players-catalog-alignment.mjs --apply
node scripts/backfill-players-catalog-alignment.mjs --apply --user-id <uuid>
```

Richiede `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Non è un import PESDB.

Quando l’importer PESDB tornerà nel repo, aggiornare questo file e solo allora documentare comandi di load.
