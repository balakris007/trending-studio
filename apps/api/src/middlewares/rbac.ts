import { Request, Response, NextFunction } from 'express';
import { Role, Permission } from '@trending-studio/shared-types';

/**
 * Require one of the specified roles
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized. Please login.' });
      return;
    }

    // SUPER_ADMIN has master bypass for all role checks
    if (req.user.role === Role.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Action requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

/**
 * Require a specific granular permission
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized. Please login.' });
      return;
    }

    // SUPER_ADMIN and ADMIN bypass granular checks
    if (req.user.role === Role.SUPER_ADMIN || req.user.role === Role.ADMIN) {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: 'PERMISSION_DENIED',
        message: `Missing required permission: ${permission}`,
      });
      return;
    }

    next();
  };
};
