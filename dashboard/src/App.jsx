import { useEffect, useMemo, useState } from 'react';
import {
  loadData, fmtCompact, fmtReach, fmtInt, flag,
  verdictClass, claimMatchesLeader, year, portraitUrl,
} from './lib.js';
import {
  ClaimsByCountry, ClaimsByYear, TopCheckers, TopTopics, ReachByLeader,
  VerdictDistribution, CountryDeepDive,
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
      <rect x="1.5" y="1.5" width="31" height="31" stroke="currentColor" strokeWidth="2" />
      <line x1="7" y1="11" x2="27" y2="11" stroke="currentColor" strokeWidth="2" />
      <line x1="7" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="2" />
      <line x1="7" y1="23" x2="24" y2="23" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="29" x2="30" y2="6" stroke="#b91c1c" strokeWidth="2.4" />
    </svg>
  );
}

function Masthead({ route, navigate, theme, toggleTheme }) {
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
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4.2" />
                <line x1="12" y1="2" x2="12" y2="4.5" />
                <line x1="12" y1="19.5" x2="12" y2="22" />
                <line x1="4.2" y1="4.2" x2="6" y2="6" />
                <line x1="18" y1="18" x2="19.8" y2="19.8" />
                <line x1="2" y1="12" x2="4.5" y2="12" />
                <line x1="19.5" y1="12" x2="22" y2="12" />
                <line x1="4.2" y1="19.8" x2="6" y2="18" />
                <line x1="18" y1="6" x2="19.8" y2="4.2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
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
  const [qDebounced, setQDebounced] = useState('');
  const [country, setCountry] = useState('');
  const [checker, setChecker] = useState('');
  const [topic, setTopic] = useState('');
  const [verdict, setVerdict] = useState('');
  const [yr, setYr] = useState('');
  const [sort, setSort] = useState('reach');
  const [limit, setLimit] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const verdictOptions = ['False / Pants on Fire', 'Misleading / Half-true', 'Other rating', 'Unverified'];

  // Debounce the free-text query so filtering the full 104k corpus only runs
  // after the user pauses, keeping every keystroke instant.
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 120);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    const needle = qDebounced.trim().toLowerCase();
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
  }, [baseClaims, qDebounced, country, checker, topic, verdict, yr, sort]);

  useEffect(() => { setLimit(PAGE); }, [qDebounced, country, checker, topic, verdict, yr, sort, baseClaims]);

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
function Home({ data, navigate, theme }) {
  const [boardQ, setBoardQ] = useState('');
  const [boardLimit, setBoardLimit] = useState(120);
  const boardFiltered = useMemo(() => {
    const q = boardQ.trim().toLowerCase();
    // keep original rank (index in the full sorted list) when filtering
    const withRank = data.leaders.map((l, i) => ({ l, rank: i + 1 }));
    if (!q) return withRank;
    return withRank.filter(({ l }) =>
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.country && l.country.toLowerCase().includes(q)) ||
      (l.aliases && l.aliases.some((a) => a.toLowerCase().includes(q)))
    );
  }, [data.leaders, boardQ]);
  const boardShown = boardFiltered.slice(0, boardLimit);
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
          <div className="board-search">
            <input
              className="board-search-input"
              type="search"
              placeholder="Filter the board by name, country or handle…"
              value={boardQ}
              onChange={(e) => { setBoardQ(e.target.value); setBoardLimit(120); }}
              data-testid="board-search"
              aria-label="Filter the board"
            />
            <span className="board-search-count">
              {boardFiltered.length === data.leaders.length
                ? `${fmtInt(data.leaders.length)} figures`
                : `${fmtInt(boardFiltered.length)} of ${fmtInt(data.leaders.length)}`}
            </span>
          </div>
          <div className="leader-grid">
            {boardShown.map(({ l, rank }) => (
              <LeaderCard key={l.slug} leader={l} rank={rank} navigate={navigate} />
            ))}
          </div>
          {boardFiltered.length === 0 && (
            <p className="board-empty" data-testid="board-empty">No tracked figure matches “{boardQ}”. Every claim is still searchable in the Explorer below.</p>
          )}
          {boardShown.length < boardFiltered.length && (
            <div className="board-more-wrap">
              <button className="board-more" data-testid="board-more" onClick={() => setBoardLimit((n) => n + 200)}>
                Show more figures ({fmtInt(boardFiltered.length - boardShown.length)} remaining)
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="sec-head">
            <div className="sec-kicker">The data</div>
            <h2 className="sec-title">Patterns across the ledger</h2>
          </div>
          <div className="charts-grid">
            <ClaimsByCountry byCountry={data.by_country} theme={theme} />
            <VerdictDistribution byVerdict={data.by_verdict} theme={theme} />
            <ClaimsByYear byYear={data.by_year} theme={theme} />
            <TopCheckers byChecker={data.by_checker} theme={theme} />
            <TopTopics byTopic={data.by_topic} theme={theme} />
            <ReachByLeader leaders={data.leaders} theme={theme} />
          </div>
        </div>
      </section>

      {data.country_schema && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="shell">
            <div className="sec-head">
              <div className="sec-kicker">Country schema</div>
              <h2 className="sec-title">The ledger, nation by nation</h2>
              <p className="sec-desc">
                Each tracked country has its own evidentiary profile — verdict mix, the
                fact-checkers doing the work, the recurring themes and the most-named actors.
                Select a nation to read its record.
              </p>
            </div>
            <CountryDeepDive schema={data.country_schema} byCountry={data.by_country} theme={theme} />
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="sec-head">
            <div className="sec-kicker">The evidence</div>
            <h2 className="sec-title">Search every claim</h2>
            <p className="sec-desc">
              Full-text search across {fmtInt(data.kpi.total_claims)} documented claims. Filter by country, verdict,
              fact-checker, topic and year. Every published check links straight to the source.
              {data.claims_meta && data.claims_meta.embedded < data.claims_meta.total ? (
                <> The in-browser explorer loads a fast {fmtInt(data.claims_meta.embedded)}-claim working set
                (all tracked-actor claims plus the highest-reach records); the complete
                {' '}{fmtInt(data.claims_meta.total)}-row corpus is available through the public API below.</>
              ) : null}
            </p>
          </div>
          <Explorer data={data} baseClaims={data.claims} lockedLabel={null} navigate={navigate} />
        </div>
      </section>

      <ApiPanel kpi={data.kpi} />
    </>
  );
}

/* ---------------- public read API panel ---------------- */
const API_KEY = 'dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e';
function ApiPanel({ kpi }) {
  const [copied, setCopied] = useState(false);
  const copyKey = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(API_KEY);
      } else {
        const el = document.getElementById('api-key-value');
        if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); }
      }
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch (e) { setCopied(false); }
  };
  return (
    <section className="section api-section" style={{ paddingTop: 0 }}>
      <div className="shell">
        <div className="api-panel">
          <div className="sec-kicker">For OSINT investigators</div>
          <h2 className="sec-title">Query the whole corpus over a free API</h2>
          <p className="sec-desc">
            The complete {fmtInt(kpi.total_claims)}-row corpus — every country, actor, fact-checker and verdict —
            is queryable as read-only JSON. Filter by country, actor, fact-checker, verdict, topic, year or full text,
            paginate at scale, or pull aggregate stats. Each record links to its named third-party check.
          </p>

          <div className="api-key-row">
            <span className="api-key-label">Public read key</span>
            <code id="api-key-value" className="api-key-box">{API_KEY}</code>
            <button className="api-copy" onClick={copyKey} aria-label="Copy API key">
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          <div className="api-endpoints">
            <div className="api-endpoint"><span className="api-verb">GET</span> <code>/api/v1/claims</code><span className="api-ep-note">filtered query · country, actor, checker, verdict, topic, year, q, limit, offset, sort</span></div>
            <div className="api-endpoint"><span className="api-verb">GET</span> <code>/api/v1/stats</code><span className="api-ep-note">aggregate rollups · optional ?country=</span></div>
            <div className="api-endpoint"><span className="api-verb">GET</span> <code>/api/v1/meta</code><span className="api-ep-note">schema + every valid filter value</span></div>
            <div className="api-endpoint"><span className="api-verb">GET</span> <code>/dataset/all.ndjson.gz</code><span className="api-ep-note">bulk download · full corpus gzipped (11 MB), one JSON per line</span></div>
          </div>

          <pre className="api-example">{`curl "https://disinformation-ledger.vercel.app/api/v1/claims?key=${API_KEY}&country=United%20States&verdict=false&sort=reach&limit=50"`}</pre>

          <p className="api-note">
            <a className="api-docs-link" href="/api" target="_blank" rel="noopener">Read the full API docs →</a>
            &nbsp; Dataset licensed CC&nbsp;BY-NC&nbsp;4.0. Free for non-commercial research and journalism with attribution.
          </p>
        </div>
      </div>
    </section>
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
        <p className="foot-meta">
          <a href="/api" target="_blank" rel="noopener">Public read API</a>
          <span className="foot-sep">·</span>
          Engine licensed MIT
          <span className="foot-sep">·</span>
          Dataset licensed CC&nbsp;BY-NC&nbsp;4.0
          <span className="foot-sep">·</span>
          Vansh Kunal Shah, editor-in-chief
          <span className="foot-sep">·</span>
          Individual verdicts © their named third-party fact-checkers
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

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('ledger-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* ignore */ }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('ledger-theme', theme); } catch (e) { /* ignore */ }
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

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
      <Masthead route={route} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />
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
      {route.view === 'home' && <Home data={data} navigate={navigate} theme={theme} />}
      <Footer kpi={data.kpi} />
    </>
  );
}
