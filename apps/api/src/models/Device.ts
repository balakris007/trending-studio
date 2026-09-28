import { IDevice } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IDeviceDocument extends Partial<IDevice> {
  _id: string;
  id: string;
  isRevoked?: boolean;
  lastActive?: any;
  save(): Promise<this>;
}

export const DeviceModel = createFirestoreModel<IDeviceDocument>('devices');
