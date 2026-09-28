import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { authenticate } from '../middlewares/auth';
import { requirePermission, requireRole } from '../middlewares/rbac';
import { validateBody } from '../middlewares/validate';
import { createInvoiceSchema } from '@trending-studio/validation';
import { Permission, Role } from '@trending-studio/shared-types';

export const invoiceRouter = Router();

invoiceRouter.use(authenticate);

invoiceRouter.get('/', requirePermission(Permission.VIEW), InvoiceController.list);
invoiceRouter.get('/:id', requirePermission(Permission.VIEW), InvoiceController.getById);
invoiceRouter.post(
  '/',
  requirePermission(Permission.CREATE),
  validateBody(createInvoiceSchema),
  InvoiceController.create
);
invoiceRouter.post('/:id/payment', requirePermission(Permission.CREATE), InvoiceController.recordPayment);
invoiceRouter.post(
  '/:id/cancel',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER),
  InvoiceController.cancel
);
