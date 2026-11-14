import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { logActivity } from '../services/activityService.js';

const USER_FILTER = { role: { $ne: 'superadmin' } };
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

export const listUsers = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : '';
  const filter = { ...USER_FILTER };
  if (STATUSES.includes(status)) filter.status = status;

  const [documents, total, pending, approved, rejected] = await Promise.all([
    Admin.find(filter)
      .select('username email role status createdAt approvedAt approvedBy')
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 })
      .lean(),
    Admin.countDocuments(USER_FILTER),
    Admin.countDocuments({ ...USER_FILTER, status: 'PENDING' }),
    Admin.countDocuments({ ...USER_FILTER, status: 'APPROVED' }),
    Admin.countDocuments({ ...USER_FILTER, status: 'REJECTED' }),
  ]);

  const users = documents.map(({ _id, ...user }) => ({ id: String(_id), ...user }));
  res.json({ users, counts: { pending, approved, rejected, total } });
});

export const pendingCount = asyncHandler(async (_req, res) => {
  const count = await Admin.countDocuments({ ...USER_FILTER, status: 'PENDING' });
  res.json({ pending: count });
});

async function decide(req, decision) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid user id');
  const user = await Admin.findOne({ _id: req.params.id, ...USER_FILTER });
  if (!user) throw new HttpError(404, 'Registered user not found');
  if (user.status !== 'PENDING') throw new HttpError(409, `Only pending registrations can be ${decision.toLowerCase()}.`);

  const update = decision === 'APPROVED'
    ? { status: 'APPROVED', approvedAt: new Date(), approvedBy: req.admin._id }
    : { status: 'REJECTED', approvedAt: null, approvedBy: null };
  const updated = await Admin.findOneAndUpdate(
    { _id: user._id, status: 'PENDING' },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!updated) throw new HttpError(409, 'This registration request has already been reviewed.');
  const action = decision === 'APPROVED' ? 'USER_APPROVED' : 'USER_REJECTED';
  await logActivity(action, `${decision === 'APPROVED' ? 'Approved' : 'Rejected'} registration for "${updated.username}"`, req.admin);
  return updated;
}

export const approveUser = asyncHandler(async (req, res) => {
  const user = await decide(req, 'APPROVED');
  res.json({ message: `Registration for ${user.username} approved.`, user: user.toSafeJSON() });
});

export const rejectUser = asyncHandler(async (req, res) => {
  const user = await decide(req, 'REJECTED');
  res.json({ message: `Registration for ${user.username} rejected.`, user: user.toSafeJSON() });
});
