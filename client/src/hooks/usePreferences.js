import { useCallback, useState } from 'react';

const KEY = 'fw_prefs';
const DEFAULTS = { animationMs: 900, confirmDelete: true };
const read = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; } };

export default function usePreferences() {
  const [prefs, setPrefs] = useState(read);
  const update = useCallback((patch) => {
    setPrefs((p) => { const n = { ...p, ...patch }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* storage unavailable */ } return n; });
  }, []);
  return [prefs, update];
}
