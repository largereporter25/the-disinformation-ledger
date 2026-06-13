-- The Disinformation Ledger — Neon Postgres schema
-- Method A: ALL fact-checkers ingested; every check keeps its verdict.
-- is_ifcn_verified is a hidden provenance flag only (frontend never reads it).

-- ---------------------------------------------------------------------------
-- claims : the canonical record (104,217 historical + auto-ingested)
-- Surrogate PK so the full historical corpus (which contains repeated
-- claim_id / source_url values) is preserved byte-for-byte. The frontend
-- KPI total_claims=104,217 must remain unchanged.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id                         BIGSERIAL PRIMARY KEY,
  claim_id                   TEXT,
  date_claimed               TEXT,                 -- partial dates exist (e.g. 2014-05-00)
  actor                      TEXT,
  country                    TEXT,
  actor_category             TEXT,
  claim_verbatim             TEXT,
  topic_tag                  TEXT,
  platform                   TEXT,
  platform_corrected         TEXT,                 -- from master sheet
  post_url                   TEXT,
  archived_url               TEXT,
  verdict                    TEXT,
  verdict_source             TEXT,
  source_url                 TEXT,
  source_date                TEXT,
  views                      BIGINT,
  reposts                    BIGINT,
  likes                      BIGINT,
  claim_status               TEXT,                 -- canonical | auto | pending_review | unverified...
  electoral_political_impact TEXT,
  notes                      TEXT,                 -- from master sheet
  publisher                  TEXT,                 -- raw Google Fact Check publisher (auto rows)
  review_rating              TEXT,                 -- raw Google textualRating (auto rows)
  is_ifcn_verified           BOOLEAN,              -- hidden provenance flag (frontend never reads it)
  ingest_method              TEXT DEFAULT 'historical',  -- historical | auto-google-factcheck
  ingested_at                TIMESTAMPTZ DEFAULT now()
);

-- Auto-ingest dedup key: a fact-check URL may only be auto-ingested once.
-- PARTIAL unique index scoped to auto rows only, so the historical corpus
-- (which legitimately contains repeated source_url values) is preserved.
-- Empty source_url is normalised to NULL at insert time; NULLs never collide.
CREATE UNIQUE INDEX IF NOT EXISTS claims_auto_source_url_uniq
  ON claims (source_url)
  WHERE ingest_method = 'auto-google-factcheck' AND source_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS claims_claim_id_idx     ON claims (claim_id);
CREATE INDEX IF NOT EXISTS claims_source_url_idx    ON claims (source_url);
CREATE INDEX IF NOT EXISTS claims_actor_idx        ON claims (actor);
CREATE INDEX IF NOT EXISTS claims_country_idx      ON claims (country);
CREATE INDEX IF NOT EXISTS claims_verdict_idx      ON claims (verdict);
CREATE INDEX IF NOT EXISTS claims_source_date_idx  ON claims (source_date);
CREATE INDEX IF NOT EXISTS claims_topic_idx        ON claims (topic_tag);
CREATE INDEX IF NOT EXISTS claims_status_idx       ON claims (claim_status);
CREATE INDEX IF NOT EXISTS claims_method_idx       ON claims (ingest_method);

-- ---------------------------------------------------------------------------
-- figures : the 493 tracked people -> become Google Fact Check search queries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS figures (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  slug      TEXT UNIQUE,
  aliases   TEXT[] DEFAULT '{}',
  country   TEXT,
  category  TEXT,
  active    BOOLEAN DEFAULT true,
  last_swept TIMESTAMPTZ          -- for rotation across hourly runs
);

-- ---------------------------------------------------------------------------
-- fact_checkers : the allowlist. is_ifcn_verified gates auto-verdict (method B)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fact_checkers (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  site             TEXT,
  is_ifcn_verified BOOLEAN DEFAULT false,
  notes            TEXT
);
-- Case-sensitive on exact name: the corpus treats 'PolitiFact' and
-- 'Politifact' as distinct display labels (frontend checker count = 167).
CREATE UNIQUE INDEX IF NOT EXISTS fact_checkers_name_uniq ON fact_checkers (name);

-- ---------------------------------------------------------------------------
-- ingestion_log : full audit trail, one row per cron run
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_log (
  id                  SERIAL PRIMARY KEY,
  run_at              TIMESTAMPTZ DEFAULT now(),
  queries_run         INT DEFAULT 0,
  reviews_found       INT DEFAULT 0,
  inserted            INT DEFAULT 0,
  skipped_dupe        INT DEFAULT 0,
  rejected_unverified INT DEFAULT 0,
  flagged_legal       INT DEFAULT 0,
  errors              TEXT
);
