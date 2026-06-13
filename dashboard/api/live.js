// GET /api/live — live overlay for the dashboard front end (no key required).
//
// The dashboard's base payload (public/data.json.gz) is a frozen snapshot of the
// original 104,217-claim corpus. The 6-hourly cron appends NEW fact-checks to the
// database but never touches the original rows. This endpoint returns ONLY what
// has changed since the snapshot:
//   - live KPI totals (recomputed from the DB)
//   - the auto-ingested claims (mapped into the exact front-end claim shape)
//   - per-figure new-claim counts (so board cards bump)
// The front end merges this overlay onto the static base, so headline numbers,
// the Explorer and the Board reflect every ingestion — with no change to style,
// layout, or the fast CDN-served base file.
//
// Tiny + edge-cached: the overlay is only the rows added since launch, so the
// response is a few KB and `s-maxage` lets the CDN absorb traffic between ingests.

import { db, dbEnabled } from "./_db.js";

// Frozen baseline = the snapshot's published headline KPIs (public/data.json `kpi`).
// The dashboard's reach figures (views/reposts/likes) were computed by the build
// script with its own curation rules, so they differ slightly from a raw SQL sum.
// To keep the headline numbers stable and trustworthy, we treat these as the
// baseline and add ONLY the delta contributed by claims ingested after launch.
const BASELINE = {
  total_claims: 104217,
  total_views: 8294379900,
  total_reposts: 951720,
  total_likes: 2923554,
};

// Map a DB claims row to the front-end claim object shape (see src/lib.js / App.jsx).
function rowToFrontClaim(r) {
  return {
    id: `AUTO::${r.id}`,
    date: r.source_date || r.date_claimed || null,
    actor: r.actor || "",
    person: r.actor || "",            // board matches on person===leader.name
    country: r.country || null,
    claim: r.claim_verbatim || "",
    topic: r.topic_tag || null,
    platform: r.platform || "web",
    verdict: r.verdict || r.review_rating || "",
    verdict_source: r.verdict_source || r.publisher || "",
    source_url: r.source_url || null,
    views: Number(r.views || 0),
    reposts: Number(r.reposts || 0),
    likes: Number(r.likes || 0),
    auto: true,                        // marker: ingested after the snapshot
  };
}

export default async function (req, res) {
  // Always answer; if the DB is unavailable the front end just keeps the static base.
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Live on every visit, but let the CDN serve a cached copy for up to 5 min so
  // visitor traffic never hammers the DB. Stale-while-revalidate keeps it instant.
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");

  if (!dbEnabled()) {
    return res.status(200).json({ ok: false, reason: "no_database", kpi: null, claims: [] });
  }

  try {
    const sql = db();

    // Live counts that ARE authoritative + consistent with the snapshot's method.
    const [tot] = await sql.query(`SELECT count(*)::int AS n FROM claims`);
    const [geo] = await sql.query(
      `SELECT count(DISTINCT NULLIF(country,''))::int AS countries FROM claims`);
    const [fc] = await sql.query(
      `SELECT count(DISTINCT NULLIF(verdict_source,''))::int AS checkers FROM claims`);
    const [fig] = await sql.query(`SELECT count(*)::int AS n FROM figures`);

    // Reach DELTA: sum reach over ONLY the post-snapshot (auto-ingested) rows,
    // then add to the baseline. This keeps the headline reach numbers stable
    // (they only grow when new claims carry real reach data).
    const [delta] = await sql.query(
      `SELECT
         COALESCE(sum(views),0)::bigint   AS views,
         COALESCE(sum(reposts),0)::bigint AS reposts,
         COALESCE(sum(likes),0)::bigint   AS likes
       FROM claims WHERE ingest_method = 'auto-google-factcheck'`);

    // Only the rows added after the snapshot (the cron's auto rows). The original
    // 104,217 are already in the static base — never resend them.
    const overlayRows = await sql.query(
      `SELECT id, claim_id, date_claimed, actor, country, actor_category, claim_verbatim,
              topic_tag, platform, post_url, verdict, verdict_source, source_url, source_date,
              views, reposts, likes, claim_status, publisher, review_rating
       FROM claims
       WHERE ingest_method = 'auto-google-factcheck'
       ORDER BY id ASC`);

    const claims = overlayRows.map(rowToFrontClaim);

    // Per-figure new-claim tally so the front end can bump board card counts.
    const byActor = {};
    for (const c of claims) {
      if (!c.actor) continue;
      byActor[c.actor] = (byActor[c.actor] || 0) + 1;
    }

    const kpi = {
      total_claims: tot.n,
      countries: geo.countries,
      tracked_leaders: fig.n,
      total_views: BASELINE.total_views + Number(delta.views),
      total_reposts: BASELINE.total_reposts + Number(delta.reposts),
      total_likes: BASELINE.total_likes + Number(delta.likes),
      checkers: fc.checkers,
    };

    res.status(200).json({
      ok: true,
      generated_at: new Date().toISOString(),
      kpi,
      overlay_count: claims.length,
      by_actor: byActor,
      claims,
    });
  } catch (e) {
    // Soft-fail: the dashboard falls back to the static base on any error.
    res.status(200).json({ ok: false, reason: "error", message: String(e?.message || e), kpi: null, claims: [] });
  }
}
