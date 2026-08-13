import { Router } from 'express';
import { 
  getTeachingTypes,
  getTeachingType,
  createTeachingType,
  updateTeachingType,
  toggleTeachingType,
  deleteTeachingType
} from '../controllers/teaching-type.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Endpoint public pour l'inscription & consultation
router.get('/', getTeachingTypes);
router.get('/:id', getTeachingType);

// Actions d'administration
router.post('/', authenticate, requireRole(['SUPER_ADMIN']), createTeachingType);
router.put('/:id', authenticate, requireRole(['SUPER_ADMIN']), updateTeachingType);
router.patch('/:id/toggle', authenticate, requireRole(['SUPER_ADMIN']), toggleTeachingType);
router.delete('/:id', authenticate, requireRole(['SUPER_ADMIN']), deleteTeachingType);

export default router;
