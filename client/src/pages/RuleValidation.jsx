import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Check, X, PlusCircle, Cpu } from 'lucide-react';
import { validationApi, errMsg } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Field } from '../components/ui.jsx';
import { ValidationBadge } from '../components/Badges.jsx';
import DFASteps, { Verdict } from '../components/DFASteps.jsx';
import { Link } from 'react-router-dom';

const EMPTY = { sourceIP: '', destinationIP: '', sourcePort: '', destinationPort: '', protocol: '', action: '' };
const SAMPLES = [
  ['Valid HTTPS', { sourceIP: '10.0.0.5', destinationIP: '192.168.1.10', sourcePort: '0', destinationPort: '443', protocol: 'TCP', action: 'ALLOW' }],
  ['Octet 300', { sourceIP: '192.168.1.300', destinationIP: '10.0.0.8', sourcePort: '0', destinationPort: '80', protocol: 'TCP', action: 'ALLOW' }],
  ['Port 70000', { sourceIP: '10.0.0.7', destinationIP: '192.168.1.30', sourcePort: '0', destinationPort: '70000', protocol: 'UDP', action: 'DENY' }],
  ['Protocol HTTP', { sourceIP: '10.0.0.9', destinationIP: '192.168.1.31', sourcePort: '0', destinationPort: '80', protocol: 'HTTP', action: 'ALLOW' }],
  ['Missing fields', { sourceIP: '10.0.0.10', destinationIP: '', sourcePort: '', destinationPort: '8080', protocol: 'TCP', action: '' }],
];
const ROWS = [['sourceIP', 'Source IP address'], ['destinationIP', 'Destination IP address'], ['sourcePort', 'Source port'], ['destinationPort', 'Destination port'], ['protocol', 'Protocol'], ['action', 'Action']];

export default function RuleValidation() {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try { setRes(await validationApi.validate({ fields: form })); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const errFor = (f) => res?.errorMap?.[f];

  return (
    <>
      <PageHeader title="Rule validation" subtitle="Test any combination of values without saving a rule. Each field is checked with a regular expression plus range checks, then the DFA reads the rule as one string. Every attempt is stored in the validation history." />

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form onSubmit={run} className="card space-y-4 p-5 self-start" noValidate>
          <div className="flex flex-wrap gap-1.5">{SAMPLES.map(([n, v]) => <button type="button" key={n} className="rounded-full border border-line px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-400/60 hover:text-white" onClick={() => setForm(v)}>{n}</button>)}</div>
          {ROWS.map(([k, label]) => (
            <Field key={k} label={label} htmlFor={`v-${k}`} error={errFor(k)}>
              <input id={`v-${k}`} className={`input mono ${errFor(k) ? 'input-error' : ''}`} value={form[k]} onChange={set(k)} placeholder={{ sourceIP: '10.0.0.5', destinationIP: '192.168.1.10', sourcePort: '0', destinationPort: '443', protocol: 'TCP', action: 'ALLOW' }[k]} />
            </Field>
          ))}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Validate rule</button>
            <button type="button" className="btn-ghost" onClick={() => { setForm(EMPTY); setRes(null); }}>Clear</button>
          </div>
        </form>

        <div className="space-y-4">
          {!res ? (
            <div className="card grid min-h-[300px] place-items-center p-8 text-center"><div><ShieldCheck size={36} className="mx-auto text-slate-600" /><p className="mt-3 font-medium text-slate-200">No result yet</p><p className="muted mt-1">Fill in the form or pick a sample, then validate.</p></div></div>
          ) : (
            <>
              <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
                <div><p className="text-xs text-slate-500">Overall result</p><p className="mt-1 flex items-center gap-3"><ValidationBadge value={res.validationStatus} /><span className="text-sm text-slate-300">{res.errors.length === 0 ? 'Regex checks and DFA both pass.' : `${res.errors.length} problem(s) found.`}</span></p></div>
                {res.validationStatus === 'VALID' || res.errors.length ? <button className="btn-ghost" onClick={() => navigate('/rules/new', { state: { prefill: { ...res.normalized, ruleName: '' } } })}><PlusCircle size={16} /> Create rule from these values</button> : null}
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-line px-5 py-3"><h3 className="h-sub">Regex and range validation, field by field</h3></div>
                <table className="tbl">
                  <thead><tr><th>Field</th><th>Value</th><th>Result</th></tr></thead>
                  <tbody>{ROWS.map(([k, label]) => (
                    <tr key={k}><td>{label}</td><td className="mono">{res.normalized[k] || <i className="text-slate-600">empty</i>}</td>
                      <td>{errFor(k) ? <span className="flex items-start gap-1.5 text-xs text-red-300"><X size={14} className="mt-0.5 shrink-0" />{errFor(k)}</span> : <span className="flex items-center gap-1.5 text-xs text-neon"><Check size={14} />Valid</span>}</td></tr>
                  ))}</tbody>
                </table>
              </div>

              <div className="card space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="h-sub">DFA run on <span className="mono ml-1 text-cyan-300">{res.dfaInput}</span></h3>
                  <Link to={`/dfa/simulator?rule=${encodeURIComponent(res.dfaInput)}`} className="btn-ghost"><Cpu size={16} /> Animate in simulator</Link>
                </div>
                <Verdict dfa={res.dfa} />
                <DFASteps steps={res.dfa.steps} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
