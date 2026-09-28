import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate } from '../middlewares/auth';
import { requirePermission } from '../middlewares/rbac';
import { Permission } from '@trending-studio/shared-types';

export const reportRouter = Router();

reportRouter.use(authenticate);

reportRouter.get('/daily-summary', requirePermission(Permission.REPORT_VIEW), ReportController.getDailySummary);
reportRouter.get('/gst', requirePermission(Permission.REPORT_VIEW), ReportController.getGstReport);
