import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';
import { Role } from '@trending-studio/shared-types';

export const deviceRouter = Router();

deviceRouter.use(authenticate);

deviceRouter.get('/', requireRole(Role.SUPER_ADMIN, Role.ADMIN), DeviceController.list);
deviceRouter.post('/register', DeviceController.register);
deviceRouter.post('/:id/revoke', requireRole(Role.SUPER_ADMIN, Role.ADMIN), DeviceController.revoke);
deviceRouter.post('/:id/unrevoke', requireRole(Role.SUPER_ADMIN, Role.ADMIN), DeviceController.unrevoke);
