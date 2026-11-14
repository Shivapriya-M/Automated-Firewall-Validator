import useDFADefinition from '../hooks/useDFADefinition.js';
import { PageHeader, Spinner } from '../components/ui.jsx';

export default function DFATable() {
  const { def, error } = useDFADefinition();
  if (error) return <p className="text-red-400">Could not load the DFA definition.</p>;
  if (!def) return <Spinner />;
  const sigma = def.alphabet.map((a) => a.symbol);

  return (
    <>
      <PageHeader title="DFA transition table" subtitle="The transition function delta(state, symbol) of the firewall rule DFA, loaded live from the engine on the server." />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>State</th>{sigma.map((s) => <th key={s} className="font-mono text-cyan-300">{s}</th>)}</tr></thead>
              <tbody>
                {def.states.map((st) => (
                  <tr key={st.id}>
                    <td className="whitespace-nowrap"><span className="mono font-bold text-white">{st.initial && <span className="mr-1 text-cyan-300" title="Initial state">{'\u2192'}</span>}{st.accepting && <span className="mr-1 text-neon" title="Accepting state">*</span>}{st.id}</span><p className="mt-0.5 text-[11px] text-slate-500">{st.label}</p></td>
                    {sigma.map((s) => {
                      const to = def.transitions[st.id][s];
                      const valid = to !== def.rejectingStates[0];
                      return <td key={s} className="font-mono"><span className={`rounded px-2 py-1 ${valid ? 'bg-neon/10 font-bold text-neon ring-1 ring-neon/30' : 'text-slate-500'}`}>{to}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-slate-500">{'\u2192'} start state - * accepting state - highlighted cells are the only transitions that do not fall into the trap state qReject.</p>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="h-sub mb-3">Formal definition</h3>
            <p className="font-mono text-sm text-cyan-300">{def.formal}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs text-slate-500">Q, states</dt><dd className="mono">{'{'} {def.states.map((s) => s.id).join(', ')} {'}'}</dd></div>
              <div><dt className="text-xs text-slate-500">Sigma, token classes</dt><dd className="mono">{'{'} {sigma.join(', ')} {'}'}</dd></div>
              <div><dt className="text-xs text-slate-500">q0, initial state</dt><dd className="mono">{def.initialState}</dd></div>
              <div><dt className="text-xs text-slate-500">F, accepting states</dt><dd className="mono text-neon">{'{'} {def.acceptingStates.join(', ')} {'}'}</dd></div>
              <div><dt className="text-xs text-slate-500">Rejecting (trap) state</dt><dd className="mono text-red-400">{def.rejectingStates.join(', ')}</dd></div>
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="h-sub mb-3">Input alphabet</h3>
            <ul className="space-y-2 text-sm">{def.alphabet.map((a) => <li key={a.symbol}><span className="mono text-cyan-300">{a.symbol}</span><span className="text-slate-400"> - {a.description}</span></li>)}</ul>
          </div>
        </div>
      </div>
    </>
  );
}
