import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import { rulesApi, errMsg } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { validateRule } from '../utils/validators.js';
import { PageHeader, Field, Spinner } from '../components/ui.jsx';

const EMPTY = { ruleName: '', sourceIP: '', destinationIP: '', sourcePort: '', destinationPort: '', protocol: 'TCP', action: 'ALLOW', priority: '100', description: '', enabled: true };

export default function RuleForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(location.state?.prefill ? pick(location.state.prefill) : {}) }));
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  useEffect(() => {
    if (!editing) return;
    rulesApi.get(id).then((d) => setForm({ ...EMPTY, ...pick(d.rule) })).catch((e) => { toast.error(errMsg(e)); navigate('/rules'); }).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(() => validateRule(form), [form]);
  const err = (f) => ((touched[f] || submitted) ? result.errors[f] || serverErrors[f] : serverErrors[f]);
  const set = (f) => (e) => { setForm((s) => ({ ...s, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); setServerErrors((s) => ({ ...s, [f]: undefined })); };
  const blur = (f) => () => setTouched((t) => ({ ...t, [f]: true }));
  const cls = (f) => `input ${err(f) ? 'input-error' : ''}`;
  const portsOptional = form.protocol.toUpperCase() === 'ICMP';

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!form.ruleName.trim()) return;
    setSaving(true);
    try {
      const res = editing ? await rulesApi.update(id, form) : await rulesApi.create(form);
      if (res.validation.validationStatus === 'INVALID') toast.warning(`Saved as INVALID: ${res.validation.errors.length} problem(s). It will not become active.`);
      else toast.success(editing ? 'Rule updated and validated' : 'Rule created and validated');
      res.warnings.forEach((w) => toast.warning(w));
      navigate(`/rules/${res.rule.id}`);
    } catch (e2) {
      toast.error(errMsg(e2));
      const fe = {}; (e2.response?.data?.details || []).forEach((d) => { fe[d.field] = d.message; }); setServerErrors(fe);
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;
  const invalidCount = result.errorList.length;

  return (
    <>
      <PageHeader title={editing ? 'Edit firewall rule' : 'Add firewall rule'} subtitle="Fields are checked as you type. A rule with errors can still be saved, but it is stored as INVALID and can never be enabled.">
        <button className="btn-ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
      </PageHeader>

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_320px]" noValidate>
        <div className="card space-y-5 p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_140px]">
            <Field label="Rule name" htmlFor="ruleName" error={err('ruleName')}><input id="ruleName" className={cls('ruleName')} value={form.ruleName} onChange={set('ruleName')} onBlur={blur('ruleName')} placeholder="Allow HTTPS to web server" /></Field>
            <Field label="Priority (1-1000)" htmlFor="priority" error={err('priority')}><input id="priority" className={cls('priority')} value={form.priority} onChange={set('priority')} onBlur={blur('priority')} inputMode="numeric" /></Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Source IP address" htmlFor="sourceIP" error={err('sourceIP')} hint="0.0.0.0 means any address"><input id="sourceIP" className={`${cls('sourceIP')} mono`} value={form.sourceIP} onChange={set('sourceIP')} onBlur={blur('sourceIP')} placeholder="10.0.0.5" /></Field>
            <Field label="Destination IP address" htmlFor="destinationIP" error={err('destinationIP')}><input id="destinationIP" className={`${cls('destinationIP')} mono`} value={form.destinationIP} onChange={set('destinationIP')} onBlur={blur('destinationIP')} placeholder="192.168.1.10" /></Field>
            <Field label={`Source port${portsOptional ? ' (optional for ICMP)' : ''}`} htmlFor="sourcePort" error={err('sourcePort')} hint="0 means any port"><input id="sourcePort" className={`${cls('sourcePort')} mono`} value={form.sourcePort} onChange={set('sourcePort')} onBlur={blur('sourcePort')} inputMode="numeric" placeholder="0" /></Field>
            <Field label={`Destination port${portsOptional ? ' (optional for ICMP)' : ''}`} htmlFor="destinationPort" error={err('destinationPort')}><input id="destinationPort" className={`${cls('destinationPort')} mono`} value={form.destinationPort} onChange={set('destinationPort')} onBlur={blur('destinationPort')} inputMode="numeric" placeholder="443" /></Field>
            <Field label="Protocol" htmlFor="protocol" error={err('protocol')}>
              <input id="protocol" list="protocols" className={cls('protocol')} value={form.protocol} onChange={set('protocol')} onBlur={blur('protocol')} placeholder="TCP, UDP, ICMP or ANY" />
              <datalist id="protocols">{['TCP', 'UDP', 'ICMP', 'ANY'].map((p) => <option key={p} value={p} />)}</datalist>
            </Field>
            <Field label="Action" htmlFor="action" error={err('action')}>
              <input id="action" list="actions" className={cls('action')} value={form.action} onChange={set('action')} onBlur={blur('action')} placeholder="ALLOW or DENY" />
              <datalist id="actions">{['ALLOW', 'DENY'].map((p) => <option key={p} value={p} />)}</datalist>
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={err('description')}><textarea id="description" rows={3} className={cls('description')} value={form.description} onChange={set('description')} onBlur={blur('description')} /></Field>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" className="h-4 w-4 accent-[#2cff8a]" checked={form.enabled} onChange={set('enabled')} /> Enable this rule <span className="text-xs text-slate-500">(ignored while the rule is invalid)</span>
          </label>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-0">
          <div className="card p-5">
            <h3 className="h-sub mb-3">Live validation</h3>
            {invalidCount === 0 ? <p className="text-sm text-neon">All fields pass the regex and range checks.</p> : (
              <>
                <p className="mb-2 text-sm text-amber-300">{invalidCount} problem{invalidCount > 1 ? 's' : ''} found</p>
                <ul className="space-y-1.5 text-xs text-slate-400">{result.errorList.map((e) => <li key={e.field}>- {e.message}</li>)}</ul>
              </>
            )}
          </div>
          <div className="card p-5">
            <h3 className="h-sub mb-2">What the DFA will read</h3>
            <p className="mono break-all rounded bg-navy-900 p-2 text-cyan-300">{[form.destinationIP, form.destinationPort || (portsOptional ? '0' : ''), form.protocol, form.action].join(',')}</p>
            <p className="mt-2 text-xs text-slate-500">destinationIP, destinationPort, protocol, action. The server runs this string through the automaton when you save.</p>
          </div>
          <button className="btn-primary w-full" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}{editing ? 'Save changes' : 'Create rule'}</button>
        </aside>
      </form>
    </>
  );
}

function pick(r) {
  const o = {};
  for (const k of Object.keys(EMPTY)) if (r[k] !== undefined && r[k] !== null) o[k] = k === 'priority' ? String(r[k]) : r[k];
  return o;
}
