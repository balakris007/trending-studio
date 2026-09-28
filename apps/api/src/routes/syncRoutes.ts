import { Router } from 'express';
import { SyncController } from '../controllers/syncController';
import { authenticate } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import { syncPushSchema, syncPullSchema } from '@trending-studio/validation';

export const syncRouter = Router();

syncRouter.use(authenticate);

syncRouter.post('/push', validateBody(syncPushSchema), SyncController.push);
syncRouter.post('/pull', validateBody(syncPullSchema), SyncController.pull);
syncRouter.post('/resolve', SyncController.resolve);
syncRouter.get('/status', SyncController.status);
