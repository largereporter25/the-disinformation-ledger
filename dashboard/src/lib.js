// Data loading + formatting helpers for the Global Disinformation Ledger

export async function loadData() {
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
