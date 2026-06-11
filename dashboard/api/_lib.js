// Shared helpers for The Disinformation Ledger public read API (v1).
// Data is served as static shards from the same deployment's CDN; these
// functions fetch the relevant shard(s) over HTTP and filter in memory.
// ESM module (project package.json has "type": "module").

// Issued read keys. The "demo" key is the public OSINT-investigator key shipped
// with the project; additional keys can be added here without redeploying logic.
export const VALID_KEYS = new Set([
  "dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e", // public OSINT read key
]);

function getKey(req) {
  const h = req.headers["x-api-key"] || req.headers["X-API-Key"];
  if (h) return String(h).trim();
  const auth = req.headers["authorization"] || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  try {
    const u = new URL(req.url, "http://x");
    const q = u.searchParams.get("key") || u.searchParams.get("api_key");
    if (q) return q.trim();
  } catch (e) {}
  return null;
}

export function authorize(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return false; }
  const key = getKey(req);
  if (!key || !VALID_KEYS.has(key)) {
    res.status(401).json({
      error: "unauthorized",
      message: "Provide a valid API key via the ?key= query param, the X-API-Key header, or an Authorization: Bearer header. Request access or see docs at /api.",
      docs: "/api",
    });
    return false;
  }
  return true;
}

export function baseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

export async function fetchJson(req, path) {
  const r = await fetch(`${baseUrl(req)}${path}`);
  if (!r.ok) throw new Error(`fetch ${path} -> ${r.status}`);
  return r.json();
}

export function toInt(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
export function norm(s) { return String(s || "").toLowerCase(); }
export function slugify(s) {
  return String(s || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}
