# Player Catalog Import

Questa e la procedura corretta per aggiornare `player_catalog` da PESDB e scrivere in Supabase.

## Regole Base

- `player_catalog` e il catalogo globale delle carte.
- `players` e la rosa dei clienti e non deve essere usata come catalogo.
- Gli import PESDB non devono modificare `players`.
- La fonte pronta per il prodotto e solo `source = 'pesdb'`.
- Le carte `Standard` non entrano nel catalogo pronto.
- Il campo PESDB `form` non si importa perche e variabile.
- I record sospetti o incompleti devono avere `catalog_ready = false` e `needs_review = true`.
- I record `source = efootballhub` sono staging/esperimenti e non alimentano la UI pubblica.

## Identita Corretta

Il catalogo rappresenta carte/versioni, non persone.

La chiave tecnica della carta e:

```sql
source + source_player_id + card_type
```

Regole operative:

- Non deduplicare mai per nome.
- Non deduplicare per nome + posizione.
- Non deduplicare per nome + stile.
- Due carte con stesso nome possono entrambe essere valide se hanno `source_player_id` diverso.
- Prima di importare un "mancante", controllare sempre se manca l'ID esatto PESDB, non solo il nome.
- La UI puo raggruppare per `player_identity_key`, ma deve mostrare tutte le carte/versioni.

Esempi:

- `Ruud Gullit` puo avere una carta `Epic / P / Fox in the Box` e una `Epic / TRQ / Hole Player`.
- `Rafael Leao` puo avere versioni `AC Milan`, `Portugal`, `Highlight`, `Trending`, ruoli e stili diversi.

## Script Ufficiali

Script da usare:

- `scripts/import_epic_catalog.py`
- `scripts/upsert_player_catalog.py`
- `scripts/generate_pesdb_time_added_sources.py` (opzionale: genera `--url-json` per piu giorni `time_added`)

`import_epic_catalog.py`:

- scarica liste PESDB;
- accetta tutte le carte non `Standard`, salvo filtro esplicito `--card-types`;
- legge dettaglio level 1 e max level;
- estrae stats, playing style, player skills, AI playstyles;
- normalizza le posizioni nel formato della piattaforma;
- genera `avatar_style`, `player_identity_key`, `card_instance_key`, `card_variant_label`;
- produce JSON e SQL.

`upsert_player_catalog.py`:

- carica un JSON in Supabase a chunk;
- usa conflict target `source,source_player_id,card_type`;
- chiama `refresh_player_catalog_payloads` se non si passa `--skip-refresh`.

## Sorgenti PESDB

Import per data, usato per aggiornamenti settimanali:

```text
https://pesdb.net/efootball/?all=1&time_added=<unix_utc_midnight>&featured=all&sort=overall_at_max_level&page=N
```

Esempi validati:

- `2026-05-14`: `time_added=1778716800`
- `2026-05-12`: `time_added=1778544000`
- `2026-05-11`: `time_added=1778457600`

Import globale featured:

```text
https://pesdb.net/efootball/?all=1&featured=all&sort=overall_at_max_level&page=N
```

Import mirato per nome:

```text
https://pesdb.net/efootball/?all=1&name=<nome>
```

Usare `--sleep 3` o `--sleep 5` per evitare rate limit PESDB. Se serve vedere avanzamento in tempo reale su Windows/PowerShell, usare `python -u`.

## Strategia: dai piu nuovi ai piu vecchi

Si puo andare a ritroso con `time_added` (una data UTC alla volta, piu pagine). E il metodo corretto per allinearsi alle uscite PESDB per giorno.

Limiti realistici:

- Molti giorni gia risultano quasi tutti coperti da import passati su `featured=all`: lo scraping puo durare molto e inserire pochissime carte nuove.
- Conviene non indietreggiare all infinito a caso: dopo qualche settimana il rendimento cala molto.

Strada consigliata (ibrida), sempre rispettando le regole di identita carta:

1. **Finestra recente a ritroso**: per esempio ultimi 14-30 giorni con `time_added`, poche pagine per giorno, poi import solo mancanti o upsert controllato.
2. **Chiusura buchi**: se serve piu copertura, usare `featured=all` paginato o import per `name=` su giocatori/meta mancanti, non solo `time_added`.
3. **Verifica sempre per `source_player_id`**: prima di importare, confrontare gli ID lista PESDB con `player_catalog` come fatto per il 12 maggio.

Helper per generare il file `--url-json` su piu giorni:

```shell
python scripts/generate_pesdb_time_added_sources.py --end-date 2026-05-13 --days 7 --max-pages 8 --output scripts/pesdb_backfill_sources.json
```

## Generare Il Batch

Creare un file sorgenti in `scripts/`, per esempio:

```json
[
  {
    "label": "Recent Featured Players 2026-05-14 page 1",
    "url": "https://pesdb.net/efootball/?all=1&time_added=1778716800&featured=all&sort=overall_at_max_level"
  },
  {
    "label": "Recent Featured Players 2026-05-14 page 2",
    "url": "https://pesdb.net/efootball/?all=1&time_added=1778716800&featured=all&sort=overall_at_max_level&page=2"
  }
]
```

Eseguire lo scraper:

```shell
python -u scripts/import_epic_catalog.py --limit 200 --url-json scripts/pesdb_recent_YYYYMMDD_sources.json --output-json scripts/pesdb_recent_YYYYMMDD.json --output-sql scripts/pesdb_recent_YYYYMMDD.sql --sleep 3
```

Controlli obbligatori prima della scrittura:

- il JSON deve avere `errors = 0`, oppure gli errori vanno investigati;
- controllare distribuzione `card_type`;
- verificare che i mancanti siano mancanti per `source_player_id`, non per nome;
- non importare a mano record costruiti senza parser PESDB.

## Scrivere In Supabase

Metodo corretto se hai `SUPABASE_SERVICE_ROLE_KEY` disponibile in locale:

```shell
python scripts/upsert_player_catalog.py --input-json scripts/pesdb_recent_YYYYMMDD.json
```

Variabili richieste:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Metodo corretto in Cursor quando non c'e la service key locale:

- non usare Vercel;
- non cercare chiavi in produzione;
- non aprire policy client su `player_catalog`;
- usare Supabase MCP per applicare SQL controllato o una RPC temporanea;
- importare solo record validati dal JSON generato dallo script;
- eliminare subito la RPC temporanea dopo l'import.

Pattern RPC temporanea:

1. Creare una funzione temporanea `security definer` con token hardcoded valido solo per quel batch.
2. La funzione riceve `records jsonb`.
3. Scrive solo su `public.player_catalog`.
4. Usa `on conflict (source, source_player_id, card_type) do nothing` per batch di soli mancanti.
5. Usa upsert solo quando si vuole aggiornare intenzionalmente versioni gia presenti.
6. Dopo il caricamento chiamare `refresh_player_catalog_payloads()`.
7. Eseguire `drop function if exists public.tmp_...(text, jsonb);`.
8. Verificare che la funzione temporanea non esista piu.

Query di verifica dopo import:

```sql
select source_player_id, player_name, card_type, position, team_name,
       catalog_ready, needs_review, players_payload is not null as has_payload
from public.player_catalog
where source = 'pesdb'
  and source_player_id in (...);
```

```sql
select count(*) as pesdb_ready_non_standard
from public.player_catalog
where source = 'pesdb'
  and lower(card_type) <> 'standard'
  and catalog_ready = true;
```

## Allineamento Con `players`

`player_catalog` e allineato al formato rosa tramite:

- `players_base_stats`
- `players_payload`

`players_payload` contiene il payload pronto per creare un giocatore rosa da catalogo:

- `player_name`
- `position`
- `card_type`
- `team`
- `club_name`
- `nationality`
- `overall_rating`
- `height_cm`
- `weight_kg`
- `age`
- `role`
- `playing_style`
- `base_stats` nel formato `attacking` / `defending` / `athleticism` / `goalkeeping`
- `skills`
- `com_skills`
- `original_positions`
- `photo_slots`
- `metadata`

Regola di visibilita:

- `catalog_ready = true`: record usabile per UI/catalogo e creazione rosa.
- `needs_review = true`: record da non mostrare nella UI pubblica.

Query prodotto:

```sql
select *
from public.player_catalog
where source = 'pesdb'
  and lower(card_type) <> 'standard'
  and catalog_ready = true;
```

## Stato Attuale

Stato dopo gli import del 2026-05-14, 2026-05-12, 2026-05-11 e backfill 2026-05-06..2026-05-10:

- `4834` carte PESDB non-Standard pronte.
- Distribuzione pronta: `2767 Highlight`, `990 Trending`, `823 Epic`, `239 Legendary`, `15 Card Strike Arena`.
- Tutte le carte importate dai batch recenti hanno `players_payload`.
- Le RPC temporanee usate per importare i batch recenti sono state eliminate dopo l'uso.
- Batch `2026-05-06..2026-05-10`: 303 ID PESDB unici controllati, 267 gia presenti, 36 inseriti; 32 pronti e 4 lasciati in review dal parser.

## Cose Da Non Fare

- Non usare Vercel per recuperare env o chiavi.
- Non scrivere direttamente in `players` durante import catalogo.
- Non deduplicare per nome.
- Non usare la chiave publishable per scrivere direttamente su `player_catalog`.
- Non lasciare funzioni temporanee attive dopo import.
- Non importare record con `needs_review = false` se team, carta o dati fonte sono sospetti.
