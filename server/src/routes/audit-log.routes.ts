import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';
import type { Response } from 'express';

const router = Router();

// GET /api/audit-logs — Liste tous les logs d'audit (SUPER_ADMIN only)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Accès réservé au Super Admin' });
    }

    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des logs' });
  }
});

export default router;
