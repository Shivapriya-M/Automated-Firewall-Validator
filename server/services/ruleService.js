import FirewallRule from '../models/FirewallRule.js';
import Counter from '../models/Counter.js';
import { validateFirewallRule, recordValidation } from './validationService.js';
import { logActivity } from './activityService.js';
import { HttpError, escapeRegex } from '../utils/httpError.js';

// ---- status classification --------------------------------------------------------------
// validationStatus (VALID/INVALID), enabled (true/false) and action (ALLOW/DENY) are stored separately.
// The display status is DERIVED from them and never stored:
//   INVALID  -> failed validation (can never be active)
//   ACTIVE   -> VALID + enabled + ALLOW
//   BLOCKED  -> VALID + (DENY policy  OR  administratively disabled)
export function deriveStatus(rule) {
  if (rule.validationStatus !== 'VALID') return { displayStatus: 'INVALID', blockedReason: null };
  const denied = rule.action === 'DENY';
  const disabled = !rule.enabled;
  if (denied || disabled) {
    return {
      displayStatus: 'BLOCKED',
      blockedReason: denied && disabled ? 'DENY_POLICY_AND_DISABLED' : denied ? 'DENY_POLICY' : 'DISABLED',
    };
  }
  return { displayStatus: 'ACTIVE', blockedReason: null };
}

export const STATUS_FILTERS = {
  VALID: { validationStatus: 'VALID' },
  INVALID: { validationStatus: 'INVALID' },
  ACTIVE: { validationStatus: 'VALID', enabled: true, action: 'ALLOW' },
  BLOCKED: { validationStatus: 'VALID', $or: [{ action: 'DENY' }, { enabled: false }] },
};

export function serializeRule(doc) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const { _id, __v, ...rest } = o;
  return { id: String(_id), ...rest, ...deriveStatus(o) };
}

// ---- input handling ---------------------------------------------------------------------
const STRING_FIELDS = ['ruleName', 'sourceIP', 'destinationIP', 'sourcePort', 'destinationPort', 'protocol', 'action', 'priority', 'description'];

/** Whitelist + coerce + sanitise the fields a client may send. */
export function pickRuleFields(body = {}) {
  const out = {};
  for (const f of STRING_FIELDS) {
    const v = body[f];
    out[f] = v === undefined || v === null || typeof v === 'object' ? '' : String(v).replace(/[<>]/g, '').trim();
  }
  out.enabled = body.enabled === undefined ? true : body.enabled === true || body.enabled === 'true';
  return out;
}

export async function nextRuleId() {
  const c = await Counter.findOneAndUpdate({ _id: 'rule' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `FW-${String(c.seq).padStart(4, '0')}`;
}

export async function findDuplicate(n, excludeId) {
  if (!n.destinationIP && !n.sourceIP) return null;
  const q = {
    sourceIP: n.sourceIP, destinationIP: n.destinationIP,
    sourcePort: n.sourcePort, destinationPort: n.destinationPort,
    protocol: n.protocol, action: n.action,
  };
  if (excludeId) q._id = { $ne: excludeId };
  return FirewallRule.findOne(q).sort({ createdAt: 1 });
}

export function buildListFilter(query = {}) {
  const and = [];
  const s = (v) => (typeof v === 'string' ? v.trim() : '');
  if (s(query.q)) {
    const rx = new RegExp(escapeRegex(s(query.q).slice(0, 80)), 'i');
    and.push({ $or: [{ ruleName: rx }, { ruleId: rx }, { sourceIP: rx }, { destinationIP: rx }, { description: rx }, { destinationPort: rx }] });
  }
  if (['TCP', 'UDP', 'ICMP', 'ANY'].includes(s(query.protocol).toUpperCase())) and.push({ protocol: s(query.protocol).toUpperCase() });
  if (['ALLOW', 'DENY'].includes(s(query.action).toUpperCase())) and.push({ action: s(query.action).toUpperCase() });
  if (STATUS_FILTERS[s(query.status).toUpperCase()]) and.push(STATUS_FILTERS[s(query.status).toUpperCase()]);
  if (s(query.enabled) === 'true') and.push({ enabled: true });
  if (s(query.enabled) === 'false') and.push({ enabled: false });
  if (s(query.duplicates) === 'true') and.push({ duplicateOf: { $ne: null } });
  return and.length ? { $and: and } : {};
}

export const SORTABLE = ['ruleId', 'ruleName', 'priority', 'protocol', 'action', 'createdAt', 'updatedAt', 'validationStatus', 'enabled'];

// ---- use cases --------------------------------------------------------------------------
export async function createRule(raw, admin, opts = {}) {
  const data = pickRuleFields(raw);
  const v = validateFirewallRule(data);
  const dup = await findDuplicate(v.normalized);
  const ruleId = await nextRuleId();
  const valid = v.validationStatus === 'VALID';
  const rule = await FirewallRule.create({
    ...v.normalized,
    ruleId,
    validationStatus: v.validationStatus,
    validationErrors: v.errors,
    enabled: valid ? data.enabled : false, // an invalid rule can never be enabled
    duplicateOf: dup ? dup.ruleId : null,
    createdBy: admin?._id,
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
  });
  await recordValidation({ inputRule: v.dfaInput, result: v, admin, source: 'RULE_SAVE', createdAt: opts.createdAt });
  await logActivity('RULE_CREATED', `Created ${ruleId} "${rule.ruleName}" (${v.validationStatus})`, admin, opts.createdAt);
  return { rule, validation: v, duplicate: dup };
}

export async function updateRule(rule, raw, admin) {
  const merged = { ...rule.toObject(), ...raw };
  const data = pickRuleFields(merged);
  const v = validateFirewallRule(data);
  const dup = await findDuplicate(v.normalized, rule._id);
  const valid = v.validationStatus === 'VALID';
  Object.assign(rule, v.normalized, {
    validationStatus: v.validationStatus,
    validationErrors: v.errors,
    enabled: valid ? data.enabled : false,
    duplicateOf: dup ? dup.ruleId : null,
  });
  await rule.save();
  await recordValidation({ inputRule: v.dfaInput, result: v, admin, source: 'RULE_SAVE' });
  await logActivity('RULE_UPDATED', `Updated ${rule.ruleId} "${rule.ruleName}" (${v.validationStatus})`, admin);
  return { rule, validation: v, duplicate: dup };
}

export async function toggleRule(rule, enabled, admin) {
  const next = enabled === undefined ? !rule.enabled : Boolean(enabled);
  if (next && rule.validationStatus !== 'VALID') {
    throw new HttpError(409, 'An INVALID rule cannot be enabled. Fix its validation errors first.');
  }
  rule.enabled = next;
  await rule.save();
  await logActivity(next ? 'RULE_ENABLED' : 'RULE_DISABLED', `${next ? 'Enabled' : 'Disabled'} ${rule.ruleId} "${rule.ruleName}"`, admin);
  return rule;
}
