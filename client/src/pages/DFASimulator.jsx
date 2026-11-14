import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, SkipForward, RotateCcw, FastForward, Loader2 } from 'lucide-react';
import { validationApi, errMsg } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useDFADefinition from '../hooks/useDFADefinition.js';
import usePreferences from '../hooks/usePreferences.js';
import { PageHeader, Spinner } from '../components/ui.jsx';
import DFADiagram from '../components/DFADiagram.jsx';
import DFASteps, { Verdict } from '../components/DFASteps.jsx';
import { Badge, ValidationBadge } from '../components/Badges.jsx';

const EXAMPLES = ['192.168.1.10,443,TCP,ALLOW', '10.0.0.5,53,UDP,DENY', '172.16.0.9,0,ICMP,ALLOW', '256.1.1.1,443,TCP,ALLOW', '192.168.1.10,70000,TCP,ALLOW', '192.168.1.10,443,HTTP,ALLOW', '192.168.1.10,443,TCP', '443,192.168.1.10,TCP,ALLOW'];

export default function DFASimulator() {
  const toast = useToast();
  const [params] = useSearchParams();
  const { def } = useDFADefinition();
  const [prefs] = usePreferences();
  const [input, setInput] = useState(params.get('rule') || EXAMPLES[0]);
  const [result, setResult] = useState(null);
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const steps = result?.dfa.steps || [];
  const total = steps.length;
  const done = result && shown >= total;
  const current = shown === 0 ? 'q0' : steps[shown - 1].to;
  const visited = steps.slice(0, shown).map((s) => `${s.from}>${s.to}`);

  useEffect(() => {
    clearInterval(timer.current);
    if (!playing) return undefined;
    timer.current = setInterval(() => setShown((n) => { if (n + 1 >= total) setPlaying(false); return Math.min(n + 1, total); }), prefs.animationMs);
    return () => clearInterval(timer.current);
  }, [playing, total, prefs.animationMs]);

  const run = useCallback(async (text = input, autoplay = true) => {
    setBusy(true); setPlaying(false);
    try {
      const r = await validationApi.validate({ rule: text, source: 'SIMULATOR' });
      setResult(r); setShown(0);
      if (r.dfa.steps.length) setPlaying(autoplay); else setShown(0);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  }, [input, toast]);

  useEffect(() => { if (params.get('rule')) run(params.get('rule')); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setPlaying(false); setShown(0); };
  const stepOnce = () => { setPlaying(false); setShown((n) => Math.min(n + 1, total)); };
  const finish = () => { setPlaying(false); setShown(total); };

  if (!def) return <Spinner />;
  const lastStep = shown > 0 ? steps[shown - 1] : null;

  return (
    <>
      <PageHeader title="DFA simulator" subtitle="Type a rule as destinationIP,destinationPort,protocol,action. The automaton reads one token at a time and moves between states. The engine does not use regular expressions." />

      <div className="card p-5">
        <label className="label" htmlFor="dfa-input">Rule string</label>
        <div className="flex flex-wrap gap-2">
          <input id="dfa-input" className="input mono min-w-[260px] flex-1" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} spellCheck={false} />
          <button className="btn-primary" disabled={busy} onClick={() => run()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run DFA</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{EXAMPLES.map((ex) => <button key={ex} className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-slate-400 hover:border-cyan-400/60 hover:text-white" onClick={() => { setInput(ex); run(ex); }}>{ex}</button>)}</div>
      </div>

      {result && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="h-sub">Tape (tokens)</h3>
                <div className="flex gap-1.5">
                  <button className="btn-ghost" onClick={() => (playing ? setPlaying(false) : done ? run(result.inputRule) : setPlaying(true))} disabled={!total}><Play size={15} />{playing ? 'Pause' : done ? 'Replay' : 'Play'}</button>
                  <button className="btn-ghost" onClick={stepOnce} disabled={!total || done}><SkipForward size={15} /> Step</button>
                  <button className="btn-ghost" onClick={finish} disabled={!total || done}><FastForward size={15} /> Finish</button>
                  <button className="btn-ghost" onClick={reset} disabled={shown === 0}><RotateCcw size={15} /> Reset</button>
                </div>
              </div>
              {total === 0 ? <p className="muted">The input is empty, so the DFA reads no tokens and stays in q0.</p> : (
                <div className="flex flex-wrap gap-2">
                  {steps.map((s, i) => {
                    const state = i < shown ? (s.rejecting ? 'bad' : 'ok') : i === shown ? 'next' : 'idle';
                    const cls = { bad: 'border-red-500/60 bg-red-500/10 text-red-300', ok: 'border-neon/50 bg-neon/10 text-neon', next: 'border-cyan-400/70 text-cyan-200 ring-2 ring-cyan-400/30', idle: 'border-line text-slate-500' }[state];
                    return (
                      <div key={i} className={`min-w-[84px] rounded-md border px-3 py-2 text-center transition-all ${cls}`}>
                        <p className="font-mono text-sm">{s.token === '' ? '(empty)' : s.token}</p>
                        <p className="mt-0.5 text-[10px]">{i < shown ? s.symbol : i === shown ? 'reading next' : 'waiting'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-4">
                <div><p className="text-xs text-slate-500">Current state</p><p className={`font-mono text-2xl font-bold ${current === 'qReject' ? 'text-red-400' : current === 'q4' ? 'text-neon' : 'text-blue-300'}`}>{current}</p></div>
                <div className="min-w-[200px] flex-1"><p className="text-xs text-slate-500">Last move</p><p className="text-sm text-slate-200">{lastStep ? lastStep.note : 'Waiting in the start state q0'}</p></div>
                <div><p className="text-xs text-slate-500">Progress</p><p className="font-mono text-sm text-slate-200">{shown}/{total} tokens</p></div>
              </div>
            </div>

            {done && (
              <div className="space-y-3 animate-rise">
                <Verdict dfa={result.dfa} />
                <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
                  <span className="text-slate-400">Regex validator says:</span><ValidationBadge value={result.errors.length === 0 ? 'VALID' : 'INVALID'} />
                  <span className="text-slate-400">DFA says:</span><ValidationBadge value={result.dfa.accepted ? 'VALID' : 'INVALID'} />
                  <Badge tone={result.engineAgreement ? 'green' : 'amber'}>{result.engineAgreement ? 'ENGINES AGREE' : 'ENGINES DISAGREE'}</Badge>
                </div>
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="border-b border-line px-5 py-3"><h3 className="h-sub">Execution history</h3></div>
              <DFASteps steps={steps} upTo={shown} />
            </div>
          </div>

          <div className="card self-start p-4"><h3 className="h-sub mb-2">Live state diagram</h3><DFADiagram def={def} activeState={current} visited={visited} compact /></div>
        </div>
      )}
    </>
  );
}
