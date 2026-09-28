import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import { loginSchema, refreshTokenSchema } from '@trending-studio/validation';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), AuthController.login);
authRouter.post('/refresh', validateBody(refreshTokenSchema), AuthController.refresh);
authRouter.post('/logout', authenticate, AuthController.logout);
authRouter.get('/me', authenticate, AuthController.me);
