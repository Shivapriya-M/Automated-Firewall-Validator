export const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const fmtShort = (d) => (d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');
export const fmtDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const fmtUptime = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`; };
export const FIELD_NAMES = { sourceIP: 'Source IP', destinationIP: 'Destination IP', sourcePort: 'Source port', destinationPort: 'Destination port', protocol: 'Protocol', action: 'Action', ruleName: 'Rule name', priority: 'Priority', description: 'Description', dfa: 'DFA', rule: 'Rule' };
