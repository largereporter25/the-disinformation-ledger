# Global Disinformation Ledger — Dashboard Rebuild Spec

## Mission (must be visible in the UI tagline)
"Making the fact-checks travel faster than the lies." This is an investigative-journalism accountability tool. It amplifies VERIFIED THIRD-PARTY FACT-CHECKS of political disinformation. It NEVER adjudicates claims itself — every verdict is attributed to a named fact-checker with a working link.

## Project location
- Existing project: `/home/user/workspace/dashboard/` (Vite + React 18 + Recharts, already scaffolded).
- REBUILD it comprehensively. Keep the stack (Vite/React/Recharts). You may rewrite App.jsx, styles.css, Charts.jsx, lib.js, main.jsx freely.
- Data is at `dashboard/public/data.json` (already written, 1.7MB). Portraits at `dashboard/public/portraits/*.png` (39 files).
- Deploy target: Vercel project "dist" (live at https://disinformation-ledger.vercel.app). Use `deploy_website` for preview; do NOT publish.

## data.json shape
```
{
  kpi: { total_claims:1656, countries:8, tracked_leaders:41, total_views:39465940020, total_reposts:62041844, total_likes:5167100, checkers:202 },
  claims: [ { id, date, actor, person, country, category, claim, topic, platform, post_url, archived_url,
              verdict, verdict_source, source_url, source_date, views, reposts, likes, platform_corrected,
              status, impact, notes } , ... 1656 items ],
  leaders: [ { name, img, country, claims, views, reposts, likes, category, checkers[], top_topics[], slug,
               monogram?, match_actor? } , ... 41 items, sorted by claims desc ],
  filters: { countries[], checkers[], topics[] },
  by_country:{}, by_checker:{}, by_topic:{}, by_year:{}
}
```
- `person` on a claim = canonical leader name when that claim belongs to a tracked leader (else null).
- `leaders` with `img:null` are placeholders (Amit Malviya, Rishi Bagree) — render a monogram tile (use `monogram`), NEVER a fake face. Their claims are matched via `person === leader.name`.
- `img` is a path like `portraits/Donald_Trump.png` (served from public/).

## REQUIRED FEATURES (all mandatory)

### 1. "Know Your ~~Leaders~~ Liars" board (hero section)
- Section title literally: **Know Your** then **Leaders** with strikethrough, then **Liars** (e.g. `Know Your <s>Leaders</s> Liars`). Use real HTML strikethrough on "Leaders". This is the signature element — make it bold and editorial.
- Grid of all 41 leader portrait cards (responsive: 2 cols mobile → 6+ cols desktop). Each card: stylised portrait (or monogram), name, country flag/label, claim count, and total reach.
- Sorted by claim count desc. Trump, Musk, Yaxley-Lennon (Tommy Robinson), Farage lead.
- **Clicking any portrait routes to that leader's filtered, searchable claims view** (see #2). This is mandatory.

### 2. Per-leader claims view (routing)
- Clicking a leader filters the claims explorer to that person (`claim.person === leader.name`, or for placeholders `claim.actor === leader.match_actor`).
- Shows a leader header (portrait, name, country, totals: claims / views / reposts / likes / list of fact-checkers used) then the searchable claim list.
- Use hash routing (wouter or simple state) — remember sites deploy in an iframe, hash routing only.

### 3. Searchable claims explorer
- Full-text search across claim text, actor, topic, verdict.
- Filters: Country (8), Fact-checker source, Topic, Verdict, Year. Multi-select or dropdowns.
- Each claim row/card shows: the CLAIM (verbatim), the VERDICT prominently, the named fact-checker (verdict_source), date, platform, country, reach metrics.
- **The fact-check link**: every claim with a `source_url` MUST render a working clickable link labelled with the checker name (e.g. "Verified by PolitiFact →") that opens `source_url` in a new tab. The verdict + checker must be MORE prominent than the raw claim — mission is fact-checks travel faster than lies.
- Claims with empty verdict_source / verdict == "unverified — no published check": render an honest "Unverified — no published fact-check" badge, NO fake link. (These are 41 UK rows, by design.)
- Also surface `post_url` and `archived_url` as secondary links when present.

### 4. Reach metrics (proper, throughout)
- Global KPI strip up top: Total claims, Countries, Tracked leaders, Total views (39.5B — format as 39.5B), Total reposts, Total likes, Fact-checkers count.
- Reach shown per leader and per claim. Format big numbers (1.2B, 340M, 12K). Many claims have null reach — show "—" or hide gracefully, never "null" or "0" noise.
- A "reach leaderboard" chart (top leaders by total views) is desirable.

### 5. Charts (Recharts)
- Claims by country (bar). Claims by year (area/line trend). Top fact-checkers (bar). Top topics (bar). Reach by leader (bar). Make them responsive and on-brand.

### 6. Responsive — MANDATORY mobile + desktop
- Must look excellent on phone (375px) AND desktop (1280px+). Test both with Playwright screenshots before deploying.
- Leader grid reflows, filters collapse to a drawer/accordion on mobile, claim cards stack, charts resize, no horizontal scroll, tap targets >=44px.

## ART DIRECTION
- Editorial investigative-newsroom aesthetic matching the portraits: off-white paper background (#f4f1ea-ish), deep charcoal ink (#1a1a1a), single crimson-red accent (#b91c1c / the portrait red). Halftone/print texture vibe. Serious, documentary, high-contrast.
- Strong typography: a characterful serif or grotesk display for headlines (e.g. via Fontshare), clean sans for body. Weight contrast.
- The portraits ARE the visual identity — let them carry the design. Generous whitespace, grid-aligned, asymmetric where interesting. NOT generic AI-dashboard look.
- Verdicts color-coded by severity (False/Pants on Fire = red, Misleading = amber, etc.) but tasteful.

## QUALITY BAR
- No text overflow, no broken wraps, no "null"/"undefined" rendered. Inspect Playwright screenshots at 375px and 1280px and fix every issue before deploying.
- Every fact-check link must actually point to the row's `source_url`. Do not invent or rewrite URLs.
- Build: `cd dashboard && npm install && npm run build`, screenshot via Playwright dev server, then `deploy_website(project_path="dashboard/dist", ...)`.

## DELIVERABLE
A deployed preview URL. Report the URL and a short summary of what was built. Do NOT publish to pplx.app and do NOT push to Vercel connector — just deploy_website preview. Hand the Vercel-connector deploy back to the main agent.
