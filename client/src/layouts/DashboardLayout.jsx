import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, PlusCircle, FileCheck2, Cpu, Table2, Workflow, History, BarChart3, Settings, Info, LogOut, Menu, X, ShieldHalf, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { adminApi } from '../services/api.js';

const NAV = [
  { group: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }, { to: '/analytics', label: 'Analytics', icon: BarChart3 }] },
  { group: 'Firewall', items: [
    { to: '/rules', label: 'Firewall rules', icon: ShieldCheck, end: true },
    { to: '/rules/new', label: 'Add rule', icon: PlusCircle },
    { to: '/validation', label: 'Rule validation', icon: FileCheck2 },
    { to: '/history', label: 'Validation history', icon: History },
  ] },
  { group: 'Automata', items: [
    { to: '/dfa/simulator', label: 'DFA simulator', icon: Cpu },
    { to: '/dfa/table', label: 'Transition table', icon: Table2 },
    { to: '/dfa/diagram', label: 'State diagram', icon: Workflow },
  ] },
  { group: 'System', items: [{ to: '/settings', label: 'Settings', icon: Settings }, { to: '/about', label: 'About project', icon: Info }] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const refreshPending = useCallback(async () => {
    if (user?.role !== 'superadmin') return;
    try { setPendingCount((await adminApi.pendingCount()).pending); } catch { /* Sidebar badge is best-effort. */ }
  }, [user?.role]);

  useEffect(() => { refreshPending(); }, [refreshPending]);

  const navGroups = user?.role === 'superadmin'
    ? [...NAV, { group: 'Administration', items: [{ to: '/user-management', label: 'User Management', icon: Users, badge: pendingCount }] }]
    : NAV;

  const sidebar = (
    <nav className="flex h-full flex-col" aria-label="Main navigation">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-neon/10 ring-1 ring-neon/40"><ShieldHalf size={20} className="text-neon" /></span>
        <div><p className="text-sm font-bold leading-4 text-white">FirewallGuard</p><p className="text-[11px] text-slate-500">Rule validation system</p></div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {navGroups.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 px-3 text-[11px] font-medium text-slate-500">{g.group}</p>
            {g.items.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => `mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-neon/10 font-medium text-neon ring-1 ring-inset ring-neon/25' : 'text-slate-400 hover:bg-charcoal hover:text-white'}`}>
                <Icon size={17} /> <span className="flex-1">{label}</span>
                {badge > 0 && <span className="rounded-full bg-neon px-1.5 py-0.5 text-[10px] font-bold leading-4 text-navy-950" aria-label={`${badge} pending requests`}>{badge > 99 ? '99+' : badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center gap-3 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-electric/20 text-sm font-semibold uppercase text-blue-300">{user?.username?.[0]}</span>
          <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{user?.username}</p><p className="truncate text-xs text-slate-500">{user?.role}</p></div>
        </div>
        <button className="btn-ghost w-full" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /> Sign out</button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full bg-navy-950">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-navy-900 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-line bg-navy-900">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-navy-900/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="icon-btn lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <p className="hidden font-mono text-xs text-slate-500 lg:block">{location.pathname}</p>
          <p className="flex items-center gap-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_#2cff8a]" /> Simulator only - no real firewall is modified</p>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8"><div className="mx-auto max-w-7xl animate-rise"><Outlet context={{ refreshPending }} /></div></main>
      </div>
    </div>
  );
}
