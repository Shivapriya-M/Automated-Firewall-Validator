import { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Trash2, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { validationApi, errMsg } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import useDebounce from '../hooks/useDebounce.js';
import { PageHeader, Spinner, EmptyState, ErrorBox, Pagination } from '../components/ui.jsx';
import { ValidationBadge, Badge } from '../components/Badges.jsx';
import Modal from '../components/Modal.jsx';
import DFASteps, { Verdict } from '../components/DFASteps.jsx';
import { fmtDate, fmtShort, FIELD_NAMES } from '../utils/format.js';

const SOURCES = { VALIDATOR: ['Validator', 'cyan'], SIMULATOR: ['Simulator', 'blue'], RULE_SAVE: ['Rule save', 'gray'] };

export default function ValidationHistory() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const dq = useDebounce(q);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const params = { q: dq, status, source, page, limit: 10 };
    Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
    validationApi.history(params).then(setData).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [dq, status, source, page]);
  useEffect(load, [load]);
  useEffect(() => setPage(1), [dq, status, source]);

  const clear = async () => { try { const r = await validationApi.clear(); toast.success(r.message); setConfirm(false); load(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <>
      <PageHeader title="Validation history" subtitle="Every validation, simulation and rule save is recorded with its DFA steps, errors, time and the admin who ran it.">
        <button className="btn-ghost hover:text-red-400" onClick={() => setConfirm(true)}><Trash2 size={16} /> Clear history</button>
      </PageHeader>

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-[1fr_170px_170px]">
        <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-500" /><input className="input pl-9" placeholder="Search the validated rule text" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search history" /></div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by result"><option value="">Valid and invalid</option><option value="VALID">Valid</option><option value="INVALID">Invalid</option></select>
        <select className="input" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source"><option value="">All sources</option>{Object.entries(SOURCES).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : (
        <div className="card overflow-hidden">
          {loading && !data ? <Spinner /> : data?.history.length === 0 ? <EmptyState title="No validation history" hint="Run a validation or the DFA simulator and it will appear here."><Link to="/dfa/simulator" className="btn-primary mt-2"><Cpu size={16} /> Open simulator</Link></EmptyState> : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Time</th><th>Rule validated</th><th>Result</th><th>DFA end state</th><th>Errors</th><th>Source</th><th>Admin</th><th /></tr></thead>
                <tbody>{data.history.map((h) => (
                  <tr key={h.id}>
                    <td className="whitespace-nowrap text-slate-400">{fmtShort(h.createdAt)}</td>
                    <td className="mono max-w-[280px] truncate">{h.inputRule || <i className="text-slate-600">(empty)</i>}</td>
                    <td><ValidationBadge value={h.validationStatus} /></td>
                    <td className={`mono ${h.dfaAccepted ? 'text-neon' : 'text-red-400'}`}>{h.dfaFinalState}</td>
                    <td className="mono">{h.errors.length}</td>
                    <td><Badge tone={SOURCES[h.source]?.[1]}>{SOURCES[h.source]?.[0] || h.source}</Badge></td>
                    <td className="text-slate-400">{h.adminName || '-'}</td>
                    <td><button className="icon-btn" onClick={() => setDetail(h)} aria-label="View details" title="View details"><Eye size={16} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {data && <Pagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} onPage={setPage} />}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Validation details" wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div><p className="text-xs text-slate-500">When</p>{fmtDate(detail.createdAt)}</div>
              <div><p className="text-xs text-slate-500">Admin</p>{detail.adminName || '-'} {detail.adminEmail && <span className="text-slate-500">({detail.adminEmail})</span>}</div>
              <div><p className="text-xs text-slate-500">Result</p><ValidationBadge value={detail.validationStatus} /></div>
            </div>
            <div><p className="mb-1 text-xs text-slate-500">Original rule</p><p className="mono break-all rounded bg-navy-900 p-2 text-cyan-300">{detail.inputRule || '(empty)'}</p></div>
            <Verdict dfa={{ accepted: detail.dfaAccepted, finalState: detail.dfaFinalState, reason: detail.errors[0]?.message }} />
            {detail.errors.length > 0 && <div><p className="mb-1 text-xs text-slate-500">Validation errors</p><ul className="space-y-1 text-sm text-slate-300">{detail.errors.map((e, i) => <li key={i}>- <span className="font-medium text-slate-100">{FIELD_NAMES[e.field] || e.field}:</span> {e.message}</li>)}</ul></div>}
            <div><p className="mb-1 text-xs text-slate-500">DFA execution steps</p><DFASteps steps={detail.dfaTransitions} /></div>
            <Link className="btn-ghost" to={`/dfa/simulator?rule=${encodeURIComponent(detail.inputRule)}`}><Cpu size={16} /> Replay in simulator</Link>
          </div>
        )}
      </Modal>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Clear validation history" footer={<><button className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button><button className="btn-danger" onClick={clear}>Clear all entries</button></>}>
        <p className="text-sm text-slate-300">This deletes every validation history entry. Firewall rules are not affected.</p>
      </Modal>
    </>
  );
}
