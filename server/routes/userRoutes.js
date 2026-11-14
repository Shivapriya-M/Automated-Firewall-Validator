import { Router } from 'express';
import { listUsers, pendingCount, approveUser, rejectUser } from '../controllers/userController.js';
import { protect, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(protect, requireRole('superadmin'));
r.get('/pending-count', pendingCount);
r.get('/', listUsers);
r.patch('/:id/approve', approveUser);
r.patch('/:id/reject', rejectUser);

export default r;
