import { Router } from 'express';
import { authRouter } from './authRoutes';
import { customerRouter } from './customerRoutes';
import { productRouter } from './productRoutes';
import { invoiceRouter } from './invoiceRoutes';
import { orderRouter } from './orderRoutes';
import { photoPrintRouter } from './photoPrintRoutes';
import { framePriceRouter } from './framePriceRoutes';
import { syncRouter } from './syncRoutes';
import { deviceRouter } from './deviceRoutes';
import { reportRouter } from './reportRoutes';
import { settingsRouter } from './settingsRoutes';
import { backupRouter } from './backupRoutes';
import { sheetsRouter } from './sheetsRoutes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/invoices', invoiceRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/photo-prints', photoPrintRouter);
apiRouter.use('/frame-prices', framePriceRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/devices', deviceRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/backups', backupRouter);
apiRouter.use('/sheets', sheetsRouter);

apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'Trending Studio POS & Business Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
