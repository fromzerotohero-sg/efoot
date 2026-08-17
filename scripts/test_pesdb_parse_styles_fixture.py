#!/usr/bin/env python3
"""
Fixture harness for dual Playing Style tests.
Calls the REAL import_epic_catalog.parse_styles / parse_source_version.
No network, no Supabase writes.

Usage:
  python scripts/test_pesdb_parse_styles_fixture.py --html-file path.html
  python scripts/test_pesdb_parse_styles_fixture.py --self-test
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("import_epic_catalog", ROOT / "import_epic_catalog.py")
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)

ROGERS_V6_HTML = """
<table class="playing_styles">
  <tr><th>Playing Style</th></tr>
  <tr><td><span style="color: #efefef;">Att:</span> Hole Player</td></tr>
  <tr><td><span style="color: #efefef;">Def:</span> Pass Disruptor</td></tr>
  <tr><th>Player Skills</th></tr>
  <tr><td>Double Touch</td></tr>
</table>
<div>Version v6.0.0 Changes:</div>
<p>Players have been exported from the game eFootball 2027</p>
"""

LEGACY_SINGLE_HTML = """
<table class="playing_styles">
  <tr><th>Playing Style</th></tr>
  <tr><td>Hole Player</td></tr>
</table>
"""

DEF_BASIC_HTML = """
<table class="playing_styles">
  <tr><th>Playing Style</th></tr>
  <tr><td><span style="color: #efefef;">Att:</span> Hole Player</td></tr>
  <tr><td><span style="color: #efefef;">Def:</span> Basic</td></tr>
</table>
"""


def parse_fixture(html: str) -> dict:
    primary, skills, ai, contract = MOD.parse_styles(html)
    return {
        "primary": primary,
        "player_skills": skills,
        "ai_playstyles": ai,
        "contract": contract,
        "source_version": MOD.parse_source_version(html),
    }


def self_test() -> int:
    failures = []

    rogers = parse_fixture(ROGERS_V6_HTML)
    if rogers["primary"] != "Hole Player":
        failures.append(f"rogers primary={rogers['primary']!r}")
    if rogers["contract"].get("format") != "dual":
        failures.append(f"rogers format={rogers['contract'].get('format')!r}")
    if rogers["contract"].get("attack") != "Hole Player":
        failures.append(f"rogers attack={rogers['contract'].get('attack')!r}")
    if rogers["contract"].get("defense") != "Pass Disruptor":
        failures.append(f"rogers defense={rogers['contract'].get('defense')!r}")
    if "Att:" in str(rogers["primary"] or ""):
        failures.append("rogers primary still has Att: prefix")
    if rogers["source_version"] != "eFootball 2027 v6.0.0":
        failures.append(f"rogers source_version={rogers['source_version']!r}")

    legacy = parse_fixture(LEGACY_SINGLE_HTML)
    if legacy["primary"] != "Hole Player" or legacy["contract"].get("format") != "single":
        failures.append(f"legacy={legacy}")
    if legacy["contract"].get("defense") is not None:
        failures.append("legacy invented defense")

    basic = parse_fixture(DEF_BASIC_HTML)
    if basic["contract"].get("defense") != "Basic":
        failures.append(f"basic defense={basic['contract'].get('defense')!r}")

    src = (ROOT / "import_epic_catalog.py").read_text(encoding="utf-8")
    if "eFootball 2026 v5.4.0" in src:
        failures.append("hardcoded source_version v5.4.0 still present")
    if "parse_source_version" not in src:
        failures.append("parse_source_version missing")

    if failures:
        print(json.dumps({"ok": False, "failures": failures}, ensure_ascii=False))
        return 1

    print(
        json.dumps(
            {
                "ok": True,
                "rogers": rogers,
                "legacy": legacy,
                "basic": basic,
            },
            ensure_ascii=False,
        )
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html-file")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    if not args.html_file:
        parser.error("provide --html-file or --self-test")

    html = Path(args.html_file).read_text(encoding="utf-8")
    print(json.dumps(parse_fixture(html), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
