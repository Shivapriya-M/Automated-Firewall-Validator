import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { env } from '../config/env.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { logActivity } from '../services/activityService.js';

const USERNAME = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const signToken = (admin) => jwt.sign({ id: String(admin._id), role: admin.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const register = asyncHandler(async (req, res) => {
  if (!env.ALLOW_REGISTRATION) throw new HttpError(403, 'Registration is disabled. Ask an administrator or use the seed script.');
  const username = str(req.body.username);
  const email = str(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const details = [];
  if (!USERNAME.test(username)) details.push({ field: 'username', message: 'Username must be 3-30 characters: letters, numbers and underscore' });
  if (!EMAIL.test(email)) details.push({ field: 'email', message: 'Enter a valid email address' });
  if (!PASSWORD.test(password)) details.push({ field: 'password', message: 'Password must be 8-72 characters and contain a letter and a number' });
  if (details.length) throw new HttpError(400, 'Validation failed', details);

  if (await Admin.findOne({ $or: [{ email }, { username }] })) throw new HttpError(409, 'Username or email is already registered');
  const admin = await Admin.create({ username, email, password, status: 'PENDING' });
  await logActivity('REGISTRATION_REQUESTED', `Registration request from "${username}"`, admin);
  res.status(202).json({
    message: 'Registration request submitted successfully. Please wait for admin approval.',
    user: admin.toSafeJSON(),
  });
});

export const login = asyncHandler(async (req, res) => {
  const identifier = str(req.body.identifier || req.body.email || req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!identifier || !password) throw new HttpError(400, 'Enter your email or username and your password');
  const admin = await Admin.findOne({ $or: [{ email: identifier.toLowerCase() }, { username: identifier }] }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) throw new HttpError(401, 'Invalid credentials');
  if (admin.status === 'PENDING') throw new HttpError(403, 'Your registration request is pending admin approval.');
  if (admin.status === 'REJECTED') throw new HttpError(403, 'Your registration request was rejected. Contact an administrator.');
  if (admin.status !== 'APPROVED') throw new HttpError(403, 'This account is not approved to sign in.');
  await logActivity('ADMIN_LOGIN', `Admin "${admin.username}" signed in`, admin);
  res.json({ token: signToken(admin), user: admin.toSafeJSON() });
});

export const profile = asyncHandler(async (req, res) => res.json({ user: req.admin.toSafeJSON() }));

export const changePassword = asyncHandler(async (req, res) => {
  const current = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const next = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  if (!PASSWORD.test(next)) throw new HttpError(400, 'New password must be 8-72 characters and contain a letter and a number');
  const admin = await Admin.findById(req.admin._id).select('+password');
  if (!(await admin.comparePassword(current))) throw new HttpError(401, 'Current password is incorrect');
  admin.password = next;
  await admin.save();
  await logActivity('PASSWORD_CHANGED', `Admin "${admin.username}" changed their password`, admin);
  res.json({ message: 'Password updated' });
});
