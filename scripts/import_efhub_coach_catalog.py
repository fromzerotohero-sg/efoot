import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request


BASE_URL = "https://efhub.com"
MANAGERS_URL = f"{BASE_URL}/data/managers.json"
BOOSTS_URL = f"{BASE_URL}/data/boosts.json"
SOURCE_VERSION = "efhub-managers-2026"
USER_AGENT = "Mozilla/5.0 (compatible; EFootCoachCatalogImporter/1.0)"

PLAYSTYLE_KEY_MAP = {
    "PossessionGame": "possesso_palla",
    "QuickCounter": "contropiede_veloce",
    "LongBallCounter": "contrattacco",
    "OutWide": "vie_laterali",
    "LongBall": "passaggio_lungo",
}


def env_or_arg(value, env_name):
    return value or os.environ.get(env_name)


def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def post_json(url, service_key, payload, prefer=None):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer

    request = urllib.request.Request(url, data=body, method="POST", headers=headers)
    with urllib.request.urlopen(request, timeout=90) as response:
        text = response.read().decode("utf-8", "replace")
        return response.status, text


def chunks(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def build_boost_index(boosts_payload):
    boost_index = {}
    for slot_name, boosts in boosts_payload.items():
        for boost in boosts:
            boost_index[boost.get("id")] = {
                **boost,
                "slot": slot_name,
            }
    return boost_index


def normalize_playstyles(skills):
    return {
        target_key: int(skills[source_key])
        for source_key, target_key in PLAYSTYLE_KEY_MAP.items()
        if source_key in skills and skills[source_key] is not None
    }


def normalize_boosters(boost_ids, boost_index):
    boosters = []
    for slot_index, boost_id in enumerate(boost_ids or [], start=1):
        if boost_id in (-1, 0):
            continue

        boost = boost_index.get(boost_id)
        if not boost:
            boosters.append({
                "source_boost_id": boost_id,
                "slot_index": slot_index,
                "stat_name": f"Unknown boost {boost_id}",
                "bonus": None,
                "source": "efhub",
            })
            continue

        boosters.append({
            "source_boost_id": boost_id,
            "slot_index": slot_index,
            "stat_name": boost.get("name"),
            "bonus": None,
            "stats": {
                key: value
                for key, value in (boost.get("stats") or {}).items()
                if value
            },
            "source": "efhub",
            "metadata": {
                "japName": boost.get("japName"),
                "version": boost.get("version"),
                "slot": boost.get("slot"),
            },
        })
    return boosters


def make_record(manager, boost_index, synced_at):
    source_coach_id = str(manager["id"])
    image_url = f"https://efimg.com/efootballhub22/images/coach_cards/{source_coach_id}.png"
    playing_styles = normalize_playstyles(manager.get("skills") or {})
    stat_boosters = normalize_boosters(manager.get("boosts") or [], boost_index)

    coach_payload = {
        "coach_name": manager.get("name"),
        "category": "EFHub Manager",
        "pack_type": "Special",
        "playing_style_competence": playing_styles,
        "training_affinity_description": None,
        "stat_boosters": stat_boosters,
        "connection": None,
        "photo_slots": {
            "catalog_card": image_url,
        },
        "source_catalog": {
            "catalog": "coach_catalog",
            "source": "efhub",
            "source_coach_id": source_coach_id,
            "source_card_image_url": image_url,
        },
    }

    return {
        "source": "efhub",
        "source_coach_id": source_coach_id,
        "source_url": MANAGERS_URL,
        "source_card_image_url": image_url,
        "source_version": SOURCE_VERSION,
        "coach_name": manager.get("name"),
        "coach_name_ja": manager.get("japname"),
        "category": "EFHub Manager",
        "pack_type": "Special",
        "playing_style_competence": playing_styles,
        "stat_boosters": stat_boosters,
        "boost_ids": manager.get("boosts") or [],
        "connection": None,
        "photo_slots": {
            "catalog_card": image_url,
        },
        "coach_payload": coach_payload,
        "metadata": {
            "raw_skills": manager.get("skills") or {},
            "raw_boost_ids": manager.get("boosts") or [],
            "source_note": "EFHub manager data is exposed by the player builder manager selector.",
        },
        "catalog_ready": True,
        "needs_review": False,
        "last_source_sync_at": synced_at,
    }


def load_records(input_json):
    with open(input_json, "r", encoding="utf-8") as file:
        payload = json.load(file)
    if isinstance(payload, list):
        return payload
    return payload.get("records", [])


def collect_records():
    managers = fetch_json(MANAGERS_URL)
    boosts = fetch_json(BOOSTS_URL)
    boost_index = build_boost_index(boosts)
    synced_at = datetime.now(timezone.utc).isoformat()
    records = [make_record(manager, boost_index, synced_at) for manager in managers]
    records.sort(key=lambda item: (item["coach_name"] or "", item["source_coach_id"]))
    return records


def upsert_records(records, supabase_url, service_key, chunk_size, sleep):
    table_url = urllib.parse.urljoin(supabase_url.rstrip("/") + "/", "rest/v1/coach_catalog")
    table_url += "?on_conflict=source,source_coach_id"

    total = 0
    for batch in chunks(records, chunk_size):
        status, text = post_json(
            table_url,
            service_key,
            batch,
            prefer="resolution=merge-duplicates,return=minimal",
        )
        total += len(batch)
        print(f"upserted {total}/{len(records)} status={status}")
        if text:
            print(text)
        time.sleep(sleep)

    rpc_url = urllib.parse.urljoin(supabase_url.rstrip("/") + "/", "rest/v1/rpc/refresh_coach_catalog_payloads")
    status, text = post_json(rpc_url, service_key, {})
    print(f"refresh_coach_catalog_payloads: {status} {text}")


def sql_literal(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def jsonb_literal(value):
    if value is None:
        return "NULL::jsonb"
    return "'" + json.dumps(value, ensure_ascii=False).replace("'", "''") + "'::jsonb"


def write_sql_chunks(records, output_dir, chunk_size):
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    columns = [
        "source",
        "source_coach_id",
        "source_url",
        "source_card_image_url",
        "source_version",
        "coach_name",
        "coach_name_ja",
        "category",
        "pack_type",
        "playing_style_competence",
        "stat_boosters",
        "boost_ids",
        "connection",
        "photo_slots",
        "coach_payload",
        "metadata",
        "catalog_ready",
        "needs_review",
        "last_source_sync_at",
    ]
    jsonb_columns = {
        "playing_style_competence",
        "stat_boosters",
        "boost_ids",
        "connection",
        "photo_slots",
        "coach_payload",
        "metadata",
    }
    bool_columns = {"catalog_ready", "needs_review"}
    update_columns = [column for column in columns if column not in {"source", "source_coach_id"}]

    written = []
    for index, batch in enumerate(chunks(records, chunk_size), start=1):
        values = []
        for record in batch:
            row = []
            for column in columns:
                value = record.get(column)
                if column in jsonb_columns:
                    row.append(jsonb_literal(value))
                elif column in bool_columns:
                    row.append("true" if value else "false")
                elif column == "last_source_sync_at":
                    row.append(f"{sql_literal(value)}::timestamptz")
                else:
                    row.append(sql_literal(value))
            values.append("(" + ",".join(row) + ")")

        sql = (
            "INSERT INTO public.coach_catalog ("
            + ",".join(columns)
            + ") VALUES\n"
            + ",\n".join(values)
            + "\nON CONFLICT (source, source_coach_id) DO UPDATE SET "
            + ", ".join(f"{column}=EXCLUDED.{column}" for column in update_columns)
            + ";\n"
        )
        file_path = output_path / f"efhub_coach_catalog_chunk_{index:02d}.sql"
        file_path.write_text(sql, encoding="utf-8")
        written.append(str(file_path))
    return written


def main():
    parser = argparse.ArgumentParser(description="Import EFHub managers into coach_catalog.")
    parser.add_argument("--output-json", default="scripts/efhub_coach_catalog_import.json")
    parser.add_argument("--input-json", help="Use an existing generated JSON instead of fetching EFHub.")
    parser.add_argument("--upsert", action="store_true", help="Upsert records to Supabase.")
    parser.add_argument("--supabase-url")
    parser.add_argument("--service-role-key")
    parser.add_argument("--chunk-size", type=int, default=25)
    parser.add_argument("--sleep", type=float, default=0.3)
    parser.add_argument("--output-sql-dir", help="Write chunked SQL upsert files.")
    args = parser.parse_args()

    records = load_records(args.input_json) if args.input_json else collect_records()

    if not args.input_json:
        with open(args.output_json, "w", encoding="utf-8") as file:
            json.dump({"records": records}, file, ensure_ascii=False, indent=2)
        print(f"wrote {len(records)} records to {args.output_json}")

    if args.upsert:
        supabase_url = env_or_arg(args.supabase_url, "NEXT_PUBLIC_SUPABASE_URL")
        service_key = env_or_arg(args.service_role_key, "SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not service_key:
            raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or args")
        upsert_records(records, supabase_url, service_key, args.chunk_size, args.sleep)

    if args.output_sql_dir:
        written = write_sql_chunks(records, args.output_sql_dir, args.chunk_size)
        print(f"wrote {len(written)} SQL chunks to {args.output_sql_dir}")


if __name__ == "__main__":
    main()
