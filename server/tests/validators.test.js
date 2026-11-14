import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIPv4, checkPort, checkProtocol, checkAction, validateRule } from '../validators/ruleValidator.js';

test('valid IPv4 addresses pass', () => {
  for (const ip of ['192.168.1.10', '0.0.0.0', '255.255.255.255', '10.0.0.1', '8.8.8.8']) assert.equal(checkIPv4(ip), null, ip);
});

test('invalid IPv4 addresses fail with a specific message', () => {
  assert.match(checkIPv4('192.168.1.300'), /octet 4 out of range/);
  assert.match(checkIPv4('256.1.1.1'), /octet 1 out of range/);
  assert.match(checkIPv4('192.168.1'), /four dot-separated/);
  assert.match(checkIPv4('192.168.1.1.1'), /four dot-separated/);
  assert.match(checkIPv4('abc.def.ghi.jkl'), /four dot-separated/);
  assert.match(checkIPv4('192.168.01.1'), /leading zero/);
  assert.equal(checkIPv4(''), 'is required');
  assert.equal(checkIPv4(undefined), 'is required');
});

test('valid ports pass (0-65535)', () => {
  for (const p of ['0', '1', '22', '443', '65535']) assert.equal(checkPort(p), null, p);
});

test('invalid ports fail', () => {
  assert.match(checkPort('65536'), /out of range/);
  assert.match(checkPort('70000'), /out of range/);
  assert.match(checkPort('-1'), /digits only/);
  assert.match(checkPort('80.5'), /digits only/);
  assert.match(checkPort('http'), /digits only/);
  assert.match(checkPort('080'), /leading zeros/);
  assert.equal(checkPort(''), 'is required');
});

test('protocols and actions', () => {
  for (const p of ['TCP', 'UDP', 'ICMP', 'ANY', 'tcp']) assert.equal(checkProtocol(p), null);
  for (const p of ['HTTP', 'FTP', 'TCPX', '']) assert.notEqual(checkProtocol(p), null);
  for (const a of ['ALLOW', 'DENY', 'allow']) assert.equal(checkAction(a), null);
  for (const a of ['BLOCK', 'PERMIT', '']) assert.notEqual(checkAction(a), null);
});

const base = { ruleName: 'Allow HTTPS', sourceIP: '10.0.0.1', destinationIP: '192.168.1.10', sourcePort: '0', destinationPort: '443', protocol: 'tcp', action: 'allow' };

test('a complete valid rule validates and is normalised', () => {
  const r = validateRule(base);
  assert.equal(r.valid, true);
  assert.equal(r.normalized.protocol, 'TCP');
  assert.equal(r.normalized.action, 'ALLOW');
  assert.equal(r.normalized.priority, 100);
});

test('invalid rules report errors per field', () => {
  const r = validateRule({ ...base, sourceIP: '1.2.3.999', destinationPort: '70000', protocol: 'HTTP', action: '' });
  assert.equal(r.valid, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['action', 'destinationPort', 'protocol', 'sourceIP']);
});

test('missing required fields are reported', () => {
  const r = validateRule({ ...base, destinationIP: '', ruleName: '' });
  assert.ok(r.errors.destinationIP.includes('required'));
  assert.ok(r.errors.ruleName.includes('required'));
});

test('ICMP rules do not need ports, TCP rules do', () => {
  assert.equal(validateRule({ ...base, protocol: 'ICMP', sourcePort: '', destinationPort: '' }).valid, true);
  assert.equal(validateRule({ ...base, protocol: 'TCP', destinationPort: '' }).valid, false);
});
