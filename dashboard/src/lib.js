// Data loading + formatting helpers for the Global Disinformation Ledger

export async function loadData() {
  const base = await loadBaseSnapshot();
  // Overlay live data (KPIs + claims ingested since the snapshot) so the
  // headline numbers, Explorer and Board reflect every 6-hourly ingestion.
  // Best-effort: any failure leaves the static base untouched.
  try {
    return await applyLiveOverlay(base);
  } catch (e) {
    return base;
  }
}

// The frozen 104,217-claim snapshot — fast, CDN-served, identical to before.
async function loadBaseSnapshot() {
  // Prefer the gzipped payload (≈7MB vs 42MB raw) and inflate in the browser
  // with the native DecompressionStream. Falls back to raw data.json if the
  // gzip is missing or the browser lacks DecompressionStream.
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const r = await fetch('./data.json.gz');
      if (r.ok && r.body) {
        const ds = new DecompressionStream('gzip');
        const stream = r.body.pipeThrough(ds);
        const text = await new Response(stream).text();
        return JSON.parse(text);
      }
    } catch (e) {
      // fall through to raw
    }
  }
  const res = await fetch('./data.json');
  if (!res.ok) throw new Error('failed to load data.json');
  return res.json();
}

// Fetch /api/live and fold the overlay onto the base snapshot in place.
// Returns the same data object the rest of the app already expects.
async function applyLiveOverlay(base) {
  let live;
  try {
    const r = await fetch('/api/live', { headers: { accept: 'application/json' } });
    if (!r.ok) return base;
    live = await r.json();
  } catch (e) {
    return base;
  }
  if (!live || !live.ok) return base;

  // 1) Live headline KPIs (only override fields the endpoint actually returned).
  if (live.kpi) {
    base.kpi = { ...base.kpi, ...live.kpi };
  }

  // 2) Append claims ingested since the snapshot (dedup by id, just in case).
  if (Array.isArray(live.claims) && live.claims.length) {
    const seen = new Set();
    for (const c of base.claims) if (c && c.id) seen.add(c.id);
    const fresh = live.claims.filter((c) => c && c.id && !seen.has(c.id));
    if (fresh.length) {
      base.claims = base.claims.concat(fresh);
      if (base.claims_meta) {
        const n = base.claims.length;
        base.claims_meta = { ...base.claims_meta, embedded: n, total: n };
      }
    }
  }

  // 3) Bump board card counts for figures that gained claims.
  if (live.by_actor && Array.isArray(base.leaders)) {
    for (const ldr of base.leaders) {
      const names = [ldr.name, ...((ldr.aliases) || [])].filter(Boolean);
      let add = 0;
      for (const nm of names) add += (live.by_actor[nm] || 0);
      if (add > 0) {
        ldr.claims = (ldr.claims || 0) + add;
        if (typeof ldr.embedded_claims === 'number') ldr.embedded_claims += add;
      }
    }
  }

  return base;
}

// Format big numbers: 1.2B, 340M, 12K. Null/0 -> em dash.
export function fmtReach(n) {
  if (n === null || n === undefined || n === 0 || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 1 : 2).replace(/\.0+$/, '') + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(n);
}

// Plain integer with thousands separators (for KPI strip where we want exact-ish)
export function fmtInt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

// Compact KPI: 39.5B etc but always show something
export function fmtCompact(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// Country -> flag emoji
const FLAGS = {
  'United Kingdom': '🇬🇧',
  'United States': '🇺🇸',
  France: '🇫🇷',
  Germany: '🇩🇪',
  India: '🇮🇳',
  'India (Media)': '🇮🇳',
  Israel: '🇮🇱',
  Italy: '🇮🇹',
  Spain: '🇪🇸',
  Poland: '🇵🇱',
  Russia: '🇷🇺',
  China: '🇨🇳',
  'North Korea': '🇰🇵',
  Iran: '🇮🇷',
};
export function flag(country) {
  return FLAGS[country] || '🏳️';
}

// Verdict severity classification for color coding.
// Returns: 'severe' (red), 'false' (red), 'misleading' (amber), 'mixed' (slate), 'unverified'
export function verdictClass(verdict, verdictSource) {
  const v = (verdict || '').toLowerCase().trim();
  if (!v || v.includes('unverified') || v.includes('no verdict') || v.includes('no published')) {
    return 'unverified';
  }
  if (
    v.includes('pants on fire') ||
    v.includes('fabricat') ||
    v.includes('hoax') ||
    v.includes('baseless') ||
    v.includes('four pinocchio') ||
    v.includes('full flop')
  ) {
    return 'severe';
  }
  if (
    v.includes('false') ||
    v.includes('inaccurate') ||
    v.includes('debunk') ||
    v.includes('untrue') ||
    v.includes('fake') ||
    v.includes('incorrect')
  ) {
    return 'false';
  }
  if (
    v.includes('mislead') ||
    v.includes('half') ||
    v.includes('mostly') ||
    v.includes('needs context') ||
    v.includes('exaggerat') ||
    v.includes('partly') ||
    v.includes('unsubstantiat') ||
    v.includes('unsupport') ||
    v.includes('two pinocchio') ||
    v.includes('three pinocchio') ||
    v.includes('distort')
  ) {
    return 'misleading';
  }
  return 'mixed';
}

export function isUnverified(claim) {
  return verdictClass(claim.verdict, claim.verdict_source) === 'unverified' || !claim.verdict_source;
}

// Does a claim belong to a leader?
export function claimMatchesLeader(claim, leader) {
  // Ironclad: match exactly the set the build used to count this leader, so the
  // board card number always equals what the leader view renders.
  if (claim.person === leader.name) return true;
  if (leader.aliases && leader.aliases.length) {
    return leader.aliases.indexOf(claim.actor) !== -1;
  }
  if (leader.match_actor) return claim.actor === leader.match_actor;
  return false;
}

export function year(dateStr) {
  if (!dateStr) return null;
  return dateStr.slice(0, 4);
}

// portrait url (served from public/)
export function portraitUrl(img) {
  if (!img) return null;
  return './' + img;
}

// Sort an object {key:count} into [{name,value}] desc, optionally limited
export function topEntries(obj, limit) {
  const arr = Object.entries(obj || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  return limit ? arr.slice(0, limit) : arr;
}

// by_year object -> sorted array for trend
export function yearSeries(byYear) {
  return Object.entries(byYear || {})
    .map(([y, v]) => ({ year: y, value: v }))
    .sort((a, b) => a.year.localeCompare(b.year));
}
