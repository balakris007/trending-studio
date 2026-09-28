import { IAppNotification } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IAppNotificationDocument extends Partial<IAppNotification> {
  _id: string;
  id: string;
  userId?: any;
  save(): Promise<this>;
}

export const AppNotificationModel = createFirestoreModel<IAppNotificationDocument>('notifications');
