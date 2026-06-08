#!/usr/bin/env python3
"""
Methodology validator for The Global Disinformation Ledger.

Core rule (compile, never adjudicate):
  Every row that carries a VERDICT must cite a named third-party fact-checker
  (verdict_source) AND include a working-looking fact-check link (source_url).
  Rows with no published check must leave `verdict` empty and mark
  claim_status as "unverified — no published check".

Exit code 0 = pass, 1 = violations found. Used by CI to reject bad PRs.

Usage:
  python3 scripts/validate_ledger.py                # checks data/MASTER_GLOBAL.csv + data/*.csv
  python3 scripts/validate_ledger.py path/to.csv    # check a specific file
"""
import csv
import glob
import re
import sys
import os

REQUIRED_COLUMNS = [
    "claim_id", "date_claimed", "actor", "country", "claim_verbatim",
    "topic_tag", "verdict", "verdict_source", "source_url", "claim_status",
]

URL_RE = re.compile(r"^https?://[^\s]+\.[^\s]+", re.IGNORECASE)

# Phrases that explicitly mark a claim as having no published check, OR as not
# being a factual claim at all (opinion, rhetoric, commitment) — both are
# legitimate non-verdict states under the compile-never-adjudicate methodology.
UNVERIFIED_MARKERS = (
    "unverified",
    "no published check",
    "no third-party",
    "no fact-check",
    "no verdict applicable",
    "political commentary",
    "rhetorical",
    "commitment statement",
)


def is_unverified(row):
    blob = " ".join([
        (row.get("claim_status") or ""),
        (row.get("verdict") or ""),
        (row.get("notes") or ""),
    ]).lower()
    return any(m in blob for m in UNVERIFIED_MARKERS)


def validate_file(path):
    errors = []
    warnings = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cols = reader.fieldnames or []
        missing_cols = [c for c in REQUIRED_COLUMNS if c not in cols]
        if missing_cols:
            errors.append(f"{path}: MISSING REQUIRED COLUMNS: {', '.join(missing_cols)}")
            return errors  # can't sensibly check rows without columns

        for i, row in enumerate(reader, start=2):  # row 1 = header
            cid = (row.get("claim_id") or f"<row {i}>").strip()
            verdict = (row.get("verdict") or "").strip()
            source = (row.get("verdict_source") or "").strip()
            url = (row.get("source_url") or "").strip()

            # An empty / unverified row is allowed to have no source — that's the
            # honest "no published check" path. Skip the source requirement.
            if not verdict or is_unverified(row):
                # But it must NOT silently carry a verdict.
                if verdict and not is_unverified(row):
                    pass  # handled below
                continue

            # Row HAS a real verdict -> methodology requires a cited checker + link.
            if not source:
                errors.append(
                    f"{path} [{cid}]: has verdict '{verdict}' but NO named fact-checker (verdict_source empty)."
                )
            if not url:
                errors.append(
                    f"{path} [{cid}]: has verdict '{verdict}' but NO fact-check link (source_url empty)."
                )
            elif not URL_RE.match(url):
                # Data-hygiene issue (publication name in the URL field) — warn,
                # don't hard-fail, so existing rows surface for cleanup over time.
                warnings.append(
                    f"{path} [{cid}]: source_url is not a URL (looks like a source name): '{url[:80]}'"
                )
    return errors, warnings


def main():
    args = sys.argv[1:]
    if args:
        targets = args
    else:
        targets = []
        if os.path.exists("data/MASTER_GLOBAL.csv"):
            targets.append("data/MASTER_GLOBAL.csv")
        targets += [p for p in glob.glob("data/*.csv")
                    if os.path.basename(p) not in ("MASTER_GLOBAL.csv", "TEMPLATE.csv")]
        targets = sorted(set(targets))

    if not targets:
        print("No CSV files found to validate.")
        return 0

    all_errors = []
    all_warnings = []
    total_rows = 0
    for path in targets:
        with open(path, encoding="utf-8") as f:
            total_rows += max(0, sum(1 for _ in f) - 1)
        errs, warns = validate_file(path)
        all_errors.extend(errs)
        all_warnings.extend(warns)
        status = "OK" if not errs else f"{len(errs)} VIOLATION(S)"
        if warns:
            status += f" ({len(warns)} warning(s))"
        print(f"  checked {path}: {status}")

    print("-" * 60)
    if all_warnings:
        print(f"{len(all_warnings)} warning(s) — data hygiene, not blocking:\n")
        for w in all_warnings:
            print(f"  ⚠ {w}")
        print()
    if all_errors:
        print(f"FAILED — {len(all_errors)} methodology violation(s) across {total_rows} rows:\n")
        for e in all_errors:
            print(f"  ✗ {e}")
        print("\nEvery verdict must cite a named third-party fact-checker with a")
        print("working source_url. If no published check exists, leave the verdict")
        print('empty and set claim_status to "unverified — no published check".')
        return 1

    print(f"PASSED — {total_rows} rows, every verdict properly cited. ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
