import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, Tooltip, Cell,
  PieChart, Pie,
} from 'recharts';
import { fmtCompact, fmtReach, fmtInt, flag, topEntries, yearSeries } from './lib.js';

// verdict bucket -> brand colour (reads live CSS vars where possible)
function verdictPalette(theme) {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
  return {
    'False': g('--crimson', '#b91c1c'),
    'Fabricated / severe': g('--crimson-dark', theme === 'dark' ? '#f06a62' : '#8f1414'),
    'Misleading / partial': g('--amber', '#b8730c'),
    'Other rating': g('--slate', '#4b5563'),
    'Rated true': theme === 'dark' ? '#5b8c6e' : '#3f7a57',
    'Satire': theme === 'dark' ? '#8a86b8' : '#6b6796',
    'Unverified': g('--ink-faint', '#938d80'),
  };
}

// Read live theme colors from CSS variables; re-read whenever `theme` changes.
function useThemeColors(theme) {
  const read = () => {
    const cs = getComputedStyle(document.documentElement);
    const g = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
    return {
      INK: g('--ink', '#1a1a1a'),
      CRIMSON: g('--crimson', '#b91c1c'),
      CRIMSON2: theme === 'dark' ? '#ef6f68' : '#cf3a3a',
      RULE: g('--rule', '#d8d1c0'),
      AXIS: g('--ink-soft', '#6b665d'),
      CURSOR: theme === 'dark' ? 'rgba(226,67,59,0.12)' : 'rgba(185,28,28,0.06)',
    };
  };
  const [c, setC] = useState(read);
  useEffect(() => {
    // wait a tick so the [data-theme] attribute + CSS vars have applied
    const id = requestAnimationFrame(() => setC(read()));
    return () => cancelAnimationFrame(id);
  }, [theme]);
  return c;
}

function TooltipBox({ active, payload, label, valFmt }) {
  if (!active || !payload || !payload.length) return null;
  const v = payload[0].value;
  return (
    <div className="chart-tooltip">
      <div className="tt-label">{label}</div>
      <div className="tt-val">{valFmt ? valFmt(v) : v.toLocaleString('en-US')}</div>
    </div>
  );
}

function ChartCard({ title, sub, wide, children }) {
  return (
    <div className={'chart-card' + (wide ? ' wide' : '')}>
      <h3 className="chart-title">{title}</h3>
      <div className="chart-sub">{sub}</div>
      {children}
    </div>
  );
}

// Horizontal bar with crimson bars
function HBar({ data, valFmt, height = 260, c }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 18, bottom: 0, left: 6 }}>
        <CartesianGrid horizontal={false} stroke={c.RULE} />
        <XAxis type="number" tickFormatter={valFmt} stroke={c.RULE} tick={{ fill: c.AXIS }} />
        <YAxis
          type="category"
          dataKey="name"
          width={118}
          stroke={c.RULE}
          tick={{ fill: c.INK, fontSize: 11 }}
          interval={0}
        />
        <Tooltip cursor={{ fill: c.CURSOR }} content={<TooltipBox valFmt={valFmt} />} />
        <Bar dataKey="value" fill={c.CRIMSON} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClaimsByCountry({ byCountry, theme }) {
  const c = useThemeColors(theme);
  const data = topEntries(byCountry);
  return (
    <ChartCard title="Claims by country" sub="Logged disinformation claims · 8 nations">
      <HBar data={data} valFmt={(v) => v.toLocaleString('en-US')} height={300} c={c} />
    </ChartCard>
  );
}

export function ClaimsByYear({ byYear, theme }) {
  const c = useThemeColors(theme);
  const data = yearSeries(byYear);
  return (
    <ChartCard title="Claims by year" sub="Documented volume over time" wide>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="yearFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.CRIMSON} stopOpacity={0.32} />
              <stop offset="100%" stopColor={c.CRIMSON} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.RULE} vertical={false} />
          <XAxis dataKey="year" stroke={c.RULE} tick={{ fill: c.AXIS }} interval="preserveStartEnd" minTickGap={14} />
          <YAxis stroke={c.RULE} tick={{ fill: c.AXIS }} />
          <Tooltip content={<TooltipBox />} />
          <Area type="monotone" dataKey="value" stroke={c.CRIMSON} strokeWidth={2.5} fill="url(#yearFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopCheckers({ byChecker, theme }) {
  const c = useThemeColors(theme);
  const data = topEntries(byChecker, 10);
  return (
    <ChartCard title="Top fact-checkers" sub="Most-cited independent verifiers">
      <HBar data={data} valFmt={(v) => v.toLocaleString('en-US')} height={320} c={c} />
    </ChartCard>
  );
}

export function TopTopics({ byTopic, theme }) {
  const c = useThemeColors(theme);
  const data = topEntries(byTopic, 10);
  return (
    <ChartCard title="Top topics" sub="Recurring disinformation themes">
      <HBar data={data} valFmt={(v) => v.toLocaleString('en-US')} height={320} c={c} />
    </ChartCard>
  );
}

// ---- NEW: global verdict distribution (donut) ----
export function VerdictDistribution({ byVerdict, theme }) {
  const c = useThemeColors(theme);
  const pal = verdictPalette(theme);
  const data = Object.entries(byVerdict || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ChartCard title="Verdict distribution" sub="How the fact-checks landed · whole corpus">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <ResponsiveContainer width="55%" height={240} minWidth={200}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
                 innerRadius={52} outerRadius={92} paddingAngle={1} stroke={c.RULE} strokeWidth={1}>
              {data.map((d, i) => <Cell key={i} fill={pal[d.name] || c.INK} />)}
            </Pie>
            <Tooltip content={<TooltipBox valFmt={(v) => v.toLocaleString('en-US') + ' claims'} />} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="verdict-legend">
          {data.map((d) => (
            <li key={d.name}>
              <span className="vl-dot" style={{ background: pal[d.name] || c.INK }} />
              <span className="vl-name">{d.name}</span>
              <span className="vl-val">{((d.value / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

// ---- NEW: per-country deep dive driven by country_schema ----
export function CountryDeepDive({ schema, byCountry, theme }) {
  const c = useThemeColors(theme);
  const pal = verdictPalette(theme);
  const countries = useMemo(
    () => Object.keys(schema || {}).sort((a, b) => (byCountry[b] || 0) - (byCountry[a] || 0)),
    [schema, byCountry]
  );
  const [sel, setSel] = useState(countries[0] || '');
  const cur = schema[sel];
  if (!cur) return null;

  const verdictData = Object.entries(cur.by_verdict || {})
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const checkerData = topEntries(cur.top_checkers, 6);
  const topicData = topEntries(cur.top_topics, 6);
  const actorData = topEntries(cur.top_actors, 6);

  return (
    <div className="country-schema">
      <div className="cs-tabs" role="tablist" aria-label="Select country">
        {countries.map((cn) => (
          <button key={cn} role="tab" aria-selected={cn === sel}
            className={'cs-tab' + (cn === sel ? ' active' : '')}
            onClick={() => setSel(cn)} data-testid={'cs-tab-' + cn}>
            {flag(cn)} {cn}
            <span className="cs-tab-count">{fmtInt(byCountry[cn] || cur.total_claims)}</span>
          </button>
        ))}
      </div>

      <div className="cs-body">
        <div className="cs-stat-row">
          <div className="cs-stat"><b>{fmtInt(cur.total_claims)}</b><small>Claims logged</small></div>
          <div className="cs-stat"><b>{fmtCompact(cur.total_views)}</b><small>Documented views</small></div>
          <div className="cs-stat"><b>{Object.keys(cur.top_checkers || {}).length}+</b><small>Fact-checkers</small></div>
          <div className="cs-stat"><b>{cur.year_min || '—'}–{cur.year_max || '—'}</b><small>Span</small></div>
        </div>

        <div className="cs-grid">
          <div className="cs-panel">
            <h4 className="cs-panel-title">Verdict mix</h4>
            <div className="cs-bars">
              {verdictData.map((d) => {
                const pct = (d.value / cur.total_claims) * 100;
                return (
                  <div key={d.name} className="cs-bar-row">
                    <span className="cs-bar-label">{d.name}</span>
                    <span className="cs-bar-track">
                      <span className="cs-bar-fill" style={{ width: pct + '%', background: pal[d.name] || c.INK }} />
                    </span>
                    <span className="cs-bar-val">{fmtInt(d.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cs-panel">
            <h4 className="cs-panel-title">Most-cited checkers</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={checkerData} layout="vertical" margin={{ top: 0, right: 14, bottom: 0, left: 6 }}>
                <CartesianGrid horizontal={false} stroke={c.RULE} />
                <XAxis type="number" stroke={c.RULE} tick={{ fill: c.AXIS, fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={120} stroke={c.RULE} tick={{ fill: c.INK, fontSize: 10 }} interval={0} />
                <Tooltip cursor={{ fill: c.CURSOR }} content={<TooltipBox valFmt={(v) => v.toLocaleString('en-US')} />} />
                <Bar dataKey="value" fill={c.CRIMSON} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="cs-panel">
            <h4 className="cs-panel-title">Recurring themes</h4>
            <div className="cs-pills">
              {topicData.map((t) => (
                <span key={t.name} className="cs-pill">{t.name}<b>{fmtInt(t.value)}</b></span>
              ))}
              {topicData.length === 0 && <span className="cs-empty">No tagged themes</span>}
            </div>
          </div>

          <div className="cs-panel">
            <h4 className="cs-panel-title">Most-named actors</h4>
            <div className="cs-pills">
              {actorData.map((a) => (
                <span key={a.name} className="cs-pill">{a.name}<b>{fmtInt(a.value)}</b></span>
              ))}
              {actorData.length === 0 && <span className="cs-empty">Predominantly unattributed / viral</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReachByLeader({ leaders, theme }) {
  const c = useThemeColors(theme);
  const data = [...leaders]
    .filter((l) => l.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map((l) => ({ name: l.name.replace(/\(.*\)/, '').trim(), value: l.views }));
  return (
    <ChartCard title="Reach leaderboard" sub="Top leaders by documented total views" wide>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 6 }}>
          <CartesianGrid horizontal={false} stroke={c.RULE} />
          <XAxis type="number" tickFormatter={fmtCompact} stroke={c.RULE} tick={{ fill: c.AXIS }} />
          <YAxis type="category" dataKey="name" width={130} stroke={c.RULE} tick={{ fill: c.INK, fontSize: 11 }} interval={0} />
          <Tooltip cursor={{ fill: c.CURSOR }} content={<TooltipBox valFmt={(v) => fmtReach(v) + ' views'} />} />
          <Bar dataKey="value" maxBarSize={22}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? c.CRIMSON : i < 3 ? c.CRIMSON2 : c.INK} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
