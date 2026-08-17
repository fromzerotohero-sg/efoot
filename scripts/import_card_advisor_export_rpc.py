"""Importa export eFHUB (sync_card_advisor_cards --export-only) via RPC temporanea."""
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from card_advisor_release_gate import category_from_release_name, extract_release_date, is_evaluable_card_advisor_release
from sync_card_advisor_cards import slugify


def env(name, default=""):
    return os.environ.get(name, default)


def main():
    parser = argparse.ArgumentParser(description="Call import_card_advisor_efhub_release_tmp for each release.")
    parser.add_argument("--input-json", default="card_advisor_efhub_export.json")
    parser.add_argument("--supabase-url", default=env("NEXT_PUBLIC_SUPABASE_URL"))
    parser.add_argument("--anon-key", default=env("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
    args = parser.parse_args()

    if not args.supabase_url or not args.anon_key:
        raise SystemExit("Serve NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY")

    input_path = Path(args.input_json)
    if not input_path.is_absolute():
        input_path = ROOT / input_path

    rpc_url = f"{args.supabase_url.rstrip('/')}/rest/v1/rpc/import_card_advisor_efhub_release_tmp"
    data = json.loads(input_path.read_text(encoding="utf-8"))

    for block in data.get("releases", []):
        name = block.get("release") or ""
        if not is_evaluable_card_advisor_release(name):
            print("skip", slugify(name) or "(empty)", "not_evaluable")
            continue
        payload = {
            "p_source_release_id": slugify(name),
            "p_release_name": name,
            "p_release_date": extract_release_date(name) or block.get("release_date"),
            "p_category": category_from_release_name(name),
            "p_cards": block.get("cards") or [],
        }
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            rpc_url,
            data=body,
            method="POST",
            headers={
                "apikey": args.anon_key,
                "Authorization": f"Bearer {args.anon_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=180) as res:
            text = res.read().decode("utf-8", "replace")
            print(res.status, slugify(name), len(block.get("cards") or []), text)


if __name__ == "__main__":
    main()
