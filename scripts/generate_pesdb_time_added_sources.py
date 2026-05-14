"""
Genera un JSON di sorgenti PESDB per import_epic_catalog.py (--url-json).

Uso tipico: andare a ritroso giorno per giorno (UTC midnight) con time_added,
come da docs/PLAYER_CATALOG_IMPORT.md.

Esempio:
  python scripts/generate_pesdb_time_added_sources.py --end-date 2026-05-13 --days 5 --max-pages 8 \\
    > scripts/pesdb_backfill_20260513_sources.json

Poi:
  python -u scripts/import_epic_catalog.py --limit 500 --url-json scripts/pesdb_backfill_20260513_sources.json \\
    --output-json scripts/pesdb_backfill_batch.json --output-sql scripts/pesdb_backfill_batch.sql --sleep 3
"""

import argparse
import json
from datetime import datetime, timedelta, timezone


def utc_midnight_ts(date_str: str) -> int:
    dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return int(dt.timestamp())


def main():
    parser = argparse.ArgumentParser(description="Build PESDB time_added url-json for import_epic_catalog.py")
    parser.add_argument(
        "--end-date",
        required=True,
        help="Ultimo giorno incluso, formato YYYY-MM-DD (mezzanotte UTC)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=1,
        help="Quanti giorni indietro da end-date (incluso end-date)",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=6,
        help="Pagine per ogni giorno (page=1 .. max-pages)",
    )
    parser.add_argument(
        "--output",
        default="-",
        help="File JSON in uscita, oppure - per stdout",
    )
    args = parser.parse_args()

    end = datetime.strptime(args.end_date, "%Y-%m-%d").date()
    items = []
    for d in range(args.days):
        day = end - timedelta(days=d)
        day_str = day.isoformat()
        ts = utc_midnight_ts(day_str)
        base = (
            f"https://pesdb.net/efootball/?all=1&time_added={ts}"
            "&featured=all&sort=overall_at_max_level"
        )
        for page in range(1, args.max_pages + 1):
            url = base if page == 1 else f"{base}&page={page}"
            items.append(
                {
                    "label": f"Recent Featured {day_str} page {page}",
                    "url": url,
                }
            )

    text = json.dumps(items, ensure_ascii=False, indent=2)
    if args.output == "-":
        print(text)
    else:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Wrote {len(items)} entries to {args.output}", file=__import__("sys").stderr)


if __name__ == "__main__":
    main()
