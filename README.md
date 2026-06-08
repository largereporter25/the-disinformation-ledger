# The Global Disinformation Ledger

**Making fact-checks travel faster than lies.**

An open investigative-accountability database of **1,656 fact-checked political disinformation claims** across **8 countries** and **41 tracked public figures**. Every verdict in this ledger is attributed to a **named, independent third-party fact-checker** with a working source link. We compile — we never adjudicate.

🔗 **Live dashboard:** https://disinformation-ledger.vercel.app

![The Disinformation Ledger — Know Your Liars](dashboard/public/og-image.png)

---

## Core principle — compile, never adjudicate

This project does **not** rule claims true or false on its own authority. Every verdict cites a named, reputable third-party fact-checker (Full Fact, Reuters Fact Check, BBC Verify, Channel 4 FactCheck, FactCheckNI, The Ferret, PolitiFact, CCDH, AFP, AP, and others). Where no published debunk exists, the claim is logged as **"unverified — no published check"** and is assigned **no verdict**. This is a legal and credibility requirement, not a stylistic choice.

See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for the full standard.

---

## What's in the dataset

`data/MASTER_GLOBAL.csv` — 1,656 rows, 21 columns.

| Country | Claims |
|---|---|
| United Kingdom | 499 |
| United States | 366 |
| Germany | 200 |
| India | 195 |
| Spain | 150 |
| France | 128 |
| Italy | 109 |
| Israel | 9 |

### Schema

| Column | Description |
|---|---|
| `claim_id` | Globally unique ID, country-prefixed (`UK::`, `US::`, `IN::`, `FR::`, `DE::`, `IT::`, `ES::`) |
| `date_claimed` | Date the claim was made |
| `actor` | Person or account who made the claim |
| `country` | Jurisdiction |
| `actor_category` | e.g. politician, influencer, party account |
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
| `platform_corrected` | Whether the platform issued a correction/label |
| `claim_status` | Status flag |
| `electoral_political_impact` | Notes on electoral/political consequence |
| `notes` | Reviewer notes |

---

## Project structure

```
disinformation-ledger/
├── data/
│   └── MASTER_GLOBAL.csv          # The canonical dataset (1,656 claims)
├── dashboard/                     # Vite + React + Recharts front-end
│   ├── src/                       # App.jsx, Charts.jsx, lib.js, styles.css
│   ├── public/
│   │   ├── data.json              # Pre-built dashboard data
│   │   ├── portraits/             # 39 stylised editorial portraits
│   │   └── og-image.png           # Social share card
│   └── package.json
├── scripts/                       # Build + research pipeline
│   ├── merge_master.py            # Merge per-country CSVs into MASTER_GLOBAL
│   ├── build_dashboard_data.py    # Build dashboard/public/data.json
│   ├── pull_drive_csvs.py         # Pull source CSVs
│   ├── fetch_wiki_portraits.py    # Fetch real portraits from Wikimedia Commons
│   ├── refetch_portraits.py       # Rate-limit-safe portrait re-fetch
│   ├── stylise_batch.py           # Stylise portraits into editorial art
│   ├── validate_us_israel.py      # Fact-check link validator
│   └── make_og.py                 # Generate the social share card
└── docs/
    ├── METHODOLOGY.md             # The compile-never-adjudicate standard
    └── DASHBOARD_SPEC.md          # Dashboard design + data spec
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

Every tracked figure is rendered as a stylised editorial **screenprint** (charcoal ink + a single crimson spot color on off-white paper). **All portraits are derived from real photographs sourced from Wikimedia Commons** — none are invented faces. Where no Wikimedia portrait exists, the figure is shown as a charcoal monogram tile rather than a fabricated likeness.

---

## Contributing

We welcome OSINT investigators and journalists from any country. **To protect the methodology and legal integrity of the ledger, all data contributions are via Pull Request and are reviewed before merging.**

1. Fork the repository.
2. Add or extend a country CSV following the schema above.
3. **Every claim with a verdict must cite a named third-party fact-checker and include a working `source_url`.** No exceptions. Claims without a published check must be logged as `unverified — no published check` with an empty verdict.
4. Flag any claim touching active legal proceedings for human review before inclusion.
5. Open a PR. **An automated CI check (`.github/workflows/validate.yml`) runs `scripts/validate_ledger.py` on every contribution and will fail the PR if any row carries a verdict without a named fact-checker and a working `source_url`.** A maintainer then reviews against `docs/METHODOLOGY.md`.

You can run the validator yourself before opening a PR:

```bash
python3 scripts/validate_ledger.py
```

Do not commit unsourced assertions, editorialised verdicts, or claims you have adjudicated yourself.

---

## Rights

**All rights reserved.** This repository is public for transparency and review, but no license to reuse, modify, or redistribute the code or data is granted at this time. Please contact the maintainer for permissions or collaboration.

Data contributions are still welcome via Pull Request under the terms in [`CONTRIBUTING.md`](CONTRIBUTING.md); by contributing you agree your submission may be included in the ledger under the project's terms.

---

## Credits

Compiled and built by Vansh Kunal Shah.

Database compilation, dashboard, portrait pipeline, and tooling built with **Claude Opus 4.8 on Perplexity Computer**.
