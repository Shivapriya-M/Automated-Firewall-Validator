import { validateRule, checkIPv4, checkPort, checkProtocol, checkAction } from '../validators/ruleValidator.js';
import { runDFA, buildDFAInput } from '../automata/firewallDFA.js';
import ValidationHistory from '../models/ValidationHistory.js';

/**
 * Full validation of a rule object:
 *   1. regex + semantic validation of every field  (validators/ruleValidator.js)
 *   2. DFA classification of  destinationIP,destinationPort,protocol,action  (automata/firewallDFA.js)
 * A rule is VALID only when both layers agree that it is well formed.
 */
export function validateFirewallRule(fields) {
  const rv = validateRule(fields);
  const dfaInput = buildDFAInput(rv.normalized);
  const dfa = runDFA(dfaInput);
  const errors = [...rv.errorList];
  if (rv.valid && !dfa.accepted) errors.push({ field: 'dfa', message: `DFA rejected the rule: ${dfa.reason}` });
  return {
    validationStatus: errors.length === 0 ? 'VALID' : 'INVALID',
    errors,
    errorMap: rv.errors,
    normalized: rv.normalized,
    dfaInput,
    dfa,
  };
}

/** Validate a raw "ip,port,protocol,action" string with both engines so the UI can compare them. */
export function validateRuleString(input) {
  const raw = typeof input === 'string' ? input : '';
  const tokens = raw.trim() === '' ? [] : raw.split(',').map((t) => t.trim());
  const errors = [];
  const push = (field, label, msg) => msg && errors.push({ field, message: `${label} ${msg}` });
  if (tokens.length === 0) errors.push({ field: 'rule', message: 'Rule is empty' });
  else {
    push('destinationIP', 'Destination IP address', checkIPv4(tokens[0]));
    push('destinationPort', 'Destination port', checkPort(tokens[1]));
    push('protocol', 'Protocol', checkProtocol(tokens[2]));
    push('action', 'Action', checkAction(tokens[3]));
    if (tokens.length > 4) errors.push({ field: 'rule', message: `Rule has ${tokens.length - 4} extra token(s); expected exactly 4` });
  }
  const dfa = runDFA(raw);
  return {
    inputRule: raw,
    validationStatus: errors.length === 0 && dfa.accepted ? 'VALID' : 'INVALID',
    errors,
    dfa,
    engineAgreement: (errors.length === 0) === dfa.accepted,
  };
}

export async function recordValidation({ inputRule, result, admin, source, createdAt }) {
  return ValidationHistory.create({
    inputRule,
    validationStatus: result.validationStatus,
    errors: result.errors,
    dfaTransitions: result.dfa.steps,
    dfaAccepted: result.dfa.accepted,
    dfaFinalState: result.dfa.finalState,
    source,
    adminId: admin?._id,
    adminName: admin?.username || '',
    adminEmail: admin?.email || '',
    ...(createdAt ? { createdAt } : {}),
  });
}
