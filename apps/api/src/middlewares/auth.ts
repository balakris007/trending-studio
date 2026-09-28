import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel } from '../models/User';
import { DeviceModel } from '../models/Device';
import { Role, Permission } from '@trending-studio/shared-types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  branchId?: string;
  deviceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or malformed token.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret) as {
      id: string;
      role: Role;
      deviceId?: string;
    };

    const user = await UserModel.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account not found or deactivated.',
      });
      return;
    }

    // If request has deviceId, ensure device is not revoked
    const deviceId = (req.headers['x-device-id'] as string) || decoded.deviceId;
    if (deviceId) {
      const device = await DeviceModel.findOne({ deviceId });
      if (device && device.isRevoked) {
        res.status(403).json({
          success: false,
          error: 'DEVICE_REVOKED: This terminal has been revoked by the administrator.',
        });
        return;
      }
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
      branchId: user.branchId?.toString(),
      deviceId,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Access token expired. Please refresh using refresh token.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid authorization token.',
    });
  }
};
