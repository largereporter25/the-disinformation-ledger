# The Disinformation Ledger

**Making the fact-checks travel faster than the lies.**

[![Code License: MIT](https://img.shields.io/badge/Code%20License-MIT-black.svg)](LICENSE)
[![Data License: CC BY-NC 4.0](https://img.shields.io/badge/Data%20License-CC%20BY--NC%204.0-b91c1c.svg)](LICENSE-DATA)
[![Live dashboard](https://img.shields.io/badge/Live-disinformation--ledger.vercel.app-1a1a1a.svg)](https://disinformation-ledger.vercel.app)

An open investigative-accountability database of **104,217 fact-checked
political disinformation claims** across **14 countries** and **493 tracked
public figures**. Every verdict in this ledger is attributed to a **named,
independent third-party fact-checker** with a working source link. We
compile — we never adjudicate.

🔗 **Live dashboard:** https://disinformation-ledger.vercel.app
🔌 **Free read API:** see [`docs/API.md`](docs/API.md)

![The Disinformation Ledger — Know Your Liars](dashboard/public/og-image.png)

---

## Core principle — compile, never adjudicate

This project does **not** rule claims true or false on its own authority. Every
verdict cites a named, reputable third-party fact-checker (PolitiFact, Snopes,
Full Fact, Reuters Fact Check, BBC Verify, Channel 4 FactCheck, FactCheckNI,
The Ferret, Lead Stories, Maldita, Alt News, Vishvas News, Demagog, CCDH, AFP,
AP, and 100+ others). Where no published debunk exists, the claim is logged as
**"unverified — no published check"** and is assigned **no verdict**. This is a
legal and credibility requirement, not a stylistic choice.

See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for the full standard.

---

## What's in the dataset

`data/MASTER_GLOBAL.csv` is the canonical source. The built, queryable dataset
covers **104,217 claims across 14 countries**, attributed to **120+ named
fact-checkers**.

| Country | Claims |
|---|---|
| United States | 52,454 |
| India | 25,551 |
| Poland | 9,343 |
| United Kingdom | 6,372 |
| Spain | 5,142 |
| Russia | 2,105 |
| Israel | 1,146 |
| China | 851 |
| Germany | 580 |
| Iran | 399 |
| North Korea | 100 |
| France | 74 |
| India (Media) | 54 |
| Italy | 46 |

*(Live breakdown: `GET /api/v1/stats`.)*

### Schema

| Column | Description |
|---|---|
| `claim_id` | Globally unique ID, country-prefixed (`US::`, `UK::`, `IN::`, `PL::`, `ES::`, `DE::`, `FR::`, `IT::` …) |
| `date_claimed` | Date the claim was made |
| `actor` | Person or account who made the claim |
| `country` | Jurisdiction |
| `actor_category` | e.g. Primary, politician, influencer, party account |
| `claim_verbatim` | The claim, quoted exactly |
| `topic_tag` | Topic (immigration, elections, health, etc.) |
| `platform` | Where it was posted |
| `post_url` | Link to the original post |
| `archived_url` | Archived snapshot, where available |
| `verdict` | The fact-checker's verdict (e.g. False, Pants on Fire) |
| `verdict_source` | **Named third-party fact-checker** |
| `source_url` | **Working link to the published fact-check** |
| `source_date` | Date of the fact-check |
| `views` / `reposts` / `likes` | Reach metrics where available |
| `claim_status` | Status flag (`canonical`, `unverified — no published check`) |
| `electoral_political_impact` | Notes on electoral/political consequence |

---

## The API (free, read-only)

A self-describing REST API serves the entire ledger as JSON, plus a gzipped
NDJSON bulk download. Full reference, schema, and quickstarts (Python / JS /
curl) are in **[`docs/API.md`](docs/API.md)**.

```bash
# Aggregate stats for one country
curl -H "Authorization: Bearer dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e" \
  "https://disinformation-ledger.vercel.app/api/v1/stats?country=India"

# Query claims with filters + full-text search
curl -H "Authorization: Bearer dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e" \
  "https://disinformation-ledger.vercel.app/api/v1/claims?checker=Full%20Fact&q=immigration&limit=5"

# Self-describing manifest (fields, breakdowns, endpoints, shards)
curl -H "Authorization: Bearer dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e" \
  "https://disinformation-ledger.vercel.app/api/v1/meta"
```

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/claims` | Query claims — filter by `country`, `actor`, `checker`, `verdict`, `topic`, `year`, `q`; paginate with `limit`/`offset` |
| `GET /api/v1/stats` | Aggregate counts (by country, by verdict), scopeable by filter |
| `GET /api/v1/meta` | Dataset manifest: fields, license, attribution, breakdowns, endpoints, shard map |
| `GET /dataset/all.ndjson.gz` | Bulk download (gzipped NDJSON, one claim per line) |

The published key is a shared, rate-limited demo key. For higher limits or a
dedicated key, contact the maintainer.

---

## Project structure

```
the-disinformation-ledger/
├── data/
│   ├── MASTER_GLOBAL.csv          # The canonical dataset
│   └── TEMPLATE.csv               # Blank row template for contributors
├── dashboard/                     # Vite + React + Recharts front-end
│   ├── src/                       # App.jsx, Charts.jsx, lib.js, styles.css
│   ├── public/
│   │   ├── data.json              # Pre-built dashboard data
│   │   ├── portraits/             # Stylised editorial portraits
│   │   └── og-image.png           # Social share card
│   └── package.json
├── scripts/                       # Build + research pipeline
│   ├── merge_master.py            # Merge per-country CSVs into MASTER_GLOBAL
│   ├── build_dashboard_data.py    # Build dashboard/public/data.json
│   ├── pull_drive_csvs.py         # Pull source CSVs
│   ├── fetch_wiki_portraits.py    # Fetch real portraits from Wikimedia Commons
│   ├── refetch_portraits.py       # Rate-limit-safe portrait re-fetch
│   ├── stylise_batch.py           # Stylise portraits into editorial art
│   ├── validate_ledger.py         # Fact-check link / methodology validator (CI)
│   └── make_og.py                 # Generate the social share card
└── docs/
    ├── METHODOLOGY.md             # The compile-never-adjudicate standard
    ├── DASHBOARD_SPEC.md          # Dashboard design + data spec
    └── API.md                     # Public API reference + quickstarts
```

---

## Running the dashboard locally

```bash
cd dashboard
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

The dashboard reads `public/data.json`. To regenerate it from the CSV:

```bash
python3 scripts/build_dashboard_data.py
```

---

## Portraits

Every tracked figure is rendered as a stylised editorial **screenprint**
(charcoal ink + a single crimson spot color on off-white paper). **All
portraits are derived from real photographs sourced from Wikimedia Commons** —
none are invented faces. Where no Wikimedia portrait exists, the figure is
shown as a charcoal monogram tile rather than a fabricated likeness.

---

## Contributing

We welcome OSINT investigators and journalists from any country. **To protect
the methodology and legal integrity of the ledger, all data contributions are
via Pull Request and are reviewed before merging.** See
[`CONTRIBUTING.md`](CONTRIBUTING.md) and the
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

1. Fork the repository.
2. Add or extend a country CSV following the schema above (use `data/TEMPLATE.csv`).
3. **Every claim with a verdict must cite a named third-party fact-checker and
   include a working `source_url`.** No exceptions. Claims without a published
   check must be logged as `unverified — no published check` with an empty
   verdict.
4. Flag any claim touching active legal proceedings for human review before inclusion.
5. Open a PR. **CI (`.github/workflows/validate.yml`) runs
   `scripts/validate_ledger.py` and will fail the PR if any row carries a
   verdict without a named fact-checker and a working `source_url`.** A
   maintainer then reviews against `docs/METHODOLOGY.md`.

```bash
python3 scripts/validate_ledger.py    # run the validator yourself before a PR
```

Do not commit unsourced assertions, editorialised verdicts, or claims you have
adjudicated yourself.

---

## License

This is a **dual-licensed** project:

- **Code** — the dashboard, scripts, and tooling — is released under the
  [MIT License](LICENSE).
- **Data** — the fact-check records in `data/`, `dashboard/public/data.json`,
  and the `/dataset/` bulk files — is released under
  [Creative Commons Attribution-NonCommercial 4.0 (CC-BY-NC-4.0)](LICENSE-DATA).

If you reuse the data, **attribute "The Disinformation Ledger — Vansh Kunal
Shah"**, link back to the live dashboard, and cite each claim's `source_url`.
Use is non-commercial; contact the maintainer for commercial licensing.

Security and data-integrity reports: see [`SECURITY.md`](SECURITY.md).

---

## Credits

Compiled and built by **Vansh Kunal Shah** (editor-in-chief).

Database compilation, dashboard, portrait pipeline, API, and tooling built with
**Perplexity Computer**.
