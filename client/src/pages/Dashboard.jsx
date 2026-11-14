import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, Activity, Ban, Database, Cpu, Server, Regex, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import { dashboardApi, errMsg } from '../services/api.js';
import { PageHeader, StatCard, Spinner, ErrorBox } from '../components/ui.jsx';
import { Badge, ValidationBadge, StatusBadge } from '../components/Badges.jsx';
import { fmtShort, fmtDay, fmtUptime } from '../utils/format.js';

export const COLORS = { neon: '#2cff8a', red: '#f87171', amber: '#fbbf24', cyan: '#22d3ee', blue: '#3d8bff', gray: '#64748b' };
export const tooltipStyle = { contentStyle: { background: '#182235', border: '1px solid #233048', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }, itemStyle: { color: '#e2e8f0' }, cursor: { fill: 'rgba(148,163,184,.08)' } };
export const axis = { stroke: '#64748b', fontSize: 11, tickLine: false, axisLine: false };

export const ChartCard = ({ title, children, className = '' }) => (
  <div className={`card p-5 ${className}`}><h3 className="h-sub mb-4">{title}</h3><div className="h-60">{children}</div></div>
);

export function Donut({ data, colors }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <p className="muted grid h-full place-items-center">No data yet</p>;
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3} stroke="none">{data.map((d, i) => <Cell key={d.name} fill={colors[i % colors.length]} />)}</Pie>
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, colors, layout = 'horizontal' }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} layout={layout} margin={{ left: layout === 'vertical' ? 20 : -20, right: 8, top: 4 }}>
        <CartesianGrid stroke="#233048" strokeDasharray="3 3" vertical={layout === 'vertical'} horizontal={layout !== 'vertical'} />
        {layout === 'vertical' ? <><XAxis type="number" {...axis} allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} {...axis} /></> : <><XAxis dataKey="name" {...axis} /><YAxis {...axis} allowDecimals={false} /></>}
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="value" radius={4}>{data.map((d, i) => <Cell key={d.name} fill={colors[i % colors.length]} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [an, setAn] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    Promise.all([dashboardApi.stats(), dashboardApi.analytics()]).then(([s, a]) => { setStats(s); setAn(a); }).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!stats || !an) return <Spinner label="Loading dashboard" />;
  const t = stats.totals;
  const sys = stats.system;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live figures from MongoDB. Counts update whenever rules change.">
        <Link to="/rules/new" className="btn-primary"><Plus size={16} /> Add rule</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total rules" value={t.total} icon={ShieldCheck} tone="text-cyan-300" />
        <StatCard label="Valid rules" value={t.valid} icon={CheckCircle2} tone="text-neon" hint="Pass regex and DFA" />
        <StatCard label="Invalid rules" value={t.invalid} icon={XCircle} tone="text-red-400" hint="Can never be active" />
        <StatCard label="Active rules" value={t.active} icon={Activity} tone="text-neon" hint="Valid, enabled, ALLOW" />
        <StatCard label="Blocked rules" value={t.blocked} icon={Ban} tone="text-amber-300" hint="DENY policy or disabled" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Valid vs invalid"><Donut data={an.validVsInvalid} colors={[COLORS.neon, COLORS.red]} /></ChartCard>
        <ChartCard title="Protocols"><Bars data={an.protocolDistribution} colors={[COLORS.blue, COLORS.cyan, COLORS.amber, COLORS.gray]} /></ChartCard>
        <ChartCard title="Allow vs deny"><Donut data={an.actionDistribution} colors={[COLORS.cyan, COLORS.red]} /></ChartCard>
        <ChartCard title="Status distribution"><Bars data={an.statusDistribution} colors={[COLORS.neon, COLORS.amber, COLORS.red]} /></ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h3 className="h-sub mb-4">Rule creation history, last 14 days</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={an.ruleCreationTimeline} margin={{ left: -20, right: 8, top: 4 }}>
                <defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.neon} stopOpacity={0.4} /><stop offset="100%" stopColor={COLORS.neon} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#233048" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDay} {...axis} /><YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tooltipStyle} labelFormatter={fmtDay} />
                <Area type="monotone" dataKey="created" name="Rules created" stroke={COLORS.neon} strokeWidth={2} fill="url(#gc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="h-sub mb-4">System status</h3>
          <ul className="space-y-3 text-sm">
            {[['API server', Server, sys.api === 'online'], ['MongoDB', Database, sys.database === 'connected'], ['DFA engine', Cpu, sys.dfaEngine === 'online'], ['Regex validator', Regex, sys.regexValidator === 'online']].map(([n, Icon, ok]) => (
              <li key={n} className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-300"><Icon size={16} className="text-slate-500" />{n}</span><Badge tone={ok ? 'green' : 'red'}>{ok ? 'ONLINE' : 'OFFLINE'}</Badge></li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-xs text-slate-500">Uptime {fmtUptime(sys.uptimeSeconds)} - Node {sys.nodeVersion}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <h3 className="h-sub mb-3">Recent activity</h3>
          {stats.recentActivity.length === 0 ? <p className="muted">No activity yet.</p> : (
            <ul className="space-y-3">{stats.recentActivity.map((a) => (
              <li key={a.id} className="border-l-2 border-neon/40 pl-3"><p className="text-sm text-slate-200">{a.message}</p><p className="text-xs text-slate-500">{a.adminName} - {fmtShort(a.createdAt)}</p></li>
            ))}</ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="h-sub mb-3">Recent validation attempts</h3>
          {stats.recentValidations.length === 0 ? <p className="muted">No validations yet.</p> : (
            <ul className="space-y-3">{stats.recentValidations.map((v) => (
              <li key={v.id} className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="mono truncate text-slate-200">{v.inputRule || '(empty)'}</p><p className="text-xs text-slate-500">{fmtShort(v.createdAt)}</p></div><ValidationBadge value={v.validationStatus} /></li>
            ))}</ul>
          )}
          <Link to="/history" className="mt-4 inline-block text-sm text-cyan-300 hover:underline">Open validation history</Link>
        </div>
        <div className="card p-5">
          <h3 className="h-sub mb-3">Newest rules</h3>
          {stats.recentRules.length === 0 ? <p className="muted">No rules yet.</p> : (
            <ul className="space-y-3">{stats.recentRules.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3"><div className="min-w-0"><Link to={`/rules/${r.id}`} className="block truncate text-sm text-slate-100 hover:text-neon">{r.ruleId} {r.ruleName}</Link><p className="text-xs text-slate-500">{fmtShort(r.createdAt)}</p></div><StatusBadge rule={r} /></li>
            ))}</ul>
          )}
          <Link to="/rules" className="mt-4 inline-block text-sm text-cyan-300 hover:underline">Manage all rules</Link>
        </div>
      </div>
    </>
  );
}
