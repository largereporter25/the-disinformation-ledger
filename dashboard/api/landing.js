// GET / — crawler-visible landing document.
//
// The React application still loads the frozen dashboard snapshot and overlays
// /api/live after hydration, so a crawler that does not execute JavaScript sees
// only whatever counts were frozen into the built index.html at build time.
//
// This function takes the real built index.html as its single source of truth,
// rewrites the count-bearing metadata with figures queried from the same
// database the dashboard uses, and injects a plain-HTML headline stat block
// into #root. Because the shell is read from the deployed build rather than
// re-declared here, Vite keeps its content-hashed asset filenames and the
// long-lived immutable caching that depends on them.
//
// Every failure path falls back to serving the unmodified built shell, so this
// function can never take the homepage down.

import { db, dbEnabled } from "./_db.js";

const SITE_URL = "https://disinformation-ledger.vercel.app/";
const IMAGE_URL = `${SITE_URL}og_featured.jpg`;
const SITE_NAME = "The Disinformation Ledger";

// Used only when a database is intentionally not configured, such as a local
// static preview. Production has DATABASE_URL and always uses the live query.
const FALLBACK_KPI = {
  total_claims: 104217,
  countries: 14,
  tracked_leaders: 493,
  checkers: 167,
};

const SHELL_STYLE = `<style>
      .crawler-shell{max-width:1120px;margin:0 auto;padding:4rem 1.5rem 5rem;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a}
      .crawler-kicker{color:#a72d28;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
      .crawler-shell h1{max-width:760px;font:600 clamp(2.5rem,7vw,5.5rem)/.98 Georgia,serif;margin:.65rem 0 1.25rem}
      .crawler-shell p{max-width:760px;font-size:1.05rem;line-height:1.6}
      .crawler-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:1px;margin-top:2.5rem;background:#b8b1a5}
      .crawler-stats div{padding:1rem;background:#fff}
      .crawler-stats dt{font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .crawler-stats dd{margin:.4rem 0 0;font:600 2rem/1 Georgia,serif}
    </style>`;

function fmt(value) {
  return Number(value || 0).toLocaleString("en-US");
}

// Metadata and visible copy are attribute/HTML values, so escape before
// interpolating even though every input here is a database-derived integer.
function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadKpi() {
  if (!dbEnabled()) return FALLBACK_KPI;

  try {
    const sql = db();
    const [total] = await sql.query(`SELECT count(*)::int AS n FROM claims`);
    const [countries] = await sql.query(
      `SELECT count(DISTINCT NULLIF(country,''))::int AS n FROM claims`,
    );
    const [figures] = await sql.query(`SELECT count(*)::int AS n FROM figures`);
    const [checkers] = await sql.query(
      `SELECT count(DISTINCT NULLIF(verdict_source,''))::int AS n FROM claims`,
    );
    return {
      total_claims: total.n,
      countries: countries.n,
      tracked_leaders: figures.n,
      checkers: checkers.n,
    };
  } catch {
    // Keep the homepage indexable if a transient database request fails. The
    // React app retains its existing /api/live fallback behavior as well.
    return FALLBACK_KPI;
  }
}

// The built shell is immutable for the lifetime of a deployment, so a warm
// container only ever fetches it once per origin.
const shellCache = new Map();

function shellOrigin(req) {
  // LANDING_SHELL_ORIGIN exists for local `vite preview` runs.
  if (process.env.LANDING_SHELL_ORIGIN) return process.env.LANDING_SHELL_ORIGIN;

  // Derive the origin from the request that reached us. Deliberately NOT
  // VERCEL_URL: that is the deployment-specific host, which Vercel Deployment
  // Protection refuses anonymous requests to, so fetching it from inside the
  // function fails even in production. The inbound host is the alias the
  // crawler actually used, and is therefore reachable by definition.
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  if (host) {
    const proto = req.headers["x-forwarded-proto"]?.split(",")[0] || "https";
    return `${proto}://${host}`;
  }
  return process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : SITE_URL;
}

async function loadShell(req) {
  const origin = shellOrigin(req);
  const cached = shellCache.get(origin);
  if (cached) return cached;
  const res = await fetch(new URL("/index.html", origin), {
    headers: { accept: "text/html" },
  });
  if (!res.ok) throw new Error(`shell fetch failed: ${res.status}`);
  const html = await res.text();
  if (!html.includes('id="root"')) throw new Error("shell missing #root");
  shellCache.set(origin, html);
  return html;
}

function replaceAttr(html, matcher, value) {
  return html.replace(matcher, (match) =>
    match.replace(/content="[^"]*"/, `content="${value}"`),
  );
}

function inject(shell, kpi) {
  const claims = fmt(kpi.total_claims);
  const figures = fmt(kpi.tracked_leaders);
  const countries = esc(kpi.countries);
  const description = esc(
    `An investigative accountability database of ${claims} fact-checked political ` +
      `disinformation claims across ${kpi.countries} countries and ${figures} tracked ` +
      `figures. Every verdict is attributed to a named independent fact-checker with a ` +
      `working link. We compile; we never adjudicate.`,
  );
  const social = esc(
    `${claims} documented claims · ${kpi.countries} countries · ${figures} tracked figures · ` +
      `${fmt(kpi.checkers)} named fact-checkers · every verdict cited to a named fact-checker.`,
  );
  const title = esc(
    `${SITE_NAME} — ${claims} fact-checked claims across ${kpi.countries} countries`,
  );

  let out = shell;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  out = replaceAttr(out, /<meta\s+name="description"\s+content="[^"]*"/i, description);
  out = replaceAttr(out, /<meta\s+property="og:title"\s+content="[^"]*"/i,
    esc(`${SITE_NAME} — Know Your Liars`));
  out = replaceAttr(out, /<meta\s+property="og:description"\s+content="[^"]*"/i, social);
  out = replaceAttr(out, /<meta\s+property="og:url"\s+content="[^"]*"/i, SITE_URL);
  out = replaceAttr(out, /<meta\s+property="og:image"\s+content="[^"]*"/i, IMAGE_URL);
  out = replaceAttr(out, /<meta\s+property="og:image:alt"\s+content="[^"]*"/i,
    esc(`${SITE_NAME} — ${claims} fact-checked claims across ${kpi.countries} countries`));
  out = replaceAttr(out, /<meta\s+name="twitter:card"\s+content="[^"]*"/i, "summary_large_image");
  out = replaceAttr(out, /<meta\s+name="twitter:title"\s+content="[^"]*"/i,
    esc(`${SITE_NAME} — Know Your Liars`));
  out = replaceAttr(out, /<meta\s+name="twitter:description"\s+content="[^"]*"/i, social);
  out = replaceAttr(out, /<meta\s+name="twitter:image"\s+content="[^"]*"/i, IMAGE_URL);

  if (!/property="og:site_name"/i.test(out)) {
    out = out.replace(
      /(<meta\s+property="og:type"[^>]*>)/i,
      `<meta property="og:site_name" content="${SITE_NAME}" />\n    $1`,
    );
  }
  if (!/name="twitter:image:alt"/i.test(out)) {
    out = out.replace(
      /(<meta\s+name="twitter:image"[^>]*>)/i,
      `$1\n    <meta name="twitter:image:alt" content="${SITE_NAME}" />`,
    );
  }
  if (!/rel="canonical"/i.test(out)) {
    out = out.replace(/(<\/head>)/i, `  <link rel="canonical" href="${SITE_URL}" />\n  $1`);
  }

  out = out.replace(/(<\/head>)/i, `  ${SHELL_STYLE}\n  $1`);

  const markup = `<main class="crawler-shell">
        <p class="crawler-kicker">${SITE_NAME} · Investigative accountability</p>
        <h1>Know Your Liars.</h1>
        <p>${description}</p>
        <dl class="crawler-stats" aria-label="Ledger headline statistics">
          <div><dt>Claims logged</dt><dd>${claims}</dd></div>
          <div><dt>Countries</dt><dd>${countries}</dd></div>
          <div><dt>Tracked figures</dt><dd>${figures}</dd></div>
          <div><dt>Fact-checkers</dt><dd>${fmt(kpi.checkers)}</dd></div>
        </dl>
      </main>`;

  // React's createRoot().render() replaces these children on hydration, so the
  // block is only ever seen by clients that do not run JavaScript.
  const injected = out.replace(
    /(<div id="root"\s*>)\s*(<\/div>)/i,
    `$1\n      ${markup}\n    $2`,
  );
  if (injected === out) throw new Error("could not inject stat block into #root");

  return injected;
}

export default async function handler(req, res) {
  let shell;
  try {
    shell = await loadShell(req);
  } catch {
    // Cannot reach the built shell — let Vercel serve the static file instead
    // of returning a broken homepage.
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
    res.redirect(307, "/index.html");
    return;
  }

  let html = shell;
  try {
    html = inject(shell, await loadKpi());
  } catch {
    // Built markup changed shape. Serve it unmodified: stale metadata is a far
    // smaller problem than an unstyled or missing homepage.
    html = shell;
  }

  // Ingestion runs every six hours. A short shared cache absorbs crawler
  // traffic while surfacing new post-ingestion totals without a redeploy and
  // without touching the ingestion contract.
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
