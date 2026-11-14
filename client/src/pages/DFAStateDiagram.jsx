import { useState } from 'react';
import useDFADefinition from '../hooks/useDFADefinition.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import DFADiagram from '../components/DFADiagram.jsx';

export default function DFAStateDiagram() {
  const { def, error } = useDFADefinition();
  const [focus, setFocus] = useState(null);
  if (error) return <p className="text-red-400">Could not load the DFA definition.</p>;
  if (!def) return <Spinner />;
  const happy = ['q0>q1', 'q1>q2', 'q2>q3', 'q3>q4'];

  return (
    <>
      <PageHeader title="DFA state diagram" subtitle="Green path: a rule accepted by the DFA. Dashed lines: every other symbol falls into the trap state qReject, which can never be left." />
      <div className="card p-5">
        <DFADiagram def={def} activeState={focus} visited={focus === 'q4' ? happy : []} />
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="muted mr-2">Highlight a state:</span>
          {def.states.map((s) => <button key={s.id} className={`rounded-full border px-3 py-1 font-mono text-xs ${focus === s.id ? 'border-neon text-neon' : 'border-line text-slate-400 hover:text-white'}`} onClick={() => setFocus(focus === s.id ? null : s.id)}>{s.id}</button>)}
        </div>
        {focus && <p className="mt-3 text-sm text-slate-300"><span className="mono text-white">{focus}</span> - {def.states.find((s) => s.id === focus).label}</p>}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[['Blue circle', 'A normal state. The DFA is part-way through a rule.'], ['Double green circle', 'The accepting state q4. Ending here means the rule is well formed.'], ['Red circle', 'The trap state qReject. Once entered, every further token keeps the DFA there.']].map(([t, d]) => <div key={t} className="card p-4"><p className="text-sm font-medium text-white">{t}</p><p className="muted mt-1">{d}</p></div>)}
      </div>
    </>
  );
}
