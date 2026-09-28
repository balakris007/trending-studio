import { Request } from 'express';
import { AuditLogModel } from '../models/AuditLog';
import { Role } from '@trending-studio/shared-types';

export interface AuditParams {
  action: string;
  module: string;
  recordId: string;
  oldValue?: any;
  newValue?: any;
  req?: Request;
  userId?: string;
  userName?: string;
  userRole?: Role;
}

/**
 * Record an audit log entry for sensitive/financial actions
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const userId = params.req?.user?.id || params.userId;
    const userName = params.req?.user?.name || params.userName || 'System';
    const userRole = params.req?.user?.role || params.userRole || Role.SUPER_ADMIN;
    const deviceId = params.req?.user?.deviceId;
    const ipAddress =
      params.req?.headers['x-forwarded-for']?.toString() ||
      params.req?.socket?.remoteAddress;

    if (!userId) return;

    await AuditLogModel.create({
      userId,
      userName,
      userRole,
      deviceId,
      action: params.action,
      module: params.module,
      recordId: params.recordId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}
