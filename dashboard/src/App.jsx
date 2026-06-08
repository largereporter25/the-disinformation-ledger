import { useEffect, useMemo, useState } from 'react';
import {
  loadData, fmtCompact, fmtReach, fmtInt, flag,
  verdictClass, claimMatchesLeader, year, portraitUrl,
} from './lib.js';
import {
  ClaimsByCountry, ClaimsByYear, TopCheckers, TopTopics, ReachByLeader,
} from './Charts.jsx';

/* ---------------- hash routing ---------------- */
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = (to) => { window.location.hash = to; window.scrollTo({ top: 0 }); };
  return [hash, navigate];
}

function parseRoute(hash) {
  const h = hash.replace(/^#/, '');
  if (h.startsWith('/leader/')) return { view: 'leader', slug: h.slice('/leader/'.length) };
  if (h.startsWith('/claims')) return { view: 'claims' };
  return { view: 'home' };
}

/* ---------------- masthead ---------------- */
function Logo() {
  return (
    <svg className="brand-logo" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-label="Ledger mark">
      <rect x="1.5" y="1.5" width="31" height="31" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="7" y1="11" x2="27" y2="11" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="7" y1="17" x2="20" y2="17" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="7" y1="23" x2="24" y2="23" stroke="#1a1a1a" strokeWidth="2" />
      <line x1="4" y1="29" x2="30" y2="6" stroke="#b91c1c" strokeWidth="2.4" />
    </svg>
  );
}

function Masthead({ route, navigate }) {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <button className="brand" onClick={() => navigate('/')} aria-label="Home">
          <Logo />
          <span>
            <span className="brand-name">The Disinformation <span className="accent">Ledger</span></span>
            <span className="brand-sub">Making fact-checks travel faster than lies</span>
          </span>
        </button>
        <nav className="mast-nav">
          <button className={route.view === 'home' ? 'active' : ''} onClick={() => navigate('/')}>Board</button>
          <button className={route.view === 'claims' || route.view === 'leader' ? 'active' : ''} onClick={() => navigate('/claims')}>Claims</button>
        </nav>
      </div>
    </header>
  );
}

/* ---------------- KPI strip ---------------- */
function KpiStrip({ kpi }) {
  const items = [
    { v: fmtInt(kpi.total_claims), l: 'Claims logged' },
    { v: kpi.countries, l: 'Countries' },
    { v: kpi.tracked_leaders, l: 'Tracked figures' },
    { v: fmtCompact(kpi.total_views), l: 'Total views', accent: true },
    { v: fmtCompact(kpi.total_reposts), l: 'Reposts' },
    { v: fmtCompact(kpi.total_likes), l: 'Likes' },
    { v: fmtInt(kpi.checkers), l: 'Fact-checkers' },
  ];
  return (
    <div className="kpi-strip">
      {items.map((it, i) => (
        <div key={i} className={'kpi' + (it.accent ? ' accent' : '')}>
          <div className="kpi-val">{it.v}</div>
          <div className="kpi-label">{it.l}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- leader card ---------------- */
function LeaderCard({ leader, rank, navigate }) {
  const reach = leader.views || leader.likes || leader.reposts || 0;
  return (
    <button
      className="leader-card"
      onClick={() => navigate('/leader/' + leader.slug)}
      data-testid={'card-leader-' + leader.slug}
      aria-label={'View claims for ' + leader.name}
    >
      <div className="leader-portrait-wrap">
        <span className="leader-rank">#{rank}</span>
        {leader.img ? (
          <img className="leader-portrait" src={portraitUrl(leader.img)} alt={leader.name} loading="lazy" />
        ) : (
          <div className="leader-mono">
            <span>{leader.monogram}</span>
            <span className="mono-tag">no portrait · account</span>
          </div>
        )}
      </div>
      <div className="leader-meta">
        <div className="leader-name">{leader.name}</div>
        <div className="leader-country">{flag(leader.country)} {leader.country}</div>
        <div className="leader-stats">
          <div className="leader-stat-claims">{leader.claims}<small>Claims</small></div>
          <div className="leader-stat-reach">{fmtReach(reach)}<small>Reach</small></div>
        </div>
      </div>
    </button>
  );
}

/* ---------------- verdict + checker block ---------------- */
function VerdictBlock({ claim }) {
  const cls = verdictClass(claim.verdict, claim.verdict_source);
  const hasCheck = claim.verdict_source && cls !== 'unverified';
  const verdictLabel = (claim.verdict || '').trim();
  return (
    <div className="verdict-row">
      {hasCheck ? (
        <span className={'verdict-badge v-' + cls}>{verdictLabel || 'Rated false'}</span>
      ) : (
        <span className="verdict-badge v-unverified">Unverified — no published check</span>
      )}
      {hasCheck && claim.source_url ? (
        <a className="checker-link" href={claim.source_url} target="_blank" rel="noopener noreferrer"
           data-testid={'link-check-' + claim.id}>
          Verified by {claim.verdict_source} <span className="arrow">→</span>
        </a>
      ) : hasCheck && claim.verdict_source ? (
        <span className="checker-static">Source: {claim.verdict_source}</span>
      ) : null}
    </div>
  );
}

/* ---------------- claim card ---------------- */
function ClaimCard({ claim }) {
  const cls = verdictClass(claim.verdict, claim.verdict_source);
  return (
    <article className={'claim-card v-' + cls} data-testid={'claim-' + claim.id}>
      <VerdictBlock claim={claim} />
      <p className="claim-text">{claim.claim}</p>
      <div className="claim-foot">
        <span className="claim-actor">{claim.actor}</span>
        {claim.topic ? <span className="topic-pill">{claim.topic}</span> : null}
        <span className="claim-tag">{flag(claim.country)} {claim.country}</span>
        {claim.platform ? <span className="claim-tag"><b>{claim.platform}</b></span> : null}
        {claim.date ? <span className="claim-tag">{claim.date}</span> : null}
        {claim.views ? <span className="claim-reach"><b>{fmtReach(claim.views)}</b> views</span> : null}
        {claim.reposts ? <span className="claim-reach"><b>{fmtReach(claim.reposts)}</b> reposts</span> : null}
        {claim.likes ? <span className="claim-reach"><b>{fmtReach(claim.likes)}</b> likes</span> : null}
        <span className="claim-links">
          {claim.post_url ? <a href={claim.post_url} target="_blank" rel="noopener noreferrer">Original post ↗</a> : null}
          {claim.archived_url ? <a href={claim.archived_url} target="_blank" rel="noopener noreferrer">Archive ↗</a> : null}
        </span>
      </div>
    </article>
  );
}

/* ---------------- explorer ---------------- */
const PAGE = 40;

function Explorer({ data, baseClaims, lockedLabel, navigate }) {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [checker, setChecker] = useState('');
  const [topic, setTopic] = useState('');
  const [verdict, setVerdict] = useState('');
  const [yr, setYr] = useState('');
  const [sort, setSort] = useState('reach');
  const [limit, setLimit] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const verdictOptions = ['False / Pants on Fire', 'Misleading / Half-true', 'Other rating', 'Unverified'];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = baseClaims.filter((c) => {
      if (needle) {
        const hay = (c.claim + ' ' + c.actor + ' ' + (c.topic || '') + ' ' + (c.verdict || '') + ' ' + (c.verdict_source || '')).toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (country && c.country !== country) return false;
      if (checker && c.verdict_source !== checker) return false;
      if (topic && c.topic !== topic) return false;
      if (yr && year(c.date) !== yr) return false;
      if (verdict) {
        const cls = verdictClass(c.verdict, c.verdict_source);
        if (verdict === 'False / Pants on Fire' && !(cls === 'false' || cls === 'severe')) return false;
        if (verdict === 'Misleading / Half-true' && cls !== 'misleading') return false;
        if (verdict === 'Other rating' && cls !== 'mixed') return false;
        if (verdict === 'Unverified' && cls !== 'unverified') return false;
      }
      return true;
    });
    arr = arr.slice().sort((a, b) => {
      if (sort === 'reach') return (b.views || 0) - (a.views || 0);
      if (sort === 'newest') return (b.date || '').localeCompare(a.date || '');
      if (sort === 'oldest') return (a.date || '').localeCompare(b.date || '');
      return 0;
    });
    return arr;
  }, [baseClaims, q, country, checker, topic, verdict, yr, sort]);

  useEffect(() => { setLimit(PAGE); }, [q, country, checker, topic, verdict, yr, sort, baseClaims]);

  const years = useMemo(
    () => Object.keys(data.by_year).sort((a, b) => b.localeCompare(a)),
    [data]
  );
  const topCheckers = useMemo(
    () => Object.entries(data.by_checker).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 60),
    [data]
  );
  const topTopics = useMemo(
    () => Object.entries(data.by_topic).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 60),
    [data]
  );

  const reset = () => { setQ(''); setCountry(''); setChecker(''); setTopic(''); setVerdict(''); setYr(''); };
  const anyFilter = q || country || checker || topic || verdict || yr;

  return (
    <div className="explorer-layout">
      <div>
        <button className="filter-toggle" onClick={() => setFiltersOpen((o) => !o)} data-testid="toggle-filters">
          <span>Filters {anyFilter ? '· active' : ''}</span>
          <span>{filtersOpen ? '▲' : '▼'}</span>
        </button>
        <aside className={'filters' + (filtersOpen ? '' : ' collapsed')}>
          {!lockedLabel && (
            <div className="filter-group">
              <label className="filter-label">Country</label>
              <select className="filter-select" value={country} onChange={(e) => setCountry(e.target.value)} data-testid="filter-country">
                <option value="">All countries</option>
                {data.filters.countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="filter-group">
            <label className="filter-label">Verdict</label>
            <select className="filter-select" value={verdict} onChange={(e) => setVerdict(e.target.value)} data-testid="filter-verdict">
              <option value="">All verdicts</option>
              {verdictOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Fact-checker</label>
            <select className="filter-select" value={checker} onChange={(e) => setChecker(e.target.value)} data-testid="filter-checker">
              <option value="">All checkers</option>
              {topCheckers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Topic</label>
            <select className="filter-select" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="filter-topic">
              <option value="">All topics</option>
              {topTopics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Year</label>
            <select className="filter-select" value={yr} onChange={(e) => setYr(e.target.value)} data-testid="filter-year">
              <option value="">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {anyFilter ? <button className="filter-reset" onClick={reset} data-testid="reset-filters">Clear filters</button> : null}
        </aside>
      </div>

      <div>
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6"/><line x1="12.5" y1="12.5" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6"/></svg>
          </span>
          <input
            className="search-input"
            placeholder="Search claims, people, topics, verdicts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <div className="results-bar">
          <div className="results-count">
            <span>{fmtInt(filtered.length)}</span> {filtered.length === 1 ? 'claim' : 'claims'}
            {lockedLabel ? ' · ' + lockedLabel : ''}
          </div>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} data-testid="sort-claims">
            <option value="reach">Sort: most reach</option>
            <option value="newest">Sort: newest</option>
            <option value="oldest">Sort: oldest</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">No claims match these filters.<br />Try clearing a filter or broadening your search.</div>
        ) : (
          <>
            <div className="claim-list">
              {filtered.slice(0, limit).map((c) => <ClaimCard key={c.id} claim={c} />)}
            </div>
            {limit < filtered.length && (
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <button className="filter-reset" style={{ width: 'auto', padding: '12px 28px' }}
                  onClick={() => setLimit((l) => l + PAGE * 2)} data-testid="load-more">
                  Load more ({fmtInt(filtered.length - limit)} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- leader detail page ---------------- */
function LeaderView({ data, slug, navigate }) {
  const leader = data.leaders.find((l) => l.slug === slug);
  if (!leader) {
    return (
      <div className="shell section">
        <button className="back-link" onClick={() => navigate('/')}>← Back to the board</button>
        <div className="empty">Figure not found.</div>
      </div>
    );
  }
  const baseClaims = useMemo(
    () => data.claims.filter((c) => claimMatchesLeader(c, leader)),
    [data, leader]
  );
  const totals = [
    { v: fmtInt(leader.claims), l: 'Claims', accent: true },
    { v: fmtReach(leader.views), l: 'Views' },
    { v: fmtReach(leader.reposts), l: 'Reposts' },
    { v: fmtReach(leader.likes), l: 'Likes' },
  ];
  return (
    <div className="shell section">
      <button className="back-link" onClick={() => navigate('/')} data-testid="back-board">← Back to the board</button>
      <div className="leader-header">
        {leader.img ? (
          <img className="leader-header-portrait" src={portraitUrl(leader.img)} alt={leader.name} />
        ) : (
          <div className="leader-header-mono"><span>{leader.monogram}</span></div>
        )}
        <div>
          <div className="lh-country">{flag(leader.country)} {leader.country} · {leader.category}</div>
          <h1 className="lh-name">{leader.name}</h1>
          <div className="lh-totals">
            {totals.map((t, i) => (
              <div key={i}>
                <div className={'lh-total-val' + (t.accent ? ' accent' : '')}>{t.v}</div>
                <div className="lh-total-label">{t.l}</div>
              </div>
            ))}
          </div>
          {leader.checkers && leader.checkers.length ? (
            <div className="lh-checkers">
              <span className="filter-label">Fact-checkers who reviewed these claims</span>
              <div className="lh-checker-tags">
                {leader.checkers.map((c) => <span key={c} className="lh-checker-tag">{c}</span>)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <Explorer data={data} baseClaims={baseClaims} lockedLabel={leader.name} navigate={navigate} />
    </div>
  );
}

/* ---------------- home ---------------- */
function Home({ data, navigate }) {
  return (
    <>
      <section className="hero">
        <div className="shell">
          <div className="hero-kicker">Investigative accountability · 2008–2026</div>
          <h1 className="hero-title">
            Know Your <s>Leaders</s> <span className="liars">Liars</span>
          </h1>
          <p className="hero-lede">
            {fmtInt(data.kpi.total_claims)} fact-checked political disinformation claims across {data.kpi.countries} countries
            and {data.kpi.tracked_leaders} tracked figures — each verdict attributed to a named, independent fact-checker.
            We never adjudicate; we amplify the people who do.
          </p>
          <p className="hero-mission">→ Making the fact-checks travel faster than the lies.</p>
          <KpiStrip kpi={data.kpi} />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="sec-head">
            <div className="sec-kicker">The board · click any face</div>
            <h2 className="sec-title">{data.kpi.tracked_leaders} figures, ranked by claims logged</h2>
            <p className="sec-desc">
              Stylised editorial portraits of every tracked figure, sorted by the number of fact-checked claims.
              Tap a portrait to open that person's searchable claim record with working links to every fact-check.
            </p>
          </div>
          <div className="leader-grid">
            {data.leaders.map((l, i) => (
              <LeaderCard key={l.slug} leader={l} rank={i + 1} navigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="sec-head">
            <div className="sec-kicker">The data</div>
            <h2 className="sec-title">Patterns across the ledger</h2>
          </div>
          <div className="charts-grid">
            <ClaimsByCountry byCountry={data.by_country} />
            <ReachByLeader leaders={data.leaders} />
            <ClaimsByYear byYear={data.by_year} />
            <TopCheckers byChecker={data.by_checker} />
            <TopTopics byTopic={data.by_topic} />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="sec-head">
            <div className="sec-kicker">The evidence</div>
            <h2 className="sec-title">Search every claim</h2>
            <p className="sec-desc">
              Full-text search across {fmtInt(data.kpi.total_claims)} claims. Filter by country, verdict,
              fact-checker, topic and year. Every published check links straight to the source.
            </p>
          </div>
          <Explorer data={data} baseClaims={data.claims} lockedLabel={null} navigate={navigate} />
        </div>
      </section>
    </>
  );
}

/* ---------------- footer ---------------- */
function Footer({ kpi }) {
  return (
    <footer className="foot">
      <div className="shell foot-inner">
        <div className="foot-brand">The Disinformation Ledger</div>
        <p className="foot-note">
          An evidentiary database of {fmtInt(kpi.total_claims)} documented disinformation claims across {kpi.countries} countries,
          drawing on {fmtInt(kpi.checkers)} independent fact-checkers. <b>We compile, we do not adjudicate.</b> Every
          verdict is attributed to a named third-party fact-check with a working link. Rows with no published check are
          marked honestly as unverified. Reach figures are documented snapshots; "—" denotes no recorded data.
        </p>
      </div>
    </footer>
  );
}

/* ---------------- root ---------------- */
export default function App() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [hash, navigate] = useHashRoute();
  const route = parseRoute(hash);

  useEffect(() => { loadData().then(setData).catch((e) => setErr(String(e))); }, []);

  if (err) {
    return <div className="loading">Failed to load data.<br /><small>{err}</small></div>;
  }
  if (!data) {
    return (
      <>
        <div className="shell" style={{ paddingTop: 60 }}>
          <div className="loading">Loading the ledger…<div className="loading-bar" /></div>
          <div className="skeleton-grid" style={{ marginTop: 40 }}>
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skel-card" />)}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Masthead route={route} navigate={navigate} />
      {route.view === 'leader' && <LeaderView data={data} slug={route.slug} navigate={navigate} />}
      {route.view === 'claims' && (
        <div className="shell section">
          <div className="sec-head">
            <div className="sec-kicker">The evidence</div>
            <h2 className="sec-title">Search every claim</h2>
          </div>
          <Explorer data={data} baseClaims={data.claims} lockedLabel={null} navigate={navigate} />
        </div>
      )}
      {route.view === 'home' && <Home data={data} navigate={navigate} />}
      <Footer kpi={data.kpi} />
    </>
  );
}
