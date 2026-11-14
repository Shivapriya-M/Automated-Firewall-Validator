const TONES = {
  green: 'bg-neon/10 text-neon ring-neon/30',
  red: 'bg-red-500/10 text-red-400 ring-red-500/30',
  amber: 'bg-amber-400/10 text-amber-300 ring-amber-400/30',
  cyan: 'bg-cyan-400/10 text-cyan-300 ring-cyan-400/30',
  blue: 'bg-electric/10 text-blue-300 ring-electric/30',
  gray: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
};
export const Badge = ({ tone = 'gray', children, title }) => <span title={title} className={`badge ${TONES[tone]}`}>{children}</span>;

export const ValidationBadge = ({ value }) => <Badge tone={value === 'VALID' ? 'green' : 'red'}>{value}</Badge>;
export const ActionBadge = ({ value }) => (value ? <Badge tone={value === 'ALLOW' ? 'cyan' : 'red'}>{value}</Badge> : <span className="text-slate-600">-</span>);
export const ProtocolBadge = ({ value }) => (value ? <Badge tone="blue">{value}</Badge> : <span className="text-slate-600">-</span>);

const REASON = {
  DENY_POLICY: [['red', 'DENY POLICY', 'Blocked because the rule action is DENY']],
  DISABLED: [['gray', 'DISABLED', 'Blocked because an administrator disabled the rule']],
  DENY_POLICY_AND_DISABLED: [['red', 'DENY POLICY', 'Rule action is DENY'], ['gray', 'DISABLED', 'Rule is disabled']],
};

export function StatusBadge({ rule }) {
  const tone = { ACTIVE: 'green', BLOCKED: 'amber', INVALID: 'red' }[rule.displayStatus] || 'gray';
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={tone}>{rule.displayStatus}</Badge>
      {(REASON[rule.blockedReason] || []).map(([t, label, title]) => <Badge key={label} tone={t} title={title}>{label}</Badge>)}
    </span>
  );
}
