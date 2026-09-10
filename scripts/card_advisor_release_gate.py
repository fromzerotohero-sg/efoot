"""Gate Card Advisor: quali sezioni eFHUB sono pack valutabili.

Allineare con lib/cardAdvisorReleaseGate.js
"""
import re

DENY_SUBSTRINGS = (
    "bonus",
    "reward",
    "rewards",
    "login",
    "advertisement",
    "starter set",
    "skill up",
    "skill-up",
    "step-up",
    "step up",
    "manager pack",
    "webstore",
    "campaign",
)

ALLOW_SUBSTRINGS = (
    "selection",
    "highlight",
    "standout",
    "encore",
    "collaboration",
    "naruto",
    "transfer",
    "edition",
    "tactical",
    "international cup",
    "icons",
    "national stars",
    "rising stars",
    "toty",
    "gracias",
)

RELEASE_DATE_RE = re.compile(r"(\d{1,2}\s+[A-Za-z]{3,9}\s+'?\d{2})")


def _normalize(name=""):
    return " ".join(str(name or "").lower().split())


def extract_release_date(name=""):
    match = RELEASE_DATE_RE.search(str(name or ""))
    return match.group(1).strip() if match else None


def category_from_release_name(name=""):
    lower = _normalize(name)
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
    if "transfer" in lower:
        return "Transfer"
    if "edition" in lower:
        return "Edition"
    if "tactical" in lower:
        return "Event"
    return "Special"


def is_evaluable_card_advisor_release(name=""):
    lower = _normalize(name)
    if not lower:
        return False
    if any(needle in lower for needle in DENY_SUBSTRINGS):
        return False
    if any(needle in lower for needle in ALLOW_SUBSTRINGS):
        return True
    if RELEASE_DATE_RE.search(str(name or "")):
        return True
    return False


def filter_evaluable_releases(releases, name_key="release_name"):
    out = []
    for release in releases or []:
        name = release.get(name_key) or release.get("release") or release.get("name") or ""
        if is_evaluable_card_advisor_release(name):
            out.append(release)
    return out
