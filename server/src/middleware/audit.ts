import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import prisma from '../utils/prisma.js';

export const auditLog = (action: string, entity?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Intercept the response to log after successful completion
    const originalSend = res.send;
    
    res.send = function (body) {
      // Only log on successful requests
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            await prisma.auditLog.create({
              data: {
                action,
                entity,
                entityId: req.params.id || null, // Best effort guess
                metadata: JSON.stringify({
                  method: req.method,
                  url: req.originalUrl,
                  body: req.method !== 'GET' ? req.body : undefined,
                }),
                ipAddress: (req.ip as any) || null,
                userId: req.user?.id || null
              }
            });
          } catch (e) {
            console.error('Failed to write audit log:', e);
          }
        });
      }
      return originalSend.call(this, body);
    };

    next();
  };
};
