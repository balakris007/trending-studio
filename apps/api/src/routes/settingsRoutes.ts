import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/rbac';
import { validateBody } from '../middlewares/validate';
import { updateBusinessSettingsSchema } from '@trending-studio/validation';
import { Permission } from '@trending-studio/shared-types';

export const settingsRouter = Router();

settingsRouter.use(authenticate);

settingsRouter.get('/', SettingsController.getSettings);
settingsRouter.put(
  '/',
  requirePermission(Permission.SETTINGS_MANAGE),
  validateBody(updateBusinessSettingsSchema),
  SettingsController.updateSettings
);
