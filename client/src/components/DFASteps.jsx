import { ArrowRight } from 'lucide-react';

/** Execution history table for a DFA run. `upTo` limits how many steps are shown (for animation). */
export default function DFASteps({ steps, upTo = steps?.length ?? 0 }) {
  const shown = (steps || []).slice(0, upTo);
  if (!shown.length) return <p className="muted py-4">No steps yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>Step</th><th>Token read</th><th>Symbol</th><th>Transition</th><th>Result</th></tr></thead>
        <tbody>
          {shown.map((s) => (
            <tr key={s.step}>
              <td className="mono text-slate-500">{s.step}</td>
              <td className="mono text-slate-100">{s.token === '' ? <i className="text-slate-500">(empty)</i> : s.token}</td>
              <td className="mono text-cyan-300">{s.symbol}</td>
              <td className="mono whitespace-nowrap"><span className="text-blue-300">{s.from}</span> <ArrowRight size={12} className="mx-1 inline text-slate-600" /> <span className={s.rejecting ? 'text-red-400' : s.accepting ? 'text-neon' : 'text-blue-300'}>{s.to}</span></td>
              <td className={`text-xs ${s.rejecting ? 'text-red-300' : 'text-slate-300'}`}>{s.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Verdict({ dfa }) {
  const ok = dfa.accepted;
  return (
    <div className={`rounded-lg border p-4 ${ok ? 'border-neon/40 bg-neon/5' : 'border-red-500/40 bg-red-500/5'}`}>
      <p className={`text-sm font-semibold ${ok ? 'text-neon' : 'text-red-300'}`}>{ok ? 'ACCEPTED - the DFA finished in accepting state q4' : `REJECTED - the DFA finished in ${dfa.finalState}`}</p>
      {!ok && dfa.reason && <p className="mt-1 text-sm text-slate-300">{dfa.reason}</p>}
    </div>
  );
}
