import argparse
from datetime import datetime, timezone
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request


EFHUB_HOME_URL = "https://efhub.com/it"
HUB_LEGACY_BASE_URL = "https://www.efootballhub.net"
USER_AGENT = "Mozilla/5.0 (compatible; FromZeroToHeroCardAdvisorSync/1.0)"

POSITION_MAP = {
    "GK": "PT",
    "CB": "DC",
    "LB": "TS",
    "RB": "TD",
    "DMF": "MED",
    "CMF": "CC",
    "LMF": "CLS",
    "RMF": "CLD",
    "AMF": "TRQ",
    "LWF": "ESA",
    "RWF": "EDA",
    "SS": "SP",
    "CF": "P",
}

STAT_ALIASES = {
    "Place Kicking": "Set Piece Taking",
    "Goalkeeping": "GK Awareness",
    "Gk Catching": "GK Catching",
    "Jump": "Jumping",
    "Weak Foot Acc": "Weak Foot Accuracy",
}


def env_or_arg(value, env_name):
    return value or os.environ.get(env_name)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def fetch(url, timeout=30):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace")


def post_json(url, service_key, payload, prefer=None, method="POST"):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    request = urllib.request.Request(url, data=body, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=120) as response:
        text = response.read().decode("utf-8", "replace")
        return response.status, json.loads(text) if text else None


def patch_json(url, service_key, payload):
    return post_json(url, service_key, payload, method="PATCH")


def clean(value):
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).replace("\xa0", " ").strip()


def decode_html(value=""):
    return html.unescape(str(value or "")).replace("\xa0", " ")


def slugify(value=""):
    return re.sub(r"[^a-z0-9]+", "-", str(value).lower()).strip("-")


def category_from_release_name(name=""):
    lower = name.lower()
    if "naruto" in lower or "collaboration" in lower:
        return "Collaboration"
    if "standout" in lower:
        return "Standout"
    if "highlight" in lower:
        return "Highlight"
    if "selection" in lower:
        return "Selection"
    if "encore" in lower:
        return "Encore"
    return "Special"


def int_or_none(value):
    match = re.search(r"\d+", str(value or ""))
    return int(match.group(0)) if match else None


def text_by_id(markup, element_id):
    match = re.search(rf'id="{re.escape(element_id)}"[^>]*>(.*?)</', markup, re.S)
    return clean(match.group(1)) if match else None


def parse_release_cards(section_markup, release_name):
    cards = []
    pattern = re.compile(
        r'<a\b[^>]*href="/players/(\d+)"[\s\S]*?'
        r'<img\b[^>]*src="([^"]+)"[^>]*alt="([^"]+)"[\s\S]*?'
        r'<span class="text-white"[^>]*>(\d+)</span><span class="text-white"[^>]*>([^<]+)</span>',
        re.S,
    )
    for match in pattern.finditer(section_markup):
        source_player_id = match.group(1)
        image_url = decode_html(match.group(2)).strip()
        player_name = decode_html(match.group(3)).strip()
        overall = int_or_none(match.group(4))
        position = decode_html(match.group(5)).strip()
        if not source_player_id or not player_name or not position:
            continue
        cards.append({
            "source": "efhub",
            "source_player_id": source_player_id,
            "source_url": f"https://efhub.com/players/{source_player_id}",
            "player_name": player_name,
            "position": position,
            "overall_display": overall,
            "category": category_from_release_name(release_name),
            "image_url": image_url,
            "source_payload": {
                "release_name": release_name,
                "image_url": image_url,
                "overall_display": overall,
            },
        })
    return cards


def parse_releases(markup):
    releases = []
    for section_match in re.finditer(r"<section>([\s\S]*?)</section>", markup):
        section_markup = section_match.group(1)
        heading_match = re.search(r"<h2\b[^>]*>([\s\S]*?)</h2>", section_markup)
        if not heading_match:
            continue
        release_name = decode_html(re.sub(r"<[^>]+>", "", heading_match.group(1))).strip()
        if not release_name:
            continue
        cards = parse_release_cards(section_markup, release_name)
        if not cards:
            continue
        releases.append({
            "source": "efhub",
            "source_release_id": slugify(release_name),
            "source_url": EFHUB_HOME_URL,
            "release_name": release_name,
            "release_date": (re.search(r"\d{1,2}\s+[A-Za-z]+\s+'?\d{2}", release_name) or [None])[0],
            "category": category_from_release_name(release_name),
            "status": "active",
            "cards": cards,
        })
    return releases


def parse_visible_labels(block):
    values = []
    for attrs, value in re.findall(r'<label class="lbl-block"(.*?)>(.*?)</label>', block, re.S):
        if "hidden" in attrs:
            continue
        text = clean(value)
        if text:
            values.append(text)
    return values


def parse_abilities(markup):
    abilities = {}
    for row in re.findall(r'<tr class="(?:ability-field|other-field)">(.*?)</tr>', markup, re.S):
        label_match = re.search(r"<th>(.*?)</th>", row, re.S)
        value_matches = re.findall(r'<td[^>]*class="[^"]*(?:ability|other-ability)[^"]*"[^>]*>(.*?)</td>', row, re.S)
        if not label_match or not value_matches:
            continue
        label = clean(label_match.group(1))
        value = clean(value_matches[-1])
        if label and value:
            abilities[STAT_ALIASES.get(label, label)] = int_or_none(value) if int_or_none(value) is not None else value
    return abilities


def parse_skills(markup):
    block_match = re.search(
        r'<div class="player-stats-container player-skill-container">(.*?)<div class="player-category-header">Com Skills</div>',
        markup,
        re.S,
    )
    return parse_visible_labels(block_match.group(1)) if block_match else []


def parse_com_skills(markup):
    block_match = re.search(
        r'<div class="player-category-header">Com Skills</div>(.*?)<div class="player-stats-container" id="appearance-chart-container">',
        markup,
        re.S,
    )
    return parse_visible_labels(block_match.group(1)) if block_match else []


def decode_flight_markup(markup=""):
    return (
        str(markup or "")
        .replace('\\"', '"')
        .replace("\\u0026", "&")
        .replace("\\u003c", "<")
        .replace("\\u003e", ">")
    )


def extract_json_object(markup, key):
    marker = f'"{key}":{{'
    start = markup.find(marker)
    if start < 0:
        return None
    object_start = start + marker.find("{")
    depth = 0
    in_string = False
    escaped = False
    for index in range(object_start, len(markup)):
        char = markup[index]
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(markup[object_start:index + 1])
                except Exception:
                    return None
    return None


def extract_json_array(markup, key):
    marker = f'"{key}":['
    start = markup.find(marker)
    if start < 0:
        return None
    array_start = start + marker.find("[")
    depth = 0
    in_string = False
    escaped = False
    for index in range(array_start, len(markup)):
        char = markup[index]
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(markup[array_start:index + 1])
                except Exception:
                    return None
    return None


def extract_string_value(markup, key):
    match = re.search(rf'"{re.escape(key)}":"([^"]*)"', markup)
    return match.group(1) if match else None


def extract_int_value(markup, key):
    match = re.search(rf'"{re.escape(key)}":(\d+)', markup)
    return int(match.group(1)) if match else None


SKILL_LABELS = {
    "pinpointCrossing": "Pinpoint Crossing",
    "longThrow": "Long Throw",
    "manMarking": "Man Marking",
    "interception": "Interception",
    "acrobaticClear": "Acrobatic Clearance",
    "fightingSpirit": "Fighting Spirit",
    "blocker": "Blocker",
    "slidingTackle": "Sliding Tackle",
    "edgedCrossing": "Edged Crossing",
    "accelerationBurst": "Acceleration Burst",
    "throughPassing": "Through Passing",
    "oneTouchPass": "One-touch Pass",
    "firstTimeShot": "First-time Shot",
    "heading": "Heading",
    "aerialSuperiority": "Aerial Superiority",
    "doubleTouch": "Double Touch",
    "soleControl": "Sole Control",
    "longRangeShooting": "Long Range Shooting",
    "longRangeDrive": "Long-Range Curler",
}


def humanize_key(value):
    if not value:
        return value
    if value in SKILL_LABELS:
        return SKILL_LABELS[value]
    return re.sub(r"(?<!^)([A-Z])", r" \1", str(value)).replace("_", " ").strip().title()


def parse_foot(markup):
    match = re.search(r'class="strong-foot-image" src=([^ >]+)', markup)
    if not match:
        return None
    src = match.group(1).lower()
    if "left" in src:
        return "Left foot"
    if "right" in src:
        return "Right foot"
    return None


def parse_detail(card):
    detail_url = card.get("source_url") or f"https://efhub.com/players/{card['source_player_id']}"
    markup = decode_flight_markup(fetch(detail_url))
    data_start = markup.find('"baseStats":')
    data_markup = markup[data_start:] if data_start >= 0 else markup
    base_stats = extract_json_object(data_markup, "baseStats") or {}
    additional_positions = extract_json_array(data_markup, "additionalPositions") or []
    raw_position = extract_string_value(data_markup, "position")
    position = POSITION_MAP.get(raw_position, raw_position) or card.get("position")
    player_skills = [humanize_key(item) for item in (extract_json_array(data_markup, "skills") or [])]
    ai_playstyles = [humanize_key(item) for item in (extract_json_array(data_markup, "comSkills") or [])]
    playing_style = extract_string_value(data_markup, "playingStyle")
    record = {
        "source_url": card.get("source_url"),
        "card_type": card.get("category") or "Card Advisor",
        "playing_style": playing_style,
        "player_skills": player_skills,
        "ai_playstyles": ai_playstyles,
        "base_stats": {k: v for k, v in base_stats.items() if k not in {"Form"}},
        "max_stats": {},
        "position": position,
        "position_compatibility": {
            POSITION_MAP.get(item.get("position"), item.get("position")): item
            for item in additional_positions
            if isinstance(item, dict) and item.get("position")
        },
        "height": extract_int_value(data_markup, "height"),
        "weight": extract_int_value(data_markup, "weight"),
        "age": extract_int_value(data_markup, "age"),
        "foot": extract_string_value(data_markup, "preferredFoot"),
        "source_payload": {
            **(card.get("source_payload") or {}),
            "detail_url": detail_url,
            "raw_position": raw_position,
            "condition": extract_int_value(data_markup, "condition"),
            "overall_rating": extract_int_value(data_markup, "overallRating"),
            "weak_foot_accuracy": extract_int_value(data_markup, "weakFootAccuracy"),
            "weak_foot_usage": extract_int_value(data_markup, "weakFootUsage"),
        },
    }
    checks = [
        record.get("playing_style"),
        record.get("player_skills"),
        record.get("base_stats"),
        record.get("source_url"),
        record.get("position"),
    ]
    score = round(sum(1 for item in checks if item) / len(checks) * 100)
    record["completeness_score"] = score
    record["data_quality"] = "complete" if score >= 80 else "partial"
    record["enrichment_status"] = "complete" if score >= 80 else "partial"
    return record


def deactivate_current(supabase_url, service_key):
    for table in ("card_advisor_cards", "card_advisor_releases"):
        url = urllib.parse.urljoin(supabase_url.rstrip("/") + "/", f"rest/v1/{table}?source=eq.efhub&is_active=eq.true")
        patch_json(url, service_key, {"is_active": False, "updated_at": now_iso()})


def upsert_release(supabase_url, service_key, release):
    payload = {
        "source": release["source"],
        "source_release_id": release["source_release_id"],
        "source_url": release["source_url"],
        "release_name": release["release_name"],
        "release_date": release["release_date"],
        "category": release["category"],
        "status": release["status"],
        "is_active": True,
        "fetched_at": now_iso(),
        "last_synced_at": now_iso(),
        "updated_at": now_iso(),
    }
    url = urllib.parse.urljoin(supabase_url.rstrip("/") + "/", "rest/v1/card_advisor_releases?on_conflict=source,source_release_id")
    status, data = post_json(url, service_key, payload, prefer="resolution=merge-duplicates,return=representation")
    if status not in (200, 201):
        raise RuntimeError(f"release upsert failed status={status}")
    return data[0]


def upsert_card(supabase_url, service_key, release_id, card, sleep=0.0):
    payload = {
        **card,
        "release_id": release_id,
        "is_active": True,
        "fetched_at": now_iso(),
        "last_synced_at": now_iso(),
        "updated_at": now_iso(),
        "data_quality": "partial",
        "completeness_score": 0,
        "enrichment_status": "pending",
        "error_message": None,
    }
    try:
        detail = parse_detail(card)
        payload.update(detail)
    except Exception as error:
        payload.update({
            "enrichment_status": "failed",
            "error_message": str(error)[:1000],
            "data_quality": "partial",
            "completeness_score": 0,
        })
    url = urllib.parse.urljoin(
        supabase_url.rstrip("/") + "/",
        "rest/v1/card_advisor_cards?on_conflict=source,source_player_id,release_id",
    )
    post_json(url, service_key, payload, prefer="resolution=merge-duplicates,return=minimal")
    if sleep:
        time.sleep(sleep)
    return payload


def main():
    parser = argparse.ArgumentParser(description="Sync weekly Card Advisor packs into dedicated Supabase tables.")
    parser.add_argument("--supabase-url")
    parser.add_argument("--service-role-key")
    parser.add_argument("--home-url", default=EFHUB_HOME_URL)
    parser.add_argument("--sleep", type=float, default=0.35)
    parser.add_argument("--limit-releases", type=int, default=0, help="0 = all releases found")
    parser.add_argument("--replace-active", action="store_true", help="Deactivate previous active efhub releases/cards before upserting current snapshot.")
    parser.add_argument("--export-only", action="store_true", help="Only scrape/enrich and write the JSON report. Does not require Supabase credentials.")
    parser.add_argument("--output-json", help="Optional local sync report path.")
    parser.add_argument(
        "--release-match",
        help="Import only releases whose name contains this substring (case-insensitive).",
    )
    args = parser.parse_args()

    supabase_url = env_or_arg(args.supabase_url, "NEXT_PUBLIC_SUPABASE_URL")
    service_key = env_or_arg(args.service_role_key, "SUPABASE_SERVICE_ROLE_KEY")
    if not args.export_only and (not supabase_url or not service_key):
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY or --supabase-url/--service-role-key")

    if args.replace_active and not args.export_only:
        deactivate_current(supabase_url, service_key)

    releases = parse_releases(fetch(args.home_url))
    if args.release_match:
        needle = args.release_match.strip().lower()
        releases = [release for release in releases if needle in release["release_name"].lower()]
        if not releases:
            raise SystemExit(f"No release matched --release-match {args.release_match!r}")
    if args.limit_releases and args.limit_releases > 0:
        releases = releases[:args.limit_releases]

    report = {"releases": [], "cards": 0, "complete": 0, "partial": 0, "failed": 0}
    for release in releases:
        row = {"id": None} if args.export_only else upsert_release(supabase_url, service_key, release)
        release_report = {"release": release["release_name"], "cards": []}
        for card in release["cards"]:
            if args.export_only:
                result = {**card}
                try:
                    result.update(parse_detail(card))
                except Exception as error:
                    result.update({
                        "enrichment_status": "failed",
                        "error_message": str(error)[:1000],
                        "data_quality": "partial",
                        "completeness_score": 0,
                    })
                if args.sleep:
                    time.sleep(args.sleep)
            else:
                result = upsert_card(supabase_url, service_key, row["id"], card, sleep=args.sleep)
            report["cards"] += 1
            status = result.get("enrichment_status")
            report[status if status in report else "partial"] += 1
            release_report["cards"].append({
                "source_player_id": card["source_player_id"],
                "player_name": card["player_name"],
                "enrichment_status": status,
                "completeness_score": result.get("completeness_score"),
                "error": result.get("error_message"),
                "record": result,
            })
            print(f"{status.upper():7s} {card['source_player_id']} {card['player_name']}")
        report["releases"].append(release_report)

    if args.output_json:
        with open(args.output_json, "w", encoding="utf-8") as file:
            json.dump(report, file, ensure_ascii=False, indent=2)
    print(json.dumps({k: v for k, v in report.items() if k != "releases"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
