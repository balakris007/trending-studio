import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/rbac';
import { validateBody } from '../middlewares/validate';
import { createOrderSchema, updateOrderStatusSchema } from '@trending-studio/validation';
import { Permission } from '@trending-studio/shared-types';

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.get('/', requirePermission(Permission.VIEW), OrderController.list);
orderRouter.get('/:id', requirePermission(Permission.VIEW), OrderController.getById);
orderRouter.post(
  '/',
  requirePermission(Permission.CREATE),
  validateBody(createOrderSchema),
  OrderController.create
);
orderRouter.patch(
  '/:id/status',
  requirePermission(Permission.UPDATE),
  validateBody(updateOrderStatusSchema),
  OrderController.updateStage
);
orderRouter.post('/:id/photos', requirePermission(Permission.UPDATE), OrderController.uploadPhotos);
