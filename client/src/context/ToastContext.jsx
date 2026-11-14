import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
const STYLES = {
  success: { icon: CheckCircle2, cls: 'border-neon/40 text-neon' },
  error: { icon: XCircle, cls: 'border-red-500/50 text-red-400' },
  warning: { icon: AlertTriangle, cls: 'border-amber-400/50 text-amber-300' },
  info: { icon: Info, cls: 'border-cyan-400/40 text-cyan-300' },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setItems((l) => [...l.slice(-3), { id, type, message }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 4000);
  }, [dismiss]);
  const api = useMemo(() => ({
    success: (m) => push('success', m), error: (m) => push('error', m),
    warning: (m) => push('warning', m), info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex animate-toast items-start gap-3 rounded-lg border bg-charcoal px-4 py-3 shadow-xl shadow-black/40 ${cls}`}>
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm text-slate-100">{t.message}</p>
              <button className="text-slate-500 hover:text-white" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
