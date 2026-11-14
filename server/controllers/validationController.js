import mongoose from 'mongoose';
import ValidationHistory from '../models/ValidationHistory.js';
import { HttpError, asyncHandler, escapeRegex } from '../utils/httpError.js';
import { validateFirewallRule, validateRuleString, recordValidation } from '../services/validationService.js';
import { pickRuleFields } from '../services/ruleService.js';
import { getDFADefinition } from '../automata/firewallDFA.js';
import { logActivity } from '../services/activityService.js';

/**
 * POST /api/validate
 *   { rule: "192.168.1.10,443,TCP,ALLOW", source?: "SIMULATOR" }   -> raw string, regex + DFA side by side
 *   { fields: { sourceIP, destinationIP, ... } }                  -> full field-level validation + DFA
 */
export const validate = asyncHandler(async (req, res) => {
  const { rule, fields } = req.body;
  let result;
  let inputRule;
  let source = 'VALIDATOR';

  if (typeof rule === 'string') {
    result = validateRuleString(rule);
    inputRule = rule;
    if (req.body.source === 'SIMULATOR') source = 'SIMULATOR';
  } else if (fields && typeof fields === 'object') {
    const data = pickRuleFields({ ...fields, ruleName: fields.ruleName || 'Ad-hoc validation' });
    result = validateFirewallRule(data);
    inputRule = result.dfaInput;
  } else {
    throw new HttpError(400, 'Send either "rule" (a comma separated string) or "fields" (an object)');
  }

  const saved = await recordValidation({ inputRule, result, admin: req.admin, source });
  res.json({ ...result, inputRule, historyId: String(saved._id), createdAt: saved.createdAt });
});

const toDTO = (h) => {
  const { _id, __v, ...rest } = h.toObject();
  return { id: String(_id), ...rest };
};

export const history = asyncHandler(async (req, res) => {
  const and = [];
  const s = (v) => (typeof v === 'string' ? v.trim() : '');
  if (s(req.query.q)) and.push({ inputRule: new RegExp(escapeRegex(s(req.query.q).slice(0, 80)), 'i') });
  if (['VALID', 'INVALID'].includes(s(req.query.status).toUpperCase())) and.push({ validationStatus: s(req.query.status).toUpperCase() });
  if (['VALIDATOR', 'SIMULATOR', 'RULE_SAVE'].includes(s(req.query.source))) and.push({ source: s(req.query.source) });
  const filter = and.length ? { $and: and } : {};
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const [total, docs] = await Promise.all([
    ValidationHistory.countDocuments(filter),
    ValidationHistory.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  res.json({ history: docs.map(toDTO), total, page, pages: Math.max(1, Math.ceil(total / limit)), limit });
});

export const historyOne = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid history id');
  const doc = await ValidationHistory.findById(req.params.id);
  if (!doc) throw new HttpError(404, 'History entry not found');
  res.json({ entry: toDTO(doc) });
});

export const clearHistory = asyncHandler(async (req, res) => {
  const r = await ValidationHistory.deleteMany({});
  await logActivity('HISTORY_CLEARED', `Cleared ${r.deletedCount} validation history entries`, req.admin);
  res.json({ message: `Cleared ${r.deletedCount} entries`, deleted: r.deletedCount });
});

export const dfaDefinition = asyncHandler(async (_req, res) => res.json(getDFADefinition()));
