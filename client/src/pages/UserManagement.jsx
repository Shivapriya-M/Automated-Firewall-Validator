import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Clock3, ShieldCheck, UserRoundCheck, UserRoundX, Users } from 'lucide-react';
import { adminApi, errMsg } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Badge } from '../components/Badges.jsx';
import { EmptyState, ErrorBox, PageHeader, Spinner, StatCard } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';

const TABS = [
  { key: 'PENDING', label: 'Pending Requests', count: 'pending' },
  { key: 'APPROVED', label: 'Approved Users', count: 'approved' },
  { key: 'REJECTED', label: 'Rejected Requests', count: 'rejected' },
];
const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' };
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function UserManagement() {
  const toast = useToast();
  const { refreshPending } = useOutletContext();
  const [status, setStatus] = useState('PENDING');
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.users(status);
      setUsers(result.users);
      setCounts(result.counts);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const decide = async () => {
    if (!confirm) return;
    setSaving(true);
    try {
      const result = confirm.decision === 'APPROVED'
        ? await adminApi.approveUser(confirm.user.id)
        : await adminApi.rejectUser(confirm.user.id);
      toast.success(result.message);
      setConfirm(null);
      await load();
      await refreshPending();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const activeTab = TABS.find((tab) => tab.key === status);

  return (
    <>
      <PageHeader title="User Management" subtitle="Review account requests. Only the superadmin can approve or reject registrations." />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Registered Users" value={counts.total} icon={Users} tone="text-cyan-300" />
        <StatCard label="Pending Requests" value={counts.pending} icon={Clock3} tone="text-amber-300" />
        <StatCard label="Approved Users" value={counts.approved} icon={UserRoundCheck} tone="text-neon" />
        <StatCard label="Rejected Requests" value={counts.rejected} icon={UserRoundX} tone="text-red-400" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Registration status">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" role="tab" aria-selected={status === tab.key}
            className={`rounded-md border px-3 py-2 text-sm transition-colors ${status === tab.key ? 'border-neon/40 bg-neon/10 font-medium text-neon' : 'border-line text-slate-400 hover:bg-charcoal hover:text-white'}`}
            onClick={() => setStatus(tab.key)}>
            {tab.label}<span className="ml-2 rounded bg-navy-950/70 px-1.5 py-0.5 font-mono text-xs">{counts[tab.count]}</span>
          </button>
        ))}
      </div>

      {error ? <ErrorBox message={error} onRetry={load} /> : loading ? <Spinner label="Loading registration requests" /> : users.length === 0 ? (
        <div className="card"><EmptyState title={`No ${activeTab.label.toLowerCase()}`} hint="Registration records will appear here." /></div>
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Username</th><th>Email</th><th>Registration Date</th><th>Account Status</th>{status === 'PENDING' && <th className="text-right">Actions</th>}</tr></thead>
                <tbody>{users.map((account) => (
                  <tr key={account.id}>
                    <td className="font-medium text-slate-100">{account.username}</td>
                    <td className="break-all text-slate-300">{account.email}</td>
                    <td className="whitespace-nowrap text-slate-400">{formatDate(account.createdAt)}</td>
                    <td><Badge tone={STATUS_TONE[account.status]}>{account.status}</Badge></td>
                    {status === 'PENDING' && <td><div className="flex justify-end gap-2">
                      <button type="button" className="btn-primary" onClick={() => setConfirm({ user: account, decision: 'APPROVED' })}><Check size={15} /> Approve</button>
                      <button type="button" className="btn-danger" onClick={() => setConfirm({ user: account, decision: 'REJECTED' })}><UserRoundX size={15} /> Reject</button>
                    </div></td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {users.map((account) => (
              <article key={account.id} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-medium text-white">{account.username}</h2><p className="break-all text-sm text-slate-400">{account.email}</p></div><Badge tone={STATUS_TONE[account.status]}>{account.status}</Badge></div>
                <p className="text-xs text-slate-500">Registered {formatDate(account.createdAt)}</p>
                {status === 'PENDING' && <div className="flex gap-2 border-t border-line pt-3">
                  <button type="button" className="btn-primary flex-1" onClick={() => setConfirm({ user: account, decision: 'APPROVED' })}><Check size={15} /> Approve</button>
                  <button type="button" className="btn-danger flex-1" onClick={() => setConfirm({ user: account, decision: 'REJECTED' })}><UserRoundX size={15} /> Reject</button>
                </div>}
              </article>
            ))}
          </div>
        </>
      )}

      <Modal open={Boolean(confirm)} onClose={() => !saving && setConfirm(null)}
        title={confirm?.decision === 'APPROVED' ? 'Approve registration?' : 'Reject registration?'}
        footer={<>
          <button type="button" className="btn-ghost" disabled={saving} onClick={() => setConfirm(null)}>Cancel</button>
          <button type="button" className={confirm?.decision === 'APPROVED' ? 'btn-primary' : 'btn-danger'} disabled={saving} onClick={decide}>
            {saving ? 'Saving…' : confirm?.decision === 'APPROVED' ? 'Approve account' : 'Reject account'}
          </button>
        </>}>
        <p className="text-sm text-slate-300">{confirm?.decision === 'APPROVED'
          ? `Approve ${confirm?.user.username} (${confirm?.user.email})? They will be able to sign in immediately.`
          : `Reject ${confirm?.user.username} (${confirm?.user.email})? They will not be able to sign in.`}</p>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} /> This decision is recorded in system activity.</p>
      </Modal>
    </>
  );
}
