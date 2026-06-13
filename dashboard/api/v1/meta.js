// GET /api/v1/meta — dataset metadata, available filter values, and shard index.
// Auth required. Use this to discover valid country/checker/verdict/topic values.
import { authorize, fetchJson } from "../_lib.js";
import { db, dbEnabled } from "../_db.js";

export default async function (req, res) {
  if (!authorize(req, res)) return;
  try {
    const manifest = await fetchJson(req, "/dataset/manifest.json");
    // When SQL is live, total_claims reflects the (growing) database, not the static snapshot.
    let liveTotal = manifest.total_claims;
    if (dbEnabled()) {
      try { liveTotal = (await db().query(`SELECT count(*)::int AS n FROM claims`))[0]?.n ?? liveTotal; } catch {}
    }
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
    res.status(200).json({
      ok: true,
      dataset: manifest.dataset,
      version: manifest.version,
      total_claims: liveTotal,
      license: manifest.license,
      attribution: manifest.attribution,
      methodology_note: manifest.methodology_note,
      fields: manifest.fields,
      countries: manifest.countries,
      verdicts: manifest.verdicts,
      checkers: manifest.checkers,
      topics: manifest.topics,
      years: manifest.years,
      top_actors: manifest.top_actors,
      shards: manifest.shards,
      endpoints: {
        claims: "/api/v1/claims?key=YOUR_KEY&country=United States&verdict=false&limit=100",
        stats: "/api/v1/stats?key=YOUR_KEY&country=India",
        meta: "/api/v1/meta?key=YOUR_KEY",
        bulk_download: "/dataset/all.ndjson.gz",
      },
    });
  } catch (e) {
    res.status(500).json({ error: "server_error", message: String(e && e.message || e) });
  }
};
