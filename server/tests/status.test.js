import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveStatus } from '../services/ruleService.js';

const r = (o) => ({ validationStatus: 'VALID', enabled: true, action: 'ALLOW', ...o });

test('valid + enabled + ALLOW is ACTIVE', () => assert.deepEqual(deriveStatus(r()), { displayStatus: 'ACTIVE', blockedReason: null }));
test('DENY policy is BLOCKED with reason DENY_POLICY', () => assert.deepEqual(deriveStatus(r({ action: 'DENY' })), { displayStatus: 'BLOCKED', blockedReason: 'DENY_POLICY' }));
test('administratively disabled is BLOCKED with reason DISABLED', () => assert.deepEqual(deriveStatus(r({ enabled: false })), { displayStatus: 'BLOCKED', blockedReason: 'DISABLED' }));
test('DENY and disabled are reported together', () => assert.equal(deriveStatus(r({ action: 'DENY', enabled: false })).blockedReason, 'DENY_POLICY_AND_DISABLED'));
test('invalid rules are never ACTIVE, whatever else is set', () => {
  assert.equal(deriveStatus(r({ validationStatus: 'INVALID' })).displayStatus, 'INVALID');
  assert.equal(deriveStatus(r({ validationStatus: 'INVALID', enabled: true, action: 'ALLOW' })).displayStatus, 'INVALID');
});
