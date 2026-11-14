import { Loader2, Inbox, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export const Spinner = ({ label = 'Loading' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 className="animate-spin" size={18} /> <span className="text-sm">{label}...</span></div>
);

export const EmptyState = ({ title, hint, children }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
    <Inbox className="text-slate-600" size={34} />
    <p className="font-medium text-slate-200">{title}</p>
    {hint && <p className="muted max-w-sm">{hint}</p>}
    {children}
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="card flex items-start gap-3 border-red-500/40 p-5">
    <AlertCircle className="mt-0.5 text-red-400" size={18} />
    <div className="flex-1"><p className="text-sm text-red-300">{message}</p></div>
    {onRetry && <button className="btn-ghost" onClick={onRetry}>Try again</button>}
  </div>
);

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="h-title">{title}</h1>{subtitle && <p className="muted mt-1 max-w-2xl">{subtitle}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'text-neon', hint }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <Icon size={18} className={tone} />
      </div>
      <p className={`mt-2 font-mono text-3xl font-bold ${tone}`}>{value ?? '-'}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Pagination({ page, pages, total, limit, onPage }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1, to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3">
      <p className="text-xs text-slate-400">Showing {from}-{to} of {total}</p>
      <div className="flex items-center gap-1">
        <button className="icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
        <span className="px-2 font-mono text-xs text-slate-300">{page} / {pages}</span>
        <button className="icon-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

export const Field = ({ label, error, hint, children, htmlFor }) => (
  <div>
    <label className="label" htmlFor={htmlFor}>{label}</label>
    {children}
    {error ? <p className="field-error" role="alert"><AlertCircle size={13} className="mt-0.5 shrink-0" />{error}</p> : hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
  </div>
);
