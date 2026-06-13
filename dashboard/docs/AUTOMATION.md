# The Disinformation Ledger — Backend Automation Spec

**Status:** Build spec (approved 2026-06-13). Strict method = **B** (IFCN-verified auto-verdict; others logged as `pending_review`).

## Goal

Move the 104,217 historical claims from static JSON into a **Neon Postgres** database, rewrite the read API to query SQL (dashboard + public read key unchanged), and add an **hourly Vercel Cron worker** that polls the Google Fact Check Tools API for the project's tracked figures, applies the strict allowlist, de-dupes, and inserts new fact-checks — so the dashboard updates itself with zero redeploys.

## Core principle (unchanged)

Compile, never adjudicate. Every verdict cites a named third-party fact-checker with a working URL. No published check → `unverified — no published check`, no verdict. UK defamation / contempt-of-court awareness — anything touching active legal proceedings is flagged for human review, never auto-published with a verdict.

---

## Data sources reconciled

| Source | Rows | Notes |
|---|---|---|
| `public/dataset/all.ndjson` (live JSON) | 104,217 | Canonical. 19 fields per claim. |
| Google Sheet `MASTER_GLOBAL_Phase2` (gid 45682654) | 104,219 | Same dataset + 2 extra columns: `platform_corrected`, `notes`. |

The migration merges the two by `claim_id`: JSON is the spine; the sheet contributes `platform_corrected` and `notes`.

---

## Stage 1 — SQL foundation (Neon)

### Schema

**`claims`** (primary table)
- `claim_id TEXT PRIMARY KEY`
- `date_claimed TEXT` (dataset uses partial dates like `2014-05-00`, so kept as TEXT)
- `actor TEXT`, `country TEXT`, `actor_category TEXT`
- `claim_verbatim TEXT`
- `topic_tag TEXT`, `platform TEXT`, `platform_corrected TEXT`
- `post_url TEXT`, `archived_url TEXT`
- `verdict TEXT`, `verdict_source TEXT`
- `source_url TEXT UNIQUE` — **dedup key**
- `source_date DATE`
- `views BIGINT`, `reposts BIGINT`, `likes BIGINT`
- `claim_status TEXT` (`canonical` | `pending_review` | `auto`)
- `electoral_political_impact TEXT`, `notes TEXT`
- `ingest_method TEXT` (`historical` | `auto-google-factcheck`)
- `publisher TEXT`, `review_rating TEXT` (raw Google fields for auto rows)
- `ingested_at TIMESTAMPTZ DEFAULT now()`
- Indexes: `actor`, `country`, `verdict`, `source_date`, `topic_tag`, `claim_status`

**`figures`** (the tracked people → search queries)
- `id SERIAL PK`, `name TEXT`, `aliases TEXT[]`, `country TEXT`, `active BOOLEAN DEFAULT true`

**`fact_checkers`** (the allowlist)
- `id SERIAL PK`, `name TEXT`, `site TEXT`, `is_ifcn_verified BOOLEAN`, `notes TEXT`

**`ingestion_log`** (audit trail)
- `id SERIAL PK`, `run_at TIMESTAMPTZ DEFAULT now()`, `queries_run INT`, `reviews_found INT`, `inserted INT`, `skipped_dupe INT`, `rejected_unverified INT`, `flagged_legal INT`, `errors TEXT`

### Migration script (`scripts/migrate.mjs`)
1. Stream `all.ndjson` (104k rows).
2. Left-join sheet export by `claim_id` for `platform_corrected` + `notes`.
3. Bulk insert into `claims` with `ingest_method = 'historical'`, `claim_status` from source.
4. Seed `figures` from distinct `actor` values (deduped to the ~493 named figures).
5. Seed `fact_checkers` from the IFCN signatory list + the project's named checkers.

Built and dry-run locally first; final load runs against Neon via one command.

---

## Stage 2 — Read API rewrite (zero downstream disruption)

`/api/v1/claims`, `/stats`, `/meta`, `/api`, `/dataset/*` rewritten to query Neon (via `@neondatabase/serverless`) instead of reading JSON shards. **Same endpoints, same response shape, same read key** (`dl_live_...`). Static shards retained as fallback until SQL is proven.

---

## Stage 3 — Hourly ingestion worker (`/api/cron/ingest`)

Runs hourly (Vercel Cron). Protected by `CRON_SECRET`.

1. Load active `figures` as search queries (batched to respect Google quota).
2. Call Google Fact Check Tools API (`claims:search`) with `maxAgeDays` so each run fetches only recent checks.
3. For each `claimReview`:
   - Publisher **on IFCN allowlist** → insert with verdict, `ingest_method='auto-google-factcheck'`, `claim_status='auto'`.
   - Publisher **not** on allowlist → insert `claim_status='pending_review'`, **no verdict**.
   - `source_url` already in `claims` → skip (dedup).
4. **Legal guardrail:** review text matching active-legal-proceedings keywords (`trial`, `charged`, `sub judice`, `convicted`, `defamation case`, etc.) → forced `pending_review`, no verdict, regardless of publisher.
5. Write one `ingestion_log` row.

### Quota math
Google Fact Check API free tier ≈ generous daily quota. 493 figures × 24 runs/day would be heavy, so figures are **rotated** — each hourly run processes a slice (e.g. ~40 figures/run → full sweep every ~12h), plus `maxAgeDays` keeps payloads small. Tunable via env.

---

## Stage 4 — Verify & hand off

Local end-to-end test on a temp Neon branch, then the user performs the live-only steps:
1. Create Neon DB (Vercel Storage tab → Neon integration).
2. Set env vars in Vercel: `DATABASE_URL`, `GOOGLE_FACTCHECK_API_KEY`, `CRON_SECRET`.
3. Run migration command.
4. Confirm Cron schedule in `vercel.json` deploys.

## Secrets policy
API key + OAuth secret are gitignored and live only in Vercel/Neon env. Never committed.
