import test from 'node:test';
import assert from 'node:assert/strict';
import { runDFA, delta, classifyToken, recognizeIPv4, recognizePort, buildDFAInput, getDFADefinition, ACCEPTING_STATES } from '../automata/firewallDFA.js';
import { validateRuleString } from '../services/validationService.js';
import { readFileSync } from 'node:fs';

test('DFA accepts well-formed rules and ends in q4', () => {
  for (const s of ['192.168.1.10,443,TCP,ALLOW', '0.0.0.0,0,ANY,DENY', '10.0.0.5,53,udp,allow', '172.16.0.1,0,ICMP,ALLOW', ' 8.8.8.8 , 53 , UDP , ALLOW ']) {
    const r = runDFA(s);
    assert.equal(r.accepted, true, s);
    assert.equal(r.finalState, 'q4');
    assert.deepEqual(r.steps.map((x) => x.to), ['q1', 'q2', 'q3', 'q4']);
  }
});

test('DFA rejects bad IP at q0', () => {
  const r = runDFA('256.1.1.1,443,TCP,ALLOW');
  assert.equal(r.accepted, false);
  assert.equal(r.steps[0].to, 'qReject');
  assert.equal(r.rejectedAtStep, 1);
});

test('DFA rejects bad port, protocol and action at the right step', () => {
  assert.equal(runDFA('192.168.1.10,70000,TCP,ALLOW').rejectedAtStep, 2);
  assert.equal(runDFA('192.168.1.10,443,HTTP,ALLOW').rejectedAtStep, 3);
  assert.equal(runDFA('192.168.1.10,443,TCP,BLOCK').rejectedAtStep, 4);
});

test('DFA rejects wrong order, truncated, empty and over-long input', () => {
  assert.equal(runDFA('443,192.168.1.10,TCP,ALLOW').accepted, false);
  const short = runDFA('192.168.1.10,443,TCP');
  assert.equal(short.accepted, false);
  assert.equal(short.finalState, 'q3');
  assert.match(short.reason, /ACTION/);
  assert.equal(runDFA('').accepted, false);
  assert.equal(runDFA('').finalState, 'q0');
  const extra = runDFA('192.168.1.10,443,TCP,ALLOW,EXTRA');
  assert.equal(extra.accepted, false);
  assert.equal(extra.steps.at(-1).to, 'qReject');
});

test('trap state never leaves qReject', () => {
  for (const sym of ['IP', 'PORT', 'PROTOCOL', 'ACTION', 'OTHER']) assert.equal(delta('qReject', sym), 'qReject');
  const r = runDFA('x,y,z,w');
  assert.ok(r.steps.slice(1).every((s) => s.from === 'qReject' && s.to === 'qReject'));
});

test('transition function matches the specification', () => {
  assert.equal(delta('q0', 'IP'), 'q1');
  assert.equal(delta('q1', 'PORT'), 'q2');
  assert.equal(delta('q2', 'PROTOCOL'), 'q3');
  assert.equal(delta('q3', 'ACTION'), 'q4');
  assert.equal(delta('q0', 'PORT'), 'qReject');
  assert.deepEqual(ACCEPTING_STATES, ['q4']);
});

test('character-level recognisers', () => {
  assert.equal(recognizeIPv4('255.255.255.255'), true);
  for (const bad of ['256.0.0.1', '1.2.3', '1.2.3.4.5', '1..2.3', '01.2.3.4', '1.2.3.', '.1.2.3', 'a.b.c.d', '']) assert.equal(recognizeIPv4(bad), false, bad);
  assert.equal(recognizePort('65535'), true);
  for (const bad of ['65536', '-1', '', '007', '1e3', '123456']) assert.equal(recognizePort(bad), false, bad);
  assert.equal(classifyToken('tcp'), 'PROTOCOL');
  assert.equal(classifyToken('Allow'), 'ACTION');
  assert.equal(classifyToken('hello'), 'OTHER');
});

test('DFA module is independent of regular expressions', () => {
  const src = readFileSync(new URL('../automata/firewallDFA.js', import.meta.url), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*')).join('\n');
  assert.equal(/\.(test|match|exec|replace|search)\(\s*\//.test(code), false);
  assert.equal(/new RegExp|import .*validators/.test(code), false);
});

test('regex validator and DFA agree on a corpus of inputs', () => {
  const corpus = ['192.168.1.10,443,TCP,ALLOW', '0.0.0.0,0,ANY,DENY', '256.1.1.1,443,TCP,ALLOW', '1.2.3.4,65536,TCP,ALLOW', '1.2.3.4,80,HTTP,ALLOW', '1.2.3.4,80,TCP', '1.2.3.4,80,TCP,ALLOW,X', '', '01.2.3.4,80,TCP,ALLOW', '1.2.3.4,080,TCP,ALLOW'];
  for (const s of corpus) assert.equal(validateRuleString(s).engineAgreement, true, `disagreement on "${s}"`);
});

test('buildDFAInput and definition', () => {
  assert.equal(buildDFAInput({ destinationIP: '1.1.1.1', destinationPort: '', protocol: 'ICMP', action: 'ALLOW' }), '1.1.1.1,0,ICMP,ALLOW');
  const d = getDFADefinition();
  assert.equal(d.states.length, 6);
  assert.equal(d.initialState, 'q0');
});
