import { Router } from 'express';
import { 
  getNiveaux,
  getNiveau,
  createNiveau,
  updateNiveau,
  toggleNiveau,
  deleteNiveau
} from '../controllers/niveau.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

router.get('/', getNiveaux);
router.get('/:id', getNiveau);
router.post('/', requireRole(['SUPER_ADMIN', 'DIRECTEUR']), createNiveau);
router.put('/:id', requireRole(['SUPER_ADMIN', 'DIRECTEUR']), updateNiveau);
router.patch('/:id/toggle', requireRole(['SUPER_ADMIN', 'DIRECTEUR']), toggleNiveau);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'DIRECTEUR']), deleteNiveau);

export default router;
