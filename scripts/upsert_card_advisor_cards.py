import argparse
from datetime import datetime, timezone
import json
import os
import time
import urllib.parse
import urllib.request


def env_or_arg(value, env_name):
    return value or os.environ.get(env_name)


def load_payload(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


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
    with urllib.request.urlopen(request, timeout=120) as response:
        text = response.read().decode("utf-8", "replace")
        return response.status, json.loads(text) if text else None


def patch_json(url, service_key, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        text = response.read().decode("utf-8", "replace")
        return response.status, text


def chunks(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def deactivate_current(supabase_url, service_key):
    for table in ("card_advisor_cards", "card_advisor_releases"):
        url = urllib.parse.urljoin(
            supabase_url.rstrip("/") + "/",
            f"rest/v1/{table}?source=eq.efhub&is_active=eq.true",
        )
        patch_json(url, service_key, {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()})


def release_slug(release_name):
    import re
    return re.sub(r"[^a-z0-9]+", "-", str(release_name or "").lower()).strip("-")


def category_from_release_name(name):
    lower = str(name or "").lower()
    if "standout" in lower:
        return "Standout"
    if "highlight" in lower:
        return "Highlight"
    if "selection" in lower:
        return "Selection"
    if "encore" in lower:
        return "Encore"
    if "naruto" in lower or "collaboration" in lower:
        return "Collaboration"
    return "Special"


def upsert_release(supabase_url, service_key, release):
    release_name = release["release"]
    payload = {
        "source": "efhub",
        "source_release_id": release_slug(release_name),
        "source_url": "https://efhub.com/it",
        "release_name": release_name,
        "release_date": None,
        "category": category_from_release_name(release_name),
        "status": "active",
        "is_active": True,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    url = urllib.parse.urljoin(
        supabase_url.rstrip("/") + "/",
        "rest/v1/card_advisor_releases?on_conflict=source,source_release_id",
    )
    status, data = post_json(url, service_key, payload, prefer="resolution=merge-duplicates,return=representation")
    if status not in (200, 201):
        raise RuntimeError(f"release upsert failed status={status}")
    return data[0]


def normalize_card_record(release_id, card_entry):
    record = dict(card_entry.get("record") or {})
    allowed = {
        "source",
        "source_player_id",
        "source_url",
        "player_name",
        "position",
        "overall_display",
        "category",
        "image_url",
        "card_type",
        "playing_style",
        "player_skills",
        "ai_playstyles",
        "base_stats",
        "max_stats",
        "position_compatibility",
        "height",
        "weight",
        "age",
        "foot",
        "data_quality",
        "completeness_score",
        "enrichment_status",
        "error_message",
        "source_payload",
    }
    normalized = {key: value for key, value in record.items() if key in allowed}
    normalized["release_id"] = release_id
    normalized["source"] = normalized.get("source") or "efhub"
    normalized.setdefault("player_skills", [])
    normalized.setdefault("ai_playstyles", [])
    normalized.setdefault("base_stats", {})
    normalized.setdefault("max_stats", {})
    normalized.setdefault("position_compatibility", {})
    normalized.setdefault("source_payload", {})
    normalized.setdefault("data_quality", "partial")
    normalized.setdefault("completeness_score", 0)
    normalized.setdefault("enrichment_status", "pending")
    normalized["is_active"] = True
    normalized["fetched_at"] = datetime.now(timezone.utc).isoformat()
    normalized["last_synced_at"] = datetime.now(timezone.utc).isoformat()
    normalized["updated_at"] = datetime.now(timezone.utc).isoformat()
    return normalized


def upsert_cards(supabase_url, service_key, records, chunk_size=25, sleep=0.2):
    if not records:
        return 0
    table_url = urllib.parse.urljoin(
        supabase_url.rstrip("/") + "/",
        "rest/v1/card_advisor_cards?on_conflict=source,source_player_id,release_id",
    )
    total = 0
    for batch in chunks(records, chunk_size):
        status, text = post_json(
            table_url,
            service_key,
            batch,
            prefer="resolution=merge-duplicates,return=minimal",
        )
        total += len(batch)
        print(f"upserted cards {total}/{len(records)} status={status}")
        if text:
            print(text)
        if sleep:
            time.sleep(sleep)
    return total


def main():
    parser = argparse.ArgumentParser(description="Upsert Card Advisor release/card records into Supabase.")
    parser.add_argument("--input-json", required=True)
    parser.add_argument("--supabase-url")
    parser.add_argument("--service-role-key")
    parser.add_argument("--chunk-size", type=int, default=25)
    parser.add_argument("--sleep", type=float, default=0.2)
    parser.add_argument("--replace-active", action="store_true")
    args = parser.parse_args()

    supabase_url = env_or_arg(args.supabase_url, "NEXT_PUBLIC_SUPABASE_URL")
    service_key = env_or_arg(args.service_role_key, "SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or --supabase-url/--service-role-key")

    payload = load_payload(args.input_json)
    if args.replace_active:
        deactivate_current(supabase_url, service_key)

    total_cards = 0
    for release in payload.get("releases", []):
        release_row = upsert_release(supabase_url, service_key, release)
        records = [
            normalize_card_record(release_row["id"], card_entry)
            for card_entry in release.get("cards", [])
            if card_entry.get("record")
        ]
        print(f"release: {release['release']} cards={len(records)}")
        total_cards += upsert_cards(supabase_url, service_key, records, args.chunk_size, args.sleep)

    print(json.dumps({"releases": len(payload.get("releases", [])), "cards": total_cards}, ensure_ascii=False))


if __name__ == "__main__":
    main()
