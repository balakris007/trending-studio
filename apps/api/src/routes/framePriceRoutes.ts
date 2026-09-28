import { Router } from 'express';
import { FramePriceController } from '../controllers/framePriceController';
import { authenticate } from '../middlewares/auth';

export const framePriceRouter = Router();

framePriceRouter.use(authenticate);

framePriceRouter.get('/types', FramePriceController.listTypes);
framePriceRouter.get('/prices', FramePriceController.listPrices);
framePriceRouter.post('/calculate', FramePriceController.calculate);
