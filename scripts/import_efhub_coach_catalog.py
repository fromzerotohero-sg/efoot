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
COACHES_API_URL = f"{BASE_URL}/api/public/coaches"
SOURCE_VERSION = "efhub-managers-v6-linkups-2026"
USER_AGENT = "Mozilla/5.0 (compatible; EFootCoachCatalogImporter/1.0)"
MAX_LINK_UP_PLAYS = 2

# Verified from EFHub getPlayingStyleName in the public managers JS bundle.
# Do not invent names for unknown IDs.
PLAYING_STYLE_ID_MAP = {
    1: "Goal Poacher",
    2: "Dummy Runner",
    3: "Fox In The Box",
    4: "Prolific Winger",
    5: "Classic No. 10",
    6: "Hole Player",
    7: "Box To Box",
    8: "Anchor Man",
    9: "Destroyer",
    10: "Extra Frontman",
    11: "Offensive Wingback",
    12: "Defensive Full-back",
    13: "Deep-Lying Forward",
    14: "Creative Playmaker",
    15: "Build Up",
    16: "Offensive Goalkeeper",
    17: "Defensive Goalkeeper",
    18: "Roaming Flank",
    19: "Cross Specialist",
    20: "Orchestrator",
    21: "Full-back Finisher",
    22: "Target Man",
}

# Verified from EFHub manager-detail position map:
# {0:"GK",1:"CB",2:"LB",3:"RB",4:"DMF",5:"CMF",6:"LMF",7:"RMF",8:"AMF",9:"LWF",10:"RWF",11:"SS",12:"CF"}
POSITION_ID_MAP = {
    0: "GK",
    1: "CB",
    2: "LB",
    3: "RB",
    4: "DMF",
    5: "CMF",
    6: "LMF",
    7: "RMF",
    8: "AMF",
    9: "LWF",
    10: "RWF",
    11: "SS",
    12: "CF",
}

PLAYSTYLE_KEY_MAP = {
    "PossessionGame": "possesso_palla",
    "QuickCounter": "contropiede_veloce",
    "LongBallCounter": "contrattacco",
    "OutWide": "vie_laterali",
    "LongBall": "passaggio_lungo",
    "OverLoad": "pressing_totale",
}

MANAGER_ABILITY_STAT_MAP = {
    0: ("offensiveAwareness", "Offensive Awareness"),
    1: ("ballControl", "Ball Control"),
    2: ("tightPossession", "Tight Possession"),
    3: ("dribbling", "Dribbling"),
    4: ("lowPass", "Low Pass"),
    5: ("loftedPass", "Lofted Pass"),
    6: ("finishing", "Finishing"),
    7: ("setPieceTaking", "Place Kicking"),
    8: ("curl", "Curl"),
    9: ("heading", "Header"),
    10: ("defensiveAwareness", "Defensive Awareness"),
    11: ("ballWinning", "Defensive Engagement"),
    12: ("trackingBack", "Tackling"),
    13: ("aggression", "Aggression"),
    14: ("kickingPower", "Kicking Power"),
    15: ("speed", "Speed"),
    16: ("acceleration", "Acceleration"),
    17: ("balance", "Balance"),
    18: ("physicalContact", "Physical Contact"),
    19: ("jump", "Jump"),
    20: ("gkAwareness", "GK Awareness"),
    21: ("gkCatching", "GK Catching"),
    22: ("gkClearing", "GK Parrying"),
    23: ("gkReflexes", "GK Reflexes"),
    24: ("gkReach", "GK Reach"),
    25: ("stamina", "Stamina"),
}


def env_or_arg(value, env_name):
    return value or os.environ.get(env_name)


def fetch_json(url):
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Referer": f"{BASE_URL}/managers",
    })
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def playing_style_name(style_id):
    if style_id in (None, "", 0, "0"):
        return None
    try:
        style_id = int(style_id)
    except (TypeError, ValueError):
        return None
    name = PLAYING_STYLE_ID_MAP.get(style_id)
    return name or None


def position_label(position_ids):
    labels = []
    seen = set()
    for raw_id in position_ids or []:
        try:
            position_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        label = POSITION_ID_MAP.get(position_id)
        if not label or label in seen:
            continue
        seen.add(label)
        labels.append(label)
    return "/".join(labels) if labels else None


def normalize_link_side(playing_style, position):
    if not playing_style and not position:
        return None
    return {
        "playing_style": playing_style,
        "position": position,
    }


def normalize_efhub_linkup(raw):
    if not raw or not isinstance(raw, dict):
        return None

    name = str(raw.get("name") or "").strip() or None
    focal_point = normalize_link_side(
        playing_style_name(raw.get("centerPiece")),
        position_label(raw.get("centerPiecePositions")),
    )
    key_man = normalize_link_side(
        playing_style_name(raw.get("keyMan")),
        position_label(raw.get("keyManPositions")),
    )
    if not name and not focal_point and not key_man:
        return None

    return {
        "name": name or "Link-up Play",
        "description": None,
        "focal_point": focal_point,
        "key_man": key_man,
    }


def extract_link_up_plays(coach_details):
    plays = []
    source = coach_details or {}
    for key in ("linkup", "linkup2"):
        play = normalize_efhub_linkup(source.get(key))
        if not play:
            continue
        plays.append(play)
        if len(plays) >= MAX_LINK_UP_PLAYS:
            break
    return plays


def fetch_coach_details_index(needed_ids, sleep=0.15):
    needed = {str(item) for item in needed_ids}
    index = {}
    page = 1
    total_pages = 1

    while needed - set(index):
        url = COACHES_API_URL if page == 1 else f"{COACHES_API_URL}?page={page}"
        payload = fetch_json(url)
        coaches = payload.get("coaches") or []
        total_pages = int(payload.get("totalPages") or page)
        for coach in coaches:
            coach_id = str(coach.get("id") or "")
            if coach_id in needed:
                index[coach_id] = coach
        if page >= total_pages or not coaches:
            break
        page += 1
        time.sleep(sleep)

    missing = sorted(needed - set(index))
    if missing:
        print(f"warning: {len(missing)} managers missing from /api/public/coaches")
    return index


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


def normalize_playstyles(skills):
    return {
        target_key: int(skills[source_key])
        for source_key, target_key in PLAYSTYLE_KEY_MAP.items()
        if source_key in skills and skills[source_key] is not None
    }


def normalize_boosters(boost_ids):
    boosters = []
    for slot_index, boost_id in enumerate(boost_ids or [], start=1):
        if boost_id == -1:
            continue

        ability = MANAGER_ABILITY_STAT_MAP.get(boost_id)
        if not ability:
            boosters.append({
                "source_boost_id": boost_id,
                "slot_index": slot_index,
                "stat_name": f"Unknown manager ability {boost_id}",
                "bonus": None,
                "source": "efhub",
            })
            continue

        stat_key, stat_name = ability
        boosters.append({
            "source_boost_id": boost_id,
            "slot_index": slot_index,
            "stat_name": stat_name,
            "bonus": 1,
            "stats": {stat_key: 1},
            "source": "efhub-manager-ability",
            "metadata": {
                "ability_id": boost_id,
            },
        })
    return boosters


def make_record(manager, synced_at, coach_details=None):
    source_coach_id = str(manager["id"])
    image_url = f"https://efimg.com/efootballhub22/images/coach_cards/{source_coach_id}.png"
    playing_styles = normalize_playstyles(manager.get("skills") or {})
    stat_boosters = normalize_boosters(manager.get("boosts") or [])
    link_up_plays = extract_link_up_plays(coach_details)
    connection = link_up_plays[0] if link_up_plays else None

    coach_payload = {
        "coach_name": manager.get("name"),
        "category": "EFHub Manager",
        "pack_type": "Special",
        "playing_style_competence": playing_styles,
        "training_affinity_description": None,
        "stat_boosters": stat_boosters,
        "link_up_plays": link_up_plays,
        "connection": connection,
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
        "connection": connection,
        "photo_slots": {
            "catalog_card": image_url,
        },
        "coach_payload": coach_payload,
        "metadata": {
            "raw_skills": manager.get("skills") or {},
            "raw_boost_ids": manager.get("boosts") or [],
            "raw_linkup": (coach_details or {}).get("linkup"),
            "raw_linkup2": (coach_details or {}).get("linkup2"),
            "source_note": (
                "EFHub manager list comes from /data/managers.json. "
                "Link-up Plays come from /api/public/coaches (linkup, linkup2)."
            ),
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
    synced_at = datetime.now(timezone.utc).isoformat()
    coach_details = fetch_coach_details_index(manager["id"] for manager in managers)
    records = [
        make_record(manager, synced_at, coach_details.get(str(manager["id"])))
        for manager in managers
    ]
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
