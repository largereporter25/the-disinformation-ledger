// GET /api — human-readable API documentation landing page (no key required).
export default function (req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
  res.status(200).send(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>API — The Disinformation Ledger</title>
<style>
:root{--paper:#efe9da;--ink:#1a1a1a;--crimson:#b3322a;--muted:#6b6358}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 ui-monospace,"IBM Plex Mono",Menlo,monospace;padding:0}
.wrap{max-width:860px;margin:0 auto;padding:48px 24px 96px}
h1{font:700 34px/1.1 Georgia,serif;margin:0 0 6px}h2{font:700 20px/1.2 Georgia,serif;margin:38px 0 10px;border-bottom:2px solid var(--ink);padding-bottom:6px}
.tag{color:var(--crimson);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700}
code,pre{font-family:ui-monospace,"IBM Plex Mono",monospace}
pre{background:#fff;border:1px solid #d9d2c4;border-radius:8px;padding:14px 16px;overflow:auto;font-size:13.5px}
.key{background:#1a1a1a;color:#efe9da;padding:3px 8px;border-radius:5px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}td,th{text-align:left;padding:7px 10px;border-bottom:1px solid #d9d2c4;vertical-align:top}
a{color:var(--crimson)}.muted{color:var(--muted)}.pill{display:inline-block;background:#fff;border:1px solid #d9d2c4;border-radius:999px;padding:2px 10px;margin:2px 4px 2px 0;font-size:12.5px}
</style></head><body><div class="wrap">
<div class="tag">The Disinformation Ledger · Public Read API v1</div>
<h1>Query 104,217 fact-checked claims</h1>
<p class="muted">A free, read-only JSON API over the full Disinformation Ledger corpus — 14 countries, 493 tracked figures, 167 named fact-checkers. Built for OSINT investigators, journalists, and researchers. Every record links to a named third-party fact-check. We compile; we never adjudicate.</p>

<h2>Authentication</h2>
<p>Every request needs an API key. Pass it any of three ways:</p>
<pre>?key=YOUR_KEY            # query parameter
X-API-Key: YOUR_KEY      # request header
Authorization: Bearer YOUR_KEY</pre>
<p>Public OSINT investigator key:</p>
<pre><span class="key">dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e</span></pre>
<p class="muted">This shared read key is rate-friendly and intended for research use. Need a dedicated key or higher limits? Contact the editor-in-chief.</p>

<h2>Endpoints</h2>
<table>
<tr><th>Endpoint</th><th>Description</th></tr>
<tr><td><code>GET /api/v1/meta</code></td><td>Dataset metadata + every valid filter value (countries, checkers, verdicts, topics, years, actors) and the shard index.</td></tr>
<tr><td><code>GET /api/v1/claims</code></td><td>Filtered query over the full corpus. Filters: <code>country</code>, <code>actor</code>, <code>checker</code>, <code>verdict</code>, <code>topic</code>, <code>year</code>, <code>q</code> (full-text). Paginate with <code>limit</code> (max 1000) + <code>offset</code>. Sort with <code>sort=reach|date</code>.</td></tr>
<tr><td><code>GET /api/v1/stats</code></td><td>Aggregate rollups (by verdict / checker / topic / actor / year). Optional <code>country</code> narrows to one nation.</td></tr>
<tr><td><code>GET /dataset/all.ndjson.gz</code></td><td>Bulk download — the entire corpus gzipped, one JSON object per line (11 MB compressed, ~68 MB raw). No key required. Decompress with <code>gunzip</code>.</td></tr>
</table>

<h2>Examples</h2>
<pre># All US "false"-rated claims, biggest reach first
curl "https://disinformation-ledger.vercel.app/api/v1/claims?key=YOUR_KEY&country=United%20States&verdict=false&sort=reach&limit=50"

# Everything Full Fact has debunked
curl "https://disinformation-ledger.vercel.app/api/v1/claims?key=YOUR_KEY&checker=Full%20Fact"

# Full-text search across the corpus
curl "https://disinformation-ledger.vercel.app/api/v1/claims?key=YOUR_KEY&q=grooming%20gangs"

# India verdict breakdown
curl "https://disinformation-ledger.vercel.app/api/v1/stats?key=YOUR_KEY&country=India"

# Discover valid filter values
curl "https://disinformation-ledger.vercel.app/api/v1/meta?key=YOUR_KEY"</pre>

<h2>Record schema</h2>
<p><span class="pill">claim_id</span><span class="pill">date_claimed</span><span class="pill">actor</span><span class="pill">country</span><span class="pill">actor_category</span><span class="pill">claim_verbatim</span><span class="pill">topic_tag</span><span class="pill">platform</span><span class="pill">post_url</span><span class="pill">archived_url</span><span class="pill">verdict</span><span class="pill">verdict_source</span><span class="pill">source_url</span><span class="pill">source_date</span><span class="pill">views</span><span class="pill">reposts</span><span class="pill">likes</span><span class="pill">claim_status</span><span class="pill">electoral_political_impact</span></p>

<h2>License &amp; attribution</h2>
<p>Dataset licensed <strong>CC&nbsp;BY-NC&nbsp;4.0</strong>. Free for non-commercial research and journalism with attribution: <em>"The Disinformation Ledger — Vansh Kunal Shah (editor-in-chief)."</em> The verdict in every row belongs to the cited third-party fact-checker; cite them too. See <a href="/">the dashboard</a> for the full methodology.</p>
<p class="muted">← <a href="/">Back to the Ledger</a></p>
</div></body></html>`);
};
