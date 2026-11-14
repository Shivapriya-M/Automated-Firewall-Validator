// Removes NoSQL-operator keys ($where, $ne ...), dotted keys and control characters from user input.
function clean(v, depth = 0) {
  if (depth > 6) return undefined;
  if (typeof v === 'string') return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 1000);
  if (Array.isArray(v)) return v.slice(0, 200).map((x) => clean(x, depth + 1));
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(val, depth + 1);
    }
    return out;
  }
  return v;
}

export function sanitize(req, _res, next) {
  req.body = clean(req.body) ?? {};
  req.query = clean(req.query) ?? {};
  next();
}
