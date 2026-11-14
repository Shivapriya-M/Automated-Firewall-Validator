import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { env } from '../config/env.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(token, env.JWT_SECRET); }
  catch { throw new HttpError(401, 'Session expired or invalid token. Please sign in again.'); }
  const admin = await Admin.findById(payload.id);
  if (!admin) throw new HttpError(401, 'Account no longer exists');
  if (admin.status !== 'APPROVED') throw new HttpError(403, 'This account is not approved to access the application.');
  req.admin = admin;
  next();
});

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return next(new HttpError(403, 'You do not have permission to manage registered users.'));
    }
    next();
  };
}
