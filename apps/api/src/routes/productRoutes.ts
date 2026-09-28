import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/rbac';
import { validateBody } from '../middlewares/validate';
import { createProductSchema } from '@trending-studio/validation';
import { Permission } from '@trending-studio/shared-types';

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.get('/', requirePermission(Permission.VIEW), ProductController.list);
productRouter.get('/:id', requirePermission(Permission.VIEW), ProductController.getById);
productRouter.post(
  '/',
  requirePermission(Permission.CREATE),
  validateBody(createProductSchema),
  ProductController.create
);
productRouter.put('/:id', requirePermission(Permission.UPDATE), ProductController.update);
productRouter.post('/:id/stock', requirePermission(Permission.UPDATE), ProductController.adjustStock);
