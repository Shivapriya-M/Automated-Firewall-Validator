import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Copy, ArrowUpDown, Files, Power } from 'lucide-react';
import { rulesApi, errMsg } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import usePreferences from '../hooks/usePreferences.js';
import { PageHeader, Spinner, EmptyState, ErrorBox, Pagination } from '../components/ui.jsx';
import { StatusBadge, ValidationBadge, ActionBadge, ProtocolBadge, Badge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';

const COLS = [['ruleId', 'ID'], ['ruleName', 'Name'], [null, 'Source > Destination'], [null, 'Ports'], ['protocol', 'Protocol'], ['action', 'Action'], ['priority', 'Priority'], ['validationStatus', 'Validation'], [null, 'Status'], ['enabled', 'Enabled'], [null, '']];

export default function Rules() {
  const toast = useToast();
  const navigate = useNavigate();
  const [prefs] = usePreferences();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ protocol: '', action: '', status: '', enabled: '' });
  const [sort, setSort] = useState({ sort: 'priority', order: 'asc' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const dq = useDebounce(q);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const params = { q: dq, ...filters, ...sort, page, limit: 10 };
    Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
    rulesApi.list(params).then(setData).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [dq, filters, sort, page]);
  useEffect(load, [load]);
  useEffect(() => setPage(1), [dq, filters]);

  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const toggleSort = (field) => field && setSort((s) => ({ sort: field, order: s.sort === field && s.order === 'asc' ? 'desc' : 'asc' }));

  const toggle = async (rule) => {
    try { await rulesApi.toggle(rule.id, !rule.enabled); toast.success(`${rule.ruleId} ${rule.enabled ? 'disabled' : 'enabled'}`); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const remove = async (rule) => {
    try { await rulesApi.remove(rule.id); toast.success(`${rule.ruleId} deleted`); setToDelete(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const clone = (r) => navigate('/rules/new', { state: { prefill: { ...r, ruleName: `${r.ruleName} (copy)` } } });

  return (
    <>
      <PageHeader title="Firewall rules" subtitle="Search, filter and manage every rule. Status is derived from validation, the enabled switch and the ALLOW/DENY action.">
        <Link to="/rules/new" className="btn-primary"><Plus size={16} /> Add rule</Link>
      </PageHeader>

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-[1fr_repeat(4,150px)]">
        <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-500" /><input className="input pl-9" placeholder="Search name, ID, IP, port or description" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search rules" /></div>
        <select className="input" value={filters.status} onChange={setFilter('status')} aria-label="Filter by status"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="BLOCKED">Blocked</option><option value="VALID">Valid</option><option value="INVALID">Invalid</option></select>
        <select className="input" value={filters.protocol} onChange={setFilter('protocol')} aria-label="Filter by protocol"><option value="">All protocols</option>{['TCP', 'UDP', 'ICMP', 'ANY'].map((p) => <option key={p}>{p}</option>)}</select>
        <select className="input" value={filters.action} onChange={setFilter('action')} aria-label="Filter by action"><option value="">Allow and deny</option><option>ALLOW</option><option>DENY</option></select>
        <select className="input" value={filters.enabled} onChange={setFilter('enabled')} aria-label="Filter by enabled"><option value="">Enabled or not</option><option value="true">Enabled</option><option value="false">Disabled</option></select>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : (
        <div className="card overflow-hidden">
          {loading && !data ? <Spinner /> : data?.rules.length === 0 ? (
            <EmptyState title="No rules match" hint="Clear the search or filters, or add a new rule."><Link to="/rules/new" className="btn-primary mt-2"><Plus size={16} /> Add rule</Link></EmptyState>
          ) : (
            <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <table className="tbl">
                <thead><tr>{COLS.map(([f, label], i) => (
                  <th key={i}>{f ? <button className="inline-flex items-center gap-1 hover:text-white" onClick={() => toggleSort(f)}>{label}<ArrowUpDown size={12} className={sort.sort === f ? 'text-neon' : 'opacity-40'} /></button> : label}</th>
                ))}</tr></thead>
                <tbody>
                  {data.rules.map((r) => (
                    <tr key={r.id}>
                      <td className="mono text-slate-400">{r.ruleId}</td>
                      <td className="max-w-[220px]"><Link to={`/rules/${r.id}`} className="font-medium text-slate-100 hover:text-neon">{r.ruleName}</Link>{r.duplicateOf && <div className="mt-1"><Badge tone="amber" title={`Identical to ${r.duplicateOf}`}><Files size={11} /> DUPLICATE OF {r.duplicateOf}</Badge></div>}</td>
                      <td className="mono whitespace-nowrap">{r.sourceIP || <span className="text-red-400">missing</span>} <span className="text-slate-600">{'>'}</span> {r.destinationIP || <span className="text-red-400">missing</span>}</td>
                      <td className="mono whitespace-nowrap">{r.sourcePort || '-'} <span className="text-slate-600">{'>'}</span> {r.destinationPort || '-'}</td>
                      <td><ProtocolBadge value={r.protocol} /></td>
                      <td><ActionBadge value={r.action} /></td>
                      <td className="mono">{r.priority}</td>
                      <td><ValidationBadge value={r.validationStatus} /></td>
                      <td><StatusBadge rule={r} /></td>
                      <td>
                        <button role="switch" aria-checked={r.enabled} aria-label={`${r.enabled ? 'Disable' : 'Enable'} ${r.ruleId}`} disabled={r.validationStatus !== 'VALID' && !r.enabled}
                          title={r.validationStatus !== 'VALID' ? 'Invalid rules cannot be enabled' : r.enabled ? 'Disable rule' : 'Enable rule'} onClick={() => toggle(r)}
                          className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${r.enabled ? 'bg-neon' : 'bg-slate-600'}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-navy-950 transition-all ${r.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="whitespace-nowrap">
                        <Link to={`/rules/${r.id}`} className="icon-btn" title="View details" aria-label="View details"><Eye size={16} /></Link>
                        <Link to={`/rules/${r.id}/edit`} className="icon-btn" title="Edit" aria-label="Edit"><Pencil size={16} /></Link>
                        <button className="icon-btn" title="Duplicate as new rule" aria-label="Duplicate as new rule" onClick={() => clone(r)}><Copy size={16} /></button>
                        <button className="icon-btn hover:text-red-400" title="Delete" aria-label="Delete" onClick={() => (prefs.confirmDelete ? setToDelete(r) : remove(r))}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} onPage={setPage} />}
        </div>
      )}
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Power size={13} /> DENY policy and DISABLED both lead to BLOCKED, but they are different: DENY is the rule's purpose, DISABLED is an administrator's switch.</p>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete rule"
        footer={<><button className="btn-ghost" onClick={() => setToDelete(null)}>Cancel</button><button className="btn-danger" onClick={() => remove(toDelete)}><Trash2 size={16} /> Delete rule</button></>}>
        <p className="text-sm text-slate-300">Delete <span className="font-semibold text-white">{toDelete?.ruleId} {toDelete?.ruleName}</span>? This cannot be undone.</p>
      </Modal>
    </>
  );
}
