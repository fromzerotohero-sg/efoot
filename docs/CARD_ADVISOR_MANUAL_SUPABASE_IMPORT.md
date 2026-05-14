# Card Advisor - Import manuale eFHUB in Supabase

Procedura usata il 14 maggio 2026 per sostituire i vecchi pack `efhub` in Supabase con i pack live di eFHUB, senza usare service role key locale e senza automatismi schedulati.

## Obiettivo

- Rimuovere dal catalogo Card Advisor i vecchi dati `source = 'efhub'`.
- Importare i pack live letti da `https://efhub.com/it`.
- Popolare `card_advisor_releases` e `card_advisor_cards` con righe `is_active = true`.
- Mantenere `enrichment_status = 'complete'` quando lo scrape dettaglio giocatore riesce.

## Prerequisiti

- Accesso MCP Supabase con tool `execute_sql`.
- Script esistenti:
  - `scripts/sync_card_advisor_cards.py`
  - `scripts/publish_card_advisor_export.py`
- Publishable/anon key Supabase solo per chiamare la funzione temporanea RPC.

Non serve committare export JSON, batch SQL o file temporanei generati.

## 1. Generare export live eFHUB

Da root progetto:

```powershell
python scripts/sync_card_advisor_cards.py --export-only --sleep 0.25 --output-json scripts/_agent_ca_efhub_export.json
```

Output atteso: elenco `COMPLETE ...` per ogni carta e riepilogo finale, ad esempio:

```json
{"cards":128,"complete":128,"partial":0,"failed":0}
```

## 2. Pulire i vecchi dati eFHUB

Eseguire via MCP Supabase `execute_sql`:

```sql
DELETE FROM public.card_advisor_releases
WHERE source = 'efhub';
```

`card_advisor_cards.release_id` ha foreign key `ON DELETE CASCADE`, quindi cancellando le release `efhub` vengono eliminate anche le carte collegate.

Verifica:

```sql
select
  (select count(*) from card_advisor_releases where source = 'efhub') as releases,
  (select count(*) from card_advisor_cards where source = 'efhub') as cards;
```

Atteso prima del nuovo import:

```json
[{"releases":0,"cards":0}]
```

## 3. Creare funzione temporanea di import

Eseguire via MCP Supabase `execute_sql`.

La funzione e `SECURITY DEFINER` solo per evitare di usare la service role key locale durante l'import. Va sempre rimossa al termine.

```sql
CREATE OR REPLACE FUNCTION public.import_card_advisor_efhub_release_tmp(
  p_source_release_id text,
  p_release_name text,
  p_release_date text,
  p_category text,
  p_cards jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_release_id uuid;
  v_item jsonb;
  v_rec jsonb;
  v_count int := 0;
BEGIN
  INSERT INTO public.card_advisor_releases (
    source, source_release_id, source_url, release_name, release_date, category, status,
    is_active, fetched_at, last_synced_at, updated_at
  ) VALUES (
    'efhub', p_source_release_id, 'https://efhub.com/it', p_release_name, NULLIF(p_release_date, ''),
    NULLIF(p_category, ''), 'active', true, now(), now(), now()
  )
  ON CONFLICT (source, source_release_id) DO UPDATE SET
    source_url = EXCLUDED.source_url,
    release_name = EXCLUDED.release_name,
    release_date = EXCLUDED.release_date,
    category = EXCLUDED.category,
    status = 'active',
    is_active = true,
    fetched_at = now(),
    last_synced_at = now(),
    updated_at = now()
  RETURNING id INTO v_release_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_cards, '[]'::jsonb)) LOOP
    v_rec := COALESCE(v_item->'record', '{}'::jsonb);
    IF v_rec = '{}'::jsonb THEN
      CONTINUE;
    END IF;

    INSERT INTO public.card_advisor_cards (
      release_id, source, source_player_id, source_url, player_name, position, overall_display, category, image_url, card_type,
      playing_style, player_skills, ai_playstyles, base_stats, max_stats, position_compatibility,
      height, weight, age, foot, data_quality, completeness_score, enrichment_status, error_message, source_payload,
      is_active, fetched_at, last_synced_at, updated_at
    ) VALUES (
      v_release_id,
      COALESCE(v_rec->>'source', 'efhub'),
      v_rec->>'source_player_id',
      v_rec->>'source_url',
      v_rec->>'player_name',
      v_rec->>'position',
      NULLIF(v_rec->>'overall_display', '')::int,
      v_rec->>'category',
      v_rec->>'image_url',
      v_rec->>'card_type',
      v_rec->>'playing_style',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_rec->'player_skills', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_rec->'ai_playstyles', '[]'::jsonb))),
      COALESCE(v_rec->'base_stats', '{}'::jsonb),
      COALESCE(v_rec->'max_stats', '{}'::jsonb),
      COALESCE(v_rec->'position_compatibility', '{}'::jsonb),
      NULLIF(v_rec->>'height', '')::int,
      NULLIF(v_rec->>'weight', '')::int,
      NULLIF(v_rec->>'age', '')::int,
      v_rec->>'foot',
      COALESCE(NULLIF(v_rec->>'data_quality', ''), 'partial'),
      COALESCE(NULLIF(v_rec->>'completeness_score', '')::int, 0),
      COALESCE(NULLIF(v_rec->>'enrichment_status', ''), 'partial'),
      v_rec->>'error_message',
      COALESCE(v_rec->'source_payload', '{}'::jsonb),
      true,
      now(),
      now(),
      now()
    )
    ON CONFLICT (source, source_player_id, release_id) DO UPDATE SET
      source_url = EXCLUDED.source_url,
      player_name = EXCLUDED.player_name,
      position = EXCLUDED.position,
      overall_display = EXCLUDED.overall_display,
      category = EXCLUDED.category,
      image_url = EXCLUDED.image_url,
      card_type = EXCLUDED.card_type,
      playing_style = EXCLUDED.playing_style,
      player_skills = EXCLUDED.player_skills,
      ai_playstyles = EXCLUDED.ai_playstyles,
      base_stats = EXCLUDED.base_stats,
      max_stats = EXCLUDED.max_stats,
      position_compatibility = EXCLUDED.position_compatibility,
      height = EXCLUDED.height,
      weight = EXCLUDED.weight,
      age = EXCLUDED.age,
      foot = EXCLUDED.foot,
      data_quality = EXCLUDED.data_quality,
      completeness_score = EXCLUDED.completeness_score,
      enrichment_status = EXCLUDED.enrichment_status,
      error_message = EXCLUDED.error_message,
      source_payload = EXCLUDED.source_payload,
      is_active = true,
      fetched_at = now(),
      last_synced_at = now(),
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('release_id', v_release_id, 'cards', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_card_advisor_efhub_release_tmp(text, text, text, text, jsonb) TO anon, authenticated;
```

## 4. Chiamare la funzione per ogni release

Usare il JSON export creato al punto 1 e chiamare la RPC `import_card_advisor_efhub_release_tmp` una volta per ogni blocco `releases[]`.

Esempio di script one-off da terminale. Sostituire `SUPABASE_URL` e `ANON_KEY` con i valori del progetto:

```python
import json
import pathlib
import re
import urllib.request

SUPABASE_URL = 'https://<project-ref>.supabase.co'
ANON_KEY = '<supabase-anon-or-publishable-key>'
RPC_URL = f'{SUPABASE_URL}/rest/v1/rpc/import_card_advisor_efhub_release_tmp'

def slugify_path(name):
    return re.sub(r'[^a-z0-9]+', '-', str(name).lower()).strip('-')[:80] or 'release'

data = json.loads(pathlib.Path('scripts/_agent_ca_efhub_export.json').read_text(encoding='utf-8'))
for block in data.get('releases', []):
    name = block.get('release') or ''
    payload = {
        'p_source_release_id': slugify_path(name),
        'p_release_name': name,
        'p_release_date': None,
        'p_category': None,
        'p_cards': block.get('cards') or []
    }
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(
        RPC_URL,
        data=body,
        method='POST',
        headers={
            'apikey': ANON_KEY,
            'Authorization': f'Bearer {ANON_KEY}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        print(res.status, slugify_path(name), res.read().decode('utf-8', 'replace'))
```

Output riuscito visto il 14 maggio 2026:

```text
200 italian-league-25-26-season-s-best {"cards": 11, ...}
200 shadow-hunt {"cards": 11, ...}
...
200 pots-liga-super-malaysia-25-26 {"cards": 13, ...}
```

## 5. Verificare import

Conteggio totale:

```sql
select
  (select count(*) from card_advisor_releases where source='efhub' and is_active) as active_releases,
  (select count(*) from card_advisor_cards where source='efhub' and is_active) as active_cards,
  (select count(*) from card_advisor_cards where source='efhub' and is_active and enrichment_status='complete') as complete_cards;
```

Risultato atteso per l'import del 14 maggio 2026:

```json
[{"active_releases":15,"active_cards":128,"complete_cards":128}]
```

Verifica per pack:

```sql
select
  r.source_release_id,
  r.release_name,
  count(c.id) as cards,
  count(c.id) filter (where c.enrichment_status = 'complete') as complete_cards
from card_advisor_releases r
left join card_advisor_cards c on c.release_id = r.id and c.is_active = true
where r.source='efhub' and r.is_active = true
group by r.id
order by r.release_name;
```

## 6. Rimuovere funzione temporanea

Sempre a fine import:

```sql
DROP FUNCTION IF EXISTS public.import_card_advisor_efhub_release_tmp(text, text, text, text, jsonb);
```

## Note operative

- Non committare `scripts/_agent_ca_efhub_export.json`, `scripts/_ca_sql_batches_agent/`, `scripts/_ca_mcp_json/` o altri file temporanei di import.
- Se la UI mostra ancora vecchi pack, verificare cache del browser/CDN e la cache HTTP di `/api/card-advisor-lab/releases`.
- Se il conteggio `complete` scende sotto il totale, controllare lo scrape dettaglio eFHUB prima di importare.
