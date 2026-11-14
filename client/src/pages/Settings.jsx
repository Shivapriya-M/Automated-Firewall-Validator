import { useState } from 'react';
import { KeyRound, Trash2, Loader2, User, SlidersHorizontal, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { authApi, validationApi, errMsg, API_URL } from '../services/api.js';
import usePreferences from '../hooks/usePreferences.js';
import { PageHeader, Field } from '../components/ui.jsx';
import Modal from '../components/Modal.jsx';
import { fmtDate } from '../utils/format.js';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = usePreferences();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const changePw = async (e) => {
    e.preventDefault(); setPwErr('');
    if (pw.newPassword !== pw.confirm) return setPwErr('New password and confirmation do not match');
    setBusy(true);
    try { await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }); toast.success('Password updated'); setPw({ currentPassword: '', newPassword: '', confirm: '' }); }
    catch (err) { setPwErr(errMsg(err)); }
    finally { setBusy(false); }
  };
  const clearHistory = async () => { try { const r = await validationApi.clear(); toast.success(r.message); } catch (e) { toast.error(errMsg(e)); } setConfirm(false); };
  const setP = (k) => (e) => setPw((p) => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="Settings" subtitle="Account, interface preferences and data management." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="h-sub mb-4 flex items-center gap-2"><User size={16} className="text-cyan-300" /> Account</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Username</dt><dd className="text-slate-100">{user.username}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="text-slate-100">{user.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd className="text-slate-100">{user.role}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="text-slate-100">{fmtDate(user.createdAt)}</dd></div>
          </dl>
        </section>

        <section className="card p-6">
          <h3 className="h-sub mb-4 flex items-center gap-2"><SlidersHorizontal size={16} className="text-cyan-300" /> Preferences</h3>
          <div className="space-y-5">
            <Field label="DFA animation speed" htmlFor="speed" hint="Time between steps in the DFA simulator.">
              <select id="speed" className="input" value={prefs.animationMs} onChange={(e) => setPrefs({ animationMs: Number(e.target.value) })}>
                <option value={500}>Fast (0.5 s)</option><option value={900}>Normal (0.9 s)</option><option value={1500}>Slow (1.5 s)</option><option value={2500}>Very slow (2.5 s)</option>
              </select>
            </Field>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200"><input type="checkbox" className="h-4 w-4 accent-[#2cff8a]" checked={prefs.confirmDelete} onChange={(e) => setPrefs({ confirmDelete: e.target.checked })} /> Ask before deleting a rule</label>
            <p className="text-xs text-slate-500">Saved in this browser only.</p>
          </div>
        </section>

        <form onSubmit={changePw} className="card space-y-4 p-6" noValidate>
          <h3 className="h-sub flex items-center gap-2"><KeyRound size={16} className="text-cyan-300" /> Change password</h3>
          {pwErr && <p className="field-error" role="alert">{pwErr}</p>}
          <Field label="Current password" htmlFor="cp"><input id="cp" type="password" className="input" value={pw.currentPassword} onChange={setP('currentPassword')} autoComplete="current-password" /></Field>
          <Field label="New password" htmlFor="np" hint="8+ characters with a letter and a number."><input id="np" type="password" className="input" value={pw.newPassword} onChange={setP('newPassword')} autoComplete="new-password" /></Field>
          <Field label="Confirm new password" htmlFor="cf"><input id="cf" type="password" className="input" value={pw.confirm} onChange={setP('confirm')} autoComplete="new-password" /></Field>
          <button className="btn-primary" disabled={busy || !pw.currentPassword || !pw.newPassword}>{busy && <Loader2 size={16} className="animate-spin" />} Update password</button>
        </form>

        <div className="space-y-4">
          <section className="card p-6">
            <h3 className="h-sub mb-3 flex items-center gap-2"><Server size={16} className="text-cyan-300" /> Connection</h3>
            <p className="text-sm text-slate-400">API endpoint</p><p className="mono mt-1 text-cyan-300">{API_URL}</p>
            <p className="mt-2 text-xs text-slate-500">Change it with VITE_API_URL in client/.env, then restart the frontend.</p>
          </section>
          <section className="card border-red-500/30 p-6">
            <h3 className="h-sub mb-2 text-red-300">Danger zone</h3>
            <p className="muted mb-4">Delete all validation history entries. Firewall rules are not affected.</p>
            <button className="btn-danger" onClick={() => setConfirm(true)}><Trash2 size={16} /> Clear validation history</button>
          </section>
        </div>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Clear validation history" footer={<><button className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button><button className="btn-danger" onClick={clearHistory}>Clear all entries</button></>}>
        <p className="text-sm text-slate-300">Every validation history entry will be deleted permanently.</p>
      </Modal>
    </>
  );
}
