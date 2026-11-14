import { useEffect, useState } from 'react';
import { validationApi } from '../services/api.js';

let cache = null;
export default function useDFADefinition() {
  const [def, setDef] = useState(cache);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (cache) return;
    validationApi.dfa().then((d) => { cache = d; setDef(d); }).catch((e) => setError(e));
  }, []);
  return { def, error };
}
