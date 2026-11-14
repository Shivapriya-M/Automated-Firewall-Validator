import FirewallRule from '../models/FirewallRule.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { logActivity } from '../services/activityService.js';
import { createRule, updateRule, toggleRule, serializeRule, buildListFilter, SORTABLE } from '../services/ruleService.js';
import mongoose from 'mongoose';

const load = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid rule id');
  const rule = await FirewallRule.findById(id);
  if (!rule) throw new HttpError(404, 'Firewall rule not found');
  return rule;
};
const payload = ({ rule, validation, duplicate }) => ({
  rule: serializeRule(rule),
  validation: { validationStatus: validation.validationStatus, errors: validation.errors, dfa: validation.dfa, dfaInput: validation.dfaInput },
  warnings: duplicate ? [`Duplicate of ${duplicate.ruleId} ("${duplicate.ruleName}") - identical addresses, ports, protocol and action`] : [],
});

export const create = asyncHandler(async (req, res) => {
  if (!req.body.ruleName || !String(req.body.ruleName).trim()) {
    throw new HttpError(400, 'Rule name is required', [{ field: 'ruleName', message: 'Rule name is required' }]);
  }
  res.status(201).json(payload(await createRule(req.body, req.admin)));
});

export const list = asyncHandler(async (req, res) => {
  const filter = buildListFilter(req.query);
  const sortField = SORTABLE.includes(req.query.sort) ? req.query.sort : 'priority';
  const dir = req.query.order === 'desc' ? -1 : 1;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const [total, docs] = await Promise.all([
    FirewallRule.countDocuments(filter),
    FirewallRule.find(filter).sort({ [sortField]: dir, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  res.json({ rules: docs.map(serializeRule), total, page, pages: Math.max(1, Math.ceil(total / limit)), limit });
});

export const getOne = asyncHandler(async (req, res) => res.json({ rule: serializeRule(await load(req.params.id)) }));

export const update = asyncHandler(async (req, res) => {
  const rule = await load(req.params.id);
  res.json(payload(await updateRule(rule, req.body, req.admin)));
});

export const toggle = asyncHandler(async (req, res) => {
  const rule = await load(req.params.id);
  const enabled = typeof req.body.enabled === 'boolean' ? req.body.enabled : undefined;
  res.json({ rule: serializeRule(await toggleRule(rule, enabled, req.admin)) });
});

export const remove = asyncHandler(async (req, res) => {
  const rule = await load(req.params.id);
  await rule.deleteOne();
  await logActivity('RULE_DELETED', `Deleted ${rule.ruleId} "${rule.ruleName}"`, req.admin);
  res.json({ message: `Rule ${rule.ruleId} deleted`, id: String(rule._id) });
});
