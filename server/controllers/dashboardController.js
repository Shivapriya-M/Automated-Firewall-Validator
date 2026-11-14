import mongoose from 'mongoose';
import FirewallRule from '../models/FirewallRule.js';
import ValidationHistory from '../models/ValidationHistory.js';
import Activity from '../models/Activity.js';
import { asyncHandler } from '../utils/httpError.js';
import { STATUS_FILTERS, serializeRule } from '../services/ruleService.js';

const count = (f = {}) => FirewallRule.countDocuments(f);
const dayKeys = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - (n - 1 - i));
  return d.toISOString().slice(0, 10);
});
const dto = (d) => { const { _id, __v, ...r } = d.toObject(); return { id: String(_id), ...r }; };

export const stats = asyncHandler(async (_req, res) => {
  const [total, valid, invalid, active, blocked, enabled, recentActivity, recentValidations, recentRules] = await Promise.all([
    count(), count(STATUS_FILTERS.VALID), count(STATUS_FILTERS.INVALID), count(STATUS_FILTERS.ACTIVE), count(STATUS_FILTERS.BLOCKED),
    count({ enabled: true }),
    Activity.find().sort({ createdAt: -1 }).limit(8),
    ValidationHistory.find().sort({ createdAt: -1 }).limit(6),
    FirewallRule.find().sort({ createdAt: -1 }).limit(5),
  ]);
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  res.json({
    totals: { total, valid, invalid, active, blocked, enabled, disabled: total - enabled },
    recentActivity: recentActivity.map(dto),
    recentValidations: recentValidations.map(dto),
    recentRules: recentRules.map(serializeRule),
    system: {
      api: 'online', database: dbState, dfaEngine: 'online', regexValidator: 'online',
      uptimeSeconds: Math.round(process.uptime()), nodeVersion: process.version, serverTime: new Date().toISOString(),
    },
  });
});

export const analytics = asyncHandler(async (_req, res) => {
  const days = dayKeys(14);
  const since = new Date(`${days[0]}T00:00:00.000Z`);
  const [tcp, udp, icmp, any, allow, deny, valid, invalid, active, blocked, deniedValid, disabledValid, dfaOk, dfaNo, ruleDocs, histDocs, errDocs] = await Promise.all([
    count({ protocol: 'TCP' }), count({ protocol: 'UDP' }), count({ protocol: 'ICMP' }), count({ protocol: 'ANY' }),
    count({ action: 'ALLOW' }), count({ action: 'DENY' }),
    count(STATUS_FILTERS.VALID), count(STATUS_FILTERS.INVALID), count(STATUS_FILTERS.ACTIVE), count(STATUS_FILTERS.BLOCKED),
    count({ validationStatus: 'VALID', action: 'DENY' }), count({ validationStatus: 'VALID', enabled: false }),
    ValidationHistory.countDocuments({ dfaAccepted: true }), ValidationHistory.countDocuments({ dfaAccepted: false }),
    FirewallRule.find({ createdAt: { $gte: since } }).select('createdAt validationStatus'),
    ValidationHistory.find({ createdAt: { $gte: since } }).select('createdAt validationStatus'),
    ValidationHistory.find({ validationStatus: 'INVALID' }).sort({ createdAt: -1 }).limit(500).select('errors'),
  ]);

  const creation = Object.fromEntries(days.map((d) => [d, { date: d, created: 0, valid: 0, invalid: 0 }]));
  ruleDocs.forEach((r) => { const k = r.createdAt.toISOString().slice(0, 10); if (creation[k]) { creation[k].created++; creation[k][r.validationStatus === 'VALID' ? 'valid' : 'invalid']++; } });
  const attempts = Object.fromEntries(days.map((d) => [d, { date: d, valid: 0, invalid: 0 }]));
  histDocs.forEach((h) => { const k = h.createdAt.toISOString().slice(0, 10); if (attempts[k]) attempts[k][h.validationStatus === 'VALID' ? 'valid' : 'invalid']++; });

  const errCounts = {};
  errDocs.forEach((h) => h.errors.forEach((e) => { errCounts[e.field] = (errCounts[e.field] || 0) + 1; }));

  res.json({
    validVsInvalid: [{ name: 'Valid', value: valid }, { name: 'Invalid', value: invalid }],
    protocolDistribution: [{ name: 'TCP', value: tcp }, { name: 'UDP', value: udp }, { name: 'ICMP', value: icmp }, { name: 'ANY', value: any }],
    actionDistribution: [{ name: 'ALLOW', value: allow }, { name: 'DENY', value: deny }],
    statusDistribution: [{ name: 'ACTIVE', value: active }, { name: 'BLOCKED', value: blocked }, { name: 'INVALID', value: invalid }],
    blockedBreakdown: [{ name: 'DENY policy', value: deniedValid }, { name: 'Disabled', value: disabledValid }],
    dfaResults: [{ name: 'Accepted', value: dfaOk }, { name: 'Rejected', value: dfaNo }],
    ruleCreationTimeline: Object.values(creation),
    validationTimeline: Object.values(attempts),
    topErrorFields: Object.entries(errCounts).map(([field, value]) => ({ name: field, value })).sort((a, b) => b.value - a.value).slice(0, 7),
  });
});
