import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Cpu, Trash2, Power, ArrowLeft, AlertCircle, Files } from 'lucide-react';
import { rulesApi, errMsg } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { PageHeader, Spinner, ErrorBox } from '../components/ui.jsx';
import { StatusBadge, ValidationBadge, ActionBadge, ProtocolBadge, Badge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';
import { fmtDate, FIELD_NAMES } from '../utils/format.js';

const Item = ({ label, children }) => <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-100">{children}</dd></div>;

export default function RuleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rule, setRule] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { rulesApi.get(id).then((d) => setRule(d.rule)).catch((e) => setError(errMsg(e))); }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!rule) return <Spinner />;
  const dfaString = [rule.destinationIP, rule.destinationPort || (rule.protocol === 'ICMP' ? '0' : ''), rule.protocol, rule.action].join(',');

  const toggle = async () => { try { const d = await rulesApi.toggle(rule.id, !rule.enabled); setRule(d.rule); toast.success(`Rule ${d.rule.enabled ? 'enabled' : 'disabled'}`); } catch (e) { toast.error(errMsg(e)); } };
  const remove = async () => { try { await rulesApi.remove(rule.id); toast.success('Rule deleted'); navigate('/rules'); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <>
      <PageHeader title={`${rule.ruleId}  ${rule.ruleName}`} subtitle={rule.description || 'No description'}>
        <Link to="/rules" className="btn-ghost"><ArrowLeft size={16} /> All rules</Link>
        <button className="btn-ghost" onClick={toggle} disabled={rule.validationStatus !== 'VALID' && !rule.enabled}><Power size={16} /> {rule.enabled ? 'Disable' : 'Enable'}</button>
        <Link to={`/rules/${rule.id}/edit`} className="btn-ghost"><Pencil size={16} /> Edit</Link>
        <button className="btn-danger" onClick={() => setConfirm(true)}><Trash2 size={16} /> Delete</button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <Item label="Source IP"><span className="mono">{rule.sourceIP || <span className="text-red-400">missing</span>}</span></Item>
            <Item label="Destination IP"><span className="mono">{rule.destinationIP || <span className="text-red-400">missing</span>}</span></Item>
            <Item label="Source port"><span className="mono">{rule.sourcePort || '-'}</span></Item>
            <Item label="Destination port"><span className="mono">{rule.destinationPort || '-'}</span></Item>
            <Item label="Protocol"><ProtocolBadge value={rule.protocol} /></Item>
            <Item label="Action"><ActionBadge value={rule.action} /></Item>
            <Item label="Priority"><span className="mono">{rule.priority}</span></Item>
            <Item label="Enabled">{rule.enabled ? 'Yes' : 'No (administratively disabled)'}</Item>
            <Item label="Created">{fmtDate(rule.createdAt)}</Item>
            <Item label="Last updated">{fmtDate(rule.updatedAt)}</Item>
          </dl>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="h-sub mb-3">Classification</h3>
            <dl className="space-y-3">
              <Item label="Validation status"><ValidationBadge value={rule.validationStatus} /></Item>
              <Item label="Display status"><StatusBadge rule={rule} /></Item>
              {rule.duplicateOf && <Item label="Duplicate"><Badge tone="amber"><Files size={11} /> Identical to {rule.duplicateOf}</Badge></Item>}
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="h-sub mb-2">DFA input</h3>
            <p className="mono break-all rounded bg-navy-900 p-2 text-cyan-300">{dfaString}</p>
            <Link to={`/dfa/simulator?rule=${encodeURIComponent(dfaString)}`} className="btn-ghost mt-3 w-full"><Cpu size={16} /> Run in DFA simulator</Link>
          </div>
        </div>
      </div>

      {rule.validationErrors?.length > 0 && (
        <div className="card mt-4 border-red-500/30 p-5">
          <h3 className="h-sub mb-3 text-red-300">Validation errors ({rule.validationErrors.length})</h3>
          <ul className="space-y-2">{rule.validationErrors.map((e, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-300"><AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" /><span><span className="font-medium text-slate-100">{FIELD_NAMES[e.field] || e.field}:</span> {e.message}</span></li>)}</ul>
        </div>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete rule" footer={<><button className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button><button className="btn-danger" onClick={remove}>Delete rule</button></>}>
        <p className="text-sm text-slate-300">Delete <b className="text-white">{rule.ruleId} {rule.ruleName}</b> permanently?</p>
      </Modal>
    </>
  );
}
