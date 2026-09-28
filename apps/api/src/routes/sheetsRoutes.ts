import { Router } from 'express';
import { SheetsController } from '../controllers/sheetsController';
import { authenticate } from '../middlewares/auth';

export const sheetsRouter = Router();

// Allow authenticated users to view status, test, and sync
sheetsRouter.get('/status', authenticate, SheetsController.getStatus);
sheetsRouter.post('/test', authenticate, SheetsController.testConnection);
sheetsRouter.post('/config', authenticate, SheetsController.updateConfig);
sheetsRouter.post('/sync-all', authenticate, SheetsController.syncAll);
sheetsRouter.post('/init-sheets', authenticate, SheetsController.initStructure);
