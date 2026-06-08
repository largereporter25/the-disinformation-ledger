import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area, Tooltip, Cell,
} from 'recharts';
import { fmtCompact, fmtReach, topEntries, yearSeries } from './lib.js';

const INK = '#1a1a1a';
const CRIMSON = '#b91c1c';
const RULE = '#d8d1c0';
const AMBER = '#b8730c';

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
function HBar({ data, valFmt, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 18, bottom: 0, left: 6 }}>
        <CartesianGrid horizontal={false} stroke={RULE} />
        <XAxis type="number" tickFormatter={valFmt} stroke={RULE} tick={{ fill: '#6b665d' }} />
        <YAxis
          type="category"
          dataKey="name"
          width={118}
          stroke={RULE}
          tick={{ fill: INK, fontSize: 11 }}
          interval={0}
        />
        <Tooltip cursor={{ fill: 'rgba(185,28,28,0.06)' }} content={<TooltipBox valFmt={valFmt} />} />
        <Bar dataKey="value" fill={CRIMSON} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ClaimsByCountry({ byCountry }) {
  const data = topEntries(byCountry);
  return (
    <ChartCard title="Claims by country" sub="Logged disinformation claims · 8 nations">
      <HBar data={data} valFmt={(v) => v.toLocaleString('en-US')} height={300} />
    </ChartCard>
  );
}

export function ClaimsByYear({ byYear }) {
  const data = yearSeries(byYear);
  return (
    <ChartCard title="Claims by year" sub="Documented volume over time" wide>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="yearFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CRIMSON} stopOpacity={0.32} />
              <stop offset="100%" stopColor={CRIMSON} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={RULE} vertical={false} />
          <XAxis dataKey="year" stroke={RULE} tick={{ fill: '#6b665d' }} interval="preserveStartEnd" minTickGap={14} />
          <YAxis stroke={RULE} tick={{ fill: '#6b665d' }} />
          <Tooltip content={<TooltipBox />} />
          <Area type="monotone" dataKey="value" stroke={CRIMSON} strokeWidth={2.5} fill="url(#yearFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopCheckers({ byChecker }) {
  const data = topEntries(byChecker, 10);
  return (
    <ChartCard title="Top fact-checkers" sub="Most-cited independent verifiers">
      <HBar data={data} valFmt={(v) => v.toLocaleString('en-US')} height={320} />
    </ChartCard>
  );
}

export function TopTopics({ byTopic }) {
  const data = topEntries(byTopic, 10);
  return (
    <ChartCard title="Top topics" sub="Recurring disinformation themes">
      <HBar data={data} valFmt={(v) => v.toLocaleString('en-US')} height={320} />
    </ChartCard>
  );
}

export function ReachByLeader({ leaders }) {
  const data = [...leaders]
    .filter((l) => l.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map((l) => ({ name: l.name.replace(/\(.*\)/, '').trim(), value: l.views }));
  return (
    <ChartCard title="Reach leaderboard" sub="Top leaders by documented total views" wide>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 6 }}>
          <CartesianGrid horizontal={false} stroke={RULE} />
          <XAxis type="number" tickFormatter={fmtCompact} stroke={RULE} tick={{ fill: '#6b665d' }} />
          <YAxis type="category" dataKey="name" width={130} stroke={RULE} tick={{ fill: INK, fontSize: 11 }} interval={0} />
          <Tooltip cursor={{ fill: 'rgba(185,28,28,0.06)' }} content={<TooltipBox valFmt={(v) => fmtReach(v) + ' views'} />} />
          <Bar dataKey="value" maxBarSize={22}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? CRIMSON : i < 3 ? '#cf3a3a' : INK} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
