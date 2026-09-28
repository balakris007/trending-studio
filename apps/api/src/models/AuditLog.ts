import { IAuditLog } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IAuditLogDocument extends Partial<IAuditLog> {
  _id: string;
  id: string;
  userId?: any;
  save(): Promise<this>;
}

export const AuditLogModel = createFirestoreModel<IAuditLogDocument>('audit_logs');
