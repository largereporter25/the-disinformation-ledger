// GET /api/v1/stats — aggregate counts. Optional ?country= narrows to one nation.
// Without country, returns the corpus-wide rollups straight from the manifest.
import { authorize, fetchJson, slugify, norm } from "../_lib.js";

function tally(recs, field) {
  const m = {};
  for (const r of recs) { const k = r[field] || "(none)"; m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
}

export default async function (req, res) {
  if (!authorize(req, res)) return;
  try {
    const u = new URL(req.url, "http://x");
    const country = u.searchParams.get("country");
    const manifest = await fetchJson(req, "/dataset/manifest.json");

    if (!country) {
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
      return res.status(200).json({
        ok: true, scope: "global",
        total_claims: manifest.total_claims,
        by_country: manifest.countries,
        by_verdict: manifest.verdicts,
        by_checker: manifest.checkers.slice(0, 50),
        by_topic: manifest.topics.slice(0, 50),
        by_year: manifest.years,
        top_actors: manifest.top_actors.slice(0, 50),
        license: manifest.license, attribution: manifest.attribution,
      });
    }

    const want = slugify(country);
    const shard = manifest.shards.find((s) => s.slug === want || norm(s.country) === norm(country));
    if (!shard) return res.status(404).json({ error: "unknown_country", country, available: manifest.shards.map((s) => s.country) });
    const recs = await fetchJson(req, shard.file);
    let views = 0, reposts = 0, likes = 0;
    for (const r of recs) { views += r.views || 0; reposts += r.reposts || 0; likes += r.likes || 0; }

    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
    res.status(200).json({
      ok: true, scope: country, total_claims: recs.length,
      totals: { views, reposts, likes },
      by_verdict: tally(recs, "verdict").slice(0, 40),
      by_checker: tally(recs, "verdict_source").slice(0, 40),
      by_topic: tally(recs, "topic_tag").slice(0, 40),
      by_actor: tally(recs, "actor").slice(0, 40),
      by_year: tally(recs, "date_claimed").map((d) => ({ value: String(d.value).slice(0, 4), count: d.count }))
        .reduce((acc, x) => { const f = acc.find((a) => a.value === x.value); if (f) f.count += x.count; else if (/^\d{4}$/.test(x.value)) acc.push({ ...x }); return acc; }, [])
        .sort((a, b) => a.value.localeCompare(b.value)),
      license: manifest.license, attribution: manifest.attribution,
    });
  } catch (e) {
    res.status(500).json({ error: "server_error", message: String(e && e.message || e) });
  }
};
