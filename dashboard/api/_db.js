// Neon Postgres helper for the read API. Returns null when no DATABASE_URL is
// set, so endpoints can fall back to the static-JSON path unchanged.
import { neon } from "@neondatabase/serverless";

let _sql = null;
export function db() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _sql = neon(url);
  return _sql;
}

export function dbEnabled() {
  return !!process.env.DATABASE_URL;
}

// Map a SQL row back to the public API claim shape (matches static JSON output).
export function rowToClaim(r) {
  return {
    claim_id: r.claim_id,
    date_claimed: r.date_claimed,
    actor: r.actor,
    country: r.country,
    actor_category: r.actor_category,
    claim_verbatim: r.claim_verbatim,
    topic_tag: r.topic_tag,
    platform: r.platform,
    post_url: r.post_url,
    archived_url: r.archived_url,
    verdict: r.verdict,
    verdict_source: r.verdict_source,
    source_url: r.source_url,
    source_date: r.source_date,
    views: r.views,
    reposts: r.reposts,
    likes: r.likes,
    claim_status: r.claim_status,
    electoral_political_impact: r.electoral_political_impact,
  };
}
