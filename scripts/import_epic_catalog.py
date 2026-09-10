import argparse
import hashlib
import html
import json
import random
import re
import time
from pathlib import Path
import urllib.parse
import urllib.request


BASE_URL = "https://pesdb.net/efootball/"
USER_AGENT = "Mozilla/5.0 (compatible; eFootballAICoachCatalogImporter/1.0)"
CACHE_DIR = Path("scripts/.cache/pesdb")
CACHE_DIR.mkdir(parents=True, exist_ok=True)
USE_CACHE = True
# Fallback only when the page does not expose Version / eFootball year.
DEFAULT_SOURCE_VERSION = "eFootball 2027 v6.0.0"

EPIC_LIST_URLS = [
    "https://pesdb.net/efootball/?all=1&featured=epic-breakthrough-pass-b-feb-26-26",
    "https://pesdb.net/efootball/?all=1&featured=epic-italian-league-midfielders-mar-16-26",
    "https://pesdb.net/efootball/?all=1&featured=epic-english-league-guardians-mar-9-26",
    "https://pesdb.net/efootball/?all=1&featured=epic-italian-league-attackers-mar-5-26",
    "https://pesdb.net/efootball/?all=1&featured=epic-national-legends-nov-20-25",
    "https://pesdb.net/efootball/?all=1&featured=pack-national-legends-nov-20-25",
    "https://pesdb.net/efootball/?all=1&featured=pack-gabriel-batistuta-feb-19-26",
    "https://pesdb.net/efootball/?all=1&featured=pack-leo-messi-aug-14-25",
    "https://pesdb.net/efootball/?all=1&featured=pack-lamine-yamal-aug-14-25",
    "https://pesdb.net/efootball/?all=1&featured=pack-national-legends-nov-20-25",
    "https://pesdb.net/efootball/?all=1&featured=epic-english-league-guardians-mar-9-26&page=2",
    "https://pesdb.net/efootball/?all=1&featured=epic-italian-league-attackers-mar-5-26&page=2",
]

STAT_LABELS = [
    "Overall Rating",
    "Offensive Awareness",
    "Ball Control",
    "Dribbling",
    "Tight Possession",
    "Low Pass",
    "Lofted Pass",
    "Finishing",
    "Heading",
    "Set Piece Taking",
    "Curl",
    "Defensive Awareness",
    "Tackling",
    "Aggression",
    "Defensive Engagement",
    "GK Awareness",
    "GK Catching",
    "GK Parrying",
    "GK Reflexes",
    "GK Reach",
    "Speed",
    "Acceleration",
    "Kicking Power",
    "Jumping",
    "Physical Contact",
    "Balance",
    "Stamina",
    "Weak Foot Usage",
    "Weak Foot Accuracy",
    "Injury Resistance",
]

META_LABELS = [
    "Player Name",
    "Team Name",
    "League",
    "Nationality",
    "Region",
    "Height",
    "Weight",
    "Age",
    "Foot",
    "Maximum Level",
    "Rating",
]

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


def cache_path(url):
    return CACHE_DIR / f"{hashlib.sha256(url.encode('utf-8')).hexdigest()}.html"


def fetch(url, use_cache=True):
    path = cache_path(url)
    if use_cache and path.exists():
        return path.read_text(encoding="utf-8")

    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        text = response.read().decode("utf-8", "replace")

    if use_cache:
        path.write_text(text, encoding="utf-8")
    return text


def fetch_with_retry(url, retries=6, base_sleep=4.0, use_cache=None):
    if use_cache is None:
        use_cache = USE_CACHE
    for attempt in range(retries + 1):
        try:
            return fetch(url, use_cache=use_cache)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt >= retries:
                raise
            retry_after = error.headers.get("Retry-After")
            wait = int(retry_after) if retry_after and retry_after.isdigit() else base_sleep * (attempt + 1)
            wait += random.uniform(0.5, 2.0)
            print(f"RATE_LIMIT wait={wait:.1f}s url={url}")
            time.sleep(wait)
        except Exception:
            if attempt >= retries:
                raise
            wait = 1.0 + random.uniform(0.5, 2.0)
            print(f"RETRY wait={wait:.1f}s url={url}")
            time.sleep(wait)


def clean(value):
    text = re.sub(r"<[^>]+>", "", value or "")
    return html.unescape(text).replace("\xa0", " ").strip()


def int_or_none(value):
    match = re.search(r"(\d+)\s*$", str(value or "").strip())
    return int(match.group(1)) if match else None


def stat_value(value):
    parsed = int_or_none(value)
    return parsed if parsed is not None else str(value or "").strip()


def get_dd(markup, label):
    pattern = r"<dt>\s*" + re.escape(label) + r"\s*</dt>\s*<dd>(.*?)</dd>"
    match = re.search(pattern, markup, re.S | re.I)
    return clean(match.group(1)) if match else None


def get_field(markup, label):
    pattern = r"<tr><th>" + re.escape(label) + r":</th><td><span[^>]*>(.*?)</span></td></tr>"
    match = re.search(pattern, markup, re.S)
    if match:
        return clean(match.group(1))
    aliases = {
        "Team Name": ("Team Name", "Club"),
        "Foot": ("Foot", "Stronger Foot"),
        "Maximum Level": ("Maximum Level", "Max Level"),
    }
    for candidate in aliases.get(label, (label,)):
        value = get_dd(markup, candidate)
        if value:
            return value
    return None


def extract_progression_data(markup):
    match = re.search(
        r'<script[^>]+id="player-progression-data"[^>]*>([\s\S]*?)</script>',
        markup or "",
        re.I,
    )
    if not match:
        return {}
    try:
        payload = json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


STAT_SNAKE_TO_LABEL = {
    "offensive_awareness": "Offensive Awareness",
    "ball_control": "Ball Control",
    "dribbling": "Dribbling",
    "tight_possession": "Tight Possession",
    "low_pass": "Low Pass",
    "lofted_pass": "Lofted Pass",
    "finishing": "Finishing",
    "heading": "Heading",
    "set_piece_taking": "Set Piece Taking",
    "curl": "Curl",
    "defensive_awareness": "Defensive Awareness",
    "tackling": "Tackling",
    "aggression": "Aggression",
    "defensive_engagement": "Defensive Engagement",
    "gk_awareness": "GK Awareness",
    "gk_catching": "GK Catching",
    "gk_parrying": "GK Parrying",
    "gk_reflexes": "GK Reflexes",
    "gk_reach": "GK Reach",
    "speed": "Speed",
    "acceleration": "Acceleration",
    "kicking_power": "Kicking Power",
    "jumping": "Jumping",
    "physical_contact": "Physical Contact",
    "balance": "Balance",
    "stamina": "Stamina",
}


def parse_position(markup):
    pattern = r'<tr><th>Position:</th><td><span[^>]*>.*?<div title="([^"]+)">([^<]+)</div>.*?</span></td></tr>'
    match = re.search(pattern, markup, re.S)
    if match:
        raw_code = clean(match.group(2))
        raw_label = clean(match.group(1))
        return raw_code, POSITION_MAP.get(raw_code, raw_code), raw_label
    raw_code = get_dd(markup, "Primary Position")
    if not raw_code:
        hero = re.search(
            r'class="position player-hero-position"[^>]*>[\s\S]*?>([A-Z]{2,3})</a>',
            markup or "",
            re.I,
        )
        raw_code = clean(hero.group(1)) if hero else None
    if not raw_code:
        return None, None, None
    raw_code = raw_code.upper()
    return raw_code, POSITION_MAP.get(raw_code, raw_code), raw_code


def parse_stats(markup):
    result = {}
    for label in STAT_LABELS:
        pattern = r"<tr><th>" + re.escape(label) + r":</th><td><span[^>]*>(.*?)</span></td></tr>"
        match = re.search(pattern, markup, re.S)
        if match:
            result[label] = stat_value(clean(match.group(1)))
    if result:
        return result
    progression = extract_progression_data(markup)
    base_stats = progression.get("baseStats") if isinstance(progression.get("baseStats"), dict) else {}
    for snake, label in STAT_SNAKE_TO_LABEL.items():
        if snake in base_stats:
            result[label] = stat_value(base_stats.get(snake))
    if progression.get("baseOverall") is not None:
        result["Overall Rating"] = stat_value(progression.get("baseOverall"))
    if result:
        return result
    for match in re.finditer(
        r'<div class="ability-row">\s*<span>(.*?)</span>\s*<strong[^>]*>(.*?)</strong>',
        markup or "",
        re.S,
    ):
        label = clean(match.group(1))
        if label:
            result[label] = stat_value(clean(match.group(2)))
    return result


def parse_source_version(markup):
    """
    Read PESDB page version labels when present.
    Example live source: "Version v6.0.0" + "eFootball 2027".
    """
    text = markup or ""
    version_match = re.search(r"Version\s+(v?\d+\.\d+(?:\.\d+)?)", text, re.I)
    version = None
    if version_match:
        version = version_match.group(1).strip()
        if not version.lower().startswith("v"):
            version = f"v{version}"

    year_match = re.search(r"eFootball\s+(20\d{2})", text, re.I)
    year = year_match.group(1) if year_match else None

    if year and version:
        return f"eFootball {year} {version}"
    if version:
        return f"eFootball {version}"
    if year:
        return f"eFootball {year}"
    return DEFAULT_SOURCE_VERSION


def parse_styles(markup):
    """
    Parse PESDB playing_styles table.

    Legacy (single): one cell under Playing Style, e.g. "Hole Player".
    v6 dual: cells like "Att: Hole Player" and "Def: Pass Disruptor".

    Returns:
      primary_style (str|None): attack or sole style WITHOUT phase prefix (catalog legacy column)
      player_skills (list[str])
      ai_playstyles (list[str])
      playing_styles_contract (dict): additive dual/single contract for metadata
    """
    match = re.search(r'<table class="playing_styles">(.*?)</table>', markup, re.S)
    player_skills = []
    ai_playstyles = []
    empty_contract = {
        "format": "single",
        "attack": None,
        "defense": None,
        "primary": None,
    }
    if not match:
        return parse_styles_from_v2_page(markup, empty_contract)

    rows = re.findall(r"<tr><(th|td)>(.*?)</\1></tr>", match.group(1), re.S)
    section = None
    style_cells = []
    for kind, raw_value in rows:
        text = clean(raw_value)
        if not text or text == "-":
            continue
        if kind == "th":
            section = text
            continue
        if section == "Playing Style":
            style_cells.append(text)
        elif section == "Player Skills":
            player_skills.append(text)
        elif section == "AI Playing Styles":
            ai_playstyles.append(text)

    attack = None
    defense = None
    raw_lines = []
    for cell in style_cells:
        raw_lines.append(cell)
        att = re.match(r"(?i)^att\s*:\s*(.+)$", cell)
        defn = re.match(r"(?i)^def\s*:\s*(.+)$", cell)
        if att:
            if attack is None:
                attack = att.group(1).strip() or None
        elif defn:
            if defense is None:
                defense = defn.group(1).strip() or None
        elif attack is None:
            attack = cell

    has_defense = bool(defense)
    contract = {
        "format": "dual" if has_defense else "single",
        "attack": attack,
        "defense": defense if has_defense else None,
        "primary": attack,
        "source_raw": raw_lines,
    }
    return attack, player_skills, ai_playstyles, contract


def _chip_texts(block):
    return [clean(item) for item in re.findall(r"<a[^>]*>(.*?)</a>", block or "", re.S) if clean(item)]


def parse_styles_from_v2_page(markup, empty_contract):
    player_skills = []
    ai_playstyles = []
    attack = None
    defense = None
    raw_lines = []

    att_match = re.search(
        r"Attacking Playing Style</span>\s*<strong>(.*?)</strong>",
        markup or "",
        re.S | re.I,
    )
    if att_match:
        attack = clean(att_match.group(1)) or None
        if attack:
            raw_lines.append(f"Att: {attack}")
    def_match = re.search(
        r"Defensive Playing Style</span>\s*<strong>(.*?)</strong>",
        markup or "",
        re.S | re.I,
    )
    if def_match:
        defense = clean(def_match.group(1)) or None
        if defense:
            raw_lines.append(f"Def: {defense}")

    skills_match = re.search(
        r"Player Skills</h2>\s*<div class=\"skill-chips[^\"]*\">(.*?)</div>",
        markup or "",
        re.S | re.I,
    )
    if skills_match:
        player_skills = _chip_texts(skills_match.group(1))
    ai_match = re.search(
        r"AI Playing Styles</h2>\s*<div class=\"skill-chips[^\"]*\">(.*?)</div>",
        markup or "",
        re.S | re.I,
    )
    if ai_match:
        ai_playstyles = _chip_texts(ai_match.group(1))

    if not attack and not defense and not player_skills and not ai_playstyles:
        return None, [], [], empty_contract

    has_defense = bool(defense)
    contract = {
        "format": "dual" if has_defense else "single",
        "attack": attack,
        "defense": defense if has_defense else None,
        "primary": attack,
        "source_raw": raw_lines,
    }
    return attack, player_skills, ai_playstyles, contract


def parse_card_type(markup):
    match = re.search(r"</div></div></div></div>([^<]+)</td></tr>", markup)
    if match:
        return clean(match.group(1))
    return get_dd(markup, "Card Type")


def parse_position_compatibility(markup):
    positions = {}
    for match in re.finditer(r'<div class="pos2 ([^"]+)" title="([^"]+)"></div>', markup):
        code = match.group(1).upper()
        label = clean(match.group(2))
        positions[POSITION_MAP.get(code, code)] = {"source_code": code, "label": label}
    if positions:
        return positions
    for code, state in re.findall(
        r"position-pitch-zone position-pitch-([a-z]+) (is-(?:full|partial))",
        markup or "",
    ):
        source_code = code.upper()
        positions[POSITION_MAP.get(source_code, source_code)] = {
            "source_code": source_code,
            "label": "Full Familiarity" if state == "is-full" else "Partial Familiarity",
        }
    return positions


def collect_player_ids(list_urls):
    seen = set()
    players = []
    for list_url in list_urls:
        try:
            markup = fetch_with_retry(list_url)
        except Exception as error:
            print(f"WARN list fetch failed: {list_url} ({error})")
            continue
        for match in re.finditer(r'<a href="\./\?id=(\d+)">([^<]+)</a>', markup):
            source_player_id = match.group(1)
            if source_player_id in seen:
                continue
            seen.add(source_player_id)
            players.append(
                {
                    "source_player_id": source_player_id,
                    "list_name": clean(match.group(2)),
                    "list_url": list_url,
                }
            )
        for match in re.finditer(
            r'<a[^>]+href="/efootball/players/[^"]+-(\d+)"[^>]*>([^<]+)</a>',
            markup,
        ):
            source_player_id = match.group(1)
            # Featured/Dream Team cards have long IDs. Short IDs are Authentic/base players.
            if len(source_player_id) < 10:
                continue
            if source_player_id in seen:
                continue
            seen.add(source_player_id)
            players.append(
                {
                    "source_player_id": source_player_id,
                    "list_name": clean(match.group(2)),
                    "list_url": list_url,
                }
            )
        # Pack detail pages wrap the name in <h2>, so the text-node regex above misses them.
        for match in re.finditer(
            r'href="/efootball/players/([^"/]+)-(\d{10,})"',
            markup,
        ):
            source_player_id = match.group(2)
            if source_player_id in seen:
                continue
            seen.add(source_player_id)
            players.append(
                {
                    "source_player_id": source_player_id,
                    "list_name": clean(match.group(1).replace("-", " ")),
                    "list_url": list_url,
                }
            )
    return players


def make_avatar_style(card_type, position, overall):
    palette = {
        "Epic": {"frame": "gold-purple", "accent": "#f5c542"},
        "Big Time": {"frame": "black-gold", "accent": "#f6d365"},
        "Highlight": {"frame": "blue", "accent": "#38bdf8"},
        "Standard": {"frame": "silver", "accent": "#94a3b8"},
    }
    return {
        **palette.get(card_type or "", {"frame": "default", "accent": "#00d4ff"}),
        "position": position,
        "overall_bucket": "90+" if (overall or 0) >= 90 else "80+",
    }


SOURCE_LABEL_BY_URL = {}


def pack_name_from_url(list_url):
    if list_url in SOURCE_LABEL_BY_URL:
        return SOURCE_LABEL_BY_URL[list_url]
    parsed = urllib.parse.urlparse(list_url or "")
    query = urllib.parse.parse_qs(parsed.query)
    featured = (query.get("featured") or ["PESDB Epic"])[0]
    return featured.replace("-", " ").replace("_", " ").strip()


def identity_key(player_name):
    value = re.sub(r"[^0-9A-Za-zÀ-ÖØ-öø-ÿ]+", "-", player_name or "", flags=re.UNICODE)
    return value.strip("-").lower()


def is_catalog_card_type(card_type, allowed_card_types=None):
    if not card_type:
        return False
    normalized = card_type.strip().lower()
    if allowed_card_types:
        return normalized in {item.strip().lower() for item in allowed_card_types}
    return normalized != "standard"


def completeness(record):
    checks = [
        record.get("player_name"),
        record.get("position"),
        record.get("card_type"),
        record.get("overall_level_1"),
        record.get("max_level"),
        record.get("base_stats"),
        record.get("playing_style"),
        record.get("player_skills"),
        record.get("ai_playstyles") is not None,
        record.get("source_url"),
        record.get("source_card_front_url"),
    ]
    score = round(sum(1 for item in checks if item) / len(checks) * 100)
    quality = "complete" if score >= 85 else "partial"
    return score, quality


def parse_player(source_player_id, list_url):
    source_url = f"{BASE_URL}?id={source_player_id}"
    max_url = f"{source_url}&mode=max_level"
    base_markup = fetch_with_retry(source_url)
    progression_preview = extract_progression_data(base_markup)
    if progression_preview.get("baseStats"):
        max_markup = base_markup
    else:
        max_markup = fetch_with_retry(max_url)

    card_type = parse_card_type(base_markup)
    source_position, position, position_label = parse_position(base_markup)
    meta = {label: get_field(base_markup, label) for label in META_LABELS}
    if not meta.get("Team Name"):
        meta["Team Name"] = get_dd(base_markup, "Club")
    if not meta.get("Foot"):
        meta["Foot"] = get_dd(base_markup, "Stronger Foot")
    progression = extract_progression_data(base_markup)
    base_stats = parse_stats(base_markup)
    max_stats = parse_stats(max_markup)
    playing_style, player_skills, ai_playstyles, playing_styles_contract = parse_styles(base_markup)
    position_compatibility = parse_position_compatibility(base_markup)
    overall = int_or_none(base_stats.get("Overall Rating")) or int_or_none(progression.get("baseOverall"))
    if not meta.get("Maximum Level") and progression.get("maxLevel") is not None:
        meta["Maximum Level"] = str(progression.get("maxLevel"))
    source_version = parse_source_version(base_markup)

    record = {
        "source": "pesdb",
        "source_player_id": source_player_id,
        "source_url": source_url,
        "source_card_front_url": f"https://pesdb.net/assets/img/card/f{source_player_id}.png",
        "source_card_back_url": f"https://pesdb.net/assets/img/card/b{source_player_id}.png",
        "card_type": card_type,
        "player_name": meta.get("Player Name"),
        "position": position,
        "team_name": meta.get("Team Name"),
        "league": meta.get("League"),
        "nationality": meta.get("Nationality"),
        "region": meta.get("Region"),
        "height": int_or_none(meta.get("Height")),
        "weight": int_or_none(meta.get("Weight")),
        "age": int_or_none(meta.get("Age")),
        "foot": meta.get("Foot"),
        "max_level": int_or_none(meta.get("Maximum Level")),
        "rating": meta.get("Rating"),
        "overall_level_1": overall,
        "overall_max_level": int_or_none(max_stats.get("Overall Rating"))
        or int_or_none(progression.get("databaseMaxOverall"))
        or int_or_none(get_dd(base_markup, "Max Overall")),
        "base_stats": {key: value for key, value in base_stats.items() if key != "Overall Rating"},
        "max_stats": {key: value for key, value in max_stats.items() if key != "Overall Rating"},
        "playing_style": playing_style,
        "player_skills": player_skills,
        "ai_playstyles": ai_playstyles,
        "weak_foot_usage": base_stats.get("Weak Foot Usage"),
        "weak_foot_accuracy": base_stats.get("Weak Foot Accuracy"),
        "injury_resistance": base_stats.get("Injury Resistance"),
        "source_version": source_version,
        "position_compatibility": position_compatibility,
        "avatar_style": make_avatar_style(card_type, position, overall),
        "source_collection_url": list_url,
        "source_section": "PESDB Epic import",
        "pack_name": pack_name_from_url(list_url),
        "card_category": card_type,
        "classification_confidence": 100 if card_type == "Epic" else 0,
        "player_identity_key": identity_key(meta.get("Player Name")),
        "card_instance_key": f"pesdb:{source_player_id}",
        "card_variant_label": " · ".join(
            str(value)
            for value in [
                card_type,
                pack_name_from_url(list_url),
                position,
                playing_style,
                overall,
            ]
            if value
        ),
        "metadata": {
            "list_url": list_url,
            "source_position": source_position,
            "source_position_label": position_label,
            "excluded_fields": ["form"],
            "playing_styles": playing_styles_contract,
        },
    }
    record["completeness_score"], record["data_quality"] = completeness(record)
    record["catalog_ready"] = (
        is_catalog_card_type(record.get("card_type"))
        and record["completeness_score"] >= 85
        and bool(record.get("player_skills"))
        and bool(record.get("base_stats"))
    )
    record["needs_review"] = not record["catalog_ready"]
    return record


def sql_quote(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_int(value):
    return "null" if value is None else str(int(value))


def sql_array(values):
    if not values:
        return "array[]::text[]"
    return "array[" + ",".join(sql_quote(value) for value in values) + "]::text[]"


def sql_json(value):
    return sql_quote(json.dumps(value or {}, ensure_ascii=False)) + "::jsonb"


def build_upsert_sql(records):
    columns = [
        "source",
        "source_player_id",
        "source_url",
        "source_card_front_url",
        "source_card_back_url",
        "card_type",
        "player_name",
        "position",
        "team_name",
        "league",
        "nationality",
        "region",
        "height",
        "weight",
        "age",
        "foot",
        "max_level",
        "rating",
        "overall_level_1",
        "overall_max_level",
        "base_stats",
        "max_stats",
        "playing_style",
        "player_skills",
        "ai_playstyles",
        "weak_foot_usage",
        "weak_foot_accuracy",
        "injury_resistance",
        "source_version",
        "position_compatibility",
        "avatar_style",
        "data_quality",
        "completeness_score",
        "metadata",
        "last_source_sync_at",
        "source_collection_url",
        "source_section",
        "pack_name",
        "card_category",
        "classification_confidence",
        "catalog_ready",
        "needs_review",
        "player_identity_key",
        "card_instance_key",
        "card_variant_label",
    ]
    rows = []
    for record in records:
        rows.append(
            "("
            + ",".join(
                [
                    sql_quote(record.get("source")),
                    sql_quote(record.get("source_player_id")),
                    sql_quote(record.get("source_url")),
                    sql_quote(record.get("source_card_front_url")),
                    sql_quote(record.get("source_card_back_url")),
                    sql_quote(record.get("card_type")),
                    sql_quote(record.get("player_name")),
                    sql_quote(record.get("position")),
                    sql_quote(record.get("team_name")),
                    sql_quote(record.get("league")),
                    sql_quote(record.get("nationality")),
                    sql_quote(record.get("region")),
                    sql_int(record.get("height")),
                    sql_int(record.get("weight")),
                    sql_int(record.get("age")),
                    sql_quote(record.get("foot")),
                    sql_int(record.get("max_level")),
                    sql_quote(record.get("rating")),
                    sql_int(record.get("overall_level_1")),
                    sql_int(record.get("overall_max_level")),
                    sql_json(record.get("base_stats")),
                    sql_json(record.get("max_stats")),
                    sql_quote(record.get("playing_style")),
                    sql_array(record.get("player_skills")),
                    sql_array(record.get("ai_playstyles")),
                    sql_quote(record.get("weak_foot_usage")),
                    sql_quote(record.get("weak_foot_accuracy")),
                    sql_quote(record.get("injury_resistance")),
                    sql_quote(record.get("source_version")),
                    sql_json(record.get("position_compatibility")),
                    sql_json(record.get("avatar_style")),
                    sql_quote(record.get("data_quality")),
                    sql_int(record.get("completeness_score")),
                    sql_json(record.get("metadata")),
                    "now()",
                    sql_quote(record.get("source_collection_url")),
                    sql_quote(record.get("source_section")),
                    sql_quote(record.get("pack_name")),
                    sql_quote(record.get("card_category")),
                    sql_int(record.get("classification_confidence")),
                    "true" if record.get("catalog_ready") else "false",
                    "true" if record.get("needs_review") else "false",
                    sql_quote(record.get("player_identity_key")),
                    sql_quote(record.get("card_instance_key")),
                    sql_quote(record.get("card_variant_label")),
                ]
            )
            + ")"
        )

    update_columns = [
        column
        for column in columns
        if column not in {"source", "source_player_id", "card_type", "last_source_sync_at"}
    ]
    update_sql = ",\n".join(f"  {column}=excluded.{column}" for column in update_columns)
    return (
        f"insert into public.player_catalog ({','.join(columns)}) values\n"
        + ",\n".join(rows)
        + "\non conflict (source, source_player_id, card_type) do update set\n"
        + update_sql
        + ",\n  last_source_sync_at=now(),\n  updated_at=now();"
    )


def main():
    global USE_CACHE
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--output-json", default="epic_catalog_import.json")
    parser.add_argument("--output-sql", default="epic_catalog_import.sql")
    parser.add_argument("--sleep", type=float, default=2.0)
    parser.add_argument("--only-missing-from-json", help="Path to previous JSON output; retries only failed candidates")
    parser.add_argument("--url-json", help="JSON file with candidate list URLs: [{label,url}]")
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument(
        "--card-types",
        help="Comma-separated allowed card types. Defaults to all non-Standard cards.",
    )
    args = parser.parse_args()
    USE_CACHE = not args.no_cache
    allowed_card_types = [item.strip() for item in args.card_types.split(",")] if args.card_types else None

    if args.only_missing_from_json:
        with open(args.only_missing_from_json, "r", encoding="utf-8") as file:
            previous = json.load(file)
        candidates = [item["candidate"] for item in previous.get("errors", [])]
    else:
        list_urls = EPIC_LIST_URLS
        if args.url_json:
            with open(args.url_json, "r", encoding="utf-8") as file:
                source_items = json.load(file)
                list_urls = [item["url"] for item in source_items]
                SOURCE_LABEL_BY_URL.update({item["url"]: item.get("label") or pack_name_from_url(item["url"]) for item in source_items})
        candidates = collect_player_ids(list_urls)
    records = []
    errors = []
    for candidate in candidates:
        if len(records) >= args.limit:
            break
        try:
            record = parse_player(candidate["source_player_id"], candidate["list_url"])
            if not is_catalog_card_type(record.get("card_type"), allowed_card_types):
                continue
            records.append(record)
            print(f"OK {len(records):03d} {record['source_player_id']} {record['player_name']}")
            time.sleep(args.sleep)
        except Exception as error:
            errors.append({"candidate": candidate, "error": str(error)})
            print(f"WARN {candidate['source_player_id']} {error}")

    with open(args.output_json, "w", encoding="utf-8") as file:
        json.dump({"records": records, "errors": errors}, file, ensure_ascii=False, indent=2)
    with open(args.output_sql, "w", encoding="utf-8") as file:
        file.write(build_upsert_sql(records))
    print(json.dumps({"records": len(records), "errors": len(errors), "sql": args.output_sql}, ensure_ascii=False))


if __name__ == "__main__":
    main()
