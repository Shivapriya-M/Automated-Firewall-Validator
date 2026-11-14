import { Router } from 'express';
import { create, list, getOne, update, toggle, remove } from '../controllers/ruleController.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.use(protect);
r.route('/').post(create).get(list);
r.patch('/:id/toggle', toggle);
r.route('/:id').get(getOne).put(update).delete(remove);
export default r;
