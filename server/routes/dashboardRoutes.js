import { Router } from 'express';
import { stats, analytics } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.use(protect);
r.get('/stats', stats);
r.get('/analytics', analytics);
export default r;
