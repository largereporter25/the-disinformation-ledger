// Migration: load 104k historical claims (JSON) + sheet enrichment into Neon.
// Usage: DATABASE_URL=postgres://... node scripts/migrate.mjs [--dry-run]
import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import readline from 'node:readline';

const DRY = process.argv.includes('--dry-run');
const DB = process.env.DATABASE_URL;
if (!DB && !DRY) { console.error('Set DATABASE_URL (or pass --dry-run).'); process.exit(1); }
const sql = DB ? neon(DB) : null;

const NDJSON = 'public/dataset/all.ndjson';
const ENRICH = 'scripts/data/sheet_enrich.json';
const DATAJSON = 'public/data.json';

const toInt = v => (v === null || v === undefined || v === '' ? null : (Number.isFinite(+v) ? Math.trunc(+v) : null));
const clean = v => (v === undefined || v === null ? null : String(v));
const cleanUrl = v => { const s = clean(v); return s && s.trim() ? s : null; }; // '' -> NULL for unique index

async function run() {
  // 1. schema
  if (!DRY) {
    const schema = fs.readFileSync('scripts/schema.sql', 'utf8');
    for (const stmt of schema.split(/;\s*\n/).map(s => s.trim()).filter(Boolean)) {
      await sql.query(stmt);
    }
    console.log('schema applied');
  }

  // 2. enrichment map
  const enrich = JSON.parse(fs.readFileSync(ENRICH, 'utf8'));
  console.log('enrichment rows:', Object.keys(enrich).length);

  // 3. stream claims, batch insert
  const rl = readline.createInterface({ input: fs.createReadStream(NDJSON), crlfDelay: Infinity });
  let batch = [], total = 0, withNotes = 0;
  const BATCH = 500;

  async function flush() {
    if (!batch.length) return;
    if (!DRY) {
      // multi-row parameterized insert
      const cols = ['claim_id','date_claimed','actor','country','actor_category','claim_verbatim',
        'topic_tag','platform','platform_corrected','post_url','archived_url','verdict','verdict_source',
        'source_url','source_date','views','reposts','likes','claim_status','electoral_political_impact',
        'notes','ingest_method'];
      const values = [], params = [];
      batch.forEach((r, i) => {
        const base = i * cols.length;
        values.push('(' + cols.map((_, j) => `$${base + j + 1}`).join(',') + ')');
        params.push(r.claim_id, r.date_claimed, r.actor, r.country, r.actor_category, r.claim_verbatim,
          r.topic_tag, r.platform, r.platform_corrected, r.post_url, r.archived_url, r.verdict, r.verdict_source,
          r.source_url, r.source_date, r.views, r.reposts, r.likes, r.claim_status, r.electoral_political_impact,
          r.notes, 'historical');
      });
      // Surrogate PK (id BIGSERIAL): insert every historical row verbatim,
      // including legitimate repeated claim_id / source_url values, so the
      // frontend KPI total_claims = 104,217 is preserved exactly.
      await sql.query(
        `INSERT INTO claims (${cols.join(',')}) VALUES ${values.join(',')}`,
        params
      );
    }
    total += batch.length;
    batch = [];
  }

  for await (const line of rl) {
    const s = line.trim(); if (!s) continue;
    const r = JSON.parse(s);
    const e = enrich[r.claim_id] || {};
    if (e.notes) withNotes++;
    batch.push({
      claim_id: r.claim_id, date_claimed: clean(r.date_claimed), actor: clean(r.actor),
      country: clean(r.country), actor_category: clean(r.actor_category), claim_verbatim: clean(r.claim_verbatim),
      topic_tag: clean(r.topic_tag), platform: clean(r.platform), platform_corrected: clean(e.platform_corrected) || null,
      post_url: clean(r.post_url), archived_url: clean(r.archived_url), verdict: clean(r.verdict),
      verdict_source: clean(r.verdict_source), source_url: cleanUrl(r.source_url), source_date: clean(r.source_date),
      views: toInt(r.views), reposts: toInt(r.reposts), likes: toInt(r.likes),
      claim_status: clean(r.claim_status), electoral_political_impact: clean(r.electoral_political_impact),
      notes: clean(e.notes) || null,
    });
    if (batch.length >= BATCH) await flush();
  }
  await flush();
  console.log(`claims processed: ${total} (with sheet notes: ${withNotes})`);

  // 4. seed figures from data.json leaders[]
  const data = JSON.parse(fs.readFileSync(DATAJSON, 'utf8'));
  const leaders = data.leaders || [];
  console.log('figures to seed:', leaders.length);
  if (!DRY) {
    for (const L of leaders) {
      await sql.query(
        `INSERT INTO figures (name, slug, aliases, country, category) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (slug) DO NOTHING`,
        [L.name, L.slug, L.aliases || [], L.country || null, L.category || null]
      );
    }
  }

  // 5. seed fact_checkers from data.json by_checker keys + IFCN flag
  const checkers = Object.keys(data.by_checker || {});
  const ifcn = new Set(JSON.parse(fs.readFileSync('scripts/data/ifcn_allowlist.json','utf8')).map(x=>x.toLowerCase()));
  console.log('checkers to seed:', checkers.length, '| IFCN-flagged:', [...ifcn].length);
  if (!DRY) {
    for (const name of checkers) {
      await sql.query(
        `INSERT INTO fact_checkers (name, is_ifcn_verified) VALUES ($1,$2)
         ON CONFLICT (name) DO UPDATE SET is_ifcn_verified = EXCLUDED.is_ifcn_verified`,
        [name, ifcn.has(name.toLowerCase())]
      );
    }
  }

  console.log(DRY ? 'DRY RUN complete — no writes.' : 'MIGRATION complete.');
}
run().catch(e => { console.error(e); process.exit(1); });
