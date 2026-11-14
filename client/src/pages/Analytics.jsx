import { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { dashboardApi, errMsg } from '../services/api.js';
import { PageHeader, Spinner, ErrorBox } from '../components/ui.jsx';
import { ChartCard, Donut, Bars, COLORS, tooltipStyle, axis } from './Dashboard.jsx';
import { fmtDay } from '../utils/format.js';
import { FIELD_NAMES } from '../utils/format.js';

export default function Analytics() {
  const [an, setAn] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setError(''); dashboardApi.analytics().then(setAn).catch((e) => setError(errMsg(e))); }, []);
  useEffect(load, [load]);
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!an) return <Spinner label="Loading analytics" />;
  const errs = an.topErrorFields.map((e) => ({ ...e, name: FIELD_NAMES[e.name] || e.name }));

  return (
    <>
      <PageHeader title="Analytics" subtitle="Distribution of rules and validation results. All figures are calculated by the backend from MongoDB." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Valid vs invalid rules"><Donut data={an.validVsInvalid} colors={[COLORS.neon, COLORS.red]} /></ChartCard>
        <ChartCard title="Protocol distribution"><Bars data={an.protocolDistribution} colors={[COLORS.blue, COLORS.cyan, COLORS.amber, COLORS.gray]} /></ChartCard>
        <ChartCard title="ALLOW vs DENY"><Donut data={an.actionDistribution} colors={[COLORS.cyan, COLORS.red]} /></ChartCard>
        <ChartCard title="Status distribution"><Bars data={an.statusDistribution} colors={[COLORS.neon, COLORS.amber, COLORS.red]} /></ChartCard>
        <ChartCard title="Why valid rules are blocked"><Bars data={an.blockedBreakdown} colors={[COLORS.red, COLORS.gray]} /></ChartCard>
        <ChartCard title="DFA results across all runs"><Donut data={an.dfaResults} colors={[COLORS.neon, COLORS.red]} /></ChartCard>
        <ChartCard title="Validation attempts, last 14 days" className="xl:col-span-2">
          <ResponsiveContainer>
            <BarChart data={an.validationTimeline} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid stroke="#233048" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDay} {...axis} /><YAxis {...axis} allowDecimals={false} />
              <Tooltip {...tooltipStyle} labelFormatter={fmtDay} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
              <Bar dataKey="valid" name="Valid" stackId="a" fill={COLORS.neon} /><Bar dataKey="invalid" name="Invalid" stackId="a" fill={COLORS.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Most common validation errors">{errs.length ? <Bars data={errs} layout="vertical" colors={[COLORS.red, COLORS.amber, COLORS.cyan, COLORS.blue, COLORS.gray]} /> : <p className="muted grid h-full place-items-center">No errors recorded</p>}</ChartCard>
      </div>
    </>
  );
}
