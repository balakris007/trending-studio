import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/rbac';
import { validateBody } from '../middlewares/validate';
import { createCustomerSchema } from '@trending-studio/validation';
import { Permission } from '@trending-studio/shared-types';

export const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get('/', requirePermission(Permission.VIEW), CustomerController.list);
customerRouter.get('/:id', requirePermission(Permission.VIEW), CustomerController.getById);
customerRouter.get('/:id/ledger', requirePermission(Permission.VIEW), CustomerController.getLedger);
customerRouter.post(
  '/',
  requirePermission(Permission.CREATE),
  validateBody(createCustomerSchema),
  CustomerController.create
);
customerRouter.put('/:id', requirePermission(Permission.UPDATE), CustomerController.update);
