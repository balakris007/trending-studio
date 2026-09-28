import { Router } from 'express';
import { PhotoPrintController } from '../controllers/photoPrintController';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/rbac';
import { Permission } from '@trending-studio/shared-types';

export const photoPrintRouter = Router();

photoPrintRouter.use(authenticate);

photoPrintRouter.get('/pricing', PhotoPrintController.getPricing);
photoPrintRouter.post('/calculate', PhotoPrintController.calculate);
photoPrintRouter.put(
  '/pricing',
  requirePermission(Permission.PRICE_MODIFY),
  PhotoPrintController.updatePricing
);
