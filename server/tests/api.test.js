// Integration tests require an explicitly configured, disposable test database and never use production MONGODB_URI.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_value';
process.env.ALLOW_REGISTRATION = 'true';
const URI = process.env.TEST_MONGODB_URI;

let app, request, db, token, connected = false;
const auth = () => ({ Authorization: `Bearer ${token}` });
const rule = (o = {}) => ({ ruleName: 'Allow HTTPS', sourceIP: '10.0.0.1', destinationIP: '192.168.1.10', sourcePort: '0', destinationPort: '443', protocol: 'TCP', action: 'ALLOW', priority: 10, ...o });

before(async () => {
  if (!URI) {
    console.warn('\n[api tests] SKIPPED - set TEST_MONGODB_URI to a dedicated disposable test database.\n');
    return;
  }
  const databaseName = new URL(URI).pathname.replace(/^\//, '').split('/')[0];
  if (!/_test(?:$|_)/i.test(databaseName) || URI === process.env.MONGODB_URI) {
    throw new Error('TEST_MONGODB_URI must target a separate disposable database with "test" in its name; never use the production URI.');
  }
  try {
    const mongoose = (await import('mongoose')).default;
    const { connectDB } = await import('../config/db.js');
    await connectDB(URI);
    db = mongoose;
    app = (await import('../app.js')).default;
    request = (await import('supertest')).default;
    connected = true;
  } catch (e) {
    console.warn(`\n[api tests] SKIPPED - cannot reach the dedicated test database: ${e.message}\n`);
  }
});
after(async () => {
  if (!connected) return;
  await Promise.all(Object.values(db.connection.collections).map((collection) => collection.deleteMany({})));
  await db.disconnect();
});
const it = (name, fn) => test(name, async (t) => { if (!connected) return t.skip('MongoDB not available'); await fn(t); });

it('rejects unauthenticated access', async () => {
  assert.equal((await request(app).get('/api/rules')).status, 401);
  assert.equal((await request(app).get('/api/dashboard/stats')).status, 401);
});

it('requires admin approval before registration can sign in', async () => {
  const reg = await request(app).post('/api/auth/register').send({ username: 'tester', email: 'tester@example.com', password: 'Passw0rd!' });
  assert.equal(reg.status, 202);
  assert.equal(reg.body.user.status, 'PENDING');
  assert.equal(reg.body.token, undefined);
  assert.equal(reg.body.message, 'Registration request submitted successfully. Please wait for admin approval.');
  assert.equal((await request(app).post('/api/auth/register').send({ username: 'tester', email: 'tester@example.com', password: 'Passw0rd!' })).status, 409);
  assert.equal((await request(app).post('/api/auth/register').send({ username: 'x', email: 'bad', password: '1' })).status, 400);
  assert.equal((await request(app).post('/api/auth/login').send({ identifier: 'tester@example.com', password: 'wrong' })).status, 401);
  const pendingLogin = await request(app).post('/api/auth/login').send({ identifier: 'tester@example.com', password: 'Passw0rd!' });
  assert.equal(pendingLogin.status, 403);
  assert.match(pendingLogin.body.message, /pending admin approval/i);

  const Admin = (await import('../models/Admin.js')).default;
  await Admin.create({ username: 'rootadmin', email: 'root@example.com', password: 'Passw0rd!', role: 'superadmin', status: 'APPROVED' });
  const rootLogin = await request(app).post('/api/auth/login').send({ identifier: 'rootadmin', password: 'Passw0rd!' });
  assert.equal(rootLogin.status, 200);
  token = rootLogin.body.token;
  assert.equal(rootLogin.body.user.status, 'APPROVED');
  const me = await request(app).get('/api/auth/profile').set(auth());
  assert.equal(me.body.user.username, 'rootadmin');
  assert.equal(me.body.user.password, undefined);

  const pending = await request(app).get('/api/admin/users?status=PENDING').set(auth());
  assert.equal(pending.status, 200);
  assert.equal(pending.body.counts.pending, 1);
  assert.equal(pending.body.counts.total, 1);
  assert.equal(pending.body.users[0].id, reg.body.user.id);
  const approved = await request(app).patch(`/api/admin/users/${reg.body.user.id}/approve`).set(auth());
  assert.equal(approved.status, 200);
  assert.equal(approved.body.user.status, 'APPROVED');
  assert.ok(approved.body.user.approvedAt);
  const approvedList = await request(app).get('/api/admin/users?status=APPROVED').set(auth());
  assert.equal(approvedList.body.users[0].id, reg.body.user.id);
  assert.equal(approvedList.body.users[0].approvedBy.username, 'rootadmin');

  const userLogin = await request(app).post('/api/auth/login').send({ identifier: 'tester@example.com', password: 'Passw0rd!' });
  assert.equal(userLogin.status, 200);
  assert.equal(userLogin.body.user.status, 'APPROVED');
  assert.equal((await request(app).get('/api/admin/users').set({ Authorization: `Bearer ${userLogin.body.token}` })).status, 403);

  const rejectedRegistration = await request(app).post('/api/auth/register').send({ username: 'rejectme', email: 'rejectme@example.com', password: 'Passw0rd!' });
  assert.equal(rejectedRegistration.status, 202);
  const rejected = await request(app).patch(`/api/admin/users/${rejectedRegistration.body.user.id}/reject`).set(auth());
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.user.status, 'REJECTED');
  const rejectedLogin = await request(app).post('/api/auth/login').send({ identifier: 'rejectme', password: 'Passw0rd!' });
  assert.equal(rejectedLogin.status, 403);
  assert.match(rejectedLogin.body.message, /rejected/i);
  const rejectedList = await request(app).get('/api/admin/users?status=REJECTED').set(auth());
  assert.equal(rejectedList.body.users[0].id, rejectedRegistration.body.user.id);
  assert.equal(rejectedList.body.counts.rejected, 1);
  assert.equal((await request(app).get('/api/admin/users/pending-count').set(auth())).body.pending, 0);
  token = rootLogin.body.token;
});

let id;
it('creates a valid ALLOW rule -> ACTIVE', async () => {
  const res = await request(app).post('/api/rules').set(auth()).send(rule());
  assert.equal(res.status, 201);
  assert.equal(res.body.rule.validationStatus, 'VALID');
  assert.equal(res.body.rule.displayStatus, 'ACTIVE');
  assert.equal(res.body.rule.ruleId, 'FW-0001');
  assert.equal(res.body.validation.dfa.accepted, true);
  id = res.body.rule.id;
});

it('stores an invalid rule as INVALID and never lets it be active or enabled', async () => {
  const res = await request(app).post('/api/rules').set(auth()).send(rule({ ruleName: 'Bad IP', sourceIP: '10.0.0.300', enabled: true }));
  assert.equal(res.status, 201);
  assert.equal(res.body.rule.displayStatus, 'INVALID');
  assert.equal(res.body.rule.enabled, false);
  assert.ok(res.body.validation.errors.some((e) => e.field === 'sourceIP'));
  const toggle = await request(app).patch(`/api/rules/${res.body.rule.id}/toggle`).set(auth()).send({ enabled: true });
  assert.equal(toggle.status, 409);
});

it('detects duplicate rules', async () => {
  const res = await request(app).post('/api/rules').set(auth()).send(rule({ ruleName: 'Same again' }));
  assert.equal(res.body.rule.duplicateOf, 'FW-0001');
  assert.equal(res.body.warnings.length, 1);
});

it('lists, searches, filters and sorts', async () => {
  const all = await request(app).get('/api/rules').set(auth());
  assert.equal(all.body.total, 3);
  assert.equal((await request(app).get('/api/rules?q=bad').set(auth())).body.total, 1);
  assert.equal((await request(app).get('/api/rules?status=INVALID').set(auth())).body.total, 1);
  assert.equal((await request(app).get('/api/rules?status=ACTIVE').set(auth())).body.total, 2);
  const sorted = await request(app).get('/api/rules?sort=ruleName&order=desc').set(auth());
  assert.equal(sorted.body.rules[0].ruleName, 'Same again');
});

it('NoSQL operator injection in filters is neutralised', async () => {
  const res = await request(app).get('/api/rules?q[$ne]=x&status[$ne]=INVALID').set(auth());
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 3);
});

it('reads one rule and returns 400/404 for bad ids', async () => {
  assert.equal((await request(app).get(`/api/rules/${id}`).set(auth())).body.rule.ruleName, 'Allow HTTPS');
  assert.equal((await request(app).get('/api/rules/not-an-id').set(auth())).status, 400);
  assert.equal((await request(app).get('/api/rules/64b7f0f0f0f0f0f0f0f0f0f0').set(auth())).status, 404);
});

it('updates a rule and re-validates it', async () => {
  const res = await request(app).put(`/api/rules/${id}`).set(auth()).send({ destinationPort: '70000' });
  assert.equal(res.status, 200);
  assert.equal(res.body.rule.validationStatus, 'INVALID');
  assert.equal(res.body.rule.displayStatus, 'INVALID');
  const fixed = await request(app).put(`/api/rules/${id}`).set(auth()).send({ destinationPort: '8443', enabled: true });
  assert.equal(fixed.body.rule.validationStatus, 'VALID');
  assert.equal(fixed.body.rule.destinationPort, '8443');
});

it('activation and blocking: DENY policy vs administratively disabled', async () => {
  const dis = await request(app).patch(`/api/rules/${id}/toggle`).set(auth()).send({ enabled: false });
  assert.equal(dis.body.rule.displayStatus, 'BLOCKED');
  assert.equal(dis.body.rule.blockedReason, 'DISABLED');
  const en = await request(app).patch(`/api/rules/${id}/toggle`).set(auth()).send({ enabled: true });
  assert.equal(en.body.rule.displayStatus, 'ACTIVE');
  const deny = await request(app).put(`/api/rules/${id}`).set(auth()).send({ action: 'DENY' });
  assert.equal(deny.body.rule.displayStatus, 'BLOCKED');
  assert.equal(deny.body.rule.blockedReason, 'DENY_POLICY');
  assert.equal(deny.body.rule.enabled, true);
});

it('validates via /api/validate (string and fields) and stores history', async () => {
  const ok = await request(app).post('/api/validate').set(auth()).send({ rule: '192.168.1.10,443,TCP,ALLOW' });
  assert.equal(ok.body.validationStatus, 'VALID');
  assert.equal(ok.body.dfa.finalState, 'q4');
  assert.equal(ok.body.engineAgreement, true);
  const bad = await request(app).post('/api/validate').set(auth()).send({ rule: '192.168.1.10,99999,TCP,ALLOW' });
  assert.equal(bad.body.validationStatus, 'INVALID');
  assert.equal(bad.body.dfa.finalState, 'qReject');
  const fields = await request(app).post('/api/validate').set(auth()).send({ fields: { sourceIP: '1.1.1.1', destinationIP: '999.1.1.1', sourcePort: '1', destinationPort: '80', protocol: 'TCP', action: 'ALLOW' } });
  assert.equal(fields.body.validationStatus, 'INVALID');
  assert.ok(fields.body.errorMap.destinationIP);
  assert.equal((await request(app).post('/api/validate').set(auth()).send({})).status, 400);
  const hist = await request(app).get('/api/validation-history?status=INVALID').set(auth());
  assert.ok(hist.body.total >= 2);
  assert.ok(hist.body.history[0].dfaTransitions.length > 0);
  assert.equal(hist.body.history[0].adminName, 'rootadmin');
});

it('dashboard statistics come from the database', async () => {
  const s = await request(app).get('/api/dashboard/stats').set(auth());
  assert.equal(s.status, 200);
  const t = s.body.totals;
  assert.equal(t.total, 3);
  assert.equal(t.valid + t.invalid, t.total);
  assert.equal(t.invalid, 1);
  assert.equal(t.active, 1); // the duplicate; the edited rule is now DENY
  assert.equal(t.blocked, 1);
  const a = await request(app).get('/api/dashboard/analytics').set(auth());
  assert.equal(a.body.protocolDistribution.find((x) => x.name === 'TCP').value, 3);
  assert.equal(a.body.ruleCreationTimeline.length, 14);
});

it('deletes a rule and clears history', async () => {
  assert.equal((await request(app).delete(`/api/rules/${id}`).set(auth())).status, 200);
  assert.equal((await request(app).get(`/api/rules/${id}`).set(auth())).status, 404);
  assert.equal((await request(app).delete('/api/validation-history').set(auth())).status, 200);
});
