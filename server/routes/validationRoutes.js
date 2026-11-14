import { Router } from 'express';
import { validate, history, historyOne, clearHistory, dfaDefinition } from '../controllers/validationController.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.use(protect);
r.post('/validate', validate);
r.get('/validation-history', history);
r.delete('/validation-history', clearHistory);
r.get('/validation-history/:id', historyOne);
r.get('/dfa/definition', dfaDefinition);
export default r;
