import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, profile, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { env } from '../config/env.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});
const r = Router();
r.post('/register', limiter, register);
r.post('/login', limiter, login);
r.get('/profile', protect, profile);
r.put('/password', protect, changePassword);
export default r;
