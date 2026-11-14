import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldHalf, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errMsg } from '../services/api.js';
import { Field } from '../components/ui.jsx';

const TOKENS = [['192.168.1.10', 'IP', 'q1'], ['443', 'PORT', 'q2'], ['TCP', 'PROTOCOL', 'q3'], ['ALLOW', 'ACTION', 'q4']];

export default function Login() {
  const { user, login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ identifier: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (user) return <Navigate to={location.state?.from || '/'} replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setFieldErrors({});
    try {
      if (mode === 'login') {
        await login(form.identifier, form.password);
        toast.success('Signed in');
        navigate(location.state?.from || '/', { replace: true });
      } else {
        const result = await register({ username: form.username, email: form.email, password: form.password });
        setSubmittedMessage(result.message);
        setMode('login');
        setForm({ identifier: form.email, username: '', email: '', password: '' });
        toast.success(result.message);
      }
    } catch (err) {
      setError(errMsg(err));
      const fe = {};
      (err.response?.data?.details || []).forEach((d) => { fe[d.field] = d.message; });
      setFieldErrors(fe);
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-navy-900 p-12 lg:flex">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#2cff8a 1px, transparent 1px), linear-gradient(90deg, #2cff8a 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/40"><ShieldHalf className="text-neon" /></span>
          <span className="text-lg font-bold text-white">FirewallGuard</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white">Every firewall rule is read by an automaton before it is trusted.</h1>
          <p className="mt-4 max-w-md text-slate-400">Regular expressions check the fields. A deterministic finite automaton checks the order. Only rules that pass both can become active.</p>
          <div className="mt-10 rounded-lg border border-line bg-navy-950/70 p-5">
            <p className="mb-3 font-mono text-xs text-slate-500">input string, read left to right</p>
            <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
              <span className="rounded bg-electric/15 px-2 py-1 text-blue-300">q0</span>
              {TOKENS.map(([tok, sym, st]) => (
                <span key={tok} className="flex items-center gap-2">
                  <span className="text-slate-600">{'\u2192'}</span>
                  <span className="flex flex-col items-center rounded border border-neon/30 bg-neon/5 px-2 py-1"><span className="text-neon">{tok}</span><span className="text-[10px] text-slate-500">{sym}</span></span>
                  <span className="text-slate-600">{'\u2192'}</span>
                  <span className={`rounded px-2 py-1 ${st === 'q4' ? 'bg-neon/15 text-neon ring-1 ring-neon/50' : 'bg-electric/15 text-blue-300'}`}>{st}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="relative text-xs text-slate-600">Educational simulator. It never touches your operating system firewall.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm animate-rise" noValidate>
          <h2 className="text-2xl font-semibold text-white">{mode === 'login' ? 'Sign in to FirewallGuard' : 'Request an account'}</h2>
          <p className="muted mt-1 mb-6">{mode === 'login' ? 'Use your email or username.' : 'Your account needs admin approval before sign-in. Passwords need 8+ characters with a letter and a number.'}</p>

          {submittedMessage && <div className="mb-4 rounded-md border border-neon/40 bg-neon/10 px-3 py-2.5 text-sm text-neon" role="status">{submittedMessage}</div>}

          {error && <div className="mb-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}

          <div className="space-y-4">
            {mode === 'login' ? (
              <Field label="Email or username" htmlFor="identifier"><input id="identifier" className="input" autoComplete="username" value={form.identifier} onChange={set('identifier')} autoFocus /></Field>
            ) : (
              <>
                <Field label="Username" htmlFor="username" error={fieldErrors.username}><input id="username" className={`input ${fieldErrors.username ? 'input-error' : ''}`} value={form.username} onChange={set('username')} autoComplete="username" /></Field>
                <Field label="Email" htmlFor="email" error={fieldErrors.email}><input id="email" type="email" className={`input ${fieldErrors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} autoComplete="email" /></Field>
              </>
            )}
            <Field label="Password" htmlFor="password" error={fieldErrors.password}><input id="password" type="password" className={`input ${fieldErrors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          </div>

          <button className="btn-primary mt-6 w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" className="mt-4 w-full text-center text-sm text-cyan-300 hover:underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setFieldErrors({}); setSubmittedMessage(''); }}>
            {mode === 'login' ? 'Need an account? Request access' : 'Already have an account? Sign in'}
          </button>
          {mode === 'login' && <p className="mt-6 rounded-md border border-line bg-navy-900 p-3 text-xs text-slate-400">Sign in with the administrator email and password configured when the admin account was created.</p>}
        </form>
      </section>
    </div>
  );
}
