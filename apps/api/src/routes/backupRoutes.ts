import { Router } from 'express';
import { BackupController } from '../controllers/backupController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { Role } from '@trending-studio/shared-types';

export const backupRouter = Router();

backupRouter.use(authenticate);
backupRouter.use(requireRole(Role.SUPER_ADMIN, Role.ADMIN));

backupRouter.get('/', BackupController.list);
backupRouter.post('/create', BackupController.create);
backupRouter.post('/restore', BackupController.restore);
