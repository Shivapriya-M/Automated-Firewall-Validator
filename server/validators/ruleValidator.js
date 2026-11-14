/**
 * Reusable firewall field validator (Regular Expressions + semantic checks).
 *
 * Layer 1 - SYNTAX   : regular expressions decide whether the text has the right shape.
 * Layer 2 - SEMANTICS: numeric checks decide whether the values are in range (octets 0-255, ports 0-65535).
 *
 * This file is plain ESM with no dependencies, so the exact same module runs in the Node API
 * (server/validators/ruleValidator.js) and in the browser (client/src/utils/validators.js).
 * It is intentionally separate from the DFA engine (server/automata/firewallDFA.js).
 */

export const PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'ANY'];
export const ACTIONS = ['ALLOW', 'DENY'];

export const REGEX = {
  IPV4_SYNTAX: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  PORT_SYNTAX: /^\d+$/,
  PROTOCOL: /^(TCP|UDP|ICMP|ANY)$/i,
  ACTION: /^(ALLOW|DENY)$/i,
  RULE_NAME: /^[A-Za-z0-9][A-Za-z0-9 _.\-()]{2,59}$/,
  PRIORITY: /^\d+$/,
};

export const FIELD_LABELS = {
  ruleName: 'Rule name',
  sourceIP: 'Source IP address',
  destinationIP: 'Destination IP address',
  sourcePort: 'Source port',
  destinationPort: 'Destination port',
  protocol: 'Protocol',
  action: 'Action',
  priority: 'Priority',
  description: 'Description',
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const text = (v) => String(v).trim();

/** Each check returns null when valid, otherwise the end of an error sentence ("<label> <message>"). */
export function checkIPv4(value) {
  if (blank(value)) return 'is required';
  const v = text(value);
  if (!REGEX.IPV4_SYNTAX.test(v)) return 'must have four dot-separated numeric octets, e.g. 192.168.1.10';
  const octets = v.split('.');
  for (let i = 0; i < octets.length; i++) {
    const o = octets[i];
    if (o.length > 1 && o[0] === '0') return `has a leading zero in octet ${i + 1} ("${o}")`;
    if (Number(o) > 255) return `has octet ${i + 1} out of range (${o}); each octet must be 0-255`;
  }
  return null;
}

export function checkPort(value) {
  if (blank(value)) return 'is required';
  const v = text(value);
  if (!REGEX.PORT_SYNTAX.test(v)) return 'must be a whole number made of digits only (no letters, signs or decimals)';
  if (v.length > 1 && v[0] === '0') return `must not have leading zeros ("${v}")`;
  const n = Number(v);
  if (n > 65535) return `is out of range (${n}); ports must be between 0 and 65535`;
  return null;
}

export function checkProtocol(value) {
  if (blank(value)) return 'is required';
  return REGEX.PROTOCOL.test(text(value)) ? null : `"${text(value)}" is not supported; use TCP, UDP, ICMP or ANY`;
}

export function checkAction(value) {
  if (blank(value)) return 'is required';
  return REGEX.ACTION.test(text(value)) ? null : `"${text(value)}" is not supported; use ALLOW or DENY`;
}

export function checkPriority(value) {
  if (blank(value)) return null; // optional, defaults to 100
  const v = text(value);
  if (!REGEX.PRIORITY.test(v)) return 'must be a whole number between 1 and 1000';
  const n = Number(v);
  return n < 1 || n > 1000 ? `is out of range (${n}); use 1-1000` : null;
}

export function checkRuleName(value) {
  if (blank(value)) return 'is required';
  return REGEX.RULE_NAME.test(text(value)) ? null : 'must be 3-60 characters (letters, numbers, spaces and _ . - ( ) only)';
}

/**
 * Validate a complete rule object. ICMP has no ports, so ports are optional for ICMP only.
 * Returns { valid, errors: {field: message}, errorList: [{field, message}], normalized }.
 */
export function validateRule(input = {}) {
  const errors = {};
  const add = (field, message) => {
    if (message && !errors[field]) errors[field] = `${FIELD_LABELS[field]} ${message}`;
  };
  const val = (k) => (blank(input[k]) ? '' : text(input[k]));

  add('ruleName', checkRuleName(input.ruleName));
  add('sourceIP', checkIPv4(input.sourceIP));
  add('destinationIP', checkIPv4(input.destinationIP));
  add('protocol', checkProtocol(input.protocol));
  add('action', checkAction(input.action));

  const portsOptional = val('protocol').toUpperCase() === 'ICMP';
  for (const f of ['sourcePort', 'destinationPort']) {
    if (portsOptional && blank(input[f])) continue;
    add(f, checkPort(input[f]));
  }
  add('priority', checkPriority(input.priority));
  if (val('description').length > 250) add('description', 'must be at most 250 characters');

  const errorList = Object.entries(errors).map(([field, message]) => ({ field, message }));
  const prio = val('priority');
  return {
    valid: errorList.length === 0,
    errors,
    errorList,
    normalized: {
      ruleName: val('ruleName'),
      sourceIP: val('sourceIP'),
      destinationIP: val('destinationIP'),
      sourcePort: val('sourcePort'),
      destinationPort: val('destinationPort'),
      protocol: val('protocol').toUpperCase(),
      action: val('action').toUpperCase(),
      priority: prio && !checkPriority(prio) ? Number(prio) : 100,
      description: val('description'),
    },
  };
}
