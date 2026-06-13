// Probe: time + size of building the full dashboard payload from the DB.
import { neon } from "@neondatabase/serverless";
import { gzipSync } from "node:zlib";

const sql = neon(process.env.DATABASE_URL);
const t0 = Date.now();

const [countRow] = await sql`SELECT count(*)::int AS n FROM claims`;
const total = countRow.n;
const t1 = Date.now();

// pull all claims (only the columns the dashboard renders)
const claims = await sql`
  SELECT claim_id, date_claimed, actor, country, actor_category, claim_verbatim,
         topic_tag, platform, post_url, verdict, verdict_source, source_url,
         source_date, views, reposts, likes, claim_status
  FROM claims`;
const t2 = Date.now();

const raw = JSON.stringify({ total, sample: claims.slice(0,1), claim_count: claims.length });
const fullRaw = JSON.stringify(claims);
const gz = gzipSync(Buffer.from(fullRaw));
const t3 = Date.now();

console.log("total claims:", total);
console.log("count query ms:", t1 - t0);
console.log("pull all claims ms:", t2 - t1);
console.log("claims pulled:", claims.length);
console.log("raw claims JSON MB:", (fullRaw.length/1e6).toFixed(1));
console.log("gzipped claims MB:", (gz.length/1e6).toFixed(2));
console.log("gzip ms:", t3 - t2);
console.log("sample row keys:", Object.keys(claims[0]||{}));
