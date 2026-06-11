// GET /api/v1/claims  — filtered query over the full 104,217-row corpus.
// Auth: API key required (?key= | X-API-Key | Authorization: Bearer).
// Query params:
//   country   (name, e.g. "United States")  — narrows to one shard (fast)
//   actor     (substring match, case-insensitive)
//   checker   (verdict_source substring)
//   verdict   (substring)
//   topic     (topic_tag substring)
//   year      (4-digit, matches date_claimed prefix)
//   q         (full-text substring across claim_verbatim/actor/verdict/checker)
//   limit     (default 100, max 1000)
//   offset    (default 0)
//   sort       ("reach" | "date" | "none")
import { authorize, fetchJson, slugify, norm, toInt } from "../_lib.js";

export default async function (req, res) {
  if (!authorize(req, res)) return;
  try {
    const u = new URL(req.url, "http://x");
    const p = Object.fromEntries(u.searchParams.entries());
    const manifest = await fetchJson(req, "/dataset/manifest.json");

    // Determine which shards to scan.
    let shards = manifest.shards;
    if (p.country) {
      const want = slugify(p.country);
      shards = manifest.shards.filter((s) => s.slug === want || norm(s.country) === norm(p.country));
      if (!shards.length) {
        return res.status(404).json({ error: "unknown_country", country: p.country, available: manifest.shards.map((s) => s.country) });
      }
    }

    const limit = Math.min(toInt(p.limit, 100), 1000);
    const offset = toInt(p.offset, 0);
    const fa = norm(p.actor), fc = norm(p.checker), fv = norm(p.verdict), ft = norm(p.topic), fq = norm(p.q);
    const fy = (p.year || "").trim();

    let pool = [];
    for (const s of shards) {
      const recs = await fetchJson(req, s.file);
      for (const r of recs) {
        if (fa && !norm(r.actor).includes(fa)) continue;
        if (fc && !norm(r.verdict_source).includes(fc)) continue;
        if (fv && !norm(r.verdict).includes(fv)) continue;
        if (ft && !norm(r.topic_tag).includes(ft)) continue;
        if (fy && !String(r.date_claimed || "").startsWith(fy)) continue;
        if (fq) {
          const hay = norm(r.claim_verbatim) + " " + norm(r.actor) + " " + norm(r.verdict) + " " + norm(r.verdict_source) + " " + norm(r.topic_tag);
          if (!hay.includes(fq)) continue;
        }
        pool.push(r);
      }
    }

    if (p.sort === "reach") pool.sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (p.sort === "date") pool.sort((a, b) => String(b.date_claimed).localeCompare(String(a.date_claimed)));

    const total = pool.length;
    const page = pool.slice(offset, offset + limit);
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
    res.status(200).json({
      ok: true,
      query: { country: p.country || null, actor: p.actor || null, checker: p.checker || null, verdict: p.verdict || null, topic: p.topic || null, year: p.year || null, q: p.q || null, sort: p.sort || "none" },
      total_matched: total,
      returned: page.length,
      limit, offset,
      next_offset: offset + limit < total ? offset + limit : null,
      license: manifest.license,
      attribution: manifest.attribution,
      results: page,
    });
  } catch (e) {
    res.status(500).json({ error: "server_error", message: String(e && e.message || e) });
  }
};
