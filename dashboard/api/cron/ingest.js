// Hourly ingestion worker — the "strict method" engine.
// GET /api/cron/ingest  (triggered by Vercel Cron; protected by CRON_SECRET)
//
// For a rotating slice of tracked figures, queries the Google Fact Check Tools
// API. INGESTION POLICY = ALL CHECKERS (method A):
//   - EVERY published fact-check is ingested WITH its verdict, regardless of
//     whether the publisher is IFCN-verified.
//   - is_ifcn_verified is recorded as a hidden provenance flag on each row
//     (audit/filtering only; the frontend never reads it).
//   - text matches active legal-proceedings -> forced pending_review (no verdict)
//     [retained UK contempt/defamation guardrail].
//   - source_url already present             -> skip (dedup)
// Writes one ingestion_log row per run. Never adjudicates; the cited checker carries the verdict.

import { db, dbEnabled } from "../_db.js";

const GOOGLE_KEY = process.env.GOOGLE_FACTCHECK_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
// Every 6h = 4 runs/day. Default to a generous slice so all 493 figures are
// swept within a day; tune via env if Google quota becomes a constraint.
const FIGURES_PER_RUN = parseInt(process.env.INGEST_FIGURES_PER_RUN || "150", 10);
const MAX_AGE_DAYS = parseInt(process.env.INGEST_MAX_AGE_DAYS || "14", 10);

// Active-legal-proceedings tripwires -> force human review (UK contempt/defamation posture).
const LEGAL_KEYWORDS = [
  "sub judice", "on trial", "stands trial", "awaiting trial", "trial begins",
  "charged with", "facing charges", "court case", "ongoing case", "active proceedings",
  "defamation case", "libel case", "lawsuit", "sued for", "being prosecuted",
  "pending appeal", "ongoing trial", "criminal proceedings", "remanded",
];

function authorized(req) {
  if (!CRON_SECRET) return true; // allow local testing when unset
  const h = req.headers["authorization"] || "";
  if (h === `Bearer ${CRON_SECRET}`) return true;
  try {
    const u = new URL(req.url, "http://x");
    return u.searchParams.get("secret") === CRON_SECRET;
  } catch { return false; }
}

function hasLegalFlag(text) {
  const t = (text || "").toLowerCase();
  return LEGAL_KEYWORDS.some((k) => t.includes(k));
}

async function googleFactCheck(query) {
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&languageCode=en&pageSize=10&maxAgeDays=${MAX_AGE_DAYS}&key=${GOOGLE_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`google ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.claims || [];
}

export default async function (req, res) {
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });
  if (!dbEnabled()) return res.status(503).json({ error: "no_database", message: "DATABASE_URL not set" });
  if (!GOOGLE_KEY) return res.status(503).json({ error: "no_api_key", message: "GOOGLE_FACTCHECK_API_KEY not set" });

  const sql = db();
  const log = { queries_run: 0, reviews_found: 0, inserted: 0, skipped_dupe: 0, rejected_unverified: 0, flagged_legal: 0, errors: [] };

  try {
    // Load the IFCN allowlist (verified publishers) once.
    // Normalise names so publisher variants match (e.g. "Snopes" vs "Snopes.com",
    // "AFP Fact Check" vs "afpfactcheck"): strip non-alphanumerics + common suffixes.
    const normName = (s) => (s || "").toLowerCase()
      .replace(/\.(com|org|net|info|io|co\.uk|es|fr|de|in|eu)$/g, "")
      .replace(/[^a-z0-9]/g, "");
    const allow = new Set(
      (await sql.query(`SELECT name, COALESCE(site,'') AS site FROM fact_checkers WHERE is_ifcn_verified = true`))
        .flatMap((r) => [normName(r.name), normName(r.site)].filter(Boolean))
    );

    // Rotate: pick the least-recently-swept active figures.
    const figures = await sql.query(
      `SELECT id, name, aliases FROM figures WHERE active = true
       ORDER BY last_swept NULLS FIRST, id LIMIT ${FIGURES_PER_RUN}`);

    for (const fig of figures) {
      const queries = [fig.name, ...(fig.aliases || [])].filter(Boolean).slice(0, 2); // name + one alias
      for (const q of queries) {
        log.queries_run++;
        let reviews;
        try { reviews = await googleFactCheck(q); }
        catch (e) { log.errors.push(`${q}: ${e.message}`); continue; }

        for (const claim of reviews) {
          for (const rv of (claim.claimReview || [])) {
            log.reviews_found++;
            const srcUrl = rv.url || "";
            if (!srcUrl) continue;

            // Dedup on source_url.
            const dup = await sql.query(`SELECT 1 FROM claims WHERE source_url = $1 LIMIT 1`, [srcUrl]);
            if (dup.length) { log.skipped_dupe++; continue; }

            const publisher = rv.publisher?.name || "";
            const site = rv.publisher?.site || "";
            const isVerified = allow.has(normName(publisher)) || (site && allow.has(normName(site)));
            const legal = hasLegalFlag(claim.text) || hasLegalFlag(rv.title);

            // POLICY A (all checkers): every check keeps its verdict, verified or not.
            // Legal guardrail still forces human review (no verdict) for active proceedings.
            let claim_status, verdict;
            if (legal) { claim_status = "pending_review"; verdict = null; log.flagged_legal++; }
            else { claim_status = "auto"; verdict = rv.textualRating || null; }
            if (!isVerified) log.rejected_unverified++; // now just a provenance counter, not a rejection

            const claimId = `AUTO::${Date.now()}::${Math.random().toString(36).slice(2, 8)}`;
            const reviewDate = rv.reviewDate ? rv.reviewDate.slice(0, 10) : null;

            try {
              await sql.query(
                `INSERT INTO claims
                   (claim_id, date_claimed, actor, country, actor_category, claim_verbatim,
                    topic_tag, platform, post_url, verdict, verdict_source, source_url, source_date,
                    claim_status, publisher, review_rating, is_ifcn_verified, ingest_method)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'auto-google-factcheck')
                 ON CONFLICT (source_url) WHERE ingest_method = 'auto-google-factcheck' AND source_url IS NOT NULL DO NOTHING`,
                [claimId, reviewDate, fig.name, null, "Tracked figure", claim.text || "",
                 null, "web", claim.claimant || null, verdict, publisher, srcUrl, reviewDate,
                 claim_status, publisher, rv.textualRating || null, isVerified]
              );
              log.inserted++;
            } catch (e) { log.errors.push(`insert ${srcUrl}: ${e.message}`); }
          }
        }
      }
      await sql.query(`UPDATE figures SET last_swept = now() WHERE id = $1`, [fig.id]);
    }

    const errText = log.errors.length ? log.errors.slice(0, 20).join(" | ") : null;
    await sql.query(
      `INSERT INTO ingestion_log (queries_run, reviews_found, inserted, skipped_dupe, rejected_unverified, flagged_legal, errors)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [log.queries_run, log.reviews_found, log.inserted, log.skipped_dupe, log.rejected_unverified, log.flagged_legal, errText]
    );

    res.status(200).json({ ok: true, ...log, errors: log.errors.slice(0, 20) });
  } catch (e) {
    res.status(500).json({ error: "ingest_failed", message: String(e?.message || e), partial: log });
  }
}
