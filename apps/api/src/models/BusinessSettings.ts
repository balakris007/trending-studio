import { IBusinessSettings } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IBusinessSettingsDocument extends Partial<IBusinessSettings> {
  _id: string;
  id: string;
  save(): Promise<this>;
}

export const BusinessSettingsModel = createFirestoreModel<IBusinessSettingsDocument>('business_settings');
