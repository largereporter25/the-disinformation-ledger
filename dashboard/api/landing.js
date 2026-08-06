// GET / — crawler-visible landing document.
//
// The React application still loads the frozen dashboard snapshot and overlays
// /api/live after hydration. This small server-rendered shell deliberately
// queries the same source of truth before sending HTML, so search/social
// crawlers receive the current headline figures without executing JavaScript.

import { db, dbEnabled } from "./_db.js";

const SITE_URL = "https://disinformation-ledger.vercel.app/";
const IMAGE_URL = `${SITE_URL}og_featured.jpg`;

// Used only when a database is intentionally not configured, such as a local
// static preview. Production has DATABASE_URL and always uses the live query.
const FALLBACK_KPI = {
  total_claims: 104217,
  countries: 14,
  tracked_leaders: 493,
  checkers: 167,
};

function fmt(value) {
  return Number(value || 0).toLocaleString("en-US");
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

function documentFor(kpi) {
  const claims = fmt(kpi.total_claims);
  const figures = fmt(kpi.tracked_leaders);
  const description = `An investigative accountability database of ${claims} fact-checked political disinformation claims across ${kpi.countries} countries and ${figures} tracked figures. Every verdict is attributed to a named independent fact-checker.`;
  const title = `The Disinformation Ledger — ${claims} fact-checked claims across ${kpi.countries} countries`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${SITE_URL}">
    <meta property="og:title" content="The Disinformation Ledger — Know Your Liars">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}">
    <meta property="og:site_name" content="The Disinformation Ledger">
    <meta property="og:image" content="${IMAGE_URL}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="The Disinformation Ledger">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="The Disinformation Ledger — Know Your Liars">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${IMAGE_URL}">
    <meta name="twitter:image:alt" content="The Disinformation Ledger">
    <link rel="stylesheet" href="/assets/app.css">
    <style>
      .crawler-shell{max-width:1120px;margin:0 auto;padding:4rem 1.5rem 5rem;font-family:Arial,sans-serif;color:#1a1a1a;background:#efe9da}
      .crawler-kicker{color:#a72d28;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
      .crawler-shell h1{max-width:760px;font:600 clamp(3rem,8vw,7rem)/.95 Georgia,serif;margin:.65rem 0 1.5rem}
      .crawler-shell p{max-width:760px;font-size:1.1rem;line-height:1.6}
      .crawler-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:1px;margin-top:2.5rem;background:#b8b1a5}
      .crawler-stats div{padding:1rem;background:#fff}
      .crawler-stats dt{font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
      .crawler-stats dd{margin:.4rem 0 0;font:600 2rem/1 Georgia,serif}
    </style>
  </head>
  <body>
    <div id="root">
      <main class="crawler-shell">
        <p class="crawler-kicker">The Disinformation Ledger · Investigative accountability</p>
        <h1>Know Your Liars.</h1>
        <p>${description} We compile, we do not adjudicate.</p>
        <dl class="crawler-stats" aria-label="Ledger headline statistics">
          <div><dt>Claims logged</dt><dd>${claims}</dd></div>
          <div><dt>Countries</dt><dd>${kpi.countries}</dd></div>
          <div><dt>Tracked figures</dt><dd>${figures}</dd></div>
          <div><dt>Fact-checkers</dt><dd>${fmt(kpi.checkers)}</dd></div>
        </dl>
      </main>
    </div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`;
}

export default async function handler(req, res) {
  const kpi = await loadKpi();
  // Ingestion runs every six hours. A short shared cache gives the function
  // room to absorb crawler traffic while exposing new post-ingestion totals
  // without a separate deployment or any change to the ingestion contract.
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(documentFor(kpi));
}
