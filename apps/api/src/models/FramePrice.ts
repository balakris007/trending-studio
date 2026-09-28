import { IFramePriceConfig } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IFramePriceDocument extends Partial<IFramePriceConfig> {
  _id: string;
  id: string;
  frameTypeId?: any;
  save(): Promise<this>;
}

export const FramePriceModel = createFirestoreModel<IFramePriceDocument>('frame_prices');
