/**
 * Firewall Rule Format DFA   M = (Q, Σ, δ, q0, F)
 *
 * Input string:  destinationIP,destinationPort,protocol,action     e.g. 192.168.1.10,443,TCP,ALLOW
 *
 * Q  = { q0, q1, q2, q3, q4, qReject }
 * Σ  = { IP, PORT, PROTOCOL, ACTION, OTHER }      (token classes)
 * q0 = start state
 * F  = { q4 }                                       (accepting state)
 * qReject = trap (dead) state: every transition out of it returns to it
 *
 * δ:   q0 --IP--> q1 --PORT--> q2 --PROTOCOL--> q3 --ACTION--> q4;   every other (state, symbol) pair -> qReject
 *
 * INDEPENDENCE FROM REGEX: this file contains no regular expressions at all.
 * Tokens are classified by tiny hand-written character-level automata (a counter-bounded IPv4
 * recogniser, a port recogniser and a keyword trie). The main DFA then consumes the resulting
 * token-class symbols one at a time through the transition function `delta`.
 */

// ---------- 1. Formal definition ----------
export const STATE_ORDER = ['q0', 'q1', 'q2', 'q3', 'q4', 'qReject'];
export const STATE_LABELS = {
  q0: 'Start - waiting for IP address',
  q1: 'IP accepted - waiting for port',
  q2: 'Port accepted - waiting for protocol',
  q3: 'Protocol accepted - waiting for action',
  q4: 'Action accepted - rule complete (ACCEPT)',
  qReject: 'Trap state (REJECT)',
};
export const INITIAL_STATE = 'q0';
export const ACCEPTING_STATES = ['q4'];
export const REJECTING_STATES = ['qReject'];
export const ALPHABET = ['IP', 'PORT', 'PROTOCOL', 'ACTION', 'OTHER'];
export const ALPHABET_INFO = {
  IP: 'Dotted-quad IPv4 address (four octets, each 0-255)',
  PORT: 'Integer from 0 to 65535',
  PROTOCOL: 'One of TCP, UDP, ICMP, ANY',
  ACTION: 'One of ALLOW, DENY',
  OTHER: 'Anything that is not a recognised token (including an empty token)',
};
const EXPECTED = { q0: 'IP', q1: 'PORT', q2: 'PROTOCOL', q3: 'ACTION' };

export const TRANSITIONS = (() => {
  const t = {};
  for (const s of STATE_ORDER) {
    t[s] = {};
    for (const a of ALPHABET) t[s][a] = 'qReject';
  }
  t.q0.IP = 'q1';
  t.q1.PORT = 'q2';
  t.q2.PROTOCOL = 'q3';
  t.q3.ACTION = 'q4';
  return t;
})();

/** Transition function δ(state, symbol). */
export const delta = (state, symbol) => TRANSITIONS[state]?.[symbol] ?? 'qReject';

// ---------- 2. Character-level recognisers (no regex) ----------
const isDigit = (c) => c >= '0' && c <= '9';
const digitValue = (c) => c.charCodeAt(0) - 48;

/** Finite-state IPv4 recogniser. State = (octet 0-3, digits 0-3, value 0-255, leadingZero). */
export function recognizeIPv4(token) {
  let octet = 0, digits = 0, value = 0, leadingZero = false;
  for (const ch of token) {
    if (isDigit(ch)) {
      if (digits === 0) { value = 0; leadingZero = ch === '0'; }
      else if (leadingZero) return false; // "01", "00"
      digits += 1;
      if (digits > 3) return false;
      value = value * 10 + digitValue(ch);
      if (value > 255) return false;
    } else if (ch === '.') {
      if (digits === 0 || octet === 3) return false;
      octet += 1; digits = 0; value = 0; leadingZero = false;
    } else {
      return false;
    }
  }
  return octet === 3 && digits > 0;
}

/** Finite-state port recogniser: digits only, no leading zeros, value <= 65535. */
export function recognizePort(token) {
  if (token.length === 0 || token.length > 5) return false;
  if (token.length > 1 && token[0] === '0') return false;
  let value = 0;
  for (const ch of token) {
    if (!isDigit(ch)) return false;
    value = value * 10 + digitValue(ch);
  }
  return value <= 65535;
}

/** Keyword trie: walks the token one character at a time. */
function buildTrie(words) {
  const root = { next: {}, label: null };
  for (const [word, label] of Object.entries(words)) {
    let node = root;
    for (const ch of word) { node.next[ch] ??= { next: {}, label: null }; node = node.next[ch]; }
    node.label = label;
  }
  return root;
}
const KEYWORDS = buildTrie({ TCP: 'PROTOCOL', UDP: 'PROTOCOL', ICMP: 'PROTOCOL', ANY: 'PROTOCOL', ALLOW: 'ACTION', DENY: 'ACTION' });
function recognizeKeyword(token) {
  let node = KEYWORDS;
  for (const ch of token.toUpperCase()) {
    node = node.next[ch];
    if (!node) return null;
  }
  return node.label;
}

/** Map a raw token to a symbol of the input alphabet Σ. */
export function classifyToken(token) {
  if (recognizeIPv4(token)) return 'IP';
  if (recognizePort(token)) return 'PORT';
  return recognizeKeyword(token) ?? 'OTHER';
}

/** Split the input on commas (no regex) and trim each token. */
export function tokenize(input) {
  if (typeof input !== 'string' || input.trim() === '') return [];
  return input.split(',').map((t) => t.trim());
}

// ---------- 3. Execution engine ----------
const show = (t) => (t === '' ? '(empty token)' : `"${t}"`);

export function runDFA(input) {
  const raw = typeof input === 'string' ? input : '';
  const tokens = tokenize(raw);
  const steps = [];
  let state = INITIAL_STATE;
  let reason = null;
  let rejectedAtStep = null;

  tokens.forEach((token, i) => {
    const symbol = classifyToken(token);
    const from = state;
    const to = delta(from, symbol);
    let note;
    if (from === 'qReject') {
      note = 'Already in the trap state - the input can no longer be accepted';
    } else if (to === 'qReject') {
      rejectedAtStep ??= i + 1;
      if (from === 'q4') note = `Unexpected extra token ${show(token)} after a complete rule`;
      else if (symbol === 'OTHER') note = `${show(token)} is not a valid ${EXPECTED[from]} (expected ${EXPECTED[from]})`;
      else note = `Expected ${EXPECTED[from]} but ${show(token)} is a ${symbol}`;
      reason ??= note;
    } else {
      note = `Valid ${symbol} ${show(token)}`;
    }
    steps.push({ step: i + 1, token, symbol, from, to, note, accepting: ACCEPTING_STATES.includes(to), rejecting: to === 'qReject' });
    state = to;
  });

  if (!reason && !ACCEPTING_STATES.includes(state)) {
    reason = tokens.length === 0
      ? 'Input is empty - no tokens were read'
      : `Input ended in ${state} but a ${EXPECTED[state]} token was still expected`;
  }
  return { input: raw, tokens, steps, finalState: state, accepted: ACCEPTING_STATES.includes(state), reason, rejectedAtStep };
}

/** Build the DFA input string for a stored rule (destination IP, destination port, protocol, action). */
export function buildDFAInput(rule) {
  const protocol = String(rule.protocol ?? '').trim();
  let port = String(rule.destinationPort ?? '').trim();
  if (port === '' && protocol.toUpperCase() === 'ICMP') port = '0'; // ICMP has no ports
  return [String(rule.destinationIP ?? '').trim(), port, protocol, String(rule.action ?? '').trim()].join(',');
}

/** Everything the UI needs to draw the transition table and the state diagram. */
export function getDFADefinition() {
  return {
    name: 'Firewall Rule Format DFA',
    formal: 'M = (Q, Σ, δ, q0, F)',
    ruleFormat: 'destinationIP,destinationPort,protocol,action',
    example: '192.168.1.10,443,TCP,ALLOW',
    states: STATE_ORDER.map((id) => ({
      id, label: STATE_LABELS[id], initial: id === INITIAL_STATE,
      accepting: ACCEPTING_STATES.includes(id), rejecting: REJECTING_STATES.includes(id),
    })),
    alphabet: ALPHABET.map((symbol) => ({ symbol, description: ALPHABET_INFO[symbol] })),
    initialState: INITIAL_STATE,
    acceptingStates: ACCEPTING_STATES,
    rejectingStates: REJECTING_STATES,
    transitions: TRANSITIONS,
  };
}
